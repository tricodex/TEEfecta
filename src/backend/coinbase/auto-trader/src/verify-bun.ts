// Simple Bun test
console.log('Testing Bun execution...');
console.log('Current environment variables:');
console.log(`USE_MOCK_SEARCH: ${process.env.USE_MOCK_SEARCH || 'unset'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'unset'}`);
console.log('Test completed');
