import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  useToast
} from '@chakra-ui/react';
import { useWebSocket } from './WebSocketProvider';
import apiClient from '../services/ApiClient';
import { PortfolioCard } from './trading/PortfolioCard';
import { TradeForm } from './trading/TradeForm';
import { MarketDataCard } from './trading/MarketDataCard';
import { AnalysisCard } from './trading/AnalysisCard';

// Define types for our component
interface Asset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change24h: number;
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface PortfolioAnalysis {
  overview: string;
  opportunities: string[];
  risks: string[];
  recommendations: string[];
}

export function TradingInterface() {
  // State management
  const [assets, setAssets] = useState<Asset[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToast();
  const { isConnected, events } = useWebSocket();
  
  // Load initial data
  useEffect(() => {
    loadPortfolioData();
    
    // Set up polling every minute
    const interval = setInterval(() => {
      loadPortfolioData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Listen for WebSocket events
  useEffect(() => {
    if (events && events.length > 0) {
      // Find trade-related events
      const tradeEvents = events.filter(event => 
        event.type === 'trade_executed' || 
        event.type === 'trade_failed' ||
        event.type === 'portfolio_updated'
      );
      
      // If we have new trade events, reload the portfolio data
      if (tradeEvents.length > 0) {
        loadPortfolioData();
      }
    }
  }, [events]);
  
  // Load portfolio and market data
  const loadPortfolioData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real application, we would fetch this data from our API
      // For now, we'll use mock data that matches our expected format
      
      // Mock assets data (in a real app, this would come from the API)
      const mockAssets: Asset[] = [
        { symbol: 'ETH', name: 'Ethereum', amount: 0.5, value: 1500, change24h: 2.3 },
        { symbol: 'USDC', name: 'USD Coin', amount: 1000, value: 1000, change24h: 0.01 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', amount: 0.01, value: 500, change24h: -1.2 },
      ];
      
      // Mock market data
      const mockMarketData: MarketData[] = [
        { symbol: 'ETH', price: 3000, change24h: 2.3, volume24h: 15000000 },
        { symbol: 'WBTC', price: 50000, change24h: -1.2, volume24h: 25000000 },
        { symbol: 'USDC', price: 1, change24h: 0.01, volume24h: 5000000 },
      ];
      
      setAssets(mockAssets);
      setMarketData(mockMarketData);
      
      // In a production environment, we would fetch the real data:
      // const portfolioResponse = await apiClient.getPortfolio();
      // setAssets(portfolioResponse.assets);
      // 
      // const marketResponse = await apiClient.getMarketData();
      // setMarketData(marketResponse.data);
      
    } catch (err) {
      console.error('Error loading portfolio data:', err);
      setError('Failed to load portfolio data. Please try again later.');
      
      toast({
        title: 'Data Loading Error',
        description: 'Could not load portfolio or market data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Execute trade
  const executeTrade = async (tradeData: {
    fromAsset: string;
    toAsset: string;
    amount: number;
    slippage: number;
  }) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // In a real app, this would call the trade endpoint
      const tradeRequest = {
        fromAsset: tradeData.fromAsset,
        toAsset: tradeData.toAsset,
        amount: tradeData.amount,
        slippage: tradeData.slippage
      };
      
      // Simulate API call
      // const response = await apiClient.executeTrade(tradeRequest);
      
      // For demo, we'll simulate a successful trade
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Trade Submitted',
        description: `Trading ${tradeData.amount} ${tradeData.fromAsset} for ${tradeData.toAsset}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
    } catch (err) {
      console.error('Error executing trade:', err);
      setError('Trade execution failed. Please try again.');
      
      toast({
        title: 'Trade Failed',
        description: 'Could not execute trade. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Analyze portfolio
  const analyzePortfolio = async () => {
    setAnalysisLoading(true);
    
    try {
      // This would be a real API call in production
      const analysisRequest = {
        portfolio: {
          assets: assets.map(asset => ({
            symbol: asset.symbol,
            amount: asset.amount
          }))
        },
        marketData: marketData.map(data => ({
          symbol: data.symbol,
          price: data.price,
          change24h: data.change24h
        }))
      };
      
      // In production: const result = await apiClient.analyzePortfolio(analysisRequest);
      
      // For demo, we'll use mock analysis data
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAnalysis = {
        overview: "Your portfolio is valued at approximately $3,000, consisting primarily of ETH (50%), USDC (33%), and a small amount of WBTC (17%). The portfolio shows a reasonable health status but lacks diversification.",
        opportunities: [
          "ETH is showing bullish momentum with a 2.3% increase in the last 24 hours",
          "Consider allocating some funds to other large-cap assets for better diversification"
        ],
        risks: [
          "Your portfolio is heavily concentrated in ETH, which exposes you to higher volatility",
          "BTC has decreased by 1.2% in the last 24 hours, indicating potential market uncertainty"
        ],
        recommendations: [
          "Consider rebalancing your portfolio to include more BTC",
          "Maintain a healthy stablecoin reserve for market opportunities",
          "Set up automatic dollar-cost averaging for regular investment"
        ]
      };
      
      setPortfolioAnalysis(mockAnalysis);
      
      toast({
        title: 'Portfolio Analysis Complete',
        description: 'Analysis has been generated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
    } catch (err) {
      console.error('Error analyzing portfolio:', err);
      
      toast({
        title: 'Analysis Failed',
        description: 'Could not complete portfolio analysis',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setAnalysisLoading(false);
    }
  };
  
  // Calculate total portfolio value
  const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  
  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="50vh">
        <Spinner size="xl" />
        <Text ml={4}>Loading trading data...</Text>
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <Heading size="md" mb={2}>Error Loading Data</Heading>
          <Text>{error}</Text>
          <Button mt={4} onClick={loadPortfolioData}>Retry</Button>
        </Box>
      </Alert>
    );
  }
  
  return (
    <Box p={4}>
      <Heading mb={6}>Trading Dashboard</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <PortfolioCard 
          assets={assets} 
          totalValue={totalPortfolioValue} 
          onAnalyze={analyzePortfolio}
          isAnalyzing={analysisLoading}
        />
        
        <TradeForm 
          assets={assets}
          marketData={marketData}
          onSubmit={executeTrade}
          isSubmitting={isSubmitting}
          isConnected={isConnected}
        />
      </SimpleGrid>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mt={6}>
        <MarketDataCard 
          marketData={marketData}
        />
        
        <AnalysisCard 
          analysis={portfolioAnalysis} 
          isLoading={analysisLoading}
          onAnalyze={analyzePortfolio}
        />
      </SimpleGrid>
    </Box>
  );
}