const http = require('http');

// Test the health endpoint
function testHealthEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 8888,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Health endpoint response:');
      console.log(data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with health endpoint request: ${e.message}`);
  });

  req.end();
}

// Test the status endpoint
function testStatusEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 8888,
    path: '/status',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status endpoint response:');
      console.log(data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with status endpoint request: ${e.message}`);
  });

  req.end();
}

// Test the analyze endpoint
function testAnalyzeEndpoint() {
  const data = JSON.stringify({
    portfolio: {
      assets: [
        { symbol: "ETH", amount: 2.5, value: 6250 },
        { symbol: "USDC", amount: 5000, value: 5000 }
      ],
      total_value: 11250
    },
    marketData: {
      ETH: { price: 2500, "24h_change": 3.2 },
      BTC: { price: 45000, "24h_change": 1.5 },
      USDC: { price: 1, "24h_change": 0 }
    }
  });

  const options = {
    hostname: 'localhost',
    port: 8888,
    path: '/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('Analyze endpoint response:');
      console.log(responseData);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with analyze endpoint request: ${e.message}`);
  });

  req.write(data);
  req.end();
}

// Run all tests
console.log('Testing API endpoints...');
testHealthEndpoint();

// Wait a short time between requests
setTimeout(() => {
  testStatusEndpoint();
}, 1000);

setTimeout(() => {
  testAnalyzeEndpoint();
}, 2000);
