import React from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Heading,
  Box,
  Stack,
  Text,
  Divider,
  Button,
  Flex,
  Progress
} from '@chakra-ui/react';

// Define types for the analysis
interface PortfolioAnalysis {
  overview: string;
  opportunities: string[];
  risks: string[];
  recommendations: string[];
}

interface AnalysisCardProps {
  analysis: PortfolioAnalysis | null;
  isLoading: boolean;
  onAnalyze: () => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  analysis,
  isLoading,
  onAnalyze
}) => {
  return (
    <Card>
      <CardHeader>
        <Heading size="md">Portfolio Analysis</Heading>
      </CardHeader>
      
      <CardBody>
        {isLoading ? (
          <Box py={4}>
            <Text mb={2}>Running AI analysis...</Text>
            <Progress size="sm" isIndeterminate colorScheme="blue" />
          </Box>
        ) : analysis ? (
          <Stack spacing={4}>
            <Box>
              <Text fontWeight="medium" mb={2}>Overview</Text>
              <Text fontSize="sm">{analysis.overview}</Text>
            </Box>
            
            <Divider />
            
            <Box>
              <Text fontWeight="medium" mb={2}>Opportunities</Text>
              <Stack spacing={1}>
                {analysis.opportunities.map((item, i) => (
                  <Text key={`opp-${i}`} fontSize="sm">• {item}</Text>
                ))}
              </Stack>
            </Box>
            
            <Divider />
            
            <Box>
              <Text fontWeight="medium" mb={2}>Risks</Text>
              <Stack spacing={1}>
                {analysis.risks.map((item, i) => (
                  <Text key={`risk-${i}`} fontSize="sm">• {item}</Text>
                ))}
              </Stack>
            </Box>
            
            <Divider />
            
            <Box>
              <Text fontWeight="medium" mb={2}>Recommendations</Text>
              <Stack spacing={1}>
                {analysis.recommendations.map((item, i) => (
                  <Text key={`rec-${i}`} fontSize="sm">• {item}</Text>
                ))}
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Flex 
            direction="column" 
            alignItems="center" 
            justifyContent="center" 
            py={10}
            textAlign="center"
          >
            <Text mb={4}>Click "Analyze Portfolio" to generate AI-powered analysis</Text>
            <Button 
              size="sm" 
              colorScheme="blue" 
              onClick={onAnalyze}
            >
              Analyze Portfolio
            </Button>
          </Flex>
        )}
      </CardBody>
    </Card>
  );
}; 