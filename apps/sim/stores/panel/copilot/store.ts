'use client'

import { createLogger } from '@sim/logger'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { type CopilotChat, sendStreamingMessage } from '@/lib/copilot/api'
import type {
  BaseClientToolMetadata,
  ClientToolDisplay,
} from '@/lib/copilot/tools/client/base-tool'
import { ClientToolCallState } from '@/lib/copilot/tools/client/base-tool'
import { GetBlockConfigClientTool } from '@/lib/copilot/tools/client/blocks/get-block-config'
import { GetBlockOptionsClientTool } from '@/lib/copilot/tools/client/blocks/get-block-options'
import { GetBlocksAndToolsClientTool } from '@/lib/copilot/tools/client/blocks/get-blocks-and-tools'
import { GetBlocksMetadataClientTool } from '@/lib/copilot/tools/client/blocks/get-blocks-metadata'
import { GetTriggerBlocksClientTool } from '@/lib/copilot/tools/client/blocks/get-trigger-blocks'
import { GetExamplesRagClientTool } from '@/lib/copilot/tools/client/examples/get-examples-rag'
import { GetOperationsExamplesClientTool } from '@/lib/copilot/tools/client/examples/get-operations-examples'
import { GetTriggerExamplesClientTool } from '@/lib/copilot/tools/client/examples/get-trigger-examples'
import { SummarizeClientTool } from '@/lib/copilot/tools/client/examples/summarize'
import { KnowledgeBaseClientTool } from '@/lib/copilot/tools/client/knowledge/knowledge-base'
import {
  getClientTool,
  registerClientTool,
  registerToolStateSync,
} from '@/lib/copilot/tools/client/manager'
import { NavigateUIClientTool } from '@/lib/copilot/tools/client/navigation/navigate-ui'
import { AuthClientTool } from '@/lib/copilot/tools/client/other/auth'
import { CheckoffTodoClientTool } from '@/lib/copilot/tools/client/other/checkoff-todo'
import { CustomToolClientTool } from '@/lib/copilot/tools/client/other/custom-tool'
import { DebugClientTool } from '@/lib/copilot/tools/client/other/debug'
import { DeployClientTool } from '@/lib/copilot/tools/client/other/deploy'
import { EditClientTool } from '@/lib/copilot/tools/client/other/edit'
import { EvaluateClientTool } from '@/lib/copilot/tools/client/other/evaluate'
import { InfoClientTool } from '@/lib/copilot/tools/client/other/info'
import { KnowledgeClientTool } from '@/lib/copilot/tools/client/other/knowledge'
import { MakeApiRequestClientTool } from '@/lib/copilot/tools/client/other/make-api-request'
import { MarkTodoInProgressClientTool } from '@/lib/copilot/tools/client/other/mark-todo-in-progress'
import { OAuthRequestAccessClientTool } from '@/lib/copilot/tools/client/other/oauth-request-access'
import { PlanClientTool } from '@/lib/copilot/tools/client/other/plan'
import { RememberDebugClientTool } from '@/lib/copilot/tools/client/other/remember-debug'
import { ResearchClientTool } from '@/lib/copilot/tools/client/other/research'
import { SearchDocumentationClientTool } from '@/lib/copilot/tools/client/other/search-documentation'
import { SearchErrorsClientTool } from '@/lib/copilot/tools/client/other/search-errors'
import { SearchOnlineClientTool } from '@/lib/copilot/tools/client/other/search-online'
import { SearchPatternsClientTool } from '@/lib/copilot/tools/client/other/search-patterns'
import { SleepClientTool } from '@/lib/copilot/tools/client/other/sleep'
import { TestClientTool } from '@/lib/copilot/tools/client/other/test'
import { TourClientTool } from '@/lib/copilot/tools/client/other/tour'
import { WorkflowClientTool } from '@/lib/copilot/tools/client/other/workflow'
import { createExecutionContext, getTool } from '@/lib/copilot/tools/client/registry'
import { GetCredentialsClientTool } from '@/lib/copilot/tools/client/user/get-credentials'
import { SetEnvironmentVariablesClientTool } from '@/lib/copilot/tools/client/user/set-environment-variables'
import { CheckDeploymentStatusClientTool } from '@/lib/copilot/tools/client/workflow/check-deployment-status'
import { CreateWorkspaceMcpServerClientTool } from '@/lib/copilot/tools/client/workflow/create-workspace-mcp-server'
import { DeployApiClientTool } from '@/lib/copilot/tools/client/workflow/deploy-api'
import { DeployChatClientTool } from '@/lib/copilot/tools/client/workflow/deploy-chat'
import { DeployMcpClientTool } from '@/lib/copilot/tools/client/workflow/deploy-mcp'
import { EditWorkflowClientTool } from '@/lib/copilot/tools/client/workflow/edit-workflow'
import { GetBlockOutputsClientTool } from '@/lib/copilot/tools/client/workflow/get-block-outputs'
import { GetBlockUpstreamReferencesClientTool } from '@/lib/copilot/tools/client/workflow/get-block-upstream-references'
import { GetUserWorkflowClientTool } from '@/lib/copilot/tools/client/workflow/get-user-workflow'
import { GetWorkflowConsoleClientTool } from '@/lib/copilot/tools/client/workflow/get-workflow-console'
import { GetWorkflowDataClientTool } from '@/lib/copilot/tools/client/workflow/get-workflow-data'
import { GetWorkflowFromNameClientTool } from '@/lib/copilot/tools/client/workflow/get-workflow-from-name'
import { ListUserWorkflowsClientTool } from '@/lib/copilot/tools/client/workflow/list-user-workflows'
import { ListWorkspaceMcpServersClientTool } from '@/lib/copilot/tools/client/workflow/list-workspace-mcp-servers'
import { ManageCustomToolClientTool } from '@/lib/copilot/tools/client/workflow/manage-custom-tool'
import { ManageMcpToolClientTool } from '@/lib/copilot/tools/client/workflow/manage-mcp-tool'
import { RunWorkflowClientTool } from '@/lib/copilot/tools/client/workflow/run-workflow'
import { SetGlobalWorkflowVariablesClientTool } from '@/lib/copilot/tools/client/workflow/set-global-workflow-variables'
import { getQueryClient } from '@/app/_shell/providers/query-provider'
import { subscriptionKeys } from '@/hooks/queries/subscription'
import type {
  ChatContext,
  CopilotMessage,
  CopilotStore,
  CopilotToolCall,
  MessageFileAttachment,
} from '@/stores/panel/copilot/types'
import { useWorkflowDiffStore } from '@/stores/workflow-diff/store'
import { useSubBlockStore } from '@/stores/workflows/subblock/store'
import { useWorkflowStore } from '@/stores/workflows/workflow/store'

