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
import {
  authenticateCopilotRequestSessionOnly,
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createRequestTracker,
  createUnauthorizedResponse,
} from '@/lib/copilot/request-helpers'
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
  userMessageId: z.string().optional(), // ID from frontend for the user message
  chatId: z.string().optional(),
  workflowId: z.string().min(1, 'Workflow ID is required'),
  model: z
    .string()
    .min(1, 'Model name is required')
    .optional()
    .default('claude-4.5-opus'),
  mode: z.enum(['ask', 'agent', 'plan']).optional().default('agent'),
  prefetch: z.boolean().optional(),
  createNewChat: z.boolean().optional().default(false),
  stream: z.boolean().optional().default(true),
  implicitFeedback: z.string().optional(),
  fileAttachments: z.array(FileAttachmentSchema).optional(),
  provider: z.string().optional(), // Runtime provider selection from UI
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
        // For workflow_block, provide both workflowId and blockId
      })
    )
    .optional(),
})

/**
 * POST /api/copilot/chat
 * Send messages to sim agent and handle chat persistence
 */
export async function POST(req: NextRequest) {
  const tracker = createRequestTracker()

  try {
    // Get session to access user information including name
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
    // Ensure we have a consistent user message ID for this request
    const userMessageIdToUse = userMessageId || crypto.randomUUID()
    try {
      logger.info(`[${tracker.requestId}] Received chat POST`, {
        hasContexts: Array.isArray(contexts),
        contextsCount: Array.isArray(contexts) ? contexts.length : 0,
        contextsPreview: Array.isArray(contexts)
          ? contexts.map((c: any) => ({
              kind: c?.kind,
              chatId: c?.chatId,
              workflowId: c?.workflowId,
              executionId: (c as any)?.executionId,
              label: c?.label,
            }))
          : undefined,
        providerOverride: provider, // Log provider selection
      })
    } catch {}
    // Preprocess contexts server-side
    let agentContexts: Array<{ type: string; content: string }> = []
    if (Array.isArray(contexts) && contexts.length > 0) {
      try {
        const { processContextsServer } = await import('@/lib/copilot/process-contents')
        const processed = await processContextsServer(contexts as any, authenticatedUserId, message)
        agentContexts = processed
        logger.info(`[${tracker.requestId}] Contexts processed for request`, {
          processedCount: agentContexts.length,
          kinds: agentContexts.map((c) => c.type),
          lengthPreview: agentContexts.map((c) => c.content?.length ?? 0),
        })
        if (Array.isArray(contexts) && contexts.length > 0 && agentContexts.length === 0) {
          logger.warn(
            `[${tracker.requestId}] Contexts provided but none processed. Check executionId for logs contexts.`
          )
        }
      } catch (e) {
        logger.error(`[${tracker.requestId}] Failed to process contexts`, e)
      }
    }

    // Handle chat context
    let currentChat: any = null
    let conversationHistory: any[] = []
    let actualChatId = chatId

    if (chatId) {
      // Load existing chat
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
      // Create new chat
      const { provider, model } = getCopilotModel('chat')
      const [newChat] = await db
        .insert(copilotChats)
        .values({
          userId: authenticatedUserId,
          workflowId,
          title: null,
          model,
          messages: [],
        })
        .returning()

      if (newChat) {
        currentChat = newChat
        actualChatId = newChat.id
      }
    }

    // Process file attachments if present
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

    // Build messages array for sim agent with conversation history
    const messages: any[] = []

    // Add conversation history (need to rebuild these with file support if they had attachments)
    for (const msg of conversationHistory) {
      if (msg.fileAttachments && msg.fileAttachments.length > 0) {
        // This is a message with file attachments - rebuild with content array
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
        // Regular text-only message
        messages.push({
          role: msg.role,
          content: msg.content,
      })
    }

  } catch (error) 
        logger.warn(`[${tracker.requestId}] Failed to fetch credentials`, {
          error: error instanceof Error ? error.message : String(error),
        })

      // Build tool definitions (schemas only)
      try {
        const { createUserToolSchema } = await import('@/tools/params')

        integrationTools = Object.entries(tools).map(([toolId, toolConfig]) => {
          const userSchema = createUserToolSchema(toolConfig)
          return {
            name: toolId,
            description: toolConfig.description || toolConfig.name || toolId,
            input_schema: userSchema,
            defer_loading: true, // Anthropic Advanced Tool Use
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
			buffer: Buffer.from(0),
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
	
  }

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

    // Get authenticated user using consolidated helper
    const { userId: authenticatedUserId, isAuthenticated } =
      await authenticateCopilotRequestSessionOnly()
    if (!isAuthenticated || !authenticatedUserId) {
      return createUnauthorizedResponse()
    }

    // Fetch chats for this user and workflow
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

    // Transform the data to include message count
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
