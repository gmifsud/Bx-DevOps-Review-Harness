import { Search, Columns, AlignJustify, ChevronRight, ChevronDown, FileCode, Eye, EyeOff } from "lucide-react";
import { PullRequest, FileDiff } from "../../../core/domain/types";

export interface DiffViewerProps {
  sidebarDock: "left" | "right";
  activePR: PullRequest | null;
  prsCount: number;
  loadingPrs: boolean;
  error: string | null;
  loadingDiff: boolean;
  filteredDiffs: FileDiff[];
  diffSearchQuery: string;
  setDiffSearchQuery: (query: string) => void;
  viewMode: "unified" | "split";
  setViewMode: (updater: (prev: "unified" | "split") => "unified" | "split") => void;
  collapsedFiles: Set<string>;
  toggleCollapse: (filePath: string) => void;
  disregardedFiles: Set<string>;
  toggleDisregard: (filePath: string) => void;
}

export function DiffViewer({
  sidebarDock,
  activePR,
  prsCount,
  loadingPrs,
  error,
  loadingDiff,
  filteredDiffs,
  diffSearchQuery,
  setDiffSearchQuery,
  viewMode,
  setViewMode,
  collapsedFiles,
  toggleCollapse,
  disregardedFiles,
  toggleDisregard,
}: DiffViewerProps) {
  return (
    <div
      className={`flex-1 flex flex-col min-w-0 bg-background ${
        sidebarDock === "left" ? "order-3" : "order-1 border-r border-border"
      }`}
    >
      <div className="h-12 flex items-center px-4 border-b border-border bg-card">
        {activePR ? (
          <>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-sm bg-foreground flex-shrink-0"></div>
              <h2 className="font-semibold text-[13px] truncate">
                <span className="font-mono text-muted-foreground mr-2">#{activePR.id}</span>
                {activePR.title}
              </h2>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <div className="relative mr-2">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={diffSearchQuery}
                  onChange={(e) => setDiffSearchQuery(e.target.value)}
                  placeholder="Search diffs..."
                  className="w-48 bg-background border border-border rounded-sm py-1 pl-8 pr-2 text-[12px] focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button
                onClick={() => setViewMode((v) => (v === "unified" ? "split" : "unified"))}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 bg-background border border-border rounded-sm"
                title={viewMode === "unified" ? "Switch to Split View" : "Switch to Unified View"}
              >
                {viewMode === "unified" ? <Columns className="w-3.5 h-3.5" /> : <AlignJustify className="w-3.5 h-3.5" />}
              </button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <span className="text-[11px] text-muted-foreground font-mono">{activePR.time}</span>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-[12px] font-mono tracking-tight">Select a Pull Request</div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-0">
        <div className="w-full h-full bg-background">
          {loadingDiff ? (
            <div className="p-6 text-muted-foreground text-[12px] font-mono">Loading diffs...</div>
          ) : filteredDiffs.length === 0 && activePR ? (
            <div className="p-6 text-muted-foreground text-[12px] font-mono">
              No file changes found or unable to construct diff.
            </div>
          ) : (
            filteredDiffs.map((fileDiff) => {
              const isCollapsed = collapsedFiles.has(fileDiff.filePath);
              const isDisregarded = disregardedFiles.has(fileDiff.filePath);

              return (
                <div
                  key={fileDiff.filePath}
                  className={`mb-0 border-b border-border last:border-b-0 ${isDisregarded ? "opacity-50 grayscale" : ""}`}
                >
                  <div className="bg-card px-4 py-2 border-b border-border flex justify-between items-center sticky top-0 shadow-none z-10 group">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCollapse(fileDiff.filePath)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <span
                        className={`text-[12px] font-mono text-foreground flex items-center gap-2 ${
                          isDisregarded ? "line-through" : ""
                        }`}
                      >
                        <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                        {fileDiff.filePath}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">{fileDiff.changeType}</span>
                      <button
                        onClick={() => toggleDisregard(fileDiff.filePath)}
                        title={isDisregarded ? "Restore change" : "Disregard change"}
                        className="text-muted-foreground hover:text-foreground opacity-20 group-hover:opacity-100 transition-opacity"
                      >
                        {isDisregarded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && !isDisregarded && (
                    <div className="font-mono text-[12px] leading-[1.5] flex flex-col select-text bg-background">
                      {fileDiff.patch?.hunks?.map((hunk: any, hi: number) => {
                        if (viewMode === "split") {
                          const splitLines: any[] = [];
                          let oldLineCounter = hunk.oldStart;
                          let newLineCounter = hunk.newStart;
                          let tempRemovals: any[] = [];
                          let tempAdditions: any[] = [];

                          const flush = () => {
                            const max = Math.max(tempRemovals.length, tempAdditions.length);
                            for (let i = 0; i < max; i++) {
                              splitLines.push({
                                left: tempRemovals[i] || null,
                                right: tempAdditions[i] || null,
                              });
                            }
                            tempRemovals = [];
                            tempAdditions = [];
                          };

                          hunk.lines.forEach((line: string) => {
                            if (line.startsWith("-")) {
                              tempRemovals.push({ line, num: oldLineCounter++, type: "sub" });
                            } else if (line.startsWith("+")) {
                              tempAdditions.push({ line, num: newLineCounter++, type: "add" });
                            } else if (line.startsWith("\\")) {
                              flush();
                              splitLines.push({ meta: true, text: line });
                            } else {
                              flush();
                              splitLines.push({
                                left: { line, num: oldLineCounter++, type: "context" },
                                right: { line, num: newLineCounter++, type: "context" },
                              });
                            }
                          });
                          flush();

                          return (
                            <div key={hi}>
                              <div className="bg-[rgba(97,175,239,0.15)] text-diff-brand px-4 py-1 text-[11px] border-b border-border">
                                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                              </div>
                              {splitLines.map((row, rowIdx) => {
                                if (row.meta) {
                                  return (
                                    <div
                                      key={rowIdx}
                                      className="text-diff-meta-text italic bg-background py-[1px] pl-[84px] text-[11px]"
                                    >
                                      {row.text}
                                    </div>
                                  );
                                }
                                return (
                                  <div key={rowIdx} className="flex border-b border-border/20">
                                    <div
                                      className={`w-1/2 min-w-0 max-w-[50%] flex border-r border-border min-h-[22px] ${
                                        row.left?.type === "sub"
                                          ? "bg-rose-500/15 text-rose-700 bg-diff-pattern-sub dark:bg-rose-500/20 dark:text-rose-400"
                                          : row.left
                                            ? "hover:bg-muted text-foreground bg-background"
                                            : "bg-background hover:bg-muted/50"
                                      }`}
                                    >
                                      <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                        {row.left ? row.left.num : ""}
                                      </div>
                                      <div className="pl-3 whitespace-pre overflow-x-auto overflow-y-hidden py-[1px]">
                                        {row.left ? row.left.line : ""}
                                      </div>
                                    </div>
                                    <div
                                      className={`w-1/2 min-w-0 max-w-[50%] flex min-h-[22px] ${
                                        row.right?.type === "add"
                                          ? "bg-emerald-500/15 text-emerald-700 bg-diff-pattern-add dark:bg-emerald-500/20 dark:text-emerald-400"
                                          : row.right
                                            ? "hover:bg-muted text-foreground bg-background"
                                            : "bg-background hover:bg-muted/50"
                                      }`}
                                    >
                                      <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                        {row.right ? row.right.num : ""}
                                      </div>
                                      <div className="pl-3 whitespace-pre overflow-x-auto overflow-y-hidden py-[1px]">
                                        {row.right ? row.right.line : ""}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        // Unified logic
                        let oldLine = hunk.oldStart;
                        let newLine = hunk.newStart;
                        return (
                          <div key={hi}>
                            <div className="bg-[rgba(97,175,239,0.15)] text-diff-brand px-4 py-1 text-[11px] border-b border-border">
                              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                            </div>
                            {hunk.lines.map((line: string, li: number) => {
                              const isAdd = line.startsWith("+");
                              const isSub = line.startsWith("-");
                              const isMeta = line.startsWith("\\");

                              const lineClass = isAdd
                                ? "bg-emerald-500/15 text-emerald-700 bg-diff-pattern-add dark:bg-emerald-500/20 dark:text-emerald-400"
                                : isSub
                                  ? "bg-rose-500/15 text-rose-700 bg-diff-pattern-sub dark:bg-rose-500/20 dark:text-rose-400"
                                  : isMeta
                                    ? "text-diff-meta-text italic bg-background"
                                    : "hover:bg-muted text-foreground bg-background";

                              const curOld = isAdd || isMeta ? "" : oldLine++;
                              const curNew = isSub || isMeta ? "" : newLine++;

                              return (
                                <div key={`${hi}-${li}`} className={`flex min-h-[22px] border-b border-border/20 ${lineClass}`}>
                                  <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                    {curOld}
                                  </div>
                                  <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                    {curNew}
                                  </div>
                                  <div className="pl-3 whitespace-pre overflow-x-auto overflow-y-hidden py-[1px] flex-1">{line}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Fallback mockup when no diff is present and not loading */}
          {prsCount === 0 && !loadingPrs && !error && (
            <div className="p-8">
              <div className="bg-card border border-border rounded-md p-6 max-w-lg text-center mx-auto">
                <p className="text-foreground mb-2 font-semibold">Azure DevOps Not Configured</p>
                <p className="text-muted-foreground text-[12px]">
                  Please supply your <span className="font-mono bg-background px-1">AZURE_DEVOPS_ORG_URL</span>,{" "}
                  <span className="font-mono bg-background px-1">AZURE_DEVOPS_PROJECT</span>, and{" "}
                  <span className="font-mono bg-background px-1">AZURE_DEVOPS_PAT</span> in your configuration to load actual Pull Requests.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
