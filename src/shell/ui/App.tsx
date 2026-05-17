/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { THEMES, AppTheme } from "./themes";
import { PullRequest, FileDiff, AIReview } from "../../core/domain/types";
import { Sidebar } from "./components/Sidebar";
import { DiffViewer } from "./components/DiffViewer";
import { ReviewSidebar } from "./components/ReviewSidebar";
import { ConfigModal } from "./components/ConfigModal";

export default function App() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [activePR, setActivePR] = useState<PullRequest | null>(null);
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(THEMES[0]);
  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [generatingReview, setGeneratingReview] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [sidebarDock, setSidebarDock] = useState<"left" | "right">("left");
  const [isDragging, setIsDragging] = useState(false);
  const [prStatuses, setPrStatuses] = useState<Record<number, "approved" | "rejected">>({});

  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [disregardedFiles, setDisregardedFiles] = useState<Set<string>>(new Set());
  const [diffSearchQuery, setDiffSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");

  const [applyingFix, setApplyingFix] = useState(false);

  const filteredDiffs = diffs.filter((fileDiff) => {
    if (diffSearchQuery.trim() === "") return true;
    const q = diffSearchQuery.toLowerCase();
    if (fileDiff.filePath.toLowerCase().includes(q)) return true;
    return fileDiff.patch?.hunks?.some((h: any) => h.lines.some((l: string) => l.toLowerCase().includes(q)));
  });

  const handleGenerateReview = async () => {
    if (!activePR || filteredDiffs.length === 0) return;
    try {
      setGeneratingReview(true);
      if (!(window as any).electronAPI) {
         throw new Error("Electron API not found.");
      }
      const diffsForAI = filteredDiffs.map(d => ({ ...d, isDisregarded: disregardedFiles.has(d.filePath) }));
      const review = await (window as any).electronAPI.generateAIReview(activePR.repositoryId, activePR.sourceBranch, diffsForAI);
      setAiReview(review);
    } catch (err: any) {
      console.error("AI Review error:", err);
    } finally {
      setGeneratingReview(false);
    }
  };

  const handleApplyFix = async (filePath: string, searchBlock: string, replaceBlock: string, commitMessage: string) => {
    if (!activePR) return;
    try {
      setApplyingFix(true);
      if (!(window as any).electronAPI) {
         throw new Error("Electron API not found.");
      }
      await (window as any).electronAPI.applyFix(activePR.repositoryId, activePR.sourceBranch, filePath, searchBlock, replaceBlock, commitMessage);
      
      setLoadingDiff(true);
      const fileChanges = await (window as any).electronAPI.getDiffs(activePR.repositoryId, activePR.id);
      setDiffs(fileChanges || []);
      
      setAiReview(null);
    } catch (err: any) {
      console.error("Apply Fix error:", err);
    } finally {
      setApplyingFix(false);
      setLoadingDiff(false);
    }
  };

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      if (sidebarDock === "left") {
        setSidebarWidth(Math.max(200, Math.min(e.clientX, 800)));
      } else {
        setSidebarWidth(Math.max(200, Math.min(document.body.clientWidth - e.clientX, 800)));
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
    const root = document.documentElement;
    THEMES.forEach((t) => root.classList.remove(t.className));
    root.classList.add(currentTheme.className);
    root.classList.add("dark");
  }, [currentTheme]);

  useEffect(() => {
    async function loadPrs() {
      try {
        setLoadingPrs(true);
        setError(null);
        if (!(window as any).electronAPI) {
          throw new Error("Electron API not found. Please run this app in the Electron environment.");
        }
        const activePrs = await (window as any).electronAPI.getPullRequests();
        setPrs(activePrs || []);
        if (activePrs?.length > 0) setActivePR(activePrs[0]);
      } catch (err: any) {
        setError(typeof err === "string" ? err : err.message || "Failed to fetch PRs");
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
        if (!(window as any).electronAPI) {
           throw new Error("Electron API not found.");
        }
        const fileChanges = await (window as any).electronAPI.getDiffs(activePR.repositoryId, activePR.id);
        setDiffs(fileChanges || []);
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
      <Sidebar
        sidebarWidth={sidebarWidth}
        sidebarDock={sidebarDock}
        setSidebarDock={setSidebarDock}
        prs={prs}
        loadingPrs={loadingPrs}
        error={error}
        activePR={activePR}
        setActivePR={setActivePR}
        prStatuses={prStatuses}
        setPrStatuses={setPrStatuses}
        setShowConfig={setShowConfig}
      />

      <div
        className={`w-1 bg-transparent hover:bg-primary cursor-col-resize flex-shrink-0 relative z-20 ${
          sidebarDock === "left" ? "order-2 -ml-1" : "order-3 -mr-1"
        }`}
        onMouseDown={() => setIsDragging(true)}
      >
        <div className="absolute inset-y-0 -inset-x-2"></div>
      </div>

      <DiffViewer
        sidebarDock={sidebarDock}
        activePR={activePR}
        prsCount={prs.length}
        loadingPrs={loadingPrs}
        error={error}
        loadingDiff={loadingDiff}
        filteredDiffs={filteredDiffs}
        diffSearchQuery={diffSearchQuery}
        setDiffSearchQuery={setDiffSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        collapsedFiles={collapsedFiles}
        toggleCollapse={toggleCollapse}
        disregardedFiles={disregardedFiles}
        toggleDisregard={toggleDisregard}
      />

      <ReviewSidebar
        sidebarDock={sidebarDock}
        activePR={activePR}
        diffs={filteredDiffs}
        aiReview={aiReview}
        generatingReview={generatingReview}
        applyingFix={applyingFix}
        handleGenerateReview={handleGenerateReview}
        handleApplyFix={handleApplyFix}
      />

      <ConfigModal
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
      />
    </div>
  );
}
