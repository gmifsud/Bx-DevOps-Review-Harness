import { useState, useEffect } from "react";
import { PolicyStatus } from "../../../core/ports/IPullRequestProvider";

interface MergePanelProps {
   repoId: string;
   prId: number;
   hasPendingFixes: boolean;
   onCompleteMerge: () => void;
}

export function MergePanel({ repoId, prId, hasPendingFixes, onCompleteMerge }: MergePanelProps) {
   const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
   const [loadingPolicies, setLoadingPolicies] = useState(true);
   const [showConfirmModal, setShowConfirmModal] = useState(false);
   const [confirmText, setConfirmText] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [mergeError, setMergeError] = useState<string | null>(null);

   useEffect(() => {
       let active = true;
       const fetchPolicies = async () => {
           setLoadingPolicies(true);
           try {
               const result = await (window as any).electronAPI.getPrPolicies(repoId, prId);
               if (active) setPolicyStatus(result);
           } catch (err: any) {
               console.error("Failed to load policies", err);
           } finally {
               if (active) setLoadingPolicies(false);
           }
       };
       fetchPolicies();
       const interval = setInterval(fetchPolicies, 10000); // Poll every 10s
       
       return () => { 
           active = false; 
           clearInterval(interval);
       };
   }, [repoId, prId]);

   const canMerge = policyStatus?.isPassing && !hasPendingFixes;

   const handleMergeClick = async () => {
       if (confirmText !== "MERGE") return;
       setSubmitting(true);
       setMergeError(null);
       try {
           const engineerDisplayName = "Local Engineer"; // Or get from config
           const timestampUtc = new Date().toISOString();
           await (window as any).electronAPI.completePr(repoId, prId, { engineerDisplayName, timestampUtc });
           setShowConfirmModal(false);
           onCompleteMerge();
       } catch (error: any) {
           setMergeError(error.message);
       } finally {
           setSubmitting(false);
       }
   };

   return (
       <div className="bg-card border-t border-border p-4 flex flex-col gap-3 mt-auto">
           <div className="flex flex-col gap-1">
               <span className="text-[11px] font-semibold text-foreground">Merge Readiness</span>
               {loadingPolicies && !policyStatus ? (
                   <span className="text-[10px] text-muted-foreground">Checking policies...</span>
               ) : (
                   <div className="flex flex-col gap-1">
                       <div className="flex justify-between items-center text-[10px] font-mono">
                           <span className={!hasPendingFixes ? "text-green-500" : "text-yellow-500"}>AI Fixes</span>
                           <span>{!hasPendingFixes ? "Resolved" : "Pending"}</span>
                       </div>
                       <div className="flex flex-col gap-1 text-[10px] font-mono">
                           <div className="flex justify-between items-center text-[10px] font-mono">
                               <span className={policyStatus?.isPassing ? "text-green-500" : "text-destructive"}>Policies</span>
                               <span>{policyStatus?.isPassing ? "Passing" : "Failing"}</span>
                           </div>
                           {policyStatus?.policies.length && policyStatus.policies.length > 0 && policyStatus.policies.map((p, idx) => (
                               <div key={idx} className="text-[9px] text-muted-foreground ml-2 truncate" title={p}>- {p}</div>
                           ))}
                       </div>
                   </div>
               )}
           </div>

           <button
               disabled={!canMerge}
               onClick={() => setShowConfirmModal(true)}
               className={`w-full py-2 text-[12px] font-bold rounded-sm transition-colors ${
                   canMerge ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
               }`}
           >
               Complete Pull Request
           </button>

           {showConfirmModal && (
               <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                   <div className="bg-card border border-border p-6 rounded-md shadow-lg max-w-sm w-full flex flex-col gap-4">
                       <h3 className="text-lg font-bold">Confirm Merge</h3>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                           You are about to approve and complete this pull request. The reviewer vote will be set to Approved. Type <strong>MERGE</strong> to confirm.
                       </p>
                       <input 
                           type="text" 
                           value={confirmText}
                           onChange={(e) => setConfirmText(e.target.value)}
                           className="bg-background border border-border p-2 rounded-sm text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                           placeholder="Type MERGE"
                           autoFocus
                       />
                       {mergeError && (
                           <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-sm border border-destructive/20 break-words">
                               {mergeError}
                           </div>
                       )}
                       <div className="flex gap-2 justify-end mt-2">
                           <button 
                               onClick={() => { setShowConfirmModal(false); setConfirmText(""); setMergeError(null); }}
                               className="px-4 py-2 border border-border bg-background text-sm font-semibold rounded-sm hover:bg-muted"
                               disabled={submitting}
                           >
                               Cancel
                           </button>
                           <button 
                               onClick={handleMergeClick}
                               disabled={confirmText !== "MERGE" || submitting}
                               className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:opacity-90 disabled:opacity-50"
                           >
                               {submitting ? "Merging..." : "Confirm Merge"}
                           </button>
                       </div>
                   </div>
               </div>
           )}
       </div>
   );
}
