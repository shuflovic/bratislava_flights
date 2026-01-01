
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  select, 
  drag, 
  geoOrthographic, 
  geoPath, 
  geoGraticule 
} from 'd3';
import * as topojson from 'topojson-client';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  CloudUpload, 
  Plane, 
  Map as MapIcon,
  X,
  ChevronRight,
  RefreshCw,
  Globe as GlobeIcon,
  Download
} from 'lucide-react';

// --- Types ---
interface Flight {
  id: string;
  from: string;
  to: string;
  duration: string;
  airlines: string;
}

interface Coordinates {
  lat: number;
  lng: number;
  name: string;
}

// --- Constants ---
const INITIAL_FLIGHTS: Flight[] = [
  { id: '1', from: 'Bratislava', to: 'London', duration: '2h 15m', airlines: 'Ryanair' },
  { id: '2', from: 'Bratislava', to: 'Istanbul', duration: '2h 30m', airlines: 'Turkish Airlines' },
  { id: '3', from: 'London', to: 'New York', duration: '7h 50m', airlines: 'British Airways' },
  { id: '4', from: 'Istanbul', to: 'Dubai', duration: '4h 15m', airlines: 'Emirates' },
  { id: '5', from: 'Dubai', to: 'Tokyo', duration: '9h 40m', airlines: 'JAL' }
];

const INITIAL_COORDS: Record<string, Coordinates> = {
  'Bratislava': { lat: 48.1486, lng: 17.1077, name: 'Bratislava' },
  'London': { lat: 51.5074, lng: -0.1278, name: 'London' },
  'Istanbul': { lat: 41.0082, lng: 28.9784, name: 'Istanbul' },
  'New York': { lat: 40.7128, lng: -74.0060, name: 'New York' },
  'Dubai': { lat: 25.2048, lng: 55.2708, name: 'Dubai' },
  'Tokyo': { lat: 35.6762, lng: 139.6503, name: 'Tokyo' }
};

// --- Services ---
const geocodeCities = async (cities: string[]): Promise<Record<string, Coordinates>> => {
  if (cities.length === 0) return {};
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Convert the following city names into geographical coordinates (lat/lng). Return JSON array: ${cities.join(', ')}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["name", "lat", "lng"]
          }
        }
      }
    });
    const results: any[] = JSON.parse(response.text || '[]');
    const mapping: Record<string, Coordinates> = {};
    results.forEach(item => { mapping[item.name] = item; });
    return mapping;
  } catch (error) {
    console.error("Geocoding failed:", error);
    return {};
  }
};

