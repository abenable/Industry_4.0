import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';
import logger from './logger.js';

// Initialize S3 Client
const resolveEndpoint = () => {
    const endpoint = process.env.S3_ENDPOINT;

    if (!endpoint) {
        throw new Error("S3_ENDPOINT environment variable is not set.");
    }

    return endpoint;
};

const resolveBucket = () => {
    const bucket = process.env.S3_BUCKET_NAME;

    if (!bucket) {
        throw new Error("S3_BUCKET_NAME environment variable is not set.");
    }

    return bucket;
};

const resolveRegion = () => process.env.AWS_REGION || "auto";

const buildEndpointResolver = () => async () => {
    const endpointUrl = new URL(resolveEndpoint());

    return {
        protocol: endpointUrl.protocol.replace(/:$/, ""),
        hostname: endpointUrl.hostname,
        path: endpointUrl.pathname === "/" ? undefined : endpointUrl.pathname,
        port: endpointUrl.port ? Number(endpointUrl.port) : undefined,
    };
};

const s3 = new S3Client({
    credentials: fromEnv(),
    region: resolveRegion(),
    endpoint: buildEndpointResolver(),
    forcePathStyle: true,
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
        const bucket = resolveBucket();

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: mimetype,
        });

        await s3.send(command);

        // Construct the public URL
        const basePublicUrl = process.env.S3_PUBLIC_BASE_URL || `${resolveEndpoint()}/${bucket}`;
        const url = `${basePublicUrl}/${key}`;

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
        const bucket = resolveBucket();

        const command = new DeleteObjectCommand({
            Bucket: bucket,
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
        const bucket = resolveBucket();

        const command = new GetObjectCommand({
            Bucket: bucket,
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
