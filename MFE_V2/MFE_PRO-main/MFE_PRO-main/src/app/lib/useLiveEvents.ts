import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { API_BASE } from './api';

/**
 * Event payloads broadcast by the server. Keep these in sync with
 * `broadcastStationUpdate` / `broadcastAppSessionStarted` in server/src/index.ts.
 */
export type LiveEvent =
  | {
      type: 'station_status_update';
      stationId: string;
      status: string;
      stationName: string;
      tenantId: string | null;
      timestamp: string;
    }
  | {
      type: 'new_app_session';
      sessionId: string;
      stationId: string;
      stationName: string;
      tenantId: string;
      userEmail: string;
      userFullName: string;
      paymentMethod: string;
      estimatedCostDzd: number;
      timestamp: string;
    }
  | {
      type: 'new_app_ticket';
      ticketId: string;
      tenantId: string;
      stationId: string;
      stationName: string;
      title: string;
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      reporterName: string;
      description: string | null;
      timestamp: string;
    };

const WS_URL = (() => {
  const url = new URL(API_BASE);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  return url.toString();
})();

/**
 * Subscribes the page to the server's WebSocket broadcasts.
 *
 *   useLiveEvents()                  – show global toasts only
 *   useLiveEvents(cb)                – forward events to cb, no toast (the
 *                                      page already reacts to the event,
 *                                      avoiding duplicate notifications)
 *   useLiveEvents(undefined, tid)    – global toasts filtered to one tenant
 */
export function useLiveEvents(onEvent?: (e: LiveEvent) => void, tenantId?: string) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const silent = onEvent != null;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: number | null = null;
    let closed = false;

    const open = () => {
      ws = new WebSocket(WS_URL);

      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as LiveEvent;
          handlerRef.current?.(event);

          if (silent) return;

          // Apply tenant filter when the caller provided one
          const eventTenantId = (event as any).tenantId as string | null | undefined;
          if (tenantId && eventTenantId && eventTenantId !== tenantId) return;

          if (event.type === 'new_app_session') {
            toast.success(
              `${event.userFullName} started charging at ${event.stationName}`,
              {
                description:
                  `Payment: ${event.paymentMethod.replace('_', ' ')} · ` +
                  `est. ${event.estimatedCostDzd} DZD`,
              },
            );
          }
          if (event.type === 'station_status_update') {
            toast.info(`${event.stationName} → ${event.status}`);
          }
          if (event.type === 'new_app_ticket') {
            toast.warning(
              `New report — ${event.stationName}`,
              {
                description:
                  `${event.title}\nReported by ${event.reporterName} · ` +
                  `priority: ${event.priority}`,
              },
            );
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        if (closed) return;
        retryTimer = window.setTimeout(open, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    open();

    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      ws?.close();
    };
  }, [tenantId]);
}
