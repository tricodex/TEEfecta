import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Heading,
  Stack,
  Box,
  Flex,
  Text,
  Badge
} from '@chakra-ui/react';

// Define types
interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

interface MarketDataCardProps {
  marketData: MarketData[];
}

export const MarketDataCard: React.FC<MarketDataCardProps> = ({ marketData }) => {
  return (
    <Card>
      <CardHeader>
        <Heading size="md">Market Data</Heading>
      </CardHeader>
      
      <CardBody>
        <Stack spacing={4}>
          {marketData.map(data => (
            <Box key={data.symbol} p={2} borderWidth="1px" borderRadius="md">
              <Flex justifyContent="space-between" mb={1}>
                <Text fontWeight="bold">{data.symbol}</Text>
                <Badge colorScheme={data.change24h >= 0 ? 'green' : 'red'}>
                  {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                </Badge>
              </Flex>
              <Text fontSize="xl" fontWeight="bold">
                ${data.price.toLocaleString()}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Volume: ${(data.volume24h / 1000000).toFixed(1)}M
              </Text>
            </Box>
          ))}
        </Stack>
      </CardBody>
    </Card>
  );
}; 