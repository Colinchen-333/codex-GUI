# Official Codex Desktop CSS Token Reference (v26.305.950)

Extracted from the main CSS bundle of Codex Desktop v26.305.950 (Electron 40, Tailwind CSS v4).
Total unique CSS custom properties: **1,136**. Total `@keyframes`: **12**.

---

## 1. Primitive Color Palette

The foundation color scale. All semantic tokens reference these primitives.

```css
--black: #000;
--white: #fff;

/* Gray scale (11 stops) */
--gray-0:    #fff;
--gray-50:   #f9f9f9;
--gray-100:  #ededed;
--gray-300:  #afafaf;
--gray-500:  #5d5d5d;
--gray-600:  #414141;
--gray-750:  #282828;
--gray-800:  #212121;
--gray-900:  #181818;
--gray-1000: #0d0d0d;

/* Blue */
--blue-50:  #e5f3ff;
--blue-100: #99ceff;
--blue-300: #339cff;
--blue-400: #0285ff;
--blue-900: #00284d;

/* Green */
--green-300: #40c977;
--green-400: #04b84c;
--green-500: #00a240;

/* Red */
--red-50:  #ffd9d9;
--red-300: #ff6764;
--red-400: #fa423e;
--red-500: #e02e2a;
--red-600: #ba2623;
--red-900: #4d100e;

/* Orange */
--orange-50:  #ffe7d9;
--orange-300: #ff8549;
--orange-400: #fb6a22;
--orange-500: #e25507;
--orange-700: #923b0f;
--orange-900: #4a2206;

/* Yellow */
--yellow-300: #ffd240;
--yellow-400: #ffc300;

/* Purple */
--purple-300: #ad7bf9;
--purple-400: #924ff7;

/* Pink */
--pink-400: #ff66ad;

/* OKLCH definitions */
--color-blue-300: oklch(80.9% .105 251.813);
--color-blue-500: oklch(62.3% .214 259.815);
```

---

## 2. Color Tokens (`--color-token-*`)

The **bridge layer** that maps VSCode theme variables to Codex's token system. 88 tokens total.

### Surface & Background

```css
--color-token-bg-primary:     var(--vscode-editor-background);
--color-token-bg-primary:     var(--color-token-side-bar-background);   /* alternate */
--color-token-bg-secondary:   color-mix(in srgb, var(--color-token-bg-primary) 92%, transparent);
--color-token-bg-tertiary:    color-mix(in srgb, var(--color-token-bg-primary) 85%, transparent);
--color-token-bg-fog:         color-mix(in oklab, var(--color-token-foreground) 2.5%, transparent);
--color-token-main-surface-primary: var(--color-token-bg-primary);
--color-token-side-bar-background:  var(--vscode-sideBar-background);
--color-token-editor-background:    var(--vscode-editor-background);
--color-token-terminal-background:  var(--color-token-main-surface-primary);
--color-token-dropdown-background:  var(--vscode-dropdown-background);
--color-token-menu-background:      var(--vscode-menu-background);
--color-token-input-background:     var(--vscode-input-background);
```

### Text & Foreground

```css
--color-token-foreground:             var(--vscode-foreground);
--color-token-text-primary:           var(--color-token-foreground);
--color-token-text-secondary:         color-mix(in srgb, var(--color-token-foreground) 65%, transparent);
--color-token-text-tertiary:          var(--color-token-description-foreground);
--color-token-description-foreground: color-mix(in srgb, var(--color-token-foreground) 70%, transparent);
--color-token-editor-foreground:      var(--vscode-editor-foreground);
--color-token-icon-foreground:        var(--vscode-icon-foreground);
--color-token-disabled-foreground:    var(--vscode-disabledForeground);
--color-token-text-link-foreground:   var(--vscode-textLink-foreground);
--color-token-text-link-active-foreground: var(--vscode-textLink-activeForeground);
--color-token-link:                   var(--color-token-text-link-foreground);
--color-token-input-foreground:       var(--vscode-input-foreground);
--color-token-input-placeholder-foreground: var(--vscode-input-placeholderForeground);
```

### Border

```css
--color-token-border:         color-mix(in oklab, var(--vscode-foreground) 8%, transparent);
--color-token-border-default: var(--color-token-border);
--color-token-border-light:   color-mix(in oklab, var(--color-token-border) 50%, transparent);
--color-token-focus-border:   var(--vscode-focusBorder);
--color-token-menu-border:    var(--vscode-menu-border);
--color-token-terminal-border: var(--vscode-terminal-border);
--color-token-input-border:   var(--vscode-input-border);
```

### Button

```css
--color-token-button-background:  var(--vscode-button-background);
--color-token-button-foreground:  var(--vscode-button-foreground);
--color-token-button-border:      var(--vscode-button-border);
--color-token-button-secondary-hover-background: var(--vscode-button-secondaryHoverBackground);
```

### Badges, Checkbox, Radio

