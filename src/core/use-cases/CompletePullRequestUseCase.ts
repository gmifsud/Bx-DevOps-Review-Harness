import { IPullRequestProvider } from '../ports/IPullRequestProvider';
import { MergeError } from '../domain/errors';

export interface MergeConfirmation {
    engineerDisplayName: string;
    timestampUtc: string;
}

export class CompletePullRequestUseCase {
    constructor(private prProvider: IPullRequestProvider) {}

    async execute(
         repoId: string, 
         prId: number, 
         confirmation: MergeConfirmation
    ): Promise<boolean> {
        // Validation: Verify standard metadata exists
        if (!confirmation || !confirmation.engineerDisplayName || !confirmation.timestampUtc) {
             throw new MergeError("Merge must be explicitly confirmed by an engineer.");
        }

        // 1. Verify policies one final time
        const policyStatus = await this.prProvider.getPullRequestPolicyStatus(repoId, prId);
        if (!policyStatus.isPassing) {
             throw new MergeError(`Cannot complete PR. Policies are failing: ${policyStatus.policies.join(', ')}`);
        }

        // 2. Set vote to Approved (10 is approved in ADO)
        await this.prProvider.setReviewerVote(repoId, prId, 10);

        // 3. Complete PR
        return this.prProvider.completePullRequest(repoId, prId);
    }
}
