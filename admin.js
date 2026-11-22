/* Theme Lab — live theme experimentation for index.html.
   Loads the real site in iframes and writes CSS custom properties into
   each frame's <html>, so what you see is exactly what style.css renders. */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Catalogue
  ------------------------------------------------------------------ */
  const COLORS = [
    ['bg',         '--bg',          'Page background'],
    ['tile',       '--tile',        'Tile background'],
    ['tileHover',  '--tile-hover',  'Tile hover'],
    ['line',       '--line',        'Grid hairline'],
    ['text',       '--text',        'Text'],
    ['muted',      '--muted',       'Muted text'],
    ['purple',     '--purple',      'Accent (stat tile, links)'],
    ['purpleSoft', '--purple-soft', 'Accent soft (project 1)'],
    ['onPurple',   '--on-purple',   'Text on accent'],
    ['yellow',     '--yellow',      'Highlight (contact, big V)'],
    ['yellowInk',  '--yellow-ink',  'Highlight ink (contact body)'],
    ['onYellow',   '--on-yellow',   'Text on highlight'],
  ];

  const STACKS = {
    serif: 'Georgia, "Times New Roman", serif',
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  };

  // `api` is the css2 family spec (axes chosen to match what Google serves).
  const FONTS = [
    // Serif / display
    { name: 'Fraunces',            cat: 'serif', api: 'Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900' },
    { name: 'Playfair Display',    cat: 'serif', api: 'Playfair Display:ital,wght@0,400..900;1,400..900' },
    { name: 'Newsreader',          cat: 'serif', api: 'Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800' },
    { name: 'Bodoni Moda',         cat: 'serif', api: 'Bodoni Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900' },
    { name: 'Instrument Serif',    cat: 'serif', api: 'Instrument Serif:ital@0;1' },
    { name: 'DM Serif Display',    cat: 'serif', api: 'DM Serif Display:ital@0;1' },
    { name: 'Cormorant Garamond',  cat: 'serif', api: 'Cormorant Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700' },
    { name: 'EB Garamond',         cat: 'serif', api: 'EB Garamond:ital,wght@0,400..800;1,400..800' },
    { name: 'Libre Baskerville',   cat: 'serif', api: 'Libre Baskerville:ital,wght@0,400;0,700;1,400' },
    { name: 'Lora',                cat: 'serif', api: 'Lora:ital,wght@0,400..700;1,400..700' },
    { name: 'Young Serif',         cat: 'serif', api: 'Young Serif' },
    { name: 'Gloock',              cat: 'serif', api: 'Gloock' },
    // Sans
    { name: 'Inter',               cat: 'sans',  api: 'Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900' },
    { name: 'DM Sans',             cat: 'sans',  api: 'DM Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000' },
    { name: 'Geist',               cat: 'sans',  api: 'Geist:wght@100..900' },
    { name: 'Manrope',             cat: 'sans',  api: 'Manrope:wght@200..800' },
    { name: 'Figtree',             cat: 'sans',  api: 'Figtree:ital,wght@0,300..900;1,300..900' },
    { name: 'Plus Jakarta Sans',   cat: 'sans',  api: 'Plus Jakarta Sans:ital,wght@0,200..800;1,200..800' },
    { name: 'Work Sans',           cat: 'sans',  api: 'Work Sans:ital,wght@0,100..900;1,100..900' },
    { name: 'Source Sans 3',       cat: 'sans',  api: 'Source Sans 3:ital,wght@0,200..900;1,200..900' },
    { name: 'IBM Plex Sans',       cat: 'sans',  api: 'IBM Plex Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400' },
    { name: 'Karla',               cat: 'sans',  api: 'Karla:ital,wght@0,200..800;1,200..800' },
    { name: 'Rubik',               cat: 'sans',  api: 'Rubik:ital,wght@0,300..900;1,300..900' },
    { name: 'Outfit',              cat: 'sans',  api: 'Outfit:wght@100..900' },
    { name: 'Space Grotesk',       cat: 'sans',  api: 'Space Grotesk:wght@300..700' },
    { name: 'Bricolage Grotesque', cat: 'sans',  api: 'Bricolage Grotesque:opsz,wght@12..96,200..800' },
    { name: 'Syne',                cat: 'sans',  api: 'Syne:wght@400..800' },
    { name: 'Unbounded',           cat: 'sans',  api: 'Unbounded:wght@200..900' },
    { name: 'Archivo Black',       cat: 'sans',  api: 'Archivo Black' },
    // Mono
    { name: 'JetBrains Mono',      cat: 'mono',  api: 'JetBrains Mono:ital,wght@0,100..800;1,100..800' },
    { name: 'IBM Plex Mono',       cat: 'mono',  api: 'IBM Plex Mono:ital,wght@0,300;0,400;0,500;0,600;1,400' },
    { name: 'Space Mono',          cat: 'mono',  api: 'Space Mono:ital,wght@0,400;0,700;1,400;1,700' },
  ];

  const RANGES = {
    type: [
      ['displayWeight',   'Title weight',        100,   900,  100,   v => String(v)],
      ['displayTracking', 'Title letter-spacing', -0.06, 0.12, 0.005, v => v.toFixed(3) + 'em'],
      ['displayScale',    'Title size',          0.7,   1.4,  0.02,  v => '×' + v.toFixed(2)],
      ['textScale',       'Text size',           0.8,   1.3,  0.02,  v => '×' + v.toFixed(2)],
    ],
    layout: [
      ['gap',    'Grid gap',    0, 24, 1, v => v + 'px'],
      ['radius', 'Tile radius', 0, 32, 1, v => v + 'px'],
    ],
  };

  const DEFAULT = {
    colors: {
      bg: '#f6f2ea', tile: '#fbf9f4', tileHover: '#ffffff', line: '#d8d0c2',
      text: '#1d1726', muted: '#6b6373', purple: '#4b1f82', purpleSoft: '#ebe2f6',
      onPurple: '#f6f2ea', yellow: '#f2c53d', yellowInk: '#5c4a05', onYellow: '#1d1726',
    },
    displayFont: 'Newsreader', textFont: 'Newsreader',
    displayWeight: 300, displayTracking: -0.01, displayScale: 1, textScale: 1,
    gap: 1, radius: 0,
    customFonts: [],
  };

  const preset = (name, over) => ({ name, ...structuredClone(DEFAULT), ...over, colors: { ...DEFAULT.colors, ...(over.colors || {}) } });
  const PRESETS = [
    preset('Editorial', {}),
    preset('Midnight', {
      colors: { bg: '#0f0e13', tile: '#17151e', tileHover: '#1d1a26', line: '#2a2633', text: '#f1ecf7', muted: '#9b93a8',
        purple: '#c5a3ff', purpleSoft: '#241b36', onPurple: '#15102a', yellow: '#f2c53d', yellowInk: '#3a2f06', onYellow: '#1a1407' },
    }),
    preset('Forest', {
      colors: { bg: '#eef1ea', tile: '#f6f8f2', tileHover: '#ffffff', line: '#cdd5c4', text: '#14201a', muted: '#5f6d64',
        purple: '#1f5a3c', purpleSoft: '#dbe9df', onPurple: '#eef1ea', yellow: '#e4b94a', yellowInk: '#4a3a07', onYellow: '#14201a' },
      displayFont: 'Newsreader', textFont: 'Source Sans 3', displayWeight: 300,
    }),
    preset('Terracotta', {
      colors: { bg: '#f7ede4', tile: '#fcf6f0', tileHover: '#ffffff', line: '#e1cfc0', text: '#2b1b14', muted: '#7a6257',
        purple: '#b4472b', purpleSoft: '#f6ddd2', onPurple: '#fcf6f0', yellow: '#e9c46a', yellowInk: '#553f07', onYellow: '#2b1b14' },
      displayFont: 'Playfair Display', textFont: 'DM Sans', displayWeight: 400, displayTracking: -0.02,
    }),
    preset('Ocean', {
      colors: { bg: '#e9f1f5', tile: '#f4f9fb', tileHover: '#ffffff', line: '#c6d7e0', text: '#0e2230', muted: '#52697a',
        purple: '#0d5c8c', purpleSoft: '#d8e8f2', onPurple: '#f4f9fb', yellow: '#ff9f43', yellowInk: '#4d2a05', onYellow: '#0e2230' },
      displayFont: 'Bricolage Grotesque', textFont: 'Figtree', displayWeight: 500, displayTracking: -0.03, radius: 10, gap: 10,
    }),
    preset('Noir Rose', {
      colors: { bg: '#141014', tile: '#1b151c', tileHover: '#221a24', line: '#332734', text: '#f8eef2', muted: '#a89aa3',
        purple: '#ff5c8a', purpleSoft: '#2e1a24', onPurple: '#1a0a10', yellow: '#ffd166', yellowInk: '#3a2d05', onYellow: '#1a1405' },
      displayFont: 'Bodoni Moda', textFont: 'Manrope', displayWeight: 400,
    }),
    preset('Brutalist', {
      colors: { bg: '#ffffff', tile: '#ffffff', tileHover: '#f3f3f3', line: '#000000', text: '#000000', muted: '#444444',
        purple: '#0000ff', purpleSoft: '#e6e6ff', onPurple: '#ffffff', yellow: '#ffff00', yellowInk: '#333300', onYellow: '#000000' },
      displayFont: 'Archivo Black', textFont: 'Space Mono', displayWeight: 400, displayTracking: -0.02, displayScale: 0.9, gap: 2,
    }),
    preset('Monochrome', {
      colors: { bg: '#f4f4f4', tile: '#fafafa', tileHover: '#ffffff', line: '#d0d0d0', text: '#111111', muted: '#666666',
        purple: '#111111', purpleSoft: '#e4e4e4', onPurple: '#f4f4f4', yellow: '#dcdcdc', yellowInk: '#222222', onYellow: '#111111' },
      displayFont: 'Instrument Serif', textFont: 'Geist', displayWeight: 400, displayTracking: 0,
    }),
  ];

  const DEVICES = [
    { id: 'desktop', label: 'Desktop', w: 1440, h: 900 },
    { id: 'laptop',  label: 'Laptop',  w: 1280, h: 800 },
    { id: 'tablet',  label: 'Tablet',  w: 834,  h: 1112 },
    { id: 'phone',   label: 'Phone',   w: 390,  h: 844 },
  ];
  const COMPARE_IDS = ['desktop', 'tablet', 'phone'];

  /* ------------------------------------------------------------------
     State
  ------------------------------------------------------------------ */
  const LS_KEY = 'theme-lab:v1';
  let state = loadState();
  let view = { mode: new URLSearchParams(location.search).get('mode') === 'compare' ? 'compare' : 'single', device: 'desktop', w: 1440, h: 900 };

  function loadState() {
    const fromHash = decodeHash();
    if (fromHash) return normalize(fromHash);
    try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s) return normalize(s); } catch (_) {}
    return structuredClone(DEFAULT);
  }
  function normalize(s) {
    const n = structuredClone(DEFAULT);
    Object.assign(n, s);
    n.colors = { ...DEFAULT.colors, ...(s.colors || {}) };
    n.customFonts = Array.isArray(s.customFonts) ? s.customFonts : [];
    return n;
  }
  function decodeHash() {
    const m = location.hash.match(/^#t=(.+)$/);
    if (!m) return null;
    try { return JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (_) { return null; }
  }
  function encodeHash() {
    return '#t=' + btoa(JSON.stringify(exportable(state))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  const exportable = s => { const { customFonts, ...rest } = s; return { ...rest, customFonts: customFonts.filter(f => f.name === s.displayFont || f.name === s.textFont) }; };

  /* ------------------------------------------------------------------
     Fonts
  ------------------------------------------------------------------ */
  const allFonts = () => [...FONTS, ...state.customFonts];
  const getFont = name => allFonts().find(f => f.name === name) || { name, cat: 'sans', api: name, custom: true };
  const fontStack = f => `"${f.name}", ${STACKS[f.cat] || STACKS.sans}`;
  const fontUrl = api => 'https://fonts.googleapis.com/css2?family=' + api.replace(/ /g, '+') + '&display=swap';
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  function ensureFont(doc, f) {
    if (!doc || !doc.head) return;
    const id = 'gf-' + slug(f.name);
    if (doc.getElementById(id)) return;
    const link = doc.createElement('link');
    link.id = id; link.rel = 'stylesheet'; link.href = fontUrl(f.api);
    // Custom fonts guess at axes; if Google rejects the spec, fall back to the bare family.
    if (f.custom && f.api !== f.name) {
      link.onerror = () => { link.onerror = null; link.href = fontUrl(f.name); };
    }
    doc.head.appendChild(link);
  }

  /* ------------------------------------------------------------------
     Apply theme
  ------------------------------------------------------------------ */
  function cssVars(s) {
    const out = {};
    for (const [key, v] of COLORS) out[v] = s.colors[key];
    out['--font-display'] = fontStack(getFont(s.displayFont));
    out['--font-text'] = fontStack(getFont(s.textFont));
    out['--display-weight'] = String(s.displayWeight);
    out['--display-tracking'] = s.displayTracking + 'em';
    out['--display-scale'] = String(s.displayScale);
    out['--text-scale'] = String(s.textScale);
    out['--gap'] = s.gap + 'px';
    out['--radius'] = s.radius + 'px';
    return out;
  }

  function applyTo(doc) {
    if (!doc || !doc.documentElement) return;
    const vars = cssVars(state);
    for (const k in vars) doc.documentElement.style.setProperty(k, vars[k]);
    ensureFont(doc, getFont(state.displayFont));
    ensureFont(doc, getFont(state.textFont));
  }

  function frameDoc(iframe) {
    try { return iframe.contentDocument; } catch (_) { return null; }
  }

  let saveTimer;
  function update() {
    applyTo(document);
    document.querySelectorAll('.a-device-frame iframe').forEach(f => applyTo(frameDoc(f)));
    renderContrast();
    renderActivePreset();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => localStorage.setItem(LS_KEY, JSON.stringify(state)), 150);
  }

  /* ------------------------------------------------------------------
     Controls
  ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const h = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'html') n.innerHTML = v;
      else n.setAttribute(k, v);
    }
    for (const kid of kids) if (kid != null) n.append(kid);
    return n;
  };

  // Presets
  function renderPresets() {
    const grid = $('#presetGrid');
    grid.replaceChildren(...PRESETS.map(p => h('button', { class: 'a-preset', type: 'button', 'data-name': p.name, onclick: () => applyPreset(p) },
      h('span', { class: 'sw' }, ...['bg', 'tile', 'purple', 'yellow', 'text'].map(k => h('i', { style: `background:${p.colors[k]}` }))),
      h('span', { class: 'nm' }, p.name),
      h('span', { class: 'ft' }, `${p.displayFont} + ${p.textFont}`),
    )));
  }
  function applyPreset(p) {
    const { name, ...rest } = structuredClone(p);
    state = { ...rest, customFonts: state.customFonts };
    syncControls();
    update();
  }
  const sig = s => JSON.stringify({ c: s.colors, d: s.displayFont, t: s.textFont, w: s.displayWeight, k: s.displayTracking, ds: s.displayScale, ts: s.textScale, g: s.gap, r: s.radius });
  function renderActivePreset() {
    const cur = sig(state);
    const match = PRESETS.find(p => sig(p) === cur);
    document.querySelectorAll('.a-preset').forEach(b => b.classList.toggle('is-on', !!match && b.dataset.name === match.name));
    $('#activePreset').innerHTML = match ? `Preset · <b>${match.name}</b>` : 'Preset · <b>Custom</b>';
  }

  // Colours
  const colorInputs = {};
  function renderColors() {
    const group = $('#colorGroup');
    group.replaceChildren(...COLORS.map(([key, v, label]) => {
      const pick = h('input', { type: 'color', value: state.colors[key] });
      const text = h('input', { type: 'text', value: state.colors[key], spellcheck: 'false', maxlength: '7' });
      pick.addEventListener('input', () => { state.colors[key] = pick.value; text.value = pick.value; text.classList.remove('is-bad'); update(); });
      text.addEventListener('input', () => {
        let val = text.value.trim(); if (val && val[0] !== '#') val = '#' + val;
        if (/^#[0-9a-f]{6}$/i.test(val)) { text.classList.remove('is-bad'); state.colors[key] = val.toLowerCase(); pick.value = val; update(); }
        else text.classList.add('is-bad');
      });
      text.addEventListener('blur', () => { text.value = state.colors[key]; text.classList.remove('is-bad'); });
      colorInputs[key] = { pick, text };
      return h('div', { class: 'a-color' }, h('div', { class: 'lb' }, label, h('span', {}, v)), pick, text);
    }));
  }

  // Contrast (WCAG)
  const lum = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
  const PAIRS = [['Text / tile', 'text', 'tile'], ['Muted / tile', 'muted', 'tile'], ['On accent', 'onPurple', 'purple'], ['On highlight', 'onYellow', 'yellow'], ['Accent / tile', 'purple', 'tile'], ['Highlight ink', 'yellowInk', 'yellow']];
  function renderContrast() {
    $('#contrast').replaceChildren(...PAIRS.map(([name, a, b]) => {
      const r = ratio(state.colors[a], state.colors[b]);
      const cls = r >= 4.5 ? 'ok' : r >= 3 ? 'warn' : 'bad';
      return h('div', { class: 'a-cx ' + cls, title: `${name}: ${r.toFixed(2)}:1 — ${r >= 4.5 ? 'AA' : r >= 3 ? 'AA large only' : 'fails AA'}` },
        h('span', { class: 'nm' }, name), h('span', { class: 'vl' }, r.toFixed(1) + ':1'));
    }));
  }

  // Fonts
  function fillFontSelect(sel, current) {
    const groups = { serif: 'Serif', sans: 'Sans', mono: 'Mono', custom: 'Custom' };
    sel.replaceChildren();
    for (const [cat, label] of Object.entries(groups)) {
      const list = cat === 'custom' ? state.customFonts : FONTS.filter(f => f.cat === cat);
      if (!list.length) continue;
      const og = h('optgroup', { label });
      list.forEach(f => og.append(h('option', { value: f.name }, f.name)));
      sel.append(og);
    }
    sel.value = current;
  }
  function renderFontSelects() {
    fillFontSelect($('#displayFont'), state.displayFont);
    fillFontSelect($('#textFont'), state.textFont);
  }
  $('#displayFont').addEventListener('change', e => { state.displayFont = e.target.value; update(); });
  $('#textFont').addEventListener('change', e => { state.textFont = e.target.value; update(); });

  function addCustomFont(target) {
    const name = $('#customFontName').value.trim().replace(/\s+/g, ' ');
    if (!name) return $('#customFontName').focus();
    const cat = $('#customFontCat').value;
    if (!allFonts().some(f => f.name.toLowerCase() === name.toLowerCase())) {
      state.customFonts.push({ name, cat, custom: true, api: `${name}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400` });
    }
    const actual = allFonts().find(f => f.name.toLowerCase() === name.toLowerCase()).name;
    state[target] = actual;
    $('#customFontName').value = '';
    renderFontSelects();
    update();
  }
  $('#addFontDisplay').addEventListener('click', () => addCustomFont('displayFont'));
  $('#addFontText').addEventListener('click', () => addCustomFont('textFont'));
  $('#customFontName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCustomFont('displayFont'); } });

  // Ranges
  const rangeInputs = {};
  function renderRanges(containerId, defs) {
    $('#' + containerId).replaceChildren(...defs.map(([key, label, min, max, step, fmt]) => {
      const out = h('output', {}, fmt(state[key]));
      const input = h('input', { type: 'range', min, max, step, value: state[key] });
      input.addEventListener('input', () => { state[key] = parseFloat(input.value); out.textContent = fmt(state[key]); update(); });
      rangeInputs[key] = { input, out, fmt };
      return h('label', { class: 'a-range' }, h('span', { class: 'lb' }, label), out, input);
    }));
  }

  function syncControls() {
    for (const [key] of COLORS) { colorInputs[key].pick.value = state.colors[key]; colorInputs[key].text.value = state.colors[key]; }
    renderFontSelects();
    for (const [key, { input, out, fmt }] of Object.entries(rangeInputs)) { input.value = state[key]; out.textContent = fmt(state[key]); }
  }

  /* ------------------------------------------------------------------
     Stage / devices
  ------------------------------------------------------------------ */
  const stage = $('#stage');

  function makeDevice(dev) {
    const iframe = h('iframe', { src: 'index.html', title: dev.label + ' preview', loading: 'eager' });
    iframe.addEventListener('load', () => applyTo(frameDoc(iframe)));
    const frame = h('div', { class: 'a-device-frame' }, iframe);
    const label = h('div', { class: 'a-device-label' }, h('b', {}, dev.label), h('code', {}, `${dev.w} × ${dev.h}`));
    const node = h('div', { class: 'a-device', 'data-id': dev.id }, label, frame);
    node._dev = dev; node._iframe = iframe; node._frame = frame; node._label = label.lastChild;
    return node;
  }

  function renderStage() {
    const devs = view.mode === 'compare'
      ? COMPARE_IDS.map(id => DEVICES.find(d => d.id === id))
      : [{ id: 'single', label: currentDeviceLabel(), w: view.w, h: view.h }];
    stage.replaceChildren(...devs.map(makeDevice));
    layout();
  }

  function currentDeviceLabel() {
    const d = DEVICES.find(d => d.id === view.device);
    if (!d) return 'Custom';
    if (d.w === view.w && d.h === view.h) return d.label;
    if (d.w === view.h && d.h === view.w) return d.label + ' (rotated)';
    return 'Custom';
  }

  function layout() {
    const nodes = [...stage.children];
    if (!nodes.length) return;
    const cs = getComputedStyle(stage);
    const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 26; // label row
    const gap = parseFloat(cs.columnGap) || 28;
    let scale;
    if (view.mode === 'compare') {
      const totalW = nodes.reduce((s, n) => s + n._dev.w, 0) + gap * (nodes.length - 1);
      const maxH = Math.max(...nodes.map(n => n._dev.h));
      scale = Math.min(1, (availW - gap * (nodes.length - 1)) / (totalW - gap * (nodes.length - 1)), availH / maxH);
    } else {
      scale = Math.min(1, availW / nodes[0]._dev.w, availH / nodes[0]._dev.h);
    }
    scale = Math.max(scale, 0.1);
    for (const n of nodes) {
      const { w, h: hh } = n._dev;
      n._frame.style.width = w * scale + 'px';
      n._frame.style.height = hh * scale + 'px';
      n._iframe.style.width = w + 'px';
      n._iframe.style.height = hh + 'px';
      n._iframe.style.transform = `scale(${scale})`;
    }
    $('#zoomLabel').textContent = Math.round(scale * 100) + '%';
  }
  new ResizeObserver(() => layout()).observe(stage);

  // Toolbar
  function renderChips() {
    $('#deviceChips').replaceChildren(...DEVICES.map(d => h('button', {
      class: 'a-chip' + (view.device === d.id ? ' is-on' : ''), type: 'button',
      onclick: () => { view.device = d.id; view.w = d.w; view.h = d.h; syncSize(); renderChips(); renderStage(); },
    }, d.label, h('small', {}, `${d.w}×${d.h}`))));
    $('#deviceChips').hidden = view.mode === 'compare';
    $('#sizeBox').hidden = view.mode === 'compare';
  }
  function syncSize() { $('#customW').value = view.w; $('#customH').value = view.h; }
  function onSizeInput() {
    const w = parseInt($('#customW').value, 10), hh = parseInt($('#customH').value, 10);
    if (!(w >= 280 && hh >= 280)) return;
    view.w = w; view.h = hh;
    const n = stage.firstElementChild;
    if (view.mode === 'single' && n) { // resize in place, no reload
      n._dev = { ...n._dev, w, h: hh, label: currentDeviceLabel() };
      n._label.textContent = `${w} × ${hh}`;
      n.querySelector('b').textContent = n._dev.label;
      layout();
    }
  }
  $('#customW').addEventListener('input', onSizeInput);
  $('#customH').addEventListener('input', onSizeInput);
  $('#btnRotate').addEventListener('click', () => { [view.w, view.h] = [view.h, view.w]; syncSize(); onSizeInput(); });
  $('#modeSeg').addEventListener('click', e => {
    const b = e.target.closest('button[data-mode]'); if (!b) return;
    view.mode = b.dataset.mode;
    $('#modeSeg').querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b));
    renderChips(); renderStage();
  });
  $('#btnReload').addEventListener('click', renderStage);

  /* ------------------------------------------------------------------
     Export / share / reset
  ------------------------------------------------------------------ */
  function rootBlock() {
    const c = state.colors;
    const df = getFont(state.displayFont), tf = getFont(state.textFont);
    return `:root {
  /* Colours */
  --bg: ${c.bg};
  --tile: ${c.tile};
  --tile-hover: ${c.tileHover};
  --line: ${c.line};
  --text: ${c.text};
  --muted: ${c.muted};
  --purple: ${c.purple};
  --purple-soft: ${c.purpleSoft};
  --yellow: ${c.yellow};
  --yellow-ink: ${c.yellowInk};
  --on-purple: ${c.onPurple}; /* text on the purple tile */
  --on-yellow: ${c.onYellow}; /* headings + links on the yellow tile */

  /* Type */
  --font-display: ${fontStack(df)};
  --font-text: ${fontStack(tf)};
  --display-weight: ${state.displayWeight};
  --display-tracking: ${state.displayTracking}em;
  --display-scale: ${state.displayScale}; /* multiplier on heading sizes */
  --text-scale: ${state.textScale};    /* multiplier on body sizes */

  /* Layout */
  --pad: 18px;
  --gap: ${state.gap}px;
  --radius: ${state.radius}px;
}`;
  }
  function linkTag() {
    const fams = [...new Set([state.displayFont, state.textFont])].map(n => getFont(n).api.replace(/ /g, '+'));
    return `<link href="https://fonts.googleapis.com/css2?family=${fams.join('&family=')}&display=swap" rel="stylesheet" />`;
  }

  const dialog = $('#exportDialog');
  $('#btnExport').addEventListener('click', () => {
    $('#exportCss').textContent = rootBlock();
    $('#exportLink').textContent = linkTag();
    dialog.showModal();
  });
  dialog.addEventListener('click', e => {
    const btn = e.target.closest('.a-copy'); if (!btn) return;
    copy($('#' + btn.dataset.copy).textContent, btn);
  });
  $('#btnDownloadCss').addEventListener('click', async () => {
    const btn = $('#btnDownloadCss');
    try {
      const src = await (await fetch('style.css', { cache: 'no-store' })).text();
      if (!/:root\s*\{[^}]*\}/.test(src)) throw new Error('no :root block');
      const patched = src.replace(/:root\s*\{[^}]*\}/, rootBlock());
      const url = URL.createObjectURL(new Blob([patched], { type: 'text/css' }));
      const a = h('a', { href: url, download: 'style.css' }); document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash(btn, 'Downloaded');
    } catch (err) {
      flash(btn, 'Failed — copy instead');
    }
  });

  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); flash(btn, 'Copied'); }
    catch (_) { flash(btn, 'Copy failed'); }
  }
  function flash(btn, msg) {
    const prev = btn.textContent; btn.textContent = msg; btn.classList.add('is-ok');
    setTimeout(() => { btn.textContent = prev; btn.classList.remove('is-ok'); }, 1400);
  }

  $('#btnShare').addEventListener('click', e => {
    const url = location.origin + location.pathname + encodeHash();
    history.replaceState(null, '', url);
    copy(url, e.currentTarget);
  });
  $('#btnReset').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    applyPreset(PRESETS[0]);
  });

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  if (location.protocol === 'file:') $('#fileNotice').hidden = false;
  renderPresets();
  renderColors();
  renderFontSelects();
  renderRanges('typeRanges', RANGES.type);
  renderRanges('layoutRanges', RANGES.layout);
  $('#modeSeg').querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.mode === view.mode));
  renderChips();
  syncSize();
  renderStage();
  update();
})();
