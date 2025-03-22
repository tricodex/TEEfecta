import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { getWebSocketService } from './websocket.js';

/**
 * Priority levels for queue tasks
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Status of a task in the queue
 */
export enum TaskStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_FRONTEND = 'waiting_for_frontend',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Task types for different agent operations
 */
export enum TaskType {
  PORTFOLIO_ANALYSIS = 'portfolio_analysis',
  TRADE_EXECUTION = 'trade_execution',
  MARKET_ANALYSIS = 'market_analysis',
  AGENT_CONVERSATION = 'agent_conversation',
  SYSTEM_MESSAGE = 'system_message',
  AUTONOMOUS_CYCLE = 'autonomous_cycle'
}

/**
 * Interface for a queue task
 */
export interface AgentTask {
  id: string;
  type: TaskType;
  agentId: string;
  priority: TaskPriority;
  status: TaskStatus;
  data: any;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  allowFrontendIntervention: boolean;
  frontendInterventionTimeout: number; // milliseconds
  frontendInterventionDeadline?: Date;
  frontendResponse?: any;
  context?: Map<string, any>;
}

/**
 * Agent Queue Service for managing the flow between agents
 * with context management and frontend intervention support
 */
export class AgentQueueService {
  private static instance: AgentQueueService;
  private queue: AgentTask[] = [];
  private processing: boolean = false;
  private currentTask: AgentTask | null = null;
  private frontendInterventionTimer: NodeJS.Timeout | null = null;
  private emitter = new EventEmitter();
  private websocketService = getWebSocketService();
  private contextStore: Map<string, Map<string, any>> = new Map();
  
  // Configuration
  private maxConcurrentTasks: number = 1; // Single task processing for now
  private defaultFrontendTimeout: number = 15000; // 15 seconds default timeout for frontend
  
  private constructor() {
    console.log('Agent Queue Service initialized');
    
    // Override default timeout if set in environment
    if (process.env.FRONTEND_INTERVENTION_TIMEOUT) {
      this.defaultFrontendTimeout = parseInt(process.env.FRONTEND_INTERVENTION_TIMEOUT, 10);
      console.log(`Frontend intervention timeout set to ${this.defaultFrontendTimeout}ms`);
    }
    
    // Start processing loop
    this.processNextTask();
  }
  
  /**
   * Get the singleton instance of the queue service
   */
  public static getInstance(): AgentQueueService {
    if (!AgentQueueService.instance) {
      AgentQueueService.instance = new AgentQueueService();
    }
    return AgentQueueService.instance;
  }
  
  /**
   * Add a task to the queue
   * 
   * @param type Task type
   * @param agentId ID of the agent submitting the task
   * @param data Task data
   * @param priority Task priority
   * @param allowFrontendIntervention Whether frontend can intervene
   * @param frontendInterventionTimeout Timeout for frontend intervention (ms)
   * @returns Task ID
   */
  public addTask(
    type: TaskType,
    agentId: string,
    data: any,
    priority: TaskPriority = TaskPriority.NORMAL,
    allowFrontendIntervention: boolean = false,
    frontendInterventionTimeout: number = this.defaultFrontendTimeout
  ): string {
    const taskId = uuidv4();
    
    const task: AgentTask = {
      id: taskId,
      type,
      agentId,
      priority,
      status: TaskStatus.QUEUED,
      data,
      createdAt: new Date(),
      allowFrontendIntervention,
      frontendInterventionTimeout,
      context: new Map()
    };
    
    // Add task to queue based on priority
    this.insertTaskByPriority(task);
    
    // Broadcast new task added
    this.websocketService.broadcast('task_queued', {
      taskId,
      type,
      agentId,
      priority,
      data: this.sanitizeData(data),
      timestamp: task.createdAt.toISOString()
    });
    
    console.log(`Task ${taskId} of type ${type} added to queue with priority ${priority}`);
    
    // Trigger processing if not already in progress
    if (!this.processing) {
      this.processNextTask();
    }
    
    return taskId;
  }
  