const logger = createLogger('CopilotStore')

// On module load, clear any lingering diff preview (fresh page refresh)
try {
  const diffStore = useWorkflowDiffStore.getState()
  if (diffStore?.hasActiveDiff) {
    diffStore.clearDiff()
  }
} catch {}

// Known class-based client tools: map tool name -> instantiator
const CLIENT_TOOL_INSTANTIATORS: Record<string, (id: string) => any> = {
  plan: (id) => new PlanClientTool(id),
  edit: (id) => new EditClientTool(id),
  debug: (id) => new DebugClientTool(id),
  test: (id) => new TestClientTool(id),
  deploy: (id) => new DeployClientTool(id),
  evaluate: (id) => new EvaluateClientTool(id),
  auth: (id) => new AuthClientTool(id),
  research: (id) => new ResearchClientTool(id),
  knowledge: (id) => new KnowledgeClientTool(id),
  custom_tool: (id) => new CustomToolClientTool(id),
  tour: (id) => new TourClientTool(id),
  info: (id) => new InfoClientTool(id),
  workflow: (id) => new WorkflowClientTool(id),
  run_workflow: (id) => new RunWorkflowClientTool(id),
  get_workflow_console: (id) => new GetWorkflowConsoleClientTool(id),
  get_blocks_and_tools: (id) => new GetBlocksAndToolsClientTool(id),
  get_blocks_metadata: (id) => new GetBlocksMetadataClientTool(id),
  get_block_options: (id) => new GetBlockOptionsClientTool(id),
  get_block_config: (id) => new GetBlockConfigClientTool(id),
  get_trigger_blocks: (id) => new GetTriggerBlocksClientTool(id),
  search_online: (id) => new SearchOnlineClientTool(id),
  search_documentation: (id) => new SearchDocumentationClientTool(id),
  search_patterns: (id) => new SearchPatternsClientTool(id),
  search_errors: (id) => new SearchErrorsClientTool(id),
  remember_debug: (id) => new RememberDebugClientTool(id),
  set_environment_variables: (id) => new SetEnvironmentVariablesClientTool(id),
  get_credentials: (id) => new GetCredentialsClientTool(id),
  knowledge_base: (id) => new KnowledgeBaseClientTool(id),
  make_api_request: (id) => new MakeApiRequestClientTool(id),
  checkoff_todo: (id) => new CheckoffTodoClientTool(id),
  mark_todo_in_progress: (id) => new MarkTodoInProgressClientTool(id),
  oauth_request_access: (id) => new OAuthRequestAccessClientTool(id),
  edit_workflow: (id) => new EditWorkflowClientTool(id),
  get_user_workflow: (id) => new GetUserWorkflowClientTool(id),
  list_user_workflows: (id) => new ListUserWorkflowsClientTool(id),
  get_workflow_from_name: (id) => new GetWorkflowFromNameClientTool(id),
  get_workflow_data: (id) => new GetWorkflowDataClientTool(id),
  set_global_workflow_variables: (id) => new SetGlobalWorkflowVariablesClientTool(id),
  get_trigger_examples: (id) => new GetTriggerExamplesClientTool(id),
  get_examples_rag: (id) => new GetExamplesRagClientTool(id),
  get_operations_examples: (id) => new GetOperationsExamplesClientTool(id),
  summarize_conversation: (id) => new SummarizeClientTool(id),
  deploy_api: (id) => new DeployApiClientTool(id),
  deploy_chat: (id) => new DeployChatClientTool(id),
  deploy_mcp: (id) => new DeployMcpClientTool(id),
  list_workspace_mcp_servers: (id) => new ListWorkspaceMcpServersClientTool(id),
  create_workspace_mcp_server: (id) => new CreateWorkspaceMcpServerClientTool(id),
  check_deployment_status: (id) => new CheckDeploymentStatusClientTool(id),
  navigate_ui: (id) => new NavigateUIClientTool(id),
  manage_custom_tool: (id) => new ManageCustomToolClientTool(id),
  manage_mcp_tool: (id) => new ManageMcpToolClientTool(id),
  sleep: (id) => new SleepClientTool(id),
  get_block_outputs: (id) => new GetBlockOutputsClientTool(id),
  get_block_upstream_references: (id) => new GetBlockUpstreamReferencesClientTool(id),
}

