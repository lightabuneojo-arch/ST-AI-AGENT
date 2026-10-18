import {
  ApiErrorSchema,
  TutorActionResponseSchema,
  type AnalyzeRequest,
  type TopicMap,
} from "@/shared/contracts";

export async function analyzeMaterial(request: AnalyzeRequest): Promise<TopicMap> {
  const response = await fetch("/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    throw new Error(parsedError.success ? parsedError.data.error.message : "Your tutor couldn’t analyze that material. Please try again.");
  }

  const parsed = TutorActionResponseSchema.safeParse(body);
  if (!parsed.success || parsed.data.action !== "analyze") {
    throw new Error("Your tutor returned an unexpected response. Please try analyzing the material again.");
  }
  return parsed.data.topicMap;
}
