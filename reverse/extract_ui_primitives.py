#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

CSS_PATH = Path('/tmp/codex_asar/webview/assets/index-C54D9p6n.css')
OUT_MD = Path('/Users/colin/Projects/codex-GUI/reverse/ui_primitives.md')

PRIMITIVES = [
    '.toast-root',
    '.alert-root',
    '.codex-dialog',
    '.codex-dialog-overlay',
    '[cmdk-root]',
    '[cmdk-dialog]',
    '[cmdk-item]',
    '[cmdk-list]',
    '[cmdk-input]',
    '[cmdk-empty]',
    '.command-menu-dialog',
    '.accordion-trigger',
    '.accordion-content',
    '.file-tree-root',
    '.file-tree-row',
    '.request-input-panel__inline-freeform',
    '.home-use-case-card',
    '.home-use-case-gallery',
    '.composer-footer',
    '.codex-thread-find-active',
    '.codex-thread-find-match',
]


def extract_rule_blocks(css: str, selector: str, max_blocks: int = 3) -> list[str]:
    # Very naive: find occurrences of selector and then capture until next '}'
    out = []
    idx = 0
    while len(out) < max_blocks:
        pos = css.find(selector, idx)
        if pos == -1:
            break
        brace = css.find('{', pos)
        if brace == -1:
            break
        end = css.find('}', brace)
        if end == -1:
            break
        block = css[pos:end+1]
        out.append(block)
        idx = end + 1
    return out


def main() -> int:
    css = CSS_PATH.read_text(encoding='utf-8')

    keyframes = sorted(set(re.findall(r'@keyframes\s+([a-zA-Z0-9_-]+)', css)))

    md = []
    md.append('# Codex UI Primitives（来自 CSS 的静态线索）')
    md.append('')
    md.append(f'- CSS: `{CSS_PATH}`')
    md.append(f'- keyframes 数量：{len(keyframes)}')
    md.append('')
    md.append('## Keyframes（抽样）')
    for k in keyframes[:40]:
        md.append(f'- `{k}`')

    md.append('')
    md.append('## 关键 Primitive 选择器与规则片段')
    for sel in PRIMITIVES:
        blocks = extract_rule_blocks(css, sel)
        if not blocks:
            continue
        md.append(f'### `{sel}`')
        for b in blocks:
            # Keep short, single paragraph.
            s = re.sub(r'\s+', ' ', b).strip()
            md.append(f'- `{s[:320]}{"…" if len(s)>320 else ""}`')
        md.append('')

    OUT_MD.write_text('\n'.join(md) + '\n', encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
