import { IAIService } from '../../../core/ports/IAIService';
import { AIReview } from '../../../core/domain/types';
import { ConfigError, NetworkError } from "../../../core/domain/errors";
import { GoogleGenAI, Type, Schema } from '@google/genai';
import crypto from 'crypto';

const reviewSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        status: { type: Type.STRING, enum: ["approved", "rejected"] },
        comments: { type: Type.STRING },
        suggestedFixes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    filePath: { type: Type.STRING },
                    searchBlock: { type: Type.STRING },
                    replaceBlock: { type: Type.STRING },
                    commitMessage: { type: Type.STRING }
                },
                required: ["filePath", "searchBlock", "replaceBlock", "commitMessage"]
            }
        }
    },
    required: ["status", "comments"]
};

export class GoogleAIAdapter implements IAIService {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new ConfigError("Missing GEMINI_API_KEY.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    async reviewCodeDiff(diffText: string): Promise<AIReview> {
        try {
            const basePrompt = `Review the following code diff and full file context. 
Identify any bugs, security vulnerabilities, or code smells.

CRITICAL RULES FOR REMEDIATION:
Do NOT return the entire file. You must use a targeted "search and replace" block.
The "searchBlock" must EXACTLY match a contiguous block of text in the original file, including whitespace and indentation, so it can be programmatically replaced.

Context Payload:
${diffText}`;

            let errorContext = "";
            let responseText = "";

            for (let attempts = 0; attempts < 2; attempts++) {
                try {
                    const prompt = basePrompt + (errorContext ? `\n\nPrevious attempt failed schema validation: ${errorContext}` : "");
                    
                    const response = await this.ai.models.generateContent({
                        model: 'gemini-2.5-pro',
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: reviewSchema,
                            temperature: 0.2,
                        }
                    });

                    if (!response.text) {
                        throw new Error("No response from AI.");
                    }
                    
                    responseText = response.text;
                    const parsed = JSON.parse(responseText);
                    
                    return {
                        id: crypto.randomUUID(),
                        status: parsed.status === "approved" ? "approved" : "rejected",
                        comments: parsed.comments || "No comments.",
                        suggestedFixes: parsed.suggestedFixes || []
                    };
                } catch (e: any) {
                    errorContext = e.message;
                    if (attempts === 1) throw e;
                }
            }
            
            throw new Error("Failed to generate review after retry");
        } catch (error: any) {
            console.error("Error generating AI review:", error);
            if (error instanceof NetworkError) {
                throw error;
            }
            throw new NetworkError(`Failed to generate AI review: ${error.message}`);
        }
    }
}
