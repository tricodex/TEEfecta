import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Heading,
  FormControl,
  FormLabel,
  Select,
  Button,
  Grid,
  GridItem,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Stack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';

// Define interfaces for assets and market data
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

// Define props for the component
interface TradeFormProps {
  assets: Asset[];
  marketData: MarketData[];
  onSubmit: (tradeData: {
    fromAsset: string;
    toAsset: string;
    amount: number;
    slippage: number;
  }) => void;
  isSubmitting: boolean;
  isConnected: boolean;
}

export const TradeForm: React.FC<TradeFormProps> = ({
  assets,
  marketData,
  onSubmit,
  isSubmitting,
  isConnected
}) => {
  // Trading form state
  const [tradeForm, setTradeForm] = useState({
    fromAsset: 'USDC',
    toAsset: 'ETH',
    amount: 100,
    slippage: 0.5
  });
  
  // Initialize form with available assets when assets change
  useEffect(() => {
    if (assets.length > 0 && marketData.length > 0) {
      setTradeForm(prev => ({
        ...prev,
        fromAsset: assets[0].symbol,
        toAsset: assets[0].symbol !== marketData[0].symbol 
          ? marketData[0].symbol 
          : (marketData.length > 1 ? marketData[1].symbol : marketData[0].symbol)
      }));
    }
  }, [assets, marketData]);
  
  // Handle form changes
  const handleFormChange = (
    field: string, 
    value: string | number
  ) => {
    setTradeForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = () => {
    onSubmit({
      fromAsset: tradeForm.fromAsset,
      toAsset: tradeForm.toAsset,
      amount: tradeForm.amount,
      slippage: tradeForm.slippage
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <Heading size="md">Execute Trade</Heading>
      </CardHeader>
      
      <CardBody>
        <Stack spacing={4}>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <GridItem>
              <FormControl isRequired>
                <FormLabel htmlFor="fromAsset">From Asset</FormLabel>
                <Select 
                  id="fromAsset"
                  aria-label="Select asset to trade from"
                  value={tradeForm.fromAsset}
                  onChange={(e) => handleFormChange('fromAsset', e.target.value)}
                >
                  {assets.map(asset => (
                    <option key={`from-${asset.symbol}`} value={asset.symbol}>
                      {asset.symbol} - {asset.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </GridItem>
            
            <GridItem>
              <FormControl isRequired>
                <FormLabel htmlFor="toAsset">To Asset</FormLabel>
                <Select 
                  id="toAsset"
                  aria-label="Select asset to trade to"
                  value={tradeForm.toAsset}
                  onChange={(e) => handleFormChange('toAsset', e.target.value)}
                >
                  {marketData
                    .filter(data => data.symbol !== tradeForm.fromAsset)
                    .map(data => (
                      <option key={`to-${data.symbol}`} value={data.symbol}>
                        {data.symbol}
                      </option>
                    ))}
                </Select>
              </FormControl>
            </GridItem>
          </Grid>
          
          <FormControl isRequired>
            <FormLabel htmlFor="amount">Amount to Trade</FormLabel>
            <NumberInput 
              id="amount"
              value={tradeForm.amount} 
              min={1}
              onChange={(valueString) => handleFormChange('amount', parseFloat(valueString))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          
          <FormControl>
            <FormLabel htmlFor="slippage">Max Slippage (%)</FormLabel>
            <NumberInput 
              id="slippage"
              value={tradeForm.slippage} 
              min={0.1} 
              max={5} 
              step={0.1}
              onChange={(valueString) => handleFormChange('slippage', parseFloat(valueString))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          
          <Button
            colorScheme="blue"
            isLoading={isSubmitting}
            loadingText="Submitting Trade"
            onClick={handleSubmit}
            isDisabled={!isConnected || isSubmitting}
          >
            Execute Trade
          </Button>
          
          {!isConnected && (
            <Alert status="warning" size="sm">
              <AlertIcon />
              WebSocket disconnected. Real-time updates unavailable.
            </Alert>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}; 