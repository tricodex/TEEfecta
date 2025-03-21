// Azure OpenAI integration
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.azure' });

// Azure OpenAI Configuration
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_API_INSTANCE_NAME = process.env.AZURE_OPENAI_API_INSTANCE_NAME || '';
const AZURE_OPENAI_API_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || 'gpt-4o';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2023-12-01-preview';

// Validate configuration
if (!AZURE_OPENAI_API_KEY) {
  console.error('Error: AZURE_OPENAI_API_KEY not set in environment');
}

if (!AZURE_OPENAI_API_INSTANCE_NAME) {
  console.error('Error: AZURE_OPENAI_API_INSTANCE_NAME not set in environment');
}

// Helper function to verify if a string is a valid URL
function isValidUrl(string: string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Get Azure OpenAI endpoint URL
export function getAzureOpenAIEndpoint(): string {
  // If the instance name looks like a full URL, use it directly
  if (isValidUrl(AZURE_OPENAI_API_INSTANCE_NAME)) {
    return AZURE_OPENAI_API_INSTANCE_NAME;
  }
  
  // Otherwise, construct the URL from the instance name
  return `https://${AZURE_OPENAI_API_INSTANCE_NAME}.openai.azure.com`;
}

// Initialize Azure OpenAI client with proper configuration
export function createAzureOpenAIClient(): OpenAIClient {
  const endpoint = getAzureOpenAIEndpoint();
  const credential = new AzureKeyCredential(AZURE_OPENAI_API_KEY);
  
  try {
    return new OpenAIClient(endpoint, credential, {
      apiVersion: AZURE_OPENAI_API_VERSION
    });
  } catch (error) {
    console.error('Error creating Azure OpenAI client:', error);
    throw new Error(`Failed to initialize Azure OpenAI client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Verify Azure OpenAI API connection
export async function verifyAzureOpenAIConnection(): Promise<boolean> {
  const endpoint = getAzureOpenAIEndpoint();
  console.log(`Verifying Azure OpenAI connection to: ${endpoint}`);
  console.log(`Using deployment: ${AZURE_OPENAI_API_DEPLOYMENT_NAME}`);
  console.log(`Using API version: ${AZURE_OPENAI_API_VERSION}`);
  
  try {
    // Try with a simple completion request to verify connection
    const client = createAzureOpenAIClient();
    
    // Simple test completion to check if the API is working
    const result = await client.getChatCompletions(
      AZURE_OPENAI_API_DEPLOYMENT_NAME,
      [{ role: 'user', content: 'Hello, this is a test.' }],
      { maxTokens: 5 }
    );
    
    if (result && result.choices && result.choices.length > 0) {
      console.log('Successfully connected to Azure OpenAI API');
      console.log(`Response: ${result.choices[0].message?.content}`);
      return true;
    }
    
    return false;
  } catch (sdkError) {
    console.warn(`SDK connection attempt failed: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`);
    
    // Fallback to direct REST API call as a backup verification method
    try {
      console.log('Attempting direct REST API verification...');
      const url = `${endpoint}/openai/deployments/${AZURE_OPENAI_API_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
      
      const response = await axios.post(
        url,
        {
          messages: [{ role: 'system', content: 'Hello' }],
          max_tokens: 5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_OPENAI_API_KEY
          }
        }
      );
      
      if (response.status === 200) {
        console.log('Successfully verified Azure OpenAI connection via REST API');
        return true;
      }
      
      return false;
    } catch (restError) {
      console.error('REST API verification also failed:', restError);
      if (axios.isAxiosError(restError) && restError.response) {
        console.error(`Status: ${restError.response.status}, Data:`, restError.response.data);
      }
      return false;
    }
  }
}

// Main API function to send a prompt to Azure OpenAI
export async function sendPromptToAzureOpenAI(
  prompt: string,
  systemMessage: string = 'You are a helpful AI assistant.'
): Promise<string> {
  try {
    const client = createAzureOpenAIClient();
    
    const result = await client.getChatCompletions(
      AZURE_OPENAI_API_DEPLOYMENT_NAME,
      [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ]
    );
    
    if (result.choices && result.choices.length > 0 && result.choices[0].message) {
      return result.choices[0].message.content || '';
    }
    
    throw new Error('No response content received from Azure OpenAI');
  } catch (error) {
    console.error('Error sending prompt to Azure OpenAI:', error);
    throw new Error(`Failed to get response from Azure OpenAI: ${error instanceof Error ? error.message : String(error)}`);
  }
} 