import { X } from "lucide-react";
import { THEMES, AppTheme } from "../themes";

export interface ConfigModalProps {
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  currentTheme: AppTheme;
  setCurrentTheme: (theme: AppTheme) => void;
}

export function ConfigModal({
  showConfig,
  setShowConfig,
  currentTheme,
  setCurrentTheme,
}: ConfigModalProps) {
  if (!showConfig) return null;

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
      <div className="bg-card border border-border w-[400px] flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center bg-background">
          <h2 className="text-[13px] font-semibold text-foreground tracking-tight">Configuration</h2>
          <button onClick={() => setShowConfig(false)} className="text-muted-foreground hover:text-foreground">
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
                className={`w-full text-left p-3 border rounded-md transition-colors flex justify-between items-center ${
                  currentTheme.name === theme.name
                    ? "border-primary text-primary-foreground bg-primary"
                    : "border-border text-foreground bg-background hover:bg-accent"
                }`}
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
  );
}
