import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
// @ts-expect-error - Leaflet icon internals
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lon: number, address: string, city: string) => void;
  initialPos?: { lat: number, lon: number };
}

function MapEvents({ onLocationSelect, setMarkerPos, setIsDetecting }: { 
    onLocationSelect: (lat: number, lon: number, address: string, city: string) => void,
    setMarkerPos: (pos: [number, number]) => void,
    setIsDetecting: (val: boolean) => void
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkerPos([lat, lng]);
      reverseGeocode(lat, lng, onLocationSelect, setIsDetecting);
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 14));
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [center, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Run invalidateSize across multiple ticks to account for CSS animations / layout shifts
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 800)
    ];

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

const reverseGeocode = async (
    lat: number, 
    lon: number, 
    onLocationSelect: (lat: number, lon: number, addr: string, city: string) => void, 
    setIsDetecting: (val: boolean) => void
) => {
    setIsDetecting(true);
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.state_district || addr.county || "";
        const displayAddr = data.display_name || "Custom Location";
        onLocationSelect(lat, lon, displayAddr, city);
    } catch (err) {
        console.error("[LocationPicker] Reverse geocoding network error:", err);
        onLocationSelect(lat, lon, "Custom Selected Location", "");
    } finally {
        setIsDetecting(false);
    }
};

export function LocationPicker({ onLocationSelect, initialPos }: LocationPickerProps) {
  const [markerPos, setMarkerPos] = useState<[number, number]>(initialPos ? [initialPos.lat, initialPos.lon] : [28.6139, 77.2090]); // Delhi default
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    if (initialPos && (initialPos.lat !== markerPos[0] || initialPos.lon !== markerPos[1])) {
        setMarkerPos([initialPos.lat, initialPos.lon]);
    }
  }, [initialPos, markerPos]);

  const handleDetect = () => {
    if (!navigator.geolocation) {
      console.warn("[LocationPicker] navigator.geolocation not found on window object");
      alert("Geolocation is not supported by your browser. Please click directly on the map.");
      return;
    }

    setIsDetecting(true);

    const onCoordsSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setMarkerPos([latitude, longitude]);
      reverseGeocode(latitude, longitude, onLocationSelect, setIsDetecting);
    };

    navigator.geolocation.getCurrentPosition(
      onCoordsSuccess,
      (err) => {
        console.warn(`[LocationPicker] High accuracy GPS error (Code ${err.code}): ${err.message}. Retrying with standard accuracy...`);
        navigator.geolocation.getCurrentPosition(
          onCoordsSuccess,
          (fallbackErr) => {
            console.error(`[LocationPicker] Standard accuracy error (Code ${fallbackErr.code}): ${fallbackErr.message}`);
            setIsDetecting(false);
            if (fallbackErr.code === 1) {
              alert("Location permission was denied. Please click the lock icon in your browser address bar to allow location access.");
            } else if (fallbackErr.code === 2) {
              alert("Position unavailable. Please click directly on the map to set your worksite pin.");
            } else {
              alert("Location detection timed out. Please click directly on the map to set your worksite pin.");
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400 flex items-center gap-2">
          <MapPin className="w-3 h-3 text-secondary" />
          Precise Site Location
        </label>
        <button 
          type="button"
          onClick={handleDetect}
          disabled={isDetecting}
          className="flex items-center gap-2 bg-[#FACD15] text-[#0A1931] dark:text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {isDetecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
          Detect Location
        </button>
      </div>

      <div className="h-64 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-zinc-800 relative z-0 isolate shadow-inner">
        <MapContainer 
          center={markerPos} 
          zoom={13} 
          scrollWheelZoom={false} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={markerPos} />
          <MapEvents onLocationSelect={onLocationSelect} setMarkerPos={setMarkerPos} setIsDetecting={setIsDetecting} />
          <ChangeView center={markerPos} />
          <MapResizer />
        </MapContainer>
        
        {isDetecting && (
            <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-[2px] z-[1001] flex items-center justify-center">
                <div className="bg-white dark:bg-[#1C1C21] p-4 rounded-3xl shadow-2xl flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#0A1931] dark:text-white animate-spin" />
                    <span className="text-xs font-black text-[#0A1931] dark:text-white uppercase tracking-widest">Pinpointing...</span>
                </div>
            </div>
        )}
      </div>
      <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 italic px-2">
        Click on the map to drag the pin or use the detect button for high-precision GPS.
      </p>
    </div>
  );
}
