"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface AutoFitTextProps {
  text: string;
  className?: string; // layout classes for the wrapper (margin, transition, positioning, etc.)
  style?: React.CSSProperties; // extra styles applied to the text itself (e.g. textShadow)
}

const MAX_PX = 34;
const MIN_PX = 19;
const REF_PX = 100; // reference size used for canvas measurement, then scaled
// Responsive fallback shown before JS measures (or if it never runs) -
// avoids a flat, oversized font on the server-rendered/pre-hydration paint.
const BASE_FONT_CLAMP = "clamp(1.15rem, 5.5vw, 2rem)";

// Riddle text: each authored "\n" line is measured (via canvas, not layout,
// so this can never trigger the flex/grid min-width overflow bugs we hit
// before) and given the largest font size that lets IT fit on one line, up
// to MAX_PX - preferring a full line over shrinking too far or wrapping.
// Normal wrapping always stays enabled as a safe fallback if a line is too
// long even at MIN_PX, and "balance" keeps any such wrap looking even rather
// than leaving a lone word dangling.
export default function AutoFitText({ text, className, style }: AutoFitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = text.split("\n");
  const [fontSizes, setFontSizes] = useState<(number | null)[]>(() => lines.map(() => null));

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function recompute() {
      const containerWidth = container!.clientWidth;
      if (containerWidth <= 0) return;

      const fontFamily = getComputedStyle(container!).fontFamily || "sans-serif";

      const sizes = lines.map((line) => {
        if (!line.trim()) return MAX_PX;
        ctx!.font = `700 ${REF_PX}px ${fontFamily}`;
        const refWidth = ctx!.measureText(line).width;
        if (refWidth <= 0) return MAX_PX;
        const idealPx = (containerWidth / refWidth) * REF_PX;
        return Math.min(MAX_PX, Math.max(MIN_PX, Math.floor(idealPx)));
      });
      setFontSizes(sizes);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [text]);

  return (
    <div ref={containerRef} className={className}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="font-bold text-white leading-tight drop-shadow-lg"
          style={{
            textWrap: "balance",
            fontSize: fontSizes[i] != null ? `${fontSizes[i]}px` : BASE_FONT_CLAMP,
            ...style,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}
