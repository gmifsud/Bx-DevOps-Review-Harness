import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. imports
code = code.replace(
  `} from "lucide-react";`,
  `  Columns,
  AlignJustify,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Eye,
} from "lucide-react";`
);

// 2. states
code = code.replace(
  `  const [prStatuses, setPrStatuses] = useState<
    Record<number, "approved" | "rejected">
  >({});

  useEffect(() => {`,
  `  const [prStatuses, setPrStatuses] = useState<
    Record<number, "approved" | "rejected">
  >({});

  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [disregardedFiles, setDisregardedFiles] = useState<Set<string>>(new Set());
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
      h.lines.some((l: string) => l.toLowerCase().includes(q))
    );
  });

  useEffect(() => {`
);

// 3. Diff search and view mode
code = code.replace(
  `              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {activePR.time}
                </span>
              </div>`,
  `              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
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
                <span className="text-[11px] text-muted-foreground font-mono ml-2">
                  {activePR.time}
                </span>
              </div>`
);

fs.writeFileSync('src/App.tsx', code);
