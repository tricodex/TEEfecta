import { v4 as uuidv4 } from 'uuid';
import { getWebSocketService } from './websocket.js';
import { getAgentQueueService, TaskType, TaskPriority } from './agent-queue.js';

/**
 * Conversation message type
 */
export enum MessageType {
  SYSTEM = 'system',
  USER = 'user',
  AGENT = 'agent',
  PRIMARY_AGENT = 'primary_agent',
  SECONDARY_AGENT = 'secondary_agent',
  LLM = 'llm',
  ERROR = 'error'
}

/**
 * Interface for a conversation message
 */
export interface ConversationMessage {
  id: string;
  conversationId: string;
  type: MessageType;
  sender: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  parentMessageId?: string;
}

/**
 * Interface for a conversation
 */
export interface Conversation {
  id: string;
  title: string;
  agentIds: string[];
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * ConversationTracker tracks agent conversations and provides methods
 * for recording and retrieving conversation data
 */
export class ConversationTracker {
  private static instance: ConversationTracker;
  private conversations: Map<string, Conversation> = new Map();
  private websocketService = getWebSocketService();
  private queueService = getAgentQueueService();
  
  private constructor() {
    console.log('Conversation Tracker initialized');
  }
  
  /**
   * Get the singleton instance of the conversation tracker
   */
  public static getInstance(): ConversationTracker {
    if (!ConversationTracker.instance) {
      ConversationTracker.instance = new ConversationTracker();
    }
    return ConversationTracker.instance;
  }
  
  /**
   * Create a new conversation
   * 
   * @param title Title of the conversation
   * @param agentIds IDs of agents involved in the conversation
   * @param metadata Additional metadata
   * @returns Conversation ID
   */
  public createConversation(
    title: string,
    agentIds: string[],
    metadata?: Record<string, any>
  ): string {
    const conversationId = uuidv4();
    
    const conversation: Conversation = {
      id: conversationId,
      title,
      agentIds,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata
    };
    
    this.conversations.set(conversationId, conversation);
    
    // Add a system message to start the conversation
    this.addMessage(
      conversationId,
      MessageType.SYSTEM,
      'system',
      `Conversation started between agents: ${agentIds.join(', ')}`
    );
    
    // Broadcast conversation created
    this.websocketService.broadcast('conversation_created', {
      conversationId,
      title,
      agentIds,
      timestamp: conversation.createdAt.toISOString()
    });
    
    console.log(`Created conversation ${conversationId}: "${title}" with agents ${agentIds.join(', ')}`);
    
    return conversationId;
  }
  
  /**
   * Add a message to a conversation
   * 
   * @param conversationId ID of the conversation
   * @param type Type of message
   * @param sender Sender of the message
   * @param content Content of the message
   * @param metadata Additional metadata
   * @param parentMessageId ID of parent message if this is a reply
   * @returns Message ID
   */
  public addMessage(
    conversationId: string,
    type: MessageType,
    sender: string,
    content: string,
    metadata?: Record<string, any>,
    parentMessageId?: string
  ): string {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      console.error(`Cannot add message to conversation ${conversationId}: conversation not found`);
      return '';
    }
    
    const messageId = uuidv4();
    
    const message: ConversationMessage = {
      id: messageId,
      conversationId,
      type,
      sender,
      content,
      timestamp: new Date(),
      metadata,
      parentMessageId
    };
    
    conversation.messages.push(message);
    conversation.updatedAt = message.timestamp;
    
    // Broadcast message added
    this.websocketService.broadcast('conversation_message_added', {
      messageId,
      conversationId,
      type,
      sender,
      content,
      timestamp: message.timestamp.toISOString(),
      metadata,
      parentMessageId
    });
    
