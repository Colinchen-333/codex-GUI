import { useState } from "react"
import { CodeBlock } from "../ui/CodeBlock"
import { cn } from "../../lib/utils"
import { Apple, Monitor, Terminal, Copy, Check } from "lucide-react"

export function Installation() {
  const [activeTab, setActiveTab] = useState<"macos" | "windows" | "linux">("macos")
  const [copied, setCopied] = useState(false)

  const commands = {
    macos: `# Install dependencies
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone & Run
git clone https://github.com/Colinchen-333/codex-desktop.git
cd codex-desktop
npm install
npm run tauri:dev`,
    windows: `# Prerequisites
# 1. Install Visual Studio Build Tools
# 2. Install Rust via rustup-init.exe

# Clone & Run
git clone https://github.com/Colinchen-333/codex-desktop.git
cd codex-desktop
npm install
npm run tauri:dev`,
    linux: `# Install dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone & Run
git clone https://github.com/Colinchen-333/codex-desktop.git
cd codex-desktop
npm install
npm run tauri:dev`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(commands[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="installation" className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-primary/8 blur-[20px] rounded-full pointer-events-none -z-10 will-change-transform transform-gpu" />
      
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Installation</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Get up and running in minutes. Requires Node.js 22+, Rust, and Codex CLI.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-8 bg-secondary/50 p-1 rounded-xl w-fit mx-auto">
            {[
              { id: "macos", label: "macOS", icon: Apple },
              { id: "windows", label: "Windows", icon: Monitor },
              { id: "linux", label: "Linux", icon: Terminal }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl opacity-60" />
            <div className="relative">
              <CodeBlock 
                code={commands[activeTab]} 
                className="text-sm shadow-2xl border-white/10 min-h-[200px]"
              />
              <button 
                onClick={handleCopy}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors border border-white/5"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            View full build instructions on <a href="#" className="text-primary hover:underline font-medium">GitHub</a>
          </p>
        </div>
      </div>
    </section>
  )
}
