import { ApiError } from './error.js';
import logger from '../utils/logger.js';
import { uploadToS3 } from '../utils/s3.js';
import genAIService from '../utils/genai.js';
import { prisma } from '../index.js';
import inferenceClient from '../utils/inference-client.js';

/**
 * Handle image upload and classification workflow
 * Steps:
 * 1. Validate email and create/get user
 * 2. Upload image to S3
 * 3. Send image to AI inference API for classification
 * 4. Send classification results to GenAI for insights
 * 5. Save everything to database
 * 6. Return response to client
 */
export const classifyImage = async (req, res, next) => {
    let uploadedImageUrl = null;
    let uploadedImageKey = null;

    try {
        logger.info('Classification request received');

        // Validate request
        if (!req.file) {
            return next(new ApiError(400, 'No image file provided'));
        }

        const { email, cropType } = req.body;

        if (!email) {
            return next(new ApiError(400, 'Email is required'));
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return next(new ApiError(400, 'Invalid email format'));
        }

        // Step 1: Get or create user
        logger.info(`Processing request for email: ${email}`);
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            logger.info(`Creating new user for email: ${email}`);
            user = await prisma.user.create({
                data: {
                    email,
                    fullName: email.split('@')[0], // Use email prefix as default name
                }
            });
        }

        // Step 2: Upload image to S3
        logger.info('Uploading image to S3...');
        const s3Result = await uploadToS3(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            'crop-images'
        );
        uploadedImageUrl = s3Result.url;
        uploadedImageKey = s3Result.key;

        logger.info(`Image uploaded to S3: ${uploadedImageUrl}`);

        // Step 3: Send image to AI inference API
        logger.info('Sending image to AI inference API...');

        // Determine model based on crop type
        const modelName = cropType?.toLowerCase() === 'maize' ? 'maize' : 'bean';

        const classificationResult = await inferenceClient.predict(
            req.file.buffer,
            req.file.originalname,
            modelName
        );

        logger.info(`Classification result received: ${JSON.stringify(classificationResult)}`);

        // Step 4: Generate AI insights
        logger.info('Generating AI insights...');
        const aiInsights = await genAIService.generateInsights(
            classificationResult,
            cropType || classificationResult.crop_type || 'crop'
        );

        logger.info('AI insights generated successfully');

        // Step 5: Save to database
        const history = await prisma.history.create({
            data: {
                userId: user.id,
                image: uploadedImageUrl,
                disease: classificationResult.disease || classificationResult.predicted_class || 'Unknown',
                cropType: cropType || classificationResult.crop_type || null,
                model_response: JSON.stringify(classificationResult),
                genai_response: aiInsights,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    }
                }
            }
        });

        logger.info(`Classification saved to database with ID: ${history.id}`);

        // Step 6: Return response
        res.status(200).json({
            status: 'success',
            message: 'Image classified successfully',
            data: {
                id: history.id,
                user: history.user,
                image: uploadedImageUrl,
                classification: {
                    disease: classificationResult.disease || classificationResult.predicted_class,
                    confidence: classificationResult.confidence,
                    cropType: cropType || classificationResult.crop_type,
                    fullResult: classificationResult,
                },
                insights: aiInsights,
                createdAt: history.created_at,
            }
        });

    } catch (error) {
        logger.error(`Classification error: ${error.message}`);
        logger.error(error.stack);

        // If we uploaded an image but failed later, we might want to clean it up
        // For now, we'll keep it for debugging purposes

        next(new ApiError(500, `Classification failed: ${error.message}`));
    }
};

/**
 * Health check for inference API connection
 */
export const checkInferenceHealth = async (req, res, next) => {
    try {
        const isHealthy = await inferenceClient.healthCheck();

        if (isHealthy) {
            const info = await inferenceClient.getInfo();
            res.status(200).json({
                status: 'success',
                message: 'AI inference API is connected and healthy',
                data: info
            });
        } else {
            res.status(503).json({
                status: 'error',
                message: 'AI inference API is not responding'
            });
        }
    } catch (error) {
        logger.error(`Inference health check error: ${error.message}`);
        next(new ApiError(503, 'Failed to connect to AI inference API'));
    }
};

/**
 * Get available models from inference API
 */
export const getAvailableModels = async (req, res, next) => {
    try {
        const models = await inferenceClient.getModels();
        res.status(200).json({
            status: 'success',
            data: models
        });
    } catch (error) {
        logger.error(`Get models error: ${error.message}`);
        next(new ApiError(500, 'Failed to get available models'));
    }
};

