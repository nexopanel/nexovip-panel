import { api, subscribe, tickStats } from "@/lib/luffy/api";
import { useEffect, useReducer } from "react";

/**
 * Single reactive data hook for the panel. Subscribes to backend
 * mutations and drives the live-stats poller (~4s) that advances
 * CPU/memory/bandwidth metrics, mirroring LUFFY_PANEL's /stats.
 */
export function usePanelData() {
  const [, force] = useReducer((x: number) => x + 1, 0);

  // Re-render on any backend mutation (create/update/delete/login…)
  useEffect(() => subscribe(force), []);

  // Live telemetry tick
  useEffect(() => {
    const beat = () => {
      try {
        tickStats();
        force();
      } catch {
        /* db not ready yet */
      }
    };
    const id = setInterval(beat, 4000);
    return () => clearInterval(id);
  }, []);

  return {
    links: api.listLinks(),
    addresses: api.listAddresses(),
    stats: api.getStats(),
    notifications: [...api.notifications()].slice(0, 15),
    unreadCount: api.unreadCount(),
  };
}
