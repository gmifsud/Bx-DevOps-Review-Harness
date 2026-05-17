/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Settings,
  GitPullRequest,
  Search,
  MessageSquare,
  Check,
  FileDiff,
  AlertTriangle,
  X,
  GripVertical,
  PanelLeft,
  PanelRight,
  ThumbsUp,
  ThumbsDown,
  Columns,
  AlignJustify,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Eye,
} from "lucide-react";
import { THEMES, AppTheme } from "./themes";

interface PR {
  id: number;
  title: string;
  author: string;
  time: string;
  repositoryId: string;
}

export default function App() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [activePR, setActivePR] = useState<PR | null>(null);
  const [diffs, setDiffs] = useState<any[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(THEMES[0]);

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [sidebarDock, setSidebarDock] = useState<"left" | "right">("left");
  const [isDragging, setIsDragging] = useState(false);
  const [prStatuses, setPrStatuses] = useState<
    Record<number, "approved" | "rejected">
  >({});

  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [disregardedFiles, setDisregardedFiles] = useState<Set<string>>(
    new Set(),
  );
  const [diffSearchQuery, setDiffSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const toggleCollapse = (filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const toggleDisregard = (filePath: string) => {
    setDisregardedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const filteredDiffs = diffs.filter((fileDiff) => {
    if (diffSearchQuery.trim() === "") return true;
    const q = diffSearchQuery.toLowerCase();
    if (fileDiff.filePath.toLowerCase().includes(q)) return true;
    return fileDiff.patch?.hunks?.some((h: any) =>
      h.lines.some((l: string) => l.toLowerCase().includes(q)),
    );
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      if (sidebarDock === "left") {
        setSidebarWidth(Math.max(200, Math.min(e.clientX, 800)));
      } else {
        setSidebarWidth(
          Math.max(200, Math.min(document.body.clientWidth - e.clientX, 800)),
        );
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.body.style.cursor = "col-resize";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.body.style.cursor = "";
    }

    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, sidebarDock]);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    // Remove old theme classes
    THEMES.forEach((t) => root.classList.remove(t.className));
    // Add current theme class
    root.classList.add(currentTheme.className);
    root.classList.add("dark");
  }, [currentTheme]);

  useEffect(() => {
    async function loadPrs() {
      try {
        setLoadingPrs(true);
        setError(null);
        const res = await fetch("/api/prs");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error: ${res.status}`);
        }
        const data = await res.json();
        setPrs(data.prs || []);
        if (data.prs?.length > 0) setActivePR(data.prs[0]);
      } catch (err: any) {
        setError(
          typeof err === "string" ? err : err.message || "Failed to fetch PRs",
        );
      } finally {
        setLoadingPrs(false);
      }
    }
    loadPrs();
  }, []);

  useEffect(() => {
    async function loadDiff() {
      if (!activePR) return;
      try {
        setLoadingDiff(true);
        const res = await fetch(
          `/api/prs/${activePR.repositoryId}/${activePR.id}/diff`,
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setDiffs(data.diff || []);
      } catch (err: any) {
        console.error("Diff error:", err);
      } finally {
        setLoadingDiff(false);
      }
    }
    loadDiff();
  }, [activePR]);

  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans selection:bg-primary selection:text-foreground text-[13px] overflow-hidden">
      {/* Sidebar */}
      <div
        style={{ width: sidebarWidth }}
        className={`flex-shrink-0 bg-card flex flex-col ${sidebarDock === "left" ? "border-r border-border order-1" : "border-l border-border order-4"}`}
      >
        <div className="p-3 border-b border-border flex justify-between items-center">
          <h1 className="font-semibold text-[11px] tracking-tight text-muted-foreground flex items-center gap-2">
            <span>Pull Requests</span>
          </h1>
          <button
            onClick={() =>
              setSidebarDock(sidebarDock === "left" ? "right" : "left")
            }
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={`Dock to ${sidebarDock === "left" ? "right" : "left"}`}
          >
            {sidebarDock === "left" ? (
              <PanelRight className="w-3.5 h-3.5" />
            ) : (
              <PanelLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-background border border-border rounded-sm py-1 pl-8 pr-2 text-[12px] focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-colors text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 text-foreground text-[11px] flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {loadingPrs && !error && (
            <div className="p-4 text-center text-muted-foreground text-[11px]">
              Loading...
            </div>
          )}
          {!loadingPrs &&
            prs.map((pr) => (
              <div
                key={pr.id}
                className={`w-full text-left flex flex-col transition-colors border-b border-border
                ${activePR?.id === pr.id ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-transparent hover:bg-primary"}`}
              >
                <div
                  className={`p-3 w-full cursor-pointer flex flex-col gap-1 text-[12px] ${activePR?.id === pr.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground"}`}
                  onClick={() => setActivePR(pr)}
                >
                  <div className="flex items-center gap-1 w-full relative pr-4">
                    <span className="font-mono font-semibold">#{pr.id}</span>
                    <span className="truncate w-full">{pr.title}</span>
                    {prStatuses[pr.id] === "approved" && (
                      <ThumbsUp
                        className={`w-3 h-3 absolute right-0 ${activePR?.id === pr.id ? "text-primary-foreground" : "text-diff-add-text"}`}
                      />
                    )}
                    {prStatuses[pr.id] === "rejected" && (
                      <ThumbsDown
                        className={`w-3 h-3 absolute right-0 ${activePR?.id === pr.id ? "text-primary-foreground" : "text-diff-remove-text"}`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between items-center w-full mt-0.5 font-mono">
                    <span
                      className={`text-[10px] truncate mr-2 ${activePR?.id === pr.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                    >
                      {pr.author}
                    </span>
                    <span
                      className={`text-[10px] whitespace-nowrap ${activePR?.id === pr.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                    >
                      {pr.time}
                    </span>
                  </div>
                </div>

                {activePR?.id === pr.id && (
                  <div className="flex border-t border-border w-full bg-card">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrStatuses((prev) => ({
                          ...prev,
                          [pr.id]: "approved",
                        }));
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-mono border-r border-border transition-colors ${prStatuses[pr.id] === "approved" ? "text-diff-add-text bg-diff-add-bg hover:bg-background" : "text-foreground hover:bg-primary"}`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrStatuses((prev) => ({
                          ...prev,
                          [pr.id]: "rejected",
                        }));
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-mono transition-colors ${prStatuses[pr.id] === "rejected" ? "text-diff-remove-text bg-diff-remove-bg hover:bg-background" : "text-foreground hover:bg-primary"}`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          {!loadingPrs && !error && prs.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-[11px]">
              No active pull requests found.
            </div>
          )}
        </div>

        <div
          className="p-3 border-t border-border flex gap-3 text-muted-foreground items-center bg-card cursor-pointer hover:bg-primary hover:text-foreground transition-colors"
          onClick={() => setShowConfig(true)}
        >
          <Settings className="w-4 h-4 transition-colors" />
          <span className="text-[12px] transition-colors">Config</span>
        </div>
      </div>

      {/* Resizer */}
      <div
        className={`w-1 bg-transparent hover:bg-primary cursor-col-resize flex-shrink-0 relative z-20 ${sidebarDock === "left" ? "order-2 -ml-1" : "order-3 -mr-1"}`}
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute inset-y-0 -inset-x-2"></div>
      </div>

      {/* Center Column: Diff Viewer */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-background ${sidebarDock === "left" ? "order-3" : "order-1 border-r border-border"}`}
      >
        <div className="h-12 flex items-center px-4 border-b border-border bg-card">
          {activePR ? (
            <>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-2 h-2 rounded-sm bg-foreground flex-shrink-0"></div>
                <h2 className="font-semibold text-[13px] truncate">
                  <span className="font-mono text-muted-foreground mr-2">
                    #{activePR.id}
                  </span>
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
                <span className="text-[11px] text-muted-foreground font-mono">
                  {activePR.time}
                </span>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-[12px] font-mono tracking-tight">
              Select a Pull Request
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-0">
          <div className="w-full h-full bg-background">
            {loadingDiff ? (
              <div className="p-6 text-muted-foreground text-[12px] font-mono">
                Loading diffs...
              </div>
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
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <span
                          className={`text-[12px] font-mono text-foreground flex items-center gap-2 ${isDisregarded ? "line-through" : ""}`}
                        >
                          <FileDiff className="w-3.5 h-3.5 text-muted-foreground" />
                          {fileDiff.filePath}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">
                          {fileDiff.changeType}
                        </span>
                        <button
                          onClick={() => toggleDisregard(fileDiff.filePath)}
                          title={
                            isDisregarded
                              ? "Restore change"
                              : "Disregard change"
                          }
                          className="text-muted-foreground hover:text-foreground opacity-20 group-hover:opacity-100 transition-opacity"
                        >
                          {isDisregarded ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
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
                              const max = Math.max(
                                tempRemovals.length,
                                tempAdditions.length,
                              );
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
                                tempRemovals.push({
                                  line,
                                  num: oldLineCounter++,
                                  type: "sub",
                                });
                              } else if (line.startsWith("+")) {
                                tempAdditions.push({
                                  line,
                                  num: newLineCounter++,
                                  type: "add",
                                });
                              } else if (line.startsWith("\\")) {
                                flush();
                                splitLines.push({ meta: true, text: line });
                              } else {
                                flush();
                                splitLines.push({
                                  left: {
                                    line,
                                    num: oldLineCounter++,
                                    type: "context",
                                  },
                                  right: {
                                    line,
                                    num: newLineCounter++,
                                    type: "context",
                                  },
                                });
                              }
                            });
                            flush();

                            return (
                              <div key={hi}>
                                <div className="bg-[rgba(97,175,239,0.15)] text-diff-brand px-4 py-1 text-[11px] border-b border-border">
                                  @@ -{hunk.oldStart},{hunk.oldLines} +
                                  {hunk.newStart},{hunk.newLines} @@
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
                                    <div
                                      key={rowIdx}
                                      className="flex border-b border-border/20"
                                    >
                                      <div
                                        className={`w-1/2 flex border-r border-border ${row.left?.type === "sub" ? "bg-diff-remove-bg text-diff-remove-text" : row.left ? "hover:bg-primary text-foreground bg-background" : "bg-background hover:bg-card"}`}
                                      >
                                        {row.left && (
                                          <>
                                            <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                              {row.left.num}
                                            </div>
                                            <div className="pl-3 whitespace-pre overflow-x-auto py-[1px]">
                                              {row.left.line}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div
                                        className={`w-1/2 flex ${row.right?.type === "add" ? "bg-diff-add-bg text-diff-add-text" : row.right ? "hover:bg-primary text-foreground bg-background" : "bg-background hover:bg-card"}`}
                                      >
                                        {row.right && (
                                          <>
                                            <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                              {row.right.num}
                                            </div>
                                            <div className="pl-3 whitespace-pre overflow-x-auto py-[1px]">
                                              {row.right.line}
                                            </div>
                                          </>
                                        )}
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
                                @@ -{hunk.oldStart},{hunk.oldLines} +
                                {hunk.newStart},{hunk.newLines} @@
                              </div>
                              {hunk.lines.map((line: string, li: number) => {
                                const isAdd = line.startsWith("+");
                                const isSub = line.startsWith("-");
                                const isMeta = line.startsWith("\\");

                                const lineClass = isAdd
                                  ? "bg-diff-add-bg text-diff-add-text"
                                  : isSub
                                    ? "bg-diff-remove-bg text-diff-remove-text"
                                    : isMeta
                                      ? "text-diff-meta-text italic bg-background"
                                      : "hover:bg-primary text-foreground bg-background";

                                const curOld = isAdd || isMeta ? "" : oldLine++;
                                const curNew = isSub || isMeta ? "" : newLine++;

                                return (
                                  <div
                                    key={`${hi}-${li}`}
                                    className={`flex border-b border-border/20 ${lineClass}`}
                                  >
                                    <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                      {curOld}
                                    </div>
                                    <div className="w-10 flex-shrink-0 text-right pr-2.5 text-muted-foreground select-none border-r border-border bg-card py-[1px]">
                                      {curNew}
                                    </div>
                                    <div className="pl-3 whitespace-pre overflow-x-auto py-[1px]">
                                      {line}
                                    </div>
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

            {/* Fallback mockup when no diff is present and not loading just to show the UI structure initially, can be removed in truly production app */}
            {prs.length === 0 && !loadingPrs && !error && (
              <div className="p-8">
                <div className="bg-card border border-border rounded-md p-6 max-w-lg text-center mx-auto">
                  <p className="text-foreground mb-2 font-semibold">
                    Azure DevOps Not Configured
                  </p>
                  <p className="text-muted-foreground text-[12px]">
                    Please supply your{" "}
                    <span className="font-mono bg-background px-1">
                      AZURE_DEVOPS_ORG_URL
                    </span>
                    ,{" "}
                    <span className="font-mono bg-background px-1">
                      AZURE_DEVOPS_PROJECT
                    </span>
                    , and{" "}
                    <span className="font-mono bg-background px-1">
                      AZURE_DEVOPS_PAT
                    </span>{" "}
                    in your configuration to load actual Pull Requests.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: AI Assistant */}
      <div
        className={`w-[240px] flex-shrink-0 bg-card flex flex-col p-4 ${sidebarDock === "left" ? "order-4 border-l border-border" : "order-2 border-r border-border"}`}
      >
        <div className="text-[14px] font-semibold mb-4 flex items-center gap-2">
          <span className="tracking-tight text-[11px]">AI Review</span>
          <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold leading-none flex items-center h-[18px]">
            GPT-4
          </span>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="bg-background border border-border rounded-md p-3">
            <div className="text-[10px] text-muted-foreground font-mono uppercase mb-2 tracking-[0.05em]">
              Analysis Scope
            </div>
            <div className="text-[13px] leading-[1.4] mb-1 text-foreground">
              Scanning{" "}
              <span className="font-mono text-primary-foreground">
                {diffs.length}
              </span>{" "}
              file(s).
            </div>
            {activePR && (
              <div className="text-[11px] text-muted-foreground">
                For <span className="font-mono">#{activePR.id}</span>
              </div>
            )}
          </div>
          {diffs.length > 0 && diffs[0].filePath.includes("ts") && (
            <div className="bg-background border border-border rounded-md p-3">
              <div className="text-[10px] text-muted-foreground font-mono uppercase mb-2 tracking-[0.05em]">
                Automated Finding
              </div>
              <div className="text-[13px] leading-[1.4] mb-3 text-foreground">
                Potential vulnerability or style issue detected in modified
                TypeScript file.
              </div>
              <div className="bg-card p-2 rounded-md border border-border text-[11px] font-mono text-muted-foreground mt-2">
                <div>// Consider refactoring this block</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-border mt-4">
          <button
            className="w-full bg-primary hover:bg-primary text-primary-foreground hover:text-foreground border border-accent hover:border-border py-2.5 px-4 rounded-md font-semibold text-[13px] transition-colors text-center disabled:opacity-50 disabled:bg-card disabled:text-muted-foreground disabled:border-border"
            disabled={!activePR || diffs.length === 0}
          >
            Submit AI Review
          </button>

          <div className="mt-5 text-[11px] text-muted-foreground font-mono flex items-center gap-3">
            <div className="tracking-tight">Confidence</div>
            <div className="flex-1 h-2 border border-border bg-background rounded-md overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full w-[91%] bg-muted-foreground"></div>
            </div>
            <span>91%</span>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card border border-border w-[400px] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
                Configuration
              </h2>
              <button
                onClick={() => setShowConfig(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-[11px] text-muted-foreground font-mono uppercase mb-3 tracking-[0.05em]">
                Appearance
              </h3>
              <div className="space-y-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => setCurrentTheme(theme)}
                    className={`w-full text-left p-3 border rounded-md transition-colors flex justify-between items-center ${currentTheme.name === theme.name ? "border-primary text-primary-foreground bg-primary" : "border-border text-foreground bg-background hover:bg-accent"}`}
                  >
                    <span>{theme.name}</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full border border-border bg-background"></div>
                      <div className="w-4 h-4 rounded-full border border-border bg-primary"></div>
                      <div className="w-4 h-4 rounded-full border border-border bg-card"></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
