import { Archive, History, Layers, Layout, Lock, Zap } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: Layers,
      title: "Multi-Agent Sessions",
      desc: "Run multiple Codex agent threads simultaneously, each with independent context and memory."
    },
    {
      icon: Lock,
      title: "Approval System",
      desc: "Every file modification and shell command requires your explicit consent. No surprises."
    },
    {
      icon: History,
      title: "Undo/Redo & Snapshots",
      desc: "Rollback entire sessions to previous checkpoints. Up to 20 history states per session."
    },
    {
      icon: Zap,
      title: "Virtual Scrolling",
      desc: "Smooth performance even with thousands of messages thanks to react-window virtualization."
    },
    {
      icon: Archive,
      title: "Local Persistence",
      desc: "All data stays on your machine via SQLite. Resume exactly where you left off."
    },
    {
      icon: Layout,
      title: "Project-Centric",
      desc: "Organized workflow by project with built-in Git integration and status monitoring."
    }
  ]

  return (
    <section id="features" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Built for power users who demand control, speed, and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-card p-6 rounded-2xl border border-border hover:shadow-lg transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon size={24} className="text-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
