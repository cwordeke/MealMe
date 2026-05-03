import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { CampusId, DietaryPreferences, Goal, UserStats } from '@/types';

const PHRASES = [
  'Analyzing macros...',
  'Scanning campus dining halls...',
  'Calculating optimal meals...',
  'Finalizing your menu...',
] as const;

/** Overall wall-clock duration — bursts + pauses fit inside this window. */
const DURATION_MS = 3500;
const PHRASE_INTERVAL_MS = 800;

/** Normalized time u ∈ [0,1] → progress with bursts & plateaus (macro engine “thinking”). */
const ENGINE_CURVE: [number, number][] = [
  [0, 0],
  [0.1, 0.24],
  [0.18, 0.24],
  [0.36, 0.52],
  [0.44, 0.52],
  [0.6, 0.72],
  [0.68, 0.72],
  [0.82, 0.93],
  [0.9, 0.93],
  [1, 1],
];

function sampleCurve(u: number, points: [number, number][]): number {
  const t = Math.min(1, Math.max(0, u));
  if (t <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [u0, p0] = points[i];
    const [u1, p1] = points[i + 1];
    if (t <= u1) {
      const w = u1 <= u0 ? 1 : (t - u0) / (u1 - u0);
      return p0 + w * (p1 - p0);
    }
  }
  return points[points.length - 1][1];
}

function progressAtElapsed(elapsedMs: number): number {
  return sampleCurve(elapsedMs / DURATION_MS, ENGINE_CURVE);
}

const R = 44;
const C = 2 * Math.PI * R;
const SIZE = 120;
const CENTER = 60;

export type PlanPersonalizingPayload = {
  stats: UserStats;
  goal: Goal;
  preferences: DietaryPreferences;
  campusId: CampusId;
};

interface PlanPersonalizingLoaderProps {
  userData: PlanPersonalizingPayload;
  onComplete: (data: PlanPersonalizingPayload) => void;
}

export default function PlanPersonalizingLoader({
  userData,
  onComplete,
}: PlanPersonalizingLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let finished = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = now - t0;
      const u = Math.min(1, elapsed / DURATION_MS);
      setProgress(progressAtElapsed(elapsed));
      setPhraseIndex(Math.min(PHRASES.length - 1, Math.floor(elapsed / PHRASE_INTERVAL_MS)));

      if (u >= 1) {
        if (!finished && !cancelled) {
          finished = true;
          onCompleteRef.current(userData);
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [userData]);

  const offset = C * (1 - progress);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-white font-sans text-neutral-900">
      <h1 className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-center text-lg font-bold leading-snug tracking-tight text-neutral-800 sm:text-xl">
        Personalizing your plan...
      </h1>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:px-8">
        <div className="flex w-full max-w-3xl flex-col items-center">
          <div
            className="relative aspect-square w-64 min-h-64 min-w-64 shrink-0 sm:h-80 sm:w-80 sm:min-h-80 sm:min-w-80 md:h-96 md:w-96 md:min-h-96 md:min-w-96"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Macro engine calibration progress"
          >
            <svg
              className="size-full -rotate-90"
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              aria-hidden
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={R}
                fill="none"
                className="stroke-neutral-200"
                strokeWidth="7"
              />
              <circle
                cx={CENTER}
                cy={CENTER}
                r={R}
                fill="none"
                className="text-primary"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="butt"
                strokeDasharray={C}
                strokeDashoffset={offset}
              />
            </svg>
            <img
              src="/MealMeIcon.png"
              alt=""
              className="pointer-events-none absolute left-1/2 top-1/2 size-[min(44%,12rem)] max-h-[48%] max-w-[48%] min-h-[7.5rem] min-w-[7.5rem] -translate-x-1/2 -translate-y-1/2 object-contain sm:min-h-[9rem] sm:min-w-[9rem] md:min-h-[11rem] md:min-w-[11rem]"
              decoding="async"
            />
          </div>

          <div className="mt-12 min-h-[4rem] w-full max-w-lg text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={phraseIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="text-lg font-bold tracking-tight text-neutral-800 sm:text-xl"
              >
                {PHRASES[phraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