/**
 * Get user's classification history
 */
export const getUserHistory = async (req, res, next) => {
    try {
        const { email } = req.query;

        if (!email) {
            return next(new ApiError(400, 'Email is required'));
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(200).json({
                status: 'success',
                message: 'No history found for this email',
                data: {
                    email,
                    history: []
                }
            });
        }

        // Get history with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [history, total] = await Promise.all([
            prisma.history.findMany({
                where: { userId: user.id },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    image: true,
                    disease: true,
                    cropType: true,
                    model_response: true,
                    genai_response: true,
                    created_at: true,
                }
            }),
            prisma.history.count({
                where: { userId: user.id }
            })
        ]);

        // Parse model responses
        const formattedHistory = history.map(item => ({
            ...item,
            model_response: item.model_response ? JSON.parse(item.model_response) : null
        }));

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                },
                history: formattedHistory,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        logger.error(`Get history error: ${error.message}`);
        next(new ApiError(500, error.message));
    }
};

/**
 * Get a single classification by ID
 */
export const getClassificationById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return next(new ApiError(400, 'Classification ID is required'));
        }

        const classification = await prisma.history.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                    }
                }
            }
        });

        if (!classification) {
            return next(new ApiError(404, 'Classification not found'));
        }

        // Parse model response
        const formattedClassification = {
            ...classification,
            model_response: classification.model_response
                ? JSON.parse(classification.model_response)
                : null
        };

        res.status(200).json({
            status: 'success',
            data: formattedClassification
        });

    } catch (error) {
        logger.error(`Get classification error: ${error.message}`);
        next(new ApiError(500, error.message));
    }
};

/**
 * Get statistics for a user
 */
export const getUserStats = async (req, res, next) => {
    try {
        const { email } = req.query;

        if (!email) {
            return next(new ApiError(400, 'Email is required'));
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(200).json({
                status: 'success',
                data: {
                    email,
                    stats: {
                        totalScans: 0,
                        diseaseDistribution: [],
                        cropDistribution: [],
                        recentScans: []
                    }
                }
            });
        }

        // Get statistics
        const [totalScans, diseaseDistribution, cropDistribution, recentScans] = await Promise.all([
            // Total scans
            prisma.history.count({
                where: { userId: user.id }
            }),
            // Disease distribution
            prisma.history.groupBy({
                by: ['disease'],
                where: {
                    userId: user.id,
                    disease: { not: null }
                },
                _count: {
                    disease: true
                }
            }),
            // Crop distribution
            prisma.history.groupBy({
                by: ['cropType'],
                where: {
                    userId: user.id,
                    cropType: { not: null }
                },
                _count: {
                    cropType: true
                }
            }),
            // Recent scans (last 5)
            prisma.history.findMany({
                where: { userId: user.id },
                orderBy: { created_at: 'desc' },
                take: 5,
                select: {
                    id: true,
                    disease: true,
                    cropType: true,
                    created_at: true,
                }
            })
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                },
                stats: {
                    totalScans,
                    diseaseDistribution: diseaseDistribution.map(d => ({
                        disease: d.disease,
                        count: d._count.disease
                    })),
                    cropDistribution: cropDistribution.map(c => ({
                        cropType: c.cropType,
                        count: c._count.cropType
                    })),
                    recentScans
                }
            }
        });

    } catch (error) {
        logger.error(`Get stats error: ${error.message}`);
        next(new ApiError(500, error.message));
    }
};

/**
 * Delete a classification record
 */
export const deleteClassification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        if (!id || !email) {
            return next(new ApiError(400, 'Classification ID and email are required'));
        }

        // Find the classification
        const classification = await prisma.history.findUnique({
            where: { id },
            include: {
                user: true
            }
        });

        if (!classification) {
            return next(new ApiError(404, 'Classification not found'));
        }

        // Verify ownership
        if (classification.user.email !== email) {
            return next(new ApiError(403, 'You can only delete your own classifications'));
        }

        // Delete from database
        await prisma.history.delete({
            where: { id }
        });

        // Note: We're not deleting from S3 to preserve storage for potential auditing
        // If you want to delete from S3 as well, uncomment the following:
        // if (classification.image) {
        //     const key = classification.image.split('/').pop();
        //     await deleteFromS3(`crop-images/${key}`);
        // }

        res.status(200).json({
            status: 'success',
            message: 'Classification deleted successfully'
        });

    } catch (error) {
        logger.error(`Delete classification error: ${error.message}`);
        next(new ApiError(500, error.message));
    }
};
