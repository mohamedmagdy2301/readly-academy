/** Shared SVG arrow markers referenced by every diagram as url(#mk-*). Rendered once in the layout. */
const COLORS: Record<string, string> = {
  ink: "var(--ink)",
  acc: "var(--accent)",
  warn: "var(--warn)",
  mut: "var(--muted)",
  good: "var(--good)",
};

export default function MarkerDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        {Object.entries(COLORS).map(([key, color]) => (
          <marker key={key} id={`mk-${key}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10z" fill={color} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