```css
--color-token-badge-background:    var(--vscode-badge-background);
--color-token-badge-foreground:    var(--vscode-badge-foreground);
--color-token-checkbox-background: var(--vscode-checkbox-background);
--color-token-checkbox-border:     var(--vscode-checkbox-border);
--color-token-checkbox-foreground: var(--vscode-checkbox-foreground);
--color-token-radio-active-foreground: var(--vscode-radio-activeForeground);
```

### Charts

```css
--color-token-charts-blue:   var(--vscode-charts-blue);
--color-token-charts-green:  var(--vscode-charts-green);
--color-token-charts-orange: var(--vscode-charts-orange);
--color-token-charts-purple: var(--vscode-charts-purple);
--color-token-charts-red:    var(--vscode-charts-red);
--color-token-charts-yellow: var(--vscode-charts-yellow);
```

### Error & Validation

```css
--color-token-error-foreground:          var(--vscode-errorForeground);
--color-token-editor-error-foreground:   var(--vscode-editorError-foreground);
--color-token-editor-warning-foreground: var(--vscode-editorWarning-foreground);
--color-token-input-validation-error-background:   var(--vscode-inputValidation-errorBackground);
--color-token-input-validation-error-border:       var(--vscode-inputValidation-errorBorder);
--color-token-input-validation-info-background:    var(--vscode-inputValidation-infoBackground);
--color-token-input-validation-warning-background: var(--vscode-inputValidation-warningBackground);
--color-token-input-validation-warning-border:     var(--vscode-inputValidation-warningBorder);
```

### Git Decoration

```css
--color-token-git-decoration-added-resource-foreground:   var(--vscode-gitDecoration-addedResourceForeground);
--color-token-git-decoration-deleted-resource-foreground: var(--vscode-gitDecoration-deletedResourceForeground);
```

### Terminal ANSI (16 colors)

```css
--color-token-terminal-ansi-black:          var(--vscode-terminal-ansiBlack);
--color-token-terminal-ansi-red:            var(--vscode-terminal-ansiRed);
--color-token-terminal-ansi-green:          var(--vscode-terminal-ansiGreen);
--color-token-terminal-ansi-yellow:         var(--vscode-terminal-ansiYellow);
--color-token-terminal-ansi-blue:           var(--vscode-terminal-ansiBlue);
--color-token-terminal-ansi-magenta:        var(--vscode-terminal-ansiMagenta);
--color-token-terminal-ansi-cyan:           var(--vscode-terminal-ansiCyan);
--color-token-terminal-ansi-white:          var(--vscode-terminal-ansiWhite);
--color-token-terminal-ansi-bright-black:   var(--vscode-terminal-ansiBrightBlack);
--color-token-terminal-ansi-bright-red:     var(--vscode-terminal-ansiBrightRed);
--color-token-terminal-ansi-bright-green:   var(--vscode-terminal-ansiBrightGreen);
--color-token-terminal-ansi-bright-yellow:  var(--vscode-terminal-ansiBrightYellow);
--color-token-terminal-ansi-bright-blue:    var(--vscode-terminal-ansiBrightBlue);
--color-token-terminal-ansi-bright-magenta: var(--vscode-terminal-ansiBrightMagenta);
--color-token-terminal-ansi-bright-cyan:    var(--vscode-terminal-ansiBrightCyan);
--color-token-terminal-ansi-bright-white:   var(--vscode-terminal-ansiBrightWhite);
--color-token-terminal-foreground:          var(--vscode-terminal-foreground);
--color-token-terminal-selection-background:          var(--vscode-terminal-selectionBackground);
--color-token-terminal-inactive-selection-background: var(--vscode-terminal-inactiveSelectionBackground);
```

### Scrollbar & Toolbar

```css
--color-token-scrollbar-slider-background:        var(--vscode-scrollbarSlider-background);
--color-token-scrollbar-slider-hover-background:   var(--vscode-scrollbarSlider-hoverBackground);
--color-token-scrollbar-slider-active-background:  var(--vscode-scrollbarSlider-activeBackground);
--color-token-toolbar-hover-background:            var(--vscode-toolbar-hoverBackground);
--color-token-list-active-selection-background:    var(--vscode-list-activeSelectionBackground);
--color-token-list-hover-background:               var(--vscode-list-hoverBackground);
--color-token-text-code-block-background:          var(--vscode-textCodeBlock-background);
```

---

## 3. Semantic Color System (`--color-*`)

Higher-level semantic colors that adapt per theme. Each has dark and light variants.

### Accent Colors (dark / light)

```css
--color-accent-blue:   var(--blue-300)   / var(--blue-400);
--color-accent-green:  var(--green-300)  / var(--green-500);
--color-accent-orange: var(--orange-400) / var(--orange-500);
--color-accent-purple: var(--purple-300) / var(--purple-400);
--color-accent-red:    var(--red-300)    / var(--red-500);
--color-accent-yellow: var(--yellow-300) / var(--yellow-400);
```

### Background Surfaces

