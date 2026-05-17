import { IAIService } from '../../../core/ports/IAIService';
import { AIReview } from '../../../core/domain/types';
import { ConfigError, NetworkError } from "../../../core/domain/errors";
import { GoogleGenAI } from '@google/genai';

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
            const prompt = `Review the following code diff and full file context. 
Identify any bugs, security vulnerabilities, or code smells.

CRITICAL RULES FOR REMEDIATION:
Do NOT return the entire file. You must use a targeted "search and replace" block.
The "searchBlock" must EXACTLY match a contiguous block of text in the original file, including whitespace and indentation, so it can be programmatically replaced.

Format your response as a JSON object with this schema:
{
  "status": "approved" | "rejected",
  "comments": "Detailed review notes",
  "suggestedFixes": [
    {
      "filePath": "string",
      "searchBlock": "string (the exact buggy code to replace)",
      "replaceBlock": "string (the corrected code)",
      "commitMessage": "string describing the fix"
    }
  ]
}

Context Payload:
${diffText}`;

            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                }
            });

            if (!response.text) {
                throw new NetworkError("No response from AI.");
            }

            const parsed = JSON.parse(response.text);
            
            return {
                id: Math.random().toString(36).substring(7),
                status: parsed.status === "approved" ? "approved" : "rejected",
                comments: parsed.comments || "No comments.",
                suggestedFixes: parsed.suggestedFixes || []
            };
        } catch (error: any) {
            console.error("Error generating AI review:", error);
            if (error instanceof NetworkError) {
                throw error;
            }
            throw new NetworkError(`Failed to generate AI review: ${error.message}`);
        }
    }
}
