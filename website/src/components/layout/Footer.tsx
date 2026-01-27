import { Crown, Github, Twitter, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050505] py-16 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl mb-6">
              <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center">
                <Crown size={18} fill="currentColor" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Codex Desktop</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
              The professional GUI for Codex. Built for developers who refuse to compromise on speed, safety, or control.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-foreground">Resources</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-6 text-foreground">Legal</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">License</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Lumirain Studio. Open Source MIT License.</p>
          <div className="flex items-center gap-1.5">
            <span>Made with</span>
            <Heart size={12} className="text-red-500 fill-red-500" />
            <span>by Colin Chen</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
