import { Zap, Shield, Activity, X, Check } from "lucide-react"

export function WhyProtocolNative() {
  const benefits = [
    {
      icon: Zap,
      title: "Zero Latency",
      desc: "Direct JSON-RPC streaming bypasses CLI output parsing entirely.",
    },
    {
      icon: Shield,
      title: "Structured Safety",
      desc: "Approval loops are baked into the protocol, not hacked on top.",
    },
    {
      icon: Activity,
      title: "Process Control",
      desc: "Native lifecycle management prevents zombie processes and leaks.",
    },
  ]

  const comparisons = [
    { feature: "Communication", wrapper: "Parse Stdout Text", native: "Direct JSON-RPC", highlight: true },
    { feature: "Safety Control", wrapper: "None / Limited", native: "Approval Loop", highlight: true },
    { feature: "Reliability", wrapper: "Zombie Processes", native: "Auto Cleanup", highlight: true },
    { feature: "State Sync", wrapper: "Polling / Guessing", native: "Event Driven", highlight: true },
    { feature: "Concurrency", wrapper: "Single Thread", native: "Multi-Agent", highlight: true },
  ]

  return (
    <section id="comparison" className="py-32 bg-secondary/5 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Why Protocol-Native?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Stop wrapping standard output. Start communicating with the engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {benefits.map((item, i) => (
            <div key={i} className="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-white/5 text-foreground flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <item.icon size={28} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0A0A0A]">
          <div className="grid grid-cols-12 bg-white/5 border-b border-white/10 text-sm font-medium text-muted-foreground py-4 px-6">
            <div className="col-span-4">Feature</div>
            <div className="col-span-4">Terminal Wrapper</div>
            <div className="col-span-4 text-primary font-bold">Protocol-Native</div>
          </div>
          
          <div className="divide-y divide-white/5">
            {comparisons.map((row, i) => (
              <div key={i} className="grid grid-cols-12 py-5 px-6 items-center hover:bg-white/5 transition-colors group">
                <div className="col-span-4 text-sm font-medium">{row.feature}</div>
                
                <div className="col-span-4 text-sm text-muted-foreground flex items-center gap-2 group-hover:text-red-400/80 transition-colors">
                  <X size={14} className="opacity-0 group-hover:opacity-100" />
                  {row.wrapper}
                </div>
                
                <div className="col-span-4 text-sm font-semibold text-foreground flex items-center gap-2">
                  <Check size={14} className="text-green-500" />
                  {row.native}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
