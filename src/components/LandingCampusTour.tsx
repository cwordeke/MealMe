import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { MOCK_DINING_DATA } from '@/data/mockDining';
import type { MenuItem } from '@/types';

const MAP_W = 980;
const MAP_H = 560;

const HOLD_SECONDS = 5;

function geoToMap(lon: number, lat: number): { Fx: number; Fy: number } {
  const padX = MAP_W * 0.04;
  const padY = MAP_H * 0.085;
  const innerW = MAP_W - padX * 2;
  const innerH = MAP_H - padY * 2;
  const Fx = ((lon + 125) / 59) * innerW + padX;
  const Fy = ((49.4 - lat) / 26.4) * innerH + padY;
  return { Fx, Fy };
}

const CAMPUSES = [
  { id: 'iowa', label: 'Iowa State University', logo: '/logos/IowaStateLogo.png', ...geoToMap(-93.62, 42.03) },
  { id: 'purdue', label: 'Purdue University', logo: '/logos/PurdueLogo.png', ...geoToMap(-86.926, 40.427) },
  { id: 'illinois', label: 'University of Illinois Urbana-Champaign', logo: '/logos/IllinoisLogo.png', ...geoToMap(-88.245, 40.103) },
  { id: 'wisconsin', label: 'University of Wisconsin-Madison', logo: '/logos/WisconsinLogo.png', ...geoToMap(-89.4, 43.073) },
  { id: 'michigan', label: 'University of Michigan', logo: '/logos/MichiganLogo.png', ...geoToMap(-83.74, 42.279) },
  { id: 'kansas', label: 'University of Kansas', logo: '/logos/KansasLogo.png', ...geoToMap(-95.255, 38.954) },
] as const;

function overview(vpW: number, vpH: number) {
  const scale = Math.min(vpW / MAP_W, vpH / MAP_H, 2.85) * 0.91;
  return {
    x: vpW / 2 - (MAP_W * scale) / 2,
    y: vpH / 2 - (MAP_H * scale) / 2,
    scale,
  };
}

function focal(vpW: number, vpH: number, Fx: number, Fy: number, scale: number) {
  return {
    scale,
    x: vpW / 2 - Fx * scale,
    y: vpH / 2 - Fy * scale,
  };
}

/** Pan toward NEXT while still moderately zoomed for a “flight” cue */
function whooshToward(vpW: number, vpH: number, toward: { Fx: number; Fy: number }, scaleBump: number) {
  const o = overview(vpW, vpH);
  return focal(vpW, vpH, toward.Fx, toward.Fy, o.scale * scaleBump);
}

function pickMealsForStop(stopIdx: number): MenuItem[] {
  const pool = MOCK_DINING_DATA;
  const offset = stopIdx * 19;
  return [0, 1, 2].map((j) => pool[(offset + j) % pool.length]);
}

function MapDecor({ hotspots }: { hotspots: typeof CAMPUSES }) {
  return (
    <svg
      width={MAP_W}
      height={MAP_H}
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      className="block shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern id="campus-tour-grid" width={38} height={38} patternUnits="userSpaceOnUse">
          <path
            d="M38 0H0v38"
            fill="none"
            stroke="rgb(255 255 255 / 0.2)"
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" className="fill-white/[0.05]" rx={10} ry={10} />
      <rect x={14} y={14} width={MAP_W - 28} height={MAP_H - 28} rx={8} ry={8} fill="url(#campus-tour-grid)" opacity={0.35} />

      <ellipse
        cx={MAP_W * 0.51}
        cy={MAP_H * 0.45}
        rx={MAP_W * 0.393}
        ry={MAP_H * 0.335}
        className="fill-white/[0.05] stroke-white/38"
        strokeWidth={1.6}
      />
      <path
        className="fill-white/[0.035] stroke-white/35"
        strokeWidth={1.35}
        d="M156,478 C210,548 782,548 834,478 C902,394 924,294 834,218 C734,126 548,138 394,174 C276,206 154,294 154,394 C154,442 154,454 156,478 Z"
      />

      <text
        x={MAP_W / 2}
        y={34}
        textAnchor="middle"
        className="fill-white/52 font-sans text-[11px] font-bold uppercase tracking-[0.48em]"
      >
        North America overview
      </text>

      {hotspots.map((c) => (
        <g key={c.id}>
          <circle cx={c.Fx} cy={c.Fy} r={10} className="fill-primary" opacity={0.32} />
          <circle
            cx={c.Fx}
            cy={c.Fy}
            r={6.5}
            className="fill-white"
            opacity={0.92}
            stroke="rgb(255 255 255 / 0.4)"
            strokeWidth={2}
          />
        </g>
      ))}
    </svg>
  );
}

