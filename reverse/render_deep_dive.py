#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

IN_PATH = Path('/Users/colin/Projects/codex-GUI/reverse/index.json')
OUT_MD = Path('/Users/colin/Projects/codex-GUI/reverse/codex_frontend_deep_dive.md')
PKG_PATH = Path('/tmp/codex_asar/package.json')


def group_i18n(ids: list[str]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = defaultdict(list)
    for i in ids:
        prefix = i.split('.', 1)[0] if '.' in i else i
        groups[prefix].append(i)
    return {k: sorted(v) for k, v in sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))}


def pick_classes(classes: list[str]) -> list[str]:
    # Keep only the most layout-relevant class strings.
    keep = []
    pats = [
        'grid', 'flex', 'min-h', 'min-w', 'max-w', 'overflow', 'border', 'rounded',
        'bg-token', 'text-token', 'shadow', 'gap-', 'p-', 'px-', 'py-', 'h-', 'w-',
        'sticky', 'absolute', 'relative', 'inset', 'top-', 'left-', 'right-', 'bottom-',
    ]
    for c in classes:
        if any(p in c for p in pats):
            keep.append(c)
    # de-dupe preserve order
    seen = set()
    out = []
    for c in keep:
        if c in seen:
            continue
        seen.add(c)
        out.append(c)
    return out[:80]


def render_tree(tree: dict[str, dict], root: str) -> list[str]:
    # Render a simple adjacency view from child_calls.
    edges = []
    for name, info in tree.items():
        for ch in info.get('child_calls', []):
            if ch in tree:
                edges.append((name, ch))
    children = defaultdict(list)
    for a, b in edges:
        children[a].append(b)
    for k in list(children.keys()):
        children[k] = sorted(set(children[k]))

    lines = []
    lines.append(f"- Root: `{root}`")
    # Show depth-1 children and their immediate children (flat, no nested bullets)
    for ch in children.get(root, [])[:40]:
        lines.append(f"- `{root}` -> `{ch}`")
        for gch in children.get(ch, [])[:20]:
            lines.append(f"- `{ch}` -> `{gch}`")
    return lines


def main() -> int:
    data = json.loads(IN_PATH.read_text(encoding='utf-8'))
    pkg = json.loads(PKG_PATH.read_text(encoding='utf-8')) if PKG_PATH.exists() else {}

    md: list[str] = []
    md.append('# Codex Desktop 前端深度逆向（静态）')
    md.append('')
    md.append('## 版本与入口')
    md.append(f"- app.asar package: `{PKG_PATH}`")
    if pkg:
        md.append(f"- product: `{pkg.get('productName')}`")
        md.append(f"- version: `{pkg.get('version')}`")
        md.append(f"- electron: `{pkg.get('devDependencies',{}).get('electron')}`")
        md.append(f"- build flavor: `{pkg.get('codexBuildFlavor')}`")
    md.append('- renderer 入口：`/tmp/codex_asar/webview/index.html` 加载 `assets/index-NnBfxTxd.js` + `assets/index-C54D9p6n.css`')

    md.append('')
    md.append('## 路由 -> 组件')
    for route, info in data['routes'].items():
        md.append(f"- `{route}` -> `{info['component']}`")

    md.append('')
    md.append('## 设计 Token（CSS 变量）')
    css = data.get('css', {})
    md.append(f"- `--color-token-*` 数量：{len(css.get('token_vars', []))}")
    md.append('- 关键布局变量（抽样）:')
    for v in css.get('layout_vars', [])[:30]:
        md.append(f"- `{v}`")
    md.append('- 关键结构选择器（抽样）:')
    for s in css.get('data_selectors', [])[:25]:
        md.append(f"- `{s}`")
    md.append('- Command Palette（cmdk）选择器:')
    for s in css.get('cmdk_selectors', [])[:20]:
        md.append(f"- `{s}`")

    md.append('')
    md.append('## 页面级还原线索（按路由）')
    for route, page in data['routes'].items():
        if not page.get('found'):
            md.append(f"### `{route}`")
            md.append(f"- root component: `{page['component']}`（未找到定义）")
            md.append('')
            continue

        root = page['component']
        ids = page.get('i18n_ids', [])
        classes = page.get('classnames', [])
        tree = page.get('tree', {})

        md.append(f"### `{route}`")
        md.append(f"- root component: `{root}`")
        md.append(f"- 覆盖到的组件节点数（BFS<=3）：{len(tree)}")
        md.append(f"- i18n keys：{len(ids)}")
        md.append(f"- className 字符串：{len(classes)}")

        md.append('- 组件调用图（深度 2 展开，扁平列出）：')
        md.extend(render_tree(tree, root))

        md.append('- i18n keys（按 prefix 聚类，展示前 8 组）：')
        groups = group_i18n(ids)
        for prefix, items in list(groups.items())[:8]:
            md.append(f"- `{prefix}` ({len(items)}): {', '.join(items[:12])}{'…' if len(items)>12 else ''}")

        md.append('- layout/样式线索（className 抽样）：')
        for c in pick_classes(classes):
            md.append(f"- `{c}`")

        # Also include per-component excerpts for the top few nodes that contain most ids.
        scored = []
        for name, info in tree.items():
            scored.append((len(info.get('i18n_ids', [])), len(info.get('classnames', [])), name))
        scored.sort(reverse=True)
        md.append('- 关键组件切片（按 i18n 数量排序，展示前 5 个的 excerpt）：')
        for _, _, name in scored[:5]:
            ex = tree[name].get('excerpt')
            if not ex:
                continue
            ex = re.sub(r'\s+', ' ', ex).strip()
            md.append(f"- `{name}`: `{ex[:280]}{'…' if len(ex)>280 else ''}`")

        md.append('')

    md.append('## 导航触发点（粗提取）')
    md.append('说明：这里是从 bundle 里按字符串/正则粗扫得到的，后续可继续精确到“事件源组件 -> handler -> route”。')
    triggers = data.get('nav_triggers', [])
    # Focus on ipc_event triggers.
    ipc = [t for t in triggers if t.get('kind') == 'ipc_event:navigate-to-route']
    md.append(f"- 发现 navigate-to-route 相关窗口：{len(ipc)}")
    for t in ipc[:8]:
        md.append(f"- offset `{t['offset']}` routes_in_window: {', '.join(t.get('routes_in_window', [])[:12])}")

    OUT_MD.write_text('\n'.join(md) + '\n', encoding='utf-8')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
