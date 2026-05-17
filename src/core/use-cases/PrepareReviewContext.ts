import { FileDiff } from '../domain/types';

export function prepareDiffForAI(diffs: FileDiff[], maxFiles: number = 3): string {
    // Pure logic: filtering, mapping, formatting.
    // You can test this in milliseconds by passing in a fake array of diffs.
    // No mocks needed.
    const relevantDiffs = diffs.filter(d => !d.isDisregarded).slice(0, maxFiles);
    return relevantDiffs.map(d => `File: ${d.filePath}\n${JSON.stringify(d.patch)}`).join('\n\n');
}
