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
  fileType: z.enum(["docx", "pptx", "pdf"]),
  sourceText: z.string().min(1).max(80_000),
  visuals: z.array(ExtractedVisualSchema).max(10),
}).strict();

export const TeachRequestSchema = z.object({
  action: z.literal("teach"),
  topic: z.object({
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(140),
    summary: z.string().min(1).max(600),
  }).strict(),
  excerpts: z.array(z.object({
    id: z.string().min(1).max(80),
    text: z.string().min(1).max(2_000),
  }).strict()).min(1).max(12),
  visualNotes: z.array(z.object({
    visualId: z.string().min(1).max(80),
    description: z.string().min(1).max(500),
  }).strict()).max(10),
  visuals: z.array(ExtractedVisualSchema).max(10),
  recentTurns: z.array(z.object({
    role: z.enum(["student", "tutor"]),
    content: z.string().min(1).max(2_000),
  }).strict()).max(8),
  studentMessage: z.string().min(1).max(1_000),
}).strict();

export const PracticeRequestSchema = z.object({
  action: z.literal("practice"),
  topic: TeachRequestSchema.shape.topic,
  excerpts: TeachRequestSchema.shape.excerpts,
  visualNotes: TeachRequestSchema.shape.visualNotes,
  visuals: TeachRequestSchema.shape.visuals,
  recentTurns: TeachRequestSchema.shape.recentTurns,
}).strict();

const QuizContextSchema = z.object({
  topic: TeachRequestSchema.shape.topic,
  excerpts: TeachRequestSchema.shape.excerpts,
  visualNotes: TeachRequestSchema.shape.visualNotes,
  visuals: TeachRequestSchema.shape.visuals,
  recentTurns: TeachRequestSchema.shape.recentTurns,
}).strict();

export const QuizQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1).max(80),
    type: z.literal("objective"),
    prompt: z.string().min(1).max(1_000),
    options: z.array(z.string().min(1).max(300)).min(2).max(5),
    correctAnswerIndex: z.number().int().min(0).max(4),
  }).strict(),
  z.object({
    id: z.string().min(1).max(80),
    type: z.literal("theory"),
    prompt: z.string().min(1).max(1_000),
    keyPoints: z.array(z.string().min(1).max(400)).min(1).max(6),
  }).strict(),
]);

export const QuizRequestSchema = z.object({
  action: z.literal("quiz"),
  ...QuizContextSchema.shape,
  quizType: z.enum(["objective", "theory"]),
  questionCount: z.union([z.literal(5), z.literal(10), z.literal(15)]),
}).strict();

export const GradeQuizRequestSchema = z.object({
  action: z.literal("grade"),
  ...QuizContextSchema.shape,
  questions: z.array(QuizQuestionSchema).min(1).max(15),
  answers: z.array(z.object({ questionId: z.string().min(1).max(80), answer: z.string().max(2_000) }).strict()).min(1).max(15),
}).strict();

export const QuizGradeSchema = z.object({
  evaluations: z.array(z.object({
    questionId: z.string().min(1).max(80),
    passed: z.boolean(),
    feedback: z.string().min(1).max(600),
    revisionArea: z.string().min(1).max(200),
  }).strict()).min(1).max(15),
  encouragement: z.string().min(1).max(500),
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

export const TutorActionRequestSchema = z.discriminatedUnion("action", [AnalyzeRequestSchema, TeachRequestSchema, PracticeRequestSchema, QuizRequestSchema, GradeQuizRequestSchema]);
export const TutorActionResponseSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("analyze"), topicMap: TopicMapSchema }).strict(),
  z.object({
    action: z.literal("teach"),
    message: z.string().min(1).max(3_000),
    nextQuestion: z.string().min(1).max(1_000),
    understanding: z.enum(["not_assessed", "understood", "partially_understood", "confused"]),
  }).strict(),
  z.object({
    action: z.literal("practice"),
    questions: z.array(z.string().min(1).max(500)).min(1).max(3),
  }).strict(),
  z.object({ action: z.literal("quiz"), questions: z.array(QuizQuestionSchema).min(1).max(15) }).strict(),
  z.object({ action: z.literal("grade"), ...QuizGradeSchema.shape }).strict(),
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
export type TeachRequest = z.infer<typeof TeachRequestSchema>;
export type PracticeRequest = z.infer<typeof PracticeRequestSchema>;
export type QuizRequest = z.infer<typeof QuizRequestSchema>;
export type GradeQuizRequest = z.infer<typeof GradeQuizRequestSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizGrade = z.infer<typeof QuizGradeSchema>;
export type TopicMap = z.infer<typeof TopicMapSchema>;
export type TutorActionRequest = z.infer<typeof TutorActionRequestSchema>;
export type TutorActionResponse = z.infer<typeof TutorActionResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
