import { useEffect, useRef, useState, useCallback } from 'react';
import type { ScanStatus } from '../types';

export function useWebSocket() {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/scan/ws`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setStatus(data);
      } catch {}
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { status, connected };
}
