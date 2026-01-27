import { Check, X } from "lucide-react"
import { cn } from "../../lib/utils"

export function ComparisonTable() {
  const features = [
    { name: "Communication Protocol", wrapper: "Parse CLI Output Text", native: "Direct JSON-RPC" },
    { name: "Safety Control", wrapper: "None / Limited", native: "Structured Approval Loop" },
    { name: "Reliability", wrapper: "Zombie Processes", native: "Automatic Cleanup" },
    { name: "Performance", wrapper: "Slow Parsing", native: "Instant Streaming" },
    { name: "Capabilities", wrapper: "Single Session", native: "Multi-Agent Concurrent" },
  ]

  return (
    <div className="w-full overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="py-4 px-6 text-left text-sm font-medium text-muted-foreground w-1/3">Feature</th>
            <th className="py-4 px-6 text-left text-sm font-medium text-muted-foreground w-1/3">Terminal Wrapper</th>
            <th className="py-4 px-6 text-left text-sm font-bold text-primary w-1/3 bg-primary/5">Protocol-Native</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, i) => (
            <tr 
              key={feature.name} 
              className={cn(
                "group transition-colors hover:bg-muted/20",
                i !== features.length - 1 && "border-b border-border/50"
              )}
            >
              <td className="py-4 px-6 text-sm font-medium">{feature.name}</td>
              <td className="py-4 px-6 text-sm text-muted-foreground group-hover:text-destructive transition-colors">
                <div className="flex items-center gap-2">
                  <X size={16} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
                  {feature.wrapper}
                </div>
              </td>
              <td className="py-4 px-6 text-sm font-semibold bg-primary/5 group-hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  {feature.native}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
