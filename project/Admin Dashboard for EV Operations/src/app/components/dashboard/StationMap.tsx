import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station } from '../../types';
import { StatusChip } from './StatusChip';
import {
  Zap,
  Power,
  Navigation,
  X,
  MapPin,
  Clock,
  ExternalLink,
  Layers,
  LocateFixed,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS: Record<Station['status'], string> = {
  available: '#16a34a',
  charging: '#f59e0b',
  offline: '#6b7280',
  fault: '#dc2626',
  maintenance: '#ea580c',
};

const STATUS_LABELS: Record<Station['status'], string> = {
  available: 'Available',
  charging: 'Charging',
  offline: 'Offline',
  fault: 'Fault',
  maintenance: 'Maintenance',
};

const OSRM_BASE_URL =
  ((import.meta as any).env?.VITE_OSRM_BASE_URL as string | undefined) ??
  'https://router.project-osrm.org';
const FALLBACK_AVG_SPEED_KMH = 55;
const ARRIVAL_THRESHOLD_KM = 0.2;

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }>;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function fmtFallbackEta(km: number): string {
  return formatDuration((km / FALLBACK_AVG_SPEED_KMH) * 3600);
}

function createStationIcon(status: Station['status'], highlighted: boolean) {
  const color = STATUS_COLORS[status];
  const size = highlighted ? 40 : 32;
  const shadow = highlighted
    ? `0 0 0 4px ${color}33, 0 6px 14px rgba(0,0,0,0.25)`
    : '0 3px 8px rgba(0,0,0,0.2)';
  const iconPx = Math.round(size * 0.44);
  return L.divIcon({
    className: 'custom-station-marker',
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:${shadow};display:flex;align-items:center;justify-content:center;"><svg style="width:${iconPx}px;height:${iconPx}px;transform:rotate(45deg);fill:white;" viewBox="0 0 24 24"><path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const techIcon = L.divIcon({
  className: 'tech-location-marker',
  html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;"><div class="tech-pulse-ring"></div><div style="width:16px;height:16px;background:#2563eb;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(37,99,235,0.5);position:relative;z-index:2;"></div></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ── Map child components ────────────────────────────────────────────────────

function InitialBounds({ stations }: { stations: Station[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || stations.length === 0) return;
    done.current = true;
    map.fitBounds(
      L.latLngBounds(stations.map((s) => [s.latitude, s.longitude] as [number, number])),
      { padding: [50, 50], maxZoom: 8 }
    );
  }, [map, stations]);
  return null;
}

function MapFly({ points, trigger }: { points: [number, number][]; trigger: number }) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;
  useEffect(() => {
    if (!trigger || pointsRef.current.length === 0) return;
    const pts = pointsRef.current;
    if (pts.length >= 2) {
      map.flyToBounds(L.latLngBounds(pts), {
        paddingTopLeft: [60, 80],
        paddingBottomRight: [320, 60],
        maxZoom: 12,
        duration: 1.4,
      } as L.FitBoundsOptions);
    } else {
      map.flyTo(pts[0], 13, { duration: 1.2 });
    }
  }, [trigger, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({ click: onMapClick });
  return null;
}

function MapInstanceCapture({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

// ── Main component ──────────────────────────────────────────────────────────

interface StationMapProps {
  stations: Station[];
  height?: string;
}

export function StationMap({ stations, height = '600px' }: StationMapProps) {
  const [selected, setSelected] = useState<Station | null>(null);
  const [navigating, setNavigating] = useState<Station | null>(null);
  const [arrived, setArrived] = useState(false);
  const [filters, setFilters] = useState<Set<Station['status']>>(
    () => new Set(Object.keys(STATUS_COLORS) as Station['status'][])
  );
  const [techPos, setTechPos] = useState<[number, number] | null>(null);
  const [geoUnavailable, setGeoUnavailable] = useState(false);
  const [flyPoints, setFlyPoints] = useState<[number, number][]>([]);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [mapStyle, setMapStyle] = useState<'road' | 'satellite'>('road');
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationSec, setRouteDurationSec] = useState<number | null>(null);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [routingFallback, setRoutingFallback] = useState(false);

  const routeAbortRef = useRef<AbortController | null>(null);
  const lastRouteFetchRef = useRef<{ at: number; origin: [number, number] | null }>({
    at: 0,
    origin: null,
  });
  const mapRef = useRef<L.Map | null>(null);
  const captureMap = useCallback((map: L.Map) => { mapRef.current = map; }, []);

  // ── Geolocation ──

  useEffect(() => {
    if (!navigator.geolocation) { setGeoUnavailable(true); return; }
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => { setTechPos([coords.latitude, coords.longitude]); setGeoUnavailable(false); },
      () => setGeoUnavailable(true),
      { enableHighAccuracy: true, timeout: 8000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ── Routing ──

  const clearRoute = useCallback(() => {
    setRoutePath([]);
    setRouteDistanceKm(null);
    setRouteDurationSec(null);
    setRoutingBusy(false);
    setRoutingFallback(false);
    routeAbortRef.current?.abort();
    routeAbortRef.current = null;
  }, []);

  const fetchRoadRoute = useCallback(async (origin: [number, number], station: Station) => {
    routeAbortRef.current?.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;
    setRoutingBusy(true);
    try {
      const coords = `${origin[1]},${origin[0]};${station.longitude},${station.latitude}`;
      const res = await fetch(
        `${OSRM_BASE_URL.replace(/\/$/, '')}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&alternatives=false`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as OsrmRouteResponse;
      const route = data.routes?.[0];
      if (data.code !== 'Ok' || !route?.geometry?.coordinates || route.geometry.coordinates.length < 2) {
        throw new Error('No valid road route');
      }
      setRoutePath(route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]));
      setRouteDistanceKm(typeof route.distance === 'number' ? Math.max(0.1, route.distance / 1000) : null);
      setRouteDurationSec(typeof route.duration === 'number' ? route.duration : null);
      setRoutingFallback(false);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setRoutePath([]);
      setRouteDistanceKm(null);
      setRouteDurationSec(null);
      setRoutingFallback(true);
    } finally {
      setRoutingBusy(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { routeAbortRef.current?.abort(); }, []);

  // Clear route when navigation ends
  useEffect(() => { if (!navigating) clearRoute(); }, [navigating, clearRoute]);

  // Arrival check + route re-fetch on position change
  useEffect(() => {
    if (!navigating || !techPos) return;

    // Arrival detection
    const dist = haversineKm(techPos[0], techPos[1], navigating.latitude, navigating.longitude);
    if (dist < ARRIVAL_THRESHOLD_KM) {
      setArrived(true);
      const t = setTimeout(() => { setNavigating(null); setArrived(false); }, 4000);
      return () => clearTimeout(t);
    }

    // Throttled re-fetch
    const now = Date.now();
    const lastOrigin = lastRouteFetchRef.current.origin;
    const movedKm = lastOrigin
      ? haversineKm(lastOrigin[0], lastOrigin[1], techPos[0], techPos[1])
      : Infinity;
    if (now - lastRouteFetchRef.current.at < 12000 && movedKm < 0.15) return;
    lastRouteFetchRef.current = { at: now, origin: techPos };
    void fetchRoadRoute(techPos, navigating);
  }, [navigating, techPos, fetchRoadRoute]);

  // ── Actions ──

  const toggleFilter = (s: Station['status']) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s) && next.size > 1) next.delete(s);
      else next.add(s);
      return next;
    });

  const startNavigation = (station: Station) => {
    setArrived(false);
    setNavigating(station);
    setRoutingFallback(false);
    const pts: [number, number][] = techPos
      ? [techPos, [station.latitude, station.longitude]]
      : [[station.latitude, station.longitude]];
    setFlyPoints(pts);
    setFlyTrigger((t) => t + 1);
    if (techPos) {
      lastRouteFetchRef.current = { at: Date.now(), origin: techPos };
      void fetchRoadRoute(techPos, station);
    } else {
      setRoutePath([]);
      setRouteDistanceKm(null);
      setRouteDurationSec(null);
    }
  };

  const locateMe = () => {
    if (techPos) mapRef.current?.flyTo(techPos, 15, { duration: 1 });
  };

  // ── Derived values ──

  const visible = stations.filter((s) => filters.has(s.status));
  const isFiltered = visible.length < stations.length;

  // Navigation banner: prefer OSRM data, fall back to haversine
  const navDist = navigating ? (routeDistanceKm ?? haversineKm(
    techPos?.[0] ?? navigating.latitude, techPos?.[1] ?? navigating.longitude,
    navigating.latitude, navigating.longitude
  )) : null;
  const navEta = routeDurationSec
    ? formatDuration(routeDurationSec)
    : navDist !== null && techPos ? fmtFallbackEta(navDist) : null;

  // Panel: use OSRM data when navigating to the selected station, else haversine
  const selDist = selected
    ? navigating?.id === selected.id && routeDistanceKm !== null
      ? routeDistanceKm
      : techPos ? haversineKm(techPos[0], techPos[1], selected.latitude, selected.longitude) : null
    : null;
  const selEta = selected
    ? navigating?.id === selected.id && routeDurationSec !== null
      ? formatDuration(routeDurationSec)
      : selDist !== null ? fmtFallbackEta(selDist) : null
    : null;

  const panelOpen = selected !== null;
  const rightOffset = panelOpen ? 316 : 12;

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-lg"
      style={{ height }}
    >
      {/* ── Status filter pills ── */}
      <div
        className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5"
        style={{ maxWidth: `calc(100% - ${rightOffset + 8}px)` }}
      >
        {(Object.entries(STATUS_COLORS) as [Station['status'], string][]).map(([s, color]) => (
          <button
            key={s}
            onClick={() => toggleFilter(s)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-white shadow-sm transition-opacity ${
              filters.has(s) ? 'opacity-100 border-gray-200' : 'opacity-35 border-gray-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            {STATUS_LABELS[s]}
            <span className="text-gray-400 font-normal ml-0.5">
              {stations.filter((st) => st.status === s).length}
            </span>
          </button>
        ))}
        {isFiltered && (
          <span className="text-[11px] text-gray-500 bg-white/90 px-2 py-1 rounded-full border border-gray-200 shadow-sm">
            {visible.length}/{stations.length} shown
          </span>
        )}
      </div>

      {/* ── Satellite / Road toggle ── */}
      <button
        type="button"
        onClick={() => setMapStyle((p) => (p === 'road' ? 'satellite' : 'road'))}
        className="absolute top-14 z-[1000] bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        style={{ right: rightOffset }}
      >
        <Layers className="h-3.5 w-3.5" />
        {mapStyle === 'road' ? 'Satellite' : 'Map'}
      </button>

      {/* ── Zoom + Locate controls ── */}
      <div
        className="absolute bottom-10 z-[1000] flex flex-col gap-1"
        style={{ right: rightOffset }}
      >
        <button
          onClick={locateMe}
          disabled={!techPos}
          title="Go to my location"
          className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LocateFixed className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          title="Zoom in"
          className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom out"
          className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Minus className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* ── Arrived banner (replaces nav banner on arrival) ── */}
      <AnimatePresence>
        {arrived && navigating && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="absolute top-3 z-[1002] bg-green-600 text-white rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3"
            style={{ right: rightOffset, maxWidth: 280 }}
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold">You have arrived!</p>
              <p className="text-[11px] text-green-200 mt-0.5 truncate">{navigating.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation banner ── */}
      <AnimatePresence>
        {navigating && !arrived && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="absolute top-3 z-[1002] bg-blue-600 text-white rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-3"
            style={{ right: rightOffset, maxWidth: 280 }}
          >
            <Navigation className="h-4 w-4 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-blue-200 uppercase tracking-wide leading-none">
                Navigating to
              </p>
              <p className="text-sm font-bold truncate mt-0.5">{navigating.name}</p>
              {navDist !== null && navEta !== null && !routingBusy && (
                <p className="text-[11px] text-blue-200 mt-0.5">
                  {navDist.toFixed(1)} km · {navEta}
                  {routingFallback && ' (est.)'}
                </p>
              )}
              {routingBusy && (
                <p className="text-[11px] text-blue-200 mt-0.5 animate-pulse">Calculating route…</p>
              )}
            </div>
            <button
              onClick={() => setNavigating(null)}
              className="shrink-0 hover:bg-blue-500 rounded-lg p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Geo unavailable badge ── */}
      {geoUnavailable && (
        <div className="absolute bottom-8 left-3 z-[1000] bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-400 flex items-center gap-1.5 shadow-sm">
          <MapPin className="h-3 w-3" />
          Location unavailable — distances hidden
        </div>
      )}

      {/* ── Station detail panel ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="absolute right-0 top-0 bottom-0 w-[300px] z-[1001] bg-white flex flex-col shadow-2xl border-l border-gray-100"
          >
            {/* Status accent bar */}
            <div style={{ height: 4, background: STATUS_COLORS[selected.status], flexShrink: 0 }} />

            {/* Header */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-mono">{selected.id}</p>
                  <h3 className="font-bold text-[15px] leading-snug mt-0.5 text-gray-900">
                    {selected.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 mt-1 hover:bg-gray-100 rounded-lg p-1.5 -mr-1 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              <div className="mt-2">
                <StatusChip status={selected.status} type="station" />
              </div>
            </div>

            <div className="h-px bg-gray-100 shrink-0" />

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Location */}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{selected.city}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{selected.address}</p>
                </div>
              </div>

              {/* Distance / ETA — uses OSRM when navigating to this station */}
              {selDist !== null ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-bold text-sm">{selDist.toFixed(1)} km</span>
                    <span className="text-xs text-blue-400">
                      {navigating?.id === selected.id && routeDistanceKm !== null ? 'by road' : 'away'}
                    </span>
                  </div>
                  {selEta && (
                    <div className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                      <Clock className="h-3 w-3" />
                      {selEta}
                    </div>
                  )}
                </div>
              ) : !geoUnavailable ? (
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-400">
                  <MapPin className="h-3 w-3" />
                  Acquiring your location…
                </div>
              ) : null}

              {/* Routing fallback warning */}
              {routingFallback && navigating?.id === selected.id && (
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
                  Road routing unavailable — showing estimated distance.
                </p>
              )}

              {/* Connectors */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Connectors
                </p>
                <div className="space-y-1.5">
                  {selected.connectors.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-mono px-1.5 py-0.5 rounded border font-semibold"
                          style={{
                            borderColor: c.type === 'CCS2' ? '#16a34a' : c.type === 'CHAdeMO' ? '#f59e0b' : '#3b82f6',
                            color: c.type === 'CCS2' ? '#16a34a' : c.type === 'CHAdeMO' ? '#f59e0b' : '#3b82f6',
                            backgroundColor: c.type === 'CCS2' ? '#f0fdf4' : c.type === 'CHAdeMO' ? '#fffbeb' : '#eff6ff',
                          }}
                        >
                          {c.type}
                        </span>
                        <span className="text-xs text-gray-400">×{c.count}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {c.powerKw} kW
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-gray-400 mb-1">Active</p>
                  <div className="flex items-center gap-1.5">
                    <Power className="h-3.5 w-3.5 text-blue-500" />
                    <span className="font-bold text-sm">
                      {selected.activeConnectors}/{selected.totalConnectors}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-[11px] text-gray-400 mb-1">Tariff</p>
                  <p className="font-bold text-sm">
                    {selected.currentTariff}{' '}
                    <span className="font-normal text-xs text-gray-400">DZD/kWh</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-100 space-y-2 shrink-0">
              {navigating?.id === selected.id ? (
                <Button
                  variant="outline"
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => setNavigating(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  End Navigation
                </Button>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => startNavigation(selected)}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate Here
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full text-gray-600"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${selected.latitude},${selected.longitude}${
                      techPos ? `&origin=${techPos[0]},${techPos[1]}` : ''
                    }`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Maps
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Leaflet map ── */}
      <MapContainer
        center={[36.7538, 3.0588]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        zoomControl={false}
      >
        {mapStyle === 'satellite' ? (
          <>
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
            />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png"
              subdomains="abcd"
              maxZoom={20}
            />
          </>
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        )}

        <InitialBounds stations={stations} />
        <MapFly points={flyPoints} trigger={flyTrigger} />
        <MapClickHandler onMapClick={() => setSelected(null)} />
        <MapInstanceCapture onMap={captureMap} />

        {techPos && <Marker position={techPos} icon={techIcon} zIndexOffset={2000} />}

        {navigating && techPos && (
          <Polyline
            positions={routePath.length > 1 ? routePath : [techPos, [navigating.latitude, navigating.longitude]]}
            pathOptions={{ color: '#2563eb', weight: 3, dashArray: '10, 8', opacity: 0.85, className: 'nav-route' }}
          />
        )}

        {visible.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={createStationIcon(
              station.status,
              selected?.id === station.id || navigating?.id === station.id
            )}
            eventHandlers={{
              click: (e) => { e.originalEvent?.stopPropagation(); setSelected(station); },
            }}
            zIndexOffset={selected?.id === station.id || navigating?.id === station.id ? 500 : 0}
          />
        ))}
      </MapContainer>
    </div>
  );
}
