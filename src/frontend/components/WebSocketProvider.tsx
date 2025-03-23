import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../services/ApiClient'; // Import the API config

// Define the socket context type
export type WebSocketContextType = {
  isConnected: boolean;
  events: any[];
  clearEvents: () => void;
  socket: Socket | null;
  setSocketUrl: (url: string) => void;
};

// Create the context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  events: [],
  clearEvents: () => {},
  socket: null,
  setSocketUrl: () => {}
});

// Custom hook to use the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

// Define props for the WebSocket provider component
interface WebSocketProviderProps {
  children: ReactNode;
  initialUrl?: string;
}

// WebSocket provider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  initialUrl 
}) => {
  // Get the base URL from the API config, or use the initialUrl prop
  const defaultUrl = initialUrl || API_CONFIG.baseUrl;
  // Convert HTTP URL to WebSocket URL if needed
  const wsUrl = defaultUrl.replace(/^http/, 'ws') + '/ws';
  const [socketUrl, setSocketUrl] = useState<string>(wsUrl);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [events, setEvents] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Connect to the WebSocket server
  useEffect(() => {
    // Disconnect existing socket if there is one
    if (socket) {
      socket.disconnect();
    }

    console.log(`Connecting to WebSocket at: ${socketUrl}`);
    const newSocket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Event listeners for various events
    const eventTypes = [
      'llm_prompt',
      'trade_executed',
      'trade_failed',
      'portfolio_updated',
      'conversation_message_added'
    ];

    eventTypes.forEach(eventType => {
      newSocket.on(eventType, (data) => {
        console.log(`Received ${eventType} event:`, data);
        setEvents(prev => [...prev, { type: eventType, data, timestamp: new Date().toISOString() }]);
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [socketUrl]);

  // Function to clear events
  const clearEvents = () => {
    setEvents([]);
  };

  // Update socket URL method
  const updateSocketUrl = (url: string) => {
    console.log(`Changing WebSocket URL to: ${url}`);
    setSocketUrl(url);
  };

  // Provide the WebSocket context value to children
  return (
    <WebSocketContext.Provider 
      value={{ 
        isConnected, 
        events, 
        clearEvents, 
        socket,
        setSocketUrl: updateSocketUrl 
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider; 