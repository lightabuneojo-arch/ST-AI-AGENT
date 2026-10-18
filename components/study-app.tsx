"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import FloatingTutorGuide from "@/components/floating-tutor-guide";
import MaterialUploader from "@/components/material-uploader";
import TopicPicker from "@/components/topic-picker";
import WelcomeForm from "@/components/welcome-form";
import { parseLectureFile } from "@/lib/document-parser";
import { analyzeMaterial } from "@/lib/tutor-client";
import type { AnalyzeRequest, TopicMap } from "@/shared/contracts";

type Screen = "welcome" | "upload" | "topics";

export default function StudyApp() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [studentName, setStudentName] = useState("Student");
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<"file" | "tutor">("file");
  const [parsedSummary, setParsedSummary] = useState("");
  const [topicMap, setTopicMap] = useState<TopicMap | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState("");

  const tutorGuideMessage = error
    ? "I couldn't use that file. Check the upload message, then choose another DOCX or PPTX and Iâ€™ll try again."
    : isAnalyzing
      ? `I am reading ${fileName || "your lecture material"} now and finding the main topics. Keep this page open while I prepare your study session.`
      : `Hi ${studentName}, choose a DOCX or PPTX from your lecture materials. I will read it and find the main topics for us to study.`;

  async function handleFile(file: File) {
    setError("");
    setParsedSummary("");
    setErrorKind("file");
    setTopicMap(null);
    setSelectedTopicId("");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "docx" && extension !== "pptx") {
      setError("Please choose a Microsoft Word (.docx) or PowerPoint (.pptx) file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("This file is larger than 15 MB. Try a smaller lecture file.");
      return;
    }

    setFileName(file.name);
    setIsAnalyzing(true);
    let documentWasParsed = false;
    try {
      const parsed = await parseLectureFile(file);
      documentWasParsed = true;
      setParsedSummary(`Document parsed: ${parsed.sourceText.length.toLocaleString()} text characters and ${parsed.visuals.length} visual items found.`);
      setErrorKind("tutor");
      const request: AnalyzeRequest = {
        action: "analyze",
        fileName: file.name,
        fileType: extension,
        sourceText: parsed.sourceText,
        visuals: parsed.visuals,
      };
      const result = await analyzeMaterial(request);
      setTopicMap(result);
      setParsedSummary("");
      setScreen("topics");
    } catch (cause) {
      if (documentWasParsed) setErrorKind("tutor");
      setError(cause instanceof Error ? cause.message : "Something interrupted the analysis. Please try another file.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {screen === "welcome" ? (
        <motion.div key="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          <WelcomeForm onContinue={(name) => { setStudentName(name || "Student"); setScreen("upload"); }} />
        </motion.div>
      ) : (
        <motion.main key="workspace" className="workspace" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          <header className="app-header">
            <div className="brand-mark compact"><span className="brand-orbit">&#10022;</span><span>STUDY COMPANION</span></div>
            <div className="header-right"><span className="secure-label"><i /> Your private study space</span><span className="user-chip">{studentName.slice(0, 1).toUpperCase()}</span></div>
          </header>
          <div className="workspace-intro"><p className="eyebrow">A SPACE FOR YOUR NEXT STUDY SESSION</p><h1>Let's make progress,<br /><span>one topic at a time.</span></h1><p>Start with your lecturer's material. I'll help you find a clear path through it.</p></div>
          <AnimatePresence mode="wait">
            {topicMap && screen === "topics" ? (
              <motion.div key="topics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                <TopicPicker fileName={fileName} topicMap={topicMap} selectedTopicId={selectedTopicId} onSelect={setSelectedTopicId} onReplace={() => { setTopicMap(null); setScreen("upload"); setFileName(""); setError(""); setParsedSummary(""); }} />
              </motion.div>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                <MaterialUploader fileName={fileName} error={error} errorTitle={errorKind === "file" ? "We couldn't read that file yet." : "Your material was read, but your tutor couldn't finish the analysis."} parsedSummary={parsedSummary} busy={isAnalyzing} onFile={handleFile} />
              </motion.div>
            )}
          </AnimatePresence>
          {screen === "upload" && <FloatingTutorGuide message={tutorGuideMessage} />}
          <footer className="workspace-footer">A little progress, made personal <span>âœ§</span></footer>
        </motion.main>
      )}
    </AnimatePresence>
  );
}




