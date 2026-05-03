import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MOCK_DINING_DATA } from '@/data/mockDining';
import { MenuItem } from '@/types';
import { calculateTDEE } from '@/lib/calculations';
import { Search } from 'lucide-react';

const PREVIEW_STATS = {
  weight: 175,
  height: 70,
  age: 20,
  activityLevel: 'moderate' as const,
  gender: 'male' as const,
};

/** Logged items use the same data as live dining menus so the preview matches the product. */
const LOGGED_PREVIEW: MenuItem[] = MOCK_DINING_DATA.filter((item) =>
  ['udcc-fuse-chicken', 'udcc-fuse-tofu'].includes(item.id)
);

export function LandingProductMockup() {
  const tdee = calculateTDEE(PREVIEW_STATS, 'maintain');
  const totals = LOGGED_PREVIEW.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fats: acc.fats + item.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const menuPreview = MOCK_DINING_DATA.filter((item) => item.location === 'UDCC').slice(0, 2);

  const macroPct = (current: number, target: number) =>
    Math.min(100, (current / Math.max(target, 1)) * 100);

  return (
    <div className="relative mx-auto shrink-0" aria-hidden>
      <div className="rounded-[3rem] border-[13px] border-gray-950 bg-gray-950 p-1 shadow-[0_42px_70px_-18px_rgb(17_24_39/0.48)]">
        <div className="absolute left-1/2 top-[11px] z-10 h-7 w-[6.75rem] -translate-x-1/2 rounded-full bg-gray-950 shadow-inner" />

        <div className="relative mt-[1.125rem] h-[580px] w-[307px] overflow-hidden rounded-[2.125rem] bg-background">
          <div className="border-b border-border bg-background px-5 py-[0.9375rem]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/MealMeIcon.png"
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 rounded-md object-contain"
                />
                <span className="text-[0.9675rem] font-bold tracking-tight">MealMe</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Today
              </span>
            </div>
          </div>

          <div className="phone-mockup-scroll h-[calc(100%-59px)] overflow-y-auto overflow-x-hidden">
            <div className="border-b border-border px-5 py-[1.125rem]">
              <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Daily Macro Balance
              </div>
              <div className="mb-1 flex items-end justify-between">
                <span className="text-[2.125rem] font-black tracking-tight leading-none">{Math.round(totals.calories)}</span>
                <span className="pb-0.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  / {tdee.goalCalories} KCAL
                </span>
              </div>
              <Progress value={macroPct(totals.calories, tdee.goalCalories)} className="mb-5 h-1.5 bg-muted" />

              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { label: 'Prot', cur: totals.protein, tgt: tdee.macros.protein },
                    { label: 'Carb', cur: totals.carbs, tgt: tdee.macros.carbs },
                    { label: 'Fat', cur: totals.fats, tgt: tdee.macros.fats },
                  ] as const
                ).map((m) => (
                  <div key={m.label} className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {m.label}
                    </span>
                    <div className="text-xs font-black">
                      {Math.round(m.cur)}
                      <span className="text-[10px] font-bold text-gray-300">/{m.tgt}</span>
                    </div>
                    <Progress value={macroPct(m.cur, m.tgt)} className="h-1 bg-muted" />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-[1.125rem]">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <div className="h-11 rounded-xl border border-input bg-muted/40 pl-[2.375rem] pr-3 text-[10px] font-bold uppercase leading-[2.75rem] tracking-wider text-muted-foreground">
                  Search dining menus…
                </div>
              </div>

              <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                {['UDCC', 'Seasons'].map((loc, i) => (
                  <div
                    key={loc}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${i === 0 ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}
                  >
                    {loc}
                  </div>
                ))}
              </div>

              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-foreground">
                  Fuse
                </span>
              </div>

              <div className="space-y-3 pb-6">
                {menuPreview.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-[1.125rem] shadow-sm"
                  >
                    <div className="mb-3 flex justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        {item.location}
                      </span>
                      <div className="flex gap-1">
                        {item.isHalal && (
                          <span className="flex size-[18px] items-center justify-center rounded-md border border-primary/25 bg-accent text-[8px] font-bold text-emerald-800">
                            H
                          </span>
                        )}
                        {item.isVegan && (
                          <span className="flex size-[18px] items-center justify-center rounded-md border border-primary/30 bg-primary/15 text-[8px] font-bold text-green-900">
                            V
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mb-4 text-[14px] font-bold leading-snug tracking-tight">{item.name}</h3>

                    <div className="mb-3 grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Cals', val: item.calories },
                        { label: 'Prot', val: item.protein },
                        { label: 'Carb', val: item.carbs },
                        { label: 'Fat', val: item.fats },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="rounded-lg border border-gray-50 bg-gray-50/50 py-1.5 text-center"
                        >
                          <div className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">
                            {s.label}
                          </div>
                          <div className="text-xs font-black">{s.val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="h-10 rounded-xl bg-primary/90 text-center text-[11px] font-bold uppercase leading-10 tracking-wide text-primary-foreground">
                      Add To Meal
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-3 flex justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Meal log</span>
                  <Badge variant="outline" className="h-5 px-2 text-[9px] font-bold uppercase">
                    {LOGGED_PREVIEW.length} items
                  </Badge>
                </div>
                <div className="space-y-2">
                  {LOGGED_PREVIEW.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-muted bg-accent/40 px-3 py-2.5"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-xs font-bold">{item.name}</div>
                        <div className="text-[10px] font-bold uppercase tracking-tight text-gray-400">
                          {item.calories} KCAL • {item.protein}P
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
