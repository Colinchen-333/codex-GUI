import { Navbar } from "./components/layout/Navbar"
import { Footer } from "./components/layout/Footer"
import { Hero } from "./components/sections/Hero"
import { WhyProtocolNative } from "./components/sections/WhyProtocolNative"
import { MultiAgentSection } from "./components/sections/MultiAgentSection"
import { Features } from "./components/sections/Features"
import { Installation } from "./components/sections/Installation"
import { TechStack } from "./components/sections/TechStack"
import { useEffect } from "react"

function App() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("section"))
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sections.forEach((section) => section.classList.remove("opacity-0"))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => {
              entry.target.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
              entry.target.classList.remove("opacity-0")
            })
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    )

    sections.forEach((section) => {
      section.classList.add("opacity-0", "duration-500", "transform-gpu")
      observer.observe(section)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden">
      <Navbar />
      
      <main>
        <Hero />
        <WhyProtocolNative />
        <MultiAgentSection />
        <Features />
        <Installation />
        <TechStack />
      </main>

      <Footer />
    </div>
  )
}

export default App
