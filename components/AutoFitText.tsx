"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface AutoFitTextProps {
  text: string;
  className?: string; // layout classes for the wrapper (margin, transition, positioning, etc.)
  style?: React.CSSProperties; // extra styles applied to the text itself (e.g. textShadow)
  maxPx?: number;
  minPx?: number;
}

// Shrinks font-size (binary search) until every authored line fits its
// container width without wrapping - riddles use "\n" for intentional line
// breaks, but a long line wrapping mid-word looked like a stray extra line
// under a full one, which read as confusing/unintentional.
export default function AutoFitText({ text, className, style, maxPx = 44, minPx = 19 }: AutoFitTextProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxPx);
  const [wrapAtFloor, setWrapAtFloor] = useState(false);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const textEl = textRef.current;
    if (!wrapper || !textEl) return;

    function fit() {
      const containerWidth = wrapper!.clientWidth;
      textEl!.style.fontSize = `${maxPx}px`;
      if (textEl!.scrollWidth <= containerWidth) {
        setFontSize(maxPx);
        setWrapAtFloor(false);
        return;
      }

      let lo = minPx;
      let hi = maxPx;
      let best = minPx;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        textEl!.style.fontSize = `${mid}px`;
        if (textEl!.scrollWidth <= containerWidth) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      setFontSize(best);

      // Even the smallest readable size doesn't fit this line - wrap instead
      // of shrinking further into illegibility.
      textEl!.style.fontSize = `${minPx}px`;
      setWrapAtFloor(textEl!.scrollWidth > containerWidth);
    }

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text, maxPx, minPx]);

  return (
    <div ref={wrapperRef} className={className}>
      <div
        ref={textRef}
        className="font-bold text-white leading-tight drop-shadow-lg inline-block"
        style={{ whiteSpace: wrapAtFloor ? "pre-wrap" : "pre", fontSize: `${fontSize}px`, ...style }}
      >
        {text}
      </div>
    </div>
  );
}
