import { Card } from "../ui/Card"

export function MultiAgentSection() {
  const agents = [
    { role: "Explore", count: 2, desc: "Analyze codebase & find patterns", color: "bg-blue-500" },
    { role: "Design", count: 1, desc: "Create implementation plan", status: "Approval Required", color: "bg-purple-500" },
    { role: "Review", count: 1, desc: "Validate feasibility", status: "Approval Required", color: "bg-yellow-500" },
    { role: "Implement", count: 2, desc: "Execute changes & run tests", color: "bg-green-500" },
  ]

  return (
    <section className="py-24 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Content */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              Orchestration Engine
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              From "Code Writer" to <br/>
              <span className="text-primary">"Code Reviewer"</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Don't just chat with one bot. Command a team of specialized agents that work in parallel.
              You provide the high-level intent, they handle the execution—stopping only when they need your expert approval.
            </p>
            
            <ul className="space-y-4">
              {[
                "Parallel Execution with dependency management",
                "Phase Gating (Explore → Design → Review → Implement)",
                "State Persistence across app restarts",
                "Unified Review Inbox for all pending decisions"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-medium">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center text-xs">✓</div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual Visualization */}
          <div className="flex-1 w-full">
            <div className="relative">
              {/* Connection Lines (Abstract) */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

              <div className="grid grid-cols-2 gap-4 md:gap-6">
                {agents.map((agent, i) => (
                  <Card key={i} className="p-6 hover:border-primary/50 transition-colors group relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${agent.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg">{agent.role}</h3>
                      <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">
                        {agent.count} Agent{agent.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 h-10">
                      {agent.desc}
                    </p>
                    {agent.status && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-600 animate-pulse" />
                        {agent.status}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
