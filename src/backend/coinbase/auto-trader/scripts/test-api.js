// Use ES modules for node-fetch v3
import fetch from 'node-fetch';

// Test the API endpoints
async function runTest() {
  console.log('Starting e2e test of Auto Trader APIs...');
  
  try {
    // 1. Check health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3222/health');
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    
    if (healthData.status !== 'healthy') {
      throw new Error('Health check failed');
    }
    
    // 2. Trigger portfolio analysis
    console.log('\n2. Testing portfolio analysis...');
    const analysisResponse = await fetch('http://localhost:3222/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        portfolio: {
          assets: {
            "ETH": { amount: 0.5, valueUSD: 1500 },
            "USDC": { amount: 1000, valueUSD: 1000 }
          },
          totalValueUSD: 2500
        },
        marketData: {
          "ETH": { "price": 3000, "change24h": 2.5 },
          "USDC": { "price": 1, "change24h": 0 },
          "BTC": { "price": 60000, "change24h": 1.2 }
        }
      }),
    });
    
    if (!analysisResponse.ok) {
      throw new Error(`Portfolio analysis failed with status: ${analysisResponse.status}`);
    }
    
    const analysisData = await analysisResponse.json();
    console.log('Portfolio analysis response:', analysisData);
    
    // 3. Wait to see if any trades are recommended
    console.log('\n3. Waiting for trading recommendation (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 4. Check agent status
    console.log('\n4. Checking agent status...');
    const statusResponse = await fetch('http://localhost:3222/api/agent/status');
    const statusData = await statusResponse.json();
    console.log('Agent status:', statusData);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest(); 