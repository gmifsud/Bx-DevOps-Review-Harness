import { expect, test, describe } from 'vitest';
import { FixPatcher } from './FixPatcher';
import { SuggestedFix } from '../domain/types';

describe('FixPatcher', () => {
    const patcher = new FixPatcher();

    const makeFix = (searchBlock: string, replaceBlock: string): SuggestedFix => ({
        filePath: 'test.ts',
        searchBlock,
        replaceBlock,
        commitMessage: 'fix'
    });

    test('T0_Exact: Applies exact match successfully', () => {
        const content = `function add(a, b) {\n  return a + c;\n}`;
        const search = `  return a + c;`;
        const replace = `  return a + b;`;
        const fix = makeFix(search, replace);

        const result = patcher.dryRun(fix, content);
        expect(result.tier).toBe('T0_Exact');
        if (result.tier !== 'T3_Reject') {
            expect(result.patchedContent).toBe(`function add(a, b) {\n  return a + b;\n}`);
        }
    });

    test('T3_Reject: Ambiguous exact match', () => {
        const content = `function a() { return 1; }\nfunction b() { return 1; }`;
        const search = `return 1;`;
        const replace = `return 2;`;
        const fix = makeFix(search, replace);

        const result = patcher.dryRun(fix, content);
        expect(result.tier).toBe('T3_Reject');
        if (result.tier === 'T3_Reject') {
            expect(result.reason).toContain('Ambiguous');
        }
    });

    test('T1_LineAnchored: Leading/trailing whitespace differences', () => {
        const content = `function hello() {\n   console.log("hello");\n}`;
        const search = `\n    console.log("hello"); \n`;
        const replace = `   console.log("world");`;
        const fix = makeFix(search, replace);

        const result = patcher.dryRun(fix, content);
        expect(result.tier).toBe('T1_LineAnchored');
        if (result.tier !== 'T3_Reject') {
            expect(result.patchedContent).toBe(`function hello() {\n   console.log("world");\n}`);
        }
    });

    test('T1_LineAnchored: Tab/space substitution and absent lines (hallucinated indentations)', () => {
        const content = `class A {\n\tfoo() {\n\t\tbar();\n\t}\n}`;
        const search = `  foo() {\n    bar();\n  }`; // spaces instead of tabs
        const replace = `  foo() {\n    baz();\n  }`;
        const fix = makeFix(search, replace);

        const result = patcher.dryRun(fix, content);
        expect(result.tier).toBe('T1_LineAnchored');
        if (result.tier !== 'T3_Reject') {
            expect(result.patchedContent).toBe(`class A {\n  foo() {\n    baz();\n  }\n}`);
        }
    });

    test('T2_Fuzzy: Fuzzy match with diff-match-patch', () => {
        const content = `const x = 1;\nconst y = 2;\nconst z = 3;`;
        const search = `const x = 1;\nconst w = 2;\nconst z = 3;`; // small typo w instead of y
        const replace = `const x = 1;\nconst y = 99;\nconst z = 3;`;
        const fix = makeFix(search, replace);
        
        const result = patcher.dryRun(fix, content);
        expect(result.tier).toBe('T2_Fuzzy');
        if (result.tier !== 'T3_Reject') {
             expect(result.patchedContent).toBe(`const x = 1;\nconst y = 99;\nconst z = 3;`);
        }
    });

    test('T3_Reject: Absent block completely', () => {
        const content = `console.log('hi');`;
        const search = `console.log('hello_world_this_should_not_fuzzy');`;
        const replace = `console.log('bye');`;
        const fix = makeFix(search, replace);

        const result = patcher.dryRun(fix, content);
        expect(result.tier).toBe('T3_Reject');
        if (result.tier === 'T3_Reject') {
             expect(result.reason).toContain('No match');
        }
    });
});
