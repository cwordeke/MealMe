import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { LandingProductMockup } from '@/components/LandingProductMockup';
import { LandingSchoolMarquee } from '@/components/LandingSchoolMarquee';

interface LandingProps {
  onStart: () => void;
}

export default function Landing({ onStart }: LandingProps) {
  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col font-sans">
      {/* Navigation */}
      <nav className="relative z-20 h-16 w-full shrink-0 border-b border-border px-8 flex items-center justify-between bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-bold tracking-tighter text-xl">
          <img
            src="/MealMeIcon.png"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-md object-contain"
            aria-hidden
          />
          MealMe
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-gray-500">
          <span
            className="text-foreground cursor-pointer hover:text-primary transition-colors"
            onClick={onStart}
          >
            Find Meals
          </span>
          <span className="hidden md:block cursor-help">Dining Maps</span>
          <span className="hidden md:block cursor-help">Macro Engine</span>
          <button
            className="px-4 py-1.5 border border-border rounded-lg text-foreground shadow-sm hover:bg-muted transition-colors"
            onClick={onStart}
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero: 50/50 split desktop; stacked (white → green) on mobile */}
      <main className="relative z-10 flex w-full flex-1 flex-col lg:min-h-0 lg:flex-row">
        {/* Left — white */}
        <section className="flex w-full min-h-0 flex-col bg-white px-6 py-12 sm:px-10 lg:min-h-[calc(100dvh-4rem)] lg:min-w-0 lg:flex-[1_1_50%] lg:px-[clamp(1.75rem,4.5vw,4.75rem)] lg:py-16 xl:pl-20 xl:pr-12">
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 lg:mx-0"
            >
              <div className="w-full">
                <div
                  aria-hidden
                  className="mb-8 h-[4px] w-full bg-foreground"
                />
                <h1 className="text-[clamp(2.25rem,6.5vmin,4.5rem)] font-extrabold leading-[0.97] tracking-[-0.02em] text-foreground xl:text-[4.125rem] 2xl:text-[4.5rem]">
                  Find{' '}
                  <span className="text-primary">meals</span> that fit your{' '}
                  <span className="text-primary">macros</span> on campus.
                </h1>
              </div>

              <p className="max-w-xl text-xl font-medium leading-[1.72] text-gray-500 xl:text-[1.35rem] xl:leading-[1.75]">
                Set your calories and we&apos;ll show what you can eat on campus today.
              </p>

              <Button
                onClick={onStart}
                className="group h-auto w-fit min-w-[200px] rounded-none py-7 px-10 text-xl font-black leading-none tracking-tight shadow-none transition-[filter,transform] duration-200 ease-out hover:brightness-[0.93] active:translate-y-px [&_svg]:pointer-events-none"
              >
                Find Meals
                <ChevronRight className="ml-2.5 size-6 shrink-0 transition-[transform] duration-200 ease-out group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>

          <LandingSchoolMarquee />
        </section>

        {/* Right — solid brand green, mockup centered */}
        <section className="relative flex w-full shrink-0 flex-col items-center justify-center overflow-hidden bg-primary px-6 py-16 lg:min-h-[calc(100dvh-4rem)] lg:min-w-0 lg:flex-[1_1_50%] lg:py-12 xl:py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative z-[1] flex w-full shrink-0 items-center justify-center"
          >
            <LandingProductMockup />
          </motion.div>
        </section>
      </main>
    </div>
  );
}
