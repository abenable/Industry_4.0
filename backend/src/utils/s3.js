import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';
import logger from './logger.js';

// Initialize S3 Client
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
});

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} originalName - Original filename
 * @param {string} mimetype - File mimetype
 * @param {string} folder - S3 folder/prefix (e.g., 'images', 'crops')
 * @returns {Promise<{key: string, url: string}>} - The S3 key and public URL
 */
export const uploadToS3 = async (fileBuffer, originalName, mimetype, folder = 'images') => {
    try {
        // Generate unique filename
        const randomName = crypto.randomBytes(16).toString('hex');
        const extension = originalName.split('.').pop();
        const key = `${folder}/${randomName}.${extension}`;

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: mimetype,
        });

        await s3.send(command);

        // Construct the public URL
        const url = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${key}`;

        logger.info(`File uploaded successfully to S3: ${key}`);

        return { key, url };
    } catch (error) {
        logger.error(`Error uploading to S3: ${error.message}`);
        throw error;
    }
};

/**
 * Delete a file from S3
 * @param {string} key - The S3 key to delete
 * @returns {Promise<void>}
 */
export const deleteFromS3 = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        });

        await s3.send(command);
        logger.info(`File deleted successfully from S3: ${key}`);
    } catch (error) {
        logger.error(`Error deleting from S3: ${error.message}`);
        throw error;
    }
};

/**
 * Get a signed URL for temporary access to a private S3 object
 * @param {string} key - The S3 key
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - The signed URL
 */
export const getSignedS3Url = async (key, expiresIn = 3600) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        });

        const url = await getSignedUrl(s3, command, { expiresIn });
        return url;
    } catch (error) {
        logger.error(`Error generating signed URL: ${error.message}`);
        throw error;
    }
};

export default { uploadToS3, deleteFromS3, getSignedS3Url };
