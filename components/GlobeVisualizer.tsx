
import React, { useEffect, useRef, useMemo, useState } from 'react';
import Globe from 'react-globe.gl';
import { Flight, Coordinates, GlobeArc, GlobePoint } from '../types';

interface Props {
  flights: Flight[];
  coordsCache: Record<string, Coordinates>;
  selectedFlightId: string | null;
  onSelectFlight: (id: string | null) => void;
}

const GlobeVisualizer: React.FC<Props> = ({ 
  flights = [], 
  coordsCache = {}, 
  selectedFlightId, 
  onSelectFlight 
}) => {
  const globeRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Prepare data for the globe
  const { arcs, points } = useMemo(() => {
    if (!flights || !Array.isArray(flights)) {
      return { arcs: [], points: [] };
    }

    const arcsData: GlobeArc[] = [];
    const pointsData: Record<string, GlobePoint> = {};

    flights.forEach(flight => {
      const fromCoord = coordsCache[flight.from];
      const toCoord = coordsCache[flight.to];

      if (fromCoord && toCoord) {
        const isSelected = selectedFlightId === flight.id;
        
        arcsData.push({
          startLat: fromCoord.lat,
          startLng: fromCoord.lng,
          endLat: toCoord.lat,
          endLng: toCoord.lng,
          color: isSelected ? '#fbbf24' : '#60a5fa',
          label: `${flight.from} → ${flight.to} (${flight.airlines})`,
          flightData: flight
        });

        // Add start and end points
        [fromCoord, toCoord].forEach(coord => {
          if (!pointsData[coord.name]) {
            pointsData[coord.name] = {
              lat: coord.lat,
              lng: coord.lng,
              size: 0.1,
              color: '#ffffff',
              label: coord.name
            };
          }
        });
      }
    });

    return { 
      arcs: arcsData, 
      points: Object.values(pointsData) 
    };
  }, [flights, coordsCache, selectedFlightId]);

  useEffect(() => {
    if (globeRef.current) {
      setIsReady(true);
      try {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = !selectedFlightId;
          controls.autoRotateSpeed = 0.5;
        }
        
        if (selectedFlightId) {
          const flight = flights.find(f => f.id === selectedFlightId);
          if (flight) {
            const from = coordsCache[flight.from];
            if (from) {
              globeRef.current.pointOfView({ lat: from.lat, lng: from.lng, altitude: 2 }, 1000);
            }
          }
        }
      } catch (e) {
        console.debug('Waiting for globe controls...');
      }
    }
  }, [selectedFlightId, flights, coordsCache]);

  return (
    <div className="w-full h-full relative">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 font-medium">Initializing Global Network...</p>
          </div>
        </div>
      )}
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        arcsData={arcs}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={4}
        arcDashAnimateTime={2000}
        arcStroke={0.5}
        labelsData={points}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => d.label}
        labelSize={0.5}
        labelDotRadius={0.2}
        labelColor={() => 'rgba(255, 255, 255, 0.75)'}
        labelResolution={2}
        onArcClick={(arc: any) => {
          if (arc && arc.flightData) {
            onSelectFlight(arc.flightData.id);
          }
        }}
      />
    </div>
  );
};

export default GlobeVisualizer;
