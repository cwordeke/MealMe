import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = import.meta.env.MAPBOX_API_KEY ?? '';

export interface CampusStop {
  school: string;
  diningHall: string;
  featuredMeal: string;
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export type LandingMapboxTourHandle = {
  /** Aggressive zoom-in for the landing-page “dive” transition (runs ~800ms). */
  dive: () => void;
};

export interface LandingMapboxTourProps {
  /**
   * When `false`, no campus tour or fly animations; camera is fixed on the first campus
   * and pan/zoom are disabled (e.g. onboarding HUD background).
   * @default true
   */
  enableTour?: boolean;
}

/** Regional framing around stop 0 so the first fly-in is a short “final approach,” not a globe-level haul. */
function initialCameraForFirstStop(first: CampusStop): {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
} {
  return {
    center: [first.lng, first.lat],
    zoom: 8.9,
    pitch: 50,
    bearing: first.bearing - 28,
  };
}

function easePower4InOut(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2;
}

function easeCubicOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function addExtrudedBuildings(map: mapboxgl.Map): void {
  if (map.getLayer('mealme-3d-buildings')) return;
  const style = map.getStyle();
  if (!style.layers?.length) return;

  let labelLayerId: string | undefined;
  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue;
    const layout = layer.layout as Record<string, unknown> | undefined;
    if (!layout?.['text-field']) continue;
    labelLayerId = layer.id;
    break;
  }

  const layerSpec: Parameters<mapboxgl.Map['addLayer']>[0] = {
    id: 'mealme-3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', ['get', 'extrude'], 'true'],
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': '#94a3b8',
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
      'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
      'fill-extrusion-opacity': 0.55,
    },
  };

  try {
    map.addLayer(layerSpec, labelLayerId);
  } catch {
    try {
      map.addLayer(layerSpec);
    } catch {
      /* building tileset unavailable */
    }
  }
}

/** True when this text layer is for street / highway names (hidden); false for towns, POIs, buildings, etc. */
function shouldHideStreetNameLayer(layerId: string): boolean {
  const id = layerId.toLowerCase();

  if (id.includes('settlement')) return false;
  if (id.startsWith('place-')) return false;
  if (id.includes('poi')) return false;
  if (id.includes('building')) return false;

  if (id.startsWith('road-')) return true;
  if (id.includes('street') && id.includes('label')) return true;

  return false;
}

/**
 * Hide only road/street name labels; keep settlement & place (town) names, POIs, and building labels.
 */
function hideMapLabelNoise(map: mapboxgl.Map): void {
  const tryHide = (layerId: string): void => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setLayoutProperty(layerId, 'visibility', 'none');
    } catch {
      /* layer unsupported */
    }
  };

  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue;
    const layout = layer.layout as Record<string, unknown> | undefined;
    if (layout?.['text-field'] === undefined) continue;
    if (!shouldHideStreetNameLayer(layer.id)) continue;
    tryHide(layer.id);
  }
}

/** Inline typography so labels stay sharp & legible at pitched 3D camera angles (not reliant on Tailwind JIT on dynamic nodes). */
function fillTourPanel(panel: HTMLElement, stop: CampusStop): void {
  panel.replaceChildren();

  const school = document.createElement('p');
  school.style.cssText =
    'margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;line-height:1.35;';
  school.textContent = stop.school;

  const hall = document.createElement('p');
  hall.style.cssText =
    'margin:10px 0 0 0;font-size:clamp(17px,2.6vmin,21px);font-weight:800;line-height:1.22;color:#0f172a;text-shadow:0 1px 0 rgba(255,255,255,0.95),0 2px 16px rgba(0,0,0,0.14),0 0 1px rgba(15,23,42,0.35);';
  hall.textContent = stop.diningHall;

  const meal = document.createElement('p');
  meal.style.cssText =
    'margin:10px 0 0 0;font-size:clamp(14px,2.1vmin,17px);font-weight:600;line-height:1.45;color:#334155;text-shadow:0 1px 0 rgba(255,255,255,0.85);';
  meal.textContent = stop.featuredMeal;

  panel.append(school, hall, meal);
}

function buildHtmlMarker(): { root: HTMLElement; panel: HTMLElement; pin: HTMLElement } {
  const root = document.createElement('div');
  root.className = 'mapbox-tour-ui mapbox-tour-ui--hiding';

  const panel = document.createElement('div');
  panel.className = 'mapbox-tour-ui__panel';
  panel.style.cssText =
    'min-width:12.75rem;max-width:min(21rem,calc(100vw - 3rem));padding:1rem 1.125rem;border-radius:8px;background:#ffffff;border:1px solid #cbd5e1;box-shadow:0 2px 8px -2px rgba(15,23,42,0.12),0 18px 42px -14px rgba(15,23,42,0.22),0 0 0 1px rgba(15,23,42,0.06),inset 0 1px 0 rgba(255,255,255,1);';

  const pin = document.createElement('div');
  pin.className = 'mapbox-tour-ui__pin';

  const ringA = document.createElement('span');
  ringA.className = 'mapbox-tour-ui__ring mapbox-tour-ui__ring--a';
  const ringB = document.createElement('span');
  ringB.className = 'mapbox-tour-ui__ring mapbox-tour-ui__ring--b';

  const dot = document.createElement('span');
  dot.className = 'mapbox-tour-ui__dot';
  dot.style.cssText =
    'position:relative;z-index:2;display:block;width:0.9rem;height:0.9rem;border-radius:9999px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.45),0 5px 18px rgba(0,0,0,0.45);';

  pin.append(ringA, ringB, dot);
  root.append(panel, pin);
  return { root, panel, pin };
}

