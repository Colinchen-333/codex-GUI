/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        "surface-solid": "hsl(var(--surface-solid))",
        "surface-hover": "hsl(var(--hover))",
        "surface-selected": "hsl(var(--selected))",
        stroke: "hsl(var(--stroke))",
        "text-1": "hsl(var(--text))",
        "text-2": "hsl(var(--text-2))",
        "text-3": "hsl(var(--text-3))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        overlay: "hsl(var(--overlay))",
        "overlay-heavy": "hsl(var(--overlay-heavy))",
        "switch-knob": "hsl(var(--switch-knob))",
        "status-success": {
          DEFAULT: "hsl(var(--status-success))",
          foreground: "hsl(var(--status-success-foreground))",
          muted: "hsl(var(--status-success-muted))",
        },
        "status-warning": {
          DEFAULT: "hsl(var(--status-warning))",
          foreground: "hsl(var(--status-warning-foreground))",
          muted: "hsl(var(--status-warning-muted))",
        },
        "status-error": {
          DEFAULT: "hsl(var(--status-error))",
          foreground: "hsl(var(--status-error-foreground))",
          muted: "hsl(var(--status-error-muted))",
        },
        "status-info": {
          DEFAULT: "hsl(var(--status-info))",
          foreground: "hsl(var(--status-info-foreground))",
          muted: "hsl(var(--status-info-muted))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--r-lg)",
        md: "var(--r-md)",
        sm: "var(--r-sm)",
      },
    },
  },
  plugins: [],
}
