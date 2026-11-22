#!/usr/bin/env python3
"""
site_build.py — turns content/ into the static blog pages.

    content/posts.json            manifest (order within a type = numbering)
    content/essays/<slug>.md      essay bodies (Markdown)
    content/snippets/<slug>.md    snippet bodies (Markdown)

Outputs (overwritten on every build):
    blog/<slug>.html              essays
    blog/snippets/<slug>.html     snippets
    blog/index.html               list of everything
    index.html                    only the region between <!-- writings:start/end -->

Run `python3 site_build.py` to rebuild everything, or let admin_server.py call
it on every save. No third-party dependencies.
"""
import html
import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, "content")
MANIFEST = os.path.join(CONTENT, "posts.json")

HOME_ESSAYS = 2     # how many essays the Writings tile shows
HOME_SNIPPETS = 3   # how many snippets the Writings tile shows

TYPES = {
    "essay":   {"dir": "essays",   "out": "blog",          "root": "../",    "label": "Essay",   "index_anchor": ""},
    "snippet": {"dir": "snippets", "out": "blog/snippets", "root": "../../", "label": "Snippet", "index_anchor": "#snippets"},
}

FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;'
         '0,9..144,600;1,9..144,300;1,9..144,600&family=Inter:wght@400;500&display=swap" rel="stylesheet" />')


# ----------------------------------------------------------------------------
# Manifest
# ----------------------------------------------------------------------------
def load_manifest():
    if not os.path.exists(MANIFEST):
        return {"posts": []}
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)


def save_manifest(m):
    os.makedirs(CONTENT, exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(m, f, indent=2, ensure_ascii=False)
        f.write("\n")


def md_path(post):
    return os.path.join(CONTENT, TYPES[post["type"]]["dir"], post["slug"] + ".md")


def html_path(post):
    return os.path.join(ROOT, TYPES[post["type"]]["out"], post["slug"] + ".html")


def href_from_home(post):
    return f'{TYPES[post["type"]]["out"]}/{post["slug"]}.html'


def read_body(post):
    p = md_path(post)
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return f.read()
    return ""


def write_body(post, body):
    p = md_path(post)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(body)


def by_type(m, t):
    return [p for p in m["posts"] if p["type"] == t]


def slugify(title):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return s or "untitled"


# ----------------------------------------------------------------------------
# Markdown (small, dependency-free). Supports: headings, paragraphs, **bold**,
# *em*, _em_, `code`, ``` fences, [links](url), ![images](src), > quotes,
# - / 1. lists, --- rules, "--" -> em dash, raw HTML lines pass through.
# ----------------------------------------------------------------------------
def md_inline(s):
    s = html.escape(s, quote=False)
    out = []
    for part in re.split(r"(`[^`]+`)", s):
        if len(part) > 2 and part.startswith("`") and part.endswith("`"):
            out.append("<code>" + part[1:-1] + "</code>")
            continue
        part = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", r'<img src="\2" alt="\1" loading="lazy" />', part)
        part = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', part)
        part = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", part)
        part = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"<em>\1</em>", part)
        part = re.sub(r"(?<![A-Za-z0-9])_(?!\s)(.+?)(?<!\s)_(?![A-Za-z0-9])", r"<em>\1</em>", part)
        part = part.replace("--", "&mdash;")
        out.append(part)
    return "".join(out)


def md_to_html(src):
    lines = src.replace("\r\n", "\n").split("\n")
    out, para, i = [], [], 0

    def flush():
        if para:
            out.append("<p>" + md_inline(" ".join(l.strip() for l in para)) + "</p>")
            para.clear()

    while i < len(lines):
        line = lines[i]
        if not line.strip():
            flush(); i += 1; continue
        if line.startswith("```"):
            flush(); lang = line[3:].strip(); buf = []; i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i]); i += 1
            i += 1
            cls = f' class="language-{html.escape(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{html.escape(chr(10).join(buf))}</code></pre>")
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            flush(); level = min(len(m.group(1)) + 1, 4)  # '#' -> h2 (h1 is the title)
            out.append(f"<h{level}>{md_inline(m.group(2).strip())}</h{level}>"); i += 1; continue
        if re.match(r"^(-{3,}|\*{3,}|_{3,})\s*$", line):
            flush(); out.append("<hr />"); i += 1; continue
        if line.startswith(">"):
            flush(); buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i][1:].lstrip()); i += 1
            out.append("<blockquote>" + md_to_html("\n".join(buf)) + "</blockquote>"); continue
        m = re.match(r"^\s*([-*+]|\d+\.)\s+(.*)$", line)
        if m:
            flush(); ordered = m.group(1)[0].isdigit(); items = []
            pat = r"^\s*\d+\.\s+(.*)$" if ordered else r"^\s*[-*+]\s+(.*)$"
            while i < len(lines):
                mm = re.match(pat, lines[i])
                if mm:
                    items.append(mm.group(1)); i += 1
                elif items and lines[i].startswith("  ") and lines[i].strip():
                    items[-1] += " " + lines[i].strip(); i += 1
                else:
                    break
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{md_inline(it)}</li>" for it in items) + f"</{tag}>"); continue
        if line.lstrip().startswith("<"):
            flush(); out.append(line); i += 1; continue
        para.append(line); i += 1
    flush()
    return "\n".join(out)


