import { FileDiff, AIReview } from '../domain/types';
import { IPullRequestProvider } from '../ports/IPullRequestProvider';
import { IAIService } from '../ports/IAIService';

export class ReviewOrchestrator {
    constructor(
        private prProvider: IPullRequestProvider,
        private aiService: IAIService
    ) {}

    async orchestrateReview(repoId: string, branchName: string, diffs: FileDiff[]): Promise<AIReview> {
        const relevantDiffs = diffs.filter(d => !d.isDisregarded).slice(0, 3);
        let combinedContext = "";
        
        for (const diff of relevantDiffs) {
            let fullFileContent = "";
            try {
                if (diff.changeType !== 'delete') {
                    fullFileContent = await this.prProvider.getFileContent(repoId, diff.filePath, branchName);
                }
            } catch(e) {
                console.error(`Could not fetch full file context for ${diff.filePath}`, e);
            }
            
            combinedContext += `File: ${diff.filePath}\n`;
            combinedContext += `Diff:\n${JSON.stringify(diff.patch)}\n\n`;
            if (fullFileContent) {
               combinedContext += `Full File Content:\n${fullFileContent}\n\n`;
            }
            combinedContext += `------------------------\n\n`;
        }
        
        return this.aiService.reviewCodeDiff(combinedContext);
    }
}
