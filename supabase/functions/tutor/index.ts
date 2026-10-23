import { TopicMapSchema, TutorActionRequestSchema, TutorActionResponseSchema } from "../../../shared/contracts.ts";

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

// Gemini supports a subset of JSON Schema. Keep the provider schema to its
// basic supported fields; Zod applies the stricter length/count checks below.
const topicMapJsonSchema = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          excerptIds: { type: "array", items: { type: "string" } },
          visualIds: { type: "array", items: { type: "string" } },
        },
        required: ["id", "title", "summary", "excerptIds", "visualIds"],
        additionalProperties: false,
      },
    },
    excerpts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
        },
        required: ["id", "text"],
        additionalProperties: false,
      },
    },
    visualNotes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          visualId: { type: "string" },
          description: { type: "string" },
        },
        required: ["visualId", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["topics", "excerpts", "visualNotes"],
  additionalProperties: false,
};

const teachJsonSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    nextQuestion: { type: "string" },
    understanding: { type: "string", enum: ["not_assessed", "understood", "partially_understood", "confused"] },
  },
  required: ["message", "nextQuestion", "understanding"],
  additionalProperties: false,
};

const practiceJsonSchema = {
  type: "object",
  properties: { questions: { type: "array", items: { type: "string" } } },
  required: ["questions"],
  additionalProperties: false,
};

const quizJsonSchema = {
  type: "object",
  properties: { questions: { type: "array", items: { type: "object", properties: {
    id: { type: "string" }, type: { type: "string", enum: ["objective", "theory"] }, prompt: { type: "string" },
    options: { type: "array", items: { type: "string" } }, correctAnswerIndex: { type: "integer" }, keyPoints: { type: "array", items: { type: "string" } },
  }, required: ["id", "type", "prompt", "options", "correctAnswerIndex", "keyPoints"], additionalProperties: false } } },
  required: ["questions"], additionalProperties: false,
};

