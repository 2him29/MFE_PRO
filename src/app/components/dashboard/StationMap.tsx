import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station } from '../../types';
import { StatusChip } from './StatusChip';
import { Zap, Power } from 'lucide-react';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom marker icons based on status
const createCustomIcon = (status: Station['status']) => {
  const colors = {
    available: '#16a34a',
    charging: '#f59e0b',
    offline: '#6b7280',
    fault: '#dc2626',
  };

  const color = colors[status];

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg style="
          width: 16px;
          height: 16px;
          transform: rotate(45deg);
          fill: white;
        " viewBox="0 0 24 24">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Map bounds setter component
function MapBounds({ stations }: { stations: Station[] }) {
  const map = useMap();

  useEffect(() => {
    if (stations.length > 0) {
      const bounds = L.latLngBounds(
        stations.map((station) => [station.latitude, station.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }
  }, [stations, map]);

  return null;
}

interface StationMapProps {
  stations: Station[];
  height?: string;
}

export function StationMap({ stations, height = '600px' }: StationMapProps) {
  // Default center (Algeria center)
  const defaultCenter: [number, number] = [36.7538, 3.0588];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full rounded-lg overflow-hidden shadow-lg border border-gray-200"
      style={{ height }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds stations={stations} />
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={createCustomIcon(station.status)}
          >
            <Popup>
              <div className="p-2 min-w-[250px]">
                <h3 className="font-semibold text-base mb-2">{station.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <StatusChip status={station.status} type="station" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">City:</span>
                    <span className="font-medium">{station.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{station.connectorType}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-600" />
                    <span className="text-gray-600">Power:</span>
                    <span className="font-medium">{station.power} kW</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Power className="h-3 w-3 text-blue-600" />
                    <span className="text-gray-600">Connectors:</span>
                    <span className="font-medium">
                      {station.activeConnectors}/{station.totalConnectors} active
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">{station.address}</p>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </motion.div>
  );
}
