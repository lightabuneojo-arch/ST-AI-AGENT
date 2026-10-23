"use client";

import { useState } from "react";
import type { QuizGrade, QuizQuestion } from "@/shared/contracts";

export type QuizMode = "objective" | "theory";
export type QuizAnswers = Record<string, string>;

type QuizFlowProps = {
  stage: "setup" | "questions" | "results";
  topicTitle: string;
  quizType: QuizMode;
  questionCount: 5 | 10 | 15;
  questions: QuizQuestion[];
  answers: QuizAnswers;
  grade: QuizGrade | null;
  pending: boolean;
  error: string;
  onTypeChange: (type: QuizMode) => void;
  onCountChange: (count: 5 | 10 | 15) => void;
  onGenerate: () => void;
  onAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export default function QuizFlow({ stage, topicTitle, quizType, questionCount, questions, answers, grade, pending, error, onTypeChange, onCountChange, onGenerate, onAnswer, onSubmit, onBack }: QuizFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const passed = grade?.evaluations.filter((evaluation) => evaluation.passed).length ?? 0;
  const failed = grade ? grade.evaluations.length - passed : 0;
  const score = grade ? Math.round((passed / grade.evaluations.length) * 100) : 0;

  return (
    <section className="quiz-card">
      <p className="eyebrow violet-text">{stage === "results" ? "SESSION COMPLETE" : "A QUICK CHECK FOR UNDERSTANDING"}</p>
      <h2>{stage === "setup" ? "Choose your practice quiz." : stage === "questions" ? topicTitle : "Your learning check-in"}</h2>
      <p className="quiz-description">{stage === "setup" ? `ST will build questions from your lecture and the ${topicTitle} lesson.` : stage === "questions" ? `${quizType === "objective" ? "Objective" : "Theory"} quiz · ${questions.length} questions` : "Here is how you did on the material you studied."}</p>

      {stage === "setup" && <>
        <fieldset className="quiz-fieldset">
          <legend>Choose a question style</legend>
          <div className="quiz-choice-grid">
            <button type="button" className={`quiz-choice ${quizType === "objective" ? "selected" : ""}`} onClick={() => onTypeChange("objective")}><strong>Objective</strong><span>Choose the best answer from options.</span></button>
            <button type="button" className={`quiz-choice ${quizType === "theory" ? "selected" : ""}`} onClick={() => onTypeChange("theory")}><strong>Theory</strong><span>Explain your answer in your own words.</span></button>
          </div>
        </fieldset>
        <fieldset className="quiz-fieldset">
          <legend>How many questions?</legend>
          <div className="quiz-count-options">{([5, 10, 15] as const).map((count) => <button key={count} type="button" className={`quiz-count ${questionCount === count ? "selected" : ""}`} onClick={() => onCountChange(count)}>{count}</button>)}</div>
        </fieldset>
        <p className="quiz-grounding-note">Questions stay focused on your uploaded lecture. If the material cannot support the full number with good questions, ST may give you fewer.</p>
        {error && <p className="tutor-session-error" role="alert">{error}</p>}
        <button className="primary-button quiz-main-button" type="button" onClick={onGenerate} disabled={pending}>{pending ? "ST is preparing your quiz..." : "Create my quiz"}<span aria-hidden="true">→</span></button>
        <button className="text-button quiz-back-link" type="button" onClick={onBack} disabled={pending}>Back to the tutoring session</button>
      </>}

      {stage === "questions" && questions.length > 0 && (() => {
        const question = questions[currentIndex];
        return <div className="quiz-question-panel">
          {questions.length < questionCount && <p className="quiz-grounding-note">ST found {questions.length} quality questions for this topic and kept them grounded in your lecture.</p>}
          <div className="quiz-progress-row"><span>Question {currentIndex + 1} of {questions.length}</span><div className="quiz-progress"><i style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div></div>
          <h3>{question.prompt}</h3>
          {question.type === "objective" ? <div className="quiz-answer-options" role="radiogroup" aria-label="Answer options">{question.options.map((option, index) => <label className={`quiz-answer-option ${answers[question.id] === String(index) ? "selected" : ""}`} key={`${question.id}-${index}`}><input type="radio" name={question.id} value={index} checked={answers[question.id] === String(index)} onChange={() => onAnswer(question.id, String(index))} /><span className="quiz-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span></label>)}</div> : <textarea className="quiz-theory-answer" value={answers[question.id] ?? ""} onChange={(event) => onAnswer(question.id, event.target.value)} placeholder="Write what you understand in your own words..." maxLength={2_000} />}
          {error && <p className="tutor-session-error" role="alert">{error}</p>}
          <div className="quiz-navigation">
            <button className="quiz-secondary-button" type="button" onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))} disabled={currentIndex === 0 || pending}>Previous</button>
            {currentIndex < questions.length - 1 ? <button className="primary-button" type="button" onClick={() => setCurrentIndex((index) => index + 1)} disabled={!answers[question.id]?.trim() || pending}>Next <span aria-hidden="true">→</span></button> : <button className="primary-button" type="button" onClick={onSubmit} disabled={!answers[question.id]?.trim() || pending}>{pending ? "ST is reviewing..." : "Submit answers"}<span aria-hidden="true">→</span></button>}
          </div>
        </div>;
      })()}

      {stage === "results" && grade && <>
        <div className="quiz-score-panel"><strong>{score}%</strong><span>{grade.evaluations.length} answered · {passed} passed · {failed} failed</span></div>
        <p className="quiz-encouragement">{grade.encouragement}</p>
        <div className="quiz-results-list">{questions.map((question, index) => {
          const evaluation = grade.evaluations.find((item) => item.questionId === question.id);
          return <article className="quiz-result-item" key={question.id}><div><span className="quiz-result-index">Question {index + 1}</span><span className={`quiz-result-status ${evaluation?.passed ? "passed" : "failed"}`}>{evaluation?.passed ? "Passed" : "Needs revision"}</span></div><p>{question.prompt}</p><small>{evaluation?.feedback}</small>{evaluation && !evaluation.passed && <small className="revision-area">Review: {evaluation.revisionArea}</small>}</article>;
        })}</div>
        {error && <p className="tutor-session-error" role="alert">{error}</p>}
        <button className="text-button quiz-back-link" type="button" onClick={onBack}>Return to the tutoring session</button>
      </>}
    </section>
  );
}
