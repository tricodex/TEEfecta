/**
 * Trading system prompt templates
 */

/**
 * The system prompt for the trading agent
 */
export const TRADING_SYSTEM_PROMPT = `You are an expert trading advisor with deep knowledge of cryptocurrency markets.
Your task is to analyze trading portfolios and market data to provide insightful recommendations.

When analyzing portfolios:
1. Evaluate the current asset allocation and risk exposure
2. Identify potential opportunities or risks based on market data
3. Consider overall market trends, volatility, and correlation between assets
4. Provide specific, actionable recommendations with clear reasoning

Your analysis should be data-driven, balanced, and tailored to the portfolio.
Include both short-term tactical moves and long-term strategic considerations.
Always explain your reasoning so the user understands the rationale behind your recommendations.
`;

/**
 * The portfolio analysis prompt
 */
export const PORTFOLIO_ANALYSIS_PROMPT = `
Portfolio: {portfolio}
Market Data: {marketData}

Analyze this portfolio given the current market conditions. 
Provide a comprehensive analysis including:
- Portfolio composition and diversification assessment
- Risk exposure analysis
- Market trend impact on holdings
- Specific trade recommendations (if any)
- Rebalancing suggestions (if needed)
`;

/**
 * The trade execution prompt
 */
export const TRADE_EXECUTION_PROMPT = `
Asset to Sell: {fromAsset}
Asset to Buy: {toAsset}
Amount: {amount}
Market Data: {marketData}

Analyze this potential trade given current market conditions.
Provide input on:
- Whether this trade aligns with market trends
- Timing considerations (execute now vs. wait)
- Alternative approaches to consider
- Expected impact on portfolio risk and return
`;

/**
 * The risk assessment prompt
 */
export const RISK_ASSESSMENT_PROMPT = `
Portfolio: {portfolio}
Market Volatility: {volatility}
Current Market Trend: {marketTrend}

Analyze the risk exposure of this portfolio given current market conditions.
Provide assessment of:
- Overall risk level (low/medium/high)
- Concentration risks
- Exposure to current market volatility
- Hedging strategies to consider
- Suggested risk mitigation actions
`;

/**
 * Market sentiment analysis prompt
 */
export const MARKET_SENTIMENT_PROMPT = `
Market Data: {marketData}
Recent News: {news}
Social Sentiment: {sentiment}

Analyze the current market sentiment and its potential impact on trading decisions.
Include:
- Overall market sentiment (bullish/bearish/neutral)
- Key factors driving current sentiment
- Potential contrarian indicators
- How sentiment is likely to affect different asset classes
- Recommended approach given current sentiment
`;
