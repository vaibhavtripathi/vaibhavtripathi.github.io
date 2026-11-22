/* Write view — Markdown editor backed by admin_server.py's /api.
   Kept separate from admin.js (Theme Lab) so neither depends on the other. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = {
    seg: $('viewSeg'), brandTitle: $('brandTitle'), brandSub: $('brandSub'),
    shell: $('writeShell'), noServer: $('wNoServer'),
    essays: $('wEssays'), snippets: $('wSnippets'), filter: $('wFilter'),
    newEssay: $('wNewEssay'), newSnippet: $('wNewSnippet'),
    empty: $('wEmpty'), form: $('wForm'),
    title: $('fTitle'), titleHtml: $('fTitleHtml'), slug: $('fSlug'), type: $('fType'),
    status: $('fStatus'), date: $('fDate'), pinned: $('fPinned'), featured: $('fFeatured'), lede: $('fLede'), body: $('fBody'),
    count: $('wCount'), save: $('wSave'), del: $('wDelete'), open: $('wOpen'), statusText: $('wStatus'),
    frame: $('wFrame'), previewState: $('wPreviewState'),
  };

  let posts = [];          // manifest
  let current = null;      // {slug, isNew}
  let dirty = false;
  let hasApi = false;
  let previewTimer = null;
  let slugTouched = false;

  // ---------------------------------------------------------------- view switch
  function setView(v) {
    document.body.dataset.view = v;
    el.seg.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.view === v));
    document.querySelectorAll('.a-top-actions').forEach(a => a.hidden = a.dataset.for !== v);
    el.shell.hidden = v !== 'write';
    el.brandTitle.textContent = v === 'write' ? 'Writing' : 'Theme Lab';
    el.brandSub.textContent = v === 'write' ? 'content/ · markdown → static pages' : 'index.html · live preview';
    history.replaceState(null, '', v === 'write' ? '#write' : location.pathname + location.search);
    if (v === 'write' && !posts.length) loadList();
  }
  el.seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); });

  // ---------------------------------------------------------------- api
  async function api(method, path, body) {
    const res = await fetch('/api/' + path, {
      method, headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error((data && data.error) || res.statusText || 'request failed');
    return data;
  }

  async function loadList() {
    try {
      const m = await api('GET', 'posts');
      posts = m.posts || [];
      hasApi = true;
      el.noServer.hidden = true;
    } catch (_) {
      hasApi = false;
      el.noServer.hidden = false;
      posts = [];
    }
    renderList();
  }

  // ---------------------------------------------------------------- list
  function renderList() {
    const q = el.filter.value.trim().toLowerCase();
    const row = (p) => {
      const li = document.createElement('li');
      li.className = 'w-item' + (p.status === 'published' ? ' is-published' : '') + (current && current.slug === p.slug ? ' is-on' : '');
      li.innerHTML = `<span class="dot"></span><span class="t"></span><span class="pin">${p.featured ? '★ ' : ''}${p.pinned ? '📌' : ''}</span>`;
      li.querySelector('.t').textContent = p.title;
      li.title = p.slug;
      li.addEventListener('click', () => openPost(p.slug));
      return li;
    };
    for (const [type, ul] of [['essay', el.essays], ['snippet', el.snippets]]) {
      ul.replaceChildren(...posts.filter(p => p.type === type && (!q || p.title.toLowerCase().includes(q) || p.slug.includes(q))).map(row));
    }
  }
  el.filter.addEventListener('input', renderList);

  // ---------------------------------------------------------------- editor
  function confirmDiscard() {
    return !dirty || confirm('You have unsaved changes. Discard them?');
  }

  function fill(p, body) {
    el.title.value = p.title || '';
    el.titleHtml.value = p.title_html || '';
    el.slug.value = p.slug || '';
    el.type.value = p.type || 'essay';
    el.status.value = p.status === 'published' ? 'published' : 'draft';
    el.date.value = p.date || new Date().toISOString().slice(0, 10);
    el.pinned.checked = !!p.pinned;
    el.featured.checked = !!p.featured;
    el.lede.value = p.lede || '';
    el.body.value = body || '';
    el.slug.readOnly = !current.isNew;
    el.slug.title = current.isNew ? '' : 'Slug is fixed once created (it is the public URL)';
    updateCount();
  }

  async function openPost(slug) {
    if (!confirmDiscard()) return;
    try {
      const p = await api('GET', 'posts/' + slug);
      current = { slug, isNew: false };
      slugTouched = true;
      fill(p, p.body);
      showForm(true);
      el.open.href = '/' + p.href;
      el.open.hidden = false;
      el.del.hidden = false;
      setDirty(false);
      renderList();
      schedulePreview(0);
    } catch (e) { setStatus('Could not load: ' + e.message, 'bad'); }
  }

  function newPost(type) {
    if (!confirmDiscard()) return;
    current = { slug: '', isNew: true };
    slugTouched = false;
    fill({ type, status: 'draft', pinned: false }, '');
    showForm(true);
    el.open.hidden = true;
    el.del.hidden = true;
    setDirty(false);
    renderList();
    el.title.focus();
    schedulePreview(0);
  }
  el.newEssay.addEventListener('click', () => newPost('essay'));
  el.newSnippet.addEventListener('click', () => newPost('snippet'));

  function showForm(on) { el.form.hidden = !on; el.empty.hidden = on; }

  function setDirty(d) {
    dirty = d;
    el.save.disabled = !d || !hasApi;
    if (d) setStatus('Unsaved changes', 'dirty');
  }
  function setStatus(text, kind) {
    el.statusText.textContent = text;
    el.statusText.className = 'w-status' + (kind ? ' is-' + kind : '');
  }

  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  function updateCount() {
    const words = (el.body.value.trim().match(/\S+/g) || []).length;
    el.count.textContent = words ? `${words} words · ~${Math.max(1, Math.round(words / 220))} min` : '';
  }

  el.form.addEventListener('input', (e) => {
    if (e.target === el.title && current && current.isNew && !slugTouched) el.slug.value = slugify(el.title.value);
    if (e.target === el.slug) slugTouched = true;
    if (e.target === el.body) updateCount();
    setDirty(true);
    schedulePreview(e.target === el.body ? 350 : 150);
  });

  function payload() {
    return {
      type: el.type.value,
      title: el.title.value.trim(),
      title_html: el.titleHtml.value.trim(),
      slug: el.slug.value.trim(),
      status: el.status.value,
      date: el.date.value,
      pinned: el.pinned.checked,
      featured: el.featured.checked,
      lede: el.lede.value.trim(),
      body: el.body.value,
    };
  }

  // ---------------------------------------------------------------- save / delete
  async function save() {
    if (!current || !hasApi) return;
    if (!el.form.reportValidity()) return;
    const data = payload();
    setStatus('Saving…');
    try {
      let res;
      if (current.isNew) {
        res = await api('POST', 'posts', data);
        current = { slug: res.post.slug, isNew: false };
        el.slug.readOnly = true;
      } else {
        res = await api('PUT', 'posts/' + current.slug, data);
      }
      el.open.href = '/' + res.href;
      el.open.hidden = false;
      el.del.hidden = false;
      setDirty(false);
      setStatus('Saved · site rebuilt', 'ok');
      await loadList();
      renderList();
    } catch (e) { setStatus('Save failed: ' + e.message, 'bad'); }
  }
  el.save.addEventListener('click', save);
  el.form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && document.body.dataset.view === 'write') {
      e.preventDefault(); save();
    }
  });

  el.del.addEventListener('click', async () => {
    if (!current || current.isNew) return;
    if (!confirm(`Delete "${el.title.value}"? The page and its Markdown are removed from disk.`)) return;
    try {
      await api('DELETE', 'posts/' + current.slug);
      current = null; setDirty(false);
      showForm(false);
      el.open.hidden = true; el.del.hidden = true;
      el.frame.srcdoc = '';
      setStatus('Deleted · site rebuilt', 'ok');
      await loadList();
    } catch (e) { setStatus('Delete failed: ' + e.message, 'bad'); }
  });

  // ---------------------------------------------------------------- preview
  function schedulePreview(ms) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, ms);
  }
  async function renderPreview() {
    if (!current) return;
    if (!hasApi) { el.previewState.textContent = 'needs admin_server.py'; return; }
    el.previewState.textContent = 'rendering…';
    try {
      const data = payload();
      if (!data.title) data.title = 'Untitled';
      const html = await api('POST', 'preview', data);
      // keep scroll position across re-renders
      const y = el.frame.contentWindow ? el.frame.contentWindow.scrollY : 0;
      el.frame.onload = () => { try { el.frame.contentWindow.scrollTo(0, y); } catch (_) {} };
      el.frame.srcdoc = html;
      el.previewState.textContent = '';
    } catch (e) { el.previewState.textContent = 'preview error: ' + e.message; }
  }

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------------------------------------------------------------- boot
  setView(location.hash === '#write' ? 'write' : 'theme');
})();
