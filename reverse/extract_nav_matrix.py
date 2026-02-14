#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

JS_PATH = Path('/tmp/codex_asar/webview/assets/index-NnBfxTxd.js')
OUT_MD = Path('/Users/colin/Projects/codex-GUI/reverse/nav_matrix.md')


def context_snippet(js: str, pos: int, span: int = 260) -> str:
    s = js[max(0, pos - span):pos + span]
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def infer_handler_name(js: str, pos: int) -> str | None:
    # Look backwards for 'const NAME=' near this occurrence.
    back = js[max(0, pos - 300):pos]
    m = re.search(r'([A-Za-z_$][\w$]{1,20})=\(\)=>\{\$t\.dispatchHostMessage\(\{type:\"navigate-to-route\"', back)
    if m:
        return m.group(1)
    m = re.search(r'([A-Za-z_$][\w$]{1,20})=\(\)=>\{if\(', back)
    if m:
        return m.group(1)
    return None


def main() -> int:
    js = JS_PATH.read_text(encoding='utf-8')

    pat = re.compile(r'\$t\.dispatchHostMessage\(\{type:\"navigate-to-route\",path:')
    matches = [m.start() for m in pat.finditer(js)]

    rows = []
    for pos in matches:
        handler = infer_handler_name(js, pos)
        snippet = context_snippet(js, pos)
        # Try to extract immediate string path.
        m = re.search(r'path:(\"[^\"]+\"|`[^`]+`)', snippet)
        path = m.group(1) if m else None
        rows.append((pos, handler, path, snippet))

    # Also include router-side navigations used in the automations directive panel.
    # (ie("/inbox?..."))
    for m in re.finditer(r'\bie\(\"(/inbox\?[^\"]+)\"\)', js):
        pos = m.start()
        rows.append((pos, 'router.navigate(ie)', m.group(1), context_snippet(js, pos)))

    rows.sort(key=lambda r: r[0])

    md = []
    md.append('# navigate-to-route / 页面跳转矩阵（静态提取）')
    md.append('')
    md.append(f'- bundle: `{JS_PATH}`')
    md.append(f'- dispatchHostMessage(navigate-to-route) 命中：{len(matches)}')
    md.append('')

    md.append('## 触发点 -> 路由（按出现顺序）')
    for pos, handler, path, snippet in rows:
        h = handler or '(unknown)'
        p = path or '(unknown)'
        md.append(f'- offset `{pos}` handler `{h}` -> path `{p}`')
        md.append(f'- context: `{snippet[:360]}{"…" if len(snippet)>360 else ""}`')

    OUT_MD.write_text('\n'.join(md) + '\n', encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
