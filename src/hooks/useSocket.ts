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

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("[useSocket] Connected");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[useSocket] Disconnected");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
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
    const socketInstance = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("[useAdminSocket] Connected");
      setIsConnected(true);
      socketInstance.emit("join-admin");
    });

    socketInstance.on("disconnect", () => {
      console.log("[useAdminSocket] Disconnected");
      setIsConnected(false);
      setIsJoinedAdmin(false);
    });

    socketInstance.on("joined-admin", () => {
      console.log("[useAdminSocket] Joined admin room");
      setIsJoinedAdmin(true);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit("leave-admin");
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected, isJoinedAdmin };
}
