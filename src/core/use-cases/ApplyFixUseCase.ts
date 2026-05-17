import { IPullRequestProvider, FileCommitDetails } from '../ports/IPullRequestProvider';
import { SuggestedFix } from '../domain/types';

export class ApplyFixUseCase {
    constructor(private prProvider: IPullRequestProvider) {}

    async execute(repoId: string, branchName: string, fix: SuggestedFix): Promise<boolean> {
        // 1. Fetch the absolute latest state of the file
        const currentFileContent = await this.prProvider.getFileContent(repoId, fix.filePath, branchName);

        // 2. Perform the patch (Pure Logic)
        if (!currentFileContent.includes(fix.searchBlock)) {
            // The AI hallucinated the search block, or the file changed. 
            // In a mature app, you'd use a fuzzy match or Levenshtein distance here.
            throw new Error("Could not find the exact code block to replace. The file may have changed.");
        }

        const patchedContent = currentFileContent.replace(fix.searchBlock, fix.replaceBlock);

        // 3. Prepare the commit details
        const commitDetails: FileCommitDetails[] = [{
            filePath: fix.filePath,
            newContent: patchedContent,
            changeType: 'edit'
        }];

        // 4. Send to the imperative shell to mutate state
        return this.prProvider.commitChanges(repoId, branchName, commitDetails, fix.commitMessage);
    }
}
