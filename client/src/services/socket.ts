import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** Connexion temps réel unique, authentifiée par le cookie de session. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: '/socket.io', withCredentials: true, transports: ['websocket', 'polling'], autoConnect: true });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
