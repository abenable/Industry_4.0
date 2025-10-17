import axios from 'axios';
import FormData from 'form-data';
import logger from './logger.js';

/**
 * Client for communicating with the AI Inference API
 */
class InferenceClient {
    constructor() {
        this.baseUrl = process.env.AI_INFERENCE_API_URL || 'http://localhost:8000';
        this.timeout = parseInt(process.env.AI_INFERENCE_TIMEOUT) || 30000;
    }

    /**
     * Check if the inference API is healthy
     * @returns {Promise<boolean>}
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${this.baseUrl}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            logger.error(`Inference API health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get information about the inference API
     * @returns {Promise<Object>}
     */
    async getInfo() {
        try {
            const response = await axios.get(`${this.baseUrl}/`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            logger.error(`Failed to get inference API info: ${error.message}`);
            throw error;
        }
    }

    /**
     * Predict disease from an image
     * @param {Buffer} imageBuffer - Image file buffer
     * @param {string} filename - Original filename
     * @param {string} modelName - Model to use (bean or maize)
     * @returns {Promise<Object>}
     */
    async predict(imageBuffer, filename, modelName = 'bean') {
        try {
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: filename,
                contentType: 'image/jpeg',
            });

            const url = `${this.baseUrl}/predict?model_name=${modelName}`;

            logger.info(`Sending prediction request to: ${url}`);

            const response = await axios.post(url, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: this.timeout,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            if (response.status !== 200) {
                throw new Error(`Inference API returned status ${response.status}`);
            }

            logger.info(`Prediction successful: ${response.data.predicted_class}`);
            return response.data;

        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                logger.error('Cannot connect to AI inference API. Is it running?');
                throw new Error('AI inference service is unavailable. Please ensure the AI model server is running.');
            }

            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
                throw new Error('AI inference request timed out. The image may be too large or the server is busy.');
            }

            logger.error(`Inference API error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Batch predict multiple images
     * @param {Array<{buffer: Buffer, filename: string}>} images
     * @param {string} modelName
     * @returns {Promise<Object>}
     */
    async batchPredict(images, modelName = 'bean') {
        try {
            const formData = new FormData();

            images.forEach((img) => {
                formData.append('files', img.buffer, {
                    filename: img.filename,
                    contentType: 'image/jpeg',
                });
            });

            const url = `${this.baseUrl}/predict/batch?model_name=${modelName}`;

            const response = await axios.post(url, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                timeout: this.timeout * 2, // Double timeout for batch
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });

            return response.data;

        } catch (error) {
            logger.error(`Batch inference error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get list of available models
     * @returns {Promise<Object>}
     */
    async getModels() {
        try {
            const response = await axios.get(`${this.baseUrl}/models`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            logger.error(`Failed to get models: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get information about a specific model
     * @param {string} modelName
     * @returns {Promise<Object>}
     */
    async getModelInfo(modelName) {
        try {
            const response = await axios.get(`${this.baseUrl}/models/${modelName}`, {
                timeout: 5000
            });
            return response.data;
        } catch (error) {
            logger.error(`Failed to get model info: ${error.message}`);
            throw error;
        }
    }
}

// Export singleton instance
const inferenceClient = new InferenceClient();
export default inferenceClient;
