import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const WelcomeEmailSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(254),
}).strict();

const requestsByIp = new Map<string, { count: number; resetsAt: number }>();
const MAX_REQUESTS_PER_IP_PER_HOUR = 5;
const MAX_BODY_BYTES = 2_000;

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return jsonError(403, "This sign-up form can only be used from the study app.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return jsonError(413, "That sign-up request is too large.");

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "We couldn't read the sign-up details. Please try again.");
  }

  const parsed = WelcomeEmailSchema.safeParse(rawBody);
  if (!parsed.success) return jsonError(400, "Enter a valid first name and email address, then try again.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-demo";
  const now = Date.now();
  const current = requestsByIp.get(ip);
  const windowState = !current || now >= current.resetsAt
    ? { count: 0, resetsAt: now + 60 * 60 * 1_000 }
    : current;
  if (windowState.count >= MAX_REQUESTS_PER_IP_PER_HOUR) {
    return jsonError(429, "Too many welcome emails were requested. Please try again later.");
  }
  requestsByIp.set(ip, { ...windowState, count: windowState.count + 1 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return jsonError(503, "Welcome email isn't configured yet. Add the Resend server settings, then try again.");
  }

  const firstName = parsed.data.firstName;
  const safeFirstName = escapeHtml(firstName);
  const text = `Hi ${firstName},\n\nWelcome to ST, your personal study tutor. Bring one of your lecture documents, choose a topic, and ST will help you understand it step by step.\n\nThis is a demo study space. Your sign-up details and password are not saved, and this email does not confirm a permanent account.\n\nHappy learning,\nST`;
  const html = `<div style="font-family:Arial,sans-serif;color:#202238;line-height:1.65;max-width:560px;margin:auto"><p>Hi ${safeFirstName},</p><h1 style="font-size:24px">Welcome to ST</h1><p>ST is your personal study tutor. Bring one of your lecture documents, choose a topic, and ST will help you understand it step by step.</p><p><strong>Start learning:</strong> return to your study space, upload a DOCX, PPTX, or text-based PDF lecture, and choose a topic to explore with ST.</p><p style="color:#606678;font-size:13px">This is a demo study space. Your sign-up details and password are not saved, and this email does not confirm a permanent account.</p><p>Happy learning,<br />ST</p></div>`;

  try {
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [parsed.data.email],
        subject: `Welcome to ST, ${firstName}!`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!providerResponse.ok) {
      console.error("Welcome email provider returned an error", providerResponse.status);
      let message = "Resend couldn't send the welcome email right now. Check the sender settings in Resend and try again.";
      if (providerResponse.status === 401) {
        message = "Resend rejected the API key. Check RESEND_API_KEY in .env.local, then restart the development server.";
      } else if (providerResponse.status === 403) {
        message = "Resend rejected the sender or recipient. Check your Resend account and verify the sender domain for real student addresses.";
      } else if (providerResponse.status === 422) {
        message = "Resend rejected the email details. Check that RESEND_FROM_EMAIL uses a sender address allowed by your Resend account.";
      } else if (providerResponse.status === 429) {
        message = "Resend's sending limit has been reached. Check your Resend account's usage and try again later.";
      }
      return jsonError(502, message);
    }

    return NextResponse.json({ sent: true });
  } catch (cause) {
    console.error("Welcome email request failed", cause instanceof Error ? cause.name : "unknown error");
    return jsonError(502, "ST couldn't reach the email service. Please try again in a moment.");
  }
}
