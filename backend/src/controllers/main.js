import { ApiError } from './error.js';
import logger from '../utils/logger.js';

/**
 * Health check endpoint
 */
export const healthCheck = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'AgriV AI API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    next(new ApiError(500, error.message));
  }
};
