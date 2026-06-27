import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// Singleton — una sola conexión para toda la vida de la pestaña
let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io({ path: '/socket.io' });
  }
  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

type EventMap = Record<string, (data: unknown) => void>;

/**
 * Registra handlers de eventos Socket.IO mientras el componente está montado.
 * La conexión es un singleton: no se reconecta al navegar entre páginas.
 */
export function useSocket(events: EventMap) {
  useEffect(() => {
    const socket = getSocket();
    const entries = Object.entries(events);
    entries.forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      entries.forEach(([event, handler]) => socket.off(event, handler));
    };
    // handlers son estables si se definen con useCallback o dentro del efecto del caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
