import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Search,
  CheckCircle2
} from 'lucide-react';
import { UserStats, Goal, DietaryPreferences, MenuItem } from '@/types';
import { calculateTDEE } from '@/lib/calculations';
import { MOCK_DINING_DATA } from '@/data/mockDining';

interface DashboardProps {
  stats: UserStats;
  goal: Goal;
  preferences: DietaryPreferences;
  onLogout: () => void;
}

export default function Dashboard({ stats, goal, preferences, onLogout }: DashboardProps) {
  const tdeeResult = useMemo(() => calculateTDEE(stats, goal), [stats, goal]);
  const [loggedItems, setLoggedItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLocation, setActiveLocation] = useState<string>('All');

  const totals = useMemo(() => {
    return loggedItems.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats,
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [loggedItems]);

  const locations = ['All', ...new Set(MOCK_DINING_DATA.map(item => item.location))];

  const filteredMenu = useMemo(() => {
    return MOCK_DINING_DATA.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(searchLower) || 
                          (item.station && item.station.toLowerCase().includes(searchLower));
      const matchesLocation = activeLocation === 'All' || item.location === activeLocation;
      
      // Dietary filters
      if (preferences.halal && !item.isHalal) return false;
      if (preferences.vegan && !item.isVegan) return false;
      if (preferences.vegetarian && !item.isVegetarian) return false;
      if (preferences.glutenFree && !item.isGlutenFree) return false;
      
      return matchesSearch && matchesLocation;
    });
  }, [searchQuery, activeLocation, preferences]);

  const menuByStation = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredMenu.forEach(item => {
      const s = item.station || 'General';
      if (!groups[s]) groups[s] = [];
      groups[s].push(item);
    });
    return groups;
  }, [filteredMenu]);

  const addItem = (item: MenuItem) => {
    setLoggedItems(prev => [...prev, { ...item, id: `${item.id}-${Date.now()}` }]);
  };

  const removeItem = (id: string) => {
    setLoggedItems(prev => prev.filter(item => item.id !== id));
  };

  const macroProgress = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100);
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none">
        <div className="w-[500px] h-[500px] border-[100px] border-foreground/8 rounded-full"></div>
      </div>

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
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-accent px-3 py-1.5 rounded-lg border border-primary/15">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            Engine Calibrated
          </div>
          <button 
            className="px-4 py-1.5 border border-border rounded-lg text-foreground shadow-sm hover:bg-muted transition-colors text-sm font-bold uppercase tracking-tight"
            onClick={onLogout}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Summary & Log */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-sm"
            >
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Daily Macro Balance</div>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-5xl font-black tracking-tight">{Math.round(totals.calories)}</span>
                    <span className="text-gray-400 font-bold mb-1 uppercase tracking-wider text-xs">/ {tdeeResult.goalCalories} KCAL</span>
                  </div>
                  <Progress value={macroProgress(totals.calories, tdeeResult.goalCalories)} className="h-2 bg-muted" />
                </div>

                <div className="grid grid-cols-3 gap-6 pt-2">
                  {[
                    { label: 'Prot', current: totals.protein, target: tdeeResult.macros.protein },
                    { label: 'Carb', current: totals.carbs, target: tdeeResult.macros.carbs },
                    { label: 'Fats', current: totals.fats, target: tdeeResult.macros.fats },
                  ].map(m => (
                    <div key={m.label} className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{m.label}</span>
                      <div className="text-sm font-black">{Math.round(m.current)}<span className="text-[10px] text-gray-300 font-bold">/{m.target}</span></div>
                      <Progress value={macroProgress(m.current, m.target)} className="h-1 bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-sm flex flex-col min-h-[400px]"
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Meal log</span>
                <Badge variant="outline" className="text-[9px] border-gray-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{loggedItems.length} Items</Badge>
              </div>
              
              <div className="flex-1">
                {loggedItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 text-gray-300 border border-gray-100">
                      <Plus className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-loose">No meals logged.<br/>Add items from the menu.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] -mx-2 px-2">
                    <div className="space-y-3">
                      {loggedItems.map((item) => (
                        <div key={item.id} className="group p-4 rounded-2xl border border-muted bg-accent/40 hover:border-primary/20 hover:bg-card transition-all flex items-center justify-between">
                          <div className="min-w-0 flex-1 mr-4">
                            <h4 className="text-xs font-black truncate">{item.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">{item.calories} KCAL &bull; {item.protein}P</p>
                          </div>
                          <button 
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Menu Grid */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-6">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="SEARCH DINING MENUS..."
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all text-xs font-bold uppercase tracking-widest text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {locations.map(loc => (
                  <button
                    key={loc}
                    className={`h-9 px-5 rounded-xl font-bold text-[10px] uppercase tracking-widest shrink-0 transition-all ${activeLocation === loc ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' : 'bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
                    onClick={() => setActiveLocation(loc)}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-260px)] rounded-3xl">
              <div className="space-y-12 pr-4 pb-20">
                {(Object.entries(menuByStation) as [string, MenuItem[]][]).map(([station, items]) => (
                  <div key={station} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground whitespace-nowrap bg-primary/10 px-4 py-2 rounded-lg border border-primary/15">
                        {station}
                      </h2>
                      <div className="h-px bg-gray-100 w-full"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {items.map((item) => (
                        <motion.div
                          layout
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="group border border-border bg-card rounded-3xl p-6 hover:shadow-xl hover:shadow-[0_12px_40px_-12px_rgb(34_197_94/0.12)] transition-all flex flex-col"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{item.location}</div>
                            </div>
                            <div className="flex gap-1">
                              {item.isHalal && <div className="w-5 h-5 rounded-md bg-accent text-emerald-800 border border-primary/25 flex items-center justify-center text-[9px] font-bold">H</div>}
                              {item.isVegan && <div className="w-5 h-5 rounded-md bg-primary/15 text-green-900 border border-primary/30 flex items-center justify-center text-[9px] font-bold">V</div>}
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-xl mb-6 tracking-tight leading-tight flex-1">{item.name}</h3>

                          <div className="grid grid-cols-4 gap-3 mb-6">
                            {[
                              { label: 'Cals', val: item.calories },
                              { label: 'Prot', val: item.protein },
                              { label: 'Carb', val: item.carbs },
                              { label: 'Fat', val: item.fats },
                            ].map(s => (
                              <div key={s.label} className="p-2 border border-gray-50 rounded-xl bg-gray-50/30 text-center">
                                <div className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter mb-0.5">{s.label}</div>
                                <div className="text-xs font-black">{s.val}</div>
                              </div>
                            ))}
                          </div>

                          <Button 
                            className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20"
                            onClick={() => addItem(item)}
                          >
                            Add To Meal
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredMenu.length === 0 && (
                  <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em]">No meals match your filters.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
