import { z } from "zod";

export const ExtractedVisualSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1).max(80),
    kind: z.literal("image"),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
    dataUrl: z.string().max(1_500_000),
    altText: z.string().max(500).optional(),
  }),
  z.object({
    id: z.string().min(1).max(80),
    kind: z.literal("chart"),
    summary: z.string().min(1).max(10_000),
  }),
]);

export const AnalyzeRequestSchema = z.object({
  action: z.literal("analyze"),
  fileName: z.string().min(1).max(255),
  fileType: z.enum(["docx", "pptx"]),
  sourceText: z.string().min(1).max(80_000),
  visuals: z.array(ExtractedVisualSchema).max(10),
}).strict();

export const TopicMapSchema = z.object({
  topics: z.array(z.object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(140),
    summary: z.string().min(1).max(600),
    excerptIds: z.array(z.string().min(1)).min(1).max(12),
    visualIds: z.array(z.string().min(1)).max(10),
  }).strict()).min(1).max(12),
  excerpts: z.array(z.object({
    id: z.string().min(1).max(80),
    text: z.string().min(1).max(2_000),
  }).strict()).min(1).max(48),
  visualNotes: z.array(z.object({
    visualId: z.string().min(1).max(80),
    description: z.string().min(1).max(500),
  }).strict()).max(10),
}).strict();

export const TutorActionRequestSchema = z.discriminatedUnion("action", [AnalyzeRequestSchema]);
export const TutorActionResponseSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("analyze"), topicMap: TopicMapSchema }).strict(),
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }).strict(),
}).strict();

export type ExtractedVisual = z.infer<typeof ExtractedVisualSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type TopicMap = z.infer<typeof TopicMapSchema>;
export type TutorActionRequest = z.infer<typeof TutorActionRequestSchema>;
export type TutorActionResponse = z.infer<typeof TutorActionResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
