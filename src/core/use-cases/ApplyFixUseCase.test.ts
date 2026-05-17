import { expect, test, describe, vi } from 'vitest';
import { ApplyFixUseCase } from './ApplyFixUseCase';
import { IPullRequestProvider } from '../ports/IPullRequestProvider';
import { PatchNotFoundError } from '../domain/errors';

describe('ApplyFixUseCase', () => {
    test('successfully applies a fix', async () => {
        const mockPrProvider = {
            getFileContent: vi.fn().mockResolvedValue({ content: 'function hello() {\n  console.log("hello");\n}', objectId: '123', branchSha: '123' }),
            commitChanges: vi.fn().mockResolvedValue(true)
        } as unknown as IPullRequestProvider;

        const useCase = new ApplyFixUseCase(mockPrProvider);

        const result = await useCase.execute(
            'repo1',
            'main',
            {
                filePath: 'file1.ts',
                searchBlock: 'console.log("hello");',
                replaceBlock: 'console.log("world");',
                commitMessage: 'Fix typo'
            }
        );

        expect(result).toBe(true);
        expect(mockPrProvider.commitChanges).toHaveBeenCalledWith(
            'repo1',
            'main',
            '123',
            [{
                filePath: 'file1.ts',
                changeType: 'edit',
                newContent: 'function hello() {\n  console.log("world");\n}'
            }],
            'Fix typo'
        );
    });

    test('throws PatchNotFoundError when search block is not found', async () => {
         const mockPrProvider = {
            getFileContent: vi.fn().mockResolvedValue({ content: 'function hello() {\n  console.log("hello");\n}', objectId: '123', branchSha: '123' }),
            commitChanges: vi.fn()
        } as unknown as IPullRequestProvider;

        const useCase = new ApplyFixUseCase(mockPrProvider);

        await expect(() => useCase.execute(
            'repo1',
            'main',
             {
                filePath: 'file1.ts',
                searchBlock: 'console.log("mismatch");',
                replaceBlock: 'console.log("world");',
                commitMessage: 'Fix typo'
            }
        )).rejects.toThrowError(PatchNotFoundError);

        expect(mockPrProvider.commitChanges).not.toHaveBeenCalled();
    });
});
