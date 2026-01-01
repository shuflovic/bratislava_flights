
import { Flight, Coordinates } from './types';

export const INITIAL_FLIGHTS: Flight[] = [
  { id: '1', from: 'Bratislava', to: 'London', duration: '2h 15m', airlines: 'Ryanair' },
  { id: '2', from: 'Bratislava', to: 'Istanbul', duration: '2h 30m', airlines: 'Turkish Airlines' },
  { id: '3', from: 'London', to: 'New York', duration: '7h 50m', airlines: 'British Airways' },
  { id: '4', from: 'Istanbul', to: 'Dubai', duration: '4h 15m', airlines: 'Emirates' },
  { id: '5', from: 'Dubai', to: 'Tokyo', duration: '9h 40m', airlines: 'JAL' }
];

export const CITY_COORDS_CACHE: Record<string, Coordinates> = {
  'Bratislava': { lat: 48.1486, lng: 17.1077, name: 'Bratislava' },
  'London': { lat: 51.5074, lng: -0.1278, name: 'London' },
  'Istanbul': { lat: 41.0082, lng: 28.9784, name: 'Istanbul' },
  'New York': { lat: 40.7128, lng: -74.0060, name: 'New York' },
  'Dubai': { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
  'Tokyo': { lat: 35.6762, lng: 139.6503, name: 'Tokyo' }
};
