import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { DietaryPreferences } from '@/types';

/** Main question only — no eyebrow. Wrap with answers using `gap-12` (3rem). */
export function QuizQuestionHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-balance text-[clamp(1.75rem,6.5vmin,2.75rem)] font-black leading-[1.05] tracking-tight text-neutral-900">
        {title}
      </h2>
    </div>
  );
}

const focusOutline =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function QuizSinglePill({
  index,
  title,
  selected,
  onClick,
}: {
  index: number;
  title: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-4 rounded-sm bg-white px-4 py-4 text-left shadow-none transition-[border-width,background-color] duration-150 sm:px-5 sm:py-4',
        focusOutline,
        'hover:border-primary hover:bg-green-50/60',
        selected ? 'border-2 border-primary bg-green-50/80' : 'border border-neutral-200',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-sm text-sm font-black tabular-nums',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-neutral-100 text-neutral-900 group-hover:bg-primary group-hover:text-primary-foreground',
        )}
      >
        {index}
      </span>
      <span className="min-w-0 flex-1 text-lg font-bold text-neutral-900">{title}</span>
    </button>
  );
}

export function QuizGridPill({
  index,
  label,
  selected,
  multi: _multi,
  onClick,
}: {
  index: number;
  label: string;
  selected: boolean;
  multi?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'group flex min-h-[3.25rem] w-full items-center gap-3 rounded-sm bg-white px-3 py-3 text-left shadow-none transition-[border-width,background-color] duration-150 sm:min-h-[3.5rem] sm:gap-3.5 sm:px-4',
        focusOutline,
        'hover:border-primary hover:bg-green-50/60',
        selected ? 'border-2 border-primary bg-green-50/80' : 'border border-neutral-200',
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-sm text-xs font-black tabular-nums sm:size-10 sm:text-sm',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-neutral-100 text-neutral-900 group-hover:bg-primary group-hover:text-primary-foreground',
        )}
      >
        {index}
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold leading-tight text-neutral-900 sm:text-[15px]">
        {label}
      </span>
    </button>
  );
}

export const DIETARY_META: { id: keyof DietaryPreferences; label: string }[] = [
  { id: 'halal', label: 'Halal' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'glutenFree', label: 'Gluten-free' },
];

export function QuizSchoolOption({
  logoSrc,
  label,
  selected,
  onClick,
}: {
  logoSrc: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-[3.5rem] w-full items-center gap-4 rounded-sm bg-white px-4 py-3 text-left shadow-none transition-[border-width,background-color] duration-150 sm:min-h-16',
        focusOutline,
        'hover:border-primary hover:bg-green-50/60',
        selected ? 'border-2 border-primary bg-green-50/80' : 'border border-neutral-200',
      )}
    >
      <img
        src={logoSrc}
        alt=""
        className="size-10 shrink-0 object-contain sm:size-12"
        loading="lazy"
        decoding="async"
      />
      <span className="min-w-0 flex-1 text-left text-base font-bold text-neutral-900 sm:text-lg">{label}</span>
    </button>
  );
}

export function QuizImmersiveBackground() {
  return <div className="pointer-events-none absolute inset-0 bg-white" aria-hidden />;
}

export function QuizProgressBar({
  step,
  totalSteps,
}: {
  step: number;
  totalSteps: number;
}) {
  const pct = (step / totalSteps) * 100;
  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-sm border border-neutral-200 bg-white"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Question ${step} of ${totalSteps}`}
    >
      <motion.div
        className="absolute bottom-0 left-0 top-0 bg-primary"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
