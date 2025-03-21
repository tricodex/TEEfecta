// AgentKit integration
import {
  AgentKit,
  CdpWalletProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
} from '@coinbase/agentkit';
import { recallActionProvider } from '../action-providers';

export interface AgentKitConfig {
  cdpApiKeyName: string;
  cdpApiKeyPrivateKey: string;
  networkId?: string;
  recallPrivateKey: string;
}

/**
 * Initialize AgentKit with required providers
 */
export async function setupAgentKit(config: AgentKitConfig) {
  console.log('Setting up AgentKit with network:', config.networkId || 'base-sepolia');
  
  // Configure wallet provider
  const walletProvider = await CdpWalletProvider.configureWithWallet({
    apiKeyName: config.cdpApiKeyName,
    apiKeyPrivateKey: config.cdpApiKeyPrivateKey,
    networkId: config.networkId || 'base-sepolia'
  });
  
  // Create AgentKit instance
  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      walletActionProvider(),
      erc20ActionProvider(),
      cdpApiActionProvider({
        apiKeyName: config.cdpApiKeyName,
        apiKeyPrivateKey: config.cdpApiKeyPrivateKey
      }),
      cdpWalletActionProvider({
        apiKeyName: config.cdpApiKeyName,
        apiKeyPrivateKey: config.cdpApiKeyPrivateKey
      }),
      // Add our custom Recall Network action provider
      recallActionProvider(config.recallPrivateKey)
    ]
  });
  
  console.log('AgentKit initialized successfully');
  return agentkit;
}