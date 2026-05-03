/** Iowa State campus–adjacent framing; offsets differentiate halls for flyTo. */
export interface DiningHallCamera {
  id: string;
  /** Must match `MenuItem.location` in mock data */
  locationKey: string;
  displayName: string;
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export const DINING_HALLS: DiningHallCamera[] = [
  {
    id: 'udcc',
    locationKey: 'UDCC',
    displayName: 'UDCC',
    lng: -93.6414,
    lat: 42.0234,
    zoom: 17.25,
    pitch: 64,
    bearing: -42,
  },
  {
    id: 'seasons',
    locationKey: 'Seasons',
    displayName: 'Seasons Marketplace',
    lng: -93.6438,
    lat: 42.0208,
    zoom: 17.15,
    pitch: 58,
    bearing: 18,
  },
  {
    id: 'conversations',
    locationKey: 'Conversations',
    displayName: 'Conversations',
    lng: -93.6395,
    lat: 42.0216,
    zoom: 17.2,
    pitch: 60,
    bearing: 110,
  },
];
