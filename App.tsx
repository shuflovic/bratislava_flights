
import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Flight, Coordinates } from './types';
import { INITIAL_FLIGHTS, CITY_COORDS_CACHE } from './constants';
import { geocodeCities } from './services/geminiService';
import GlobeVisualizer from './components/GlobeVisualizer';
// Fix: Correct Lucide icon imports by using their valid exported names and aliasing them to the names used in the JSX to resolve 'lucide-react' export errors.
import { 
  CloudUpload as CloudArrowUpIcon, 
  FileDown as DocumentArrowDownIcon, 
  Plane as PlaneIcon, 
  Map as MapIcon,
  X as XMarkIcon,
  Info as InformationCircleIcon,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';

const App: React.FC = () => {
  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [coordsCache, setCoordsCache] = useState<Record<string, Coordinates>>(CITY_COORDS_CACHE);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Function to handle missing coordinates using Gemini
  const resolveMissingCoords = useCallback(async (currentFlights: Flight[]) => {
    const missingCities = new Set<string>();
    currentFlights.forEach(f => {
      if (!coordsCache[f.from]) missingCities.add(f.from);
      if (!coordsCache[f.to]) missingCities.add(f.to);
    });

    if (missingCities.size > 0) {
      setIsProcessing(true);
      const newCoords = await geocodeCities(Array.from(missingCities));
      setCoordsCache(prev => ({ ...prev, ...newCoords }));
      setIsProcessing(false);
    }
  }, [coordsCache]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const newFlights: Flight[] = jsonData.map((row, index) => ({
        id: `upload-${index}`,
        from: row.from || row.From || '',
        to: row.to || row.To || '',
        duration: row.duration || row.Duration || 'N/A',
        airlines: row.airlines || row.Airlines || row.Airline || 'Unknown'
      })).filter(f => f.from && f.to);

      if (newFlights.length > 0) {
        setFlights(newFlights);
        await resolveMissingCoords(newFlights);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadSampleFile = () => {
    const ws = XLSX.utils.json_to_sheet([
      { from: 'Bratislava', to: 'London', duration: '2h 15m', airlines: 'Ryanair' },
      { from: 'Bratislava', to: 'Istanbul', duration: '2h 30m', airlines: 'Turkish Airlines' },
      { from: 'Paris', to: 'New York', duration: '8h 00m', airlines: 'Air France' },
      { from: 'Berlin', to: 'Singapore', duration: '12h 45m', airlines: 'Lufthansa' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flights");
    XLSX.writeFile(wb, "sample_flights.xlsx");
  };

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-slate-100 selection:bg-blue-500/30">
      {/* 3D Globe Visualizer Background */}
      <div className="absolute inset-0 z-0">
        <GlobeVisualizer 
          flights={flights} 
          coordsCache={coordsCache} 
          selectedFlightId={selectedFlightId} 
          onSelectFlight={setSelectedFlightId}
        />
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
        {/* Header */}
        <header className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <MapIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AeroVista</h1>
              <p className="text-xs text-slate-400 font-medium">Global Network Visualizer</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button 
              onClick={downloadSampleFile}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-xl"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Sample .xlsx</span>
            </button>
            <label className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer shadow-xl shadow-blue-500/20">
              <CloudArrowUpIcon className="w-4 h-4" />
              <span>Upload Flights</span>
              <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
            </label>
          </div>
        </header>

        {/* Floating Flight Info (Conditional) */}
        <div className="flex flex-col md:flex-row justify-between items-end space-y-4 md:space-y-0">
          <div className="w-full md:w-80 pointer-events-auto">
            {selectedFlight ? (
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <PlaneIcon className="w-5 h-5 text-blue-400 rotate-90" />
                  </div>
                  <button 
                    onClick={() => setSelectedFlightId(null)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Origin</p>
                      <p className="text-xl font-semibold">{selectedFlight.from}</p>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-slate-600" />
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Destination</p>
                      <p className="text-xl font-semibold">{selectedFlight.to}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Duration</p>
                      <p className="text-sm font-medium">{selectedFlight.duration}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Airline</p>
                      <p className="text-sm font-medium">{selectedFlight.airlines}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
               <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 p-4 rounded-xl shadow-xl">
                 <div className="flex items-center space-x-3">
                   <InformationCircleIcon className="w-5 h-5 text-blue-400" />
                   <p className="text-sm text-slate-300">Click a flight path on the globe to see details.</p>
                 </div>
               </div>
            )}
          </div>

          {/* Sidebar / List */}
          <div className="w-full md:w-80 h-[40vh] md:h-[60vh] bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-bold">Active Routes</h2>
              <span className="bg-blue-600/30 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                {flights.length} FLIGHTS
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {flights.map((flight) => (
                <div 
                  key={flight.id}
                  onClick={() => setSelectedFlightId(flight.id)}
                  className={`p-4 cursor-pointer border-b border-white/5 transition-all hover:bg-white/5 ${selectedFlightId === flight.id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold">{flight.from} to {flight.to}</span>
                    <span className="text-[10px] text-slate-500">{flight.duration}</span>
                  </div>
                  <span className="text-xs text-slate-500 italic">{flight.airlines}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-16 h-16 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-medium text-white">Optimizing flight paths...</p>
          <p className="text-sm text-slate-400">Gemini AI is geocoding locations</p>
        </div>
      )}

      {/* Welcome Tooltip */}
      {showWelcome && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 animate-bounce">
          <PlaneIcon className="w-6 h-6 rotate-45" />
          <p className="font-medium">Welcome! Start by uploading your flights.xlsx</p>
          <button onClick={() => setShowWelcome(false)} className="hover:text-blue-200"><XMarkIcon className="w-5 h-5" /></button>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default App;
