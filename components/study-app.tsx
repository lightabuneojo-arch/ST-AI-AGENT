"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import FloatingTutorGuide from "@/components/floating-tutor-guide";
import MaterialUploader from "@/components/material-uploader";
import TopicPicker from "@/components/topic-picker";
import QuizFlow, { type QuizAnswers, type QuizMode } from "@/components/quiz-flow";
import TutorSession, { type TutorChatTurn } from "@/components/tutor-session";
import WelcomeForm from "@/components/welcome-form";
import { parseLectureFile } from "@/lib/document-parser";
import { analyzeMaterial, askTutor, generateQuiz, gradeQuiz } from "@/lib/tutor-client";
import type { AnalyzeRequest, ExtractedVisual, GradeQuizRequest, QuizGrade, QuizQuestion, QuizRequest, TeachRequest, TopicMap } from "@/shared/contracts";

type Screen = "welcome" | "upload" | "topics" | "tutor" | "quiz-setup" | "quiz" | "results";

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
  const [lectureVisuals, setLectureVisuals] = useState<ExtractedVisual[]>([]);
  const [conversation, setConversation] = useState<TutorChatTurn[]>([]);
  const [isTeaching, setIsTeaching] = useState(false);
  const [tutorError, setTutorError] = useState("");
  const [quizType, setQuizType] = useState<QuizMode>("objective");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>({});
  const [quizGrade, setQuizGrade] = useState<QuizGrade | null>(null);

  const tutorGuideMessage = error
    ? "I couldn't use that file. Check the upload message, then choose another DOCX, PPTX, or PDF and Iâ€™ll try again."
    : isAnalyzing
      ? `I am reading ${fileName || "your lecture material"} now and finding the main topics. Keep this page open while I prepare your study session.`
      : `Hi ${studentName}, choose a DOCX, PPTX, or text-based PDF from your lecture materials. I will read it and find the main topics for us to study.`;

  async function handleFile(file: File) {
    setError("");
    setParsedSummary("");
    setErrorKind("file");
    setTopicMap(null);
    setSelectedTopicId("");
    setLectureVisuals([]);
    setConversation([]);
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizGrade(null);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "docx" && extension !== "pptx" && extension !== "pdf") {
      setError("Please choose a Word (.docx), PowerPoint (.pptx), or PDF (.pdf) lecture file.");
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
      setLectureVisuals(parsed.visuals);
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

  function buildTeachRequest(studentMessage: string, recentTurns: TutorChatTurn[]): TeachRequest | null {
    const topic = topicMap?.topics.find((item) => item.id === selectedTopicId);
    if (!topic || !topicMap) return null;
    const excerptIds = new Set(topic.excerptIds);
    const visualIds = new Set(topic.visualIds);
    return {
      action: "teach",
      topic: { id: topic.id, title: topic.title, summary: topic.summary },
      excerpts: topicMap.excerpts.filter((excerpt) => excerptIds.has(excerpt.id)),
      visualNotes: topicMap.visualNotes.filter((note) => visualIds.has(note.visualId)),
      visuals: lectureVisuals.filter((visual) => visualIds.has(visual.id)),
      recentTurns: recentTurns.slice(-8).map(({ role, content }) => ({ role, content })),
      studentMessage,
    };
  }

  async function beginLesson(studentMessage: string) {
    const request = buildTeachRequest(studentMessage, []);
    if (!request) return;
    setTutorError("");
    setIsTeaching(true);
    try {
      const response = await askTutor(request);
      setConversation([
        { role: "student", content: studentMessage },
        { role: "tutor", content: `${response.message}\n\n${response.nextQuestion}`, understanding: response.understanding },
      ]);
      setScreen("tutor");
    } catch (cause) {
      setTutorError(cause instanceof Error ? cause.message : "ST couldn't start the lesson. Please try again.");
    } finally {
      setIsTeaching(false);
    }
  }

  async function continueLesson(studentMessage: string) {
    const request = buildTeachRequest(studentMessage, conversation);
    if (!request) return;
    setTutorError("");
    setIsTeaching(true);
    try {
      const response = await askTutor(request);
      setConversation((current) => [
        ...current,
        { role: "student", content: studentMessage },
        { role: "tutor", content: `${response.message}\n\n${response.nextQuestion}`, understanding: response.understanding },
      ]);
    } catch (cause) {
      setTutorError(cause instanceof Error ? cause.message : "ST couldn't respond just now. Please try again.");
    } finally {
      setIsTeaching(false);
    }
  }

  function buildQuizContext() {
    const topic = topicMap?.topics.find((item) => item.id === selectedTopicId);
    if (!topic || !topicMap) return null;
    const excerptIds = new Set(topic.excerptIds);
    const visualIds = new Set(topic.visualIds);
    return {
      topic: { id: topic.id, title: topic.title, summary: topic.summary },
      excerpts: topicMap.excerpts.filter((excerpt) => excerptIds.has(excerpt.id)),
      visualNotes: topicMap.visualNotes.filter((note) => visualIds.has(note.visualId)),
      visuals: lectureVisuals.filter((visual) => visualIds.has(visual.id)),
      recentTurns: conversation.slice(-8).map(({ role, content }) => ({ role, content })),
    };
  }

  function openQuizSetup() {
    setTutorError("");
    setQuizGrade(null);
    setScreen("quiz-setup");
  }

  async function createQuiz() {
    const context = buildQuizContext();
    if (!context) return;
    setTutorError("");
    setIsTeaching(true);
    try {
      const request: QuizRequest = { action: "quiz", ...context, quizType, questionCount };
      const questions = await generateQuiz(request);
      setQuizQuestions(questions);
      setQuizAnswers({});
      setQuizGrade(null);
      setScreen("quiz");
    } catch (cause) {
      setTutorError(cause instanceof Error ? cause.message : "ST couldn't prepare your quiz. Please try again.");
    } finally {
      setIsTeaching(false);
    }
  }

  async function submitQuiz() {
    const context = buildQuizContext();
    if (!context || !quizQuestions.length) return;
    setTutorError("");
    setIsTeaching(true);
    try {
      const request: GradeQuizRequest = {
        action: "grade",
        ...context,
        questions: quizQuestions,
        answers: quizQuestions.map((question) => ({ questionId: question.id, answer: quizAnswers[question.id] ?? "" })),
      };
      const result = await gradeQuiz(request);
      setQuizGrade(result);
      setScreen("results");
    } catch (cause) {
      setTutorError(cause instanceof Error ? cause.message : "ST couldn't grade your answers. Please try again.");
    } finally {
      setIsTeaching(false);
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
                <TopicPicker fileName={fileName} topicMap={topicMap} selectedTopicId={selectedTopicId} onSelect={(topicId) => { setSelectedTopicId(topicId); setTutorError(""); }} isStarting={isTeaching} error={tutorError} onStart={beginLesson} onReplace={() => { setTopicMap(null); setLectureVisuals([]); setConversation([]); setSelectedTopicId(""); setScreen("upload"); setFileName(""); setError(""); setParsedSummary(""); }} />
              </motion.div>
            ) : screen === "tutor" && topicMap ? (
              <motion.div key="tutor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                {(() => {
                  const topic = topicMap.topics.find((item) => item.id === selectedTopicId);
                  return topic ? <TutorSession topicTitle={topic.title} topicSummary={topic.summary} turns={conversation} pending={isTeaching} error={tutorError} onSend={continueLesson} onReadyForQuiz={openQuizSetup} onBack={() => { setScreen("topics"); setTutorError(""); }} /> : null;
                })()}
              </motion.div>
            ) : (screen === "quiz-setup" || screen === "quiz" || screen === "results") && topicMap ? (
              <motion.div key={screen} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                {(() => {
                  const topic = topicMap.topics.find((item) => item.id === selectedTopicId);
                  return topic ? <QuizFlow
                    stage={screen === "quiz-setup" ? "setup" : screen === "quiz" ? "questions" : "results"}
                    topicTitle={topic.title}
                    quizType={quizType}
                    questionCount={questionCount}
                    questions={quizQuestions}
                    answers={quizAnswers}
                    grade={quizGrade}
                    pending={isTeaching}
                    error={tutorError}
                    onTypeChange={setQuizType}
                    onCountChange={setQuestionCount}
                    onGenerate={createQuiz}
                    onAnswer={(questionId, answer) => setQuizAnswers((current) => ({ ...current, [questionId]: answer }))}
                    onSubmit={submitQuiz}
                    onBack={() => { setScreen("tutor"); setTutorError(""); }}
                  /> : null;
                })()}
              </motion.div>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                <MaterialUploader fileName={fileName} error={error} errorTitle={errorKind === "file" ? "We couldn't read that file yet." : "Your material was read, but your tutor couldn't finish the analysis."} parsedSummary={parsedSummary} busy={isAnalyzing} onFile={handleFile} />
              </motion.div>
            )}
          </AnimatePresence>
          {screen === "upload" && <FloatingTutorGuide message={tutorGuideMessage} />}
          <footer className="workspace-footer">A little progress, made personal <span aria-hidden="true">✦</span></footer>
        </motion.main>
      )}
    </AnimatePresence>
  );
}