```css
/* Dark / Light */
--color-background-surface:       var(--gray-900) / var(--gray-0);
--color-background-surface-under: black           / var(--gray-50);

/* Elevated (glassmorphism) */
--color-background-elevated-primary:        color-mix(in oklab, var(--gray-800) 96%, transparent) / color-mix(in oklab, var(--gray-0) 70%, transparent);
--color-background-elevated-primary-opaque: var(--gray-750)  / var(--gray-0);
--color-background-elevated-secondary:      color-mix(in oklab, var(--gray-0) 3%, transparent)    / color-mix(in oklab, var(--gray-1000) 2%, transparent);
--color-background-elevated-secondary-opaque: var(--gray-800) / color-mix(in oklab, var(--gray-100) 40%, transparent);

/* Status */
--color-background-status-error:   var(--red-900)    / var(--red-50);
--color-background-status-success: color-mix(in oklab, var(--green-300) 16%, transparent) / color-mix(in oklab, var(--green-500) 7%, transparent);
--color-background-status-warning: var(--orange-900) / var(--orange-50);

/* Accent */
--color-background-accent:        var(--blue-900) / var(--blue-50);
--color-background-accent-hover:   var(--blue-900) / var(--blue-50);
--color-background-accent-active:  var(--blue-900) / var(--blue-50);
```

### Button Backgrounds (4-state: default, hover, active, inactive)

```css
/* Primary button: uses gray-1000 with opacity mixing */
--color-background-button-primary:          var(--gray-1000);
--color-background-button-primary-hover:    color-mix(in oklab, var(--gray-1000) 8%, transparent);   /* dark */
--color-background-button-primary-active:   color-mix(in oklab, var(--gray-1000) 16%, transparent);  /* dark */
--color-background-button-primary-inactive: color-mix(in oklab, var(--gray-1000) 3%, transparent);   /* dark */

/* Secondary button: 5% opacity base */
--color-background-button-secondary:          color-mix(in oklab, var(--gray-0) 5%, transparent);    /* dark */
--color-background-button-secondary-hover:    color-mix(in oklab, var(--gray-0) 8%, transparent);    /* dark */
--color-background-button-secondary-active:   color-mix(in oklab, var(--gray-0) 12%, transparent);   /* dark */
--color-background-button-secondary-inactive: color-mix(in oklab, var(--gray-0) 4%, transparent);    /* dark */

/* Tertiary button: 3% opacity base (ghost) */
--color-background-button-tertiary:        color-mix(in oklab, var(--gray-0) 3%, transparent);   /* dark */
--color-background-button-tertiary-hover:  color-mix(in oklab, var(--gray-0) 7%, transparent);   /* dark */
--color-background-button-tertiary-active: color-mix(in oklab, var(--gray-0) 10%, transparent);  /* dark */

/* Danger button */
--color-background-danger:        color-mix(in oklab, var(--red-400) 14%, transparent);   /* dark */
--color-background-danger-hover:  color-mix(in oklab, var(--red-400) 28%, transparent);   /* dark */
--color-background-danger-active: color-mix(in oklab, var(--red-400) 36%, transparent);   /* dark */
--color-background-danger-inactive: color-mix(in oklab, var(--red-400) 20%, transparent); /* dark */
```

### Borders

```css
--color-border:       color-mix(in oklab, var(--white) 8%, transparent);        /* dark */
--color-border:       color-mix(in oklab, var(--gray-1000) 8%, transparent);    /* light */
--color-border-light: color-mix(in oklab, var(--white) 4%, transparent);        /* dark */
--color-border-heavy: color-mix(in oklab, var(--white) 16%, transparent);       /* dark */
--color-border-focus:   color-mix(in oklab, var(--blue-300) 70%, transparent);  /* dark */
--color-border-focus:   var(--blue-400);                                        /* light */
--color-border-error:   color-mix(in oklab, var(--red-400) 40%, transparent);   /* dark */
--color-border-warning: color-mix(in oklab, var(--orange-300) 40%, transparent); /* dark */
```

### Text

```css
--color-text-foreground:           var(--color-token-foreground);
--color-text-foreground-secondary: ...;
--color-text-foreground-tertiary:  ...;
--color-text-accent:    ...;
--color-text-error:     ...;
--color-text-warning:   ...;
--color-text-success:   ...;
--color-text-button-primary:   ...;
--color-text-button-secondary: ...;
--color-text-button-tertiary:  ...;
```

### Icons

```css
--color-icon-primary:   ...;
--color-icon-secondary: ...;
--color-icon-tertiary:  ...;
--color-icon-accent:    ...;
--color-icon-inverted:  ...;
--color-icon-error:     ...;
--color-icon-warning:   ...;
--color-icon-success:   ...;
```

### Editor Diff Colors

