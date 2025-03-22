import * as WebSocket from 'ws';
import * as http from 'http';
import { v4 as uuidv4 } from 'uuid';

/**
 * WebSocketService provides real-time communication for the auto-trader
 */
export class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
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
    
    const port = parseInt(process.env.WS_PORT || '3201', 10);
    
    try {
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws'
      });
      
      console.log(`WebSocket server attached to HTTP server on path /ws`);
      
      this.wss.on('connection', (ws: WebSocket) => {
        const clientId = uuidv4();
        const client = new WebSocketClient(clientId, ws);
        this.clients.set(clientId, client);
        
        console.log(`WebSocket client connected: ${clientId}`);
        
        // Welcome message
        client.send('system', {
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
        ws.on('close', () => {
          console.log(`WebSocket client disconnected: ${clientId}`);
          this.clients.delete(clientId);
          
          // Broadcast disconnection event
          this.broadcast('client_disconnected', {
            clientId,
            timestamp: new Date().toISOString(),
            clientCount: this.clients.size
          });
        });
        
        // Handle client messages (we don't expect many, but might be useful for subscriptions)
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message.toString());
            
            if (data.type === 'subscribe' && data.topic) {
              client.subscribeToTopic(data.topic);
              client.send('subscription_confirmed', { topic: data.topic });
            } else if (data.type === 'unsubscribe' && data.topic) {
              client.unsubscribeFromTopic(data.topic);
              client.send('unsubscription_confirmed', { topic: data.topic });
            }
          } catch (error) {
            console.error(`Error processing client message: ${error}`);
            client.send('error', { 
              message: 'Invalid message format',
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });
      });
    } catch (error) {
      console.error(`Error initializing WebSocket server: ${error}`);
    }
  }
  
  /**
   * Broadcast a message to all connected clients
   * 
   * @param eventType - Type of event
   * @param data - Event data
   */
  public broadcast(eventType: string, data: any): void {
    if (!this.isEnabled || !this.wss) return;
    
    const message = JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Broadcasting ${eventType} event to ${this.clients.size} clients`);
    
    this.clients.forEach(client => {
      if (client.shouldReceiveEvent(eventType)) {
        client.rawSend(message);
      }
    });
  }
  
  /**
   * Send a message to a specific client
   * 
   * @param clientId - ID of the client to send to
   * @param eventType - Type of event
   * @param data - Event data
   */
  public sendToClient(clientId: string, eventType: string, data: any): void {
    if (!this.isEnabled) return;
    
    const client = this.clients.get(clientId);
    if (client) {
      client.send(eventType, data);
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

/**
 * WebSocketClient represents a connected client
 */
class WebSocketClient {
  private id: string;
  private ws: WebSocket;
  private subscriptions: Set<string> = new Set(['all']); // Default subscription to all events
  
  constructor(id: string, ws: WebSocket) {
    this.id = id;
    this.ws = ws;
  }
  
  /**
   * Send a formatted message to the client
   * 
   * @param eventType - Type of event
   * @param data - Event data
   */
  public send(eventType: string, data: any): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      const message = JSON.stringify({
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      });
      
      this.ws.send(message);
    } catch (error) {
      console.error(`Error sending WebSocket message: ${error}`);
    }
  }
  
  /**
   * Send a raw message to the client
   * 
   * @param message - Message to send
   */
  public rawSend(message: string): void {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      this.ws.send(message);
    } catch (error) {
      console.error(`Error sending raw WebSocket message: ${error}`);
    }
  }
  
  /**
   * Subscribe to a topic
   * 
   * @param topic - Topic to subscribe to
   */
  public subscribeToTopic(topic: string): void {
    this.subscriptions.add(topic);
  }
  
  /**
   * Unsubscribe from a topic
   * 
   * @param topic - Topic to unsubscribe from
   */
  public unsubscribeFromTopic(topic: string): void {
    if (topic !== 'all') { // Don't allow unsubscribing from 'all'
      this.subscriptions.delete(topic);
    }
  }
  
  /**
   * Check if the client should receive an event
   * 
   * @param eventType - Type of event
   */
  public shouldReceiveEvent(eventType: string): boolean {
    return this.subscriptions.has('all') || this.subscriptions.has(eventType);
  }
  
  /**
   * Get the client ID
   */
  public getId(): string {
    return this.id;
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