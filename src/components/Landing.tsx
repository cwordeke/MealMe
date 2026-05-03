import { useRef } from 'react';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import LandingMapboxTour from '@/components/LandingMapboxTour';
import { LandingSchoolMarquee } from '@/components/LandingSchoolMarquee';

interface LandingProps {
  onStart: () => void;
}

export default function Landing({ onStart }: LandingProps) {
  const heroPackRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const isLeavingRef = useRef(false);

  const handleFindMeals = (): void => {
    if (isLeavingRef.current) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onStart();
      return;
    }

    isLeavingRef.current = true;

    const hero = heroPackRef.current;
    const overlay = overlayRef.current;
    const main = mainRef.current;

    const finish = (): void => {
      onStart();
    };

    if (!hero || !overlay) {
      finish();
      return;
    }

    overlay.style.pointerEvents = 'auto';

    const tl = gsap.timeline({
      defaults: { duration: 0.8 },
      onComplete: finish,
    });

    tl.to(hero, { x: '-3.5rem', opacity: 0, ease: 'power2.in' }, 0).to(
      overlay,
      { opacity: 1, ease: 'power2.inOut' },
      0,
    );

    if (main) {
      tl.to(main, { opacity: 0, ease: 'power2.in' }, 0);
    }
  };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-white font-sans text-foreground">
      {/* Full-screen wash for “dive” exit */}
      <div
        ref={overlayRef}
        className="pointer-events-none fixed inset-0 z-[400] bg-white opacity-0"
        aria-hidden
      />

      {/* Hero: 50/50 desktop; stacked on mobile — fades out entirely when entering quiz */}
      <main
        ref={mainRef}
        className="relative z-10 flex min-h-0 w-full flex-1 flex-col lg:flex-row"
      >
        {/* Left — white */}
        <section className="flex min-h-0 w-full shrink-0 flex-col bg-white lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-[1_1_50%]">
          <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-6 sm:px-10 sm:py-8 lg:min-h-0 lg:px-[clamp(1.75rem,4.5vw,4.75rem)] lg:py-12 xl:pl-20 xl:pr-12">
            <motion.div
              ref={heroPackRef}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto flex w-full max-w-2xl flex-col items-stretch lg:mx-0"
            >
              {/* Logo → rule → headline: shared width, even gaps, left edges aligned */}
              <div className="flex w-full flex-col gap-6 lg:gap-10">
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <img
                    src="/MealMeIcon.png"
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-md object-contain object-left sm:size-[4.5rem]"
                    aria-hidden
                  />
                  <span className="text-3xl font-black tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
                    MealMe
                  </span>
                </div>

                <div aria-hidden className="h-[4px] w-full shrink-0 bg-foreground" />

                <h1 className="text-[clamp(1.5rem,4.25vmin,2.875rem)] font-extrabold leading-[1.07] tracking-[-0.02em] text-foreground xl:text-[2.625rem] 2xl:text-[2.875rem]">
                  Find{' '}
                  <span className="text-primary">meals</span> that fit your{' '}
                  <span className="text-primary">macros</span> on campus.
                </h1>
              </div>

              <p className="mt-5 max-w-xl text-lg font-medium leading-[1.65] text-gray-500 sm:text-xl sm:leading-[1.72] lg:mt-8 xl:mt-9 xl:text-[1.35rem] xl:leading-[1.75]">
                Set your goals and we&apos;ll show what you can eat on campus today.
              </p>

              <Button
                type="button"
                onClick={handleFindMeals}
                className="group mt-4 h-auto w-fit min-w-[200px] rounded-none py-6 px-10 text-xl font-black leading-none tracking-tight shadow-none transition-[filter,transform] duration-200 ease-out hover:brightness-[0.93] active:translate-y-px lg:mt-6 xl:mt-8 [&_svg]:pointer-events-none"
              >
                Find Meals
                <ChevronRight className="ml-2.5 size-6 shrink-0 transition-[transform] duration-200 ease-out group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>

          <div className="shrink-0 px-6 pb-4 pt-0 sm:px-10 lg:px-[clamp(1.75rem,4.5vw,4.75rem)] xl:pl-20 xl:pr-12 lg:pb-6">
            <LandingSchoolMarquee />
          </div>
        </section>

        {/* Right — Mapbox */}
        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-primary p-0 lg:min-h-[100dvh] lg:min-w-0 lg:flex-[1_1_50%]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative z-[1] flex h-full min-h-0 w-full flex-1 lg:min-h-[100dvh]"
          >
            <LandingMapboxTour />
          </motion.div>
        </section>
      </main>
    </div>
  );
}
