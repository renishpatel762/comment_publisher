// lokiLogger.ts
import winston from 'winston';
import LokiTransport from 'winston-loki';
import os from 'os';

const serviceName = process.env.SERVICE_NAME || 'comment_publisher';
const environment = process.env.NODE_ENV || 'development';
const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100';

// Create Winston logger with Loki transport
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: serviceName,
    environment: environment,
    version: process.env.SERVICE_VERSION || '1.0.0',
    replica: os.hostname()
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Loki transport for centralized logging
    new LokiTransport({
      host: lokiUrl,
      labels: {
        service: serviceName,
        environment: environment,
        job: 'docker-containers'
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => {
        console.error('Loki connection error:', err);
      }
    })
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console(),
    new LokiTransport({
      host: lokiUrl,
      labels: {
        service: serviceName,
        environment: environment,
        level: 'error',
        type: 'exception'
      }
    })
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    new LokiTransport({
      host: lokiUrl,
      labels: {
        service: serviceName,
        environment: environment,
        level: 'error',
        type: 'rejection'
      }
    })
  ]
});

// Create structured logging functions
export const loggers = {
  // HTTP request logging
  request: (req: any, duration?: number) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      duration: duration ? `${duration}ms` : undefined
    });
  },

  // Redis operation logging
  redis: (operation: string, success: boolean, duration?: number, extra?: any) => {
    logger.info('Redis Operation', {
      operation,
      success,
      duration: duration ? `${duration}ms` : undefined,
      ...extra
    });
  },

  // SSE connection logging
  sse: (event: string, videoId: string, extra?: any) => {
    logger.info('SSE Event', {
      event,
      videoId,
      ...extra
    });
  },

  // Business logic logging
  business: (event: string, data: any) => {
    logger.info('Business Event', {
      event,
      ...data
    });
  },

  // Error logging with context
  error: (message: string, error: any, context?: any) => {
    logger.error(message, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      ...context
    });
  }
};

// Middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    loggers.request(req, duration);
  });
  
  next();
};
// import winston from 'winston';
// import LokiTransport from 'winston-loki';

// export const logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.json(),
//     transports: [
//       new LokiTransport({
//         host: 'http://127.0.0.1:3100',
//         labels: { job: 'node-app' },
//         json: true,
//         batching: true,
//         interval: 5, // seconds between batch sends
//         timeout: 1000,
//       }),
//       new winston.transports.Console({
//         format: winston.format.simple(),
//       }),
//     ],
//   });

