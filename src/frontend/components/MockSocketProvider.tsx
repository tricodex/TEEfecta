// DISABLED_MockSocketProvider.tsx - Not used in E2E testing
// Original mock provider preserved for reference only

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the socket context type
export type WebSocketContextType = {
  isConnected: boolean;
  events: any[];
  clearEvents: () => void;
  socket: any | null;
};

// Create the context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  events: [],
  clearEvents: () => {},
  socket: null
});

// Custom hook to use the WebSocket context
export const useWebSocket = () => useContext(WebSocketContext);

// Define props for the WebSocket provider component
interface MockSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  mockEvents?: any[];
}

// WebSocket provider component
export const MockSocketProvider: React.FC<MockSocketProviderProps> = ({ 
  children, 
  autoConnect = true,
  mockEvents = []
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(autoConnect);
  const [events, setEvents] = useState<any[]>(mockEvents);
  const [socket, setSocket] = useState<any | null>(null);

  // Setup mock event handler for custom events
  useEffect(() => {
    const handleSocketConnected = () => {
      setIsConnected(true);
    };
    
    const handleSocketDisconnected = () => {
      setIsConnected(false);
    };
    
    const handleMockEvent = (event: CustomEvent) => {
      if (event.detail) {
        setEvents(prev => [...prev, event.detail]);
      }
    };
    
    // Add event listeners
    window.addEventListener('socketConnected', handleSocketConnected);
    window.addEventListener('socketDisconnected', handleSocketDisconnected);
    window.addEventListener('mockSocketEvent', handleMockEvent as EventListener);
    
    // Mock socket object
    const mockSocket = {
      connected: autoConnect,
      emit: (event: string, data: any) => {
        console.log('Mock socket emit:', event, data);
        // Add the emitted event to the events array
        setEvents(prev => [...prev, { type: event, data, direction: 'outgoing' }]);
        return true;
      }
    };
    
    setSocket(mockSocket);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('socketConnected', handleSocketConnected);
      window.removeEventListener('socketDisconnected', handleSocketDisconnected);
      window.removeEventListener('mockSocketEvent', handleMockEvent as EventListener);
    };
  }, [autoConnect]);
  
  // Function to clear events
  const clearEvents = () => {
    setEvents([]);
  };
  
  // Provide the WebSocket context value to children
  return (
    <WebSocketContext.Provider value={{ isConnected, events, clearEvents, socket }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default MockSocketProvider; 