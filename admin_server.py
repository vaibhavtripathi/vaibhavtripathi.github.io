#!/usr/bin/env python3
"""
admin_server.py — local dev server with a tiny write API for the admin panel.

    python3 admin_server.py            # http://localhost:8000
    python3 admin_server.py 9000       # custom port

Serves the repo like `python3 -m http.server` (no caching) and adds:

    GET    /api/posts              manifest
    GET    /api/posts/<slug>       one post + markdown body
    POST   /api/posts              create  {type,title,slug?,title_html?,status?,date?,pinned?,lede?,body?}
    PUT    /api/posts/<slug>       update  (same fields; slug immutable)
    DELETE /api/posts/<slug>       remove post + generated page, rebuild
    POST   /api/preview            render a post without saving -> HTML
    POST   /api/build              rebuild everything from content/

Every create/update/delete rebuilds the site via site_build.py, so the
public pages on disk are always in sync. Publish with `git push`.
Local-only: never deploy this file's behaviour; GitHub Pages ignores it.
"""
import json
import os
import re
import sys
from datetime import date
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import site_build as sb

ROOT = sb.ROOT
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FIELDS = ("title", "title_html", "status", "date", "pinned", "featured", "lede")


class ApiError(Exception):
    def __init__(self, code, msg):
        super().__init__(msg)
        self.code, self.msg = code, msg


def find(m, slug):
    for p in m["posts"]:
        if p["slug"] == slug:
            return p
    return None


def apply_fields(post, data):
    for k in FIELDS:
        if k in data:
            post[k] = data[k]
    if post.get("type") not in sb.TYPES:
        raise ApiError(400, "type must be 'essay' or 'snippet'")
    if not str(post.get("title", "")).strip():
        raise ApiError(400, "title is required")
    post["status"] = "published" if post.get("status") == "published" else "draft"
    post["pinned"] = bool(post.get("pinned"))
    post["featured"] = bool(post.get("featured"))
    post["date"] = post.get("date") or date.today().isoformat()
    post["title_html"] = post.get("title_html") or ""
    post["lede"] = post.get("lede") or ""
    post["updated"] = date.today().isoformat()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # ---- plumbing -----------------------------------------------------------
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            sys.stderr.write("api  %s %s\n" % (self.command, self.path))

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, text, code=200):
        body = text.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except ValueError:
            raise ApiError(400, "invalid JSON body")

    def route(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            return None
        parts = [p for p in path.split("/") if p]
        return parts[1:]  # drop 'api'

    def api(self, method):
        parts = self.route()
        if parts is None:
            return False
        try:
            handler = getattr(self, f"api_{method}", None)
            if handler is None:
                raise ApiError(405, "method not allowed")
            handler(parts)
        except ApiError as e:
            self.send_json({"error": e.msg}, e.code)
        except Exception as e:  # keep the server alive, surface the error
            self.send_json({"error": f"{type(e).__name__}: {e}"}, 500)
        return True

    # ---- verbs --------------------------------------------------------------
    def do_GET(self):
        if not self.api("get"):
            super().do_GET()

    def do_POST(self):
        self.api("post")

    def do_PUT(self):
        self.api("put")

    def do_DELETE(self):
        self.api("delete")

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Allow", "GET, POST, PUT, DELETE, OPTIONS")
        self.end_headers()

    # ---- endpoints ----------------------------------------------------------
    def api_get(self, parts):
        m = sb.load_manifest()
        if parts == ["posts"]:
            return self.send_json(m)
        if len(parts) == 2 and parts[0] == "posts":
            p = find(m, parts[1])
            if not p:
                raise ApiError(404, "no such post")
            out = dict(p)
            out["body"] = sb.read_body(p)
            out["href"] = sb.href_from_home(p)
            return self.send_json(out)
        raise ApiError(404, "unknown endpoint")

    def api_post(self, parts):
        if parts == ["posts"]:
            data = self.read_json()
            m = sb.load_manifest()
            slug = (data.get("slug") or sb.slugify(data.get("title", ""))).strip()
            if not SLUG_RE.match(slug):
                raise ApiError(400, "slug may contain only a-z, 0-9 and single hyphens")
            if find(m, slug):
                raise ApiError(409, f"a post with slug '{slug}' already exists")
            post = {"slug": slug, "type": data.get("type", "essay")}
            apply_fields(post, data)
            if post["featured"]:
                for other in m["posts"]:
                    other["featured"] = False
            m["posts"].append(post)
            sb.write_body(post, data.get("body", ""))
            sb.save_manifest(m)
            sb.build(m)
            return self.send_json({"ok": True, "post": post, "href": sb.href_from_home(post)}, 201)

        if parts == ["preview"]:
            data = self.read_json()
            post = {"slug": data.get("slug") or "preview", "type": data.get("type", "essay")}
            apply_fields(post, data)
            m = sb.load_manifest()
            siblings = sb.by_type(m, post["type"])
            idx = next((i for i, p in enumerate(siblings) if p["slug"] == post["slug"]), len(siblings))
            prev_p = siblings[idx - 1] if idx > 0 else None
            next_p = siblings[idx + 1] if idx + 1 < len(siblings) else None
            return self.send_html(sb.render_post(post, idx + 1, prev_p, next_p, data.get("body", ""), root="/"))

        if parts == ["build"]:
            written = sb.build()
            return self.send_json({"ok": True, "written": [os.path.relpath(w, ROOT) for w in written]})

        raise ApiError(404, "unknown endpoint")

    def api_put(self, parts):
        if len(parts) == 2 and parts[0] == "posts":
            data = self.read_json()
            m = sb.load_manifest()
            post = find(m, parts[1])
            if not post:
                raise ApiError(404, "no such post")
            new_type = data.get("type", post["type"])
            if new_type != post["type"]:
                # moving between essay/snippet: relocate the markdown + drop old page
                old_md, old_html = sb.md_path(post), sb.html_path(post)
                body = sb.read_body(post)
                for f in (old_md, old_html):
                    if os.path.exists(f):
                        os.remove(f)
                post["type"] = new_type
                sb.write_body(post, body)
            apply_fields(post, data)
            if post["featured"]:
                for other in m["posts"]:
                    if other is not post:
                        other["featured"] = False
            if "body" in data:
                sb.write_body(post, data["body"])
            sb.save_manifest(m)
            sb.build(m)
            return self.send_json({"ok": True, "post": post, "href": sb.href_from_home(post)})
        raise ApiError(404, "unknown endpoint")

    def api_delete(self, parts):
        if len(parts) == 2 and parts[0] == "posts":
            m = sb.load_manifest()
            post = find(m, parts[1])
            if not post:
                raise ApiError(404, "no such post")
            m["posts"] = [p for p in m["posts"] if p["slug"] != post["slug"]]
            for f in (sb.md_path(post), sb.html_path(post)):
                if os.path.exists(f):
                    os.remove(f)
            sb.save_manifest(m)
            sb.build(m)
            return self.send_json({"ok": True})
        raise ApiError(404, "unknown endpoint")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(ROOT)
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"serving {ROOT}")
    print(f"site   → http://localhost:{port}/")
    print(f"admin  → http://localhost:{port}/admin.html#write")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
