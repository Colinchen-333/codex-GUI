# Official Codex Desktop Component CSS Analysis - v26.305.950

> Extracted from `/tmp/codex-asar-extract/webview/assets/`
> Compared against existing `/reverse/official-*.css` (v26.305 baseline)

---

## 1. dialog-CyrLYBi9.css

### Classes & Styles

| Class | Properties |
|-------|-----------|
| `.codex-dialog` | `animation: codex-dialog-enter var(--transition-duration-relaxed) var(--cubic-enter)`, `transform-origin: top`, `will-change: transform, opacity` |
| `.codex-dialog-overlay` | `animation: codex-dialog-overlay var(--transition-duration-relaxed) var(--cubic-enter)`, `will-change: opacity` |

### Animation Keyframes

**`codex-dialog-enter`**
```css
0%   { opacity: 0; transform: translateY(calc(var(--spacing, 4px) * 2)) scale(.98) }
100% { opacity: 1; transform: translateY(0) scale(1) }
```

**`codex-dialog-overlay`**
```css
0%   { opacity: 0 }
100% { opacity: 1 }
```

### CSS Custom Properties Referenced
- `--transition-duration-relaxed`
- `--cubic-enter`
- `--spacing` (with fallback `4px`)

### Media Queries
- `@media (prefers-reduced-motion: reduce)` -- sets `animation: none` on both `.codex-dialog` and `.codex-dialog-overlay`

### Comparison with official-dialog.css (v26.305)

**No changes detected.** The v26.305.950 dialog CSS is byte-for-byte identical to the v26.305 baseline (aside from minification whitespace). Same classes, same keyframes, same custom properties, same reduced-motion handling.

---

## 2. toaster-BUxeEY5x.css

### Classes & Styles

| Class / Selector | Properties |
|-----------------|-----------|
| `.toast-root` | `flex-direction: column`, `align-items: center`, `transition: all .24s cubic-bezier(0,0,.2,1)`, `animation: .25s cubic-bezier(.175,.885,.32,1) both toast-open`, `display: flex` |
| `.toast-root[data-state=entering]`, `.toast-root[data-state=entered]` | `animation: .25s cubic-bezier(.175,.885,.32,1) both toast-open` |
| `.toast-root[data-state=exiting]` | `animation: .25s cubic-bezier(.4,0,1,1) both toast-close` |
| `.toast-root .alert-root` | `pointer-events: all`, `flex-shrink: 0`, `font-size: 13px`, `line-height: 1.5`, `box-shadow: 0 4px 12px #0000001a` |

### Animation Keyframes

**`toast-open`**
```css
0%   { opacity: 0; transform: translateY(-100%) }
100% { transform: translateY(0) }
```

**`toast-close`**
```css
0%   { opacity: 1 }
100% { opacity: 0 }
```

### CSS Custom Properties Referenced
None -- all values are hardcoded.

### Media Queries
None.

### Layout Patterns
- Toast enters from top (`translateY(-100%)`) and slides down
- Flex column with centered items
- State machine via `data-state` attribute: `entering` / `entered` / `exiting`

### Comparison with official-toaster.css (v26.305)

**No changes detected.** Identical to the v26.305 baseline. Same keyframes, same cubic-bezier values, same data-state selectors.

---

## 3. markdown-CkxRIvms.css

### Classes & Styles

| Class | Properties |
|-------|-----------|
| `._headingInlineCode_10345_7 ._inlineMarkdown_10345_7` | `font-size: inherit`, `line-height: inherit` |
| `._markdownRoot_10345_12` (on child elements -- see below) | `opacity: 0`, `animation: _fade-in_10345_1 var(--duration, .2s) cubic-bezier(.37, .55, .86, .88) forwards` |

Elements inside `._markdownRoot_10345_12` that get the fade-in:
- `._fadeIn_10345_12`
- `hr`
- `li`
- `tr`
- `blockquote`
- `code`
- `pre`

### Animation Keyframes

**`_fade-in_10345_1`**
```css
100% { opacity: 1 }
```
(Starts from `opacity: 0` set on the elements themselves)

### CSS Custom Properties Referenced
- `--duration` (with fallback `.2s`)

