interface AutoFitTextProps {
  text: string;
  className?: string; // layout classes for the wrapper (margin, transition, positioning, etc.)
  style?: React.CSSProperties; // extra styles applied to the text itself (e.g. textShadow)
}

// One consistent size for all riddle text. Each authored "\n" line is its
// own block with its own "balance" pass, so a line that's too long to fit
// wraps evenly across exactly the lines it needs, instead of leaving a lone
// word dangling under an otherwise-full line - it never shrinks the font.
export default function AutoFitText({ text, className, style }: AutoFitTextProps) {
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="font-bold text-white leading-tight drop-shadow-lg"
          style={{
            textWrap: "balance",
            fontSize: "clamp(1rem, 4.5vw, 1.6rem)",
            ...style,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
