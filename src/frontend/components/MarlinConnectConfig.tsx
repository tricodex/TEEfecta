import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  Heading, 
  Input, 
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import apiClient from '../services/ApiClient';
import { useWebSocket } from './WebSocketProvider';

/**
 * Component that allows changing the API and WebSocket connection to a Marlin CVM instance
 */
const MarlinConnectConfig: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [marlinIp, setMarlinIp] = useState<string>('');
  const [port, setPort] = useState<string>('3222');
  const toast = useToast();
  const { setSocketUrl } = useWebSocket();
  
  // Connect to the Marlin CVM
  const handleConnect = async () => {
    if (!marlinIp) {
      toast({
        title: 'IP Address Required',
        description: 'Please enter the Marlin CVM IP address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Format the URL
    const baseUrl = `http://${marlinIp}:${port}`;
    
    try {
      // Update the API client base URL
      apiClient.setBaseUrl(baseUrl);
      
      // Update the WebSocket URL
      setSocketUrl(baseUrl);
      
      // Test the connection
      const healthResponse = await apiClient.getHealth();
      
      toast({
        title: 'Connection Successful',
        description: `Connected to ${baseUrl} - ${healthResponse.status} (v${healthResponse.version})`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onClose();
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Marlin CVM',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Button 
        colorScheme="teal" 
        variant="outline" 
        size="sm" 
        onClick={onOpen}
      >
        Connect to Marlin CVM
      </Button>
      
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect to Marlin CVM</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Enter the Marlin CVM IP address to connect the frontend to your deployed backend.
            </Text>
            
            <FormControl mb={4}>
              <FormLabel>Marlin CVM IP Address</FormLabel>
              <Input 
                placeholder="123.45.67.89" 
                value={marlinIp}
                onChange={(e) => setMarlinIp(e.target.value)}
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Port</FormLabel>
              <Input 
                placeholder="3222" 
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="teal" onClick={handleConnect}>
              Connect
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default MarlinConnectConfig; 