export default function LandingCampusTour() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  const [vp, setVp] = useState({ w: 0, h: 0 });

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const resize = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { clientWidth: w, clientHeight: h } = el;
    setVp({ w: Math.max(120, Math.floor(w)), h: Math.max(120, Math.floor(h)) });
  }, []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      resize();
      return undefined;
    }
    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    resize();
    return () => ro.disconnect();
  }, [resize]);

  const mealsMatrix = useMemo(
    () => CAMPUSES.map((_, i) => pickMealsForStop(i)),
    [],
  );

  useLayoutEffect(() => {
    const vw = vp.w;
    const vh = vp.h;
    const layer = mapLayerRef.current;
    if (!layer || vw < 140 || vh < 140) return;

    gsap.killTweensOf(layer);
    cancelledRef.current = false;

    const ctx = gsap.context(() => {
      const ov = overview(vw, vh);

      gsap.set(layer, {
        force3D: true,
        transformOrigin: '0px 0px',
        x: ov.x,
        y: ov.y,
        scale: ov.scale,
      });

      const zoomMulMobile = vw < 520 ? 2.92 : vw < 900 ? 3.52 : 3.95;

      const tl = gsap.timeline({
        repeat: -1,
        defaults: { overwrite: 'auto' },
      });

      CAMPUSES.forEach((school, i) => {
        const next = CAMPUSES[(i + 1) % CAMPUSES.length];

        const zoomState = focal(vw, vh, school.Fx, school.Fy, ov.scale * zoomMulMobile);

        tl.to(layer, {
          duration: i === 0 ? 2.42 : 1.88,
          ease: 'power4.inOut',
          x: zoomState.x,
          y: zoomState.y,
          scale: zoomState.scale,
          onComplete: () => {
            if (!cancelledRef.current) setFocusedIndex(i);
          },
        }).to(
          {},
          {
            duration: HOLD_SECONDS,
            // Holds zoom so the meal card can stay visible for HOLD_SECONDS sec
          },
        );

        // Pull camera back + sling toward NEXT (+ brief overview read) — high‑velocity cue
        const pull = focal(
          vw,
          vh,
          school.Fx * 0.55 + next.Fx * 0.45,
          school.Fy * 0.55 + next.Fy * 0.45,
          ov.scale * 1.52,
        );

        tl.call(() => {
          if (!cancelledRef.current) setFocusedIndex(null);
        })
          .to(layer, {
            duration: 0.38,
            ease: 'power4.in',
            x: pull.x,
            y: pull.y,
            scale: pull.scale,
          })
          .to(
            layer,
            {
              duration: 0.36,
              ease: 'power2.inOut',
              ...overview(vw, vh),
            },
            '-=0.06',
          )
          .to(layer, {
            duration: 0.68,
            ease: 'power4.inOut',
            ...whooshToward(vw, vh, next, 1.42),
          });
      });
    }, layer);

    return () => {
      cancelledRef.current = true;
      ctx.revert();
    };
  }, [vp.w, vp.h]);

  const campus = focusedIndex !== null ? CAMPUSES[focusedIndex] : null;
  const meals = focusedIndex !== null ? mealsMatrix[focusedIndex] : [];

  return (
    <div className="relative m-auto flex h-[min(68vh,640px)] w-full max-w-2xl items-stretch lg:h-[min(calc(100dvh-9rem),720px)] lg:max-w-none lg:min-h-[480px]">
      <div
        ref={viewportRef}
        className="relative isolate m-auto min-h-[320px] w-full max-h-full flex-1 overflow-hidden rounded-[2px] border border-white/18 bg-black/13 shadow-inner sm:min-h-[420px]"
        aria-hidden
      >
        <div
          ref={mapLayerRef}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            width: MAP_W,
            height: MAP_H,
          }}
        >
          <MapDecor hotspots={[...CAMPUSES]} />

          <div
            className="pointer-events-none absolute inset-0 rounded-[10px]"
            style={{
              boxShadow:
                'inset 0 0 80px rgb(17 24 39 / 0.32), inset 0 1px 0 rgb(255 255 255 / 0.08)',
            }}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[5.25rem] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.38),transparent)]"
          aria-hidden
        />

      </div>

      <div
        className={`pointer-events-none absolute inset-0 flex items-start justify-center p-6 transition-opacity duration-[400ms] ease-out lg:justify-end lg:pr-[5%] lg:pt-[8%]
          ${campus ? 'opacity-100' : 'opacity-0'}`}
      >
        {campus && (
          <div className="w-full max-w-[18.75rem] border border-neutral-800/13 bg-white p-[1.375rem] text-neutral-950 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.55)]">
            <div className="mb-5 flex items-center gap-3.5 border-b border-neutral-900/13 pb-[1.0625rem]">
              <img
                src={campus.logo}
                alt=""
                className="h-11 w-auto max-w-[132px] object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-950/58">Campus pick</p>
                <p className="truncate text-[13px] font-extrabold leading-snug">{campus.label}</p>
              </div>
            </div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.21em] text-neutral-950/46">Tonight’s dining snapshots</p>
            <div className="space-y-3">
              {meals.map((meal) => (
                <div
                  key={`${campus.id}-${meal.id}-${meal.calories}`}
                  className="rounded-[2px] border border-neutral-950/13 bg-neutral-50 px-3.5 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.92)]"
                >
                  <p className="text-[13px] font-semibold leading-snug">{meal.name}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-950/45">
                    {meal.calories} kcal • {meal.protein}g prot •{' '}
                    <span className="text-neutral-950/68">{meal.location}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <span className="sr-only">
        Animated global campus tour spanning{' '}
        {CAMPUSES.map((c) => c.label).join(', ')}.
      </span>
    </div>
  );
}
