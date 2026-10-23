import { NextRequest, NextResponse } from "next/server";
import { TutorActionRequestSchema, TutorActionResponseSchema } from "@/shared/contracts";

type Usage = { count: number; lastRequestAt: number };
const sessionUsage = new Map<string, Usage>();
const ipUsage = new Map<string, { count: number; resetsAt: number }>();
const MAX_REQUEST_BYTES = 20 * 1024 * 1024;
const MAX_CALLS_PER_SESSION = 30;
const MAX_CALLS_PER_IP_PER_HOUR = 90;
const MIN_REQUEST_INTERVAL_MS = 1_000;
const COOKIE_NAME = "tutor-demo-session";

function errorResponse(status: number, code: string, message: string, retryable = false) {
  return NextResponse.json({ error: { code, message, retryable } }, { status });
}

function readCookie(request: NextRequest) {
  return request.cookies.get(COOKIE_NAME)?.value;
}

function withSessionCookie(response: NextResponse, sessionId: string, shouldSetCookie: boolean, request: NextRequest) {
  if (shouldSetCookie) {
    response.cookies.set(COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "strict",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 3,
    });
  }
  return response;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return errorResponse(403, "ORIGIN_NOT_ALLOWED", "This study session can only be used from its own app window.");
  }

  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > MAX_REQUEST_BYTES) {
    return errorResponse(413, "REQUEST_TOO_LARGE", "That material is too large to send. Try a smaller lecture file.");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "We couldn’t read that request. Please try again.");
  }

  const parsed = TutorActionRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return errorResponse(400, "INVALID_REQUEST", "Some material could not be prepared. Check the file and try again.");
  }

  const gateSecret = process.env.TUTOR_GATE_SECRET;
  const functionUrl = process.env.SUPABASE_TUTOR_FUNCTION_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!gateSecret || !functionUrl || !publishableKey) {
    return errorResponse(503, "TUTOR_NOT_CONFIGURED", "Your tutor isn’t connected yet. Add the server setup values and try again.", true);
  }

  let sessionId = readCookie(request);
  let shouldSetCookie = false;
  if (!sessionId || !/^[\da-f-]{36}$/i.test(sessionId)) {
    sessionId = crypto.randomUUID();
    shouldSetCookie = true;
  }

  const now = Date.now();
  const usage = sessionUsage.get(sessionId) ?? { count: 0, lastRequestAt: 0 };
  if (usage.count >= MAX_CALLS_PER_SESSION) {
    return withSessionCookie(errorResponse(429, "DEMO_LIMIT_REACHED", "This demo study session has reached its AI request limit. Start a fresh demo session to continue."), sessionId, shouldSetCookie, request);
  }
  if (now - usage.lastRequestAt < MIN_REQUEST_INTERVAL_MS) {
    return withSessionCookie(errorResponse(429, "TOO_MANY_REQUESTS", "Please wait a moment before asking your tutor again.", true), sessionId, shouldSetCookie, request);
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-demo";
  const ipWindow = ipUsage.get(ip);
  const currentWindow = !ipWindow || now >= ipWindow.resetsAt ? { count: 0, resetsAt: now + 60 * 60 * 1_000 } : ipWindow;
  if (currentWindow.count >= MAX_CALLS_PER_IP_PER_HOUR) {
    return withSessionCookie(errorResponse(429, "IP_DEMO_LIMIT_REACHED", "This demo has reached its hourly AI request limit. Please try again later."), sessionId, shouldSetCookie, request);
  }
  sessionUsage.set(sessionId, { count: usage.count + 1, lastRequestAt: now });
  ipUsage.set(ip, { ...currentWindow, count: currentWindow.count + 1 });

  try {
    const upstream = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
        "x-tutor-gate": gateSecret,
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(90_000),
    });
    const body: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      console.error("Tutor function returned an error", upstream.status);
      const upstreamError = typeof body === "object" && body !== null && "error" in body
        ? (body as { error?: { code?: unknown; message?: unknown } }).error
        : undefined;
      const upstreamErrorCode = typeof upstreamError?.code === "string" ? upstreamError.code : undefined;
      const upstreamErrorMessage = typeof upstreamError?.message === "string" ? upstreamError.message : undefined;
      const isTemporaryAiOutage = upstream.status === 503;
      const isAiTimeout = upstream.status === 504;
      return withSessionCookie(errorResponse(
        upstream.status === 429 ? 429 : isTemporaryAiOutage ? 503 : isAiTimeout ? 504 : 502,
        upstream.status === 429
          ? upstreamErrorCode ?? "AI_QUOTA_OR_RATE_LIMIT"
          : isTemporaryAiOutage ? "AI_TEMPORARILY_UNAVAILABLE" : isAiTimeout ? "AI_REQUEST_TIMEOUT" : "TUTOR_UPSTREAM_ERROR",
        upstream.status === 429
          ? upstreamErrorMessage ?? "The AI service has reached its current usage limit. Please wait before trying again or check your Gemini API quota."
          : isTemporaryAiOutage
            ? "The AI service is temporarily busy. Please wait a moment and try again."
            : isAiTimeout
              ? "The AI models are taking too long to respond. Please wait a moment and try again."
              : parsed.data.action === "teach"
                ? "ST couldn't prepare the next lesson turn. Please try again."
                : parsed.data.action === "practice"
                  ? "ST couldn't prepare practice questions just now. Please try again."
                  : parsed.data.action === "quiz"
                    ? "ST couldn't prepare your quiz just now. Please try again."
                    : parsed.data.action === "grade"
                      ? "ST couldn't grade your quiz just now. Please try again."
                  : "Your tutor couldn't finish reading that material. Please try again.",
        true,
      ), sessionId, shouldSetCookie, request);
    }

    const result = TutorActionResponseSchema.safeParse(body);
    if (!result.success) {
      console.error("Tutor function returned a response outside the shared schema");
      return withSessionCookie(errorResponse(502, "INVALID_TUTOR_RESPONSE", "Your tutor returned an unexpected response. Please try again.", true), sessionId, shouldSetCookie, request);
    }
    const response = NextResponse.json(result.data);
    return withSessionCookie(response, sessionId, shouldSetCookie, request);
  } catch (cause) {
    const errorName = cause instanceof Error ? cause.name : "unknown error";
    const errorMessage = cause instanceof Error ? cause.message.slice(0, 200) : "No error message was returned.";
    const nestedCause = cause instanceof Error && typeof cause.cause === "object" && cause.cause !== null
      ? cause.cause as { code?: unknown }
      : null;
    console.error("Tutor function request failed", {
      name: errorName,
      message: errorMessage,
      causeCode: typeof nestedCause?.code === "string" ? nestedCause.code : undefined,
    });
    const timedOut = errorName === "TimeoutError";
    return withSessionCookie(errorResponse(
      timedOut ? 504 : 502,
      timedOut ? "AI_REQUEST_TIMEOUT" : "TUTOR_UNAVAILABLE",
      timedOut
        ? "ST is taking longer than expected. Please wait a moment and try again."
        : "ST couldn't connect to the tutor service. Please check your connection and try again.",
      true,
    ), sessionId, shouldSetCookie, request);
  }
}
