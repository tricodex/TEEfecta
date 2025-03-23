import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, Heading, Button, Flex, Code, Spinner, useToast } from '@chakra-ui/react';
import ApiClient from '../ApiClient';

type PCRValue = {
  id: number;
  value: string;
  description: string;
  status: 'verified' | 'mismatch' | 'unknown';
};

type AttestationResult = {
  status: 'verified' | 'failed' | 'in_progress' | 'not_started';
  enclaveIP: string;
  timestamp: string;
  pcrValues: PCRValue[];
  digest: string;
  pcrsVerified: number;
  pcrsTotal: number;
  error?: string;
};

export function AttestationTerminal() {
  const [attestation, setAttestation] = useState<AttestationResult>({
    status: 'not_started',
    enclaveIP: '',
    timestamp: '',
    pcrValues: [],
    digest: '',
    pcrsVerified: 0,
    pcrsTotal: 0
  });
  
  const [loading, setLoading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Auto-scroll when terminal content changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [attestation]);

  // Function to start attestation verification process
  const verifyAttestation = async () => {
    setLoading(true);
    setAttestation({
      ...attestation,
      status: 'in_progress',
      timestamp: new Date().toISOString(),
    });

    // Use the real ApiClient to get attestation status
    try {
      const result = await ApiClient.getAttestationStatus();
      
      // Map API response to our component's state format
      setAttestation({
        status: result.status,
        enclaveIP: result.enclaveIP,
        timestamp: result.timestamp,
        pcrValues: result.pcrValues,
        digest: result.digest,
        pcrsVerified: result.pcrsVerified,
        pcrsTotal: result.pcrsTotal
      });
      
      if (result.status === 'verified') {
        toast({
          title: 'Attestation Verified',
          description: 'The CVM attestation has been successfully verified.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Attestation Failed',
          description: result.error || 'Failed to verify CVM attestation.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      setAttestation({
        ...attestation,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error during attestation verification',
      });
      
      toast({
        title: 'Attestation Failed',
        description: 'Failed to verify CVM attestation. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Terminal styling
  const terminalStyle = {
    bg: 'black',
    color: 'green.400',
    fontFamily: 'monospace',
    p: 4,
    borderRadius: 'md',
    height: '60vh',
    overflowY: 'auto',
    boxShadow: 'md',
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Attestation Verification Terminal</Heading>
      <Box {...terminalStyle} ref={terminalRef}>
        {attestation.status === 'not_started' && (
          <Text color="yellow.300">
            Attestation verification has not been started. Click "Verify Attestation" to begin.
          </Text>
        )}
        
        {attestation.status === 'in_progress' && (
          <>
            <Text color="blue.300">[{new Date().toLocaleTimeString()}] Starting attestation verification...</Text>
            <Text color="blue.300">[{new Date().toLocaleTimeString()}] Connecting to Marlin CVM Attestation Service...</Text>
            <Flex alignItems="center" mt={2}>
              <Spinner size="sm" color="blue.300" mr={2} />
              <Text color="blue.300">Verification in progress...</Text>
            </Flex>
          </>
        )}
        
        {attestation.status === 'verified' && (
          <>
            <Text color="green.300">[{new Date(attestation.timestamp).toLocaleTimeString()}] Attestation verification started</Text>
            <Text color="green.300">[{new Date(attestation.timestamp).toLocaleTimeString()}] Connected to enclave: {attestation.enclaveIP}</Text>
            <Text color="green.300">[{new Date(attestation.timestamp).toLocaleTimeString()}] Retrieving attestation from enclave...</Text>
            <Text color="green.300">[{new Date(attestation.timestamp).toLocaleTimeString()}] Verifying attestation against expected values...</Text>
            <Text color="yellow.300">User Data Digest: {attestation.digest}</Text>
            
            <Text color="white" mt={2}>PCR Values Verification:</Text>
            {attestation.pcrValues.map(pcr => (
              <Text key={pcr.id} color={pcr.status === 'verified' ? 'green.300' : 'red.300'}>
                PCR[{pcr.id}]: {pcr.value.substring(0, 10)}...{pcr.value.substring(pcr.value.length - 10)} - {pcr.description} - {pcr.status.toUpperCase()}
              </Text>
            ))}
            
            <Text color="green.300" mt={2} fontWeight="bold">
              ✓ Attestation verification successful! ({attestation.pcrsVerified}/{attestation.pcrsTotal} PCRs verified)
            </Text>
            
            <Text color="blue.300" mt={4}>
              This confirms the Auto Trader is running in a secure Marlin CVM environment with verified code integrity.
            </Text>
          </>
        )}
        
        {attestation.status === 'failed' && (
          <>
            <Text color="red.300">[{new Date(attestation.timestamp).toLocaleTimeString()}] Attestation verification failed</Text>
            <Text color="red.300">Error: {attestation.error}</Text>
            <Text color="yellow.300" mt={2}>
              Please check the enclave configuration and try again.
            </Text>
          </>
        )}
      </Box>
      
      <Flex mt={4} justifyContent="space-between">
        <Button
          onClick={verifyAttestation}
          isLoading={loading}
          loadingText="Verifying..."
          colorScheme="blue"
          isDisabled={attestation.status === 'in_progress'}
        >
          {attestation.status === 'verified' ? 'Re-verify Attestation' : 'Verify Attestation'}
        </Button>
        
        {attestation.status === 'verified' && (
          <Button colorScheme="green" variant="outline">
            Export Attestation Report
          </Button>
        )}
      </Flex>
    </Box>
  );
} 