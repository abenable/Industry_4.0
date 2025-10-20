import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from './logger.js';

// Initialize S3 Client
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT, // Required for Cloudflare R2
});

const bucket = process.env.S3_BUCKET || "abenable-r2";

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} mimetype - File mimetype
 * @param {string} folder - S3 folder/prefix (e.g., 'images', 'crops')
 * @returns {Promise<{key: string, url: string}>} - The S3 key and public URL
 */
export const uploadToS3 = async (imageName, fileBuffer, mimetype) => {
    try {
        // Generate unique filename
        const s3response = await s3.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: imageName,
                Body: fileBuffer,
                ContentType: mimetype,
            })
        );
        logger.info(`✅ Image successfully uploaded to R2: ${s3response}`);

        return { key: imageName }
    } catch (error) {
        logger.error(`Error uploading to S3: ${error.message}`);
        throw error;
    }
};

/**
 * Delete a file from S3
 * @param {string} imageName - The S3 key to delete
 * @returns {Promise<void>}
 */
export const deleteFromS3 = async (imageName) => {
    try {
        await s3.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: imageName,
            })
        );
        logger.info(`✅ Image ${imageName} successfully deleted from R2`);

    } catch (error) {
        logger.error(`Error deleting from S3: ${error.message}`);
        throw error;
    }
};

/**
 * Get a signed URL for temporary access to a private S3 object
 * @param {string} imageName - The S3 key
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - The signed URL
 */
export const getSignedS3Url = async (imageName, expiresIn = 3600) => {
    try {

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: imageName,
        });

        const url = await getSignedUrl(s3, command, { expiresIn });
        return url;
    } catch (error) {
        logger.error(`Error generating signed URL: ${error.message}`);
        throw error;
    }
};

export default { uploadToS3, deleteFromS3, getSignedS3Url };
