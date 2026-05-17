import { useState, useEffect } from "react";
import { SuggestedFix } from "../../../core/domain/types";

interface FixCardProps {
  repoId: string;
  sourceBranch: string;
  fix: SuggestedFix;
  applyingFix: boolean;
  onApplyFix: (filePath: string, searchBlock: string, replaceBlock: string, commitMessage: string) => void;
  onUpdateFix: (updatedFix: SuggestedFix) => void; // Optional: To bubble up changes to the review state if needed for BulkApply
}

export function FixCard({ repoId, sourceBranch, fix, applyingFix, onApplyFix, onUpdateFix }: FixCardProps) {
  const [confidenceInfo, setConfidenceInfo] = useState<{tier: string, reason?: string, confidence?: number} | null>(null);
  const [editedReplaceBlock, setEditedReplaceBlock] = useState(fix.replaceBlock);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let active = true;
    const computeDryRun = async () => {
      try {
        const info = await (window as any).electronAPI.dryRunFix(repoId, sourceBranch, fix.filePath, fix.searchBlock, editedReplaceBlock);
        if (active) setConfidenceInfo(info);
      } catch (err) {
        console.error("Dry run failed", err);
      }
    };
    computeDryRun();
    return () => { active = false; };
  }, [repoId, sourceBranch, fix.filePath, fix.searchBlock, editedReplaceBlock]);

  const handleApplyClick = () => {
    onApplyFix(fix.filePath, fix.searchBlock, editedReplaceBlock, fix.commitMessage);
  };

  const getConfidenceColor = (tier?: string) => {
    switch (tier) {
      case 'T0_Exact': return 'bg-green-500/20 text-green-500 border-green-500';
      case 'T1_LineAnchored': return 'bg-blue-500/20 text-blue-500 border-blue-500';
      case 'T2_Fuzzy': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500';
      case 'T3_Reject': return 'bg-red-500/20 text-red-500 border-red-500';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500';
    }
  };

  const getTierLabel = (tier?: string) => {
    if (!tier) return 'Computing...';
    if (tier === 'T3_Reject') return 'Conflict / Rejected';
    return tier.replace('_', ' ');
  };

  return (
    <div className="bg-card border border-border rounded-sm p-3 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="text-[11px] text-foreground border-l-2 border-primary pl-2 font-semibold truncate hover:whitespace-normal" title={fix.commitMessage}>
          {fix.commitMessage}
        </div>
        
        {confidenceInfo && (
           <div className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-mono font-bold whitespace-nowrap ${getConfidenceColor(confidenceInfo.tier)}`} title={confidenceInfo.reason || ''}>
             {getTierLabel(confidenceInfo.tier)} {confidenceInfo.confidence ? `(${(confidenceInfo.confidence * 100).toFixed(0)}%)` : ''}
           </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Search Block</span>
        <pre className="text-[10px] overflow-auto bg-background p-2 rounded-sm border border-border text-red-400 font-mono">
          {fix.searchBlock}
        </pre>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Replace Block</span>
          <button 
             onClick={() => setIsEditing(!isEditing)} 
             className="text-[10px] text-primary hover:underline hover:text-primary-foreground focus:outline-none"
          >
             {isEditing ? "Save / Preview" : "Edit"}
          </button>
        </div>
        
        {isEditing ? (
          <textarea
            className="text-[10px] bg-background p-2 rounded-sm border border-primary text-green-400 font-mono w-full min-h-[100px] focus:outline-none"
            value={editedReplaceBlock}
            onChange={(e) => {
               setEditedReplaceBlock(e.target.value);
               onUpdateFix({ ...fix, replaceBlock: e.target.value });
            }}
          />
        ) : (
          <pre className="text-[10px] overflow-auto bg-background p-2 rounded-sm border border-border text-green-400 font-mono">
            {editedReplaceBlock}
          </pre>
        )}
      </div>

      <button
        onClick={handleApplyClick}
        disabled={applyingFix || fix.status === "APPLIED" || confidenceInfo?.tier === "T3_Reject"}
        className={`w-full bg-background border py-1.5 mt-1 rounded-sm text-[11px] font-semibold transition-colors ${
          fix.status === "APPLIED" 
            ? "border-primary bg-primary/20 text-primary opacity-80 cursor-default" 
            : confidenceInfo?.tier === "T3_Reject"
            ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
            : "border-border hover:border-primary hover:text-primary disabled:opacity-50"
        }`}
      >
        {fix.status === "APPLIED" ? "Applied" : applyingFix ? "Applying..." : "Apply Fix"}
      </button>
    </div>
  );
}
