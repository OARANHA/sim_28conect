import { createLogger } from '@sim/logger'
import { executeTool as executeToolUtil } from '@/tools'
import type { ExecutionContext } from '@/executor/types'
import type { Credentials } from '@/lib/copilot/tools/server/user/get-credentials'
import type { ToolCall, ToolExecutionResult } from './stream-to-sse'

const logger = createLogger('CopilotToolExecutor')

interface ToolExecutorConfig {
  tools: CopilotToolConfig[]
  credentials: Credentials
  userId: string
  workspaceId?: string
  workflowId?: string
  executionContext?: Partial<ExecutionContext>
}

export interface CopilotToolConfig {
  name: string
  description: string
  input_schema?: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
  params?: Record<string, any>
  defer_loading?: boolean
  oauth?: boolean
}

export class ToolExecutor {
  private tools: Map<string, CopilotToolConfig>
  private credentials: Credentials
  private userId: string
  private workspaceId?: string
  private workflowId?: string
  private executionContext: Partial<ExecutionContext>

  constructor(config: ToolExecutorConfig) {
    this.tools = new Map()
    this.credentials = config.credentials
    this.userId = config.userId
    this.workspaceId = config.workspaceId
    this.workflowId = config.workflowId
    this.executionContext = config.executionContext || {}

    for (const tool of config.tools) {
      this.tools.set(tool.name, tool)
    }

    logger.info('ToolExecutor initialized', {
      toolCount: this.tools.size,
      toolNames: Array.from(this.tools.keys()),
      userId: this.userId,
      workspaceId: this.workspaceId,
    })
  }

  async execute(toolCall: ToolCall): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
      logger.info('Executing tool', {
        toolId: toolCall.id,
        toolName: toolCall.name,
        argsKeys: Object.keys(toolCall.arguments),
      })

      const toolConfig = this.tools.get(toolCall.name)
      if (!toolConfig) {
        logger.error('Tool not found', { toolName: toolCall.name })
        return {
          success: false,
          error: `Tool not found: ${toolCall.name}`,
        }
      }

      const executionContext: Partial<ExecutionContext> = {
        userId: this.userId,
        workspaceId: this.workspaceId,
        workflowId: this.workflowId,
        ...this.executionContext,
      }

      const params = {
        ...toolConfig.params,
        ...toolCall.arguments,
        _context: {
          userId: this.userId,
          workspaceId: this.workspaceId,
          workflowId: this.workflowId,
        },
      }

      const result = await executeToolUtil(toolCall.name, params, false, false, executionContext)

      const duration = Date.now() - startTime

      logger.info('Tool execution completed', {
        toolId: toolCall.id,
        toolName: toolCall.name,
        success: result.success,
        duration,
      })

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error('Tool execution failed', {
        toolId: toolCall.id,
        toolName: toolCall.name,
        error: errorMessage,
        duration,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  getToolCount(): number {
    return this.tools.size
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  hasTool(toolName: string): boolean {
    return this.tools.has(toolName)
  }
}
