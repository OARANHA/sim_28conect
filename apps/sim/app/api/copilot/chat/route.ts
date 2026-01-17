import { db } from '@sim/db'
import { copilotChats } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, desc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import {
  CopilotToolExecutor,
  convertCopilotToProviderRequest,
  convertStreamingToSSE,
} from '@/lib/copilot/adapters'
import { getCopilotModel } from '@/lib/copilot/config'
import { getProviderConfig } from '@/lib/copilot/providers'
import {
  authenticateCopilotRequestSessionOnly,
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createRequestTracker,
  createUnauthorizedResponse,
} from '@/lib/copilot/request-helpers'
import { getCredentialsServerTool } from '@/lib/copilot/tools/server/user/get-credentials'
import { env } from '@/lib/core/config/env'
import { CopilotFiles } from '@/lib/uploads'
import { createFileContent } from '@/lib/uploads/utils/file-utils'
import { executeProviderRequest } from '@/providers'
import { isStreamingExecution } from '@/providers/index'
import { getProviderFromModel } from '@/providers/utils'
import { tools } from '@/tools/registry'

const logger = createLogger('CopilotChatAPI')

const FileAttachmentSchema = z.object({
  id: z.string(),
  key: z.string(),
  filename: z.string(),
  media_type: z.string(),
  size: z.number(),
})

const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  userMessageId: z.string().optional(),
  chatId: z.string().optional(),
  workflowId: z.string().min(1, 'Workflow ID is required'),
  model: z.string().min(1, 'Model name is required').optional().default('claude-4.5-opus'),
  mode: z.enum(['ask', 'agent', 'plan']).optional().default('agent'),
  prefetch: z.boolean().optional(),
  createNewChat: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(true),
  implicitFeedback: z.string().optional(),
  fileAttachments: z.array(FileAttachmentSchema).optional(),
  provider: z.string().optional(),
  conversationId: z.string().optional(),
  contexts: z
    .array(
      z.object({
        kind: z.enum([
          'past_chat',
          'workflow',
          'current_workflow',
          'blocks',
          'logs',
          'workflow_block',
          'knowledge',
          'templates',
          'docs',
        ]),
        label: z.string(),
        chatId: z.string().optional(),
        workflowId: z.string().optional(),
        knowledgeId: z.string().optional(),
        blockId: z.string().optional(),
        templateId: z.string().optional(),
        executionId: z.string().optional(),
      })
    )
    .optional(),
})

