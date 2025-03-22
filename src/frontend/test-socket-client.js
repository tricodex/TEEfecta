// Simple Socket.IO client test
import { io } from 'socket.io-client';

// Set up the connection
const socket = io('http://localhost:3222', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to WebSocket server on port 3222!');
  console.log('Socket ID:', socket.id);
  
  // Subscribe to some events
  socket.emit('subscribe', { topic: 'agent_actions' });
  socket.emit('subscribe', { topic: 'agent_conversations' });
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
});

// Listen for events
socket.on('autonomous_started', (data) => {
  console.log('Autonomous trading started:', data);
});

socket.on('agent_thinking', (data) => {
  console.log('Agent thinking:', data);
});

socket.on('cycle_started', (data) => {
  console.log('Trading cycle started:', data);
});

socket.on('analysis_started', (data) => {
  console.log('Portfolio analysis started:', data);
});

socket.on('llm_prompt', (data) => {
  console.log('LLM Prompt:', data);
});

socket.on('llm_response', (data) => {
  console.log('LLM Response:', data);
});

socket.on('analysis_completed', (data) => {
  console.log('Analysis completed:', data);
});

socket.on('trade_started', (data) => {
  console.log('Trade execution started:', data);
});

socket.on('trade_completed', (data) => {
  console.log('Trade execution completed:', data);
});

socket.on('cycle_completed', (data) => {
  console.log('Trading cycle completed:', data);
});

// Generic event handler
socket.onAny((eventName, ...args) => {
  if (!['connect', 'disconnect', 'connect_error',
        'autonomous_started', 'agent_thinking', 'cycle_started',
        'analysis_started', 'llm_prompt', 'llm_response',
        'analysis_completed', 'trade_started', 'trade_completed',
        'cycle_completed'].includes(eventName)) {
    console.log(`Received event: ${eventName}`, args);
  }
});

console.log('Attempting to connect to WebSocket server...');

// Keep the script running
setInterval(() => {
  // Check connection status
  if (socket.connected) {
    console.log('Socket connection is active');
  } else {
    console.log('Socket connection is inactive, attempting to reconnect...');
    socket.connect();
  }
}, 10000);

// Exit after one minute if no events are received
setTimeout(() => {
  console.log('Test client exiting after timeout');
  process.exit(0);
}, 60000); 