```css
--color-decoration-added:     var(--green-300)  / var(--green-500);
--color-decoration-deleted:   var(--red-400)    / var(--red-600);
--color-decoration-modified:  var(--orange-300) / var(--orange-700);
--color-decoration-unchanged: var(--gray-300)   / var(--gray-600);

--color-editor-added:      color-mix(in oklab, var(--green-300) 23%, transparent);   /* dark */
--color-editor-deleted:    color-mix(in oklab, var(--red-400) 23%, transparent);      /* dark */
--color-editor-modified:   color-mix(in oklab, var(--orange-300) 23%, transparent);   /* dark */
--color-editor-unchanged:  #41414133;                                                /* dark */
```

### Scrim

```css
--color-simple-scrim: ...;
```

---

## 4. Text Hierarchy Tokens

```css
--text-primary:    var(--color-token-description-foreground);
--text-secondary:  color-mix(in srgb, var(--text-primary) 55%, transparent);
--text-tertiary:   color-mix(in srgb, var(--text-primary) 35%, transparent);
--text-quaternary: color-mix(in srgb, var(--text-primary) 18%, transparent);
```

---

## 5. Spacing Tokens

```css
--spacing: .25rem;    /* 4px base unit */

--spacing-token-button-composer:     calc(var(--spacing) * 7);     /* 28px */
--spacing-token-button-composer-sm:  calc(var(--spacing) * 5);     /* 20px (compact), 7 (normal) */
--spacing-token-button-composer-gap: var(--spacing);               /* 4px */
--spacing-token-safe-header-left:    0px;
--spacing-token-safe-header-right:   0px;
--spacing-token-sidebar:             clamp(240px, 300px, min(520px, calc(100vw - 320px)));

--padding-panel-base: calc(var(--spacing) * 5);     /* 20px (large) / 3 (12px small) */
--padding-panel:      var(--padding-panel-base);     /* full or half */
--padding-row-x:      calc(var(--spacing) * 2);      /* 8px */
--padding-row-y:      calc(var(--spacing) * 1.25);   /* 5px (large) / 1 (4px small) */

--safe-area-left:  0px;
--safe-area-right: 0px;

--conversation-block-gap:         12px;
--conversation-tool-assistant-gap: 16px;

--thread-content-max-width:  none;      /* default: none (full width) */
--thread-composer-max-width: none;      /* or: calc(var(--thread-content-max-width) + 1rem) */
--thread-footer-overlap:     0px;       /* or: var(--radius-4xl) */

--edge-fade-distance: 1rem;             /* 1rem / 1.5rem / 2rem variants */
```

---

## 6. Typography Tokens

### Font Families

```css
--font-sans: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
--font-mono: var(--vscode-editor-font-family, var(--font-mono-default));
--font-mono-default: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

### Font Sizes (with line-height companions)

```css
--text-xs:   10px;   --text-xs--line-height:   calc(1 / .75);      /* 1.333 */
--text-sm:   12px;   --text-sm--line-height:   calc(1.25 / .875);  /* 1.429 */
--text-base: 13px;   --text-base--line-height: calc(1.5 / 1);      /* 1.5 */
--text-lg:   16px;   --text-lg--line-height:   calc(1.75 / 1.125); /* 1.556 */
--text-xl:   28px;   --text-xl--line-height:   calc(1.75 / 1.25);  /* 1.4 */
--text-2xl:  36px;   --text-2xl--line-height:  calc(2 / 1.5);      /* 1.333 */
--text-3xl:  48px;   --text-3xl--line-height:  calc(2.25 / 1.875); /* 1.2 */
--text-4xl:  72px;

--text-heading-lg: 24px;
--text-heading-md: 16px / 18px / 20px;  /* responsive */

--text-link-decoration: none;

/* Chat-specific */
--codex-chat-font-size:      var(--vscode-chat-font-size, var(--vscode-font-size, 13px));
--codex-chat-code-font-size: var(--vscode-chat-editor-font-size, var(--vscode-editor-font-size, 12px));
```

### Font Weights

```css
--font-weight-light:    300;
--font-weight-normal:   400;
--font-weight-medium:   500;
--font-weight-semibold: 600;
--font-weight-bold:     700;
```

### Letter Spacing

```css
--tracking-tight:  -.025em;
--tracking-normal: 0em;
--tracking-wide:   .025em;
```

### Line Height

```css
--leading-tight:   1.25;
--leading-normal:  1.5;
--leading-relaxed: 1.625;
```

### Heading Classes

| Class | Font Size | Weight | Line Height | Extra |
|-------|-----------|--------|-------------|-------|
| `.heading-4xl` | `var(--text-4xl)` (72px) | 500 | 1 | |
| `.heading-3xl` | `var(--text-3xl)` (48px) | 500 | 1 | |
| `.heading-2xl` | `var(--text-2xl)` (36px) | 500 | 1 | |
| `.heading-xl`  | `var(--text-xl)` (28px)  | 500 | 1.2 | |
| `.heading-lg`  | `var(--text-heading-lg)` (24px) | 500 | 1.2 | |
| `.heading-base`| `var(--text-heading-md)` (16-20px) | 500 | 1.33 | |
| `.heading-dialog` | `var(--text-heading-md)` | 500 | 28px | `letter-spacing: -.36px` |
| `.heading-sm`  | `var(--text-sm)` (12px)  | 500 | 1.4 | |
| `.heading-xs`  | `var(--text-xs)` (10px)  | 500 | 1.4 | |

---

## 7. Animation & Transition Tokens

### Timing Functions

```css
--ease-out:                          cubic-bezier(0, 0, .2, 1);
--cubic-enter:                       cubic-bezier(.19, 1, .22, 1);
--transition-ease-basic:             ease;
--default-transition-timing-function: cubic-bezier(.4, 0, .2, 1);
```

### Durations

```css
--default-transition-duration: .15s;
--transition-duration-relaxed: .3s;
--use-case-transition:         .22s;
```

### Cursor

```css
--cursor-interaction: pointer;   /* or: default */
```

---

## 8. Layout Tokens

### Border Radius (9 levels, scaled by `--corner-radius-scale`)

```css
--corner-radius-scale: 1.25;   /* desktop: 1.25, compact: 1 */

