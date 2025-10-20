import prismaPkg from '@prisma/client';
import { Buffer } from 'buffer';
import { randomUUID } from 'crypto';
import { ApiError } from './error.js';
import logger from '../utils/logger.js';
import { uploadToS3 } from '../utils/s3.js';
import genAIService from '../utils/genai.js';
import { prisma } from '../index.js';
import inferenceClient from '../utils/inference-client.js';
import crypto from 'crypto';

const { HistoryStatus } = prismaPkg;

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
    let historyRecord = null;

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
        const imageName = crypto.randomBytes(16).toString('hex');

        const s3Result = await uploadToS3(
            imageName,
            req.file.buffer,
            req.file.mimetype
        );
        logger.info(`✅ Image successfully uploaded to R2: ${JSON.stringify(s3Result)}`);


        const imageUrl = `https://r2.abenable.tech/${imageName}`;

        logger.info(`Image uploaded to S3: ${imageName}`);

        // Create pending history record immediately after upload
        historyRecord = await prisma.cropAnalysisHistory.create({
            data: {
                user: { connect: { id: user.id } },
                userEmail: user.email,
                cropType: cropType || null,
                imageUrl,
                imageName,
                analysisResult: { status: 'pending' },
                status: HistoryStatus.PENDING,
            },
        });

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

        let parsedInsights = null;

        if (aiInsights) {
            try {
                parsedInsights = typeof aiInsights === 'string' ? JSON.parse(aiInsights) : aiInsights;
            } catch (parseError) {
                logger.warn(`Unable to parse AI insights JSON: ${parseError.message}`);
            }
        }

        const resolvedDisease = classificationResult.disease
            || classificationResult.predicted_class
            || parsedInsights?.disease?.name
            || 'Unknown';

        const resolvedConfidence = typeof classificationResult.confidence === 'number'
            ? classificationResult.confidence
            : typeof parsedInsights?.disease?.confidence === 'number'
                ? parsedInsights.disease.confidence
                : null;

        const resolvedSeverity = parsedInsights?.insights?.impact?.severity || null;

        const analysisPayload = {
            disease: resolvedDisease,
            confidence: resolvedConfidence,
            cropType: cropType || classificationResult.crop_type || parsedInsights?.disease?.cropType || null,
            recommendations: parsedInsights?.recommendations ?? null,
            severity: resolvedSeverity,
            status: 'completed',
            model: classificationResult,
            insights: parsedInsights ?? aiInsights,
        };

        // Update history record with completed analysis
        if (historyRecord) {
            await prisma.cropAnalysisHistory.update({
                where: { id: historyRecord.id },
                data: {
                    cropType: analysisPayload.cropType,
                    diseaseName: resolvedDisease,
                    confidence: resolvedConfidence,
                    analysisResult: analysisPayload,
                    status: HistoryStatus.COMPLETED,
                    severity: resolvedSeverity,
                },
            });
        }

        // Step 5: Save to database
        logger.info(`Classification saved to database with ID: ${historyRecord?.id}`);

        // Step 6: Return response
        res.status(200).json({
            status: 'success',
            message: 'Image classified successfully',
            data: {
                id: historyRecord?.id,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                },
                image: imageUrl,
                classification: {
                    disease: resolvedDisease,
                    confidence: resolvedConfidence,
                    cropType: analysisPayload.cropType,
                    severity: resolvedSeverity,
                    status: HistoryStatus.COMPLETED,
                    fullResult: classificationResult,
                },
                insights: parsedInsights ?? aiInsights,
                analysis: analysisPayload,
                status: HistoryStatus.COMPLETED,
                createdAt: historyRecord?.createdAt ?? new Date(),
            }
        });

    } catch (error) {
        logger.error(`Classification error: ${error.message}`);
        logger.error(error.stack);

        if (historyRecord) {
            try {
                await prisma.cropAnalysisHistory.update({
                    where: { id: historyRecord.id },
                    data: {
                        status: HistoryStatus.FAILED,
                        failureReason: error.message,
                    },
                });
            } catch (updateError) {
                logger.warn(`Unable to update history record to FAILED state: ${updateError.message}`);
            }
        }

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

        const user = await prisma.user.findUnique({
            where: { email }
        });

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
        const skip = (page - 1) * limit;

        const {
            cropType,
            disease,
            status,
            startDate,
            endDate,
            search
        } = req.query;

        const filters = [
            {
                userEmail: email,
                deletedAt: null,
            }
        ];

        if (user) {
            filters[0].userId = user.id;
        }

        if (cropType) {
            filters.push({ cropType: { equals: String(cropType), mode: 'insensitive' } });
        }

        if (disease) {
            filters.push({ diseaseName: { equals: String(disease), mode: 'insensitive' } });
        }

        if (status && typeof status === 'string') {
            const normalizedStatus = status.toUpperCase();
            if (Object.values(HistoryStatus).includes(normalizedStatus)) {
                filters.push({ status: normalizedStatus });
            }
        }

        const dateFilter = {};
        if (startDate) {
            const parsedStart = new Date(startDate);
            if (!Number.isNaN(parsedStart.getTime())) {
                dateFilter.gte = parsedStart;
            }
        }
        if (endDate) {
            const parsedEnd = new Date(endDate);
            if (!Number.isNaN(parsedEnd.getTime())) {
                dateFilter.lte = parsedEnd;
            }
        }
        if (Object.keys(dateFilter).length > 0) {
            filters.push({ createdAt: dateFilter });
        }

        if (search && typeof search === 'string' && search.trim().length > 0) {
            const query = search.trim();
            filters.push({
                OR: [
                    { diseaseName: { contains: query, mode: 'insensitive' } },
                    { cropType: { contains: query, mode: 'insensitive' } },
                    { userEmail: { contains: query, mode: 'insensitive' } },
                ],
            });
        }

        const whereClause = filters.length > 1 ? { AND: filters } : filters[0];

        const [history, total] = await Promise.all([
            prisma.cropAnalysisHistory.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.cropAnalysisHistory.count({
                where: whereClause,
            }),
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                user: user
                    ? {
                        id: user.id,
                        email: user.email,
                        fullName: user.fullName,
                    }
                    : { id: null, email, fullName: null },
                history,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                filters: {
                    cropType: cropType || null,
                    disease: disease || null,
                    status: status || null,
                    startDate: startDate || null,
                    endDate: endDate || null,
                    search: search || null,
                },
            },
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

        const classification = await prisma.cropAnalysisHistory.findFirst({
            where: { id, deletedAt: null },
        });

        if (!classification) {
            return next(new ApiError(404, 'Classification not found'));
        }

        res.status(200).json({
            status: 'success',
            data: classification
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
        const baseWhere = {
            userId: user.id,
            deletedAt: null,
        };

        const [totalScans, diseaseDistribution, cropDistribution, recentScans] = await Promise.all([
            prisma.cropAnalysisHistory.count({
                where: baseWhere,
            }),
            prisma.cropAnalysisHistory.groupBy({
                by: ['diseaseName'],
                where: {
                    ...baseWhere,
                    diseaseName: { not: null },
                },
                _count: {
                    diseaseName: true,
                },
            }),
            prisma.cropAnalysisHistory.groupBy({
                by: ['cropType'],
                where: {
                    ...baseWhere,
                    cropType: { not: null },
                },
                _count: {
                    cropType: true,
                },
            }),
            prisma.cropAnalysisHistory.findMany({
                where: baseWhere,
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    diseaseName: true,
                    cropType: true,
                    createdAt: true,
                    status: true,
                },
            }),
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
                        disease: d.diseaseName,
                        count: d._count.diseaseName
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

const parseAnalysisResult = (payload) => {
    if (!payload) {
        return {};
    }

    if (typeof payload === 'string') {
        try {
            return JSON.parse(payload);
        } catch (error) {
            logger.warn(`Unable to parse analysis result payload: ${error.message}`);
            return {};
        }
    }

    if (typeof payload === 'object') {
        return payload;
    }

    return {};
};

const resolveStatus = (status) => {
    if (!status || typeof status !== 'string') {
        return HistoryStatus.PENDING;
    }

    const normalized = status.toUpperCase();
    return Object.values(HistoryStatus).includes(normalized)
        ? normalized
        : HistoryStatus.PENDING;
};

const decodeBase64Image = (imageData) => {
    if (!imageData || typeof imageData !== 'string') {
        return null;
    }

    const matches = imageData.match(/^data:(?<mime>.+);base64,(?<data>.+)$/);
    if (!matches || !matches.groups) {
        try {
            const buffer = Buffer.from(imageData, 'base64');
            return {
                buffer,
                mime: 'image/jpeg',
            };
        } catch {
            return null;
        }
    }

    const { mime, data } = matches.groups;
    const buffer = Buffer.from(data, 'base64');
    return { buffer, mime };
};

export const createHistoryEntry = async (req, res, next) => {
    try {
        const {
            id,
            email,
            cropType,
            imageName,
            imageUrl,
            analysisResult,
            status,
            severity,
            notes,
            createdAt,
        } = req.body;

        if (!email) {
            return next(new ApiError(400, 'Email is required'));
        }

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    fullName: email.split('@')[0],
                },
            });
        }

        const parsedResult = parseAnalysisResult(analysisResult);
        const resolvedDisease = parsedResult?.disease?.name
            || parsedResult?.disease
            || parsedResult?.analysis?.disease
            || null;
        const resolvedConfidence = parsedResult?.disease?.confidence
            ?? parsedResult?.confidence
            ?? null;
        const resolvedSeverity = severity
            || parsedResult?.insights?.impact?.severity
            || parsedResult?.severity
            || null;

        const baseData = {
            userEmail: email,
            cropType: cropType || parsedResult?.cropType || null,
            diseaseName: resolvedDisease,
            confidence: typeof resolvedConfidence === 'number' ? resolvedConfidence : null,
            imageUrl: imageUrl,
            imageName: imageName,
            analysisResult: parsedResult,
            status: resolveStatus(status),
            severity: resolvedSeverity,
            notes: notes || null,
        };

        const relationData = {
            user: { connect: { id: user.id } },
        };

        let entry;
        if (id) {
            entry = await prisma.cropAnalysisHistory.upsert({
                where: { id },
                create: {
                    id,
                    ...baseData,
                    ...relationData,
                    createdAt: createdAt ? new Date(createdAt) : undefined,
                },
                update: {
                    ...baseData,
                    ...relationData,
                },
            });
        } else {
            entry = await prisma.cropAnalysisHistory.create({
                data: {
                    ...baseData,
                    ...relationData,
                    createdAt: createdAt ? new Date(createdAt) : undefined,
                },
            });
        }

        res.status(201).json({
            status: 'success',
            message: 'History entry saved successfully',
            data: entry,
        });
    } catch (error) {
        logger.error(`Create history entry error: ${error.message}`);
        next(new ApiError(500, error.message));
    }
};

export const updateHistoryNotes = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        if (!id) {
            return next(new ApiError(400, 'History ID is required'));
        }

        const entry = await prisma.cropAnalysisHistory.update({
            where: { id },
            data: {
                notes: notes || null,
            },
        });

        res.status(200).json({
            status: 'success',
            data: entry,
        });
    } catch (error) {
        logger.error(`Update history notes error: ${error.message}`);
        next(new ApiError(500, error.message));
    }
};

export const exportHistory = async (req, res, next) => {
    try {
        const { email } = req.query;

        if (!email) {
            return next(new ApiError(400, 'Email is required'));
        }

        const history = await prisma.cropAnalysisHistory.findMany({
            where: {
                userEmail: email,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });

        const exportPayload = {
            exportedAt: new Date().toISOString(),
            count: history.length,
            data: history,
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="agrivai-history.json"');
        res.status(200).send(JSON.stringify(exportPayload, null, 2));
    } catch (error) {
        logger.error(`Export history error: ${error.message}`);
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
        const classification = await prisma.cropAnalysisHistory.findFirst({
            where: { id, deletedAt: null },
            include: {
                user: true,
            }
        });

        if (!classification) {
            return next(new ApiError(404, 'Classification not found'));
        }

        // Verify ownership
        const ownerEmail = classification.user?.email || classification.userEmail;
        if (ownerEmail !== email) {
            return next(new ApiError(403, 'You can only delete your own classifications'));
        }

        // Soft delete entry
        await prisma.cropAnalysisHistory.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                failureReason: 'Entry deleted by user',
            }
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
