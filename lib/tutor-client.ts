import {
  ApiErrorSchema,
  TutorActionResponseSchema,
  type AnalyzeRequest,
  type TeachRequest,
  type PracticeRequest,
  type QuizRequest,
  type GradeQuizRequest,
  type QuizQuestion,
  type QuizGrade,
  type TopicMap,
  type TutorActionResponse,
} from "@/shared/contracts";

type TeachResponse = Extract<TutorActionResponse, { action: "teach" }>;

async function sendTutorRequest(request: AnalyzeRequest | TeachRequest | PracticeRequest | QuizRequest | GradeQuizRequest): Promise<TutorActionResponse> {
  const response = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    throw new Error(parsedError.success ? parsedError.data.error.message : "Your tutor couldn't complete that step. Please try again.");
  }

  const parsed = TutorActionResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error("Your tutor returned an unexpected response. Please try again.");
  return parsed.data;
}

export async function analyzeMaterial(request: AnalyzeRequest): Promise<TopicMap> {
  const result = await sendTutorRequest(request);
  if (result.action !== "analyze") {
    throw new Error("Your tutor returned an unexpected response. Please try analyzing the material again.");
  }
  return result.topicMap;
}

export async function askTutor(request: TeachRequest): Promise<TeachResponse> {
  const result = await sendTutorRequest(request);
  if (result.action !== "teach") throw new Error("Your tutor returned an unexpected response. Please try again.");
  return result;
}

export async function generatePractice(request: PracticeRequest): Promise<string[]> {
  const result = await sendTutorRequest(request);
  if (result.action !== "practice") throw new Error("Your tutor returned an unexpected response. Please try again.");
  return result.questions;
}

export async function generateQuiz(request: QuizRequest): Promise<QuizQuestion[]> {
  const result = await sendTutorRequest(request);
  if (result.action !== "quiz") throw new Error("ST returned an unexpected quiz response. Please try again.");
  return result.questions;
}

export async function gradeQuiz(request: GradeQuizRequest): Promise<QuizGrade> {
  const result = await sendTutorRequest(request);
  if (result.action !== "grade") throw new Error("ST returned unexpected quiz results. Please try again.");
  return { evaluations: result.evaluations, encouragement: result.encouragement };
}
