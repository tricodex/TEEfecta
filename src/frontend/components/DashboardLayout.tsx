import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  GridItem, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Flex,
  Heading,
  Text,
  HStack,
  Badge,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tooltip,
  useToast,
  Spacer
} from '@chakra-ui/react';

// Import our components
import { AgentTerminals } from './AgentTerminals';
import { RecallMemoryViewer } from './RecallMemoryViewer';
import { AttestationTerminal } from './AttestationTerminal';
import { WebSocketProvider, useWebSocket } from './WebSocketProvider';
import apiClient from '../services/ApiClient';
import MarlinConnectConfig from './MarlinConnectConfig';

export function DashboardLayout() {
  const [agentStatus, setAgentStatus] = useState<{
    status: string;
    type: string;
    walletAddress?: string;
  } | null>(null);
  
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    version: string;
  } | null>(null);
  
  const [isApiError, setIsApiError] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Access WebSocket context
  const { isConnected } = useWebSocket();
  
  // Fetch initial data on component mount
  useEffect(() => {
    fetchAgentStatus();
    fetchHealthStatus();
    
    // Set up polling for status updates every 30 seconds
    const statusInterval = setInterval(() => {
      fetchAgentStatus();
      fetchHealthStatus();
    }, 30000);
    
    return () => clearInterval(statusInterval);
  }, []);
  
  // Fetch agent status
  const fetchAgentStatus = async () => {
    try {
      const response = await apiClient.getAgentStatus();
      setAgentStatus(response);
      setIsApiError(false);
    } catch (error) {
      console.error('Error fetching agent status:', error);
      setIsApiError(true);
      
      // Only show toast on first error
      if (!isApiError) {
        toast({
          title: 'API Connection Error',
          description: 'Failed to connect to Auto Trader API. Check backend server status.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };
  
  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const response = await apiClient.getHealth();
      setHealthStatus(response);
      setIsApiError(false);
    } catch (error) {
      console.error('Error fetching health status:', error);
      setIsApiError(true);
    }
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'operational':
      case 'connected':
        return 'green';
      case 'degraded':
      case 'partial':
        return 'yellow';
      case 'maintenance':
        return 'blue';
      case 'unavailable':
      case 'disconnected':
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  // Get agent type display
  const getAgentTypeDisplay = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'standard':
        return 'Standard Trading Agent';
      case 'agentkit':
        return 'AgentKit Trading Agent';
      case 'coordinated':
        return 'Coordinated Trading Agents';
      default:
        return type || 'Unknown';
    }
  };
  
  return (
    <Box p={4}>
      {/* Header with status indicators */}
      <Flex 
        justifyContent="space-between" 
        alignItems="center" 
        mb={6} 
        pb={3} 
        borderBottomWidth="1px"
      >
        <Box>
          <Heading size="lg">4g3n7 Auto Trader</Heading>
          <Text color="gray.500">Coordinated AI Trading Agents with Transparent Memory</Text>
        </Box>
        
        <HStack spacing={4}>
          {/* API Status */}
          <Tooltip label={isApiError ? 'API Unavailable' : 'API Connected'}>
            <Badge 
              colorScheme={isApiError ? 'red' : 'green'} 
              p={2} 
              borderRadius="md"
            >
              API: {isApiError ? 'Unavailable' : 'Connected'}
            </Badge>
          </Tooltip>
          
          {/* WebSocket Status */}
          <Tooltip label={isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}>
            <Badge 
              colorScheme={isConnected ? 'green' : 'red'} 
              p={2} 
              borderRadius="md"
            >
              WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Tooltip>
          
          {/* Agent Status */}
          {agentStatus && (
            <Tooltip label={`Agent is ${agentStatus.status}`}>
              <Badge 
                colorScheme={getStatusColor(agentStatus.status)} 
                p={2} 
                borderRadius="md"
              >
                Agent: {agentStatus.status}
              </Badge>
            </Tooltip>
          )}
          
          {/* Version Info */}
          {healthStatus && (
            <Tooltip label={`Backend v${healthStatus.version}`}>
              <Badge p={2} borderRadius="md" variant="outline">
                v{healthStatus.version}
              </Badge>
            </Tooltip>
          )}
          
          {/* Marlin CVM Connect Button */}
          <MarlinConnectConfig />
          
          {/* System Info Button */}
          <Button size="sm" onClick={onOpen} colorScheme="blue" variant="outline">
            System Info
          </Button>
        </HStack>
      </Flex>
      
      {/* Main dashboard with tabs for different views */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Agent Terminals</Tab>
          <Tab>Recall Memory</Tab>
          <Tab>Attestation</Tab>
        </TabList>
        
        <TabPanels>
          {/* Agent Terminals Panel */}
          <TabPanel>
            <Box>
              <AgentTerminals />
            </Box>
          </TabPanel>
          
          {/* Recall Memory Panel */}
          <TabPanel>
            <Box>
              <RecallMemoryViewer />
            </Box>
          </TabPanel>
          
          {/* Attestation Panel */}
          <TabPanel>
            <Box>
              <AttestationTerminal />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* System Info Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>System Information</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <Text fontWeight="bold">Agent Type:</Text>
              </GridItem>
              <GridItem>
                <Text>{agentStatus ? getAgentTypeDisplay(agentStatus.type) : 'Unknown'}</Text>
              </GridItem>
              
              <GridItem>
                <Text fontWeight="bold">Wallet Address:</Text>
              </GridItem>
              <GridItem>
                <Text>{agentStatus?.walletAddress || 'Not available'}</Text>
              </GridItem>
              
              <GridItem>
                <Text fontWeight="bold">API Status:</Text>
              </GridItem>
              <GridItem>
                <Badge colorScheme={healthStatus ? getStatusColor(healthStatus.status) : 'gray'}>
                  {healthStatus?.status || 'Unknown'}
                </Badge>
              </GridItem>
              
              <GridItem>
                <Text fontWeight="bold">WebSocket:</Text>
              </GridItem>
              <GridItem>
                <Badge colorScheme={isConnected ? 'green' : 'red'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </GridItem>
              
              <GridItem>
                <Text fontWeight="bold">Server Version:</Text>
              </GridItem>
              <GridItem>
                <Text>{healthStatus?.version || 'Unknown'}</Text>
              </GridItem>
              
              <GridItem>
                <Text fontWeight="bold">Running in CVM:</Text>
              </GridItem>
              <GridItem>
                <Badge colorScheme="purple">Yes - Marlin Oyster CVM</Badge>
              </GridItem>
              
              <GridItem>
                <Text fontWeight="bold">Recall Network:</Text>
              </GridItem>
              <GridItem>
                <Badge colorScheme="blue">Connected - 24 Memory Entries</Badge>
              </GridItem>
            </Grid>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export function Dashboard() {
  return (
    <WebSocketProvider>
      <DashboardLayout />
    </WebSocketProvider>
  );
} 