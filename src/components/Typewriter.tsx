import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  /** ms per character. */
  speed?: number;
  delay?: number;
  onDone?: () => void;
  className?: string;
}

export function Typewriter({ text, speed = 75, delay = 600, onDone, className }: Props) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setCount(0);
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) {
          clearInterval(interval);
          doneRef.current?.();
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, speed, delay]);

  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      <span aria-hidden="true" style={{ animation: 'caret 0.9s steps(1) infinite' }}>
        ▌
      </span>
    </p>
  );
}
