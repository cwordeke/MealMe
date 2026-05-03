import { Fragment, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  UserStats,
  Goal,
  DietaryPreferences,
  CampusId,
} from '@/types';
import { SCHOOL_CHOICES } from '@/data/schoolChoices';
import {
  DIETARY_META,
  QuizGridPill,
  QuizImmersiveBackground,
  QuizProgressBar,
  QuizQuestionHeader,
  QuizSchoolOption,
  QuizSinglePill,
} from '@/components/onboarding/QuizUi';

const hwSchema = z.object({
  weight: z.number().min(50).max(500),
  height: z.number().min(36).max(96),
});

function inchesFromFtIn(ft: number, inch: number): number {
  const i = Math.min(11, Math.max(0, Math.round(inch)));
  const f = Math.max(0, Math.round(ft));
  return f * 12 + i;
}

function ftInFromInches(totalInches: number): { ft: number; inch: number } {
  const t = Math.round(totalInches);
  const ft = Math.floor(t / 12);
  const inch = t - ft * 12;
  return { ft, inch: Math.min(11, Math.max(0, inch)) };
}

const fullStatsSchema = z.object({
  weight: z.number().min(50).max(500),
  height: z.number().min(36).max(96),
  age: z.number().min(13).max(100),
  gender: z.enum(['male', 'female', 'other']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'extra']),
});

interface OnboardingProps {
  onComplete: (data: {
    stats: UserStats;
    goal: Goal;
    preferences: DietaryPreferences;
    campusId: CampusId;
  }) => void;
  onCancel: () => void;
}

const ACTIVITY_LEVELS: { id: UserStats['activityLevel']; label: string }[] = [
  { id: 'sedentary', label: 'Sedentary' },
  { id: 'light', label: 'Light' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'active', label: 'Active' },
  { id: 'extra', label: 'Extreme' },
];

const GOAL_OPTIONS: { id: Goal; title: string }[] = [
  { id: 'cut', title: 'Cut' },
  { id: 'maintain', title: 'Maintain' },
  { id: 'bulk', title: 'Bulk' },
];

const GENDER_OPTIONS: { id: UserStats['gender']; title: string }[] = [
  { id: 'male', title: 'Male' },
  { id: 'female', title: 'Female' },
  { id: 'other', title: 'Other' },
];

const AGE_BANDS: { label: string; value: number }[] = [
  { label: '13–17', value: 15 },
  { label: '18–24', value: 21 },
  { label: '25–34', value: 30 },
  { label: '35–44', value: 40 },
  { label: '45–54', value: 50 },
  { label: '55+', value: 62 },
];

const ADVANCE_MS = 200;

/** Slide-snap: exit up + fade (200ms), enter from below with spring snap */
const quizStepVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      opacity: { duration: 0.2, ease: [0, 0, 0.2, 1] as const },
      y: {
        type: 'spring' as const,
        stiffness: 580,
        damping: 36,
        mass: 0.88,
      },
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

type HwForm = z.infer<typeof hwSchema>;

