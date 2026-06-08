import { useEffect, useRef, useCallback } from 'react';

export interface StationStatusUpdate {
  type: 'station_status_update';
  stationId: string;
  status: 'available' | 'occupied' | 'offline' | 'maintenance';
  stationName: string;
  timestamp: string;
}

/**
 * React hook that connects to the WebSocket server and calls
 * onStatusUpdate whenever a station changes status.
 *
 * Usage in any dashboard component:
 *
 *   useStationSocket((update) => {
 *     setStations(prev => prev.map(s =>
 *       s.id === update.stationId ? { ...s, status: update.status } : s
 *     ));
 *   });
 */
export function useStationSocket(
  onStatusUpdate: (update: StationStatusUpdate) => void
) {
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef  = useRef(onStatusUpdate);

  // Keep callback ref up to date without re-connecting
  callbackRef.current = onStatusUpdate;

  const connect = useCallback(() => {
    // ── Change this to your server IP ──────────────────────────────────────
    const WS_URL = 'ws://192.168.147.1:3001/ws';

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to station updates');
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StationStatusUpdate;
        if (data.type === 'station_status_update') {
          callbackRef.current(data);
        }
      } catch (e) {
        console.error('[WS] Failed to parse message', e);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Error', err);
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 5s...');
      reconnectRef.current = setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);
}
