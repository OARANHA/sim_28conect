import { createLogger } from '@sim/logger'
import { createFileContent } from '@/lib/uploads/utils/file-utils'
import type { Message, ProviderRequest, ProviderToolConfig } from '@/providers/types'
import type { CopilotToolConfig } from '@/stores/panel/copilot/types'

const logger = createLogger('CopilotProviderAdapter')

interface ConvertParams {
  message: string
  model: string
  mode: 'ask' | 'agent' | 'plan'
  agentContexts?: Array<{ type: string; content: string }>
  conversationHistory?: Message[]
  tools?: CopilotToolConfig[]
  stream: boolean
  streamToolCalls?: boolean
  userId: string
  workspaceId?: string
  workflowId?: string
  chatId?: string
  fileAttachments?: Array<{ buffer: Buffer; attachment: any }>
  implicitFeedback?: string
}

export function convertCopilotToProviderRequest(params: ConvertParams): ProviderRequest {
  const {
    message,
    model,
    mode,
    agentContexts,
    conversationHistory,
    tools,
    stream,
    streamToolCalls,
    userId,
    workspaceId,
    workflowId,
    chatId,
    fileAttachments,
    implicitFeedback,
  } = params

  try {
    logger.info('Converting copilot request to provider request', {
      model,
      mode,
      hasContexts: agentContexts && agentContexts.length > 0,
      hasHistory: conversationHistory && conversationHistory.length > 0,
      hasTools: tools && tools.length > 0,
      hasFiles: fileAttachments && fileAttachments.length > 0,
      stream,
    })

    const systemPrompt = buildSystemPrompt(mode, agentContexts)
    const messages = buildMessages({
      message,
      conversationHistory,
      agentContexts,
      fileAttachments,
      implicitFeedback,
    })
    const providerTools = convertTools(tools)

    const providerRequest: ProviderRequest = {
      model,
      systemPrompt,
      messages,
      tools: providerTools,
      stream,
      streamToolCalls,
      workspaceId,
      userId,
      workflowId,
      chatId,
      isCopilotRequest: true,
    }

    return providerRequest
  } catch (error) {
    logger.error('Failed to convert copilot request', { error, params })
    throw new Error(`Failed to convert copilot request: ${error.message}`)
  }
}

function buildSystemPrompt(
  mode: 'ask' | 'agent' | 'plan',
  agentContexts?: Array<{ type: string; content: string }>
): string | undefined {
  let basePrompt = 'You are a helpful AI assistant.'

  switch (mode) {
    case 'ask':
      basePrompt = 'You are a helpful AI assistant. Answer questions directly and concisely.'
      break
    case 'agent':
      basePrompt =
        'You are a helpful AI assistant with access to tools. Use tools when they are helpful for answering questions or completing tasks. When using tools, provide clear explanations of what you are doing.'
      break
    case 'plan':
      basePrompt =
        'You are a helpful AI assistant that creates detailed plans for workflows. Use <design_workflow> tags to structure your workflow designs. Break down complex tasks into clear, executable steps.'
      break
  }

  if (agentContexts && agentContexts.length > 0) {
    const contextInfo = agentContexts.map((ctx) => `[${ctx.type}]`).join(', ')
    basePrompt = `${basePrompt}\n\nThe user has provided the following context: ${contextInfo}`
  }

  return basePrompt
}

interface BuildMessagesParams {
  message: string
  conversationHistory?: Message[]
  agentContexts?: Array<{ type: string; content: string }>
  fileAttachments?: Array<{ buffer: Buffer; attachment: any }>
  implicitFeedback?: string
}

function buildMessages(params: BuildMessagesParams): Message[] {
  const { message, conversationHistory, agentContexts, fileAttachments, implicitFeedback } = params

  const messages: Message[] = []

  if (implicitFeedback) {
    messages.push({
      role: 'system',
      content: implicitFeedback,
    })
  }

  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory)
  }

  if (agentContexts && agentContexts.length > 0) {
    const contextContent = agentContexts.map((ctx) => `[${ctx.type}]\n${ctx.content}`).join('\n\n')
    messages.push({
      role: 'user',
      content: `Context provided:\n${contextContent}`,
    })
  }

  if (fileAttachments && fileAttachments.length > 0) {
    const content: Array<{ type: 'text'; text: string } | any> = [{ type: 'text', text: message }]

    for (const { buffer, attachment } of fileAttachments) {
      const fileContent = createFileContent(buffer, attachment.media_type)
      if (fileContent) {
        content.push(fileContent)
      }
    }

    messages.push({
      role: 'user',
      content: content as any,
    })
  } else {
    messages.push({
      role: 'user',
      content: message,
    })
  }

  return messages
}

function convertTools(copilotTools?: CopilotToolConfig[]): ProviderToolConfig[] | undefined {
  if (!copilotTools || copilotTools.length === 0) return undefined

  return copilotTools.map((tool) => ({
    id: tool.name,
    name: tool.name,
    description: tool.description,
    params: tool.params || {},
    parameters: {
      type: 'object',
      properties: tool.input_schema?.properties || {},
      required: tool.input_schema?.required || [],
    },
    usageControl: tool.usageControl,
  }))
}
