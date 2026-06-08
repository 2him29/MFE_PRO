import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="
    background:#2563EB;width:28px;height:28px;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    border:3px solid white;box-shadow:0 3px 10px rgba(37,99,235,0.45);
  "></div>`,
  iconSize:   [28, 28],
  iconAnchor: [14, 28],
});

// Fly to marker whenever position changes
function FlyTo({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.6 }); }, [position, map]);
  return null;
}

// Place marker on map click
function ClickHandler({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPlace(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface LocationPickerProps {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
}

export function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const ALGERIA_CENTER: [number, number] = [28.0339, 1.6596];

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const position: [number, number] | null =
    !isNaN(parsedLat) && !isNaN(parsedLng) ? [parsedLat, parsedLng] : null;

  const handlePlace = (newLat: number, newLng: number) =>
    onChange(newLat.toFixed(6), newLng.toFixed(6));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-slate-700">Station Location</span>
        <span className="text-xs text-slate-400 ml-1">
          {position ? 'Drag the pin to adjust' : 'Click the map to place the station'}
        </span>
      </div>

      <div
        className="rounded-lg overflow-hidden border border-slate-200 shadow-sm"
        style={{ height: '230px' }}
      >
        <MapContainer
          center={ALGERIA_CENTER}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPlace={handlePlace} />
          {position && (
            <>
              <FlyTo position={position} />
              <Marker
                position={position}
                icon={PIN_ICON}
                draggable
                eventHandlers={{
                  dragend(e) {
                    const { lat: la, lng: lo } = (e.target as L.Marker).getLatLng();
                    onChange(la.toFixed(6), lo.toFixed(6));
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between px-1">
        {position ? (
          <>
            <span className="text-xs font-mono text-slate-500">
              {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
            </span>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              onClick={() => onChange('', '')}
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-xs text-slate-400 italic">No location selected</span>
        )}
      </div>
    </div>
  );
}
