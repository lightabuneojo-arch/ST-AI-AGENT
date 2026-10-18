"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import TutorCharacter from "@/components/tutor-character";

type WelcomeFormProps = { onContinue: (name: string) => void };

export default function WelcomeForm({ onContinue }: WelcomeFormProps) {
  const [mode, setMode] = useState<"welcome" | "signup" | "login">("welcome");
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [guideMessage, setGuideMessage] = useState("Let’s start with your full name. I’ll guide you through the rest.");

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

  function submit(formData: FormData) {
    const name = String(formData.get("fullName") ?? "").trim();
    const required = mode === "signup"
      ? [name, formData.get("email"), formData.get("password"), formData.get("university")]
      : [formData.get("email"), formData.get("password")];
    if (required.some((value) => !String(value ?? "").trim())) {
      setError("Please complete each field so we can get your study space ready.");
      return;
    }
    setError("");
    onContinue(mode === "signup" ? name : "Student");
  }

  function openForm(nextMode: "signup" | "login") {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setError("");
    const message = nextMode === "signup"
      ? "Let’s start with your full name. I’ll guide you through the rest."
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
              {mode === "signup" && <label>Full name<input name="fullName" autoComplete="name" placeholder="Your name" onFocus={() => updateGuide("Enter your name so I know what to call you.")} /></label>}
              <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@university.edu" onFocus={() => updateGuide("Add your email address. You’ll use it to enter the demo study space.")} /></label>
              <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Enter your password" onFocus={() => updateGuide(mode === "signup" ? "Choose a password for this demo form. Your details won’t be saved." : "Enter the password you used on the demo form.")} /></label>
              {mode === "signup" && <label>University name<input name="university" placeholder="Your university" onFocus={() => updateGuide("Enter the name of your university to finish setting up this demo study space.")} />
              </label>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button full-button" type="submit">{mode === "signup" ? "Create account" : "Log In"}<span>&#8594;</span></button>
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






