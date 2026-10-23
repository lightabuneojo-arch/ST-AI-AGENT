import type { ExtractedVisual } from "@/shared/contracts";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 1_000_000;
const MAX_TEXT_CHARACTERS = 80_000;
const OPENAI_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type OfficeAttachment = {
  type: "image" | "chart";
  name: string;
  mimeType?: string;
  data?: string;
  chartData?: unknown;
  altText?: string;
};

function toDataUrl(mimeType: string, base64: string) {
  return base64.startsWith("data:") ? base64 : `data:${mimeType};base64,${base64}`;
}

async function normalizeImage(mimeType: string, base64: string): Promise<{ mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; dataUrl: string }> {
  if (OPENAI_IMAGE_TYPES.has(mimeType)) {
    const size = Math.floor(base64.length * 0.75);
    if (size > MAX_IMAGE_BYTES) throw new Error("One of the extracted images is too large to analyze.");
    return { mimeType: mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", dataUrl: toDataUrl(mimeType, base64) };
  }

  // Convert browser-decodable office formats (for example SVG) to a common model input format.
  const image = new Image();
  image.src = toDataUrl(mimeType, base64);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not prepare an image from this document.");
  context.drawImage(image, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  const imageBytes = Math.floor((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
  if (imageBytes > MAX_IMAGE_BYTES) throw new Error("One of the extracted images is too large to analyze.");
  return { mimeType: "image/png", dataUrl };
}

export async function parseLectureFile(file: File): Promise<{ sourceText: string; visuals: ExtractedVisual[] }> {
  // Dynamic import keeps this browser-only parser out of server rendering.
  const { OfficeParser } = await import("officeparser");
  const parsed = await OfficeParser.parseOffice(file, { extractAttachments: true });
  const textResult = await parsed.to("text");
  const sourceText = textResult.value.trim().slice(0, MAX_TEXT_CHARACTERS);
  if (sourceText.length < 40) {
    throw new Error(file.name.toLowerCase().endsWith(".pdf")
      ? "We couldn't find readable text in this PDF. If it is a scanned document, choose a text-searchable copy or upload its Word or PowerPoint version."
      : "We couldn't find enough readable lecture text in that file. Please choose another DOCX, PPTX, or PDF document.");
  }

  const attachments = (parsed.attachments ?? []) as OfficeAttachment[];
  const visuals: ExtractedVisual[] = [];
  for (const [index, attachment] of attachments.entries()) {
    if (visuals.length >= MAX_IMAGES) break;
    const id = `visual-${index + 1}`;
    if (attachment.type === "chart" && attachment.chartData) {
      visuals.push({
        id,
        kind: "chart",
        summary: JSON.stringify({ name: attachment.name, chartData: attachment.chartData }).slice(0, 10_000),
      });
    } else if (attachment.type === "image" && attachment.data) {
      const normalized = await normalizeImage(attachment.mimeType ?? "application/octet-stream", attachment.data);
      visuals.push({
        id,
        kind: "image",
        ...normalized,
        ...(attachment.altText ? { altText: attachment.altText.slice(0, 500) } : {}),
      });
    }
  }

  return { sourceText, visuals };
}