const gradeJsonSchema = {
  type: "object",
  properties: { evaluations: { type: "array", items: { type: "object", properties: {
    questionId: { type: "string" }, passed: { type: "boolean" }, feedback: { type: "string" }, revisionArea: { type: "string" },
  }, required: ["questionId", "passed", "feedback", "revisionArea"], additionalProperties: false } }, encouragement: { type: "string" } },
  required: ["evaluations", "encouragement"], additionalProperties: false,
};

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

  const requestData = TutorActionRequestSchema.safeParse(rawBody);
  if (!requestData.success) {
    return json({ error: { code: "INVALID_REQUEST", message: "The lecture material did not match the expected format.", retryable: false } }, 400);
  }
  if (requestData.data.action === "grade") {
    const questionIds = requestData.data.questions.map((question) => question.id);
    const answerIds = requestData.data.answers.map((answer) => answer.questionId);
    if (new Set(questionIds).size !== questionIds.length || new Set(answerIds).size !== answerIds.length || questionIds.length !== answerIds.length || questionIds.some((id) => !answerIds.includes(id)) || requestData.data.answers.some((answer) => !answer.answer.trim())) {
      return json({ error: { code: "INVALID_QUIZ_ANSWERS", message: "Please answer every quiz question before submitting.", retryable: false } }, 400);
    }
  }

  try {
    let parts: Array<Record<string, unknown>>;
    let responseSchema: typeof topicMapJsonSchema | typeof teachJsonSchema | typeof practiceJsonSchema | typeof quizJsonSchema | typeof gradeJsonSchema;
    if (requestData.data.action === "analyze") {
      parts = [{ text: `Analyze the student's uploaded ${requestData.data.fileType.toUpperCase()} lecture material. Identify 3 to 8 useful study topics. Ground every topic in this source. Return concise excerpts copied or faithfully summarized from the material, and describe each relevant image/chart using its visual ID. Do not invent a visual reference.\n\nLECTURE TEXT:\n${requestData.data.sourceText}` }];
      responseSchema = topicMapJsonSchema;
    } else if (requestData.data.action === "teach") {
      const studentContextLabel = requestData.data.recentTurns.length === 0
        ? "What the student says they need help understanding"
        : "The student's latest answer or question";
      parts = [{ text: `You are ST, a warm, patient personal tutor teaching from a university student's uploaded lecture. Lead an interactive lesson about the selected topic, grounded only in the source excerpts and visual notes/images below.\n\nSelected topic: ${requestData.data.topic.title}\nTopic summary: ${requestData.data.topic.summary}\n${studentContextLabel}: ${requestData.data.studentMessage}\nRecent conversation: ${JSON.stringify(requestData.data.recentTurns)}\nSource excerpts: ${JSON.stringify(requestData.data.excerpts)}\nVisual notes: ${JSON.stringify(requestData.data.visualNotes)}\n\nIf there is no conversation history, start by addressing the student's stated difficulty in plain, simple language and give one useful explanation. Set understanding to not_assessed. End with one clear question that checks understanding. If history exists, evaluate the student's latest message against the taught concept. If correct, acknowledge what they understood, continue one step, and ask the next check question. If confused, wrong, or incomplete, say kindly what needs work, explain the concept again using a different and simpler approach, and ask a new follow-up question. Do not just answer and wait for more questions. Keep the reply concise, encouraging, and tied to the supplied lecture evidence. Return message, nextQuestion, and understanding. Use understanding: understood, partially_understood, or confused for a learner response; use not_assessed only for the opening lesson turn.` }];
      responseSchema = teachJsonSchema;
    } else if (requestData.data.action === "practice") {
      parts = [{ text: `You are ST, a supportive university tutor. Write 1 to 3 concise practice questions about the selected lecture topic. Use the uploaded lecture evidence as the primary source and use the recent tutoring conversation to focus on what the student asked about or struggled with. Questions may test understanding or simple application of the taught concept, but must not require unrelated outside knowledge. Do not include answers or hints. Return only JSON with a questions array.

Selected topic: ${requestData.data.topic.title}
Topic summary: ${requestData.data.topic.summary}
Recent tutoring conversation: ${JSON.stringify(requestData.data.recentTurns)}
Source excerpts: ${JSON.stringify(requestData.data.excerpts)}
Visual notes: ${JSON.stringify(requestData.data.visualNotes)}` }];
      responseSchema = practiceJsonSchema;
    } else if (requestData.data.action === "quiz") {
      const quizType = requestData.data.quizType;
      parts = [{ text: `You are ST, a fair and supportive university tutor. Create up to ${requestData.data.questionCount} ${quizType} questions on the selected topic. Use lecture excerpts and visual notes as primary evidence, plus relevant application questions only when supported by the taught concepts. If there are not enough distinct, quality questions, return fewer; never invent unrelated content. Every question must be answerable from the supplied material. For objective questions, provide exactly four options and the zero-based correct answer index; keyPoints must be []. For theory questions, options must be [], correctAnswerIndex must be 0, and keyPoints must list the essential concepts a sufficient answer should demonstrate. Use unique IDs. Include every output field for every question, using empty arrays for fields that do not apply.

Selected topic: ${requestData.data.topic.title}
Topic summary: ${requestData.data.topic.summary}
Tutoring conversation: ${JSON.stringify(requestData.data.recentTurns)}
Lecture excerpts: ${JSON.stringify(requestData.data.excerpts)}
Visual notes: ${JSON.stringify(requestData.data.visualNotes)}` }];
      responseSchema = quizJsonSchema;
    } else {
      parts = [{ text: `You are ST, a supportive and fair tutor. Grade each student's answer using the lecture excerpts and visual notes. For objective questions, pass only when the answer matches the supplied correct option. For theory questions, pass when the student explains the required key points in their own words; accept reasonable wording differences. Give brief, kind feedback explaining what was correct or missing and one specific revision area per question. Return one evaluation per question and a short encouraging summary.

Questions and grading guidance: ${JSON.stringify(requestData.data.questions)}
Student answers: ${JSON.stringify(requestData.data.answers)}
Lecture excerpts: ${JSON.stringify(requestData.data.excerpts)}
Visual notes: ${JSON.stringify(requestData.data.visualNotes)}` }];
      responseSchema = gradeJsonSchema;
    }

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
                  responseFormat: {
                    text: {
                      mimeType: "APPLICATION_JSON",
                      schema: responseSchema,
                    },
                  },
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
      const providerMessage = typeof providerError?.error?.message === "string"
        ? providerError.error.message.slice(0, 400)
        : "No provider error message was returned.";
      console.error("Gemini analysis failed", {
        status: providerResponse.status,
        code,
        providerMessage,
      });
      if (providerResponse.status === 429) {
        return json({
          error: {
            code: "AI_QUOTA_OR_RATE_LIMIT",
            message: "The AI service has reached its current usage limit. Please wait before trying again or check your Gemini API quota.",
            retryable: true,
          },
        }, 429);
      }
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

    if (requestData.data.action === "teach") {
      const teachResponse = TutorActionResponseSchema.safeParse({ action: "teach", ...((parsedOutput && typeof parsedOutput === "object") ? parsedOutput : {}) });
      if (!teachResponse.success || teachResponse.data.action !== "teach") {
        return json({ error: { code: "INVALID_MODEL_OUTPUT", message: "ST couldn't prepare the next lesson step. Please try again.", retryable: true } }, 502);
      }
      return json(teachResponse.data);
    }

    if (requestData.data.action === "practice") {
      const practiceResponse = TutorActionResponseSchema.safeParse({ action: "practice", ...((parsedOutput && typeof parsedOutput === "object") ? parsedOutput : {}) });
      if (!practiceResponse.success || practiceResponse.data.action !== "practice") {
        return json({ error: { code: "INVALID_MODEL_OUTPUT", message: "ST couldn't prepare practice questions in the expected format. Please try again.", retryable: true } }, 502);
      }
      return json(practiceResponse.data);
    }

    if (requestData.data.action === "quiz") {
      const rawQuestions = (parsedOutput as { questions?: unknown[] } | null)?.questions;
      const normalizedQuestions = Array.isArray(rawQuestions) ? rawQuestions.slice(0, requestData.data.questionCount).map((question) => {
        if (!question || typeof question !== "object") return question;
        const item = question as Record<string, unknown>;
        if (item.type === "theory") return { id: item.id, type: item.type, prompt: item.prompt, keyPoints: item.keyPoints };
        if (item.type === "objective") return { id: item.id, type: item.type, prompt: item.prompt, options: item.options, correctAnswerIndex: item.correctAnswerIndex };
        return question;
      }) : rawQuestions;
      const quizResponse = TutorActionResponseSchema.safeParse({ action: "quiz", questions: normalizedQuestions });
      const quizIds = quizResponse.success && quizResponse.data.action === "quiz" ? quizResponse.data.questions.map((question) => question.id) : [];
      if (!quizResponse.success || quizResponse.data.action !== "quiz" || quizIds.length !== new Set(quizIds).size || quizResponse.data.questions.some((question) => question.type !== requestData.data.quizType || (question.type === "objective" && (question.options.length !== 4 || question.correctAnswerIndex >= question.options.length)))) {
        return json({ error: { code: "INVALID_MODEL_OUTPUT", message: "ST couldn't prepare consistent quiz questions. Please try again.", retryable: true } }, 502);
      }
      return json(quizResponse.data);
    }

    if (requestData.data.action === "grade") {
      const gradeResponse = TutorActionResponseSchema.safeParse({ action: "grade", ...((parsedOutput && typeof parsedOutput === "object") ? parsedOutput : {}) });
      const expectedIds = new Set(requestData.data.questions.map((question) => question.id));
      const resultIds = gradeResponse.success && gradeResponse.data.action === "grade" ? gradeResponse.data.evaluations.map((evaluation) => evaluation.questionId) : [];
      if (!gradeResponse.success || gradeResponse.data.action !== "grade" || resultIds.length !== expectedIds.size || new Set(resultIds).size !== resultIds.length || resultIds.some((id) => !expectedIds.has(id))) {
        return json({ error: { code: "INVALID_MODEL_OUTPUT", message: "ST couldn't match all quiz results to your answers. Please try again.", retryable: true } }, 502);
      }
      return json(gradeResponse.data);
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
