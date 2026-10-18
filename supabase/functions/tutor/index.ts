import { z } from "zod";
import { AnalyzeRequestSchema, TopicMapSchema, TutorActionResponseSchema } from "../../../shared/contracts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Headers": "content-type, x-tutor-gate, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Gemini accepts a JSON Schema for structured output. Zod still checks the
// actual response below; the schema only guides the model's response shape.
const topicMapJsonSchema = z.toJSONSchema(TopicMapSchema);
delete topicMapJsonSchema.$schema;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for tutor requests.", retryable: false } }, 405);

  const expectedGate = Deno.env.get("TUTOR_GATE_SECRET");
  if (!expectedGate || request.headers.get("x-tutor-gate") !== expectedGate) {
    return json({ error: { code: "ACCESS_DENIED", message: "This tutor endpoint is available through the study app only.", retryable: false } }, 401);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: { code: "AI_NOT_CONFIGURED", message: "The tutor service is not configured yet.", retryable: false } }, 503);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ error: { code: "INVALID_JSON", message: "The request could not be read.", retryable: false } }, 400);
  }

  const requestData = AnalyzeRequestSchema.safeParse(rawBody);
  if (!requestData.success) {
    return json({ error: { code: "INVALID_REQUEST", message: "The lecture material did not match the expected format.", retryable: false } }, 400);
  }

  try {
    const parts: Array<Record<string, unknown>> = [{
      text: `Analyze the student's uploaded ${requestData.data.fileType.toUpperCase()} lecture material. Identify 3 to 8 useful study topics. Ground every topic in this source. Return concise excerpts copied or faithfully summarized from the material, and describe each relevant image/chart using its visual ID. Do not invent a visual reference.\n\nLECTURE TEXT:\n${requestData.data.sourceText}`,
    }];

    for (const visual of requestData.data.visuals) {
      if (visual.kind === "image") {
        const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(visual.dataUrl);
        if (!match) {
          return json({ error: { code: "INVALID_IMAGE", message: "A lecture image could not be prepared. Please try another file.", retryable: true } }, 400);
        }
        parts.push({ text: `This image is visual ${visual.id}. Describe only what is relevant to the lecture topic.${visual.altText ? ` Parser note: ${visual.altText}` : ""}` });
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      } else {
        parts.push({ text: `Chart ${visual.id} extracted data: ${visual.summary}` });
      }
    }

    const primaryModel = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
    const models = [...new Set([
      primaryModel,
      ...["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"].filter((model) => model !== primaryModel),
    ])];
    let providerResponse: Response | null = null;
    let modelTimedOut = false;
    for (const [modelIndex, model] of models.entries()) {
      providerResponse = null;
      for (let attempt = 0; ; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);
        try {
          providerResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
              body: JSON.stringify({
                contents: [{ role: "user", parts }],
                generationConfig: {
                  responseMimeType: "application/json",
                  responseJsonSchema: topicMapJsonSchema,
                  maxOutputTokens: 4_000,
                },
              }),
              signal: controller.signal,
            },
          );
        } catch (cause) {
          if (!(cause instanceof Error) || cause.name !== "AbortError") throw cause;
          modelTimedOut = true;
          console.warn("Gemini model request timed out", { model });
          break;
        } finally {
          clearTimeout(timeout);
        }

        // Retry the configured model twice. Try each fallback once, and never
        // repeat permanent 4xx errors.
        if (providerResponse.status !== 503 || attempt >= (modelIndex === 0 ? 2 : 0)) break;
        const delayMs = 800 * 2 ** attempt + Math.floor(Math.random() * 300);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      if (modelTimedOut) {
        if (modelIndex < models.length - 1) {
          console.warn("Gemini model timed out; trying fallback", {
            model,
            fallbackModel: models[modelIndex + 1],
          });
          modelTimedOut = false;
          continue;
        }
        break;
      }

      if (!providerResponse) break;
      if (providerResponse.status !== 503 || modelIndex === models.length - 1) break;
      console.warn("Gemini model unavailable; trying fallback", {
        model,
        fallbackModel: models[modelIndex + 1],
      });
    }

    if (!providerResponse && modelTimedOut) {
      return json({ error: { code: "AI_REQUEST_TIMEOUT", message: "The AI models are taking too long to respond. Please wait a moment and try again.", retryable: true } }, 504);
    }

    if (!providerResponse) {
      return json({ error: { code: "ANALYSIS_FAILED", message: "Your tutor couldn't finish analyzing the material. Please try again.", retryable: true } }, 502);
    }

    if (!providerResponse.ok) {
      const providerError = await providerResponse.json().catch(() => ({}));
      const code = providerError?.error?.status ?? providerError?.error?.code ?? "UNKNOWN";
      console.error("Gemini analysis failed", { status: providerResponse.status, code });
      if (providerResponse.status === 503) {
        return json({ error: { code: "AI_TEMPORARILY_UNAVAILABLE", message: "The AI service is temporarily busy. Please wait a moment and try again.", retryable: true } }, 503);
      }
      return json({ error: { code: "ANALYSIS_FAILED", message: "Your tutor couldn't finish analyzing the material. Please try again.", retryable: true } }, 502);
    }

    const result = await providerResponse.json();
    const candidate = result?.candidates?.[0];
    const outputText = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
    if (!outputText || candidate?.finishReason === "MAX_TOKENS") {
      return json({ error: { code: "EMPTY_ANALYSIS", message: "Your tutor couldn't identify clear topics in that material. Try another file.", retryable: true } }, 422);
    }

    let parsedOutput: unknown;
    try {
      parsedOutput = JSON.parse(outputText);
    } catch {
      return json({ error: { code: "INVALID_MODEL_OUTPUT", message: "Your tutor couldn't prepare the topics in the expected format. Please try again.", retryable: true } }, 502);
    }

    const topicMap = TopicMapSchema.safeParse(parsedOutput);
    if (!topicMap.success) {
      return json({ error: { code: "INVALID_MODEL_OUTPUT", message: "Your tutor couldn't prepare the topics in the expected format. Please try again.", retryable: true } }, 502);
    }
    const excerptIds = new Set(topicMap.data.excerpts.map((excerpt) => excerpt.id));
    const visualIds = new Set(requestData.data.visuals.map((visual) => visual.id));
    const referencesAreValid = topicMap.data.topics.every((topic) =>
      topic.excerptIds.every((id) => excerptIds.has(id)) && topic.visualIds.every((id) => visualIds.has(id))
    ) && topicMap.data.visualNotes.every((note) => visualIds.has(note.visualId));
    if (!referencesAreValid) {
      return json({ error: { code: "INVALID_SOURCE_REFERENCE", message: "Your tutor couldn't connect its topics to the uploaded material. Please try again.", retryable: true } }, 502);
    }
    return json(TutorActionResponseSchema.parse({ action: "analyze", topicMap: topicMap.data }));
  } catch (cause) {
    console.error("Gemini analysis request failed", {
      name: cause instanceof Error ? cause.name : "unknown error",
      aborted: cause instanceof Error && cause.name === "AbortError",
    });
    return json({ error: { code: "ANALYSIS_FAILED", message: "Your tutor couldn't finish analyzing the material. Please try again.", retryable: true } }, 502);
  }
});
