// Script to verify frontend-backend alignment by testing API endpoints

import { exec } from 'child_process';
import fetch from 'node-fetch';

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const ENDPOINTS = [
  { path: '/api/health', method: 'GET' },
  { path: '/api/agent/status', method: 'GET' },
  { path: '/api/analyze', method: 'POST', 
    data: {
      portfolio: {
        tokens: [
          { symbol: 'ETH', balance: '0.5' },
          { symbol: 'USDC', balance: '1000' }
        ]
      },
      marketData: {
        tokens: [
          { symbol: 'ETH', price: '3000', change24h: '2.5' },
          { symbol: 'USDC', price: '1', change24h: '0' },
          { symbol: 'BTC', price: '60000', change24h: '-1.5' }
        ]
      }
    }
  },
  { path: '/api/recall', method: 'GET', 
    params: { type: 'portfolio-analysis', limit: 5 }
  },
  { path: '/api/attestation', method: 'GET' }
];

// Check if backend is running
async function checkBackendRunning() {
  try {
    console.log('Checking if backend is running...');
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log(`Backend is running: ${JSON.stringify(data)}`);
      return true;
    }
  } catch (error) {
    console.log('Backend is not running or not accessible');
    return false;
  }
  return false;
}

// Test endpoints
async function testEndpoint(endpoint) {
  const url = new URL(`${BACKEND_URL}${endpoint.path}`);
  
  // Add query params if they exist
  if (endpoint.params) {
    Object.keys(endpoint.params).forEach(key => {
      url.searchParams.append(key, endpoint.params[key]);
    });
  }
  
  try {
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add body for POST requests
    if (endpoint.method === 'POST' && endpoint.data) {
      options.body = JSON.stringify(endpoint.data);
    }
    
    console.log(`Testing ${endpoint.method} ${url.toString()}`);
    const response = await fetch(url.toString(), options);
    
    const status = response.status;
    let data = null;
    
    try {
      data = await response.json();
    } catch (error) {
      console.log('Response is not JSON');
    }
    
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: 'error',
      ok: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  const isRunning = await checkBackendRunning();
  
  if (!isRunning) {
    console.log('Please start the backend server before running this test');
    return;
  }
  
  console.log('Testing endpoints...');
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Print summary
  console.log('\n=== API Alignment Test Results ===');
  let passCount = 0;
  let failCount = 0;
  
  results.forEach(result => {
    if (result.ok) {
      console.log(`✅ ${result.method} ${result.endpoint} - Status: ${result.status}`);
      passCount++;
    } else {
      console.log(`❌ ${result.method} ${result.endpoint} - Status: ${result.status}`);
      console.log(`   Error: ${result.error || 'Endpoint returned error status'}`);
      failCount++;
    }
  });
  
  console.log('\n=== Summary ===');
  console.log(`Total endpoints tested: ${results.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n✅ Frontend and backend API are aligned!');
  } else {
    console.log('\n❌ Some endpoints failed. The frontend may not work correctly with the current backend.');
  }
}

main().catch(error => {
  console.error('Test failed with error:', error);
}); 