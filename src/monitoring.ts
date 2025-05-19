import express, { NextFunction, Request, Response } from 'express';
import { Counter, Histogram, collectDefaultMetrics, Registry } from 'prom-client';
import responseTime from 'response-time';

const register = new Registry();

// Collect default Node.js/runtime metrics
collectDefaultMetrics({ register });

// // Custom counter: total HTTP requests
// const httpRequestCounter = new Counter({
//   name: 'http_requests_total',
//   help: 'Total number of HTTP requests',
//   labelNames: ['method', 'route', 'status_code'],
// });
// register.registerMetric(httpRequestCounter);

// // Custom histogram: HTTP request durations
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 500, 1000, 1500, 2000, 5000],
});
register.registerMetric(httpRequestDuration);

// Create a router that instruments every request and exposes /metrics
const router = express.Router();

export const prometheusResponseTime = responseTime((req: Request, res: Response, timeMs: number) => {
    const route = req.route?.path || req.path;
    // record observation (convert ms → s)
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(timeMs);
});

const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP request',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestCounter);

// Middleware to increment total request counter
export function prometheusRequestCounter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    httpRequestCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  next();
}



// Middleware: start timer, increment counter on finish, record duration
// router.use((req: Request, res: Response, next) => {
//   const endTimer = httpRequestDuration.startTimer();
//   res.on('finish', () => {
//     const route = req.route?.path || req.path;
//     httpRequestCounter.labels(req.method, route, res.statusCode.toString()).inc();
//     endTimer({ method: req.method, route, status_code: res.statusCode });
//   });
//   next();
// });

// Expose metrics
router.get('/', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
