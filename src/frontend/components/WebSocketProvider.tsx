import React from 'react';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// WebSocket context that provides socket and connection status
interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  events: Record<string, any[]>;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  events: {},
});

// Custom hook to use the WebSocket
export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // Get the backend URL from the environment or default to localhost:3222
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_BACKEND_HOST || window.location.hostname;
    const port = process.env.REACT_APP_BACKEND_PORT || '3222';
    
    // Connect to backend
    const socketUrl = `${protocol === 'wss:' ? 'https:' : 'http:'}//${host}:${port}`;
    console.log(`Connecting to WebSocket at ${socketUrl}`);
    
    const socketInstance = io(socketUrl, {
      path: '/ws',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Set up event handlers
    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    // Track events for display
    const eventTypes = [
      'llm_prompt', 'llm_response', 
      'llm_generation_started', 'llm_generation_completed',
      'autonomous_started', 'autonomous_stopped',
      'cycle_started', 'cycle_completed', 'cycle_error',
      'analysis_started', 'analysis_completed',
      'trade_started', 'trade_completed', 'no_trade_decision',
      'task_queued', 'task_started', 'task_completed', 'task_failed'
    ];

    eventTypes.forEach(eventType => {
      socketInstance.on(eventType, (data) => {
        console.log(`Received ${eventType} event:`, data);
        setEvents(prev => ({
          ...prev,
          [eventType]: [...(prev[eventType] || []), data]
        }));
      });
    });

    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      console.log('Disconnecting WebSocket');
      socketInstance.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, events }}>
      {children}
    </WebSocketContext.Provider>
  );
}; 