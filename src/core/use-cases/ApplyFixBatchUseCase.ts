import { IPullRequestProvider, FileCommitDetails } from '../ports/IPullRequestProvider';
import { SuggestedFix } from '../domain/types';
import { FixPatcher } from '../services/FixPatcher';

export class ApplyFixBatchUseCase {
    private fixPatcher: FixPatcher;

    constructor(private prProvider: IPullRequestProvider) {
        this.fixPatcher = new FixPatcher();
    }

    async execute(repoId: string, branchName: string, fixes: SuggestedFix[]): Promise<boolean> {
        if (!fixes || fixes.length === 0) return true;

        // Group fixes by file path to enforce per-file commit atomicity
        const fixesByFile = fixes.reduce((acc, fix) => {
            if (!acc[fix.filePath]) acc[fix.filePath] = [];
            acc[fix.filePath].push(fix);
            return acc;
        }, {} as Record<string, SuggestedFix[]>);

        let overallSuccess = true;

        for (const filePath of Object.keys(fixesByFile)) {
            const fileFixes = fixesByFile[filePath];
            try {
                // Fetch the absolute latest state of the file
                const { content: originalFileContent, branchSha } = await this.prProvider.getFileContent(repoId, filePath, branchName);
                
                let currentContent = originalFileContent;

                const commitDetails: FileCommitDetails[] = [];
                let aggregatedCommitMessage = "Applied AI Suggested Fixes";

                // Patch sequentially
                for (const fix of fileFixes) {
                    currentContent = this.fixPatcher.apply(fix, currentContent);
                    if (fix.commitMessage && fix.commitMessage !== "fix") {
                         aggregatedCommitMessage = fix.commitMessage; // or try to aggregate them better
                    }
                }

                if (currentContent !== originalFileContent) {
                    commitDetails.push({
                        filePath,
                        newContent: currentContent,
                        changeType: 'edit'
                    });
    
                    // Send to the imperative shell to mutate state for this file
                    const fileSuccess = await this.prProvider.commitChanges(repoId, branchName, branchSha, commitDetails, aggregatedCommitMessage);
                    if (!fileSuccess) {
                         overallSuccess = false;
                    }
                }
            } catch (err) {
                 console.error(`Failed to apply batch fixes for file ${filePath}:`, err);
                 overallSuccess = false;
            }
        }

        return overallSuccess;
    }
}
