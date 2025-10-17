import moment from 'moment';
import { fileURLToPath } from 'url';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file'; // For log rotation

const getDirname = (moduleUrl) => {
  return path.dirname(fileURLToPath(moduleUrl));
};

const __dirname = getDirname(import.meta.url);
const { combine, timestamp, colorize, printf, splat } = format;

// Configurable log level
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'); // Debug in dev, info in prod

// Custom format
const customFormat = printf((info) => {
  const ts = moment.utc().add(3, 'hours').format('YYYY-MM-DD HH:mm:ss') + ' EAT'; // Keep EAT for now
  return `${ts} ${info.level}: ${info.message}`;
});

const logger = createLogger({
  level: logLevel,
  format: combine(
    splat(),
    timestamp(),
    colorize(),
    customFormat
  ),
  transports: [
    // Console transport (always enabled for development visibility)
    new transports.Console({
      format: combine(
        splat(),
        colorize(),
        customFormat
      ),
    }),
    // Daily rotating file transport
    new DailyRotateFile({
      filename: path.join(__dirname, '../logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m', // Max 20MB per file
      maxFiles: '14d', // Keep 14 days of logs
      format: combine(
        splat(),
        timestamp(),
        customFormat
      ),
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    ...(process.env.NODE_ENV !== 'production' ? [new transports.Console()] : []),
    new transports.File({ filename: path.join(__dirname, '../logs', 'exceptions.log') }),
  ],
  rejectionHandlers: [
    ...(process.env.NODE_ENV !== 'production' ? [new transports.Console()] : []),
    new transports.File({ filename: path.join(__dirname, '../logs', 'rejections.log') }),
  ],
});

export default logger;