# ----------------------------------------------------------------------------
# Templates
# ----------------------------------------------------------------------------
def shell(root, title, description, main_html):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{html.escape(title)} — Vaibhav Tripathi</title>
  <meta name="description" content="{html.escape(description, quote=True)}" />
  <meta name="theme-color" content="#f6f2ea" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  {FONTS}
  <link rel="stylesheet" href="{root}style.css" />
  <link rel="stylesheet" href="{root}post.css" />
</head>
<body>
  <header class="site-header">
    <nav class="nav">
      <a href="{root}" class="brand">Vaibhav Tripathi</a>
      <ul class="nav-links">
        <li><a href="{root}#personal">Personal</a></li>
        <li><a href="{root}blog/">Blog</a></li>
        <li><a href="{root}#projects">Projects</a></li>
        <li><a href="{root}#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <main>
{main_html}
  </main>

  <footer class="site-footer">
    <p>&copy; <span id="year"></span> Vaibhav Tripathi.</p>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
  </script>
</body>
</html>
'''


def title_html(post):
    return post.get("title_html") or html.escape(post["title"])


def nice_date(iso):
    try:
        d = date.fromisoformat(iso)
        return d.strftime("%-d %b %Y")
    except Exception:
        return ""


def nav_cell(post, cls, label):
    if post is None:
        return (f'<span class="{cls}">\n          <p class="label">{label}</p>\n'
                f'          <h3 class="serif" style="color: var(--muted)">&mdash;</h3>\n        </span>')
    return (f'<a class="{cls}" href="{post["slug"]}.html">\n          <p class="label">{label}</p>\n'
            f'          <h3 class="serif">{html.escape(post["title"])}</h3>\n        </a>')


def render_post(post, num, prev_post, next_post, body_md, root=None):
    t = TYPES[post["type"]]
    root = t["root"] if root is None else root
    is_snippet = post["type"] == "snippet"
    draft = post.get("status", "draft") != "published"

    meta = []
    if is_snippet:
        meta.append('<span class="kind">Snippet</span>')
    meta.append(f'<span class="num">No. {num:02d}</span>')
    if not draft and post.get("date"):
        meta.append(f'<span class="date">{nice_date(post["date"])}</span>')
    if draft:
        meta.append('<span class="draft">Draft</span>')

    body = md_to_html(body_md).strip()
    if not body:
        kind = "snippet" if is_snippet else "essay"
        body = f'<p class="placeholder">This {kind} is still being written. Check back soon.</p>'

    lede = f'\n      <p class="lede">{md_inline(post["lede"])}</p>' if post.get("lede") else ""
    back_label = "All snippets" if is_snippet else "All writing"
    back_href = ("../" if is_snippet else "./") if root == t["root"] else f'{root}blog/'
    back_href += t["index_anchor"]

    article = f'''    <article class="post{' post-snippet' if is_snippet else ''}">
      <p class="post-meta">{"".join(meta)}</p>
      <h1 class="serif">{title_html(post)}</h1>{lede}
      <hr />
      <div class="post-body">
{body}
      </div>

      <nav class="post-nav" aria-label="More {'snippets' if is_snippet else 'posts'}">
        {nav_cell(prev_post, "", "Previous")}
        {nav_cell(next_post, "next", "Next")}
      </nav>
      <p class="post-back"><a class="btn btn-text" href="{back_href}">{back_label}</a></p>
    </article>'''

    desc = post.get("lede") or (f"A {t['label'].lower()} by Vaibhav Tripathi.")
    return shell(root, post["title"], desc, article)


def render_index(m):
    def rows(posts, snippet):
        out = []
        for i, p in enumerate(posts, 1):
            num = "&sect;" if snippet else f"{i:02d}"
            href = ("snippets/" if snippet else "") + p["slug"] + ".html"
            badge = '\n            <span class="draft">Draft</span>' if p.get("status") != "published" else ""
            out.append(f'''        <li>
          <a href="{href}">
            <span class="num">{num}</span>
            <h2 class="serif">{html.escape(p["title"])}</h2>{badge}
          </a>
        </li>''')
        return "\n".join(out)

    essays, snippets = by_type(m, "essay"), by_type(m, "snippet")
    main = f'''    <section class="post">
      <p class="label">Writing</p>
      <h1 class="serif">Essays &amp; <em>notes</em>.</h1>
      <ol class="post-index post-index-essays">
{rows(essays, False)}
      </ol>

      <h2 id="snippets" class="section-title serif"><span class="label">Snippets</span>Bite-sized <em>pieces</em>.</h2>
      <ol class="post-index post-index-snippets">
{rows(snippets, True)}
      </ol>
    </section>'''
    return shell("../", "Blog", "Essays and notes by Vaibhav Tripathi.", main)


def home_picks(posts, limit):
    """Pinned first (manifest order), then newest published, then newest drafts."""
    pinned = [p for p in posts if p.get("pinned")]
    rest = [p for p in posts if not p.get("pinned")]
    rest.sort(key=lambda p: (p.get("status") == "published", p.get("date", "")), reverse=True)
    return (pinned + rest)[:limit]


def render_home_lists(m):
    essays = home_picks(by_type(m, "essay"), HOME_ESSAYS)
    snippets = home_picks(by_type(m, "snippet"), HOME_SNIPPETS)
    all_essays = by_type(m, "essay")
    e_rows = "\n".join(
        f'''          <li>
            <a href="{href_from_home(p)}">
              <span class="num">{all_essays.index(p) + 1:02d}</span>
              <h3 class="serif">{html.escape(p["title"])}</h3>
            </a>
          </li>''' for p in essays)
    s_rows = "\n".join(
        f'          <li><a href="{href_from_home(p)}"><span class="num">&sect;</span>'
        f'<h3 class="serif">{html.escape(p["title"])}</h3></a></li>' for p in snippets)
    return f'''        <p class="sub-label">Essays</p>
        <ol class="blog-list blog-essays">
{e_rows}
        </ol>

        <p class="sub-label">Snippets</p>
        <ol class="blog-list blog-snippets">
{s_rows}
        </ol>'''


def excerpt(post, body_md, limit=150):
    """Lede if set, else the first paragraph of the body as plain text."""
    if post.get("lede"):
        return post["lede"]
    for block in re.split(r"\n\s*\n", body_md.strip()):
        line = block.strip()
        if not line or line.startswith(("#", ">", "-", "*", "```", "<", "!", "1.")):
            continue
        text = re.sub(r"[*_`\[\]]|\(([^)]*)\)", "", line).replace("--", "—")
        text = re.sub(r"\s+", " ", text)
        return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"
    return ""


def render_featured(m):
    post = next((p for p in m["posts"] if p.get("featured")), None)
    if not post:
        return ""
    t = TYPES[post["type"]]
    num = by_type(m, post["type"]).index(post) + 1
    blurb = excerpt(post, read_body(post)) or f"A {t['label'].lower()} about to be written."
    meta = f'<span>{t["label"]}</span><span>No. {num:02d}</span>'
    if post.get("status") == "published" and post.get("date"):
        meta += f'<span>{nice_date(post["date"])}</span>'
    return f'''      <a class="tile proj t-p1 t-featured" href="{href_from_home(post)}">
        <span class="num">&sect;</span>
        <p class="label">Featured</p>
        <h3 class="serif">{title_html(post)}</h3>
        <p>{html.escape(blurb)}</p>
        <div class="tags">{meta}</div>
      </a>'''


def replace_region(src, name, inner, indent):
    start, end = f"<!-- {name}:start -->", f"<!-- {name}:end -->"
    if start not in src or end not in src:
        return src, False
    a, b = src.index(start) + len(start), src.index(end)
    return src[:a] + "\n" + inner + ("\n" if inner else "") + indent + src[b:], True


# ----------------------------------------------------------------------------
# Build
# ----------------------------------------------------------------------------
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def build(m=None, verbose=False):
    m = m or load_manifest()
    written = []
    for t in TYPES:
        posts = by_type(m, t)
        for i, p in enumerate(posts):
            prev_p = posts[i - 1] if i > 0 else None
            next_p = posts[i + 1] if i + 1 < len(posts) else None
            write(html_path(p), render_post(p, i + 1, prev_p, next_p, read_body(p)))
            written.append(html_path(p))

    write(os.path.join(ROOT, "blog", "index.html"), render_index(m))
    written.append("blog/index.html")

    idx = os.path.join(ROOT, "index.html")
    with open(idx, encoding="utf-8") as f:
        src = f.read()
    src, ok1 = replace_region(src, "writings", render_home_lists(m), "        ")
    src, ok2 = replace_region(src, "featured", render_featured(m), "      ")
    if ok1 or ok2:
        write(idx, src)
        written.append("index.html")
    if verbose and not (ok1 and ok2):
        print("warning: index.html is missing writings/featured markers; home page partially updated")

    if verbose:
        for w in written:
            print("wrote", os.path.relpath(w, ROOT))
    return written


if __name__ == "__main__":
    build(verbose=True)
    sys.exit(0)
