import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import type { MenuItem } from '@/types';

const HOVER_REVEAL_MS = 1500;

/** Generic food placeholder (Unsplash) */
const PLACEHOLDER_MEAL_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=82';

type MenuMealCardRowProps = {
  item: MenuItem;
  matchLabel: string;
  showMatch: boolean;
  topPick: boolean;
  cardStyle?: CSSProperties;
  onAddToPlan: (button: HTMLElement) => void;
};

export function MenuMealCardRow({
  item,
  matchLabel,
  showMatch,
  topPick,
  cardStyle,
  onAddToPlan,
}: MenuMealCardRowProps) {
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleEnter = useCallback(
    (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = setTimeout(() => {
        setPreview({ x: posRef.current.x, y: posRef.current.y });
      }, HOVER_REVEAL_MS);
    },
    [clearTimer],
  );

  const handleLeave = useCallback(() => {
    clearTimer();
    setPreview(null);
  }, [clearTimer]);

  const handleMove = useCallback((e: MouseEvent) => {
    posRef.current = { x: e.clientX, y: e.clientY };
    setPreview((prev) =>
      prev ? { x: e.clientX, y: e.clientY } : prev,
    );
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const portal =
    preview && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[9999] w-[168px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md"
            style={{
              left: Math.min(preview.x + 16, window.innerWidth - 184),
              top: Math.min(preview.y + 16, window.innerHeight - 140),
            }}
            aria-hidden
          >
            <img
              src={PLACEHOLDER_MEAL_IMAGE}
              alt=""
              width={168}
              height={112}
              className="h-[112px] w-[168px] rounded-lg object-cover"
              draggable={false}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <li
        className={`rounded-lg border border-gray-200 shadow-sm transition-shadow hover:shadow-md ${
          !topPick ? 'bg-white' : ''
        }`}
        style={cardStyle}
      >
        <div
          className="grid w-full grid-cols-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5"
          onMouseEnter={(e) => handleEnter(e)}
          onMouseLeave={handleLeave}
          onMouseMove={handleMove}
        >
          <div className="min-w-0 cursor-default text-left">
            <p className="font-bold leading-snug tracking-[-0.02em] text-neutral-900">
              {item.name}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {showMatch && (
                <span className="text-sm font-medium tabular-nums text-primary">
                  {matchLabel}
                </span>
              )}
              <p className="font-mono text-xs font-medium text-neutral-500">
                P: {item.protein}g · C: {item.carbs}g · F: {item.fats}g
              </p>
            </div>
          </div>
          <div className="flex shrink-0 justify-start sm:justify-end">
            <button
              type="button"
              onClick={(e) => onAddToPlan(e.currentTarget)}
              className="rounded-md border border-primary bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:scale-[0.98]"
            >
              Add to plan
            </button>
          </div>
        </div>
      </li>
      {portal}
    </>
  );
}
