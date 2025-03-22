// Google Generative AI (Gemini) integration with LangChain
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Setup LangChain with Google Generative AI (Gemini)
 * @param config Google API key and optional model configuration
 * @returns LangChain model instance
 */
export function setupGeminiLangChain(config: GeminiConfig) {
  // Validate config
  if (!config.apiKey) {
    throw new Error("Google Generative AI API key is required");
  }
  
  // Initialize Gemini model
  console.log(`Setting up Gemini LLM with model: ${config.model || 'gemini-2.0-flash'}`);
  
  const geminiModel = new ChatGoogleGenerativeAI({
    apiKey: config.apiKey,
    modelName: config.model || "gemini-2.0-flash",
    maxOutputTokens: config.maxOutputTokens || 2048,
    temperature: config.temperature || 0.7,
  });
  
  return geminiModel;
}

/**
 * Create a trading analysis chain using Google's Gemini
 * This returns a function that can be called directly rather than a chain
 * @param model The Gemini LLM model
 * @returns Analysis function wrapper
 */
export function createGeminiTradingAnalysisChain(model: ChatGoogleGenerativeAI) {
  // Define the prompt template for portfolio analysis
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert crypto trading analyst with deep experience in DeFi markets.
     Analyze the provided portfolio and market data to create a detailed trading recommendation.
     Focus on risk assessment, market trends, potential opportunities, and actionable steps.
     Your analysis should be comprehensive but concise, organized in clear sections.`],
    ["human", `Current date: {date}
     
     Portfolio data:
     {portfolio}
     
     Market data:
     {marketData}
     
     Please provide a detailed analysis with specific recommendations.`]
  ]);
  
  // Return a function that handles the analysis directly
  return async (input: { portfolio: string, marketData: string, date: string }): Promise<string> => {
    try {
      // Format the prompt with input values
      const prompt = await promptTemplate.formatMessages({
        date: input.date,
        portfolio: input.portfolio,
        marketData: input.marketData
      });
      
      // Call the model
      const response = await model.invoke(prompt);
      
      // Extract the text content
      const parser = new StringOutputParser();
      const result = await parser.invoke(response);
      
      return result;
    } catch (error) {
      console.error("Error in Gemini trading analysis:", error);
      throw error;
    }
  };
}

/**
 * Create a trade execution chain using Google's Gemini
 * This returns a function that can be called directly rather than a chain
 * @param model The Gemini LLM model
 * @returns Trade analysis function wrapper
 */
export function createGeminiTradeExecutionChain(model: ChatGoogleGenerativeAI) {
  // Define the prompt template for trade execution
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert crypto trading AI assistant that helps evaluate trade decisions.
     Given the proposed trade details and current market conditions, analyze if this trade makes sense.
     Consider factors like market trends, price impact, timing, and risk. 
     Provide a clear recommendation and reasoning.`],
    ["human", `Current date: {date}
     
     Proposed trade:
     Type: {tradeType}
     From: {fromAsset} (Amount: {fromAmount})
     To: {toAsset}
     
     Market conditions:
     {marketData}
     
     Is this a good trade to execute right now? Why or why not?`]
  ]);
  
  // Return a function that handles the trade analysis directly
  return async (input: { 
    tradeType: string, 
    fromAsset: string, 
    toAsset: string, 
    fromAmount: number, 
    marketData: string, 
    date: string 
  }): Promise<string> => {
    try {
      // Format the prompt with input values
      const prompt = await promptTemplate.formatMessages({
        date: input.date,
        tradeType: input.tradeType,
        fromAsset: input.fromAsset,
        toAsset: input.toAsset,
        fromAmount: input.fromAmount.toString(),
        marketData: input.marketData
      });
      
      // Call the model
      const response = await model.invoke(prompt);
      
      // Extract the text content
      const parser = new StringOutputParser();
      const result = await parser.invoke(response);
      
      return result;
    } catch (error) {
      console.error("Error in Gemini trade execution analysis:", error);
      throw error;
    }
  };
}