    // Add to agent queue for frontend intervention if it's an important message
    if (
      type === MessageType.AGENT ||
      type === MessageType.PRIMARY_AGENT ||
      type === MessageType.SECONDARY_AGENT
    ) {
      this.queueService.addTask(
        TaskType.AGENT_CONVERSATION,
        sender,
        {
          conversationId,
          messageId,
          content,
          metadata
        },
        type === MessageType.AGENT ? TaskPriority.HIGH : TaskPriority.NORMAL,
        true, // Allow frontend intervention
        30000 // 30 second timeout
      );
    }
    
    return messageId;
  }
  
  /**
   * Add an LLM response message to a conversation
   * 
   * @param conversationId ID of the conversation
   * @param agentId ID of the agent the LLM is responding to
   * @param prompt The prompt sent to the LLM
   * @param response The LLM's response
   * @param metadata Additional metadata
   * @returns Message ID
   */
  public addLLMResponse(
    conversationId: string,
    agentId: string,
    prompt: string,
    response: string,
    metadata?: Record<string, any>
  ): string {
    // First add the prompt as a message from the agent
    const promptMessageId = this.addMessage(
      conversationId,
      MessageType.AGENT,
      agentId,
      prompt,
      {
        ...metadata,
        isPrompt: true
      }
    );
    
    // Then add the LLM response as a reply
    return this.addMessage(
      conversationId,
      MessageType.LLM,
      'llm',
      response,
      {
        ...metadata,
        agentId,
        isLLMResponse: true
      },
      promptMessageId
    );
  }
  
  /**
   * Add an error message to a conversation
   * 
   * @param conversationId ID of the conversation
   * @param message Error message
   * @param error Error object or string
   * @param metadata Additional metadata
   * @returns Message ID
   */
  public addErrorMessage(
    conversationId: string,
    message: string,
    error: any,
    metadata?: Record<string, any>
  ): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return this.addMessage(
      conversationId,
      MessageType.ERROR,
      'system',
      `${message}: ${errorMessage}`,
      {
        ...metadata,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      }
    );
  }
  
  /**
   * Get a conversation by ID
   * 
   * @param conversationId ID of the conversation
   * @returns Conversation or null if not found
   */
  public getConversation(conversationId: string): Conversation | null {
    const conversation = this.conversations.get(conversationId);
    return conversation || null;
  }
  
  /**
   * Get all conversations
   * 
   * @returns Array of conversations
   */
  public getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }
  
  /**
   * Get conversations involving a specific agent
   * 
   * @param agentId ID of the agent
   * @returns Array of conversations
   */
  public getConversationsByAgent(agentId: string): Conversation[] {
    return Array.from(this.conversations.values())
      .filter(conversation => conversation.agentIds.includes(agentId));
  }
  
  /**
   * Get a message by ID
   * 
   * @param messageId ID of the message
   * @returns Message or null if not found
   */
  public getMessage(messageId: string): ConversationMessage | null {
    for (const conversation of this.conversations.values()) {
      const message = conversation.messages.find(m => m.id === messageId);
      if (message) {
        return message;
      }
    }
    
    return null;
  }
  
  /**
   * Get all messages in a conversation
   * 
   * @param conversationId ID of the conversation
   * @returns Array of messages or empty array if conversation not found
   */
  public getMessages(conversationId: string): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    return [...conversation.messages];
  }
  
  /**
   * Get messages by a specific sender
   * 
   * @param conversationId ID of the conversation
   * @param sender Sender of the messages
   * @returns Array of messages
   */
  public getMessagesBySender(conversationId: string, sender: string): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    return conversation.messages.filter(message => message.sender === sender);
  }
  
  /**
   * Get messages of a specific type
   * 
   * @param conversationId ID of the conversation
   * @param type Type of messages
   * @returns Array of messages
   */
  public getMessagesByType(conversationId: string, type: MessageType): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      return [];
    }
    
    return conversation.messages.filter(message => message.type === type);
  }
}

// Singleton instance
let conversationTracker: ConversationTracker | null = null;

/**
 * Get the conversation tracker instance
 */
export function getConversationTracker(): ConversationTracker {
  if (!conversationTracker) {
    conversationTracker = ConversationTracker.getInstance();
  }
  return conversationTracker;
} 