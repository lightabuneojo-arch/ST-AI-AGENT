"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type TutorChatTurn = {
  role: "student" | "tutor";
  content: string;
  understanding?: "not_assessed" | "understood" | "partially_understood" | "confused";
};

type TutorSessionProps = {
  topicTitle: string;
  topicSummary: string;
  turns: TutorChatTurn[];
  pending: boolean;
  error: string;
  onSend: (message: string) => void;
  onReadyForQuiz: () => void;
  onBack: () => void;
};

export default function TutorSession({ topicTitle, topicSummary, turns, pending, error, onSend, onReadyForQuiz, onBack }: TutorSessionProps) {
  const [message, setMessage] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const lastSpokenTurnRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!voiceEnabled) {
      window.speechSynthesis.cancel();
      return;
    }
    const latestTutorTurn = [...turns].reverse().find((turn) => turn.role === "tutor");
    if (!latestTutorTurn) return;
    const turnKey = `${turns.length}:${latestTutorTurn.content}`;
    if (lastSpokenTurnRef.current === turnKey) return;
    lastSpokenTurnRef.current = turnKey;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latestTutorTurn.content);
    utterance.lang = "en-NG";
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => /female|woman|samantha|zira/i.test(voice.name) && voice.lang.startsWith("en"))
      ?? voices.find((voice) => voice.lang === "en-NG")
      ?? voices.find((voice) => voice.lang.startsWith("en"))
      ?? null;
    window.speechSynthesis.speak(utterance);
  }, [turns, voiceEnabled]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
  }, []);

  function toggleStudentSpeech() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceMessage("Speech input isn't available in this browser. You can type your reply instead.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const spokenText = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ").trim();
      if (spokenText) setMessage((current) => current ? `${current} ${spokenText}` : spokenText);
      setVoiceMessage(spokenText ? "Your speech was added above. Review it, then send it to ST." : "I didn't catch that. Please try again or type your reply.");
    };
    recognition.onerror = (event) => {
      setVoiceMessage(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone access was blocked. Allow microphone access in your browser settings, or type your reply."
        : "I couldn't hear that clearly. Please try again or type your reply.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setVoiceMessage("Listening... speak your reply.");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceMessage("The microphone couldn't start. Please try again or type your reply.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setMessage("");
    onSend(trimmed);
  }

  return (
    <section className="tutor-session-card">
      <button className="text-button tutor-back-button" type="button" onClick={onBack}>← Back to topics</button>
      <p className="eyebrow violet-text">ST IS TEACHING</p>
      <h2>{topicTitle}</h2>
      <p className="tutor-session-summary">{topicSummary}</p>

      <div className="voice-controls">
        <label className="voice-toggle">
          <input type="checkbox" checked={voiceEnabled} onChange={(event) => setVoiceEnabled(event.target.checked)} />
          <span className="voice-toggle-track" aria-hidden="true" />
          <span>Let ST speak explanations</span>
        </label>
        <span className="voice-note">Uses your browser's available voice</span>
      </div>

      <div className="conversation-list" aria-live="polite" aria-label="Tutoring conversation">
        {turns.map((turn, index) => (
          <article className={`conversation-turn ${turn.role === "tutor" ? "tutor-turn" : "student-turn"}`} key={`${turn.role}-${index}`}>
            <span className="conversation-speaker">{turn.role === "tutor" ? "ST" : "You"}</span>
            <p>{turn.content}</p>
            {turn.understanding && turn.understanding !== "not_assessed" && (
              <small className={`understanding-state ${turn.understanding}`}>
                {turn.understanding === "understood" ? "You’re getting it" : turn.understanding === "confused" ? "ST is trying a simpler explanation" : "ST is building on your answer"}
              </small>
            )}
          </article>
        ))}
        {pending && <p className="tutor-thinking" role="status">ST is thinking about your answer…</p>}
      </div>

      {error && <p className="tutor-session-error" role="alert">{error}</p>}
      <form className="tutor-reply-form" onSubmit={handleSubmit}>
        <label htmlFor="tutor-reply">Your reply</label>
        <button className="student-speech-button" type="button" onClick={toggleStudentSpeech} disabled={pending}>
          {isListening ? "Stop listening" : "Speak your reply"}
        </button>
        {voiceMessage && <small className="voice-status" role="status">{voiceMessage}</small>}
        <textarea
          id="tutor-reply"
          value={message}
          onChange={(event) => { setMessage(event.target.value); setVoiceMessage(""); }}
          placeholder="Answer ST in your own words, or ask for another explanation..."
          maxLength={1_000}
          required
          disabled={pending}
        />
        <button className="primary-button" type="submit" disabled={!message.trim() || pending}>
          Send to ST <span aria-hidden="true">→</span>
        </button>
      </form>
      <button className="practice-questions-button" type="button" onClick={onReadyForQuiz} disabled={pending}>
        I’m Ready for the Quiz <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
