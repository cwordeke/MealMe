import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface LandingProps {
  onStart: () => void;
}

export default function Landing({ onStart }: LandingProps) {
  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans">
      {/* Navigation */}
      <nav className="relative z-10 w-full border-b border-border px-8 h-16 flex items-center justify-between bg-background/80 backdrop-blur-sm">
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
          <span className="text-foreground cursor-pointer hover:text-primary transition-colors" onClick={onStart}>Onboarding</span>
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

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 w-full max-w-5xl items-center">
          
          {/* Left Side: Value Prop */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-[10px] font-bold tracking-widest uppercase text-foreground mb-6 border border-primary/15">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Campus Dining
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] mb-6">
                Fuel your <br/> 
                <span className="text-primary">academic</span> <br/> 
                performance.
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed max-w-sm mb-8">
                Precision nutrition on campus. Sync your macros with your college&apos;s dining hall menus in real time.
              </p>
              
              {/* Quick Stats Widget */}
              <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 flex gap-6 w-fit">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Active Venues</div>
                  <div className="text-xl font-bold">12 Halls</div>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Total Meals</div>
                  <div className="text-xl font-bold">480+ Items</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Hero Action/Display */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="bg-card border border-border rounded-3xl shadow-[0_1px_3px_0_rgb(31_41_55/0.06),0_10px_25px_-5px_rgb(31_41_55/0.04)] p-10 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <div className="w-64 h-64 border-[40px] border-foreground/8 rounded-full"></div>
              </div>

              <div className="relative z-10 space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-3 tracking-tight">Ready to calibrate?</h2>
                  <p className="text-gray-500 leading-relaxed">
                    Start your personalized macro journey with live campus dining menu data.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 border border-gray-100 rounded-2xl bg-gray-50/30">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Algorithm</div>
                    <div className="text-sm font-bold">Mifflin-St Jeor</div>
                    <div className="text-[10px] text-gray-400 mt-1">Clinical Standard</div>
                  </div>
                  <div className="p-6 border border-gray-100 rounded-2xl bg-gray-50/30">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Source</div>
                    <div className="text-sm font-bold">Campus SSO</div>
                    <div className="text-[10px] text-gray-400 mt-1">Dining Integration</div>
                  </div>
                </div>

                <Button 
                  onClick={onStart}
                  className="w-full py-7 bg-primary text-primary-foreground rounded-2xl font-bold text-base tracking-tight hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xl shadow-primary/20 group"
                >
                  Start Onboarding Flow
                  <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Dining API Status: Active
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
