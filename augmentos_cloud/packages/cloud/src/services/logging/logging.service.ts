// src/services/logging/logging.service.ts

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import winston from 'winston';
import { WebSocket } from 'ws';
import { UserSession } from '@augmentos/sdk';

/**
 * Configuration options for the logging service
 */
interface LoggingConfig {
  sentryDsn?: string;
  environment: 'development' | 'staging' | 'production';
  logLevel: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  logFilePath?: string;
}

/**
 * Centralized logging service that handles both application logs and error tracking
 */
export class LoggingService {
  private logger: winston.Logger;
  private static instance: LoggingService;

  private constructor(config: LoggingConfig) {
    // Initialize Sentry if DSN is provided
    if (config.sentryDsn) {
      Sentry.init({
        dsn: config.sentryDsn,
        environment: config.environment,
        integrations: [
          nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0,
        // Set sampling rate for profiling
        profilesSampleRate: 1.0,
        beforeSend(event) {
          // Sanitize sensitive data
          if (event.request?.headers?.authorization) {
            event.request.headers.authorization = '[Filtered]';
          }
          return event;
        },
      });
    }

    // Configure Winston transports
    const transports: winston.transport[] = [];

    if (config.enableConsole) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
          })
        )
      }));
    }

    if (config.enableFile && config.logFilePath) {
      transports.push(new winston.transports.File({
        filename: config.logFilePath,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    // Create Winston logger
    this.logger = winston.createLogger({
      level: config.logLevel,
      transports
    });
  }

  /**
   * Get or create the singleton instance
   */
  public static getInstance(config?: LoggingConfig): LoggingService {
    if (!LoggingService.instance && config) {
      LoggingService.instance = new LoggingService(config);
    }
    return LoggingService.instance;
  }

  /**
   * Log WebSocket connection events
   */
  public logWebSocketConnection(ws: WebSocket, clientType: 'glasses' | 'tpa', metadata?: any) {
    const connectionInfo = {
      clientType,
      remoteAddress: (ws as any)._socket?.remoteAddress,
      ...metadata
    };

    this.logger.info('WebSocket connection established', connectionInfo);
    Sentry.addBreadcrumb({
      category: 'websocket',
      message: 'Connection established',
      level: 'info',
      data: connectionInfo
    });
  }

  /**
   * Log WebSocket message events
   */
  public logWebSocketMessage(message: any, direction: 'received' | 'sent', userSession?: UserSession) {
    const sanitizedMessage = this.sanitizeMessage(message);
    const logData = {
      direction,
      messageType: message.type,
      sessionId: userSession?.sessionId,
      userId: userSession?.userId,
      timestamp: new Date().toISOString()
    };

    this.logger.debug('WebSocket message', { ...logData, message: sanitizedMessage });
    Sentry.addBreadcrumb({
      category: 'websocket',
      message: `Message ${direction}`,
      level: 'debug',
      data: logData
    });
  }

  /**
   * Log WebSocket errors
   */
  public logWebSocketError(error: Error, userSession?: UserSession) {
    const errorInfo = {
      sessionId: userSession?.sessionId,
      userId: userSession?.userId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };

    this.logger.error('WebSocket error', errorInfo);
    Sentry.captureException(error, {
      extra: errorInfo
    });
  }

  /**
   * Log application errors with context
   */
  public logError(error: Error, context?: Record<string, any>) {
    this.logger.error(error.message, {
      error: {
        name: error.name,
        stack: error.stack
      },
      ...context
    });

    Sentry.captureException(error, {
      extra: context
    });
  }

  /**
   * Log application info with context
   */
  public logInfo(message: string, context?: Record<string, any>) {
    this.logger.info(message, context);
    Sentry.addBreadcrumb({
      category: 'app',
      message,
      level: 'info',
      data: context
    });
  }

  /**
   * Log performance metrics
   */
  public logPerformance(metric: string, value: number, tags?: Record<string, string>) {
    this.logger.info('Performance metric', {
      metric,
      value,
      tags
    });

    // Send to Sentry as a custom measurement
    Sentry.captureMessage('Performance metric', {
      extra: { metric, value, tags }
    });
  }

  /**
   * Helper method to sanitize sensitive data from messages
   */
  private sanitizeMessage(message: any): any {
    const sensitiveFields = ['token', 'apiKey', 'password', 'secret'];
    const sanitized = { ...message };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[FILTERED]';
      }
    }

    return sanitized;
  }

  /**
   * Clean up resources and flush logs
   */
  public async shutdown(): Promise<void> {
    await Sentry.close(2000);
    await new Promise<void>((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

// Example usage:
const logger = LoggingService.getInstance({
  sentryDsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
  logLevel: 'info',
  enableConsole: true,
  enableFile: true,
  logFilePath: 'logs/app.log'
});

export default logger;