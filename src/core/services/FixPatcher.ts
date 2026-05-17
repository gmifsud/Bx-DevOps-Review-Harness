import { SuggestedFix } from '../domain/types';
import { diff_match_patch } from 'diff-match-patch';
import { AmbiguousMatchError, PatchNotFoundError } from '../domain/errors';

export type MatchTier = 'T0_Exact' | 'T1_LineAnchored' | 'T2_Fuzzy' | 'T3_Reject';

export type PatchPreview = 
  | { tier: Exclude<MatchTier, 'T3_Reject'>; patchedContent: string; confidence: number }
  | { tier: 'T3_Reject'; reason: string };

export class FixPatcher {
    dryRun(fix: SuggestedFix, fileContent: string): PatchPreview {
        const { searchBlock, replaceBlock } = fix;
        
        // Try T0: Exact Match
        const t0Result = this.tryExactMatch(fileContent, searchBlock, replaceBlock);
        if (t0Result !== null) {
            if (t0Result === 'ambiguous') return { tier: 'T3_Reject', reason: 'Ambiguous Exact Match' };
            return { tier: 'T0_Exact', patchedContent: t0Result, confidence: 1.0 };
        }

        // Try T1: Line-anchored (subset match, stripping leading/trailing empty lines / indentations)
        const t1Result = this.tryLineAnchoredMatch(fileContent, searchBlock, replaceBlock);
        if (t1Result !== null) {
             if (t1Result === 'ambiguous') return { tier: 'T3_Reject', reason: 'Ambiguous Line-Anchored Match' };
             return { tier: 'T1_LineAnchored', patchedContent: t1Result, confidence: 0.8 };
        }

        // Try T2: Fuzzy Match using diff-match-patch
        const t2Result = this.tryFuzzyMatch(fileContent, searchBlock, replaceBlock);
        if (t2Result !== null) {
             return { tier: 'T2_Fuzzy', patchedContent: t2Result, confidence: 0.6 };
        }

        return { tier: 'T3_Reject', reason: 'No match found via any tier' };
    }

    apply(fix: SuggestedFix, fileContent: string): string {
        const preview = this.dryRun(fix, fileContent);
        if (preview.tier === 'T3_Reject') {
            if (preview.reason.includes('Ambiguous')) {
                throw new AmbiguousMatchError(preview.reason);
            }
            throw new PatchNotFoundError(preview.reason);
        }
        return preview.patchedContent;
    }

    private tryExactMatch(content: string, search: string, replace: string): string | 'ambiguous' | null {
        const occurrences = content.split(search).length - 1;
        if (occurrences === 1) {
            return content.replace(search, replace);
        }
        if (occurrences > 1) return 'ambiguous';
        return null;
    }

    private tryLineAnchoredMatch(content: string, search: string, replace: string): string | 'ambiguous' | null {
        // Split by lines and trim each line's leading/trailing white space for comparison
        const contentLines = content.split('\n');
        const searchLines = search.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        if (searchLines.length === 0) return null;

        let matchIndices: number[] = [];
        
        for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
            let matches = true;
            for (let j = 0; j < searchLines.length; j++) {
                if (contentLines[i + j].trim() !== searchLines[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                matchIndices.push(i);
            }
        }

        if (matchIndices.length === 1) {
            const startLine = matchIndices[0];
            const endLine = startLine + searchLines.length - 1;
            
            const before = contentLines.slice(0, startLine).join('\n');
            const after = contentLines.slice(endLine + 1).join('\n');
            
            const prefix = before.length > 0 ? before + '\n' : '';
            const suffix = after.length > 0 ? '\n' + after : '';
            
            return prefix + replace + suffix;
        }
        if (matchIndices.length > 1) return 'ambiguous';

        return null;
    }

    private tryFuzzyMatch(content: string, search: string, replace: string): string | null {
        const dmp = new diff_match_patch();
        dmp.Match_Threshold = 0.5; // Back to default
        dmp.Match_Distance = 1000;
        
        // We evaluate patch reliability based on applying the diff to the content
        const diffs = dmp.diff_main(search, replace);
        dmp.diff_cleanupSemantic(diffs);
        const patches = dmp.patch_make(search, diffs);
        
        const [newText, results] = dmp.patch_apply(patches, content);
        if (results.length > 0 && results.every(r => r === true)) {
             return newText;
        }
        return null;
    }
}
