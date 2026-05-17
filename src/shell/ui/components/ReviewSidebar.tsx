import { PullRequest, FileDiff, AIReview } from "../../../core/domain/types";

export interface ReviewSidebarProps {
  sidebarDock: "left" | "right";
  activePR: PullRequest | null;
  diffs: FileDiff[];
  aiReview: AIReview | null;
  generatingReview: boolean;
  applyingFix: boolean;
  handleGenerateReview: () => void;
  handleApplyFix: (filePath: string, searchBlock: string, replaceBlock: string, commitMessage: string) => void;
}

export function ReviewSidebar({
  sidebarDock,
  activePR,
  diffs,
  aiReview,
  generatingReview,
  applyingFix,
  handleGenerateReview,
  handleApplyFix,
}: ReviewSidebarProps) {
  return (
    <div
      className={`w-[250px] flex-shrink-0 bg-card flex flex-col p-4 ${
        sidebarDock === "left" ? "order-4 border-l border-border" : "order-2 border-r border-border"
      }`}
    >
      <div className="text-[14px] font-semibold mb-4 flex items-center gap-2">
        <span className="tracking-tight text-[11px]">AI Review</span>
        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold leading-none flex items-center h-[18px]">
          Gemini 2.5 Pro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4">
        <div className="bg-background border border-border rounded-md p-3">
          <div className="text-[10px] text-muted-foreground font-mono uppercase mb-2 tracking-[0.05em]">
            Analysis Scope
          </div>
          <div className="text-[13px] leading-[1.4] mb-1 text-foreground">
            Scanning <span className="font-mono text-primary-foreground">{diffs.length}</span> file(s).
          </div>
          {activePR && (
            <div className="text-[11px] text-muted-foreground">
              For <span className="font-mono">#{activePR.id}</span>
            </div>
          )}
        </div>

        {generatingReview && (
          <div className="p-4 text-center text-muted-foreground text-[11px] font-mono animate-pulse">
            Generating Review...
          </div>
        )}

        {aiReview && !generatingReview && (
          <div
            className={`bg-background border border-border rounded-md flex flex-col ${
              aiReview.status === "approved" ? "border-primary/50" : "border-destructive/50"
            }`}
          >
            <div className="p-3 border-b border-border/50">
              <div className="text-[10px] text-muted-foreground font-mono uppercase mb-2 tracking-[0.05em] flex justify-between">
                <span>Findings</span>
                <span className={aiReview.status === "approved" ? "text-primary" : "text-destructive uppercase"}>
                  {aiReview.status}
                </span>
              </div>
              <div className="text-[13px] leading-[1.4] text-foreground whitespace-pre-wrap">
                {aiReview.comments}
              </div>
            </div>

            {aiReview.suggestedFixes && aiReview.suggestedFixes.length > 0 && (
              <div className="p-3 flex flex-col gap-3">
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.05em]">
                  Suggested Fixes
                </div>
                {aiReview.suggestedFixes.map((fix, idx) => (
                  <div key={idx} className="bg-card border border-border rounded-sm p-2 flex flex-col gap-2">
                    <div className="text-[11px] font-mono text-muted-foreground truncate" title={fix.filePath}>
                      {fix.filePath}
                    </div>
                    <div className="text-[11px] text-foreground border-l-2 border-primary pl-2 mb-1">
                      {fix.commitMessage}
                    </div>
                    <button
                      onClick={() => handleApplyFix(fix.filePath, fix.searchBlock, fix.replaceBlock, fix.commitMessage)}
                      disabled={applyingFix}
                      className="w-full bg-background border border-border hover:border-primary hover:text-primary transition-colors text-[11px] py-1 rounded-sm disabled:opacity-50"
                    >
                      {applyingFix ? "Applying..." : "Apply Fix"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!aiReview && !generatingReview && diffs.length > 0 && (
          <div className="bg-background border border-border rounded-md p-3">
            <div className="text-[10px] text-muted-foreground font-mono uppercase mb-2 tracking-[0.05em]">
              Ready for Review
            </div>
            <div className="text-[13px] leading-[1.4] mb-3 text-foreground">
              Click below to generate an AI review using Gemini 2.5 Pro.
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border mt-4">
        <button
          onClick={handleGenerateReview}
          className="w-full bg-primary hover:bg-primary text-primary-foreground hover:text-foreground border border-accent hover:border-border py-2.5 px-4 rounded-md font-semibold text-[13px] transition-colors text-center disabled:opacity-50 disabled:bg-card disabled:text-muted-foreground disabled:border-border"
          disabled={!activePR || diffs.length === 0 || generatingReview}
        >
          {generatingReview ? "Reviewing..." : "Submit AI Review"}
        </button>
      </div>
    </div>
  );
}
