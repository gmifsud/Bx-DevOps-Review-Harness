import { Search, AlertTriangle, ThumbsUp, ThumbsDown, Settings, PanelRight, PanelLeft } from "lucide-react";
import { PullRequest } from "../../../core/domain/types";

export interface SidebarProps {
  sidebarWidth: number;
  sidebarDock: "left" | "right";
  setSidebarDock: (dock: "left" | "right") => void;
  prs: PullRequest[];
  loadingPrs: boolean;
  error: string | null;
  activePR: PullRequest | null;
  setActivePR: (pr: PullRequest) => void;
  prStatuses: Record<number, "approved" | "rejected">;
  setPrStatuses: (updater: (prev: Record<number, "approved" | "rejected">) => Record<number, "approved" | "rejected">) => void;
  setShowConfig: (show: boolean) => void;
}

export function Sidebar({
  sidebarWidth,
  sidebarDock,
  setSidebarDock,
  prs,
  loadingPrs,
  error,
  activePR,
  setActivePR,
  prStatuses,
  setPrStatuses,
  setShowConfig,
}: SidebarProps) {
  return (
    <div
      style={{ width: sidebarWidth }}
      className={`flex-shrink-0 bg-card flex flex-col ${
        sidebarDock === "left" ? "border-r border-border order-1" : "border-l border-border order-4"
      }`}
    >
      <div className="p-3 border-b border-border flex justify-between items-center">
        <h1 className="font-semibold text-[11px] tracking-tight text-muted-foreground flex items-center gap-2">
          <span>Pull Requests</span>
        </h1>
        <button
          onClick={() => setSidebarDock(sidebarDock === "left" ? "right" : "left")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={`Dock to ${sidebarDock === "left" ? "right" : "left"}`}
        >
          {sidebarDock === "left" ? <PanelRight className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
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
          <div className="p-4 text-center text-muted-foreground text-[11px]">Loading...</div>
        )}
        {!loadingPrs &&
          prs.map((pr) => (
            <div
              key={pr.id}
              className={`w-full text-left flex flex-col transition-colors border-b border-border
              ${
                activePR?.id === pr.id
                  ? "border-l-[3px] border-l-primary"
                  : "border-l-[3px] border-l-transparent hover:bg-primary"
              }`}
            >
              <div
                className={`p-3 w-full cursor-pointer flex flex-col gap-1 text-[12px] ${
                  activePR?.id === pr.id ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                }`}
                onClick={() => setActivePR(pr)}
              >
                <div className="flex items-center gap-1 w-full relative pr-4">
                  <span className="font-mono font-semibold">#{pr.id}</span>
                  <span className="truncate w-full">{pr.title}</span>
                  {prStatuses[pr.id] === "approved" && (
                    <ThumbsUp
                      className={`w-3 h-3 absolute right-0 ${
                        activePR?.id === pr.id ? "text-primary-foreground" : "text-diff-add-text"
                      }`}
                    />
                  )}
                  {prStatuses[pr.id] === "rejected" && (
                    <ThumbsDown
                      className={`w-3 h-3 absolute right-0 ${
                        activePR?.id === pr.id ? "text-primary-foreground" : "text-diff-remove-text"
                      }`}
                    />
                  )}
                </div>
                <div className="flex justify-between items-center w-full mt-0.5 font-mono">
                  <span
                    className={`text-[10px] truncate mr-2 ${
                      activePR?.id === pr.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {pr.author}
                  </span>
                  <span
                    className={`text-[10px] whitespace-nowrap ${
                      activePR?.id === pr.id ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
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
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-mono border-r border-border transition-colors ${
                      prStatuses[pr.id] === "approved"
                        ? "text-diff-add-text bg-diff-add-bg hover:bg-background"
                        : "text-foreground hover:bg-primary"
                    }`}
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
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-mono transition-colors ${
                      prStatuses[pr.id] === "rejected"
                        ? "text-diff-remove-text bg-diff-remove-bg hover:bg-background"
                        : "text-foreground hover:bg-primary"
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        {!loadingPrs && !error && prs.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-[11px]">No active pull requests found.</div>
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
  );
}
