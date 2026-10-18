export default function TutorCharacter({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`agent-character${compact ? " agent-character-compact" : ""}`} aria-hidden="true">
      <span className="agent-antenna" />
      <span className="agent-eye agent-eye-left" />
      <span className="agent-eye agent-eye-right" />
      <span className="agent-smile" />
      <span className="agent-status" />
    </div>
  );
}