export async function POST(req: NextRequest) {
  const tracker = createRequestTracker()

  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return createUnauthorizedResponse()
    }

    const authenticatedUserId = session.user.id

    const body = await req.json()
    const {
      message,
      userMessageId,
      chatId,
      workflowId,
      model,
      mode,
      prefetch,
      createNewChat,
      stream,
      implicitFeedback,
      fileAttachments,
      provider,
      conversationId,
      contexts,
    } = ChatMessageSchema.parse(body)

    const userMessageIdToUse = userMessageId || crypto.randomUUID()

    try {
      logger.info(`[${tracker.requestId}] Received chat POST`, {
        hasContexts: Array.isArray(contexts),
        contextsCount: Array.isArray(contexts) ? contexts.length : 0,
        providerOverride: provider,
      })
    } catch {}

    let agentContexts: Array<{ type: string; content: string }> = []
    if (Array.isArray(contexts) && contexts.length > 0) {
      try {
        const { processContextsServer } = await import('@/lib/copilot/process-contents')
        const processed = await processContextsServer(contexts as any, authenticatedUserId, message)
        agentContexts = processed
        logger.info(`[${tracker.requestId}] Contexts processed for request`, {
          processedCount: agentContexts.length,
          kinds: agentContexts.map((c) => c.type),
        })
      } catch (e) {
        logger.error(`[${tracker.requestId}] Failed to process contexts`, e)
      }
    }

    let currentChat: any = null
    let conversationHistory: any[] = []
    let actualChatId = chatId

    if (chatId) {
      const [chat] = await db
        .select()
        .from(copilotChats)
        .where(and(eq(copilotChats.id, chatId), eq(copilotChats.userId, authenticatedUserId)))
        .limit(1)

      if (chat) {
        currentChat = chat
        conversationHistory = Array.isArray(chat.messages) ? chat.messages : []
      }
    } else if (createNewChat && workflowId) {
      const { model: defaultModel } = getCopilotModel('chat')
      const [newChat] = await db
        .insert(copilotChats)
        .values({
          userId: authenticatedUserId,
          workflowId,
          title: null,
          model: defaultModel,
          messages: [],
        })
        .returning()

      if (newChat) {
        currentChat = newChat
        actualChatId = newChat.id
      }
    }

    const processedFileContents: any[] = []
    if (fileAttachments && fileAttachments.length > 0) {
      const processedAttachments = await CopilotFiles.processCopilotAttachments(
        fileAttachments,
        tracker.requestId
      )

      for (const { buffer, attachment } of processedAttachments) {
        const fileContent = createFileContent(buffer, attachment.media_type)
        if (fileContent) {
          processedFileContents.push(fileContent)
        }
      }
    }

    const messages: any[] = []

    for (const msg of conversationHistory) {
      if (msg.fileAttachments && msg.fileAttachments.length > 0) {
        const content: any[] = [{ type: 'text', text: msg.content }]

        const processedHistoricalAttachments = await CopilotFiles.processCopilotAttachments(
          msg.fileAttachments,
          tracker.requestId
        )

        for (const { buffer, attachment } of processedHistoricalAttachments) {
          const fileContent = createFileContent(buffer, attachment.media_type)
          if (fileContent) {
            content.push(fileContent)
          }
        }

        messages.push({
          role: msg.role,
          content,
        })
      } else {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    if (implicitFeedback) {
      messages.push({
        role: 'system',
        content: implicitFeedback,
      })
    }

    if (processedFileContents.length > 0) {
      const content: any[] = [{ type: 'text', text: message }]

      for (const fileContent of processedFileContents) {
        content.push(fileContent)
      }

      messages.push({
        role: 'user',
        content,
      })
    } else {
      messages.push({
        role: 'user',
        content: message,
      })
    }

    const defaults = getCopilotModel('chat')
    const modelToUse = env.COPILOT_MODEL || defaults.model

    const providerConfig = getProviderConfig(provider)

    if (!providerConfig) {
      logger.warn(`[${tracker.requestId}] No provider configuration found, using server defaults`)
    } else {
      logger.info(`[${tracker.requestId}] Using provider configuration`, {
        provider: providerConfig.provider,
        model: modelToUse,
        isOverride: !!provider,
      })
    }

    const effectiveConversationId =
      (currentChat?.conversationId as string | undefined) || conversationId

    let integrationTools: any[] = []
    let baseTools: any[] = []
    let credentials: {
      oauth: Record<
        string,
        { accessToken: string; accountId: string; name: string; expiresAt?: string }
      >
      apiKeys: string[]
      metadata?: {
        connectedOAuth: Array<{ provider: string; name: string; scopes?: string[] }>
        configuredApiKeys: string[]
      }
    } | null = null

    if (mode === 'agent') {
      baseTools = [
        {
          name: 'function_execute',
          description:
            'Execute JavaScript code to perform calculations, data transformations, API calls, or any programmatic task.',
          input_schema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description:
                  'Raw JavaScript statements to execute. Code is auto-wrapped in async context. Use fetch() for HTTP requests.',
              },
            },
            required: ['code'],
          },
          executeLocally: true,
        },
      ]

      try {
        const rawCredentials = await getCredentialsServerTool.execute(
          { workflowId },
          { userId: authenticatedUserId }
        )

        const oauthMap: Record<string, { accessToken: string; accountId: string; name: string }> =
          {}
        const connectedOAuth: Array<{ provider: string; name: string; scopes?: string[] }> = []

        for (const cred of rawCredentials?.oauth?.connected?.credentials || []) {
          if (cred.accessToken) {
            oauthMap[cred.provider] = {
              accessToken: cred.accessToken,
              accountId: cred.id,
              name: cred.name,
            }
            connectedOAuth.push({
              provider: cred.provider,
              name: cred.name,
            })
          }
        }

        credentials = {
          oauth: oauthMap,
          apiKeys: rawCredentials?.environment?.variableNames || [],
          metadata: {
            connectedOAuth,
            configuredApiKeys: rawCredentials?.environment?.variableNames || [],
          },
        }

        logger.info(`[${tracker.requestId}] Fetched credentials for build mode`, {
          oauthProviders: Object.keys(oauthMap),
          apiKeyCount: credentials.apiKeys.length,
        })
      } catch (error) {
        logger.warn(`[${tracker.requestId}] Failed to fetch credentials`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }

      try {
        const { createUserToolSchema } = await import('@/tools/params')

        integrationTools = Object.entries(tools).map(([toolId, toolConfig]) => {
          const userSchema = createUserToolSchema(toolConfig)
          return {
            name: toolId,
            description: toolConfig.description || toolConfig.name || toolId,
            input_schema: userSchema,
            defer_loading: true,
            ...(toolConfig.oauth?.required && {
              oauth: {
                required: true,
                provider: toolConfig.oauth.provider,
              },
            }),
          }
        })

        logger.info(`[${tracker.requestId}] Built tool definitions for build mode`, {
          integrationToolCount: integrationTools.length,
        })
      } catch (error) {
        logger.warn(`[${tracker.requestId}] Failed to build tool definitions`, {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const providerId = getProviderFromModel(modelToUse)
    const providerRequest = convertCopilotToProviderRequest({
      message,
      model: modelToUse,
      mode,
      agentContexts,
      conversationHistory: messages,
      tools: integrationTools,
      stream,
      streamToolCalls: true,
      userId: authenticatedUserId,
      workspaceId: currentChat?.workspaceId,
      workflowId,
      chatId: actualChatId,
      fileAttachments: processedFileContents.map((fc) => ({
        buffer: fc.buffer,
        attachment: {
          id: fc.id,
          key: fc.key,
          filename: fc.filename,
          media_type: fc.media_type,
          size: fc.size,
        },
      })),
      implicitFeedback,
    })

    if (providerId === 'mistral') {
      providerRequest.apiKey = env.MISTRAL_API_KEY || env.COPILOT_API_KEY
    } else {
      providerRequest.apiKey = env.COPILOT_API_KEY
    }

    logger.info(`[${tracker.requestId}] Calling universal provider`, {
      providerId,
      model: modelToUse,
      hasTools: integrationTools.length > 0,
    })

    const result = await executeProviderRequest(providerId, providerRequest)

    if (isStreamingExecution(result)) {
      logger.info(`[${tracker.requestId}] Returning streaming response`, {
        providerId,
        model: modelToUse,
        chatId: actualChatId,
      })

      let toolExecutor: CopilotToolExecutor | undefined
      if (integrationTools.length > 0) {
        toolExecutor = new CopilotToolExecutor({
          tools: integrationTools,
          credentials: credentials,
          userId: authenticatedUserId,
          workspaceId: currentChat?.workspaceId,
          workflowId,
        })
      }

      return await convertStreamingToSSE(result, actualChatId, toolExecutor)
    }

    const responseData = result as any

    logger.info(`[${tracker.requestId}] Returning non-streaming response`, {
      hasContent: !!responseData.content,
      contentLength: responseData.content?.length || 0,
    })

    return NextResponse.json({
      success: true,
      response: responseData,
      chatId: actualChatId,
      metadata: {
        requestId: tracker.requestId,
        message,
        duration: tracker.getDuration(),
      },
    })
  } catch (error) {
    const duration = tracker.getDuration()

    if (error instanceof z.ZodError) {
      logger.error(`[${tracker.requestId}] Validation error:`, {
        duration,
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${tracker.requestId}] Error handling copilot chat:`, {
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workflowId = searchParams.get('workflowId')

    if (!workflowId) {
      return createBadRequestResponse('workflowId is required')
    }

    const { userId: authenticatedUserId, isAuthenticated } =
      await authenticateCopilotRequestSessionOnly()
    if (!isAuthenticated || !authenticatedUserId) {
      return createUnauthorizedResponse()
    }

    const chats = await db
      .select({
        id: copilotChats.id,
        title: copilotChats.title,
        model: copilotChats.model,
        messages: copilotChats.messages,
        planArtifact: copilotChats.planArtifact,
        config: copilotChats.config,
        createdAt: copilotChats.createdAt,
        updatedAt: copilotChats.updatedAt,
      })
      .from(copilotChats)
      .where(
        and(eq(copilotChats.userId, authenticatedUserId), eq(copilotChats.workflowId, workflowId))
      )
      .orderBy(desc(copilotChats.updatedAt))

    const transformedChats = chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      model: chat.model,
      messages: Array.isArray(chat.messages) ? chat.messages : [],
      messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
      planArtifact: chat.planArtifact || null,
      config: chat.config || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }))

    logger.info(`Retrieved ${transformedChats.length} chats for workflow ${workflowId}`)

    return NextResponse.json({
      success: true,
      chats: transformedChats,
    })
  } catch (error) {
    logger.error('Error fetching copilot chats:', error)
    return createInternalServerErrorResponse('Failed to fetch chats')
  }
}
