import { useState } from "react";
import { PullRequest, FileDiff, AIReview, SuggestedFix } from "../../../core/domain/types";
import { FixCard } from "./FixCard";
import { MergePanel } from "./MergePanel";

export interface ReviewSidebarProps {
  sidebarDock: "left" | "right";
  activePR: PullRequest | null;
  diffs: FileDiff[];
  aiReview: AIReview | null;
  generatingReview: boolean;
  applyingFix: boolean;
  handleGenerateReview: () => void;
  handleApplyFix: (filePath: string, searchBlock: string, replaceBlock: string, commitMessage: string) => void;
  handleBulkApply?: (fixes: SuggestedFix[]) => void;
  handleUpdateFix?: (updatedFix: SuggestedFix) => void;
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
  handleBulkApply,
  handleUpdateFix,
}: ReviewSidebarProps) {
  const [provenanceOpen, setProvenanceOpen] = useState(false);

  // Group fixes by file path
  const fixesByFile = aiReview?.suggestedFixes?.reduce((acc, fix) => {
    if (!acc[fix.filePath]) acc[fix.filePath] = [];
    acc[fix.filePath].push(fix);
    return acc;
  }, {} as Record<string, SuggestedFix[]>) || {};

  const filePaths = Object.keys(fixesByFile);
  const pendingFixes = aiReview?.suggestedFixes?.filter(f => f.status !== "APPLIED") || [];

  return (
    <div
      className={`w-[350px] flex-shrink-0 bg-card flex flex-col p-4 ${
        sidebarDock === "left" ? "order-4 border-l border-border" : "order-2 border-r border-border"
      }`}
    >
      <div className="text-[14px] font-semibold mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <span className="tracking-tight text-[11px]">AI Review</span>
           <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold leading-none flex items-center h-[18px]">
             Gemini 2.5 Pro
           </span>
        </div>
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
          <div className="flex flex-col gap-4">
            {filePaths.length > 0 && (
              <div className="flex justify-between items-center bg-background border border-border p-2 rounded-md">
                 <span className="text-[11px] font-mono text-foreground font-semibold">
                   {pendingFixes.length} Pending Fixes
                 </span>
                 <button
                    onClick={() => handleBulkApply && handleBulkApply(pendingFixes)}
                    disabled={applyingFix || pendingFixes.length === 0}
                    className="bg-primary text-primary-foreground font-bold hover:opacity-80 px-2 py-1 text-[10px] rounded-sm disabled:opacity-50 transition-opacity"
                 >
                    {applyingFix ? "Applying..." : "Bulk Apply Pending"}
                 </button>
              </div>
            )}
             
            {filePaths.map(filePath => (
              <div key={filePath} className="bg-background border border-border rounded-md flex flex-col">
                 <div className="p-2 border-b border-border/50 bg-secondary/50">
                    <span className="text-[11px] font-mono text-foreground font-bold break-all">
                       {filePath}
                    </span>
                 </div>
                 <div className="p-2 flex flex-col gap-3">
                    {fixesByFile[filePath].map((fix, idx) => (
                       <FixCard 
                         key={idx}
                         repoId={activePR?.repositoryId || ""}
                         sourceBranch={activePR?.sourceBranch || ""}
                         fix={fix}
                         applyingFix={applyingFix}
                         onApplyFix={handleApplyFix}
                         onUpdateFix={handleUpdateFix || (() => {})}
                       />
                    ))}
                 </div>
              </div>
            ))}

            <div className={`bg-background border border-border rounded-md flex flex-col ${aiReview.status === "approved" ? "border-primary/50" : "border-destructive/50"}`}>
               <button 
                  onClick={() => setProvenanceOpen(!provenanceOpen)}
                  className="p-3 flex justify-between items-center focus:outline-none w-full text-left"
               >
                 <span className="text-[11px] font-mono uppercase tracking-[0.05em] font-bold text-muted-foreground">
                   Review Provenance
                 </span>
                 <span className={aiReview.status === "approved" ? "text-primary text-[10px] font-bold" : "text-destructive text-[10px] font-bold uppercase"}>
                   {aiReview.status} {provenanceOpen ? '▼' : '▶'}
                 </span>
               </button>
               {provenanceOpen && (
                 <div className="p-3 border-t border-border/50 text-[12px] leading-[1.5] text-foreground whitespace-pre-wrap font-mono overflow-auto max-h-[300px]">
                   {aiReview.comments}
                 </div>
               )}
            </div>
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

      <div className="mt-auto pt-4 border-t border-border mt-4 flex flex-col gap-4">
        <button
          onClick={handleGenerateReview}
          className="w-full bg-primary hover:bg-primary text-primary-foreground hover:text-foreground border border-accent hover:border-border py-2.5 px-4 rounded-md font-semibold text-[13px] transition-colors text-center disabled:opacity-50 disabled:bg-card disabled:text-muted-foreground disabled:border-border"
          disabled={!activePR || diffs.length === 0 || generatingReview}
        >
          {generatingReview ? "Reviewing..." : "Submit AI Review"}
        </button>

        {activePR && aiReview && !generatingReview && (
           <MergePanel
              repoId={activePR.repositoryId}
              prId={activePR.id}
              hasPendingFixes={pendingFixes.length > 0}
              onCompleteMerge={() => {
                  alert("Pull Request Successfully Completed!");
              }}
           />
        )}
      </div>
    </div>
  );
}
