// WebSocket Test Script
import { io } from 'socket.io-client';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3222';
console.log(`Connecting to backend at: ${BACKEND_URL}`);

// Create WebSocket connection
const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Request a portfolio analysis to generate agent activity
  console.log('Requesting portfolio analysis...');
  
  fetch(`${BACKEND_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      portfolio: {
        walletAddress: '0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1',
        tokens: [
          { symbol: 'ETH', balance: '15.0', price: '3500.0' },
          { symbol: 'USDC', balance: '25000.0', price: '1.0' }
        ]
      },
      marketData: {
        tokens: [
          { symbol: 'ETH', price: '3500.0', change24h: '5.2' },
          { symbol: 'USDC', price: '1.0', change24h: '0.0' }
        ],
        trends: {
          bullish: ['ETH', 'BTC'],
          bearish: ['SOL']
        }
      }
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Portfolio analysis response:', data);
  })
  .catch(error => {
    console.error('Error requesting portfolio analysis:', error);
  });
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket server');
});

socket.on('error', (error) => {
  console.error('⚠️ WebSocket error:', error);
});

// Agent events
socket.on('llm_prompt', (data) => {
  console.log('📝 LLM Prompt:', truncate(data.prompt, 100));
});

socket.on('llm_response', (data) => {
  console.log('🤖 LLM Response:', truncate(data.response, 100));
});

socket.on('agent_thinking', (data) => {
  console.log('🤔 Agent thinking:', data.message);
});

// Analysis events
socket.on('analysis_started', (data) => {
  console.log('🔍 Analysis started for agent:', data.agentId);
});

socket.on('analysis_completed', (data) => {
  console.log('✅ Analysis completed for agent:', data.agentId);
  if (data.analysis?.summary) {
    console.log('  Summary:', data.analysis.summary);
  }
});

// Trade events
socket.on('trade_started', (data) => {
  const trade = data.tradeDetails;
  console.log(`💱 Trade started: ${trade?.tradeType} ${trade?.amount} ${trade?.fromAsset} to ${trade?.toAsset}`);
});

socket.on('trade_completed', (data) => {
  console.log('✅ Trade completed:', data.tradeResult?.success ? 'Success' : 'Failed');
  if (data.tradeResult?.message) {
    console.log('  Message:', data.tradeResult.message);
  }
});

// Catch all other events
socket.onAny((eventName, ...args) => {
  if (!['connect', 'disconnect', 'error', 'llm_prompt', 'llm_response', 'agent_thinking', 
        'analysis_started', 'analysis_completed', 'trade_started', 'trade_completed'].includes(eventName)) {
    console.log(`📢 Event: ${eventName}`, args[0]);
  }
});

// Helper function to truncate long strings
function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

// Keep the script running
console.log('WebSocket test client running. Press Ctrl+C to exit.');

// Display some instructions
console.log('\nTest instructions:');
console.log('1. Make sure the Auto Trader backend is running');
console.log('2. Watch for WebSocket events as they come in');
console.log('3. This script will automatically trigger a portfolio analysis');
console.log('4. You should see events for LLM prompts, responses, and actions'); 