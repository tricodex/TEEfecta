import { Server as SocketIOServer, Socket } from 'socket.io';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';

/**
 * WebSocketService provides real-time communication for the auto-trader
 * using Socket.IO for compatibility with the frontend
 */
export class WebSocketService {
  private io: SocketIOServer | null = null;
  private clients: Map<string, Socket> = new Map();
  private isEnabled: boolean;
  
  constructor() {
    // Check if WebSockets are enabled in the configuration
    this.isEnabled = process.env.ENABLE_WEBSOCKETS === 'true';
    
    if (this.isEnabled) {
      console.log('WebSocket service initialized and ready to attach to server');
    } else {
      console.log('WebSocket service disabled by configuration');
    }
  }
  
  /**
   * Attach WebSocket server to an existing HTTP server
   * 
   * @param server - HTTP server to attach to
   */
  public attachToServer(server: http.Server): void {
    if (!this.isEnabled) {
      console.log('WebSocket service is disabled, skipping attachment');
      return;
    }
    
    try {
      this.io = new SocketIOServer(server, {
        cors: {
          origin: "*", // For development, allow all origins
          methods: ["GET", "POST"]
        }
      });
      
      console.log('Socket.IO server attached to HTTP server');
      
      this.io.on('connection', (socket: Socket) => {
        const clientId = socket.id;
        this.clients.set(clientId, socket);
        
        console.log(`WebSocket client connected: ${clientId}`);
        
        // Welcome message
        socket.emit('system', {
          message: 'Connected to 4g3n7 Auto Trader WebSocket server',
          clientId
        });
        
        // Broadcast connection event
        this.broadcast('client_connected', {
          clientId,
          timestamp: new Date().toISOString(),
          clientCount: this.clients.size
        });
        
        // Handle client disconnect
        socket.on('disconnect', () => {
          console.log(`WebSocket client disconnected: ${clientId}`);
          this.clients.delete(clientId);
          
          // Broadcast disconnection event
          this.broadcast('client_disconnected', {
            clientId,
            timestamp: new Date().toISOString(),
            clientCount: this.clients.size
          });
        });
        
        // Handle custom events
        socket.on('subscribe', (data) => {
          if (data && data.topic) {
            console.log(`Client ${clientId} subscribed to topic: ${data.topic}`);
            socket.join(data.topic);
            socket.emit('subscription_confirmed', { topic: data.topic });
          }
        });
        
        socket.on('unsubscribe', (data) => {
          if (data && data.topic) {
            console.log(`Client ${clientId} unsubscribed from topic: ${data.topic}`);
            socket.leave(data.topic);
            socket.emit('unsubscription_confirmed', { topic: data.topic });
          }
        });
      });
    } catch (error) {
      console.error(`Error initializing Socket.IO server: ${error}`);
    }
  }
  
  /**
   * Broadcast a message to all connected clients
   * 
   * @param eventType - Type of event
   * @param data - Event data
   */
  public broadcast(eventType: string, data: any): void {
    if (!this.isEnabled || !this.io) return;
    
    const event = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    };
    
    console.log(`Broadcasting ${eventType} event to ${this.clients.size} clients`);
    
    this.io.emit(eventType, event);
  }
  
  /**
   * Send a message to a specific client
   * 
   * @param clientId - ID of the client to send to
   * @param eventType - Type of event
   * @param data - Event data
   */
  public sendToClient(clientId: string, eventType: string, data: any): void {
    if (!this.isEnabled || !this.io) return;
    
    const client = this.clients.get(clientId);
    if (client) {
      const event = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };
      
      client.emit(eventType, event);
    }
  }
  
  /**
   * Get the number of connected clients
   */
  public getClientCount(): number {
    return this.clients.size;
  }
  
  /**
   * Check if WebSockets are enabled
   */
  public isWebSocketEnabled(): boolean {
    return this.isEnabled;
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

/**
 * Get the WebSocket service instance
 */
export function getWebSocketService(): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService();
  }
  
  return wsService;
} 