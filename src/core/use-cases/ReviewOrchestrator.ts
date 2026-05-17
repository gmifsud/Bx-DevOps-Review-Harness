import { FileDiff, AIReview } from '../domain/types';
import { IPullRequestProvider } from '../ports/IPullRequestProvider';
import { IAIService } from '../ports/IAIService';
import crypto from 'crypto';

export class ReviewOrchestrator {
    constructor(
        private prProvider: IPullRequestProvider,
        private aiService: IAIService
    ) {}

    async orchestrateReview(repoId: string, branchName: string, diffs: FileDiff[]): Promise<AIReview> {
        // 1. Filter out files the engineer has explicitly told the assistant to ignore
        const relevantDiffs = diffs.filter(d => !d.isDisregarded);

        if (relevantDiffs.length === 0) {
            return { id: 'empty', status: 'approved', comments: 'No files to review.' };
        }

        // 2. Batch the files to preserve AI attention and avoid token limits.
        // A chunk size of 2-3 files ensures the AI can deeply analyze the full file context.
        const chunkSize = 2; 
        const chunks = this.chunkArray(relevantDiffs, chunkSize);

        let combinedStatus: "approved" | "rejected" = "approved";
        let combinedComments = "";
        let allFixes: any[] = [];
        
        // LRU/Memo map for file contents to avoid redundant network calls.
        const fileContentCache = new Map<string, string>();

        // 3. Process each batch (Map)
        // Note: Running sequentially to respect API rate limits. For enterprise APIs, 
        // this could be upgraded to Promise.allSettled for parallel processing.
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            let promptContext = `Reviewing Batch ${i + 1} of ${chunks.length} from the Pull Request.\n\n`;

            for (const diff of chunk) {
                let fullFileContent = "";
                try {
                    if (diff.changeType !== 'delete') {
                        if (fileContentCache.has(diff.filePath)) {
                            fullFileContent = fileContentCache.get(diff.filePath)!;
                        } else {
                            const fileInfo = await this.prProvider.getFileContent(repoId, diff.filePath, branchName);
                            fullFileContent = fileInfo.content;
                            fileContentCache.set(diff.filePath, fullFileContent);
                        }
                    }
                } catch(e) {
                    console.error(`Could not fetch full file context for ${diff.filePath}`, e);
                }

                promptContext += `--- BEGIN FILE: ${diff.filePath} ---\n`;
                promptContext += `Git Diff:\n${JSON.stringify(diff.patch)}\n\n`;
                
                if (fullFileContent) {
                   promptContext += `Full File Content for Context:\n${fullFileContent}\n`;
                }
                promptContext += `--- END FILE: ${diff.filePath} ---\n\n`;
            }

            // 4. Request AI Review for this specific batch
            const chunkReview = await this.aiService.reviewCodeDiff(promptContext);

            // 5. Aggregate the findings (Reduce)
            if (chunkReview.status === 'rejected') {
                combinedStatus = 'rejected';
            }
            combinedComments += `### Batch ${i + 1} Findings:\n${chunkReview.comments}\n\n`;
            
            if (chunkReview.suggestedFixes && chunkReview.suggestedFixes.length > 0) {
                allFixes.push(...chunkReview.suggestedFixes);
            }
        }

        // 6. Return the unified review back to the UI for the engineer to evaluate
        return {
            id: crypto.randomUUID(),
            status: combinedStatus,
            comments: combinedComments.trim(),
            suggestedFixes: allFixes
        };
    }

    /**
     * Helper pure function to split an array into smaller batches
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }
}
