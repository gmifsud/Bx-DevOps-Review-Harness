import { IPullRequestProvider, FileCommitDetails } from '../ports/IPullRequestProvider';
import { SuggestedFix } from '../domain/types';
import { FixPatcher } from '../services/FixPatcher';

export class ApplyFixUseCase {
    private fixPatcher: FixPatcher;

    constructor(private prProvider: IPullRequestProvider) {
        this.fixPatcher = new FixPatcher();
    }

    async execute(repoId: string, branchName: string, fix: SuggestedFix): Promise<boolean> {
        // 1. Fetch the absolute latest state of the file
        const { content: currentFileContent, branchSha } = await this.prProvider.getFileContent(repoId, fix.filePath, branchName);

        // 2. Perform the patch via the Patcher (Pure Logic)
        const patchedContent = this.fixPatcher.apply(fix, currentFileContent);

        // 3. Prepare the commit details
        const commitDetails: FileCommitDetails[] = [{
            filePath: fix.filePath,
            newContent: patchedContent,
            changeType: 'edit'
        }];

        // 4. Send to the imperative shell to mutate state
        return this.prProvider.commitChanges(repoId, branchName, branchSha, commitDetails, fix.commitMessage);
    }
}
