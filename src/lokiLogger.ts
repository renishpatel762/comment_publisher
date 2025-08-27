import winston from 'winston';
import LokiTransport from 'winston-loki';

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new LokiTransport({
        host: 'http://127.0.0.1:3100',
        labels: { job: 'node-app' },
        json: true,
        batching: true,
        interval: 5, // seconds between batch sends
        timeout: 1000,
      }),
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  });

