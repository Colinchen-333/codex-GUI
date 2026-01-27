export function TechStack() {
  const stack = [
    { name: "React 19", bg: "bg-[#61DAFB]/10", text: "text-[#61DAFB]", border: "border-[#61DAFB]/20" },
    { name: "TypeScript 5.9", bg: "bg-[#3178C6]/10", text: "text-[#3178C6]", border: "border-[#3178C6]/20" },
    { name: "Tauri 2.0", bg: "bg-[#FFC131]/10", text: "text-[#FFC131]", border: "border-[#FFC131]/20" },
    { name: "Vite 7.2", bg: "bg-[#646CFF]/10", text: "text-[#646CFF]", border: "border-[#646CFF]/20" },
    { name: "Rust", bg: "bg-[#DEA584]/10", text: "text-[#DEA584]", border: "border-[#DEA584]/20" },
    { name: "Tailwind CSS", bg: "bg-[#38B2AC]/10", text: "text-[#38B2AC]", border: "border-[#38B2AC]/20" },
  ]

  return (
    <section className="py-20 border-t border-border/50">
      <div className="container mx-auto px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          Powered by Modern Tech Stack
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          {stack.map((item) => (
            <div 
              key={item.name}
              className={`px-6 py-3 rounded-full text-sm font-semibold border ${item.bg} ${item.text} ${item.border}`}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
