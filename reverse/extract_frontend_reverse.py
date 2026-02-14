#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

JS_PATH = Path("/tmp/codex_asar/webview/assets/index-NnBfxTxd.js")
CSS_PATH = Path("/tmp/codex_asar/webview/assets/index-C54D9p6n.css")
OUT_DIR = Path("/Users/colin/Projects/codex-GUI/reverse")

# Route component aliases discovered earlier (from IBe route tree).
ROUTES = {
    "/debug": "LEt",
    "/login": "agn",
    "/welcome": "Sgn",
    "/select-workspace": "lgn",
    "/skills": "c6n",
    "/diff": "IJt",
    "/plan-summary": "B4n",
    "/file-preview": "BJt",
    "/": "yfn",
    "/first-run": "I5n",
    "/local/:conversationId": "R4n",
    "/thread-overlay/:conversationId": "S6n",
    "/inbox": "mmn",
    "/inbox/:itemId": "oge",
    "/worktree-init-v2/:pendingWorktreeId": "E6n",
    "/announcement": "E3t",
    "/remote/:taskId": "y5n",
    "/settings": "k5n",
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def find_function_start(js: str, name: str) -> Optional[int]:
    # Handles: function NAME( ... ) { ... }
    # Also sometimes: const NAME = (...) => { ... }
    pats = [
        rf"function\s+{re.escape(name)}\s*\(",
        rf"const\s+{re.escape(name)}\s*=",
        rf"let\s+{re.escape(name)}\s*=",
        rf"var\s+{re.escape(name)}\s*=",
    ]
    for pat in pats:
        m = re.search(pat, js)
        if m:
            return m.start()
    return None


def slice_brace_block(js: str, start: int) -> Tuple[str, int, int]:
    """Given an index at 'function NAME(' or 'const NAME =', return source slice for the following block.

    We look for the first '{' after start, then brace-match.
    """
    brace_open = js.find("{", start)
    if brace_open == -1:
        raise ValueError("no '{' found")
    i = brace_open
    depth = 0
    in_str: Optional[str] = None
    esc = False
    while i < len(js):
        ch = js[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == in_str:
                in_str = None
            i += 1
            continue
        if ch in ('"', "'", "`"):
            in_str = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                return js[start:end], start, end
        i += 1
    raise ValueError("unterminated block")


def extract_ids(src: str) -> List[str]:
    return sorted(set(re.findall(r'id:\"([^\"]+)\"', src)))


def extract_classnames(src: str) -> List[str]:
    out = set()
    for m in re.finditer(r'className:\"([^\"]+)\"', src):
        val = m.group(1)
        if val:
            out.add(val)
    # Also className built by Ie("...", ...) - capture first arg strings.
    for m in re.finditer(r'\bIe\(\"([^\"]+)\"', src):
        out.add(m.group(1))
    return sorted(out)


def extract_child_calls(src: str) -> List[str]:
    # Heuristic: h.jsx(X, { ... }) or h.jsxs(X, ...)
    calls = set(re.findall(r'\bh\.jsx\(([_$A-Za-z][\w$]*)\b', src))
    calls |= set(re.findall(r'\bh\.jsxs\(([_$A-Za-z][\w$]*)\b', src))
    # Filter out intrinsic tags ("div" etc.) and common variables.
    intrinsic = {
        "div",
        "span",
        "h1",
        "h2",
        "h3",
        "p",
        "button",
        "a",
        "img",
        "svg",
        "path",
        "input",
        "textarea",
        "pre",
        "code",
        "section",
        "header",
        "footer",
        "main",
        "aside",
        "label",
        "ul",
        "ol",
        "li",
        "table",
        "thead",
        "tbody",
        "tr",
        "td",
        "th",
        "form",
    }
    filtered = [c for c in calls if c not in intrinsic]
    return sorted(filtered)


def extract_usehooks(src: str) -> List[str]:
    # Very rough: M.useX, and bare identifiers ending with () assigned via const {...}=X()
    hooks = set(re.findall(r'\bM\.use([A-Z][A-Za-z0-9_]*)\b', src))
    # custom hooks often look like K8(...), v6(), ht() etc. We'll capture calls assigned via const {...} = NAME(...)
    for m in re.finditer(r'\bconst\s+\{[^}]+\}\s*=\s*([A-Za-z_$][\w$]*)\(', src):
        hooks.add(m.group(1))
    return sorted(hooks)


def make_excerpt(src: str, max_len: int = 1600) -> str:
    # Provide a short excerpt for human reading (avoid dumping huge proprietary code).
    # We keep the first N chars; this is not verbatim-safe long quote, but this is local analysis output.
    # Still, keep it short.
    s = src.replace("\n", " ")
    return s[:max_len] + ("…" if len(s) > max_len else "")


def extract_nav_triggers(js: str) -> List[dict]:
    # Look for 'navigate-to-route' and for typical router navigate calls like n("/path") where n is from useNavigate.
    out: List[dict] = []
    for m in re.finditer(r'"navigate-to-route"', js):
        start = max(0, m.start() - 400)
        end = min(len(js), m.end() + 800)
        blob = js[start:end]
        routes = sorted(set(re.findall(r'\"(/[^\"]*)\"', blob)))
        out.append({
            "kind": "ipc_event:navigate-to-route",
            "offset": m.start(),
            "routes_in_window": routes[:50],
            "excerpt": make_excerpt(blob, 800),
        })

    # Heuristic for direct router navigations: look for "useNavigate" token 'eo()' etc is hard.
    # We'll scan for path strings near '.navigate(' and 'pathname'.
    for pat, kind in [
        (r'\.navigate\(\"(/[^\"]+)\"', 'router:navigate'),
        (r'\bn\(\"(/[^\"]+)\"', 'router:call(n)'),
        (r'\bnavigate\(\"(/[^\"]+)\"', 'router:navigate_ident'),
    ]:
        for m in re.finditer(pat, js):
            out.append({"kind": kind, "offset": m.start(), "route": m.group(1)})

    # Dedup
    seen = set()
    uniq = []
    for item in out:
        key = (item.get("kind"), item.get("offset"), item.get("route"))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(item)
    return uniq


def extract_css_tokens(css: str) -> dict:
    token_vars = sorted(set(re.findall(r'--color-token-[a-zA-Z0-9_-]+', css)))
    misc_vars = sorted(set(re.findall(r'--(?:diffs|codex|conversation|height-toolbar|padding-[a-zA-Z0-9_-]+)[a-zA-Z0-9_-]*', css)))
    selectors = sorted(set(re.findall(r'\.[a-zA-Z0-9_-]+\[data-[^\]]+\]', css)))
    cmdk = sorted(set(re.findall(r'\[(?:cmdk-[^\]]+)\]', css)))
    return {
        "token_vars": token_vars,
        "layout_vars": misc_vars,
        "data_selectors": selectors[:200],
        "cmdk_selectors": cmdk,
    }


@dataclass
class ComponentInfo:
    name: str
    found: bool
    byte_range: Optional[Tuple[int, int]] = None
    i18n_ids: Optional[List[str]] = None
    classnames: Optional[List[str]] = None
    child_calls: Optional[List[str]] = None
    hooks: Optional[List[str]] = None
    excerpt: Optional[str] = None


def looks_like_app_component(name: str) -> bool:
    # Heuristic: app components here tend to be short-ish identifiers (often with digits).
    # Exclude obvious globals/React/etc.
    if name in {"M", "h", "Z", "Ie", "ht", "Cr", "eo"}:
        return False
    if name.startswith("$"):
        return False
    if len(name) < 3 or len(name) > 6:
        return False
    if name[0].isdigit():
        return False
    return True


def build_component_extractor(js: str):
    cache: Dict[str, ComponentInfo] = {}

    def get(name: str) -> ComponentInfo:
        if name in cache:
            return cache[name]
        start = find_function_start(js, name)
        if start is None:
            info = ComponentInfo(name=name, found=False)
            cache[name] = info
            return info
        try:
            src, s, e = slice_brace_block(js, start)
        except Exception:
            info = ComponentInfo(name=name, found=False)
            cache[name] = info
            return info
        info = ComponentInfo(
            name=name,
            found=True,
            byte_range=(s, e),
            i18n_ids=extract_ids(src),
            classnames=extract_classnames(src),
            child_calls=extract_child_calls(src),
            hooks=extract_usehooks(src),
            excerpt=make_excerpt(src, 1200),
        )
        cache[name] = info
        return info

    return get


def collect_component_tree(get_info, root: str, max_depth: int = 3, max_nodes: int = 200) -> Dict[str, dict]:
    # BFS with pruning.
    out: Dict[str, dict] = {}
    q: List[Tuple[str, int]] = [(root, 0)]
    seen = set()
    while q and len(out) < max_nodes:
        name, depth = q.pop(0)
        if name in seen:
            continue
        seen.add(name)
        if not looks_like_app_component(name) and name != root:
            continue
        info = get_info(name)
        if not info.found:
            continue
        out[name] = {
            "byte_range": list(info.byte_range) if info.byte_range else None,
            "i18n_ids": info.i18n_ids or [],
            "classnames": (info.classnames or [])[:400],
            "child_calls": (info.child_calls or [])[:400],
            "hooks": (info.hooks or [])[:200],
            "excerpt": info.excerpt,
        }
        if depth >= max_depth:
            continue
        for child in info.child_calls or []:
            if child in seen:
                continue
            if looks_like_app_component(child):
                q.append((child, depth + 1))
    return out


def main() -> int:
    if not JS_PATH.exists():
        raise SystemExit(f"missing {JS_PATH}")
    js = read_text(JS_PATH)
    css = read_text(CSS_PATH) if CSS_PATH.exists() else ""

    get_info = build_component_extractor(js)

    pages: Dict[str, dict] = {}
    for route, comp in ROUTES.items():
        root_info = get_info(comp)
        if not root_info.found:
            pages[route] = {"component": comp, "found": False}
            continue
        tree = collect_component_tree(get_info, comp, max_depth=3)
        all_ids = sorted({i for c in tree.values() for i in c.get("i18n_ids", [])})
        all_classes = sorted({cn for c in tree.values() for cn in c.get("classnames", [])})
        all_children = sorted({ch for c in tree.values() for ch in c.get("child_calls", [])})
        pages[route] = {
            "component": comp,
            "found": True,
            "byte_range": list(root_info.byte_range) if root_info.byte_range else None,
            "i18n_ids": all_ids,
            "classnames": all_classes[:800],
            "child_calls": all_children[:800],
            "tree": tree,
        }

    out = {
        "inputs": {
            "js": str(JS_PATH),
            "css": str(CSS_PATH),
        },
        "routes": pages,
        "nav_triggers": extract_nav_triggers(js),
        "css": extract_css_tokens(css) if css else {},
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "index.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
