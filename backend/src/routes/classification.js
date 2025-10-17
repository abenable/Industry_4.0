import { Router } from 'express';
import upload from '../utils/upload.js';
import {
    classifyImage,
    getUserHistory,
    getClassificationById,
    getUserStats,
    deleteClassification
} from '../controllers/classification.js';

const router = Router();

/**
 * @route   POST /api/classify
 * @desc    Upload and classify an image
 * @access  Public
 * @body    { email: string, cropType?: string }
 * @file    image (multipart/form-data)
 */
router.post('/classify', upload.single('image'), classifyImage);

/**
 * @route   GET /api/history
 * @desc    Get user's classification history
 * @access  Public
 * @query   { email: string, page?: number, limit?: number }
 */
router.get('/history', getUserHistory);

/**
 * @route   GET /api/classification/:id
 * @desc    Get a single classification by ID
 * @access  Public
 */
router.get('/classification/:id', getClassificationById);

/**
 * @route   GET /api/stats
 * @desc    Get user's statistics
 * @access  Public
 * @query   { email: string }
 */
router.get('/stats', getUserStats);

/**
 * @route   DELETE /api/classification/:id
 * @desc    Delete a classification record
 * @access  Public (owner only)
 * @body    { email: string }
 */
router.delete('/classification/:id', deleteClassification);

export default router;