/** After the camera has settled: fade the pin (dot + rings) in slowly. */
function settlePinFadeIn(pin: HTMLElement): void {
  pin.classList.remove('mapbox-tour-ui__pin--exiting', 'mapbox-tour-ui__pin--shown');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pin.classList.add('mapbox-tour-ui__pin--shown');
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pin.classList.add('mapbox-tour-ui__pin--shown');
    });
  });
}

/** Finish fading the pin out, then run `then` (starts the next fly). */
function fadeOutPinThen(
  pin: HTMLElement,
  timersRef: { hold?: number; pinFallback?: number },
  aborted: () => boolean,
  then: () => void,
): void {
  let finished = false;
  const done = (): void => {
    if (finished) return;
    finished = true;
    pin.removeEventListener('transitionend', onEnd);
    if (timersRef.pinFallback !== undefined) {
      window.clearTimeout(timersRef.pinFallback);
      timersRef.pinFallback = undefined;
    }
    pin.classList.remove('mapbox-tour-ui__pin--exiting', 'mapbox-tour-ui__pin--shown');
    if (!aborted()) then();
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done();
    return;
  }

  const onEnd = (e: TransitionEvent): void => {
    if (e.target !== pin || e.propertyName !== 'opacity') return;
    done();
  };

  pin.addEventListener('transitionend', onEnd);
  pin.classList.add('mapbox-tour-ui__pin--exiting');
  timersRef.pinFallback = window.setTimeout(done, 720);
}

function isCampusStopArray(data: unknown): data is CampusStop[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const row = data[0] as Record<string, unknown>;
  return (
    typeof row.school === 'string' &&
    typeof row.diningHall === 'string' &&
    typeof row.featuredMeal === 'string' &&
    typeof row.lng === 'number' &&
    typeof row.lat === 'number'
  );
}

/**
 * Hides the marker immediately, flies to `stopIndex`, then fills panel after `moveend` and fades the pin in.
 */
function beginCampusTourStep(
  map: mapboxgl.Map,
  marker: mapboxgl.Marker,
  root: HTMLElement,
  panel: HTMLElement,
  pin: HTMLElement,
  stops: CampusStop[],
  stopIndex: number,
  timersRef: { hold?: number; pinFallback?: number },
  aborted: () => boolean,
): void {
  const campus = stops[stopIndex % stops.length]!;
  const isFirstLegFromOverview = stopIndex === 0;

  root.classList.add('mapbox-tour-ui--hiding');
  panel.classList.remove('mapbox-tour-ui__panel--visible');

  const settle = (): void => {
    if (aborted()) return;
    marker.setLngLat([campus.lng, campus.lat]);
    fillTourPanel(panel, campus);
    root.classList.remove('mapbox-tour-ui--hiding');
    panel.classList.add('mapbox-tour-ui__panel--visible');
    settlePinFadeIn(pin);

    if (timersRef.hold !== undefined) window.clearTimeout(timersRef.hold);

    timersRef.hold = window.setTimeout(() => {
      if (aborted()) return;
      fadeOutPinThen(pin, timersRef, aborted, () => {
        if (aborted()) return;
        beginCampusTourStep(map, marker, root, panel, pin, stops, stopIndex + 1, timersRef, aborted);
      });
    }, 5000);
  };

  map.once('moveend', settle);

  map.flyTo({
    center: [campus.lng, campus.lat],
    zoom: campus.zoom,
    bearing: campus.bearing,
    pitch: campus.pitch,
    duration: isFirstLegFromOverview ? 5800 : 7850,
    curve: isFirstLegFromOverview ? 1.42 : 1.48,
    speed: isFirstLegFromOverview ? 0.72 : 0.74,
    easing: easePower4InOut,
    essential: true,
  });
}

function disableMapInteractions(map: mapboxgl.Map): void {
  map.dragPan.disable();
  map.scrollZoom.disable();
  map.boxZoom.disable();
  map.dragRotate.disable();
  map.keyboard.disable();
  map.doubleClickZoom.disable();
  map.touchZoomRotate.disable();
}