--radius-2xs-base: .125rem;    /* 2px   -> 2.5px scaled */
--radius-xs-base:  .25rem;     /* 4px   -> 5px */
--radius-sm-base:  .375rem;    /* 6px   -> 7.5px */
--radius-md-base:  .5rem;      /* 8px   -> 10px */
--radius-lg-base:  .625rem;    /* 10px  -> 12.5px */
--radius-xl-base:  .75rem;     /* 12px  -> 15px */
--radius-2xl-base: 1rem;       /* 16px  -> 20px */
--radius-3xl-base: 1.25rem;    /* 20px  -> 25px */
--radius-4xl-base: 1.5rem;     /* 24px  -> 30px */
--radius-full:     9999px;

/* Each radius uses: calc(var(--radius-*-base) * var(--corner-radius-scale)) */
```

### Shadows

```css
--shadow-xl:  0px 8px 16px -4px #0000001f;
--shadow-2xl: 0px 16px 32px -8px #00000030;
```

### Blur

```css
--blur-sm: 8px;
--blur-md: 12px;
--blur-lg: 16px;
--blur-xl: 24px;
```

### Container Max-Widths

```css
--container-3xs: 16rem;   /* 256px */
--container-sm:  24rem;   /* 384px */
--container-md:  28rem;   /* 448px */
--container-lg:  32rem;   /* 512px */
--container-xl:  36rem;   /* 576px */
--container-2xl: 42rem;   /* 672px */
--container-3xl: 48rem;   /* 768px */
--container-xs:  20rem;   /* 320px */
```

### Toolbar Heights

```css
--height-toolbar:    46px;     /* or 56px in some contexts */
--height-toolbar-sm: 36px;
--inset-toolbar:     var(--height-toolbar);
--inset-toolbar-sm:  var(--height-toolbar-sm);
```

### Hotkey Window Geometry

```css
--hotkey-window-home-collapsed-height: 152px;
--hotkey-window-home-expanded-height:  340px;
--hotkey-window-home-handle-zone-height: calc(var(--spacing) * 5);
--hotkey-window-home-menu-horizontal-inset: 50px;
--hotkey-window-home-menu-neck-horizontal-outset: calc(var(--spacing) * 1);
--hotkey-window-home-menu-neck-radius:   calc(var(--spacing) * 4);
--hotkey-window-home-menu-neck-vertical-lift: calc(var(--spacing) * 3 + 3px);
--hotkey-window-home-menu-overlap:       calc(var(--spacing) * 5);
--hotkey-window-home-overlay-max-height: calc(var(--hotkey-window-home-expanded-height) - var(--hotkey-window-home-collapsed-height));
--hotkey-window-home-inline-menu-panel-background: color-mix(in oklab, var(--color-token-dropdown-background) 95%, transparent);
```

### Diff Configuration

```css
--diffs-font-family:       var(--font-mono);
--diffs-font-size:         var(--vscode-editor-font-size, 12px);
--diffs-line-height:       calc(var(--diffs-font-size, 12px) * 1.8);
--diffs-gap-block:         0;
--diffs-min-number-column-width: 4ch;
--diffs-deletion-color-override: var(--color-token-git-decoration-deleted-resource-foreground);
--diffs-addition-color-override: var(--color-token-git-decoration-added-resource-foreground);
```

---

## 9. Theme Classes

### `.electron-dark`

```css
.electron-dark {
  --lightningcss-light: ;           /* empty = falsy */
  --lightningcss-dark: initial;     /* truthy */
  --color-background-surface: var(--gray-900);
  --color-background-surface-under: black;
  --color-background-elevated-primary: #212121f5;
}
```

### `.electron-light`

```css
.electron-light {
  --lightningcss-light: initial;
  --lightningcss-dark: ;
  --color-background-surface: var(--gray-0);
  --color-background-surface-under: var(--gray-50);
  --color-background-elevated-primary: #ffffffb3;
}
```

### `.electron-opaque`

Disables transparency/glassmorphism.

---

## 10. Icon Sizes

| Class | Size |
|-------|------|
| `.icon-3xs` | 10x10 |
| `.icon-xxs` | 12x12 |
| `.icon-2xs` | 14x14 |
| `.icon-xs`  | 16x16 |
| `.icon-sm`  | 18x18 |
| `.icon-base`| 20x20 |
| `.icon-md`  | 24x24 |
| `.icon-lg`  | 28x28 |

---

## 11. @keyframes Animations (12 total)

### `hyperspeed-model-shimmer`

Gradient sweep for streaming text effect. Slides gradient from 120% to -220%.

```css
@keyframes hyperspeed-model-shimmer {
  0%  { background-position: 120% 0, 0 0 }
  45% { background-position: -220% 0, 0 0 }
  to  { background-position: -220% 0, 0 0 }
}
```

### `_loading-bar-slide_1g9nv_1`

Loading bar slide animation (CSS module scoped).

```css
@keyframes _loading-bar-slide_1g9nv_1 {
  0%  { transform: translate(0) }
  to  { transform: translate(350%) }
}
```

### `_curtainRaise_leih8_1` / `_curtainLower_leih8_1`

Window curtain reveal/hide with subtle scale.

```css
@keyframes _curtainRaise_leih8_1 {
  0%  { opacity: 0; transform: scale(1.01) }
  to  { opacity: 1; transform: scale(1) }
}