// Read-only static metadata for class-based tools (no instances)
export const CLASS_TOOL_METADATA: Record<string, BaseClientToolMetadata | undefined> = {
  plan: (PlanClientTool as any)?.metadata,
  edit: (EditClientTool as any)?.metadata,
  debug: (DebugClientTool as any)?.metadata,
  test: (TestClientTool as any)?.metadata,
  deploy: (DeployClientTool as any)?.metadata,
  evaluate: (EvaluateClientTool as any)?.metadata,
  auth: (AuthClientTool as any)?.metadata,
  research: (ResearchClientTool as any)?.metadata,
  knowledge: (KnowledgeClientTool as any)?.metadata,
  custom_tool: (CustomToolClientTool as any)?.metadata,
  tour: (TourClientTool as any)?.metadata,
  info: (InfoClientTool as any)?.metadata,
  workflow: (WorkflowClientTool as any)?.metadata,
  run_workflow: (RunWorkflowClientTool as any)?.metadata,
  get_workflow_console: (GetWorkflowConsoleClientTool as any)?.metadata,
  get_blocks_and_tools: (GetBlocksAndToolsClientTool as any)?.metadata,
  get_blocks_metadata: (GetBlocksMetadataClientTool as any)?.metadata,
  get_block_options: (GetBlockOptionsClientTool as any)?.metadata,
  get_block_config: (GetBlockConfigClientTool as any)?.metadata,
  get_trigger_blocks: (GetTriggerBlocksClientTool as any)?.metadata,
  search_online: (SearchOnlineClientTool as any)?.metadata,
  search_documentation: (SearchDocumentationClientTool as any)?.metadata,
  search_patterns: (SearchPatternsClientTool as any)?.metadata,
  search_errors: (SearchErrorsClientTool as any)?.metadata,
  remember_debug: (RememberDebugClientTool as any)?.metadata,
  set_environment_variables: (SetEnvironmentVariablesClientTool as any)?.metadata,
  get_credentials: (GetCredentialsClientTool as any)?.metadata,
  knowledge_base: (KnowledgeBaseClientTool as any)?.metadata,
  make_api_request: (MakeApiRequestClientTool as any)?.metadata,
  checkoff_todo: (CheckoffTodoClientTool as any)?.metadata,
  mark_todo_in_progress: (MarkTodoInProgressClientTool as any)?.metadata,
  edit_workflow: (EditWorkflowClientTool as any)?.metadata,
  get_user_workflow: (GetUserWorkflowClientTool as any)?.metadata,
  list_user_workflows: (ListUserWorkflowsClientTool as any)?.metadata,
  get_workflow_from_name: (GetWorkflowFromNameClientTool as any)?.metadata,
  get_workflow_data: (GetWorkflowDataClientTool as any)?.metadata,
  set_global_workflow_variables: (SetGlobalWorkflowVariablesClientTool as any)?.metadata,
  get_trigger_examples: (GetTriggerExamplesClientTool as any)?.metadata,
  get_examples_rag: (GetExamplesRagClientTool as any)?.metadata,
  oauth_request_access: (OAuthRequestAccessClientTool as any)?.metadata,
  get_operations_examples: (GetOperationsExamplesClientTool as any)?.metadata,
  summarize_conversation: (SummarizeClientTool as any)?.metadata,
  deploy_api: (DeployApiClientTool as any)?.metadata,
  deploy_chat: (DeployChatClientTool as any)?.metadata,
  deploy_mcp: (DeployMcpClientTool as any)?.metadata,
  list_workspace_mcp_servers: (ListWorkspaceMcpServersClientTool as any)?.metadata,
  create_workspace_mcp_server: (CreateWorkspaceMcpServerClientTool as any)?.metadata,
  check_deployment_status: (CheckDeploymentStatusClientTool as any)?.metadata,
  navigate_ui: (NavigateUIClientTool as any)?.metadata,
  manage_custom_tool: (ManageCustomToolClientTool as any)?.metadata,
  manage_mcp_tool: (ManageMcpToolClientTool as any)?.metadata,
  sleep: (SleepClientTool as any)?.metadata,
  get_block_outputs: (GetBlockOutputsClientTool as any)?.metadata,
  get_block_upstream_references: (GetBlockUpstreamReferencesClientTool as any)?.metadata,
}

