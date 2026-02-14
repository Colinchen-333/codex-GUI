# Codex UI Primitives（来自 CSS 的静态线索）

- CSS: `/tmp/codex_asar/webview/assets/index-C54D9p6n.css`
- keyframes 数量：12

## Keyframes（抽样）
- `_loading-bar-slide_1g9nv_1`
- `codex-dialog-enter`
- `codex-dialog-overlay`
- `edge-fade`
- `edge-fade-top`
- `loading-shimmer`
- `pulse`
- `spin`
- `sync-dot-pass-down`
- `sync-dot-pass-up`
- `toast-close`
- `toast-open`

## 关键 Primitive 选择器与规则片段
### `.toast-root`
- `.toast-root{display:flex;flex-direction:column;align-items:center;transition:all .24s cubic-bezier(0,0,.2,1);animation:toast-open .25s cubic-bezier(.175,.885,.32,1) both}`
- `.toast-root[data-state=entering],.toast-root[data-state=entered]{animation:toast-open .25s cubic-bezier(.175,.885,.32,1) both}`
- `.toast-root[data-state=exiting]{animation:toast-close .25s cubic-bezier(.4,0,1,1) both}`

### `.alert-root`
- `.alert-root{flex-shrink:0;pointer-events:all;box-shadow:0 4px 12px #0000001a;font-size:13px;line-height:1.5}`

### `.codex-dialog`
- `.codex-dialog{animation:codex-dialog-enter var(--transition-duration-relaxed) var(--cubic-enter);transform-origin:center top;will-change:transform,opacity}`
- `.codex-dialog{animation:none}`
- `.codex-dialog-overlay{animation:codex-dialog-overlay var(--transition-duration-relaxed) var(--cubic-enter);will-change:opacity}`

### `.codex-dialog-overlay`
- `.codex-dialog-overlay{animation:codex-dialog-overlay var(--transition-duration-relaxed) var(--cubic-enter);will-change:opacity}`
- `.codex-dialog-overlay{animation:none}`

### `[cmdk-root]`
- `[cmdk-root],[data-cmdk-root]{min-width:100%;display:flex;flex-direction:column;gap:var(--spacing);background-color:var(--color-token-dropdown-background);background-color:color-mix(in oklab,var(--color-token-dropdown-background) 95%,transparent);color:var(--color-token-foreground);border:1px solid var(--color-token-bor…`
- `[cmdk-root]{box-shadow:var(--shadow-2xl);background-color:var(--color-token-dropdown-background);-webkit-backdrop-filter:none;backdrop-filter:none}`
- `[cmdk-root],[data-codex-window-type=electron] [data-cmdk-root],[data-codex-window-type=browser] [cmdk-root],[data-codex-window-type=browser] [data-cmdk-root]{font-size:var(--text-base)}`

### `[cmdk-dialog]`
- `[cmdk-dialog]{outline:none}`
- `[cmdk-dialog]:focus-visible{outline:none}`

### `[cmdk-item]`
- `[cmdk-item]{content-visibility:auto;display:flex;flex-direction:row;align-items:center;width:100%;border-radius:var(--radius-lg);cursor:pointer;color:var(--color-token-foreground);padding:var(--padding-row-y) var(--padding-row-x);min-height:calc(var(--spacing) * 6);outline:none;-webkit-user-select:none;user-select:none…`
- `[cmdk-item][aria-disabled=true],[cmdk-item][data-disabled=true]{cursor:default;opacity:.25}`
- `[cmdk-item]:hover:not([aria-disabled=true]){background-color:var(--color-token-list-hover-background);opacity:1}`

### `[cmdk-list]`
- `[cmdk-list]{max-height:min(300px,var(--cmdk-list-height, 300px));overflow-y:auto;scrollbar-width:none;overscroll-behavior:contain;display:flex;flex-direction:column;gap:var(--spacing);transition:max-height .1s ease}`
- `[cmdk-list]:focus-visible{outline:none}`
- `[cmdk-list]) [cmdk-item]:last-of-type{border-bottom-left-radius:calc(var(--radius-3xl) - var(--spacing));border-bottom-right-radius:calc(var(--radius-3xl) - var(--spacing))}`

### `[cmdk-input]`
- `[cmdk-input]{padding:calc(var(--spacing) * 1.5) calc(var(--spacing) * 2.5)}`
- `[cmdk-input]:focus-visible{outline:none}`

### `[cmdk-empty]`
- `[cmdk-empty],[data-cmdk-empty]{display:flex;align-items:center;padding:calc(var(--spacing) * 1.5) calc(var(--spacing) * 2.5);min-height:calc(var(--spacing) * 8);line-height:1.4;color:var(--color-token-description-foreground);white-space:pre-wrap;text-align:center}`

### `.command-menu-dialog`
- `.command-menu-dialog [cmdk-root]{box-shadow:var(--shadow-2xl);background-color:var(--color-token-dropdown-background);-webkit-backdrop-filter:none;backdrop-filter:none}`

### `.accordion-trigger`
- `.accordion-trigger[data-state=open] .folder-icon-chevron{transition:transform .12s ease}`
- `.accordion-trigger:hover .folder-icon-default{opacity:0}`
- `.accordion-trigger:hover .folder-icon-chevron{opacity:1}`

### `.accordion-content`
- `.accordion-content{overflow:hidden}`
- `.accordion-content[data-state=open],.accordion-content[data-state=closed]{animation:none}`

### `.file-tree-root`
- `.file-tree-root{contain:layout paint style}`

### `.file-tree-row`
- `.file-tree-row{content-visibility:auto;contain-intrinsic-size:28px}`

### `.request-input-panel__inline-freeform`
- `.request-input-panel__inline-freeform:focus,.request-input-panel__inline-freeform:focus-visible{box-shadow:none;border-color:#0000;outline:none}`

### `.home-use-case-card`
- `.home-use-case-card,.home-use-case-header{opacity:0;transition:opacity var(--use-case-transition)ease,transform var(--use-case-transition)ease;will-change:opacity,transform;transform:translateY(8px)}`
- `.home-use-case-card,.home-use-case-gallery[data-state=open] .home-use-case-header{opacity:1;transform:translateY(0)}`
- `.home-use-case-card,.home-use-case-gallery[data-state=closing] .home-use-case-header{opacity:0;transform:translateY(8px)}`

### `.home-use-case-gallery`
- `.home-use-case-gallery{--use-case-transition:.22s}`
- `.home-use-case-gallery[data-state=open] .home-use-case-card,.home-use-case-gallery[data-state=open] .home-use-case-header{opacity:1;transform:translateY(0)}`
- `.home-use-case-gallery[data-state=closing] .home-use-case-card,.home-use-case-gallery[data-state=closing] .home-use-case-header{opacity:0;transform:translateY(8px)}`

### `.composer-footer`
- `.composer-footer{container:composer-footer/inline-size}`
- `.composer-footer__label--sm{display:none}`
- `.composer-footer__label--xs{display:none}`

### `.codex-thread-find-active`
- `.codex-thread-find-active{background-color:var(--vscode-charts-orange)}`

### `.codex-thread-find-match`
- `.codex-thread-find-match{background-color:var(--vscode-charts-yellow);color:var(--color-token-foreground);border-radius:var(--radius-2xs);font:inherit;line-height:inherit;letter-spacing:inherit;word-spacing:inherit;vertical-align:baseline;border:0;margin:0;padding:0}`

