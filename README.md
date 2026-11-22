# vaibhavtripathi.github.io

Personal website, hosted on GitHub Pages at https://vaibhavtripathi.github.io.

Plain HTML + CSS — no build step.

## Design

"Editorial" bento layout — purple + yellow on paper, with
[Fraunces](https://fonts.google.com/specimen/Fraunces) for display type and
[Inter](https://fonts.google.com/specimen/Inter) for text (loaded from Google Fonts).

- **Desktop (>1024px):** 12×6 grid that fills exactly one viewport, no scroll.
  Type uses `vw + vh` clamps so tiles stay filled on wide and tall screens.
- **Tablet (≤1024px):** 6-column grid, rows size to content, page scrolls.
- **Phone (≤600px):** 2 columns → full-width tiles; type scales on `vw` only.

Tile placement is controlled by the `.t-*` classes in `style.css`; everything
else (colours, fonts, type scale, gap, radius) is in `:root` variables at the
top of the file.

## Blog

Posts live as Markdown in `content/` and are compiled to static HTML — the
public site stays plain HTML with no JavaScript dependency.

```
content/posts.json          manifest: type, title, status, date, pinned…
content/essays/<slug>.md    essay bodies
content/snippets/<slug>.md  snippet bodies
```

Generated (do not hand-edit — they are overwritten on every build):
`blog/<slug>.html`, `blog/snippets/<slug>.html`, `blog/index.html`, and the
region between `<!-- writings:start -->` / `<!-- writings:end -->` in
`index.html` (the Writings tile).

### Writing posts (admin panel)

```bash
python3 admin_server.py          # instead of http.server
# open http://localhost:8000/admin.html#write
```

The **Write** tab in the admin panel lists every essay and snippet, with a
Markdown editor and a live preview rendered in the real site theme. Saving
(⌘S) writes the Markdown, updates the manifest and rebuilds the affected
pages on disk immediately, so the local site reflects changes at once.
Publish with `git push`.

- **Status** — Draft shows a badge and a placeholder if the body is empty;
  Published shows the date instead.
- **Pin to home tile** — pinned posts always appear in the Writings tile
  (then the newest published fill the remaining slots: 2 essays, 3 snippets).
- **Title with emphasis** — optional HTML variant of the title using
  `<em>…</em>` for the purple italic, used on the post page only.
- **Slug** is the URL and is fixed once created.

`python3 site_build.py` rebuilds everything from `content/` without the
server (e.g. after editing Markdown by hand). Markdown support: headings,
bold/italic, links, images, block quotes, lists, code, `---` rules, and `--`
→ em dash.

## Theme Lab (`admin.html`)

A local-only admin panel for experimenting with the design. It loads the real
`index.html` in iframes and writes CSS variables into them, so the preview is
exactly what `style.css` renders.

- **Presets** — Editorial (default), Midnight, Forest, Terracotta, Ocean,
  Noir Rose, Brutalist, Monochrome.
- **Colours** — every `:root` colour token, with live WCAG contrast readouts.
- **Typography** — title + text font pickers (Google Fonts), any custom Google
  Font by name, title weight / letter-spacing, and size multipliers.
- **Layout** — grid gap and tile radius.
- **Preview** — Single mode (Desktop / Laptop / Tablet / Phone, rotate, or any
  custom size) and Compare mode (desktop + tablet + phone side by side at a
  shared scale).
- **Export** — copies a drop-in `:root` block and the matching Google Fonts
  `<link>`, or downloads a patched `style.css`. **Share link** encodes the
  theme in the URL; state also persists in `localStorage`.

Must be served over HTTP (browsers block iframe styling on `file://`).

## Local preview

```bash
python3 admin_server.py
# site:  http://localhost:8000
# admin: http://localhost:8000/admin.html   (Theme) · #write (Writing)
```

`python3 -m http.server 8000` still works for read-only preview; only the
Write tab needs `admin_server.py`.

## Deploy

Push to `main`. GitHub Pages serves the repo root automatically.