const LandingMapboxTour = forwardRef<LandingMapboxTourHandle, LandingMapboxTourProps>(
  function LandingMapboxTour({ enableTour = true }, ref) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortedRef = useRef(false);
  const timersRef = useRef<{ hold?: number; pinFallback?: number }>({});
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerInstanceRef = useRef<mapboxgl.Marker | null>(null);

  const clearHold = (): void => {
    const tr = timersRef.current;
    if (tr.hold !== undefined) {
      window.clearTimeout(tr.hold);
      tr.hold = undefined;
    }
    if (tr.pinFallback !== undefined) {
      window.clearTimeout(tr.pinFallback);
      tr.pinFallback = undefined;
    }
  };

  useImperativeHandle(ref, () => ({
    dive: (): void => {
      abortedRef.current = true;
      clearHold();
      markerInstanceRef.current?.remove();
      markerInstanceRef.current = null;
      const map = mapInstanceRef.current;
      if (!map) return;
      map.stop();
      const c = map.getCenter();
      map.flyTo({
        center: [c.lng, c.lat],
        zoom: 19,
        pitch: Math.min(map.getPitch() + 12, 78),
        bearing: map.getBearing(),
        duration: 800,
        curve: 1.72,
        speed: 1.35,
        easing: easeCubicOut,
        essential: true,
      });
    },
  }));

  useEffect(() => {
    abortedRef.current = !enableTour;
    let map: mapboxgl.Map | null = null;
    let marker: mapboxgl.Marker | null = null;

    const el = wrapperRef.current;
    if (!el) return undefined;

    let cancelled = false;

    const boot = async () => {
      if (!MAPBOX_TOKEN) {
        el.innerHTML =
          '<div class="flex h-full min-h-[14rem] items-center justify-center p-6"><p class="max-w-[20rem] rounded-sm border border-white/22 bg-black/58 px-4 py-4 text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-white/74">Add your Mapbox token to <code class="mx-0.5 rounded bg-white/12 px-[0.225rem] font-mono normal-case tracking-normal text-white">.env</code> as <code class="mx-0.5 rounded bg-white/12 px-[0.225rem] font-mono normal-case tracking-normal text-white">MAPBOX_API_KEY</code></p></div>';
        return;
      }

      let stops: CampusStop[] = [];
      try {
        const res = await fetch('/campuses.json', { cache: 'no-store' });
        const data: unknown = await res.json();
        if (!isCampusStopArray(data)) {
          el.innerHTML =
            '<p class="p-4 text-sm text-red-200">Invalid <code>campuses.json</code> — expected school, diningHall, featuredMeal, lng, lat, …</p>';
          return;
        }
        stops = data;
      } catch {
        el.innerHTML =
          '<p class="p-4 text-sm text-amber-100">Could not load <code>/campuses.json</code>.</p>';
        return;
      }

      if (cancelled || !wrapperRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const firstStop = stops[0]!;
      const intro = initialCameraForFirstStop(firstStop);

      map = new mapboxgl.Map({
        container: wrapperRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        projection: { name: 'globe' },
        center: intro.center,
        zoom: intro.zoom,
        bearing: intro.bearing,
        pitch: intro.pitch,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      map.on('style.load', () => {
        map?.setFog({
          color: 'rgb(252, 252, 253)',
          'high-color': 'rgb(255, 255, 255)',
          'horizon-blend': 0.06,
          'space-color': 'rgb(245, 246, 249)',
          'star-intensity': 0.12,
        });
      });

      map.on('load', () => {
        if (!map || cancelled) return;

        try {
          hideMapLabelNoise(map);
          addExtrudedBuildings(map);
        } catch {
          /* non-fatal */
        }

        const first = stops[0]!;

        if (!enableTour) {
          abortedRef.current = true;
          map.jumpTo({
            center: [first.lng, first.lat],
            zoom: first.zoom,
            pitch: first.pitch,
            bearing: first.bearing,
          });
          disableMapInteractions(map);
          return;
        }

        abortedRef.current = false;

        const { root, panel, pin } = buildHtmlMarker();
        fillTourPanel(panel, first);

        marker = new mapboxgl.Marker({
          element: root,
          anchor: 'bottom',
          offset: [0, -40],
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        })
          .setLngLat([first.lng, first.lat])
          .addTo(map);

        markerInstanceRef.current = marker;

        queueMicrotask(() => {
          if (!map || !marker || abortedRef.current || cancelled) return;
          beginCampusTourStep(
            map,
            marker,
            root,
            panel,
            pin,
            stops,
            0,
            timersRef.current,
            () => abortedRef.current,
          );
        });
      });
    };

    void boot();

    return () => {
      cancelled = true;
      abortedRef.current = true;
      clearHold();
      marker?.remove();
      marker = null;
      markerInstanceRef.current = null;
      map?.remove();
      map = null;
      mapInstanceRef.current = null;
    };
  }, [enableTour]);

  return (
    <div className="relative flex h-full min-h-[min(68vh,520px)] w-full flex-1 min-h-0">
      <div
        ref={wrapperRef}
        className="landing-mapbox-host h-full min-h-[320px] w-full min-h-0 overflow-hidden sm:min-h-[430px] lg:min-h-0 lg:border-l lg:border-solid lg:border-[#e2e8f0]"
        aria-label="Global campus globe tour"
      />
      <span className="sr-only">
        Mapbox campus tour: dining hall names and meals load from campuses.json; HTML marker stays
        aligned to the screen in 3D.
      </span>
    </div>
  );
});

LandingMapboxTour.displayName = 'LandingMapboxTour';

export default LandingMapboxTour;
