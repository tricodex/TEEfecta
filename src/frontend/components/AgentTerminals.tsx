import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, Flex, Heading, Container } from '@chakra-ui/react';
import { useWebSocket } from './WebSocketProvider';

// Define types for the different kinds of messages
type AgentConversation = {
  id: string;
  timestamp: string;
  type: 'prompt' | 'response';
  content: string;
  source?: string; // Which agent sent this
};

type AgentAction = {
  id: string;
  timestamp: string;
  type: string; // 'trade_started', 'analysis_completed', etc.
  description: string;
  details?: any;
};

export function AgentTerminals() {
  // States for the terminal content
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  
  // Refs for auto-scrolling
  const conversationsEndRef = useRef<HTMLDivElement>(null);
  const actionsEndRef = useRef<HTMLDivElement>(null);
  
  // Get WebSocket context
  const { socket, events, isConnected } = useWebSocket();
  
  // Terminal colors - using fixed values since useColorModeValue may not be available
  const bgColor = 'gray.100';
  const textColor = 'gray.800';
  const promptColor = 'green.600';
  const responseColor = 'blue.600';
  const timestampColor = 'gray.500';
  const borderColor = 'gray.300';
  
  // Auto-scroll when new content is added
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  useEffect(() => {
    scrollToBottom(conversationsEndRef);
  }, [conversations]);
  
  useEffect(() => {
    scrollToBottom(actionsEndRef);
  }, [actions]);
  
  // Handle WebSocket events for agent conversations
  useEffect(() => {
    if (!socket) return;
    
    const handleLLMPrompt = (data: any) => {
      setConversations(prev => [...prev, {
        id: data.id || `prompt-${Date.now()}`,
        timestamp: data.timestamp || new Date().toISOString(),
        type: 'prompt',
        content: data.prompt || data.message || data.content || 'No content available',
        source: data.source || data.agent || 'agent'
      }]);
    };
    
    const handleLLMResponse = (data: any) => {
      setConversations(prev => [...prev, {
        id: data.id || `response-${Date.now()}`,
        timestamp: data.timestamp || new Date().toISOString(),
        type: 'response',
        content: data.response || data.message || data.content || 'No content available',
        source: data.source || data.agent || 'agent'
      }]);
    };
    
    // Subscribe to events
    socket.on('llm_prompt', handleLLMPrompt);
    socket.on('llm_generation_started', handleLLMPrompt);
    socket.on('llm_response', handleLLMResponse);
    socket.on('llm_generation_completed', handleLLMResponse);
    
    // Clean up
    return () => {
      socket.off('llm_prompt', handleLLMPrompt);
      socket.off('llm_generation_started', handleLLMPrompt);
      socket.off('llm_response', handleLLMResponse);
      socket.off('llm_generation_completed', handleLLMResponse);
    };
  }, [socket]);
  
  // Handle WebSocket events for agent actions
  useEffect(() => {
    if (!socket) return;
    
    const handleAgentAction = (type: string) => (data: any) => {
      setActions(prev => [...prev, {
        id: data.id || `action-${Date.now()}`,
        timestamp: data.timestamp || new Date().toISOString(),
        type,
        description: getDescriptionForEvent(type, data),
        details: data
      }]);
    };
    
    // Subscribe to all relevant action events
    const actionEvents = [
      'autonomous_started', 'autonomous_stopped',
      'cycle_started', 'cycle_completed', 'cycle_error',
      'analysis_started', 'analysis_completed',
      'trade_started', 'trade_completed', 'no_trade_decision',
      'task_queued', 'task_started', 'task_completed', 'task_failed'
    ];
    
    // Register all event handlers
    actionEvents.forEach(eventType => {
      socket.on(eventType, handleAgentAction(eventType));
    });
    
    // Clean up
    return () => {
      actionEvents.forEach(eventType => {
        socket.off(eventType, handleAgentAction(eventType));
      });
    };
  }, [socket]);
  
  // Format ISO timestamp to readable time
  const formatTime = (isoTimestamp: string) => {
    try {
      const date = new Date(isoTimestamp);
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return 'Invalid time';
    }
  };
  
  // Get a human-readable description for an event type
  const getDescriptionForEvent = (type: string, data: any): string => {
    switch (type) {
      case 'autonomous_started':
        return 'Autonomous trading mode has been activated';
      case 'autonomous_stopped':
        return 'Autonomous trading mode has been deactivated';
      case 'cycle_started':
        return 'Starting a new trading cycle';
      case 'cycle_completed':
        return `Trading cycle completed ${data.cycleId ? `(ID: ${data.cycleId})` : ''}`;
      case 'cycle_error':
        return `Error in trading cycle: ${data.error || 'Unknown error'}`;
      case 'analysis_started':
        return 'Portfolio analysis started';
      case 'analysis_completed':
        return 'Portfolio analysis completed';
      case 'trade_started':
        return `Starting trade: ${data.fromAsset || ''} → ${data.toAsset || ''}`;
      case 'trade_completed':
        return `Completed trade: ${data.fromAsset || ''} → ${data.toAsset || ''}`;
      case 'no_trade_decision':
        return 'Agent decided not to execute a trade at this time';
      case 'task_queued':
        return `Task queued: ${data.task || data.type || 'Unknown'}`;
      case 'task_started':
        return `Task started: ${data.task || data.type || 'Unknown'}`;
      case 'task_completed':
        return `Task completed: ${data.task || data.type || 'Unknown'}`;
      case 'task_failed':
        return `Task failed: ${data.task || data.type || 'Unknown'} - ${data.error || 'Unknown error'}`;
      default:
        return `${type.replace(/_/g, ' ')}`;
    }
  };
  
  return (
    <Container maxWidth="container.xl" marginTop={5}>
      <Flex direction={{ base: 'column', lg: 'row' }} gap={4}>
        {/* Agent Conversations Terminal */}
        <Box 
          width={{ base: '100%', lg: '50%' }} 
          height="70vh" 
          bg={bgColor} 
          borderRadius="md" 
          border="1px solid" 
          borderColor={borderColor}
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Heading size="md" padding={2} borderBottom="1px solid" borderColor={borderColor}>
            Agent Conversations
            {isConnected ? (
              <Text as="span" color="green.500" fontSize="sm" marginLeft={2}>(Connected)</Text>
            ) : (
              <Text as="span" color="red.500" fontSize="sm" marginLeft={2}>(Disconnected)</Text>
            )}
          </Heading>
          
          <Box 
            padding={3} 
            overflowY="auto" 
            css={{
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: '#555', borderRadius: '4px' }
            }}
            flex="1"
          >
            {conversations.length === 0 ? (
              <Text color={timestampColor} fontStyle="italic">
                Waiting for agent conversations...
              </Text>
            ) : (
              conversations.map((item, index) => (
                <Box key={item.id || index} marginBottom={4}>
                  <Flex>
                    <Text color={item.type === 'prompt' ? promptColor : responseColor} fontWeight="bold">
                      {item.type === 'prompt' ? '🧠 Prompt' : '🤖 Response'}
                      {item.source && ` (${item.source})`}:
                    </Text>
                    <Text color={timestampColor} marginLeft="auto" fontSize="xs" marginTop={1}>
                      {formatTime(item.timestamp)}
                    </Text>
                  </Flex>
                  <Text whiteSpace="pre-wrap" color={textColor} fontFamily="monospace">
                    {item.content}
                  </Text>
                  {index < conversations.length - 1 && (
                    <Box height="1px" backgroundColor={borderColor} marginTop={2} />
                  )}
                </Box>
              ))
            )}
            <div ref={conversationsEndRef} />
          </Box>
        </Box>
        
        {/* Agent Actions Terminal */}
        <Box 
          width={{ base: '100%', lg: '50%' }} 
          height="70vh" 
          bg={bgColor} 
          borderRadius="md" 
          border="1px solid" 
          borderColor={borderColor}
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Heading size="md" padding={2} borderBottom="1px solid" borderColor={borderColor}>
            Agent Actions
            {isConnected ? (
              <Text as="span" color="green.500" fontSize="sm" marginLeft={2}>(Connected)</Text>
            ) : (
              <Text as="span" color="red.500" fontSize="sm" marginLeft={2}>(Disconnected)</Text>
            )}
          </Heading>
          
          <Box 
            padding={3} 
            overflowY="auto" 
            css={{
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: '#555', borderRadius: '4px' }
            }}
            flex="1"
          >
            {actions.length === 0 ? (
              <Text color={timestampColor} fontStyle="italic">
                Waiting for agent actions...
              </Text>
            ) : (
              actions.map((action, index) => (
                <Box key={action.id || index} marginBottom={2}>
                  <Flex alignItems="center">
                    <Text fontWeight="bold" color={getColorForActionType(action.type)}>
                      {getIconForActionType(action.type)} {action.description}
                    </Text>
                    <Text color={timestampColor} marginLeft="auto" fontSize="xs">
                      {formatTime(action.timestamp)}
                    </Text>
                  </Flex>
                  {action.details && action.details.message && (
                    <Text marginLeft={6} fontSize="sm" color={textColor} fontFamily="monospace">
                      {action.details.message}
                    </Text>
                  )}
                  {index < actions.length - 1 && (
                    <Box height="1px" backgroundColor={borderColor} marginTop={1} marginBottom={1} />
                  )}
                </Box>
              ))
            )}
            <div ref={actionsEndRef} />
          </Box>
        </Box>
      </Flex>
    </Container>
  );
}

// Helper function to get appropriate icon for action type
const getIconForActionType = (type: string): string => {
  if (type.includes('trade')) return '💱';
  if (type.includes('analysis')) return '📊';
  if (type.includes('cycle')) return '🔄';
  if (type.includes('task')) return '📋';
  if (type.includes('autonomous')) return '🤖';
  if (type.includes('error')) return '❌';
  return '🔹';
};

// Helper function to get appropriate color for action type
const getColorForActionType = (type: string): string => {
  if (type.includes('error') || type.includes('failed')) return 'red.500';
  if (type.includes('completed') || type.includes('success')) return 'green.500';
  if (type.includes('started')) return 'blue.500';
  if (type.includes('trade')) return 'purple.500';
  if (type.includes('analysis')) return 'cyan.500';
  return 'gray.500';
}; 