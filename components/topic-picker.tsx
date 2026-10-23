"use client";

import { useState, type FormEvent } from "react";
import type { TopicMap } from "@/shared/contracts";

type TopicPickerProps = {
  fileName: string;
  topicMap: TopicMap;
  selectedTopicId: string;
  onSelect: (topicId: string) => void;
  isStarting: boolean;
  error: string;
  onStart: (studentMessage: string) => void;
  onReplace: () => void;
};

export default function TopicPicker({ fileName, topicMap, selectedTopicId, onSelect, isStarting, error, onStart, onReplace }: TopicPickerProps) {
  const [topicInput, setTopicInput] = useState("");
  const [studentMessage, setStudentMessage] = useState("");
  const selectedTopic = topicMap.topics.find((topic) => topic.id === selectedTopicId);

  function handleTopicInput(value: string) {
    setTopicInput(value);
    const normalizedValue = value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
    const matchingTopic = topicMap.topics.find((topic) =>
      topic.title.trim().toLocaleLowerCase().replace(/\s+/g, " ") === normalizedValue
    );
    onSelect(matchingTopic?.id ?? "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTopic || isStarting) return;
    onStart(studentMessage.trim() || `I want to learn about ${selectedTopic.title}.`);
  }

  return (
    <section className="topics-card">
      <div className="ready-row"><span className="ready-check">&#10003;</span><span>Material ready</span><span className="file-chip">{fileName}</span></div>
      <p className="eyebrow violet-text">A GOOD PLACE TO BEGIN</p>
      <h2>Here are the key topics I found.</h2>
      <p className="card-copy">Choose a topic from the list or type its name below. ST will use your lecture's explanations and visuals as our guide.</p>
      <div className="topic-list">
        {topicMap.topics.map((topic, index) => (
          <button key={topic.id} type="button" className={`topic-item ${selectedTopicId === topic.id ? "topic-selected" : ""}`} onClick={() => { setTopicInput(topic.title); onSelect(topic.id); }}>
            <span className="topic-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="topic-copy"><strong>{topic.title}</strong><small>{topic.summary}</small></span>
            <span className="topic-arrow">{selectedTopicId === topic.id ? "\u2713" : "\u2197"}</span>
          </button>
        ))}
      </div>
      <form className="lesson-start-form" onSubmit={handleSubmit}>
        <label htmlFor="topic-of-interest">Which topic would you like to learn?</label>
        <input
          id="topic-of-interest"
          className="topic-interest-input"
          list="identified-topics"
          value={topicInput}
          onChange={(event) => handleTopicInput(event.target.value)}
          placeholder="Type or choose a topic from the list"
          autoComplete="off"
          required
          disabled={isStarting}
        />
        <datalist id="identified-topics">
          {topicMap.topics.map((topic) => <option key={topic.id} value={topic.title} />)}
        </datalist>
        {topicInput.trim() && !selectedTopic && <p className="topic-match-hint">Choose one of the topics ST found so the lesson stays grounded in your material.</p>}
        {selectedTopic && (
          <>
            <label htmlFor="student-confusion">What part feels unclear? <span>(optional)</span></label>
            <p>ST will adapt the first explanation to what you share here.</p>
            <textarea
              id="student-confusion"
              value={studentMessage}
              onChange={(event) => setStudentMessage(event.target.value)}
              placeholder="For example: I understand the definition, but I don't see how the process works."
              maxLength={1_000}
              disabled={isStarting}
            />
          </>
        )}
        {error && <p className="tutor-session-error" role="alert">{error}</p>}
        <button className="primary-button lesson-start-button" type="submit" disabled={!selectedTopic || isStarting}>
          {isStarting ? "ST is preparing your lesson..." : "Start learning with ST"}<span aria-hidden="true">&#8594;</span>
        </button>
      </form>
      <button className="text-button replace-button" type="button" onClick={onReplace}>Upload a different material</button>
    </section>
  );
}
