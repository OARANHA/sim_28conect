import { createLogger } from '@sim/logger'
import { NextResponse } from 'next/server'
import { getProviderConfig, validateProviderConfig, getProviderInfo } from '@/lib/copilot/providers'

const logger = createLogger('HealthCheck')

/**
 * GET /api/health
 * Health check endpoint that returns provider configuration status
 */
export async function GET() {
  try {
    const validationResult = validateProviderConfig()
    const providerInfo = getProviderInfo()

    const healthStatus = {
      status: validationResult.isValid ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      provider: providerInfo.provider,
      model: providerInfo.model,
      configured: providerInfo.configured,
      config: providerInfo.config,
      ...(validationResult.error ? { error: validationResult.error } : {}),
    }

    // Log health check result
    if (validationResult.isValid) {
      logger.info('Health check passed', {
        provider: providerInfo.provider,
        model: providerInfo.model,
        hasApiKey: providerInfo.config?.hasApiKey,
      })
    } else {
      logger.warn('Health check failed', {
        provider: providerInfo.provider,
        error: validationResult.error,
      })
    }

    const statusCode = validationResult.isValid ? 200 : 503
    return NextResponse.json(healthStatus, { status: statusCode })
  } catch (error) {
    logger.error('Health check error:', error)
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
