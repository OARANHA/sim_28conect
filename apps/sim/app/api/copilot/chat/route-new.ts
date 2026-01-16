import { copilotChats } from '@sim/db/schema'
import { createLogger } from '@sim/logger'
import { and, desc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { generateChatTitle } from '@/lib/copilot/chat-title'
import { getCopilotModel } from '@/lib/copilot/config'
import {
  authenticateCopilotRequestSessionOnly,
  createBadRequestResponse,
  createInternalServerErrorResponse,
  createRequestTracker,
  createUnauthorizedResponse,
} from '@/lib/copilot/request-helpers'
import { getCredentialsServerTool } from '@/lib/copilot/tools/server/user/get-credentials'
import type { CopilotProviderConfig } from '@/lib/copilot/types'
import { getProviderConfig } from '@/lib/copilot/providers'
import { env } from '@/lib/core/config/env'
import { CopilotFiles } from '@/lib/uploads'
import { createFileContent } from '@/lib/uploads/utils/file-utils'
import { tools } from '@/tools/registry'
import { executeProviderRequest } from '@/providers'
import { getProviderFromModel, isStreamingExecution } from '@/providers/utils'
import {
  convertCopilotToProviderRequest,
  CopilotToolExecutor,
  convertStreamingToSSE,
} from '@/lib/copilot/adapters'

const logger = createLogger('CopilotChatAPI')
