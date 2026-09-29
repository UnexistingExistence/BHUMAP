import { useEffect, useRef, useState, useCallback } from "react";

export interface WebSocketResult {
  isConnected: boolean;
  send: (msg: any) => void;
}

export function useWebSocket(
  url: string,
  onMessage?: (data: any) => void,
): WebSocketResult {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<any>(null);

  const connect = useCallback(() => {
    try {
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);

      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (e) {
          console.warn("[WebSocket] Non-JSON payload received:", event.data);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);

        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        setIsConnected(false);
      };
    } catch (err: any) {
      console.warn("[WebSocket] Init error:", err?.message);
      reconnectTimerRef.current = setTimeout(connect, 3000);
    }
  }, [url, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return { isConnected, send };
}
