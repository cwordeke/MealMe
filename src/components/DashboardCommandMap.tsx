import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = import.meta.env.MAPBOX_API_KEY ?? '';

export type FlyToHallPayload = {
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

export type DashboardCommandMapHandle = {
  flyToHall: (p: FlyToHallPayload) => void;
  /** Pulsing marker at a dining hall when a recommended meal is selected */
  setRecommendationPulse: (coords: { lng: number; lat: number } | null) => void;
};

/** Copied minimal helpers from landing tour — keep dashboard self-contained. */
function addExtrudedBuildings(map: mapboxgl.Map): void {
  if (map.getLayer('mealme-dash-3d-buildings')) return;
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
    id: 'mealme-dash-3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', ['get', 'extrude'], 'true'],
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': '#94a3b8',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'height'],
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15,
        0,
        15.05,
        ['get', 'min_height'],
      ],
      'fill-extrusion-opacity': 0.52,
    },
  };

  try {
    map.addLayer(layerSpec, labelLayerId);
  } catch {
    try {
      map.addLayer(layerSpec);
    } catch {
      /* unavailable */
    }
  }
}

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

function hideMapLabelNoise(map: mapboxgl.Map): void {
  const tryHide = (layerId: string): void => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setLayoutProperty(layerId, 'visibility', 'none');
    } catch {
      /* unsupported */
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

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

interface DashboardCommandMapProps {
  /** Initial camera — first hall’s framing */
  initial: FlyToHallPayload;
}

const DashboardCommandMap = forwardRef<
  DashboardCommandMapHandle,
  DashboardCommandMapProps
>(function DashboardCommandMap({ initial }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pulseMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useImperativeHandle(ref, () => ({
    flyToHall: (p: FlyToHallPayload) => {
      const map = mapRef.current;
      if (!map) return;
      map.flyTo({
        center: [p.lng, p.lat],
        zoom: p.zoom,
        pitch: p.pitch,
        bearing: p.bearing,
        duration: 2200,
        curve: 1.35,
        speed: 0.85,
        easing: easeOutCubic,
        essential: true,
      });
    },
    setRecommendationPulse: (coords: { lng: number; lat: number } | null) => {
      const map = mapRef.current;
      pulseMarkerRef.current?.remove();
      pulseMarkerRef.current = null;
      if (!coords || !map) return;

      const wrap = document.createElement('div');
      wrap.className = 'mealme-map-pulse-wrap';
      wrap.innerHTML =
        '<div class="mealme-map-pulse-ring" aria-hidden="true"></div><div class="mealme-map-pulse-dot" aria-hidden="true"></div>';

      const marker = new mapboxgl.Marker({
        element: wrap,
        anchor: 'center',
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);

      pulseMarkerRef.current = marker;
    },
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    let cancelled = false;
    let map: mapboxgl.Map | null = null;

    const boot = (): void => {
      if (!MAPBOX_TOKEN) {
        el.innerHTML =
          '<div class="flex h-full min-h-[200px] items-center justify-center border border-neutral-300 bg-neutral-50 p-4 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Add <code class="mx-1 font-mono normal-case">MAPBOX_API_KEY</code> to <code class="mx-1 font-mono normal-case">.env</code></div>';
        return;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;

      map = new mapboxgl.Map({
        container: el,
        style: 'mapbox://styles/mapbox/light-v11',
        projection: { name: 'globe' },
        center: [initial.lng, initial.lat],
        zoom: initial.zoom - 0.35,
        bearing: initial.bearing,
        pitch: initial.pitch,
        attributionControl: false,
      });

      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        'bottom-right',
      );

      mapRef.current = map;

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
      });
    };

    boot();

    return () => {
      cancelled = true;
      pulseMarkerRef.current?.remove();
      pulseMarkerRef.current = null;
      map?.remove();
      map = null;
      mapRef.current = null;
    };
  }, [initial.bearing, initial.lat, initial.lng, initial.pitch, initial.zoom]);

  return (
    <div className="relative h-full min-h-0 w-full flex-1 bg-white">
      <div
        ref={containerRef}
        className="dashboard-command-map-host h-full min-h-[280px] w-full min-h-0"
        aria-label="Campus command map"
      />
    </div>
  );
});

DashboardCommandMap.displayName = 'DashboardCommandMap';

export default DashboardCommandMap;
