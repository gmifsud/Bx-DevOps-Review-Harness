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
            const prompt = `Review the following code diff and provide feedback. 
Identify any bugs, code smells, or areas for improvement.
Format your response as a JSON object with the following schema:
{
  "status": "approved" | "rejected",
  "comments": "string containing your review comments",
  "suggestedFixes": [
    {
      "filePath": "string",
      "newContent": "complete new replacement content for the file",
      "commitMessage": "string describing the fix"
    }
  ]
}

Code Diff:
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
