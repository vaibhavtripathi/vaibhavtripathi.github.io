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
else (colours, fonts) is in `:root` variables at the top of the file.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Push to `main`. GitHub Pages serves the repo root automatically.