### Media Queries
- `@media (prefers-reduced-motion: reduce)` -- sets `--duration: 0s` and `opacity: 1` (immediately visible, no animation)

### Layout Patterns
- CSS Modules naming convention with hash suffix (`_10345_`) -- indicates Vite CSS Modules
- Element-level fade-in with staggered `--duration` variable (can be set per-element for cascading effect)
- Cubic-bezier `(.37, .55, .86, .88)` -- a gentle ease-out curve

### Comparison with official-markdown.css (v26.305)

**Hash change detected**: v26.305 also used `_10345_` hashes, so the CSS module source has not been recompiled with changes. The actual CSS rules are **identical**:
- Same `_fade-in_10345_1` keyframe
- Same `._headingInlineCode_10345_7` rule
- Same `._markdownRoot_10345_12` fade-in targets
- Same reduced-motion media query

**No functional changes.**

---

## 4. automation-dialog-DT3orJCL.css

This is the largest and most complex of the four files. It contains **three distinct sections**:
1. ProseMirror editor styles (rich text input)
2. CMDK command palette styles
3. Window-type overrides

### Classes & Styles

#### ProseMirror Editor

| Selector | Properties |
|----------|-----------|
| `.ProseMirror .placeholder` | `pointer-events: none`, `user-select: none`, `position: relative` |
| `.ProseMirror .placeholder:after` | `color: var(--color-token-input-placeholder-foreground)`, `content: attr(data-placeholder)`, `opacity: .5`, `pointer-events: none`, `user-select: none`, `white-space: nowrap`, `text-overflow: ellipsis`, `max-width: 100%`, `position: absolute`, `inset: 0 0 auto`, `overflow: hidden` |
| `.ProseMirror .placeholder::selection` | `color: inherit`, `background: 0 0` |
| `.ProseMirror .placeholder ::selection` | `color: inherit`, `background: 0 0` |
| `.ProseMirror .ProseMirror-selectednode:has([skill-mention-name])` | `outline: none` |
| `.ProseMirror` | `word-wrap: break-word`, `white-space: pre-wrap` / `break-spaces`, `font-variant-ligatures: none`, `font-feature-settings: "liga" 0`, `position: relative` |
| `.ProseMirror pre` | `white-space: pre-wrap` |
| `.ProseMirror li` | `position: relative` |
| `.ProseMirror-hideselection ::selection` | `background: 0 0` (declared twice) |
| `.ProseMirror-hideselection` | `caret-color: #0000` (transparent) |
| `.ProseMirror [draggable][contenteditable=false]` | `user-select: text` |
| `.ProseMirror-selectednode` | `outline: 2px solid #8cf` |
| `li.ProseMirror-selectednode` | `outline: none` |
| `li.ProseMirror-selectednode:after` | `content: ""`, `pointer-events: none`, `border: 2px solid #8cf`, `position: absolute`, `inset: -2px -2px -2px -32px` |
| `img.ProseMirror-separator` | `border: none!important`, `margin: 0!important`, `display: inline!important` |

#### CMDK Command Palette