function ensureClientToolInstance(toolName: string | undefined, toolCallId: string | undefined) {
  try {
    if (!toolName || !toolCallId) return
    if (getClientTool(toolCallId)) return
    const make = CLIENT_TOOL_INSTANTIATORS[toolName]
    if (make) {
      const inst = make(toolCallId)
      registerClientTool(toolCallId, inst)
    }
  } catch {}
}

// Constants
const TEXT_BLOCK_TYPE = 'text'
const THINKING_BLOCK_TYPE = 'thinking'
const DATA_PREFIX = 'data: '
const DATA_PREFIX_LENGTH = 6

// Resolve display text/icon for a tool based on its state
function resolveToolDisplay(
  toolName: string | undefined,
  state: ClientToolCallState,
  toolCallId?: string,
  params?: Record<string, any>
): ClientToolDisplay | undefined {
  try {
    if (!toolName) return undefined
    const def = getTool(toolName) as any
    const toolMetadata = def?.metadata || CLASS_TOOL_METADATA[toolName]
    const meta = toolMetadata?.displayNames || {}

    // Exact state first
    const ds = meta?.[state]
    if (ds?.text || ds?.icon) {
      // Check if tool has a dynamic text formatter
      const getDynamicText = toolMetadata?.getDynamicText
      if (getDynamicText && params) {
        try {
          const dynamicText = getDynamicText(params, state)
          if (dynamicText) {
            return { text: dynamicText, icon: ds.icon }
          }
        } catch (e) {
          // Fall back to static text if formatter fails
        }
      }
      return { text: ds.text, icon: ds.icon }
    }

    // Fallback order (prefer pre-execution states for unknown states like pending)
    const fallbackOrder: ClientToolCallState[] = [
      (ClientToolCallState as any).generating,
      (ClientToolCallState as any).executing,
      (ClientToolCallState as any).review,
      (ClientToolCallState as any).success,
      (ClientToolCallState as any).error,
      (ClientToolCallState as any).rejected,
    ]
    for (const key of fallbackOrder) {
      const cand = meta?.[key]
      if (cand?.text || cand?.icon) return { text: cand.text, icon: cand.icon }
    }
  } catch {}
  // Humanized fallback as last resort - include state verb for proper verb-noun styling
  try {
    if (toolName) {
      const formattedName = toolName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      // Add state verb prefix for verb-noun rendering in tool-call component
      let stateVerb: string
      switch (state) {
        case ClientToolCallState.pending:
        case ClientToolCallState.executing:
          stateVerb = 'Executing'
          break
        case ClientToolCallState.success:
          stateVerb = 'Executed'
          break
        case ClientToolCallState.error:
          stateVerb = 'Failed'
          break
        case ClientToolCallState.rejected:
        case ClientToolCallState.aborted:
          stateVerb = 'Skipped'
          break
        default:
          stateVerb = 'Executing'
      }
      return { text: `${stateVerb} ${formattedName}`, icon: undefined as any }
    }
  } catch {}
  return undefined
}

