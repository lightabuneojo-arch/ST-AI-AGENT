"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import TutorCharacter from "@/components/tutor-character";

type FloatingTutorGuideProps = {
  message: string;
};

export default function FloatingTutorGuide({ message }: FloatingTutorGuideProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => window.speechSynthesis?.cancel();
  }, []);

  function speakMessage() {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const englishVoices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
    const feminineVoiceNames = /female|woman|samantha|ava|jenny|aria|zira|susan|libby|sonia|hazel|karen|tessa|moira|victoria|joanna|kendra|kimberly|salli|ivy/i;
    const preferredVoice = englishVoices.find((voice) => feminineVoiceNames.test(voice.name));
    const utterance = new SpeechSynthesisUtterance(`Hi, I'm ST. ${message}`);
    utterance.lang = preferredVoice?.lang ?? "en-NG";
    utterance.rate = 0.96;
    utterance.pitch = 1.08;
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  if (!mounted) return null;

  return createPortal(
    <div ref={screenRef} className="floating-tutor-layer">
      <motion.aside
        className="floating-tutor"
        drag
        dragConstraints={screenRef}
        dragMomentum={false}
        dragElastic={0}
        whileDrag={{ scale: 1.02, cursor: "grabbing" }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        aria-label="ST study guide. Grab and drag ST anywhere on the screen."
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div
              key="open"
              className="floating-tutor-card"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.18 }}
            >
              <div className="floating-tutor-avatar"><TutorCharacter compact /></div>
              <div className="floating-tutor-copy" aria-live="polite">
                <div className="floating-tutor-heading"><strong>ST</strong><button type="button" aria-label="Minimise ST" onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); setIsOpen(false); }}>&#8722;</button></div>
                <p>{message}</p>
                <div className="floating-tutor-actions">
                  <button className="floating-tutor-listen" type="button" onClick={speakMessage}>
                    {isSpeaking ? "Stop ST" : "Listen to ST"}
                  </button>
                  <span className="floating-tutor-drag-hint"><span className="drag-grip" aria-hidden="true"><i /><i /><i /><i /></span>Grab and drag ST</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="closed"
              className="floating-tutor-reopen"
              type="button"
              aria-label="Open ST study guide"
              onClick={() => setIsOpen(true)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="floating-tutor-avatar"><TutorCharacter compact /></div>
              <span>ST</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.aside>
    </div>,
    document.body,
  );
}




