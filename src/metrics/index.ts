// metrics/prometheus.ts
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics for Comment Publisher Service
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register]
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'service'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const redisOperationsTotal = new Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register]
});

export const commentsPublishedTotal = new Counter({
  name: 'comments_published_total',
  help: 'Total number of comments published',
  labelNames: ['video_id'],
  registers: [register]
});

export const activeConnections = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections',
  registers: [register]
});

export const cassandraOperationsTotal = new Counter({
  name: 'cassandra_operations_total',
  help: 'Total number of Cassandra operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

export const cassandraOperationDuration = new Histogram({
  name: 'cassandra_operation_duration_seconds',
  help: 'Duration of Cassandra operations in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register]
});

// Middleware to track HTTP requests
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString(), 'comment_publisher')
      .inc();
    
    httpRequestDuration
      .labels(req.method, route, 'comment_publisher')
      .observe(duration);
  });
  
  next();
};

// Redis operation wrapper
export const trackRedisOperation = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    redisOperationsTotal.labels(operation, 'success').inc();
    redisOperationDuration.labels(operation).observe((Date.now() - start) / 1000);
    return result;
  } catch (error) {
    redisOperationsTotal.labels(operation, 'error').inc();
    throw error;
  }
};

// Cassandra operation wrapper
export const trackCassandraOperation = async <T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    cassandraOperationsTotal.labels(operation, 'success').inc();
    cassandraOperationDuration.labels(operation).observe((Date.now() - start) / 1000);
    return result;
  } catch (error) {
    cassandraOperationsTotal.labels(operation, 'error').inc();
    throw error;
  }
};

// Export the register to expose metrics
export { register };