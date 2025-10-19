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
            return this.formatGeminiResponse(output, classificationResult, cropType);
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
        const { disease, confidence, predicted_class, probabilities } = classificationResult || {};

        const detectedDisease = disease || predicted_class || 'Unknown condition';
        const confidenceValue = typeof confidence === 'number' ? confidence : null;
        const confidencePercent =
            confidenceValue !== null ? Number((confidenceValue * 100).toFixed(2)) : null;

        const probabilityLines = probabilities && typeof probabilities === 'object'
            ? Object.entries(probabilities)
                .filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
                .map(([label, value]) => `- ${label}: ${(value * 100).toFixed(2)}%`)
                .join('\n')
            : '';

        const confidenceLabel = this.getConfidenceLabel(confidenceValue);

        return [
            'You are an agricultural extension specialist charged with summarizing plant disease classifications.',
            'You MUST respond with a single valid JSON object that matches the exact schema described below. Do not include markdown fences, explanations, or additional prose.',
            '',
            `Crop type: ${cropType}`,
            `Detected disease: ${detectedDisease}`,
            `Model confidence: ${confidencePercent !== null ? `${confidencePercent}%` : 'Unknown'}`,
            probabilityLines ? `Class probabilities:\n${probabilityLines}` : '',
            '',
            'Output requirements:',
            'Return ONLY a JSON object using double quotes for all keys and string values. Boolean and numeric fields must be bare (no quotes).',
            'The JSON MUST conform to this schema and include all keys even when you must supply informative fallback text:',
            '{',
            '  "disease": {',
            '    "name": string,',
            '    "confidence": number between 0 and 1,',
            '    "confidenceLabel": "Low" | "Moderate" | "High" | "Critical",',
            '    "summary": string',
            '  },',
            '  "insights": {',
            '    "overview": string,',
            '    "symptoms": [string, ... at least 3 items],',
            '    "impact": {',
            '      "severity": "Low" | "Moderate" | "High" | "Critical",',
            '      "yieldLoss": string,',
            '      "notes": string',
            '    },',
            '    "transmission": string',
            '  },',
            '  "recommendations": {',
            '    "warning": string,',
            '    "steps": [',
            '      { "title": string, "detail": string },',
            '      { "title": string, "detail": string },',
            '      { "title": string, "detail": string },',
            '      { "title": string, "detail": string },',
            '      { "title": string, "detail": string },',
            '      { "title": string, "detail": string },',
            '      { "title": string, "detail": string }',
            '    ]',
            '  },',
            '  "metadata": {',
            '    "source": "Gemini 2.5 Flash",',
            '    "generatedAt": ISO 8601 UTC string timestamp,',
            '    "confidenceLabel": string matching disease.confidenceLabel',
            '  }',
            '}',
            '',
            'All text must be actionable, farmer-friendly, and reference the detected crop and disease. Provide concrete metrics for yieldLoss and transmission when possible. When information is uncertain, clearly state the limitation but still give guidance.',
            'Ensure there are exactly seven recommendation steps. Avoid duplicating actions. Each step title should be 2-4 words; the detail should be a full sentence.',
            `If confidence is below 0.6, begin warning with "Low confidence: " and advise confirmation. Current confidence label: ${confidenceLabel}.`,
            'Return only JSON. Do not wrap in ```json```.',
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

    formatGeminiResponse(rawText, classificationResult, cropType) {
        if (!rawText || typeof rawText !== 'string') {
            return this.getFallbackResponse(classificationResult, cropType);
        }

        const cleaned = rawText.trim();

        const jsonCandidate = this.extractJson(cleaned);

        if (!jsonCandidate) {
            logger.warn('GenAI response did not contain JSON payload. Using fallback.');
            return this.getFallbackResponse(classificationResult, cropType);
        }

        try {
            const parsed = JSON.parse(jsonCandidate);
            return JSON.stringify(this.ensureSchema(parsed, classificationResult, cropType), null, 2);
        } catch (error) {
            logger.warn(`Unable to parse GenAI JSON: ${error.message}`);
            return this.getFallbackResponse(classificationResult, cropType);
        }
    }

    /**
     * Provide a fallback response when AI is unavailable
     * @param {Object} classificationResult - Classification result
     * @param {string} cropType - Type of crop
     * @returns {string} - JSON response string
     */
    getFallbackResponse(classificationResult, cropType) {
        const payload = this.buildFallbackPayload(classificationResult, cropType);
        return JSON.stringify(payload, null, 2);
    }

    extractJson(text) {
        const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeFenceMatch) {
            return codeFenceMatch[1].trim();
        }

        const jsonMatch = text.match(/\{[\s\S]*\}$/);
        return jsonMatch ? jsonMatch[0].trim() : null;
    }

    ensureSchema(payload, classificationResult, cropType) {
        const fallback = this.buildFallbackPayload(classificationResult, cropType);

        const safePayload = {
            disease: {
                name: this.safeString(payload?.disease?.name, fallback.disease.name),
                confidence: this.safeNumber(payload?.disease?.confidence, fallback.disease.confidence),
                confidenceLabel: this.safeString(payload?.disease?.confidenceLabel, fallback.disease.confidenceLabel),
                summary: this.safeString(payload?.disease?.summary, fallback.disease.summary),
            },
            insights: {
                overview: this.safeString(payload?.insights?.overview, fallback.insights.overview),
                symptoms: this.safeStringArray(payload?.insights?.symptoms, fallback.insights.symptoms, 3),
                impact: {
                    severity: this.safeString(payload?.insights?.impact?.severity, fallback.insights.impact.severity),
                    yieldLoss: this.safeString(payload?.insights?.impact?.yieldLoss, fallback.insights.impact.yieldLoss),
                    notes: this.safeString(payload?.insights?.impact?.notes, fallback.insights.impact.notes),
                },
                transmission: this.safeString(payload?.insights?.transmission, fallback.insights.transmission),
            },
            recommendations: {
                warning: this.safeString(payload?.recommendations?.warning, fallback.recommendations.warning),
                steps: this.safeSteps(payload?.recommendations?.steps, fallback.recommendations.steps),
            },
            metadata: {
                source: 'Gemini 2.5 Flash',
                generatedAt: this.safeDateTime(payload?.metadata?.generatedAt),
                confidenceLabel: this.safeString(payload?.metadata?.confidenceLabel, fallback.metadata.confidenceLabel),
            },
        };

        return safePayload;
    }

    safeString(value, fallback) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
        return fallback;
    }

    safeNumber(value, fallback) {
        const numeric = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(numeric)) {
            return Math.max(0, Math.min(1, numeric));
        }
        return fallback;
    }

    safeStringArray(value, fallback, minimumLength = 0) {
        if (Array.isArray(value)) {
            const cleaned = value
                .map((item) => (typeof item === 'string' ? item.trim() : null))
                .filter((item) => item);

            if (cleaned.length >= minimumLength) {
                return cleaned;
            }
        }
        return fallback;
    }

    safeSteps(value, fallback) {
        if (Array.isArray(value)) {
            const steps = value
                .map((step) => {
                    if (!step || typeof step !== 'object') {
                        return null;
                    }
                    const title = this.safeString(step.title, null);
                    const detail = this.safeString(step.detail, null);
                    if (!title || !detail) {
                        return null;
                    }
                    return { title, detail };
                })
                .filter(Boolean);

            if (steps.length === 7) {
                return steps;
            }
        }

        return fallback;
    }

    safeDateTime(value) {
        if (typeof value === 'string') {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return date.toISOString();
            }
        }
        return new Date().toISOString();
    }

    getConfidenceLabel(confidence) {
        if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
            return 'Moderate';
        }

        if (confidence >= 0.85) return 'High';
        if (confidence >= 0.6) return 'Moderate';
        if (confidence >= 0.4) return 'Low';
        return 'Critical';
    }

    buildFallbackPayload(classificationResult, cropType) {
        const { disease, confidence, predicted_class } = classificationResult || {};
        const detectedDisease = disease || predicted_class || 'Unknown condition';
        const confidenceValue = typeof confidence === 'number' && !Number.isNaN(confidence) ? confidence : null;
        const confidenceLabel = this.getConfidenceLabel(confidenceValue);

        const summary = `Initial detection suggests ${detectedDisease} in ${cropType}. Continue monitoring and validate with local experts.`;
        const warningPrefix = confidenceValue !== null && confidenceValue < 0.6 ? 'Low confidence: ' : '';

        const severity = confidenceLabel === 'High' ? 'High' : confidenceLabel === 'Critical' ? 'Critical' : 'Moderate';

        return {
            disease: {
                name: detectedDisease,
                confidence: confidenceValue ?? 0,
                confidenceLabel,
                summary,
            },
            insights: {
                overview: `Symptoms observed are consistent with ${detectedDisease}. Verify using field diagnostics and compare against healthy ${cropType} leaves.`,
                symptoms: [
                    'Visible discoloration or lesions on leaves',
                    'Irregular patterns suggesting pathogen activity',
                    'Potential wilting or stunted growth in nearby plants',
                ],
                impact: {
                    severity,
                    yieldLoss: 'Up to 25% if unmanaged',
                    notes: 'Yield impact varies with stage of infection and environmental stress. Early response reduces loss.',
                },
                transmission: 'Likely spread through contaminated tools, wind-driven spores, or water splash between plants.',
            },
            recommendations: {
                warning: `${warningPrefix}Isolate affected plants, sanitize tools, and escalate to an agronomist if symptoms intensify within 48 hours.`,
                steps: [
                    { title: 'Confirm Diagnosis', detail: 'Capture additional photos and consult local extension resources to validate the disease.' },
                    { title: 'Isolate Plants', detail: 'Separate visibly affected plants from healthy stands to slow transmission.' },
                    { title: 'Sanitize Tools', detail: 'Clean knives, sprayers, and gloves with a bleach solution before moving between plants.' },
                    { title: 'Remove Debris', detail: 'Dispose of infected leaves away from the field to reduce pathogen load.' },
                    { title: 'Adjust Irrigation', detail: 'Water at soil level in the morning to reduce leaf wetness periods.' },
                    { title: 'Apply Protectant', detail: 'Use an approved fungicide or biocontrol agent suitable for the identified disease and crop.' },
                    { title: 'Schedule Follow-Up', detail: 'Inspect the field again within 3 days and record any progression or new symptoms.' },
                ],
            },
            metadata: {
                source: 'Gemini 2.5 Flash',
                generatedAt: new Date().toISOString(),
                confidenceLabel,
            },
        };
    }
}

// Export singleton instance
export default new GenAIService();
