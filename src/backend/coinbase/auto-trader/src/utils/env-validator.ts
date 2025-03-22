/**
 * Environment variable validator for the 4g3n7 application
 * 
 * This utility checks for required environment variables and logs warnings
 * for missing or potentially misconfigured values.
 */

// Define required variable groups
interface EnvironmentVariableGroup {
  name: string;
  variables: string[];
  optional?: boolean;
}

// Define environment variable groups with their dependent variables
const ENV_GROUPS: EnvironmentVariableGroup[] = [
  {
    name: 'Ethereum',
    variables: ['ETHEREUM_PRIVATE_KEY']
  },
  {
    name: 'Coinbase AgentKit',
    variables: ['COINBASE_CDP_KEY', 'COINBASE_CDP_SECRET', 'COINBASE_CDP_CLIENT_KEY']
  },
  {
    name: 'Etherscan',
    variables: ['ETHERSCAN_API_KEY'],
    optional: true
  },
  {
    name: 'Azure OpenAI',
    variables: [
      'AZURE_OPENAI_API_KEY', 
      'AZURE_OPENAI_API_INSTANCE_NAME',
      'AZURE_OPENAI_API_DEPLOYMENT_NAME',
      'AZURE_OPENAI_API_VERSION'
    ]
  },
  {
    name: 'Google AI',
    variables: ['GOOGLE_API_KEY', 'GEMINI_API_KEY']
  },
  {
    name: 'Recall Network',
    variables: [
      'RECALL_PRIVATE_KEY',
      'RECALL_BUCKET_ALIAS',
      'RECALL_NETWORK'
    ]
  },
  {
    name: 'Search',
    variables: ['TAVILY_API_KEY'],
    optional: true
  }
];

/**
 * Validates required environment variables
 * 
 * @returns Object containing validation results
 */
export function validateEnvironment(): { 
  valid: boolean; 
  missingGroups: string[];
  warnings: string[];
} {
  const result = {
    valid: true,
    missingGroups: [] as string[],
    warnings: [] as string[]
  };

  // Validate LLM provider
  const llmProvider = process.env.PREFERRED_LLM_PROVIDER || 'gemini';
  if (!['azure', 'gemini', 'mock'].includes(llmProvider)) {
    result.warnings.push(`Unknown LLM provider: ${llmProvider}. Using default.`);
  }

  // Check for override on Tavily search - we'll use mock if requested
  const useMockSearch = process.env.USE_MOCK_SEARCH === 'true';
  if (useMockSearch) {
    result.warnings.push('Using mock search results per configuration.');
  }

  // Add a USE_MOCK_SEARCH flag for Tavily search
  if (!process.env.TAVILY_API_KEY && !process.env.USE_MOCK_SEARCH) {
    process.env.USE_MOCK_SEARCH = 'true';
    result.warnings.push('TAVILY_API_KEY not found, setting USE_MOCK_SEARCH=true');
  }
  
  // Verify environment groups based on selected LLM provider
  ENV_GROUPS.forEach(group => {
    // Skip Azure checks if not using Azure
    if (group.name === 'Azure OpenAI' && llmProvider !== 'azure') {
      return;
    }
    
    // Skip Google checks if not using Gemini
    if (group.name === 'Google AI' && llmProvider !== 'gemini') {
      return;
    }

    // Skip Tavily check if mock search is enabled
    if (group.name === 'Search' && useMockSearch) {
      return;
    }
    
    let groupValid = true;
    const missingVars: string[] = [];
    
    group.variables.forEach(varName => {
      if (!process.env[varName] || process.env[varName] === 'your_' + varName.toLowerCase()) {
        groupValid = false;
        missingVars.push(varName);
      }
    });
    
    if (!groupValid) {
      // For non-optional groups, mark the entire validation as invalid
      if (!group.optional) {
        result.valid = false;
        result.missingGroups.push(group.name);
        result.warnings.push(`Missing required environment variables for ${group.name}: ${missingVars.join(', ')}`);
      } else {
        // Just add a warning for optional groups
        result.warnings.push(`Missing optional environment variables for ${group.name}: ${missingVars.join(', ')}`);
      }
    }
  });
  
  return result;
}

/**
 * Initializes default environment values for unset variables
 */
export function initializeDefaultEnvironment(): void {
  // Set defaults if not already set
  process.env.PORT = process.env.PORT || '3000';
  process.env.MARLIN_ENCLAVE = process.env.MARLIN_ENCLAVE || 'false';
  process.env.RECALL_NETWORK = process.env.RECALL_NETWORK || 'testnet';
  process.env.RECALL_BUCKET_ALIAS = process.env.RECALL_BUCKET_ALIAS || '4g3n7-reasoning';
  process.env.CDP_NETWORK_ID = process.env.CDP_NETWORK_ID || 'base-sepolia';
  
  // Set mock search flag to true for testing, but we'll respect an explicit false
  if (process.env.USE_MOCK_SEARCH !== 'false') {
    process.env.USE_MOCK_SEARCH = 'true';
  }
}
