import React from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import our components
import { Dashboard } from './components/DashboardLayout';
import { TradingInterface } from './components/TradingInterface';
import { WebSocketProvider } from './components/WebSocketProvider';

// Customize Chakra theme
const theme = extendTheme({
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#b3e0ff',
      200: '#80caff',
      300: '#4db3ff',
      400: '#1a9eff',
      500: '#0088e6',
      600: '#0066b3',
      700: '#004480',
      800: '#00224d',
      900: '#00111a',
    },
  },
  fonts: {
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});

export function App() {
  return (
    <ChakraProvider theme={theme}>
      <WebSocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trade" element={<TradingInterface />} />
            {/* Add more routes as needed */}
          </Routes>
        </Router>
      </WebSocketProvider>
    </ChakraProvider>
  );
}

export default App; 