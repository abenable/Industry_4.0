import { Router } from 'express';
import classificationRouter from '../routes/classification.js';
import userRouter from '../routes/user.js';
import { healthCheck } from './main.js';

const router = Router();

// Health check endpoint
router.get('/', healthCheck);

// Mount classification routes
router.use('/api', classificationRouter);

// Mount user routes
router.use('/user', userRouter);

export default router;