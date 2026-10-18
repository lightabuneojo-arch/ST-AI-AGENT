"use client";

import type { TopicMap } from "@/shared/contracts";

type TopicPickerProps = {
  fileName: string;
  topicMap: TopicMap;
  selectedTopicId: string;
  onSelect: (topicId: string) => void;
  onReplace: () => void;
};

export default function TopicPicker({ fileName, topicMap, selectedTopicId, onSelect, onReplace }: TopicPickerProps) {
  return (
    <section className="topics-card">
      <div className="ready-row"><span className="ready-check">✓</span><span>Material ready</span><span className="file-chip">▤ {fileName}</span></div>
      <p className="eyebrow violet-text">A GOOD PLACE TO BEGIN</p>
      <h2>Here are the key topics I found.</h2>
      <p className="card-copy">Choose one that feels challenging, or start with the first topic. I’ll use the lecture’s explanations and visuals as our guide.</p>
      <div className="topic-list">
        {topicMap.topics.map((topic, index) => (
          <button key={topic.id} className={`topic-item ${selectedTopicId === topic.id ? "topic-selected" : ""}`} onClick={() => onSelect(topic.id)}>
            <span className="topic-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="topic-copy"><strong>{topic.title}</strong><small>{topic.summary}</small></span>
            <span className="topic-arrow">{selectedTopicId === topic.id ? "✓" : "↗"}</span>
          </button>
        ))}
      </div>
      {selectedTopicId && <p className="selection-note"><span>✧</span> Topic selected. Your lesson will begin in the next step.</p>}
      <button className="text-button replace-button" onClick={onReplace}>Upload a different material</button>
    </section>
  );
}
