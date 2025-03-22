// Use ES modules
import { io } from 'socket.io-client';

// Connect to backend WebSocket
const socket = io('http://localhost:3222', {
  path: '/ws',
  transports: ['websocket'],
  reconnection: true,
});

console.log('Attempting to connect to WebSocket...');

// Set up event listeners
socket.on('connect', () => {
  console.log('WebSocket connected successfully!');
  console.log('Socket ID:', socket.id);
  
  // Once connected, start listening for events
  console.log('Listening for events...');
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected');
});

// Listen for various events
const eventTypes = [
  'llm_prompt', 'llm_response', 
  'llm_generation_started', 'llm_generation_completed',
  'autonomous_started', 'autonomous_stopped',
  'cycle_started', 'cycle_completed', 'cycle_error',
  'analysis_started', 'analysis_completed',
  'trade_started', 'trade_completed', 'no_trade_decision',
  'task_queued', 'task_started', 'task_completed', 'task_failed',
  'conversation_created', 'conversation_message_added'
];

// Track which events we've received
const receivedEvents = new Set();

eventTypes.forEach(eventType => {
  socket.on(eventType, (data) => {
    receivedEvents.add(eventType);
    console.log(`[${new Date().toISOString()}] Received ${eventType} event:`, JSON.stringify(data, null, 2));
  });
});

// Report status every 10 seconds
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Connection status: ${socket.connected ? 'Connected' : 'Disconnected'}`);
  console.log(`Received event types: ${Array.from(receivedEvents).join(', ') || 'None yet'}`);
}, 10000);

// Stay alive for 2 minutes to collect events
setTimeout(() => {
  console.log('Test completed, disconnecting...');
  socket.disconnect();
  console.log(`Final event types received: ${Array.from(receivedEvents).join(', ') || 'None'}`);
  process.exit(0);
}, 120000); 