import { createLogger } from '@sim/logger'
import type { StreamingExecution } from '@/executor/types'
import type { CopilotToolCall } from '@/stores/panel/copilot/types'

const logger = createLogger('CopilotStreamToSSE')

export interface ToolExecutor {
  execute: (toolCall: ToolCall) => Promise<ToolExecutionResult>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface ToolExecutionResult {
  success: boolean
  data?: any
  error?: string
}

export interface SSEEvent {
  type: string
  [key: string]: any
}

export async function convertStreamingToSSE(
  streamingExec: StreamingExecution,
  chatId?: string,
  toolExecutor?: ToolExecutor
): Promise<Response> {
  const { stream, execution } = streamingExec
  const responseId = crypto.randomUUID()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  logger.info('Converting streaming to SSE', {
    responseId,
    hasChatId: !!chatId,
    hasToolExecutor: !!toolExecutor,
  })

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          if (chatId) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'chat_id',
                  chatId,
                } as SSEEvent)}\n\n`
              )
            )
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'start',
                responseId,
              } as SSEEvent)}\n\n`
            )
          )

          const reader = stream.getReader()
          let fullContent = ''
          const toolCalls: Map<string, ToolCall> = new Map()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            fullContent += chunk
            buffer += chunk

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'content',
                  data: chunk,
                } as SSEEvent)}\n\n`
              )
            )

            await extractAndProcessToolCalls(buffer, toolCalls, async (tool) => {
              if (toolExecutor) {
                logger.info('Executing tool', { toolId: tool.id, toolName: tool.name })
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'tool_generating',
                      toolCallId: tool.id,
                      toolName: tool.name,
                    } as SSEEvent)}\n\n`
                  )
                )

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: 'tool_call',
                      data: tool,
                    } as SSEEvent)}\n\n`
                  )
                )

                const result = await toolExecutor.execute(tool)

                if (result.success) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'tool_result',
                        toolCallId: tool.id,
                        success: true,
                        result: result.data,
                      } as SSEEvent)}\n\n`
                    )
                  )
                } else {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: 'tool_error',
                        toolCallId: tool.id,
                        error: result.error || 'Unknown error',
                      } as SSEEvent)}\n\n`
                    )
                  )
                }
              }
            })

            const lastNewlineIndex = buffer.lastIndexOf('\n')
            if (lastNewlineIndex !== -1) {
              buffer = buffer.substring(lastNewlineIndex + 1)
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'done',
                responseId,
              } as SSEEvent)}\n\n`
            )
          )

          logger.info('SSE conversion completed', {
            responseId,
            contentLength: fullContent.length,
            toolCallsProcessed: toolCalls.size,
          })
        } catch (error) {
          logger.error('Error converting streaming to SSE', { error })
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error.message || 'Unknown error',
              } as SSEEvent)}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    }
  )
}

async function extractAndProcessToolCalls(
  content: string,
  toolCalls: Map<string, ToolCall>,
  processTool: (tool: ToolCall) => Promise<void>
): Promise<void> {
  const patterns = [
    /<function_call>\s*({[\s\S]*?})\s*<\/function_call>/g,
    /<tool_call>\s*({[\s\S]*?})\s*<\/tool_call>/g,
    /```tool_call\s*({[\s\S]*?})\s*```/g,
  ]

  const processedIds = new Set<string>()

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      try {
        const jsonStr = match[1]
        const parsed = JSON.parse(jsonStr)

        const toolId = parsed.id || crypto.randomUUID()
        if (processedIds.has(toolId)) continue
        processedIds.add(toolId)

        const tool: ToolCall = {
          id: toolId,
          name: parsed.name || parsed.function?.name,
          arguments: parsed.arguments || parsed.parameters || {},
        }

        if (!tool.name) continue

        if (!toolCalls.has(toolId)) {
          toolCalls.set(toolId, tool)
          await processTool(tool)
        }
      } catch (error) {
        logger.warn('Failed to parse tool call', { error, match: match[0] })
      }
    }
  }
}
