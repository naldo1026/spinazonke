import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

// Any JSON dropped into src/assets/lottie/ becomes available by file name.
const files = import.meta.glob<{ default: object }>('../assets/lottie/*.json');

// lottie-web is big, so it only loads if a Lottie file is actually used.
const Lottie = lazy(() => import('lottie-react').then((m) => ({ default: m.Lottie })));

export type AnimName = 'football' | 'padlock' | 'coin' | 'confetti' | 'var' | 'heartbreak';

export function hasLottie(name: AnimName): boolean {
  return `../assets/lottie/${name}.json` in files;
}

interface Props {
  name: AnimName;
  /** Built-in CSS/SVG version, used when there's no Lottie file for this slot. */
  fallback: ReactNode;
  loop?: boolean;
  className?: string;
}

/** A Lottie slot: plays src/assets/lottie/<name>.json if it exists, else the fallback. */
export function Anim({ name, fallback, loop = false, className }: Props) {
  const load = files[`../assets/lottie/${name}.json`];
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    if (!load) return;
    let live = true;
    load()
      .then((m) => live && setData(m.default))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [load]);

  if (!load) return <>{fallback}</>;
  if (!data) return <div className={className} />;
  return (
    <Suspense fallback={<div className={className} />}>
      <Lottie src={data} autoplay loop={loop} className={className} />
    </Suspense>
  );
}