  /**
   * Mark the current task as complete
   * 
   * @param taskId ID of the task
   * @param result Task result
   */
  public completeTask(taskId: string, result: any): void {
    const task = this.findTask(taskId);
    
    if (!task) {
      console.error(`Cannot complete task ${taskId}: task not found`);
      return;
    }
    
    if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.WAITING_FOR_FRONTEND) {
      console.error(`Cannot complete task ${taskId}: task is not in progress (status: ${task.status})`);
      return;
    }
    
    // Clear any frontend intervention timer
    if (this.frontendInterventionTimer) {
      clearTimeout(this.frontendInterventionTimer);
      this.frontendInterventionTimer = null;
    }
    
    // Update task
    task.status = TaskStatus.COMPLETED;
    task.result = result;
    task.completedAt = new Date();
    
    // Broadcast task completion
    this.websocketService.broadcast('task_completed', {
      taskId,
      agentId: task.agentId,
      type: task.type,
      result: this.sanitizeData(result),
      timestamp: task.completedAt.toISOString()
    });
    
    console.log(`Task ${taskId} completed`);
    
    // Remove task from queue
    this.queue = this.queue.filter(t => t.id !== taskId);
    
    // Reset current task if it's the one that was completed
    if (this.currentTask && this.currentTask.id === taskId) {
      this.currentTask = null;
    }
    
    // Emit completion event
    this.emitter.emit('task_completed', task);
    
