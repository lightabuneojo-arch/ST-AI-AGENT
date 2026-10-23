"use client";

import type { ChangeEvent } from "react";

type MaterialUploaderProps = {
  fileName: string;
  error: string;
  errorTitle: string;
  parsedSummary: string;
  busy: boolean;
  onFile: (file: File) => void;
};

export default function MaterialUploader({ fileName, error, errorTitle, parsedSummary, busy, onFile }: MaterialUploaderProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) onFile(file);
    event.currentTarget.value = "";
  }

  return (
    <section className="upload-card">
      <div className="upload-icon"><span>↑</span></div>
      <p className="eyebrow violet-text">YOUR MATERIAL, MADE CLEAR</p>
      <h2>Start with a lecture Material.</h2>
      <p className="card-copy">Upload one Word document, PowerPoint, or text-based PDF. Your tutor will read the text and useful visuals, then find the main topics to study.</p>
      <label className={`drop-zone ${busy ? "is-busy" : ""}`}>
        <input type="file" accept=".docx,.pptx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf" onChange={handleChange} disabled={busy} />
        <span className="file-icon">▤</span>
        <strong>{busy ? "Reading your material…" : fileName || "Choose a lecture file"}</strong>
        <span>{busy ? "This can take a little moment" : "DOCX, PPTX or PDF · Up to 15 MB"}</span>
        {!busy && <span className="choose-button">Browse files</span>}
      </label>
      {busy && <div className="analysis-steps" aria-live="polite"><p><span className="step-dot active" /> Reading your material</p><p><span className="step-dot" /> Identifying the main topics</p><p><span className="step-dot" /> Preparing your study session</p></div>}
      {error && <div className="error-box" role="alert"><strong>{errorTitle}</strong><span>{error}</span>{parsedSummary && <small>{parsedSummary}</small>}<small>Please try again, or choose another DOCX, PPTX, or PDF.</small></div>}
      <div className="privacy-note"><span>◈</span> Your lecture stays in this browser session and is only sent for tutor analysis.</div>
    </section>
  );
}