| Selector | Properties |
|----------|-----------|
| `[cmdk-dialog], [cmdk-dialog]:focus-visible` | `outline: none` |
| `[cmdk-root], [data-cmdk-root]` | `gap: var(--spacing)`, `background-color: var(--color-token-dropdown-background)` (with `color-mix` fallback at 95% opacity), `min-width: 100%`, `color: var(--color-token-foreground)`, `border: 1px solid var(--color-token-border)`, `border-radius: var(--radius-3xl)`, `padding: var(--spacing)`, `font-size: var(--text-sm)`, `backdrop-filter: blur(8px)`, `user-select: none`, `z-index: 1000`, `opacity: 1`, `flex-direction: column`, `display: flex`, `transform: translateZ(0)` |
| `.command-menu-dialog [cmdk-root]` | `box-shadow: var(--shadow-2xl)`, `background-color: var(--color-token-dropdown-background)`, `backdrop-filter: none` |
| `[cmdk-item]` | `content-visibility: auto`, `border-radius: var(--radius-lg)`, `width: 100%`, `cursor: var(--cursor-interaction)`, `color: var(--color-token-foreground)`, `padding: var(--padding-row-y) var(--padding-row-x)`, `min-height: calc(var(--spacing) * 6)`, `user-select: none`, `opacity: .75`, `outline: none`, `flex-direction: row`, `align-items: center`, `display: flex` |
| `[cmdk-item][aria-disabled=true], [cmdk-item][data-disabled=true]` | `cursor: default`, `opacity: .25` |
| `[cmdk-item]:hover:not([aria-disabled=true]), [cmdk-item][data-selected=true], [cmdk-item][aria-selected=true], [cmdk-item]:focus-visible, [cmdk-item]:active:not([aria-disabled=true])` | `background-color: var(--color-token-list-hover-background)`, `opacity: 1` |
| `[cmdk-list]` | `max-height: min(300px, var(--cmdk-list-height, 300px))`, `scrollbar-width: none`, `overscroll-behavior: contain`, `gap: var(--spacing)`, `flex-direction: column`, `transition: max-height .1s`, `display: flex`, `overflow-y: auto` |
| `[cmdk-list]:focus-visible` | `outline: none` |
| Last-item radius rule | `border-bottom-left-radius: calc(var(--radius-3xl) - var(--spacing))`, `border-bottom-right-radius: calc(var(--radius-3xl) - var(--spacing))` |
| `[cmdk-input]` | `padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2.5)` |
| `[cmdk-input]:focus-visible` | `outline: none` |
| `[cmdk-empty], [data-cmdk-empty]` | `padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2.5)`, `min-height: calc(var(--spacing) * 8)`, `color: var(--color-token-description-foreground)`, `white-space: pre-wrap`, `text-align: center`, `align-items: center`, `line-height: 1.4`, `display: flex` |

#### Window-Type Overrides

| Selector | Properties |
|----------|-----------|
| `[data-codex-window-type=electron] [cmdk-root]`, `[data-codex-window-type=browser] [cmdk-root]` (and `[data-cmdk-root]` variants) | `font-size: var(--text-base)` |

### CSS Custom Properties Referenced
- `--color-token-input-placeholder-foreground`
- `--color-token-dropdown-background`
- `--color-token-foreground`
- `--color-token-border`
- `--color-token-list-hover-background`
- `--color-token-description-foreground`
- `--spacing`
- `--radius-3xl`
- `--radius-lg`
- `--text-sm`
- `--text-base`
- `--shadow-2xl`
- `--cursor-interaction`
- `--padding-row-y`
- `--padding-row-x`
- `--cmdk-list-height` (runtime, set by cmdk library)

### Media Queries
None in this file.

### Layout Patterns
- **ProseMirror**: Standard rich-text editor with `break-spaces` whitespace, ligature disabling, and custom selection/placeholder rendering via pseudo-elements
- **CMDK**: Nested radius pattern -- last items get `radius-3xl - spacing` for inset rounding
- **Backdrop blur**: `blur(8px)` on cmdk-root for frosted glass effect (disabled inside `.command-menu-dialog` for opaque menu)
- **color-mix**: `color-mix(in oklab, var(--color-token-dropdown-background) 95%, transparent)` for slight transparency
- **content-visibility: auto**: Performance optimization on cmdk items (browser skips rendering off-screen items)
- **transform: translateZ(0)**: GPU layer promotion on cmdk-root for smooth compositing

### Comparison with official-automation-dialog.css (v26.305)

**No functional changes detected.** The CSS is identical to the v26.305 baseline. All ProseMirror rules, CMDK styles, custom properties, and window-type overrides match exactly.

---

## Summary of Changes: v26.305 --> v26.305.950

| File | Status | Changes |
|------|--------|---------|
| dialog | **UNCHANGED** | Identical keyframes, classes, media queries |
| toaster | **UNCHANGED** | Identical keyframes, data-state selectors, hardcoded values |
| markdown | **UNCHANGED** | Same CSS module hashes (`_10345_`), same fade-in keyframe |
| automation-dialog | **UNCHANGED** | Same ProseMirror + CMDK + window-type rules |

**Conclusion**: The component CSS layer has been completely stable between v26.305 and v26.305.950. All four component stylesheets are functionally identical. Any visual changes in this version range were made in the main theme CSS (custom property values), JavaScript/React component logic, or Tailwind utility classes -- not in these extracted component stylesheets.

