"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface AutoFitTextProps {
  text: string;
  className?: string; // layout classes for the wrapper (margin, transition, positioning, etc.)
  style?: React.CSSProperties; // extra styles applied to the text itself (e.g. textShadow)
  minPx?: number;
}

// Responsive default so text is still reasonably sized before JS hydrates
// (or if it never runs) - JS only overrides this to shrink further (or, as a
// last resort, wrap) when a specific line is too long to fit at this size.
const BASE_FONT_CLAMP = "clamp(1.15rem, 5.5vw, 2rem)";

// Shrinks font-size (binary search) until every authored line fits its
// container width without wrapping - riddles use "\n" for intentional line
// breaks, but a long line wrapping mid-word looked like a stray extra line
// under a full one, which read as confusing/unintentional.
export default function AutoFitText({ text, className, style, minPx = 19 }: AutoFitTextProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSizeOverride, setFontSizeOverride] = useState<number | null>(null);
  const [wrapAtFloor, setWrapAtFloor] = useState(false);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const textEl = textRef.current;
    if (!wrapper || !textEl) return;

    function fit() {
      // Reset to the base responsive size before measuring so re-fits (e.g.
      // on resize) always start from a clean slate instead of compounding.
      textEl!.style.fontSize = BASE_FONT_CLAMP;
      textEl!.style.whiteSpace = "pre";
      const containerWidth = wrapper!.clientWidth;
      const basePx = parseFloat(getComputedStyle(textEl!).fontSize);

      if (textEl!.scrollWidth <= containerWidth) {
        setFontSizeOverride(null);
        setWrapAtFloor(false);
        return;
      }

      let lo = minPx;
      let hi = Math.ceil(basePx);
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
      setFontSizeOverride(best);

      // Even the smallest readable size doesn't fit this line - wrap instead
      // of shrinking further into illegibility.
      textEl!.style.fontSize = `${minPx}px`;
      setWrapAtFloor(textEl!.scrollWidth > containerWidth);
    }

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [text, minPx]);

  return (
    // min-width:0 stops "white-space:pre" text from being treated as an
    // unshrinkable min-content size by flex/grid ancestors, which would
    // otherwise force the whole layout wider than the viewport.
    <div ref={wrapperRef} className={className} style={{ minWidth: 0, overflow: "hidden" }}>
      <div
        ref={textRef}
        className="font-bold text-white leading-tight drop-shadow-lg inline-block"
        style={{
          whiteSpace: wrapAtFloor ? "pre-wrap" : "pre",
          // Only relevant when wrapAtFloor forces a wrap - spreads words
          // evenly across lines instead of greedily filling each line and
          // leaving a lone word dangling on the last one.
          textWrap: wrapAtFloor ? "balance" : undefined,
          fontSize: fontSizeOverride ? `${fontSizeOverride}px` : BASE_FONT_CLAMP,
          ...style,
        }}
      >
        {text}
      </div>
    </div>
  );
}
