import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type MacroTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

/** viewBox 200×200, r tuned for thick stroke clearance */
const R = 71;
const CIRC = 2 * Math.PI * R;
const SW = 16;
const VB = 200;
const VC = VB / 2;

function formatEnergy(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

type MacroRingProps = {
  label: string;
  current: number;
  goal: number;
  stroke: string;
  trackStroke: string;
  ringRef: RefObject<SVGCircleElement | null>;
  trackRef: RefObject<SVGCircleElement | null>;
};

function MacroRing({
  label,
  current,
  goal,
  stroke,
  trackStroke,
  ringRef,
  trackRef,
}: MacroRingProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3">
      <p className="text-center text-xs font-semibold tracking-tight text-black">
        {label}
      </p>
      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,192px)]">
        <svg
          className="size-full rotate-[-90deg]"
          viewBox={`0 0 ${VB} ${VB}`}
          aria-hidden
        >
          <circle
            ref={trackRef}
            cx={VC}
            cy={VC}
            r={R}
            fill="none"
            stroke={trackStroke}
            strokeWidth={SW}
            strokeLinecap="round"
          />
          <circle
            ref={ringRef}
            cx={VC}
            cy={VC}
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth={SW}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
          <span className="font-mono text-xs font-semibold tabular-nums">
            {Math.round(current)}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-neutral-500">
            / {Math.round(goal)}g
          </span>
        </div>
      </div>
    </div>
  );
}

type LiveMacroDashboardProps = {
  totals: MacroTotals;
  targets: MacroTargets;
  onSignOut?: () => void;
  flyAnchorRef?: RefObject<HTMLDivElement | null>;
  calorieFillRef: RefObject<HTMLDivElement | null>;
};

export function LiveMacroDashboard({
  totals,
  targets,
  onSignOut,
  flyAnchorRef,
  calorieFillRef,
}: LiveMacroDashboardProps) {
  const proteinRingRef = useRef<SVGCircleElement>(null);
  const proteinTrackRef = useRef<SVGCircleElement>(null);
  const carbsRingRef = useRef<SVGCircleElement>(null);
  const carbsTrackRef = useRef<SVGCircleElement>(null);
  const fatsRingRef = useRef<SVGCircleElement>(null);
  const fatsTrackRef = useRef<SVGCircleElement>(null);

  const firstLayout = useRef(true);

  useLayoutEffect(() => {
    const fill = calorieFillRef.current;
    const pct = Math.min(
      100,
      targets.calories > 0 ? (totals.calories / targets.calories) * 100 : 0,
    );
    const protOff = CIRC * (1 - Math.min(1, totals.protein / Math.max(targets.protein, 1)));
    const carbOff = CIRC * (1 - Math.min(1, totals.carbs / Math.max(targets.carbs, 1)));
    const fatOff = CIRC * (1 - Math.min(1, totals.fats / Math.max(targets.fats, 1)));

    const rings = [
      proteinRingRef.current,
      carbsRingRef.current,
      fatsRingRef.current,
    ].filter(Boolean) as SVGCircleElement[];

    rings.forEach((el) =>
      gsap.killTweensOf(el),
    );
    if (fill) gsap.killTweensOf(fill);

    const dur = firstLayout.current ? 0 : 0.62;
    firstLayout.current = false;

    if (fill) {
      gsap.to(fill, {
        width: `${pct}%`,
        duration: dur,
        ease: dur ? 'power2.out' : 'none',
      });
    }

    const opts = dur
      ? { duration: dur, ease: 'power2.out' as const }
      : { duration: 0 };

    if (proteinRingRef.current) {
      gsap.to(proteinRingRef.current, {
        attr: { strokeDashoffset: protOff },
        ...opts,
      });
    }
    if (carbsRingRef.current) {
      gsap.to(carbsRingRef.current, {
        attr: { strokeDashoffset: carbOff },
        ...opts,
      });
    }
    if (fatsRingRef.current) {
      gsap.to(fatsRingRef.current, {
        attr: { strokeDashoffset: fatOff },
        ...opts,
      });
    }
  }, [
    totals.calories,
    totals.protein,
    totals.carbs,
    totals.fats,
    targets.calories,
    targets.protein,
    targets.carbs,
    targets.fats,
    calorieFillRef,
  ]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white">
      <div ref={flyAnchorRef} id="macro-dashboard-fly-anchor" className="min-w-0 px-6 pb-8 pt-8">
        <h2 className="text-2xl font-bold leading-none tracking-[-0.03em] sm:text-[1.85rem]">
          Today&apos;s progress
        </h2>

        <div className="mt-8">
          <p className="text-sm font-semibold text-neutral-600">
            Calories
          </p>
          <div
            className="mt-3 h-[18px] w-full max-w-full overflow-hidden rounded-sm border border-[#e8ecf0] bg-[#eef1f5]"
          >
            <div
              ref={calorieFillRef}
              className="h-full w-0 max-w-full bg-primary"
            />
          </div>
          <p className="mt-3 font-mono text-[13px] font-semibold tracking-tight text-black sm:text-sm">
            {formatEnergy(totals.calories)} / {formatEnergy(targets.calories)}{' '}
            kcal
          </p>
        </div>

        <div className="mt-14 border-t border-[#e2e8f0] pt-10">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-700">
            Macros
          </h3>
          <div className="mx-auto mt-8 flex w-full min-w-0 flex-nowrap items-start justify-between gap-x-2 gap-y-8 sm:gap-x-4">
            <MacroRing
              label="Protein"
              current={totals.protein}
              goal={targets.protein}
              stroke="var(--primary)"
              trackStroke="#e8ecf0"
              ringRef={proteinRingRef}
              trackRef={proteinTrackRef}
            />
            <MacroRing
              label="Carbohydrates"
              current={totals.carbs}
              goal={targets.carbs}
              stroke="#292524"
              trackStroke="#e8ecf0"
              ringRef={carbsRingRef}
              trackRef={carbsTrackRef}
            />
            <MacroRing
              label="Fat"
              current={totals.fats}
              goal={targets.fats}
              stroke="#44403c"
              trackStroke="#e8ecf0"
              ringRef={fatsRingRef}
              trackRef={fatsTrackRef}
            />
          </div>
        </div>
      </div>

      {onSignOut && (
        <div className="mt-auto shrink-0 border-t border-solid border-[#e2e8f0] px-6 py-5">
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-none border border-[#cbd5e1] bg-white px-4 py-2.5 text-xs font-semibold hover:bg-neutral-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
