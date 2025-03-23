import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Heading,
  Flex,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Spinner
} from '@chakra-ui/react';

// Define asset interface
interface Asset {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change24h: number;
}

// Define props for the component
interface PortfolioCardProps {
  assets: Asset[];
  totalValue: number;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({ 
  assets, 
  totalValue, 
  onAnalyze,
  isAnalyzing
}) => {
  return (
    <Card>
      <CardHeader>
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="md">Portfolio Overview</Heading>
          <Button 
            colorScheme="blue" 
            size="sm" 
            onClick={onAnalyze}
            isLoading={isAnalyzing}
          >
            Analyze Portfolio
          </Button>
        </Flex>
      </CardHeader>
      
      <CardBody>
        <Flex mb={6} wrap="wrap">
          <Stat mr={6} mb={4}>
            <StatLabel>Total Value</StatLabel>
            <StatNumber>${totalValue.toLocaleString()}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              1.2%
            </StatHelpText>
          </Stat>
          
          <Stat mr={6} mb={4}>
            <StatLabel>Assets</StatLabel>
            <StatNumber>{assets.length}</StatNumber>
          </Stat>
          
          <Stat mb={4}>
            <StatLabel>Last Updated</StatLabel>
            <StatNumber>
              <Text fontSize="md">
                {new Date().toLocaleTimeString()}
              </Text>
            </StatNumber>
          </Stat>
        </Flex>
        
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Asset</Th>
                <Th isNumeric>Amount</Th>
                <Th isNumeric>Value (USD)</Th>
                <Th isNumeric>24h Change</Th>
              </Tr>
            </Thead>
            <Tbody>
              {assets.map(asset => (
                <Tr key={asset.symbol}>
                  <Td>
                    <Flex alignItems="center">
                      <Text fontWeight="bold" mr={2}>{asset.symbol}</Text>
                      <Text color="gray.500" fontSize="sm">{asset.name}</Text>
                    </Flex>
                  </Td>
                  <Td isNumeric>{asset.amount.toLocaleString()}</Td>
                  <Td isNumeric>${asset.value.toLocaleString()}</Td>
                  <Td isNumeric>
                    <Text color={asset.change24h >= 0 ? 'green.500' : 'red.500'}>
                      {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </CardBody>
    </Card>
  );
}; 