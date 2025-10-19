import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

/**
 * GenAI Service for getting AI-powered insights using Gemini 2.5 Flash
 */
class GenAIService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAYPQ5kmCy6umipmwxAOTO_umEP8OgsxR8';

        if (!apiKey) {
            logger.warn('GEMINI_API_KEY not configured. GenAI features will be disabled.');
            this.client = null;
            this.model = null;
            return;
        }

        this.client = new GoogleGenerativeAI(apiKey);
        this.model = this.client.getGenerativeModel({
            model: process.env.GENAI_MODEL || 'gemini-2.5-flash'
        });
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
            const output = await this.generateWithGemini(prompt);
            return this.formatGeminiResponse(output);
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

        const detectedDisease = disease || predicted_class || 'Unknown';
        const confidencePercent = confidence ? (confidence * 100).toFixed(2) : 'N/A';
        const probabilityLines = probabilities && typeof probabilities === 'object'
            ? Object.entries(probabilities)
                .map(([label, value]) => `- ${label}: ${(value * 100).toFixed(2)}%`)
                .join('\n')
            : '';

        return [
            'You are an agricultural expert AI assistant.',
            'You will receive a plant disease classification result and must respond in concise, field-ready markdown.',
            '',
            `Crop type: ${cropType}`,
            `Detected disease: ${detectedDisease}`,
            `Confidence: ${confidencePercent}%`,
            probabilityLines ? `Class probabilities:\n${probabilityLines}` : '',
            '',
            'Your response must follow this structure using markdown headings:',
            '# Alert Summary',
            '## Disease Overview',
            '## Early Symptoms',
            '## Immediate Actions',
            '## Chemical Control',
            '## Organic & Cultural Practices',
            '## Prevention & Monitoring',
            '## Yield Impact',
            '## Follow-Up Checklist',
            '',
            'Rules:',
            '- Keep sentences short and direct.',
            '- Use bullet lists under each section; no numbered lists.',
            '- Do not repeat the same action in multiple sections.',
            '- If confidence is below 70%, highlight uncertainty in the summary and suggest validation.',
            '- If a section lacks reliable information, write “Data unavailable – consult a local extension officer.”',
        ].filter(Boolean).join('\n');
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
            return response.text();
        } catch (error) {
            logger.error(`Gemini API error: ${error.message}`);
            throw error;
        }
    }

    formatGeminiResponse(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return 'AI insights are currently unavailable.';
        }

        let formatted = rawText.trim();

        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        formatted = formatted.replace(/\*{3,}/g, '**');

        const requiredSections = [
            '# Alert Summary',
            '## Disease Overview',
            '## Early Symptoms',
            '## Immediate Actions',
            '## Chemical Control',
            '## Organic & Cultural Practices',
            '## Prevention & Monitoring',
            '## Yield Impact',
            '## Follow-Up Checklist',
        ];

        requiredSections.forEach((section) => {
            const sectionRegex = new RegExp(`^${section}$`, 'm');
            if (!sectionRegex.test(formatted)) {
                formatted += `\n\n${section}\n- Data unavailable – consult a local extension officer.`;
            }
        });

        if (!formatted.startsWith('#')) {
            formatted = `# Alert Summary\n\n${formatted}`;
        }

        return formatted;
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