    // Continue processing other tasks
    this.processing = false;
    this.processNextTask();
  }
  
  /**
   * Mark a task as failed
   * 
   * @param taskId ID of the task
   * @param error Error message
   */
  public failTask(taskId: string, error: string): void {
    const task = this.findTask(taskId);
    
    if (!task) {
      console.error(`Cannot fail task ${taskId}: task not found`);
      return;
    }
    
    // Clear any frontend intervention timer
    if (this.frontendInterventionTimer) {
      clearTimeout(this.frontendInterventionTimer);
      this.frontendInterventionTimer = null;
    }
    
    // Update task
    task.status = TaskStatus.FAILED;
    task.error = error;
    task.completedAt = new Date();
    
    // Broadcast task failure
    this.websocketService.broadcast('task_failed', {
      taskId,
      agentId: task.agentId,
      type: task.type,
      error,
      timestamp: task.completedAt.toISOString()
    });
    
    console.log(`Task ${taskId} failed: ${error}`);
    
    // Remove task from queue
    this.queue = this.queue.filter(t => t.id !== taskId);
    
    // Reset current task if it's the one that failed
    if (this.currentTask && this.currentTask.id === taskId) {
      this.currentTask = null;
    }
    
    // Emit failure event
    this.emitter.emit('task_failed', task);
    
    // Continue processing other tasks
    this.processing = false;
    this.processNextTask();
  }
  
  /**
   * Cancel a queued task
   * 
   * @param taskId ID of the task to cancel
   */
  public cancelTask(taskId: string): boolean {
    const task = this.findTask(taskId);
    
    if (!task) {
      console.error(`Cannot cancel task ${taskId}: task not found`);
      return false;
    }
    
    if (task.status !== TaskStatus.QUEUED) {
      console.error(`Cannot cancel task ${taskId}: task is not queued (status: ${task.status})`);
      return false;
    }
    
    // Update task
    task.status = TaskStatus.CANCELLED;
    task.completedAt = new Date();
    
    // Broadcast task cancellation
    this.websocketService.broadcast('task_cancelled', {
      taskId,
      agentId: task.agentId,
      type: task.type,
      timestamp: task.completedAt.toISOString()
    });
    
    console.log(`Task ${taskId} cancelled`);
    
    // Remove task from queue
    this.queue = this.queue.filter(t => t.id !== taskId);
    
    // Emit cancellation event
    this.emitter.emit('task_cancelled', task);
    
    return true;
  }
  
  /**
   * Get all tasks in the queue
   * 
   * @returns Array of tasks
   */
  public getTasks(): AgentTask[] {
    return [...this.queue];
  }
  
  /**
   * Get a specific task by ID
   * 
   * @param taskId ID of the task to retrieve
   * @returns Task or null if not found
   */
  public getTask(taskId: string): AgentTask | null {
    return this.findTask(taskId);
  }
  
  /**
   * Get the current in-progress task
   * 
   * @returns Current task or null if none
   */
  public getCurrentTask(): AgentTask | null {
    return this.currentTask;
  }
  
  /**
   * Provide frontend response to a waiting task
   * 
   * @param taskId ID of the task
   * @param response Frontend response data
   * @returns Success status
   */
  public provideFrontendResponse(taskId: string, response: any): boolean {
    const task = this.findTask(taskId);
    
    if (!task) {
      console.error(`Cannot provide frontend response for task ${taskId}: task not found`);
      return false;
    }
    
    if (task.status !== TaskStatus.WAITING_FOR_FRONTEND) {
      console.error(`Cannot provide frontend response for task ${taskId}: task is not waiting for frontend (status: ${task.status})`);
      return false;
    }
    
    // Clear frontend intervention timer
    if (this.frontendInterventionTimer) {
      clearTimeout(this.frontendInterventionTimer);
      this.frontendInterventionTimer = null;
    }
    
    // Update task
    task.frontendResponse = response;
    task.status = TaskStatus.IN_PROGRESS;
    
    // Broadcast frontend response received
    this.websocketService.broadcast('frontend_response_received', {
      taskId,
      timestamp: new Date().toISOString()
    });
    
    console.log(`Frontend response received for task ${taskId}`);
    
    // Emit frontend response event
    this.emitter.emit('frontend_response', task);
    
    return true;
  }
  
  /**
   * Store context data for a specific agent
   * 
   * @param agentId ID of the agent
   * @param key Context key
   * @param value Context value
   */
  public setContext(agentId: string, key: string, value: any): void {
    if (!this.contextStore.has(agentId)) {
      this.contextStore.set(agentId, new Map());
    }
    
    const agentContext = this.contextStore.get(agentId)!;
    agentContext.set(key, value);
  }
  
  /**
   * Get context data for a specific agent
   * 
   * @param agentId ID of the agent
   * @param key Context key
   * @returns Context value or undefined if not found
   */
  public getContext(agentId: string, key: string): any {
    if (!this.contextStore.has(agentId)) {
      return undefined;
    }
    
    const agentContext = this.contextStore.get(agentId)!;
    return agentContext.get(key);
  }
  
  /**
   * Clear all context data for a specific agent
   * 
   * @param agentId ID of the agent
   */
  public clearContext(agentId: string): void {
    this.contextStore.delete(agentId);
  }
  
  /**
   * Set context for a specific task
   * 
   * @param taskId ID of the task
   * @param key Context key
   * @param value Context value
   */
  public setTaskContext(taskId: string, key: string, value: any): void {
    const task = this.findTask(taskId);
    
    if (!task) {
      console.error(`Cannot set context for task ${taskId}: task not found`);
      return;
    }
    
    task.context!.set(key, value);
  }
  
  /**
   * Get context data for a specific task
   * 
   * @param taskId ID of the task
   * @param key Context key
   * @returns Context value or undefined if not found
   */
  public getTaskContext(taskId: string, key: string): any {
    const task = this.findTask(taskId);
    
    if (!task || !task.context) {
      return undefined;
    }
    
    return task.context.get(key);
  }
  
  /**
   * Subscribe to queue events
   * 
   * @param event Event name
   * @param callback Callback function
   */
  public on(event: string, callback: (task: AgentTask) => void): void {
    this.emitter.on(event, callback);
  }
  
  /**
   * Process the next task in the queue
   */
  private processNextTask(): void {
    // Skip if already processing or no tasks in queue
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    // Sort queue by priority (highest first)
    const sortedQueue = [...this.queue].sort((a, b) => b.priority - a.priority);
    
    // Get next task
    const nextTask = sortedQueue.find(task => task.status === TaskStatus.QUEUED);
    
    if (!nextTask) {
      return; // No tasks ready for processing
    }
    
    // Mark as processing
    this.processing = true;
    this.currentTask = nextTask;
    
    // Update task status
    nextTask.status = TaskStatus.IN_PROGRESS;
    nextTask.startedAt = new Date();
    
    // Broadcast task started
    this.websocketService.broadcast('task_started', {
      taskId: nextTask.id,
      agentId: nextTask.agentId,
      type: nextTask.type,
      timestamp: nextTask.startedAt.toISOString()
    });
    
    console.log(`Started processing task ${nextTask.id} of type ${nextTask.type}`);
    
    // If frontend intervention is allowed, wait for it
    if (nextTask.allowFrontendIntervention) {
      this.requestFrontendIntervention(nextTask);
    } else {
      // Emit task started event
      this.emitter.emit('task_started', nextTask);
    }
  }
  
  /**
   * Request frontend intervention for a task
   * 
   * @param task Task to request intervention for
   */
  private requestFrontendIntervention(task: AgentTask): void {
    // Update task status
    task.status = TaskStatus.WAITING_FOR_FRONTEND;
    task.frontendInterventionDeadline = new Date(Date.now() + task.frontendInterventionTimeout);
    
    // Broadcast frontend intervention request
    this.websocketService.broadcast('frontend_intervention_requested', {
      taskId: task.id,
      agentId: task.agentId,
      type: task.type,
      data: this.sanitizeData(task.data),
      deadline: task.frontendInterventionDeadline.toISOString(),
      timestamp: new Date().toISOString()
    });
    
    console.log(`Requested frontend intervention for task ${task.id} (deadline: ${task.frontendInterventionDeadline.toISOString()})`);
    
    // Set timeout for intervention
    this.frontendInterventionTimer = setTimeout(() => {
      // If still waiting for frontend, proceed without it
      if (task.status === TaskStatus.WAITING_FOR_FRONTEND) {
        console.log(`Frontend intervention timeout for task ${task.id}`);
        
        // Update task status
        task.status = TaskStatus.IN_PROGRESS;
        
        // Broadcast frontend intervention timeout
        this.websocketService.broadcast('frontend_intervention_timeout', {
          taskId: task.id,
          timestamp: new Date().toISOString()
        });
        
        // Emit task started event
        this.emitter.emit('task_started', task);
      }
    }, task.frontendInterventionTimeout);
  }
  
  /**
   * Find a task by ID
   * 
   * @param taskId ID of the task to find
   * @returns Task or null if not found
   */
  private findTask(taskId: string): AgentTask | null {
    // Check current task first
    if (this.currentTask && this.currentTask.id === taskId) {
      return this.currentTask;
    }
    
    // Then check queue
    const task = this.queue.find(t => t.id === taskId);
    return task || null;
  }
  
  /**
   * Insert a task into the queue based on priority
   * 
   * @param task Task to insert
   */
  private insertTaskByPriority(task: AgentTask): void {
    // Find index where this task should be inserted based on priority
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      if (task.priority > this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    // Insert task at the determined index
    this.queue.splice(insertIndex, 0, task);
  }
  
  /**
   * Sanitize data for WebSocket broadcast
   * (Removes sensitive information and converts Maps to objects)
   * 
   * @param data Data to sanitize
   * @returns Sanitized data
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (data instanceof Map) {
      const obj: Record<string, any> = {};
      data.forEach((value, key) => {
        obj[key] = this.sanitizeData(value);
      });
      return obj;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip sensitive keys
        if (
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token')
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
}

// Singleton instance
let queueService: AgentQueueService | null = null;

/**
 * Get the queue service instance
 */
export function getAgentQueueService(): AgentQueueService {
  if (!queueService) {
    queueService = AgentQueueService.getInstance();
  }
  return queueService;
} 