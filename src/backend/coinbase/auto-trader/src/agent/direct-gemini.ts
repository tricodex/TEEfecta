// Direct Gemini AI Integration
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GeminiAnalysisInput {
  portfolio: string;
  marketData: string;
  date: string;
}

export interface GeminiTradeInput {
  tradeType: string;
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  marketData: string;
  date: string;
}

/**
 * Setup direct connection to Google Generative AI (Gemini)
 * @param config Google API key and optional model configuration
 * @returns Gemini model instance wrapped in a simple API
 */
export function setupDirectGemini(config: GeminiConfig) {
  // Validate config
  if (!config.apiKey) {
    throw new Error("Google Generative AI API key is required");
  }
  
  // Initialize the Gemini model with the Google Generative AI client
  console.log(`Setting up Gemini model: ${config.model || 'gemini-2.0-flash'}`);
  
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.model || "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: config.maxOutputTokens || 2048,
      temperature: config.temperature || 0.7,
    }
  });
  
  return {
    model,
    
    // Trading analysis function
    analyzePortfolio: async (input: GeminiAnalysisInput): Promise<string> => {
      const prompt = `You are an expert crypto trading analyst with deep experience in DeFi markets.
      Analyze the provided portfolio and market data to create a detailed trading recommendation.
      Focus on risk assessment, market trends, potential opportunities, and actionable steps.
      Your analysis should be comprehensive but concise, organized in clear sections.
      
      Current date: ${input.date}
      
      Portfolio data:
      ${input.portfolio}
      
      Market data:
      ${input.marketData}
      
      Please provide a detailed analysis with specific recommendations.`;
      
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        console.error("Error in Gemini trading analysis:", error);
        throw error;
      }
    },
    
    // Trade execution analysis function
    analyzeTrade: async (input: GeminiTradeInput): Promise<string> => {
      const prompt = `You are an expert crypto trading AI assistant that helps evaluate trade decisions.
      Given the proposed trade details and current market conditions, analyze if this trade makes sense.
      Consider factors like market trends, price impact, timing, and risk. 
      Provide a clear recommendation and reasoning.
      
      Current date: ${input.date}
      
      Proposed trade:
      Type: ${input.tradeType}
      From: ${input.fromAsset} (Amount: ${input.fromAmount})
      To: ${input.toAsset}
      
      Market conditions:
      ${input.marketData}
      
      Is this a good trade to execute right now? Why or why not?`;
      
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        console.error("Error in Gemini trade execution analysis:", error);
        throw error;
      }
    }
  };
} 