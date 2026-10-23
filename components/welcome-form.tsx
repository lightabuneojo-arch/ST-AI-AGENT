"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import TutorCharacter from "@/components/tutor-character";

type WelcomeFormProps = { onContinue: (name: string) => void };

export default function WelcomeForm({ onContinue }: WelcomeFormProps) {
  const [mode, setMode] = useState<"welcome" | "signup" | "login">("welcome");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [guideMessage, setGuideMessage] = useState("Let’s start with your first and last name. I’ll guide you through the rest.");

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) {
      setError("Audio welcome is not available in this browser, but you can read the greeting here.");
      return;
    }

    window.speechSynthesis.cancel();
    const greeting = new SpeechSynthesisUtterance(text);
    const feminineVoiceNames = /female|woman|samantha|ava|jenny|aria|zira|susan|libby|sonia|hazel|karen|tessa|moira|victoria|joanna|kendra|kimberly|salli|ivy/i;
    const englishVoices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
    const preferredVoice = englishVoices.find((voice) => feminineVoiceNames.test(voice.name));
    if (preferredVoice) greeting.voice = preferredVoice;
    greeting.lang = preferredVoice?.lang ?? "en-NG";
    greeting.rate = 0.96;
    greeting.pitch = 1.08;
    greeting.onend = () => setIsSpeaking(false);
    greeting.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(greeting);
  }

  function playWelcome() {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    speakText("Hi! Welcome! I’m ST, your personalised AI tutor. I’m here to help you learn from your own lecture materials, make difficult ideas easier to understand, and check your understanding as we go. We’ll take it one step at a time. Let’s begin your learning journey together.");
  }

  function updateGuide(message: string) {
    setGuideMessage(message);
    if (voiceGuidanceEnabled) speakText(message);
  }

  async function submit(formData: FormData) {
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const name = [firstName, lastName].filter(Boolean).join(" ");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const required = mode === "signup"
      ? [firstName, lastName, formData.get("email"), password, confirmPassword]
      : [formData.get("email"), password];
    if (required.some((value) => !String(value ?? "").trim())) {
      setError("Please complete each field so we can get your study space ready.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Those passwords don't match yet. Please check both fields.");
      return;
    }
    setError("");
    if (mode === "login") {
      onContinue("Student");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/welcome-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Passwords stay in this form and are never sent to the email service.
        body: JSON.stringify({ firstName, email: String(formData.get("email") ?? "").trim() }),
      });
      const responseBody: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof responseBody === "object" && responseBody !== null
          ? (responseBody as { error?: { message?: unknown } }).error?.message
          : null;
        throw new Error(typeof message === "string" ? message : "ST couldn't send the welcome email. Please try again.");
      }
      onContinue(name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ST couldn't send the welcome email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openForm(nextMode: "signup" | "login") {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    const message = nextMode === "signup"
      ? "Let’s start with your first and last name, then add your email address."
      : "Welcome back! Enter your email and password to continue.";
    setGuideMessage(message);
    setMode(nextMode);
    if (voiceGuidanceEnabled) speakText(message);
  }

  function toggleVoiceGuidance() {
    if (voiceGuidanceEnabled) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      setVoiceGuidanceEnabled(false);
      return;
    }
    setVoiceGuidanceEnabled(true);
    speakText(guideMessage);
  }

  return (
    <main className="welcome-layout">
      <section className="welcome-copy">
        <div className="brand-mark"><span className="brand-orbit">&#10022;</span><span>STUDY COMPANION</span></div>
        <p className="eyebrow">A calmer way to learn</p>
        <h1>Meet ST,<br /><span>your AI study tutor.</span></h1>
        <p className="welcome-description">Bring the lecture materials you already have. We&apos;ll help you understand them one topic at a time, with patient explanations and questions that check what&apos;s sticking.</p>
        <div className="welcome-points">
          <div><span className="point-icon">01</span><span>Learn from your own course materials</span></div>
          <div><span className="point-icon">02</span><span>Get a new explanation when you need one</span></div>
        </div>
        <p className="quiet-note">Made for curious minds and real study days.</p>
      </section>

      <section className="entry-card" aria-label="Student entry">
        <p className="eyebrow violet-text">A WELCOME FROM ST</p>
        {mode === "welcome" ? (
          <>
            <motion.div
              className="agent-popup"
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <TutorCharacter />
              <div className="agent-speech">
                <p className="agent-name">ST <span>YOUR STUDY TUTOR</span></p>
                <p className="tutor-greeting">Hi! Welcome to your personalised AI tutor.</p>
                <p>I’ll help you learn from your lecture materials, make difficult ideas easier to understand, and check your understanding as we go. We’ll take it one step at a time.</p>
              </div>
            </motion.div>
            <button className="speak-button" type="button" onClick={playWelcome} aria-pressed={isSpeaking}>
              <span aria-hidden="true">{isSpeaking ? "■" : "▶"}</span>{isSpeaking ? "Stop ST" : "Listen to ST"}
            </button>
            <button className="primary-button full-button" onClick={() => openForm("signup")}>Sign Up <span>&#8594;</span></button>
            <p className="switch-copy">Already have a space here? <button className="text-button" onClick={() => openForm("login")}>Log In</button></p>
          </>
        ) : (
          <>
            <h2>{mode === "signup" ? "Create your study space" : "Welcome back"}</h2>
            <p className="card-copy">{mode === "signup" ? "A few details, then we can start learning." : "Let's continue your learning journey."}</p>
            <motion.div
              className="agent-guide"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              aria-live="polite"
            >
              <div className="agent-guide-avatar"><TutorCharacter compact /></div>
              <div className="agent-guide-copy">
                <p className="agent-guide-name">ST</p>
                <p className="agent-guide-message">{guideMessage}</p>
                <button className="guide-voice-toggle" type="button" onClick={toggleVoiceGuidance} aria-pressed={voiceGuidanceEnabled}>
                  {voiceGuidanceEnabled ? (isSpeaking ? "Stop voice guidance" : "Mute voice guidance") : "Turn voice guidance on"}
                </button>
              </div>
            </motion.div>
            <form action={submit} className="entry-form">
              {mode === "signup" && <>
                <label>First name<input name="firstName" autoComplete="given-name" placeholder="Your first name" maxLength={60} required onFocus={() => updateGuide("Enter your first name, and I’ll use it when we study together.")} /></label>
                <label>Last name<input name="lastName" autoComplete="family-name" placeholder="Your last name" maxLength={60} required onFocus={() => updateGuide("Add your last name to complete your name.")} /></label>
              </>}
              <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@university.edu" maxLength={254} required onFocus={() => updateGuide("Add your email address to finish creating your demo study space.")} /></label>
              {mode === "signup" && <>
                <label>Password<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" required onFocus={() => updateGuide("Create a password, then enter it once more to confirm it.")} /><button className="password-visibility" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" />{showPassword && <path d="m4 4 16 16" />}</svg></button></div></label>
                <label>Confirm password<div className="password-field"><input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Enter your password again" required onFocus={() => updateGuide("Re-enter the same password so we can check it matches.")} /><button className="password-visibility" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} title={showConfirmPassword ? "Hide password" : "Show password"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" />{showConfirmPassword && <path d="m4 4 16 16" />}</svg></button></div></label>
              </>}
              {mode === "login" && <label>Password<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required onFocus={() => updateGuide("Enter the password you used on the demo form.")} /><button className="password-visibility" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.6" />{showPassword && <path d="m4 4 16 16" />}</svg></button></div></label>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button full-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending welcome email..." : mode === "signup" ? "Create account" : "Log In"}<span>&#8594;</span></button>
            </form>
            <p className="switch-copy">{mode === "signup" ? "Already have a space here?" : "New to the tutor?"} <button className="text-button" onClick={() => openForm(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? "Log In" : "Sign Up"}</button></p>
          </>
        )}
        <p className="demo-note"><span /> Demo access &#183; your details aren&apos;t saved</p>
      </section>
      <div className="ambient-orb ambient-one" /><div className="ambient-orb ambient-two" />
    </main>
  );
}






