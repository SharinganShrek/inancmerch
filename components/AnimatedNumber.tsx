"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const start = current.current;
    const end = value;
    if (start === end) return;
    const t0 = performance.now();
    const dur = 650;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(start + (end - start) * eased);
      current.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString("tr-TR")}</>;
}
