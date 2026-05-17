import { expect, test, describe, vi } from 'vitest';
import { ReviewOrchestrator } from './ReviewOrchestrator';
import { IPullRequestProvider } from '../ports/IPullRequestProvider';
import { IAIService } from '../ports/IAIService';
import { FileDiff } from '../domain/types';

describe('ReviewOrchestrator', () => {
    test('chunks files and calls AI service', async () => {
        const mockPrProvider = {
            getFileContent: vi.fn().mockResolvedValue({ content: 'test content', objectId: '123' })
        } as unknown as IPullRequestProvider;

        const mockAiService = {
            reviewCodeDiff: vi.fn().mockResolvedValue({
                status: 'approved',
                comments: 'Looks good',
                suggestedFixes: []
            })
        } as unknown as IAIService;

        const orchestrator = new ReviewOrchestrator(mockPrProvider, mockAiService);

        const diffs: FileDiff[] = [
            { filePath: 'file1.ts', changeType: 'edit', patch: 'patch1' },
            { filePath: 'file2.ts', changeType: 'edit', patch: 'patch2' },
            { filePath: 'file3.ts', changeType: 'edit', patch: 'patch3' },
        ];

        const review = await orchestrator.orchestrateReview('repo1', 'main', diffs);

        expect(mockPrProvider.getFileContent).toHaveBeenCalledTimes(3);
        expect(mockAiService.reviewCodeDiff).toHaveBeenCalledTimes(2); // Chunk size is 2, 3 files -> 2 chunks
        expect(review.status).toBe('approved');
        expect(review.comments).toContain('Batch 1');
        expect(review.comments).toContain('Batch 2');
        expect(review.id).toBeDefined();
    });

    test('skips disregarded files', async () => {
        const mockPrProvider = {
            getFileContent: vi.fn()
        } as unknown as IPullRequestProvider;

        const mockAiService = {
            reviewCodeDiff: vi.fn()
        } as unknown as IAIService;

        const orchestrator = new ReviewOrchestrator(mockPrProvider, mockAiService);

        const diffs: FileDiff[] = [
            { filePath: 'file1.ts', changeType: 'edit', patch: 'patch1', isDisregarded: true }
        ];

        const review = await orchestrator.orchestrateReview('repo1', 'main', diffs);
        expect(review.status).toBe('approved');
        expect(review.comments).toBe('No files to review.');
        expect(mockPrProvider.getFileContent).not.toHaveBeenCalled();
        expect(mockAiService.reviewCodeDiff).not.toHaveBeenCalled();
    });
});