// --- SVG Globe Component ---
const SVGGlobe: React.FC<{
  flights: Flight[];
  coords: Record<string, Coordinates>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ flights, coords, selectedId, onSelect }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [world, setWorld] = useState<any>(null);
  const [rotation, setRotation] = useState<[number, number]>([0, -20]);

  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(res => res.json())
      .then(data => setWorld(topojson.feature(data, data.objects.countries)));
  }, []);

  const width = 800;
  const height = 800;
  
  const projection = useMemo(() => 
    geoOrthographic()
      .scale(350)
      .translate([width / 2, height / 2])
      .rotate(rotation)
  , [rotation]);

  const pathGenerator = geoPath(projection);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    const dragBehavior = drag<SVGSVGElement, unknown>().on('drag', (event) => {
      setRotation(prev => [
        prev[0] + event.dx / 4,
        prev[1] - event.dy / 4
      ]);
    });
    svg.call(dragBehavior as any);
  }, []);

  useEffect(() => {
    if (selectedId) {
      const flight = flights.find(f => f.id === selectedId);
      const coord = flight ? coords[flight.from] : null;
      if (coord) {
        setRotation([-coord.lng, -coord.lat]);
      }
    }
  }, [selectedId, flights, coords]);

  return (
    <div className="globe-container flex items-center justify-center w-full h-full">
      <svg ref={svgRef} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="max-w-full max-h-full">
        <defs>
          <radialGradient id="globeGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a2b3c" />
            <stop offset="100%" stopColor="#04070a" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <circle cx={width/2} cy={height/2} r={350} fill="url(#globeGradient)" stroke="#1e293b" strokeWidth="1" />
        <path d={pathGenerator(geoGraticule()()) || ''} fill="none" stroke="#ffffff08" strokeWidth="0.5" />

        {world && (
          <path d={pathGenerator(world) || ''} fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
        )}

        {flights.map(f => {
          const from = coords[f.from];
          const to = coords[f.to];
          if (!from || !to) return null;
          const isSelected = selectedId === f.id;
          const arcLine: any = { type: "LineString", coordinates: [[from.lng, from.lat], [to.lng, to.lat]] };
          
          return (
            <path
              key={f.id}
              d={pathGenerator(arcLine) || ''}
              fill="none"
              stroke={isSelected ? "#fbbf24" : "#3b82f6"}
              strokeWidth={isSelected ? 3 : 1.5}
              strokeDasharray={isSelected ? "none" : "4,2"}
              className="transition-all duration-300 opacity-60 hover:opacity-100 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onSelect(f.id); }}
              style={{ filter: isSelected ? 'url(#glow)' : 'none' }}
            />
          );
        })}

        {Object.values(coords).map(c => {
          const projected = projection([c.lng, c.lat]);
          if (!projected) return null;
          return (
            <g key={c.name} transform={`translate(${projected[0]}, ${projected[1]})`}>
              <circle r="3" fill="#3b82f6" />
              <text y="-8" textAnchor="middle" className="text-[10px] fill-slate-400 pointer-events-none font-medium">
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const App: React.FC = () => {
  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [coords, setCoords] = useState<Record<string, Coordinates>>(INITIAL_COORDS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([
      { from: 'Bratislava', to: 'London', duration: '2h 15m', airlines: 'Ryanair' },
      { from: 'Bratislava', to: 'Istanbul', duration: '2h 30m', airlines: 'Turkish Airlines' },
      { from: 'Paris', to: 'New York', duration: '8h 00m', airlines: 'Air France' },
      { from: 'Tokyo', to: 'Sydney', duration: '9h 30m', airlines: 'Qantas' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flights");
    XLSX.writeFile(wb, "flights_sample.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);
        
        // Smart mapping for common aliases
        const newFlights: Flight[] = rawData.map((r, i) => {
          const fromValue = r.from || r.From || r.Origin || r.origin || r.source || r.Source;
          const toValue = r.to || r.To || r.Destination || r.destination || r.target || r.Target;
          const durationValue = r.duration || r.Duration || r.time || r.Time || r['Flight Time'];
          const airlineValue = r.airlines || r.Airlines || r.carrier || r.Carrier || r.airline || r.Airline;

          return {
            id: `up-${i}-${Date.now()}`,
            from: String(fromValue || '').trim(),
            to: String(toValue || '').trim(),
            duration: String(durationValue || 'N/A'),
            airlines: String(airlineValue || 'Unknown')
          };
        }).filter(f => f.from && f.to);

        if (newFlights.length === 0) {
          alert("No valid flights found. Please check column names (From, To, Duration, Airlines).");
          setLoading(false);
          return;
        }

        const missing = new Set<string>();
        newFlights.forEach(f => {
          if (!coords[f.from]) missing.add(f.from);
          if (!coords[f.to]) missing.add(f.to);
        });

        if (missing.size > 0) {
          const fresh = await geocodeCities(Array.from(missing));
          setCoords(prev => ({ ...prev, ...fresh }));
        }
        setFlights(newFlights);
      } catch (err) {
        console.error("File error:", err);
        alert("Error reading file. Please use a standard Excel or CSV file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const selectedFlight = flights.find(f => f.id === selectedId);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#04070a] text-slate-200">
      <div className="absolute inset-0 flex items-center justify-center p-10 md:p-20">
        <SVGGlobe flights={flights} coords={coords} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="absolute inset-0 pointer-events-none flex flex-col p-6 md:p-8 z-20">
        <header className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-2xl">
              <Plane className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white">AeroVista</h1>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Node Synchronized</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={downloadSample}
              className="flex items-center space-x-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 px-4 py-2.5 rounded-xl transition-all pointer-events-auto"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold">Sample .xlsx</span>
            </button>
            <label className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl transition-all cursor-pointer pointer-events-auto shadow-lg shadow-blue-900/20">
              <CloudUpload className="w-5 h-5" />
              <span className="text-sm font-bold">Import Data</span>
              <input type="file" className="hidden" accept=".xlsx,.csv" onChange={handleFileUpload} />
            </label>
          </div>
        </header>

        <div className="mt-auto flex flex-col md:flex-row gap-6 items-end justify-between">
          <div className="w-full md:w-80 pointer-events-auto">
            {selectedFlight ? (
              <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <GlobeIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <button onClick={() => setSelectedId(null)} className="p-1.5 hover:bg-white/5 rounded-full">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Origin</p>
                      <h3 className="text-lg font-bold">{selectedFlight.from}</h3>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Destination</p>
                      <h3 className="text-lg font-bold">{selectedFlight.to}</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[9px] uppercase font-black text-slate-500">Time</p>
                      <p className="text-blue-400 font-bold text-sm">{selectedFlight.duration}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black text-slate-500">Carrier</p>
                      <p className="text-white font-bold text-sm truncate">{selectedFlight.airlines}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 px-4 py-3 rounded-2xl flex items-center space-x-3">
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin-slow" />
                <p className="text-[11px] text-slate-400">Drag globe to rotate • Click arcs to inspect</p>
              </div>
            )}
          </div>

          <div className="w-full md:w-[380px] h-[35vh] md:h-[50vh] bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
               <h2 className="font-bold text-sm flex items-center space-x-2">
                 <MapIcon className="w-4 h-4 text-blue-400" />
                 <span>Fleet Status</span>
               </h2>
               <div className="px-2.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-tighter">
                 {flights.length} Nodes
               </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {flights.map(f => (
                <div 
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 flex items-center justify-between ${selectedId === f.id ? 'bg-blue-600/10 border-l-4 border-l-blue-600' : ''}`}
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-xs">{f.from} → {f.to}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase font-bold tracking-tighter truncate">{f.airlines}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-mono text-blue-400/80">{f.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <h2 className="text-lg font-black text-white">Geospatial Mapping</h2>
          <p className="text-slate-500 text-xs mt-1">Resolving city nodes via Gemini Flash...</p>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
