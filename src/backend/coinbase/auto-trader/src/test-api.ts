// Test script for the Auto Trader API
import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:3230';

// Test endpoints
const endpoints = [
  { name: 'health', url: '/health' },
  { name: 'apiHealth', url: '/api/health' },
  { name: 'wallet', url: '/api/wallet' },
  { name: 'agentWallet', url: '/api/agent/wallet' },
  { name: 'portfolio', url: '/api/portfolio' },
  { name: 'agentStatus', url: '/api/agent/status' }
];

// Test POST endpoints
const postEndpoints = [
  { 
    name: 'analyze', 
    url: '/api/analyze', 
    data: { 
      portfolio: { 
        assets: { 
          ETH: 2.5, 
          BTC: 0.15, 
          USDC: 5000 
        } 
      } 
    } 
  }
];

// Test functions
async function testEndpoint(endpoint: { name: string; url: string }) {
  console.log(`Testing endpoint: ${endpoint.name} (${endpoint.url})`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}${endpoint.url}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  console.log('---');
}

async function testPostEndpoint(endpoint: { name: string; url: string; data: any }) {
  console.log(`Testing POST endpoint: ${endpoint.name} (${endpoint.url})`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}${endpoint.url}`, endpoint.data);
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  console.log('---');
}

// Main test function
async function runTests() {
  console.log('Testing Auto Trader API endpoints...\n');
  
  console.log('Testing GET endpoints:');
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\nTesting POST endpoints:');
  for (const endpoint of postEndpoints) {
    await testPostEndpoint(endpoint);
  }
  
  console.log('\nAPI testing completed');
}

// Run tests
runTests(); 