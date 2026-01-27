import { ArrowRight, Github, Terminal } from "lucide-react"
import { Button } from "../ui/Button"
import { Crown } from "lucide-react"

export function Hero() {
  return (
    <section className="relative pt-32 pb-32 overflow-hidden bg-background">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-primary/8 blur-[24px] rounded-full pointer-events-none -z-10 will-change-transform transform-gpu" />
      <div className="absolute inset-0 noise-bg opacity-35 pointer-events-none -z-20" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 hover:bg-white/10 transition-colors cursor-default select-none">
          <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-muted-foreground">v1.0.0 Release</span>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <span className="text-foreground">Protocol-Native Architecture</span>
        </div>

        <div className="mb-8 relative animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 text-primary/5 opacity-20 pointer-events-none">
            <Crown size={160} strokeWidth={0.5} />
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 select-none">
            Codex Desktop
          </h1>
          <div className="flex items-center justify-center gap-3 text-2xl md:text-3xl font-medium text-muted-foreground/80">
            <span className="shimmer-text">The Protocol-Native GUI</span>
          </div>
        </div>

        <p className="max-w-xl text-lg text-muted-foreground mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          Built for developers who demand control. Experience zero-latency streaming and structured safety approvals directly from the engine.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-24 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300">
          <Button size="lg" className="h-12 px-8 rounded-full text-base gap-2 shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all transform hover:-translate-y-0.5">
            Download for macOS
            <ArrowRight size={18} />
          </Button>
          <a href="https://github.com/Colinchen-333/codex-desktop" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-full text-base gap-2 bg-transparent border-white/10 hover:bg-white/5 transition-all">
              <Github size={18} />
              View Source
            </Button>
          </a>
        </div>

        <div className="w-full max-w-5xl rounded-xl border border-white/10 shadow-xl bg-[#0A0A0A] aspect-[16/10] flex items-center justify-center relative overflow-hidden group animate-in zoom-in-95 duration-600 delay-500 ring-1 ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

          <div className="absolute top-4 left-4 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>

          <div className="relative w-full h-full p-6 md:p-8">
            <div className="h-full w-full rounded-lg border border-white/10 bg-[#0f0f0f]/80 grid grid-cols-[220px_1fr] gap-6 p-5 text-left">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-xs font-mono text-white/40 uppercase tracking-widest">
                  <Terminal size={12} />
                  Session
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-32 bg-white/10 rounded" />
                  <div className="h-2 w-24 bg-white/5 rounded" />
                  <div className="h-2 w-28 bg-white/5 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-20 bg-white/10 rounded" />
                  <div className="h-2 w-28 bg-white/5 rounded" />
                  <div className="h-2 w-24 bg-white/5 rounded" />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="h-2 w-48 bg-white/15 rounded" />
                <div className="flex-1 rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="h-2 w-3/4 bg-white/10 rounded" />
                  <div className="h-2 w-2/3 bg-white/5 rounded" />
                  <div className="h-2 w-4/5 bg-white/5 rounded" />
                  <div className="h-2 w-1/2 bg-white/5 rounded" />
                </div>
                <div className="flex justify-between">
                  <div className="h-2 w-24 bg-white/10 rounded" />
                  <div className="h-2 w-16 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 font-mono text-xs">
            App Interface Preview
          </div>
        </div>
      </div>
    </section>
  )
}
