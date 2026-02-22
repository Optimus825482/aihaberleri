/**
 * Socket.io React Hook
 *
 * Provides easy Socket.io integration for client components
 *
 * Usage:
 * ```tsx
 * const socket = useSocket();
 *
 * useEffect(() => {
 *   if (!socket) return;
 *
 *   socket.on('agent:started', (data) => {
 *     console.log('Agent started:', data);
 *   });
 *
 *   return () => {
 *     socket.off('agent:started');
 *   };
 * }, [socket]);
 * ```
 */

"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;
let sharedSocketRefCount = 0;
let sharedAdminSubscribers = 0;

function acquireSharedSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  sharedSocketRefCount++;
  return sharedSocket;
}

function releaseSharedSocket(): void {
  sharedSocketRefCount = Math.max(0, sharedSocketRefCount - 1);

  if (sharedSocketRefCount === 0 && sharedSocket) {
    if (sharedAdminSubscribers > 0 && sharedSocket.connected) {
      sharedSocket.emit("leave-admin");
    }
    sharedAdminSubscribers = 0;
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = acquireSharedSocket();
    setIsConnected(socketInstance.connected);

    const onConnect = () => {
      console.log("[useSocket] Connected");
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log("[useSocket] Disconnected");
      setIsConnected(false);
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    setSocket(socketInstance);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      releaseSharedSocket();
    };
  }, []);

  return { socket, isConnected };
}

/**
 * Hook specifically for admin room
 */
export function useAdminSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoinedAdmin, setIsJoinedAdmin] = useState(false);

  useEffect(() => {
    const socketInstance = acquireSharedSocket();
    sharedAdminSubscribers++;
    setIsConnected(socketInstance.connected);

    const onConnect = () => {
      console.log("[useAdminSocket] Connected");
      setIsConnected(true);
      socketInstance.emit("join-admin");
    };

    const onDisconnect = () => {
      console.log("[useAdminSocket] Disconnected");
      setIsConnected(false);
      setIsJoinedAdmin(false);
    };

    const onJoinedAdmin = () => {
      console.log("[useAdminSocket] Joined admin room");
      setIsJoinedAdmin(true);
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("joined-admin", onJoinedAdmin);

    if (socketInstance.connected) {
      socketInstance.emit("join-admin");
    }

    setSocket(socketInstance);

    return () => {
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("joined-admin", onJoinedAdmin);

      sharedAdminSubscribers = Math.max(0, sharedAdminSubscribers - 1);
      if (sharedAdminSubscribers === 0 && socketInstance.connected) {
        socketInstance.emit("leave-admin");
      }

      releaseSharedSocket();
    };
  }, []);

  return { socket, isConnected, isJoinedAdmin };
}
