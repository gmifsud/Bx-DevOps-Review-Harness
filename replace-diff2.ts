import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\s*\) : diffs\.length === 0 && activePR \? \([\s\S]*?(?=\s*\{\/\* Fallback mockup when no diff is present)/;

const replacementStr = `            ) : filteredDiffs.length === 0 && activePR ? (
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
                    className={\`mb-0 border-b border-border last:border-b-0 \${isDisregarded ? 'opacity-50 grayscale' : ''}\`}
                  >
                    <div className="bg-card px-4 py-2 border-b border-border flex justify-between items-center sticky top-0 shadow-none z-10 group">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleCollapse(fileDiff.filePath)} className="text-muted-foreground hover:text-foreground">
                          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <span className={\`text-[12px] font-mono text-foreground flex items-center gap-2 \${isDisregarded ? 'line-through' : ''}\`}>
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
                              } else if (line.startsWith("\\\\")) {
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
                                      <div key={rowIdx} className="text-diff-meta-text italic bg-background py-[1px] pl-[84px] text-[11px]">
                                        {row.text}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={rowIdx} className="flex border-b border-border/20">
                                      <div className={\`w-1/2 flex border-r border-border \${row.left?.type === 'sub' ? 'bg-diff-remove-bg text-diff-remove-text' : row.left ? 'hover:bg-primary text-foreground bg-background' : 'bg-background hover:bg-card'}\`}>
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
                                      <div className={\`w-1/2 flex \${row.right?.type === 'add' ? 'bg-diff-add-bg text-diff-add-text' : row.right ? 'hover:bg-primary text-foreground bg-background' : 'bg-background hover:bg-card'}\`}>
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
                                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart}
                                ,{hunk.newLines} @@
                              </div>
                              {hunk.lines.map((line: string, li: number) => {
                                const isAdd = line.startsWith("+");
                                const isSub = line.startsWith("-");
                                const isMeta = line.startsWith("\\\\");

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
                                    key={\`\${hi}-\${li}\`}
                                    className={\`flex border-b border-border/20 \${lineClass}\`}
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
            )
`;

if (!regex.test(code)) {
  console.log('Regex not found in App.tsx');
  process.exit(1);
}
code = code.replace(regex, replacementStr);
fs.writeFileSync('src/App.tsx', code);
