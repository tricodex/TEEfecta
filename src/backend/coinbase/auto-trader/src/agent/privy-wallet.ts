// Privy wallet provider for AgentKit
import { PrivyClient } from "@privy-io/server-auth";
import { v4 as uuidv4 } from 'uuid';

// Extend the AgentKit wallet provider interface
export interface PrivyWalletConfig {
  appId: string;
  appSecret: string;
  chainId?: string;
  walletId?: string;
  authorizationPrivateKey?: string;
  authorizationKeyId?: string;
}

export interface WalletInfo {
  walletId: string;
  address: string;
  chainId: string;
}

export class PrivyWalletProvider {
  private privyClient: PrivyClient;
  private walletId: string;
  private walletAddress: string;
  private chainId: string;
  private authorizationPrivateKey?: string;
  private authorizationKeyId?: string;

  constructor(
    privyClient: PrivyClient,
    walletId: string,
    walletAddress: string,
    chainId: string = '84532', // base-sepolia by default
    authorizationPrivateKey?: string,
    authorizationKeyId?: string
  ) {
    this.privyClient = privyClient;
    this.walletId = walletId;
    this.walletAddress = walletAddress;
    this.chainId = chainId;
    this.authorizationPrivateKey = authorizationPrivateKey;
    this.authorizationKeyId = authorizationKeyId;
  }

  /**
   * Configure a Privy wallet provider with existing or new wallet
   */
  static async configureWithWallet(config: PrivyWalletConfig): Promise<PrivyWalletProvider> {
    const {
      appId,
      appSecret,
      chainId = '84532', // base-sepolia by default
      walletId,
      authorizationPrivateKey,
      authorizationKeyId,
    } = config;

    if (!appId || !appSecret) {
      throw new Error('Privy appId and appSecret are required');
    }

    // Initialize Privy client
    const privyClient = new PrivyClient(appId, appSecret);

    // Use existing wallet or create a new one
    let walletAddress: string;
    let walletIdToUse: string;

    if (walletId) {
      // Use existing wallet
      try {
        console.log(`Using existing Privy wallet with ID: ${walletId}`);
        // Use the correct method to get wallet details
        const walletData = await privyClient.getWallets({
          id: walletId
        });
        
        if (!walletData || walletData.length === 0) {
          throw new Error(`Wallet with ID ${walletId} not found`);
        }
        
        walletAddress = walletData[0].address;
        walletIdToUse = walletId;
      } catch (error) {
        console.error(`Error retrieving Privy wallet: ${error}`);
        throw new Error(`Failed to get wallet with ID ${walletId}: ${error}`);
      }
    } else {
      // Create a new wallet
      try {
        console.log('Creating a new Privy wallet');
        
        // For wallet creation with auth keys, both authorizationPrivateKey and authorizationKeyId are required
        if ((authorizationPrivateKey && !authorizationKeyId) || (!authorizationPrivateKey && authorizationKeyId)) {
          throw new Error('Both authorizationPrivateKey and authorizationKeyId are required to create a new wallet');
        }

        // Generate wallet options
        const walletOptions = {
          chainIds: [chainId],
          externalId: `autotrader-${uuidv4()}`, // Generate a unique external ID
        };

        // Add authentication if provided
        if (authorizationPrivateKey && authorizationKeyId) {
          Object.assign(walletOptions, {
            authorization: {
              privateKey: authorizationPrivateKey,
              keyId: authorizationKeyId,
            },
          });
        }

        // Create the wallet using the correct method
        const newWallets = await privyClient.createWallets([walletOptions]);
        
        if (!newWallets || newWallets.length === 0) {
          throw new Error('Failed to create new wallet');
        }
        
        walletAddress = newWallets[0].address;
        walletIdToUse = newWallets[0].id;
        
        console.log(`Created new wallet with ID: ${walletIdToUse} and address: ${walletAddress}`);
      } catch (error) {
        console.error(`Error creating Privy wallet: ${error}`);
        throw new Error(`Failed to create new wallet: ${error}`);
      }
    }

    return new PrivyWalletProvider(
      privyClient,
      walletIdToUse,
      walletAddress,
      chainId,
      authorizationPrivateKey,
      authorizationKeyId
    );
  }

  /**
   * Get wallet details
   */
  async getWalletDetails(): Promise<WalletInfo> {
    return {
      walletId: this.walletId,
      address: this.walletAddress,
      chainId: this.chainId
    };
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.walletAddress;
  }

  /**
   * Get wallet chain ID
   */
  getChainId(): string {
    return this.chainId;
  }

  /**
   * Get wallet ID
   */
  getWalletId(): string {
    return this.walletId;
  }

  /**
   * Sign a message with the wallet
   */
  async signMessage(message: string): Promise<string> {
    try {
      // Use the correct method to sign messages
      const signatures = await this.privyClient.signMessage({
        walletId: this.walletId,
        message
      });
      
      if (!signatures || signatures.length === 0) {
        throw new Error('Failed to sign message');
      }
      
      return signatures[0].signature;
    } catch (error) {
      console.error(`Error signing message: ${error}`);
      throw new Error(`Failed to sign message: ${error}`);
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transactionData: any): Promise<string> {
    try {
      // Use the correct method to sign transactions
      const signedTxs = await this.privyClient.signTransaction({
        walletId: this.walletId,
        to: transactionData.to,
        value: transactionData.value,
        data: transactionData.data || '0x',
        chainId: this.chainId
      });
      
      if (!signedTxs || signedTxs.length === 0) {
        throw new Error('Failed to sign transaction');
      }
      
      return signedTxs[0].rawTransaction;
    } catch (error) {
      console.error(`Error signing transaction: ${error}`);
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Send a transaction
   */
  async sendTransaction(transactionData: any): Promise<{ transactionHash: string }> {
    try {
      // Use the correct method to send transactions
      const txResults = await this.privyClient.sendTransaction({
        walletId: this.walletId,
        to: transactionData.to,
        value: transactionData.value,
        data: transactionData.data || '0x',
        chainId: this.chainId
      });
      
      if (!txResults || txResults.length === 0) {
        throw new Error('Failed to send transaction');
      }
      
      return { transactionHash: txResults[0].hash };
    } catch (error) {
      console.error(`Error sending transaction: ${error}`);
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }

  /**
   * Export wallet information
   */
  async exportWallet(): Promise<{ walletId: string; authorizationKey?: string; networkId?: string }> {
    return {
      walletId: this.walletId,
      authorizationKey: this.authorizationPrivateKey,
      networkId: this.chainId
    };
  }
} 