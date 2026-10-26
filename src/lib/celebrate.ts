import confetti from 'canvas-confetti';

const PL_COLOURS = ['#FF2882', '#04F5FF', '#00FF85', '#FFFFFF', '#37003C'];

/** Goal-celebration confetti from both corners plus a centre burst. */
export function celebrate(colours: string[] = PL_COLOURS): void {
  const end = Date.now() + 1400;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: colours, zIndex: 300 });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: colours, zIndex: 300 });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.55 }, colors: colours, zIndex: 300 });
  frame();
}
