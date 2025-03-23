import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  HStack, 
  Badge, 
  Select, 
  Input, 
  Button, 
  Flex, 
  Accordion, 
  AccordionItem, 
  AccordionButton, 
  AccordionPanel, 
  AccordionIcon,
  Code,
  Spinner,
  useToast
} from '@chakra-ui/react';

// Define types for memory entries
type MemoryEntry = {
  id: string;
  type: string;
  content: any;
  timestamp: string;
  agentId?: string;
  tags?: string[];
};

export function RecallMemoryViewer() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const toast = useToast();

  // Memory types based on what we know about the system
  const memoryTypes = [
    'all',
    'portfolio-analysis',
    'trade_analysis', 
    'trade_execution',
    'web_search',
    'coordinated-analysis',
    'coordinated-trade',
    'llm_prompt',
    'llm_response'
  ];

  // Simulate fetching memories on component mount
  useEffect(() => {
    fetchMemories();
  }, []);

  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [selectedType, searchTerm, memories]);

  // Function to fetch memories from the API
  const fetchMemories = async () => {
    setLoading(true);
    try {
      // In a real app, fetch from API instead of using mock data
      // const response = await fetch('/api/memories');
      // const data = await response.json();
      // setMemories(data.memories);
      
      // Mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockMemories = generateMockMemories();
      setMemories(mockMemories);
    } catch (error) {
      toast({
        title: 'Error fetching memories',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to the memories
  const applyFilters = () => {
    let filtered = [...memories];
    
    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(memory => memory.type === selectedType);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(memory => 
        memory.id.toLowerCase().includes(term) ||
        JSON.stringify(memory.content).toLowerCase().includes(term) ||
        (memory.agentId && memory.agentId.toLowerCase().includes(term)) ||
        (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    
    // Sort by timestamp (newest first)
    filtered = filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    setFilteredMemories(filtered);
  };
  
  // Generate color for memory type badge
  const getMemoryTypeColor = (type: string): string => {
    switch (type) {
      case 'portfolio-analysis': return 'blue';
      case 'trade_analysis': return 'purple';
      case 'trade_execution': return 'green';
      case 'web_search': return 'orange';
      case 'coordinated-analysis': return 'teal';
      case 'coordinated-trade': return 'cyan';
      case 'llm_prompt': return 'pink';
      case 'llm_response': return 'yellow';
      default: return 'gray';
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // Format content for display
  const formatContent = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    }
    try {
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return String(content);
    }
  };
  
  // Generate mock memory entries for demonstration
  const generateMockMemories = (): MemoryEntry[] => {
    return [
      {
        id: '247fe25b-975e-49f9-91e7-277c16bd11c9',
        type: 'portfolio-analysis',
        content: {
          portfolio: {
            assets: {
              ETH: { amount: 0.5, value: 1500 },
              USDC: { amount: 1000, value: 1000 }
            },
            totalValue: 2500,
            riskScore: 'medium'
          },
          recommendations: [
            'Consider diversifying beyond ETH',
            'Add BTC exposure for better diversification',
            'Maintain USDC as a reserve for opportunities'
          ]
        },
        timestamp: new Date(Date.now() - 300000).toISOString(),
        agentId: 'trading-agent-main',
        tags: ['analysis', 'portfolio']
      },
      {
        id: 'agentkit-analysis-77i',
        type: 'portfolio-analysis',
        content: {
          portfolio: {
            assets: {
              ETH: { amount: 0.5, value: 1500 },
              USDC: { amount: 1000, value: 1000 }
            },
            totalValue: 2500,
            riskScore: 'medium-high'
          },
          marketSentiment: 'bullish',
          recommendations: [
            'ETH showing strong momentum',
            'Consider increasing ETH allocation',
            'Use USDC to buy dips'
          ]
        },
        timestamp: new Date(Date.now() - 280000).toISOString(),
        agentId: 'trading-agent-agentkit',
        tags: ['analysis', 'portfolio', 'agentkit']
      },
      {
        id: '41991e13-6add-4139-9b8b-73670b892521',
        type: 'coordinated-analysis',
        content: {
          combinedAnalysis: {
            primaryAgent: '247fe25b-975e-49f9-91e7-277c16bd11c9',
            agentKitAgent: 'agentkit-analysis-77i',
            consensus: 'partial',
            finalRecommendation: 'Maintain current allocation but watch ETH for potential increase'
          }
        },
        timestamp: new Date(Date.now() - 260000).toISOString(),
        agentId: 'coordinated-agent',
        tags: ['analysis', 'portfolio', 'coordinated']
      },
      {
        id: '6d1ee063-d6e4-432c-9f30-fe1e56e43d94',
        type: 'trade_analysis',
        content: {
          tradeType: 'swap',
          fromAsset: 'ETH',
          toAsset: 'USDC',
          amount: 0.1,
          reasoning: 'Taking partial profits on ETH position after recent price increase',
          expectedValue: 300
        },
        timestamp: new Date(Date.now() - 200000).toISOString(),
        agentId: 'trading-agent-main',
        tags: ['trade', 'analysis']
      },
      {
        id: '8e0c1ad2-dd5e-4ca0-aac2-565a22678c81',
        type: 'trade_execution',
        content: {
          tradeId: 'e79efb2c',
          tradeType: 'swap',
          fromAsset: 'ETH',
          toAsset: 'USDC',
          amount: 0.1,
          executionPrice: 3050,
          executionTime: new Date(Date.now() - 150000).toISOString(),
          status: 'completed',
          hash: '0x8e311a70e8424b85b10c538a456335db'
        },
        timestamp: new Date(Date.now() - 150000).toISOString(),
        agentId: 'trading-agent-main',
        tags: ['trade', 'execution']
      },
      {
        id: '1b2e7392-1145-4bdb-ae47-29b75009313a',
        type: 'coordinated-trade',
        content: {
          primaryAgent: 'trading-agent-main',
          agentKitAgent: 'trading-agent-agentkit',
          agreementStatus: 'full',
          tradeId: 'e79efb2c',
          tradeSummary: 'Both agents agreed to swap 0.1 ETH to USDC to secure profits',
          executionResult: '8e0c1ad2-dd5e-4ca0-aac2-565a22678c81'
        },
        timestamp: new Date(Date.now() - 140000).toISOString(),
        agentId: 'coordinated-agent',
        tags: ['trade', 'execution', 'coordinated']
      }
    ];
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Recall Network Memory Explorer</Heading>
      
      {/* Filters */}
      <Flex mb={4} gap={4} flexDir={{ base: 'column', md: 'row' }}>
        <Select 
          value={selectedType} 
          onChange={(e) => setSelectedType(e.target.value)}
          width={{ base: '100%', md: '200px' }}
        >
          {memoryTypes.map(type => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </Select>
        
        <Input 
          placeholder="Search memories..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          flex={1}
        />
        
        <Button 
          onClick={fetchMemories} 
          isLoading={loading}
          loadingText="Fetching..."
          colorScheme="blue"
        >
          Refresh
        </Button>
      </Flex>
      
      {/* Memory list */}
      {loading ? (
        <Flex justify="center" align="center" height="300px">
          <VStack>
            <Spinner size="xl" color="blue.500" />
            <Text>Loading memory entries...</Text>
          </VStack>
        </Flex>
      ) : filteredMemories.length === 0 ? (
        <Box p={8} textAlign="center" bg="gray.50" borderRadius="md">
          <Text fontSize="lg">No memory entries found</Text>
          <Text color="gray.500">Try changing your filters or refresh</Text>
        </Box>
      ) : (
        <Accordion allowMultiple>
          {filteredMemories.map((memory) => (
            <AccordionItem key={memory.id} mb={2} borderWidth="1px" borderRadius="md">
              <h2>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Badge colorScheme={getMemoryTypeColor(memory.type)} fontSize="0.8em">
                        {memory.type}
                      </Badge>
                      <Text fontWeight="bold" fontSize="sm">{memory.id}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatTimestamp(memory.timestamp)}
                      </Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4} bg="gray.50">
                <VStack align="stretch" spacing={3}>
                  {memory.agentId && (
                    <HStack>
                      <Text fontWeight="bold">Agent:</Text>
                      <Text>{memory.agentId}</Text>
                    </HStack>
                  )}
                  
                  {memory.tags && memory.tags.length > 0 && (
                    <HStack>
                      <Text fontWeight="bold">Tags:</Text>
                      <HStack spacing={1}>
                        {memory.tags.map(tag => (
                          <Badge key={tag} colorScheme="gray">{tag}</Badge>
                        ))}
                      </HStack>
                    </HStack>
                  )}
                  
                  <Box>
                    <Text fontWeight="bold" mb={1}>Content:</Text>
                    <Code p={2} borderRadius="md" w="100%" display="block" whiteSpace="pre-wrap" fontSize="sm">
                      {formatContent(memory.content)}
                    </Code>
                  </Box>
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </Box>
  );
} 