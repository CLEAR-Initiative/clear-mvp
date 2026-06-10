/** Accent-bordered card with a colored bullet list (hazards / displacement). */
export function BulletCard({
  tone,
  label,
  items,
}: {
  tone: "red" | "amber" | "blue" | "green";
  label: string;
  items: string[];
}) {
  return (
    <div className={`accent-card ${tone}`}>
      <div className="ac-label">{label}</div>
      <div className="bullet-list">
        {items.length > 0 ? (
          items.map((it, i) => (
            <div className="bullet" key={i}>
              <span className="b">·</span>
              <span>{it}</span>
            </div>
          ))
        ) : (
          <div className="bullet" style={{ color: "var(--ink-4)" }}>
            <span>None reported</span>
          </div>
        )}
      </div>
    </div>
  );
}
