// Azure OpenAI LangChain integration (Mock implementation for testing)
import { ChatPromptTemplate } from "@langchain/core/prompts";

export interface AzureLangChainConfig {
  azureOpenAIApiKey: string;
  azureOpenAIApiInstanceName: string;
  azureOpenAIApiDeploymentName: string;
  azureOpenAIApiVersion: string;
}

/**
 * Mock AzureChatOpenAI implementation for testing
 */
class MockAzureChatOpenAI {
  constructor(config: any) {
    console.log('Initializing Mock AzureChatOpenAI with config:', {
      temperature: config.temperature,
      instanceName: config.azureOpenAIApiInstanceName,
      deploymentName: config.azureOpenAIApiDeploymentName,
      apiVersion: config.azureOpenAIApiVersion
    });
  }
  
  async invoke(messages: any) {
    console.log('Mock LLM invoked with messages:', messages);
    
    // Extract prompt from messages if available
    let prompt = '';
    if (Array.isArray(messages) && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.content) {
        prompt = lastMessage.content;
      }
    }
    
    // Generate a mock response based on the prompt
    let content: string;
    
    if (prompt.includes('portfolio') && prompt.includes('market')) {
      content = `
Based on the portfolio and market data analysis, here are my recommendations:

1. **Current Portfolio Assessment**:
   - Diversification: Your portfolio is currently concentrated in ETH and USDC, which limits diversification.
   - Risk Level: Medium risk exposure due to the significant ETH allocation (55% of portfolio value).

2. **Market Analysis**:
   - ETH shows positive momentum with a 3.2% 24h change, suggesting continued strength.
   - BTC is also showing positive movement but at a more modest 1.5% 24h change.
   - Overall market sentiment appears bullish in the short term.

3. **Recommendations**:
   - **Maintain ETH position**: The positive momentum suggests holding your current ETH allocation.
   - **Diversify with BTC**: Consider allocating 10-15% of portfolio to BTC given its stability.
   - **Maintain USDC reserve**: Keep 30-35% in USDC to capitalize on potential buying opportunities.
   - **Consider DeFi exposure**: Explore allocating 5-10% to top DeFi tokens for additional yield opportunities.

4. **Action Plan**:
   - Convert 10% of USDC position (500 USDC) to BTC at the current price.
   - Set stop-loss orders for ETH position at 10% below current price.
   - Review portfolio again in 7 days to assess strategy effectiveness.

This balanced approach maintains exposure to ETH's current uptrend while improving diversification and preserving buying power for future opportunities.
`;
    } else {
      content = "I'm a mock AI assistant. This is a simulated response for testing purposes.";
    }
    
    // Return a mock response
    return {
      id: `mock-response-${Date.now()}`,
      content,
      additional_kwargs: {},
      response_metadata: {
        tokenUsage: {
          completionTokens: 250,
          promptTokens: 150,
          totalTokens: 400
        },
        finish_reason: "stop"
      },
      tool_calls: [],
      invalid_tool_calls: [],
      usage_metadata: {
        input_tokens: 150,
        output_tokens: 250,
        total_tokens: 400
      }
    };
  }
}

/**
 * Set up Azure OpenAI with LangChain (mock implementation)
 */
export function setupLangChain(config: AzureLangChainConfig) {
  console.log('Setting up Mock Azure OpenAI with LangChain');
  
  // Initialize the mock LLM
  const llm = new MockAzureChatOpenAI({
    temperature: 0.2,
    azureOpenAIApiKey: config.azureOpenAIApiKey,
    azureOpenAIApiInstanceName: config.azureOpenAIApiInstanceName,
    azureOpenAIApiDeploymentName: config.azureOpenAIApiDeploymentName,
    azureOpenAIApiVersion: config.azureOpenAIApiVersion,
  });
  
  return llm;
}

/**
 * Create a trading analysis chain
 */
export function createTradingAnalysisChain(llm: MockAzureChatOpenAI) {
  // Define the prompt template
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert trading advisor. Analyze the portfolio and market data to provide trading recommendations. 
    Consider risk levels, market trends, and portfolio allocation.
    Present your analysis in a clear, structured format with specific recommendations.`],
    ["human", "Portfolio: {portfolio}\nMarket Data: {marketData}"]
  ]);
  
  // Create the chain (simplified mock implementation)
  return {
    invoke: async (input: any) => {
      // Format input with the prompt template
      const messages = await promptTemplate.formatMessages(input);
      
      // Pass formatted messages to the LLM
      return await llm.invoke(messages);
    }
  };
}