---

## Comprehensive Token & Pattern Reference

The following is a consolidated reference of all CSS custom properties and design patterns found across all four component stylesheets, useful for our Tauri implementation alignment.

### All Custom Properties (Deduplicated)

**Timing & Animation:**
- `--transition-duration-relaxed` -- dialog enter/overlay timing
- `--cubic-enter` -- cubic-bezier for dialog entrance
- `--duration` -- markdown fade-in duration (fallback: `.2s`)

**Spacing & Layout:**
- `--spacing` -- base spacing unit (fallback: `4px`)
- `--padding-row-y` -- vertical row padding (cmdk items)
- `--padding-row-x` -- horizontal row padding (cmdk items)

**Radii:**
- `--radius-3xl` -- cmdk-root border radius
- `--radius-lg` -- cmdk-item border radius

**Typography:**
- `--text-sm` -- cmdk default font size
- `--text-base` -- cmdk font size in electron/browser window

**Colors:**
- `--color-token-input-placeholder-foreground` -- ProseMirror placeholder
- `--color-token-dropdown-background` -- cmdk background
- `--color-token-foreground` -- cmdk text color
- `--color-token-border` -- cmdk border
- `--color-token-list-hover-background` -- cmdk item hover/selected
- `--color-token-description-foreground` -- cmdk empty state text

**Shadows:**
- `--shadow-2xl` -- command menu dialog shadow

**Cursors:**
- `--cursor-interaction` -- cmdk item cursor

**Runtime (library-set):**
- `--cmdk-list-height` -- set by cmdk library for dynamic height

### Hardcoded Values Worth Noting

| Value | Where Used | Notes |
|-------|-----------|-------|
| `#8cf` | ProseMirror selected node outline | Light blue, not tokenized |
| `#0000` | ProseMirror hide-selection caret | Transparent black |
| `#0000001a` | Toast shadow | `rgba(0,0,0,0.1)` |
| `13px` | Toast alert font-size | Not using `--text-*` token |
| `.75` / `.25` | cmdk item opacity states | Default / disabled |
| `.5` | ProseMirror placeholder opacity | |
| `blur(8px)` | cmdk backdrop-filter | Hardcoded, not `--blur-*` token |
| `1000` | cmdk z-index | Hardcoded, not `--z-*` token |

### Animation Easing Curves

| Curve | Value | Usage |
|-------|-------|-------|
| Dialog enter | `var(--cubic-enter)` | Tokenized |
| Toast enter | `cubic-bezier(.175, .885, .32, 1)` | Elastic ease-out |
| Toast transition | `cubic-bezier(0, 0, .2, 1)` | Material ease-out |
| Toast exit | `cubic-bezier(.4, 0, 1, 1)` | Accelerate out |
| Markdown fade | `cubic-bezier(.37, .55, .86, .88)` | Gentle ease-out |

### Key Architectural Observations

1. **ProseMirror is the automation dialog editor** -- not a plain textarea. The official app uses a rich-text editor with skill mention support (`[skill-mention-name]` attribute).

2. **CMDK uses attribute selectors** -- `[cmdk-root]`, `[cmdk-item]`, etc. -- not class names. This matches the cmdk library's DOM output.

3. **`color-mix(in oklab, ...)` usage** -- the official app uses OKLAB color space mixing for semi-transparent backgrounds. This is a modern CSS feature (Safari 15.4+, Chrome 111+).

4. **`content-visibility: auto`** on cmdk items -- performance optimization that lets the browser skip rendering of off-screen list items. Important for long command lists.

5. **`data-codex-window-type`** attribute -- distinguishes between `electron` and `browser` rendering contexts. Font size is bumped to `--text-base` in both (vs `--text-sm` default in embedded/popover context).

6. **CSS Modules with stable hashes** -- markdown uses Vite CSS Modules with hash `_10345_`. These hashes are compilation artifacts and should not be replicated; use equivalent class names instead.

7. **Reduced motion is respected everywhere** -- all animation files include `@media (prefers-reduced-motion: reduce)` with appropriate fallbacks (`animation: none` or `--duration: 0s`).
