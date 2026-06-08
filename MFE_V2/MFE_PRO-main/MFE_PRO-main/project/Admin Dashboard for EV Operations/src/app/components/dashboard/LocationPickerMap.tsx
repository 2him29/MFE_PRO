import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const pickerIcon = L.divIcon({
  className: 'custom-station-marker',
  html: `<div style="width:26px;height:26px;background:#2563eb;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 8px rgba(37,99,235,0.45);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

// Calls map.invalidateSize() once on mount so the map renders correctly
// inside a drawer/modal that was hidden during initialization.
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Flies the map to the picked position whenever coords change.
function FlyToPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prev = useRef('');
  useEffect(() => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.7 });
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

interface LocationPickerMapProps {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
}

export function LocationPickerMap({ lat, lng, onChange }: LocationPickerMapProps) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const hasPin = !isNaN(parsedLat) && !isNaN(parsedLng);

  const handlePick = (lat: number, lng: number) => {
    onChange(lat.toFixed(6), lng.toFixed(6));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Location</p>
        {hasPin ? (
          <span className="text-[11px] text-gray-400 font-mono">
            {parsedLat.toFixed(5)}, {parsedLng.toFixed(5)}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Click the map to place the station
          </span>
        )}
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-200 cursor-crosshair" style={{ height: 220 }}>
        <MapContainer
          center={[36.7538, 3.0588]}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <MapResizer />
          <ClickHandler onPick={handlePick} />
          {hasPin && (
            <>
              <FlyToPin lat={parsedLat} lng={parsedLng} />
              <Marker
                position={[parsedLat, parsedLng]}
                icon={pickerIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const pos = (e.target as L.Marker).getLatLng();
                    onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {hasPin && (
        <button
          type="button"
          onClick={() => onChange('', '')}
          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
        >
          Clear pin
        </button>
      )}
    </div>
  );
}
