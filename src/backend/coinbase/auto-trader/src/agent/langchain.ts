// Azure OpenAI LangChain integration
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

export interface AzureLangChainConfig {
  azureOpenAIApiKey: string;
  azureOpenAIEndpoint?: string;
  azureOpenAIApiInstanceName?: string;
  azureOpenAIApiDeploymentName: string;
  azureOpenAIApiVersion?: string; // Made optional since we force 2023-12-01-preview
}

/**
 * Set up Azure OpenAI with LangChain
 * 
 * This implementation uses the standard ChatOpenAI with proper configuration for Azure
 * Using the configuration that was validated with a successful curl request
 * Critical: API version 2023-12-01-preview is required for this integration to work
 * The URL must include /chat in the path for chat completions
 */
export function setupLangChain(config: AzureLangChainConfig) {
  console.log('Setting up Azure OpenAI with LangChain');
  
  try {
    // Use the hard-coded working values as defaults but allow overrides
    const AZURE_API_KEY = config.azureOpenAIApiKey;
    const ENDPOINT = config.azureOpenAIEndpoint || 'https://patri-m8hiz8kb-eastus2.openai.azure.com';
    const DEPLOYMENT = config.azureOpenAIApiDeploymentName || 'gpt-4o';
    const API_VERSION = '2023-12-01-preview'; // Force this specific version that's confirmed working
    
    // Validate required inputs
    if (!AZURE_API_KEY) {
      throw new Error('Azure OpenAI API key is required');
    }
    
    if (!ENDPOINT) {
      throw new Error('Azure OpenAI endpoint is required');
    }
    
    if (!DEPLOYMENT) {
      throw new Error('Azure OpenAI deployment name is required');
    }
    
    // For debugging, show what configuration we're using
    console.log(`Using Azure OpenAI endpoint: ${ENDPOINT}`);
    console.log(`Using deployment name: ${DEPLOYMENT}`);
    console.log(`Using API version: ${API_VERSION} (forced)`);
    
    // The correct URL format for chat completions must include /chat/completions in the path
    const baseURL = `${ENDPOINT}/openai/deployments/${DEPLOYMENT}`;
    console.log(`Base URL: ${baseURL}`);
    
    // Initialize the LLM using the standard ChatOpenAI with Azure configuration
    // Matching exactly the settings from our successful curl request
    const llm = new ChatOpenAI({
      temperature: 0.7,
      modelName: DEPLOYMENT, 
      azureOpenAIApiKey: AZURE_API_KEY,
      azureOpenAIApiVersion: API_VERSION,
      azureOpenAIApiDeploymentName: DEPLOYMENT,
      azureOpenAIBasePath: ENDPOINT
    });
    
    // Make a test call to verify the connection
    console.log("Making a test call to Azure OpenAI to verify connection...");
    
    const testMessage = async () => {
      try {
        const response = await llm.invoke("Test connection: What is 1+1?");
        console.log("Connection test succeeded!");
        console.log(`Response: ${response.content}`);
        return true;
      } catch (testError) {
        console.error("Connection test failed:");
        console.error(testError);
        
        // Log detailed debugging info
        console.error("Attempting direct API call with fetch for debugging...");
        try {
          const url = `${ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': AZURE_API_KEY
            },
            body: JSON.stringify({
              messages: [
                {
                  role: "user",
                  content: "What is 1+1?"
                }
              ]
            })
          });
          
          const status = response.status;
          console.log(`Direct API call status: ${status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log("Direct API call succeeded:");
            console.log(data.choices[0].message.content);
            console.log("This indicates an issue with LangChain integration, not the API itself.");
          } else {
            const errorText = await response.text();
            console.error(`Direct API call failed with status ${status}:`);
            console.error(errorText);
          }
        } catch (fetchError) {
          console.error("Direct API call failed:");
          console.error(fetchError);
        }
        
        return false;
      }
    };
    
    // Execute test but don't wait for result to continue
    testMessage().then(success => {
      if (success) {
        console.log("Azure OpenAI integration is fully functional");
      } else {
        console.warn("Azure OpenAI integration may have issues - falling back to mock provider may be necessary");
      }
    });
    
    // Return the configured LLM
    return llm;
  } catch (error) {
    // Enhanced error reporting for debugging
    console.error('Error setting up Azure OpenAI with LangChain:');
    
    if (error instanceof Error) {
      console.error(`Name: ${error.name}`);
      console.error(`Message: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
      
      // Check for network errors
      if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
        console.error('Network error: Check your internet connection and endpoint URL');
      }
      
      // Check for auth errors
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.error('Authentication error: Check your API key');
      }
      
      // Check for resource not found
      if (error.message.includes('404') || error.message.includes('not found')) {
        console.error('Resource not found: Check your endpoint URL, deployment name, and API version');
        console.error('Ensure you are using API version 2023-12-01-preview which is required for this implementation');
      }
    } else {
      console.error(`Unknown error type: ${String(error)}`);
    }
    
    throw new Error(`Failed to initialize Azure OpenAI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a trading analysis chain
 */
export function createTradingAnalysisChain(llm: ChatOpenAI) {
  // Define the prompt template
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert trading advisor. Analyze the portfolio and market data to provide trading recommendations.
    Consider risk levels, market trends, and portfolio allocation.
    Present your analysis in a clear, structured format with specific recommendations.`],
    ["human", "Portfolio: {portfolio}\nMarket Data: {marketData}\nDate: {date}"]
  ]);
  
  // Add a StringOutputParser to handle the output correctly
  const parser = new StringOutputParser();
  
  // Create the chain with proper typing
  return RunnableSequence.from([
    {
      prompt: promptTemplate
    },
    {
      completion: llm
    },
    parser
  ]);
}