@keyframes _curtainLower_leih8_1 {
  0%  { opacity: 1; transform: scale(1) }
  to  { opacity: 0; transform: scale(1.01) }
}
```

### `edge-fade` / `edge-fade-top`

Scroll-driven edge fade masks using `animation-timeline: scroll()`.

```css
@keyframes edge-fade {
  0%  { --top-fade: 0; --bottom-fade: var(--edge-fade-distance, 1rem) }
  1%  { --top-fade: 0; --bottom-fade: var(--edge-fade-distance, 1rem) }
  99% { --top-fade: var(--edge-fade-distance, 1rem); --bottom-fade: 0 }
  to  { --top-fade: var(--edge-fade-distance, 1rem); --bottom-fade: 0 }
}
```

### `loading-shimmer`

Generic shimmer loading effect.

```css
@keyframes loading-shimmer {
  0%  { background-position: -100% 0 }
  to  { background-position: 250% 0 }
}
```

### `pulse`

Standard pulse animation.

```css
@keyframes pulse {
  50% { opacity: .5 }
}
```

### `sync-dot-pass-down` / `sync-dot-pass-up`

Synchronization indicator dots with scale bounce.

```css
@keyframes sync-dot-pass-down {
  0%, 50%, to { opacity: .16; transform: scale(1) }
  12%  { opacity: .55; transform: scale(1.1) }
  25%  { opacity: 1;   transform: scale(1.28) }
  38%  { opacity: .55; transform: scale(1.1) }
}

@keyframes sync-dot-pass-up {
  0%, 50%, to { opacity: .16; transform: scale(1) }
  62%  { opacity: .55; transform: scale(1.1) }
  75%  { opacity: 1;   transform: scale(1.28) }
  88%  { opacity: .55; transform: scale(1.1) }
}
```

### `spin`

360-degree rotation.

```css
@keyframes spin {
  to { transform: rotate(360deg) }
}
```

### `ping`

Ping/ripple effect.

```css
@keyframes ping {
  75%, to { opacity: 0; transform: scale(2) }
}
```

---

## 12. Component Classes

### Layout & Surface

```css
.main-surface {
  transition: background-color var(--transition-duration-relaxed) var(--transition-ease-basic),
              border-radius var(--transition-duration-relaxed) var(--transition-ease-basic),
              box-shadow var(--transition-duration-relaxed) var(--transition-ease-basic);
}

/* Celebration mode: removes all surface styling */
.window-fx-celebration .main-surface {
  box-shadow: none;
  background-color: transparent;
  background-image: none;
  border-radius: 0;
}

.window-fx-sidebar-surface {
  transition: background-color var(--transition-duration-relaxed) var(--transition-ease-basic);
}
```

### Hotkey Window / Home

```css
._home_leih8_1 { ... }
._homeShell_leih8_15 { ... }
._homeComposerRoot_leih8_19 { ... }
._homeDragRow_leih8_30 { ... }
._composerSurface_leih8_38 { ... }
._curtain_leih8_61 { ... }
._homeInlineMenuShell_leih8_109 { ... }
._homeInlineMenuPanel_leih8_121 { ... }
```

### Composer Footer (Container Queries)

```css
.composer-footer { container: composer-footer / inline-size; }

