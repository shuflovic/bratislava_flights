
export interface Flight {
  id: string;
  from: string;
  to: string;
  duration: string;
  airlines: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
  name: string;
}

export interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label: string;
  flightData: Flight;
}

export interface GlobePoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
}