function StepHeightFtIn({
  form,
  flatInput,
  flatPrimaryBtn,
  heightErr,
  onContinue,
}: {
  form: UseFormReturn<HwForm>;
  flatInput: string;
  flatPrimaryBtn: string;
  heightErr: boolean;
  onContinue: () => void;
}) {
  const h = form.watch('height');
  const total =
    typeof h === 'number' && !Number.isNaN(h) ? h : 70;
  const { ft, inch } = ftInFromInches(total);

  const applyFtIn = (nextFt: number, nextIn: number): void => {
    form.setValue('height', inchesFromFtIn(nextFt, nextIn), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const errBorder = heightErr && 'border-red-500 focus:border-red-500';

  return (
    <div className="flex flex-col gap-12">
      <QuizQuestionHeader title="What is your height?" />
      <div>
        <div className="flex gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="onb-h-ft"
              className="mb-1.5 block text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500"
            >
              Ft
            </label>
            <input
              id="onb-h-ft"
              type="number"
              inputMode="numeric"
              min={3}
              max={8}
              autoComplete="off"
              value={ft}
              onChange={(e) => {
                const v = e.target.value;
                const nextFt =
                  v === '' ? 0 : Math.min(8, Math.max(0, parseInt(v, 10) || 0));
                applyFtIn(nextFt, inch);
              }}
              className={cn(flatInput, errBorder)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label
              htmlFor="onb-h-in"
              className="mb-1.5 block text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500"
            >
              In
            </label>
            <input
              id="onb-h-in"
              type="number"
              inputMode="numeric"
              min={0}
              max={11}
              autoComplete="off"
              value={inch}
              onChange={(e) => {
                const v = e.target.value;
                const nextIn =
                  v === ''
                    ? 0
                    : Math.min(11, Math.max(0, parseInt(v, 10) || 0));
                applyFtIn(ft, nextIn);
              }}
              className={cn(flatInput, errBorder)}
            />
          </div>
        </div>
        {heightErr && (
          <p className="mt-2 text-center text-xs font-semibold text-red-600">
            Enter a height between 3 ft and 8 ft (36–96 in).
          </p>
        )}
      </div>
      <Button type="button" onClick={onContinue} className={cn(flatPrimaryBtn)}>
        Continue
      </Button>
    </div>
  );
}

export default function Onboarding({ onComplete, onCancel }: OnboardingProps) {
  const totalSteps = 8;
  const [step, setStep] = useState(1);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [gender, setGender] = useState<UserStats['gender'] | null>(null);
  const [ageBand, setAgeBand] = useState<number | null>(null);
  const [activityLevel, setActivityLevel] = useState<UserStats['activityLevel'] | null>(null);
  const [campusId, setCampusId] = useState<CampusId | null>(null);

  const [preferences, setPreferences] = useState<DietaryPreferences>({
    halal: false,
    vegan: false,
    vegetarian: false,
    glutenFree: false,
  });

  const statsForm = useForm<z.infer<typeof hwSchema>>({
    resolver: zodResolver(hwSchema),
    defaultValues: {
      weight: 160,
      height: 70,
    },
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const scheduleAdvance = (afterSelect: () => void): void => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    afterSelect();
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      nextStep();
    }, ADVANCE_MS);
  };

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const resolveStats = (): UserStats | null => {
    const hw = statsForm.getValues();
    const merged = {
      ...hw,
      age: ageBand ?? 21,
      gender: gender ?? 'male',
      activityLevel: activityLevel ?? 'moderate',
    };
    const parsed = fullStatsSchema.safeParse(merged);
    return parsed.success ? parsed.data : null;
  };

  const handleComplete = (): void => {
    statsForm.handleSubmit(() => {
      const stats = resolveStats();
      if (!stats) return;
      const g = goal ?? 'maintain';
      const campus = campusId ?? 'iowa';
      onComplete({
        stats,
        goal: g,
        preferences,
        campusId: campus,
      });
    })();
  };

  const handleSkip = (): void => {
    if (step >= totalSteps) {
      handleComplete();
      return;
    }
    nextStep();
  };

  const handleHeaderBack = (): void => {
    if (step === 1) onCancel();
    else prevStep();
  };

  const heightErr = statsForm.formState.errors.height;
  const weightErr = statsForm.formState.errors.weight;

  const flatPrimaryBtn =
    'h-auto w-full rounded-sm border-2 border-primary bg-primary py-6 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-none hover:bg-primary/90';

  const flatInput =
    'h-16 w-full rounded-sm border border-neutral-200 bg-white px-6 text-center text-2xl font-bold tabular-nums text-neutral-900 shadow-none outline-none transition-[border-width,background-color] placeholder:text-neutral-400 focus:border-2 focus:border-primary focus:bg-green-50/80';

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-white font-sans text-neutral-900">
      <QuizImmersiveBackground />

      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between px-4 pt-[max(0.5rem,env(safe-area-inset-top))] sm:h-16 sm:px-6">
        <button
          type="button"
          onClick={handleHeaderBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-sm text-neutral-700 transition-colors hover:bg-neutral-100 active:opacity-90"
          aria-label={step === 1 ? 'Back to home' : 'Previous question'}
        >
          <ArrowLeft className="size-[22px]" strokeWidth={2} />
        </button>

        <div className="absolute left-1/2 top-1/2 w-[min(74vw,300px)] -translate-x-1/2 -translate-y-1/2 px-2">
          <QuizProgressBar step={step} totalSteps={totalSteps} />
        </div>

        <div className="size-10 shrink-0" aria-hidden />
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-16">
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-6 sm:px-8 sm:py-10">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={quizStepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {step === 1 && (
                  <div className="flex flex-col gap-12">
                    <QuizQuestionHeader title="What is your primary goal?" />
                    <div className="flex flex-col gap-3">
                      {GOAL_OPTIONS.map((g, i) => (
                        <Fragment key={g.id}>
                          <QuizSinglePill
                            index={i + 1}
                            title={g.title}
                            selected={goal === g.id}
                            onClick={() => {
                              scheduleAdvance(() => setGoal(g.id));
                            }}
                          />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-12">
                    <QuizQuestionHeader title="How do you identify?" />
                    <div className="flex flex-col gap-3">
                      {GENDER_OPTIONS.map((g, i) => (
                        <Fragment key={g.id}>
                          <QuizSinglePill
                            index={i + 1}
                            title={g.title}
                            selected={gender === g.id}
                            onClick={() =>
                              scheduleAdvance(() => setGender(g.id))
                            }
                          />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col gap-12">
                    <QuizQuestionHeader title="What is your age?" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {AGE_BANDS.map((band, i) => (
                        <Fragment key={band.label}>
                          <QuizGridPill
                            index={i + 1}
                            label={band.label}
                            selected={ageBand === band.value}
                            onClick={() =>
                              scheduleAdvance(() => setAgeBand(band.value))
                            }
                          />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <StepHeightFtIn
                    form={statsForm}
                    flatInput={flatInput}
                    flatPrimaryBtn={flatPrimaryBtn}
                    heightErr={!!heightErr}
                    onContinue={() => {
                      void statsForm.trigger('height').then((ok) => {
                        if (ok) nextStep();
                      });
                    }}
                  />
                )}

                {step === 5 && (
                  <div className="flex flex-col gap-12">
                    <QuizQuestionHeader title="What is your weight?" />
                    <div>
                      <label htmlFor="onb-w" className="sr-only">
                        Weight in pounds
                      </label>
                      <input
                        id="onb-w"
                        type="number"
                        inputMode="decimal"
                        placeholder="160"
                        autoComplete="off"
                        className={cn(
                          flatInput,
                          weightErr && 'border-red-500 focus:border-red-500',
                        )}
                        {...statsForm.register('weight', { valueAsNumber: true })}
                      />
                      {weightErr && (
                        <p className="mt-2 text-center text-xs font-semibold text-red-600">
                          Enter a weight between 50 and 500 lbs.
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        void statsForm.trigger('weight').then((ok) => {
                          if (ok) nextStep();
                        });
                      }}
                      className={cn(flatPrimaryBtn)}
                    >
                      Continue
                    </Button>
                  </div>
                )}

                {step === 6 && (
                  <div className="flex flex-col gap-12">
                    <QuizQuestionHeader title="How active are you day to day?" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {ACTIVITY_LEVELS.map((a, i) => (
                        <Fragment key={a.id}>
                          <QuizGridPill
                            index={i + 1}
                            label={a.label}
                            selected={activityLevel === a.id}
                            onClick={() =>
                              scheduleAdvance(() => setActivityLevel(a.id))
                            }
                          />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="flex flex-col gap-12">
                    <QuizQuestionHeader title="Any dietary filters?" />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {DIETARY_META.map((row, i) => {
                        const on = preferences[row.id];
                        return (
                          <Fragment key={row.id}>
                            <QuizGridPill
                              index={i + 1}
                              label={row.label}
                              selected={on}
                              multi
                              onClick={() =>
                                setPreferences((p) => ({
                                  ...p,
                                  [row.id]: !p[row.id],
                                }))
                              }
                            />
                          </Fragment>
                        );
                      })}
                    </div>
                    <Button type="button" onClick={nextStep} className={cn(flatPrimaryBtn)}>
                      Continue
                    </Button>
                  </div>
                )}

                {step === 8 && (
                  <div className="flex flex-col gap-12">
                    <QuizQuestionHeader title="Where do you eat?" />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {SCHOOL_CHOICES.map((school) => (
                        <Fragment key={school.id}>
                          <QuizSchoolOption
                            logoSrc={school.logo}
                            label={school.label}
                            selected={campusId === school.id}
                            onClick={() => setCampusId(school.id)}
                          />
                        </Fragment>
                      ))}
                    </div>
                    <Button
                      type="button"
                      onClick={handleComplete}
                      className={cn(flatPrimaryBtn, 'normal-case tracking-tight')}
                    >
                      <span className="flex w-full items-center justify-center gap-2">
                        Personalize Meals
                        <ArrowRight className="size-5 shrink-0" strokeWidth={2.5} />
                      </span>
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={handleSkip}
          className="pointer-events-auto text-sm font-medium text-neutral-400 underline-offset-4 transition-colors hover:text-neutral-600 hover:underline"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