// Helper: check if a tool state is rejected
function isRejectedState(state: any): boolean {
  try {
    return state === 'rejected' || state === (ClientToolCallState as any).rejected
  } catch {
    return state === 'rejected'
  }
}

// Helper: check if a tool state is review (terminal for build/edit preview)
function isReviewState(state: any): boolean {
  try {
    return state === 'review' || state === (ClientToolCallState as any).review
  } catch {
    return state === 'review'
  }
}

// Helper: check if a tool state is background (terminal)
function isBackgroundState(state: any): boolean {
  try {
    return state === 'background' || state === (ClientToolCallState as any).background
  } catch {
    return state === 'background'
  }
}

/**
 * Checks if a tool call state is terminal (success, error, rejected, aborted, review, or background)
 */
function isTerminalState(state: any): boolean {
  return (
    state === ClientToolCallState.success ||
    state === ClientToolCallState.error ||
    state === ClientToolCallState.rejected ||
    state === ClientToolCallState.aborted ||
    isReviewState(state) ||
    isBackgroundState(state)
  )
}

// Helper: abort all in-progress client tools and update inline blocks
function abortAllInProgressTools(set: any, get: () => CopilotStore) {
  try {
    const { toolCallsById, messages } = get()
    const updatedMap = { ...toolCallsById }
    const abortedIds = new Set<string>()
    for (const [id, tc] of Object.entries(toolCallsById)) {
      const st = tc.state as any
      // Abort anything not already terminal success/error/rejected/aborted
      const isTerminal =
        st === ClientToolCallState.success ||
        st === ClientToolCallState.error ||
        st === ClientToolCallState.rejected ||
        st === ClientToolCallState.aborted
      if (!isTerminal || isReviewState(st)) {
        abortedIds.add(id)
        updatedMap[id] = {
          ...tc,
          state: ClientToolCallState.aborted,
          display: resolveToolDisplay(tc.name, ClientToolCallState.aborted, id, (tc as any).params),
        }
      }
    }
    if (abortedIds.size > 0) {
      set({ toolCallsById: updatedMap })
      // Update inline blocks in-place for the latest assistant message only (most relevant)
      set((s: CopilotStore) => {
        const msgs = [...s.messages]
        for (let mi = msgs.length - 1; mi >= 0; mi--) {
          const m = msgs[mi] as any
          if (m.role !== 'assistant' || !Array.isArray(m.contentBlocks)) continue
          let changed = false
          const blocks = m.contentBlocks.map((b: any) => {
            if (b?.type === 'tool_call' && b.toolCall?.id && abortedIds.has(b.toolCall.id)) {
              changed = true
              const prev = b.toolCall
              return {
                ...b,
                toolCall: {
                  ...prev,
                  state: ClientToolCallState.aborted,
                  display: resolveToolDisplay(
                    prev?.name,
                    ClientToolCallState.aborted,
                    prev?.id,
                    prev?.params
                  ),
                },
              }
            }
            return b
          })
          if (changed) {
            msgs[mi] = { ...m, contentBlocks: blocks }
            break
          }
        }
        return { messages: msgs }
      })
    }
  } catch {}
}

// CONTINUA NO PRÓXIMO COMENTÁRIO...
// (devido ao limite de caracteres, vou dividir o arquivo)