/* At narrow widths, labels hide and icons collapse */
@container composer-footer (max-width: 440px) {
  .composer-footer__label--sm { display: none; }
}
@container composer-footer (max-width: 300px) {
  .composer-footer__label--xs { display: none; }
  .composer-footer__icon--collapsed { display: inline-flex; }
}
```

### Inbox Toolbar (Container Queries)

```css
.inbox-toolbar { container: inbox-toolbar / inline-size; }

@container inbox-toolbar (max-width: 260px) {
  .inbox-toolbar__filter { display: none; }
  .inbox-toolbar__label--compact { ... }
}
```

### App Header

```css
.app-header-tint {
  background-color: transparent;
  transition: background-color var(--transition-duration-relaxed) var(--transition-ease-basic);
}

.app-header-divider {
  opacity: 0;
  transition: opacity var(--transition-duration-relaxed) var(--transition-ease-basic);
}
```

### Scroll Fade Masks (Scroll-Driven Animation)

```css
.vertical-scroll-fade-mask {
  mask: linear-gradient(to bottom in oklch,
    oklch(60% 0 0/0),
    oklch(85% 0 0) var(--top-fade)
    calc(100% - var(--bottom-fade)),
    oklch(60% 0 0/0)
  );
  animation-name: edge-fade;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-timeline: scroll(self y);
}
```

### File Tree (Virtualized)

```css
.file-tree-root { contain: layout paint style; }
.file-tree-row  { content-visibility: auto; contain-intrinsic-size: 28px; }
```

### Diff Virtualization

```css
.review-diff-virtualized { content-visibility: auto; contain-intrinsic-size: auto 360px; }
.thread-diff-virtualized { content-visibility: auto; contain-intrinsic-size: auto 40vh; }
```

### Find-in-Thread Highlights

```css
.codex-thread-find-match {
  background-color: var(--vscode-charts-yellow);
  color: var(--color-token-foreground);
  border-radius: var(--radius-2xs);
}
.codex-thread-find-active {
  background-color: var(--vscode-charts-orange);
}
```

### Hyperspeed Shimmer (Streaming Text)

```css
.hyperspeed-model-shimmer {
  background-image: linear-gradient(to right,
    transparent 0%, transparent 40%,
    var(--hyperspeed-mid-blue) 48%,
    var(--hyperspeed-link-blue-active) 54%,
    var(--hyperspeed-mid-blue) 60%,
    transparent 78%, transparent 100%
  ), linear-gradient(currentColor, currentColor);
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation-name: hyperspeed-model-shimmer;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-duration: calc(var(--hyperspeed-shimmer-run-ms) + var(--hyperspeed-shimmer-pause-ms));
}

/* Respects reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hyperspeed-model-shimmer {
    -webkit-text-fill-color: currentColor;
    color: var(--color-token-foreground);
    background: none;
    animation: none;
  }
}
```

### Shimmer Scope Variables

```css
.hyperspeed-shimmer-scope .loading-shimmer {
  --hyperspeed-link-blue: var(--color-token-text-link-foreground);
  --hyperspeed-link-blue-active: var(--color-token-text-link-active-foreground, var(--hyperspeed-link-blue));
  --shimmer-text-secondary: color-mix(in srgb, var(--hyperspeed-link-blue) 55%, transparent);
  --shimmer-contrast: color-mix(in srgb, var(--hyperspeed-link-blue-active) 90%, transparent);
}
```

### Home Use-Case Cards

```css
.home-use-case-gallery { --use-case-transition: .22s; }
.home-use-case-header {
  opacity: 0;
  transition: opacity var(--use-case-transition) ease, transform var(--use-case-transition) ease;
  will-change: opacity, transform;
  transform: translateY(8px);
}
/* Active state */
.home-use-case-header { opacity: 1; transform: translateY(0); }
```

### Sidebar Resize Handle

```css
.sidebar-resize-handle-line {
  background: none;
  transition: background-color var(--transition-duration-relaxed) var(--transition-ease-basic);
}
```

### Utility Classes

```css
.hide-scrollbar {
  transition: scrollbar-color .15s;
  scrollbar-color: transparent transparent !important;
}

.scrollbar-stable { scrollbar-gutter: stable; }
.no-drag { -webkit-app-region: no-drag; }
.enable-mouse-events { cursor: default; }
.live-region { width: 1px; height: 1px; position: absolute; left: -9999px; overflow: hidden; }
.compact-window { ... }
.panel-animated { ... }
.panel-dragging { ... }
.pulsing-dot {
  background-color: currentColor;
  border-radius: 50%;
  width: 6px; height: 6px;
  animation: 1.5s infinite pulse;
}
```

### Skills & Automation

```css
.skills-page-container { container-type: inline-size; }
.skills-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
/* @container query for wider: repeat(2, ...) */

