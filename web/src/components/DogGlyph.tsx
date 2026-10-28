/**
 * One dog, in the spirit of ISOTYPE: one figure stands for one animal.
 * Marked (vaccinated) dogs are filled in mark green, unmarked dogs are an
 * ink outline, and a dog that couldn't be read is a dashed outline.
 */

export const DOG_PATH =
  "M3.4 2.8C3.9 6.6 5.6 8.4 8.8 8.6H23.2C24.5 8.6 25.3 7.4 25.7 5.6L26.7 1.6L28.5 4.4L31.6 4.9C33.1 5.2 33.9 6.1 33.7 7.1C33.6 7.9 32.9 8.4 32 8.4H29.7C28.6 9.3 27.8 10.8 27.6 12.8V22.4H25.3V16.4H24.4V22.4H22.1V15.2H13.3V22.4H11V16.4H10.1V22.4H7.8V14.6C7 13.6 6.8 12.1 7.2 10.4C4.4 9.6 2.6 7 2.3 3.2Z";

export type GlyphStatus = "marked" | "unmarked" | "unknown" | "empty";

export function DogGlyph({
  status = "unmarked",
  size = 28,
  className = "",
  title,
}: {
  status?: GlyphStatus;
  size?: number;
  className?: string;
  title?: string;
}) {
  const filled = status === "marked";
  return (
    <svg
      viewBox="0 0 36 24"
      width={size}
      height={(size * 24) / 36}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d={DOG_PATH}
        fill={filled ? "var(--mark)" : status === "empty" ? "var(--canvas-2)" : "none"}
        stroke={filled ? "var(--mark)" : status === "empty" ? "none" : "var(--ink)"}
        strokeWidth={filled ? 0 : size < 44 ? 1.7 : 1.15}
        strokeDasharray={status === "unknown" ? "1.6 1.4" : undefined}
        strokeLinejoin="round"
        style={{ transition: "fill 420ms var(--ease-out-quint), stroke 420ms var(--ease-out-quint)" }}
      />
    </svg>
  );
}
