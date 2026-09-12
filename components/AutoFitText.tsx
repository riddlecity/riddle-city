interface AutoFitTextProps {
  text: string;
  className?: string; // layout classes for the wrapper (margin, transition, positioning, etc.)
  style?: React.CSSProperties; // extra styles applied to the text itself (e.g. textShadow)
}

// Riddle text: responsive size via clamp(), authored "\n" line breaks are
// respected, and if a line is still too long for the screen it wraps with
// "balance" so it splits evenly across lines instead of leaving a lone word
// dangling by itself under an otherwise-full line.
export default function AutoFitText({ text, className, style }: AutoFitTextProps) {
  // Each authored line gets its own block + independent "balance" pass -
  // applying balance across the whole multi-line block at once let earlier
  // lines skew the wrap point for later ones, getting worse line by line.
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="font-bold text-white leading-tight drop-shadow-lg"
          style={{
            textWrap: "balance",
            fontSize: "clamp(1.25rem, 5.5vw, 2.25rem)",
            ...style,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