.automation-row { container-type: inline-size; }
.automation-row__schedule { display: none; } /* hidden in narrow container */
```

---

## 13. Highlight.js Syntax Theme

### Dark Theme

```css
.hljs             { color: #fff; }
.hljs-comment     { color: #ffffff80; }     /* 50% white */
.hljs-meta        { color: #fff9; }         /* 60% white */
.hljs-title       { color: #e9950c; }       /* gold */
.hljs-literal     { color: #2e95d3; }       /* blue */
.hljs-meta-string { color: #00a67d; }       /* green */
.hljs-number      { color: #df3079; }       /* pink */
.hljs-title       { color: #f22c3d; }       /* red (override for functions) */
```

### Light Theme

```css
.hljs             { color: #383a42; }
.hljs-quote       { color: #a0a1a7; font-style: italic; }
.hljs-formula     { color: #a626a4; }       /* purple */
.hljs-subst       { color: #e45649; }       /* red */
.hljs-literal     { color: #0184bb; }       /* blue */
.hljs-meta-string { color: #50a14f; }       /* green */
.hljs-title       { color: #c18401; }       /* gold */
.hljs-number      { color: #986801; }       /* brown */
.hljs-title       { color: #4078f2; }       /* blue (functions) */
```

### Shared

```css
.hljs-emphasis { font-style: italic; }
.hljs-strong   { font-weight: 700; }
.hljs-link     { text-decoration: underline; }
```

---

## 14. VSCode Theme Variables (403 total)

The CSS includes **403 `--vscode-*` variables** that are injected by the Electron host at runtime. These are the complete VS Code workbench color API. Key categories:

- **Editor** (~90 vars): background, foreground, selection, find, gutter, rulers, brackets, inlay hints
- **Terminal** (~25 vars): 16 ANSI colors + background/foreground/selection/border
- **UI Chrome** (~50 vars): sideBar, statusBar, titleBar, tab, panel, menu, toolbar
- **Input/Dropdown** (~15 vars): background, border, foreground, placeholder, validation
- **Lists/Trees** (~15 vars): selection, hover, focus, highlight
- **Git** (~10 vars): added/deleted/modified/untracked/renamed decoration colors
- **Debugging** (~25 vars): icons, tokens, toolbar, exception widgets
- **SCM Graph** (~15 vars): foreground colors, history item styling
- **Testing** (~15 vars): icons, coverage, peek borders
- **Notebooks** (~15 vars): cell borders, editor background
- **Other** (~100+ vars): badges, banners, breadcrumbs, charts, keybindings, minimap, notifications, progress bar, quick input, scrollbar, settings, etc.

These are NOT defined in the CSS -- they are injected at runtime by the Electron shell and consumed by `var(--vscode-*)` references throughout.

---

## 15. :root Defaults

Variables set on `:root` (base configuration):

```css
:root {
  --padding-row-y: calc(var(--spacing) * 1);
  --padding-panel-base: calc(var(--spacing) * 3);
  --padding-panel: var(--padding-panel-base);
  --inset-toolbar: var(--height-toolbar);
  --safe-area-left: 0px;
  --safe-area-right: 0px;
  --codex-chat-font-size: var(--vscode-chat-font-size, var(--vscode-font-size, 13px));
  --codex-chat-code-font-size: var(--vscode-chat-editor-font-size, var(--vscode-editor-font-size, 12px));
  --conversation-block-gap: 12px;
  --conversation-tool-assistant-gap: 16px;
  --corner-radius-scale: 1.25;
  --diffs-font-family: var(--font-mono);
  --diffs-font-size: var(--vscode-editor-font-size, 12px);
  --diffs-line-height: calc(var(--diffs-font-size, 12px) * 1.8);
  --diffs-gap-block: 0;
  --diffs-min-number-column-width: 4ch;
}
```

---

## 16. Tailwind v4 Internal Variables

The CSS includes ~70 `--tw-*` internal variables used by Tailwind CSS v4's JIT engine. These are implementation details, not design tokens:

- `--tw-shadow`, `--tw-ring-*`, `--tw-gradient-*`, `--tw-blur`, `--tw-backdrop-*`
- `--tw-translate-*`, `--tw-rotate-*`, `--tw-scale-*`, `--tw-skew-*`
- `--tw-border-style`, `--tw-opacity`, `--tw-content`
- `--tw-mask-*`, `--tw-drop-shadow-*`, `--tw-inset-shadow-*`

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Primitive colors (`--gray-*`, `--blue-*`, etc.) | 33 |
| Color tokens (`--color-token-*`) | 88 |
| Semantic colors (`--color-*` non-token) | ~90 |
| Typography tokens | 30 |
| Spacing tokens | ~25 |
| Border radius tokens | 20 |
| Shadow / blur tokens | 6 |
| Container tokens | 8 |
| Animation / transition tokens | 7 |
| Layout tokens (toolbar, hotkey, diffs, thread) | ~30 |
| VSCode theme variables (`--vscode-*`) | 403 |
| Tailwind internals (`--tw-*`) | ~70 |
| Hyperspeed / shimmer vars | 6 |
| **Total unique CSS custom properties** | **~1,136** |
| **@keyframes animations** | **12** |
| **Component CSS classes** | **~80** |
