import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { UserStats, Goal, DietaryPreferences } from '@/types';

const statsSchema = z.object({
  weight: z.number().min(50).max(500),
  height: z.number().min(36).max(96),
  age: z.number().min(13).max(100),
  gender: z.enum(['male', 'female']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'extra']),
});

interface OnboardingProps {
  onComplete: (data: { stats: UserStats; goal: Goal; preferences: DietaryPreferences }) => void;
  onCancel: () => void;
}

export default function Onboarding({ onComplete, onCancel }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [stats, setStats] = useState<UserStats | null>(null);
  const [goal, setGoal] = useState<Goal>('maintain');
  const [preferences, setPreferences] = useState<DietaryPreferences>({
    halal: false,
    vegan: false,
    vegetarian: false,
    glutenFree: false,
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const statsForm = useForm<z.infer<typeof statsSchema>>({
    resolver: zodResolver(statsSchema),
    defaultValues: {
      weight: 160,
      height: 70,
      age: 20,
      gender: 'male',
      activityLevel: 'moderate',
    },
  });

  const handleStatsSubmit = (data: z.infer<typeof statsSchema>) => {
    setStats(data);
    nextStep();
  };

  const handleComplete = () => {
    if (stats) {
      onComplete({ stats, goal, preferences });
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 p-20 opacity-[0.02] pointer-events-none">
        <div className="w-96 h-96 border-[60px] border-foreground/8 rounded-full"></div>
      </div>
      
      <div className="w-full max-w-xl relative z-10">
        <div className="bg-card border border-border rounded-3xl shadow-[0_1px_3px_0_rgb(31_41_55/0.06),0_10px_25px_-5px_rgb(31_41_55/0.04)] p-10 overflow-hidden">
          
          {/* Progress Bar (Design Style) */}
          <div className="flex justify-between items-center mb-10">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${step >= s ? 'bg-primary' : 'bg-muted'}`} 
                />
              ))}
            </div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Step {String(step).padStart(2, '0')}/03
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">What's your primary goal?</h2>
                    <p className="text-gray-500">We'll use this to calculate your Mifflin-St Jeor macro splits.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'cut', title: 'Cut', desc: 'Lose Weight' },
                      { id: 'maintain', title: 'Maintain', desc: 'Balance' },
                      { id: 'bulk', title: 'Bulk', desc: 'Gain Muscle' },
                    ].map((g) => (
                      <button 
                        key={g.id}
                        onClick={() => setGoal(g.id as Goal)}
                        className={`flex flex-col items-center justify-center p-6 rounded-xl transition-all border-2 ${goal === g.id ? 'border-primary bg-accent' : 'border-border hover:border-primary/35'}`}
                      >
                        <div className="text-sm font-bold uppercase tracking-tight">{g.title}</div>
                        <div className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-wider">{g.desc}</div>
                      </button>
                    ))}
                  </div>

                  <Button 
                    type="button"
                    onClick={nextStep}
                    className="w-full py-7 bg-primary text-primary-foreground rounded-xl font-bold text-sm tracking-tight hover:bg-primary/90 transition-colors shadow-md shadow-primary/15"
                  >
                    Continue to Physical Stats
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Physical Statistics</h2>
                    <p className="text-gray-500">Provide your measurements for clinical macro calibration.</p>
                  </div>

                  <form onSubmit={statsForm.handleSubmit(handleStatsSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Height (in)</Label>
                        <Input 
                          type="number" 
                          className={`w-full px-4 py-6 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 ${statsForm.formState.errors.height ? 'border-destructive' : 'border-input'}`}
                          {...statsForm.register('height', { valueAsNumber: true })} 
                        />
                        {statsForm.formState.errors.height && <p className="text-[10px] text-red-500 font-bold uppercase">Invalid Height (36-96in)</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Weight (lbs)</Label>
                        <Input 
                          type="number" 
                          className={`w-full px-4 py-6 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 ${statsForm.formState.errors.weight ? 'border-destructive' : 'border-input'}`}
                          {...statsForm.register('weight', { valueAsNumber: true })} 
                        />
                        {statsForm.formState.errors.weight && <p className="text-[10px] text-red-500 font-bold uppercase">Invalid Weight (50-500lbs)</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Age</Label>
                        <Input 
                          type="number" 
                          className={`w-full px-4 py-6 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 ${statsForm.formState.errors.age ? 'border-destructive' : 'border-input'}`}
                          {...statsForm.register('age', { valueAsNumber: true })} 
                        />
                        {statsForm.formState.errors.age && <p className="text-[10px] text-red-500 font-bold uppercase">Invalid Age (13-100)</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Gender</Label>
                        <Tabs defaultValue="male" onValueChange={(v) => statsForm.setValue('gender', v as 'male' | 'female')}>
                          <TabsList className="grid grid-cols-2 w-full h-11 bg-muted border border-border rounded-lg p-1">
                            <TabsTrigger value="male" className="text-xs font-bold uppercase tracking-wider">Male</TabsTrigger>
                            <TabsTrigger value="female" className="text-xs font-bold uppercase tracking-wider">Female</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Activity Intensity</Label>
                      <Tabs defaultValue="moderate" onValueChange={(v) => statsForm.setValue('activityLevel', v as any)}>
                        <TabsList className="grid grid-cols-5 w-full h-11 bg-muted border border-border rounded-lg p-1">
                          {['sedentary', 'light', 'moderate', 'active', 'extra'].map((v) => (
                            <TabsTrigger key={v} value={v} className="text-[9px] font-bold uppercase tracking-tight">{v.slice(0, 3)}</TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={prevStep} 
                        className="flex-1 py-6 border-border rounded-xl font-bold uppercase tracking-wider text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-[2] py-6 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-md shadow-primary/15 hover:bg-primary/90"
                      >
                        Continue to Preferences
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Dietary Preferences</h2>
                    <p className="text-gray-500">Filter campus dining menus by your specific requirements.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { id: 'halal', label: 'Halal Certified', desc: 'Religious dietary compliance' },
                      { id: 'vegan', label: 'Vegan Only', desc: 'No animal products' },
                      { id: 'vegetarian', label: 'Vegetarian', desc: 'No meat products' },
                      { id: 'glutenFree', label: 'Gluten-Free', desc: 'Celiac friendly options' },
                    ].map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-5 border border-border rounded-2xl bg-accent/50 hover:bg-accent transition-colors">
                        <div>
                          <Label className="text-sm font-black mb-0.5 block" htmlFor={p.id}>{p.label}</Label>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{p.desc}</p>
                        </div>
                        <Switch
                          id={p.id}
                          checked={(preferences as any)[p.id]}
                          onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, [p.id]: checked }))}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevStep} 
                      className="flex-1 py-6 border-border rounded-xl font-bold uppercase tracking-wider text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Back
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleComplete}
                      className="flex-[2] py-6 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90"
                    >
                      Calibrate Engine
                      <Check className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <button 
          onClick={onCancel}
          className="w-full mt-8 text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] hover:text-primary transition-colors"
        >
          &mdash; Cancel Calibration &mdash;
        </button>
      </div>
    </div>
  );
}
