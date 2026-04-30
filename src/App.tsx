/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Settings, GitPullRequest, Search, MessageSquare, Check, FileDiff } from 'lucide-react';

export default function App() {
  const [activePR, setActivePR] = useState<number | null>(123);

  const prs = [
    { id: 123, title: "Fix login bug", author: "Jane Doe", time: "2h ago" },
    { id: 124, title: "Update dependencies", author: "John Smith", time: "5h ago" },
    { id: 125, title: "Refactor auth module", author: "Alice Jones", time: "1d ago" },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#181818] text-[#e1e1e1] font-sans selection:bg-[#0078d4] selection:text-white text-[13px]">
      {/* Left Column: Sidebar & Navigation */}
      <div className="w-[220px] flex-shrink-0 border-r border-[#3c3c3c] bg-[#252526] flex flex-col">
        <div className="p-3 border-b border-[#3c3c3c]">
          <h1 className="font-semibold text-[11px] uppercase tracking-[0.05em] text-[#969696] flex items-center gap-2">
            <span>Active Pull Requests</span>
          </h1>
        </div>
        
        <div className="p-3 border-b border-[#3c3c3c]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#969696]" />
            <input 
              type="text" 
              placeholder="Search PRs..." 
              className="w-full bg-[#181818] border border-[#3c3c3c] rounded py-1 pl-8 pr-2 text-[12px] focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all text-[#e1e1e1]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {prs.map(pr => (
            <button
              key={pr.id}
              onClick={() => setActivePR(pr.id)}
              className={`w-full text-left px-3 py-2 border-l-2 hover:bg-[rgba(255,255,255,0.05)] transition-colors flex flex-col gap-1 text-[12px]
                ${activePR === pr.id ? 'bg-[#2d2d2d] border-l-[#0078d4] text-white' : 'border-l-transparent'}`}
            >
              <div className="flex items-center gap-1 w-full">
                <span className={`font-semibold ${activePR === pr.id ? 'text-[#0078d4]' : 'text-[#0078d4]'}`}>
                  #{pr.id}
                </span>
                <span className="truncate w-full">{pr.title}</span>
              </div>
              <div className="flex justify-between items-center w-full mt-0.5">
                <span className="text-[10px] text-[#969696]">{pr.author}</span>
                <span className="text-[10px] text-[#969696]">{pr.time}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-[#3c3c3c] flex gap-3 text-[#969696] items-center bg-[#252526]">
          <Settings className="w-4 h-4 cursor-pointer hover:text-[#e1e1e1]" />
          <span className="text-[12px] cursor-pointer hover:text-[#e1e1e1]">Settings</span>
        </div>
      </div>

      {/* Center Column: Diff Viewer */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#181818]">
        <div className="h-12 flex items-center px-4 border-b border-[#3c3c3c] bg-[#181818]">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-2 h-2 rounded-full bg-[#2ea043]"></div>
            <h2 className="font-semibold text-[13px]">
              PR #{activePR}: {prs.find(p => p.id === activePR)?.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-[#969696]">
              Updated 2m ago
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-0">
          <div className="w-full h-full bg-[#181818]">
            <div className="bg-[#252526] px-4 py-2 border-b border-[#3c3c3c] flex justify-between items-center">
              <span className="text-[12px] font-mono text-[#969696]">src/services/auth.ts</span>
            </div>
            <div className="font-mono text-[12px] leading-[1.5] flex flex-col select-text">
              <div className="flex hover:bg-[rgba(255,255,255,0.05)]">
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">12</div>
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">12</div>
                <div className="pl-3 whitespace-pre text-[#e1e1e1]">  async getUser(id: string) {'{'}</div>
              </div>
              <div className="flex hover:bg-[rgba(255,255,255,0.05)]">
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">13</div>
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">13</div>
                <div className="pl-3 whitespace-pre text-[#e1e1e1]">    const query = `SELECT * FROM users WHERE id = ${'{id}'}`;</div>
              </div>
              <div className="flex bg-[rgba(248,81,73,0.15)] text-[#f85149]">
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">14</div>
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]"></div>
                <div className="pl-3 whitespace-pre">-   return await db.execute(query);</div>
              </div>
              <div className="flex bg-[rgba(46,160,67,0.15)] text-[#3fb950]">
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]"></div>
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">14</div>
                <div className="pl-3 whitespace-pre">+   const query = `SELECT * FROM users WHERE id = ?`;</div>
              </div>
              <div className="flex bg-[rgba(46,160,67,0.15)] text-[#3fb950]">
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]"></div>
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">15</div>
                <div className="pl-3 whitespace-pre">+   return await db.execute(query, [id]);</div>
              </div>
              <div className="flex hover:bg-[rgba(255,255,255,0.05)]">
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">16</div>
                <div className="w-10 text-right pr-2.5 text-[#969696] select-none border-r border-[#3c3c3c] bg-[#252526]">16</div>
                <div className="pl-3 whitespace-pre text-[#e1e1e1]">  {'}'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: AI Assistant */}
      <div className="w-[240px] flex-shrink-0 border-l border-[#3c3c3c] bg-[#252526] flex flex-col p-4">
        <div className="text-[14px] font-semibold mb-4 flex items-center gap-2">
          <span>AI Review</span>
          <span className="bg-[#0078d4] text-[10px] px-1.5 py-0.5 rounded text-white font-normal leading-none flex items-center h-[18px]">GPT-4</span>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="bg-[#2d2d2d] border border-[#3c3c3c] rounded-[6px] p-3">
            <div className="text-[11px] text-[#969696] uppercase mb-2">Security Issue</div>
            <div className="text-[13px] leading-[1.4] mb-3 text-[#e1e1e1]">
              SQL Injection vulnerability found on line 13. Raw string interpolation detected in database query.
            </div>
          </div>
          <div className="bg-[#2d2d2d] border border-[#3c3c3c] rounded-[6px] p-3">
            <div className="text-[11px] text-[#969696] uppercase mb-2">Suggested Fix</div>
            <div className="text-[13px] leading-[1.4] mb-3 text-[#e1e1e1]">
              Use parameterized queries or the ORM's query builder to safely handle user input.
            </div>
            <div className="bg-[#111] p-2 rounded text-[11px] font-mono text-[#dcdcaa] mt-2">
              <div className="text-[#3fb950]">+ const query = `SELECT * FROM users WHERE id = ?`;</div>
              <div className="text-[#3fb950]">+ return await db.execute(query, [id]);</div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button className="w-full bg-[#0078d4] hover:bg-[#005a9e] text-white py-2.5 px-4 rounded-[4px] font-semibold text-[13px] transition-colors text-center">
            Apply Fix & Commit
          </button>
          
          <div className="mt-5 text-[11px] text-[#969696]">
            <div className="mb-1">Confidence: 98%</div>
            <div className="h-1 w-full bg-[#333] rounded-full overflow-hidden">
              <div className="h-full w-[98%] bg-[#0078d4] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
