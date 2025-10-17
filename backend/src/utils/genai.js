import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

/**
 * GenAI Service for getting AI-powered insights
 * Supports Google Gemini and OpenAI
 */
class GenAIService {
    constructor() {
        this.provider = process.env.GENAI_PROVIDER || 'gemini';

        if (this.provider === 'gemini') {
            if (!process.env.GEMINI_API_KEY) {
                logger.warn('GEMINI_API_KEY not configured. GenAI features will be disabled.');
                this.client = null;
            } else {
                this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                this.model = this.client.getGenerativeModel({
                    model: process.env.GENAI_MODEL || 'gemini-1.5-flash'
                });
            }
        } else if (this.provider === 'openai') {
            if (!process.env.OPENAI_API_KEY) {
                logger.warn('OPENAI_API_KEY not configured. GenAI features will be disabled.');
                this.client = null;
            } else {
                this.client = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY
                });
            }
        }
    }

    /**
     * Generate insights from classification results
     * @param {Object} classificationResult - Result from the classification model
     * @param {string} cropType - Type of crop (e.g., 'maize', 'bean', 'wheat')
     * @returns {Promise<string>} - AI-generated insights and recommendations
     */
    async generateInsights(classificationResult, cropType = 'crop') {
        if (!this.client) {
            logger.warn('GenAI client not initialized. Returning classification results without insights.');
            return this.getFallbackResponse(classificationResult, cropType);
        }

        try {
            const prompt = this.buildPrompt(classificationResult, cropType);

            if (this.provider === 'gemini') {
                return await this.generateWithGemini(prompt);
            } else if (this.provider === 'openai') {
                return await this.generateWithOpenAI(prompt);
            }
        } catch (error) {
            logger.error(`GenAI generation error: ${error.message}`);
            // Return fallback response on error
            return this.getFallbackResponse(classificationResult, cropType);
        }
    }

    /**
     * Build a detailed prompt for the AI model
     * @param {Object} classificationResult - Classification result
     * @param {string} cropType - Type of crop
     * @returns {string} - Formatted prompt
     */
    buildPrompt(classificationResult, cropType) {
        const { disease, confidence, predicted_class, probabilities } = classificationResult;

        let prompt = `You are an agricultural expert AI assistant. Analyze the following plant disease classification result and provide actionable insights.\n\n`;
        prompt += `Crop Type: ${cropType}\n`;
        prompt += `Detected Disease: ${disease || predicted_class || 'Unknown'}\n`;
        prompt += `Confidence Level: ${confidence ? (confidence * 100).toFixed(2) : 'N/A'}%\n`;

        if (probabilities && typeof probabilities === 'object') {
            prompt += `\nProbability Distribution:\n`;
            Object.entries(probabilities).forEach(([key, value]) => {
                prompt += `  - ${key}: ${(value * 100).toFixed(2)}%\n`;
            });
        }

        prompt += `\nPlease provide:\n`;
        prompt += `1. A brief description of this disease/condition\n`;
        prompt += `2. Common symptoms to look for\n`;
        prompt += `3. Recommended treatment methods (organic and chemical options)\n`;
        prompt += `4. Prevention strategies\n`;
        prompt += `5. Expected impact on yield if left untreated\n`;
        prompt += `6. Best practices for managing this condition\n\n`;
        prompt += `Format your response in a clear, structured manner suitable for farmers. Use simple language and be practical.`;

        return prompt;
    }

    /**
     * Generate response using Google Gemini
     * @param {string} prompt - The prompt to send
     * @returns {Promise<string>} - Generated text
     */
    async generateWithGemini(prompt) {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            logger.info('Successfully generated insights with Gemini');
            return text;
        } catch (error) {
            logger.error(`Gemini API error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Provide a fallback response when AI is unavailable
     * @param {Object} classificationResult - Classification result
     * @param {string} cropType - Type of crop
     * @returns {string} - Basic formatted response
     */
    getFallbackResponse(classificationResult, cropType) {
        const { disease, confidence, predicted_class } = classificationResult;
        const detectedDisease = disease || predicted_class || 'Unknown condition';
        const confidencePercent = confidence ? (confidence * 100).toFixed(2) : 'N/A';

        return `
Classification Result for ${cropType}:

Detected Condition: ${detectedDisease}
Confidence: ${confidencePercent}%

Note: AI-powered insights are currently unavailable. Please consult with a local agricultural expert for detailed treatment recommendations and management strategies for this condition.

General Recommendations:
- Monitor the affected plants closely
- Isolate affected plants if possible to prevent spread
- Maintain proper crop spacing and ventilation
- Follow integrated pest management practices
- Consult with local agricultural extension services

For detailed treatment plans, please contact a certified agricultural specialist.
        `.trim();
    }
}

// Export singleton instance
export default new GenAIService();
