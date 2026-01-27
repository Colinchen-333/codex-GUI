import { Crown, Github, Menu, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/Button"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const rafRef = useRef<number | null>(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      // 使用 RAF 节流，确保每帧最多更新一次
      if (rafRef.current !== null) return
      
      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY
        // 只有状态真正变化时才更新
        const shouldBeScrolled = scrollY > 10
        if ((shouldBeScrolled && !isScrolled) || (!shouldBeScrolled && isScrolled)) {
          setIsScrolled(shouldBeScrolled)
        }
        lastScrollY.current = scrollY
        rafRef.current = null
      })
    }
    
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isScrolled])

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Comparison", href: "#comparison" },
    { name: "Installation", href: "#installation" },
  ]

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/90 dark:bg-black/90 border-b border-border/50 py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/5 text-primary">
            <Crown size={24} />
          </div>
          <span>Codex Desktop</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com/Colinchen-333/codex-desktop"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github size={20} />
          </a>
          <Button size="sm" className="rounded-full">
            Download
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border p-6 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-base font-medium py-2 border-b border-border/50"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <Button className="w-full mt-2">Download</Button>
        </div>
      )}
    </nav>
  )
}
