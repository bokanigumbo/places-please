import { useState, useEffect, useRef, useCallback } from "react";

// ── fonts via google ──────────────────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');`;

// ── colour tokens ─────────────────────────────────────────────────────────────
// light mode uses paper-white with ink; dark mode is the backstage default
const TOKENS = {
  dark: {
    bg: "#0D0D0D", surface: "#141414", surfaceHigh: "#1A1A1A",
    border: "#222", borderMid: "#2A2A2A", borderHigh: "#333",
    text: "#F5F0E8", textMid: "#C8C0B0", textLow: "#888", textMuted: "#555", textGhost: "#3A3A3A",
    amber: "#E8C547", amberDim: "#8a7529",
    hazard: "#E05A5A", hazardBg: "#1f0e0e", hazardBorder: "#4a1a1a",
    cueColors: { LX: "#5B8FE8", SQ: "#7EC8A0", FLY: "#C87EC8", PYR: "#E87A5B", TABS: "#A0C8E8", VIDEO: "#E8B45B", MICS: "#7EC8C8" }
  },
  light: {
    bg: "#F5F0E8", surface: "#FFFFFF", surfaceHigh: "#F0EBE0",
    border: "#DDD", borderMid: "#CCC", borderHigh: "#BBB",
    text: "#1A1A1A", textMid: "#333", textLow: "#666", textMuted: "#888", textGhost: "#BBB",
    amber: "#B8961F", amberDim: "#D4B23A",
    hazard: "#C0392B", hazardBg: "#FEF0EF", hazardBorder: "#F5C6C3",
    cueColors: { LX: "#2E5FA3", SQ: "#2E7D5A", FLY: "#7D3FA3", PYR: "#A33F2E", TABS: "#2E6A8F", VIDEO: "#8F6A2E", MICS: "#2E8F8F" }
  }
};

// cue types and hazard types
const CUE_TYPES = ["LX", "SQ", "FLY", "PYR", "TABS", "VIDEO", "MICS"];
const HAZARD_TYPES = ["Pyro", "Fog", "Strobe", "Flying", "Live flame", "Firearms"];

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEY = "places-please-v2";
function loadFromStorage() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveToStorage(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// ── id generator ──────────────────────────────────────────────────────────────
let _id = Date.now();
const uid = () => String(++_id);

// ── default shapes ────────────────────────────────────────────────────────────
const newShow = () => ({ id: uid(), name: "", venue: "", date: "", director: "", dsm: "", curtainUp: "19:30", acts: [{ id: uid(), name: "Act 1" }], scenes: [] });
const newScene = () => ({ id: uid(), name: "", actId: null, cast: "", wings: "", cues: [], hazards: [], notes: "", duration: "", isIntermission: false });

// ── css ───────────────────────────────────────────────────────────────────────
function buildCSS(t) {
  return `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${t.bg}; color: ${t.text}; font-family: 'Inter', sans-serif; min-height: 100vh; transition: background 0.2s, color 0.2s; }

  /* scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${t.borderMid}; border-radius: 3px; }

  .app { display: flex; flex-direction: column; min-height: 100vh; }

  /* header */
  .hdr { padding: 16px 28px; border-bottom: 1px solid ${t.borderMid}; display: flex; align-items: center; gap: 16px; justify-content: space-between; background: ${t.surface}; }
  .hdr-left { display: flex; align-items: baseline; gap: 14px; }
  .hdr h1 { font-family: 'Playfair Display', serif; font-size: 24px; color: ${t.text}; letter-spacing: -0.3px; }
  .hdr .tagline { font-size: 11px; color: ${t.textMuted}; letter-spacing: 0.1em; text-transform: uppercase; }
  .hdr-right { display: flex; gap: 10px; align-items: center; }

  /* layout */
  .layout { display: flex; flex: 1; overflow: hidden; }

  /* shows panel */
  .shows-panel { width: 200px; min-width: 160px; background: ${t.surfaceHigh}; border-right: 1px solid ${t.borderMid}; display: flex; flex-direction: column; overflow: hidden; }
  .shows-panel-header { padding: 14px 16px 10px; border-bottom: 1px solid ${t.border}; }
  .shows-list { flex: 1; overflow-y: auto; padding: 8px 0; }
  .show-item { padding: 10px 16px; cursor: pointer; font-size: 13px; color: ${t.textLow}; border-left: 3px solid transparent; transition: all 0.12s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .show-item:hover { background: ${t.surface}; color: ${t.text}; }
  .show-item.active { border-left-color: ${t.amber}; color: ${t.text}; background: ${t.surface}; font-weight: 500; }
  .shows-panel-footer { padding: 10px 12px; border-top: 1px solid ${t.border}; }

  /* sidebar */
  .sidebar { width: 300px; min-width: 260px; background: ${t.surface}; border-right: 1px solid ${t.borderMid}; display: flex; flex-direction: column; overflow: hidden; }
  .sidebar-tabs { display: flex; border-bottom: 1px solid ${t.borderMid}; }
  .s-tab { flex: 1; padding: 10px 6px; font-size: 12px; font-weight: 500; text-align: center; cursor: pointer; color: ${t.textLow}; border-bottom: 2px solid transparent; transition: all 0.12s; background: none; border-top: none; border-left: none; border-right: none; font-family: 'Inter', sans-serif; }
  .s-tab:hover { color: ${t.text}; }
  .s-tab.active { color: ${t.amber}; border-bottom-color: ${t.amber}; }
  .sidebar-body { flex: 1; overflow-y: auto; padding: 20px 18px; display: flex; flex-direction: column; gap: 16px; }

  /* main */
  .main { flex: 1; overflow-y: auto; padding: 28px 32px; background: ${t.bg}; }

  /* form elements */
  .sec-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${t.textMuted}; margin-bottom: 10px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 12px; color: ${t.textLow}; font-weight: 500; }
  .field input, .field textarea, .field select {
    background: ${t.surfaceHigh}; border: 1px solid ${t.borderMid}; border-radius: 6px;
    color: ${t.text}; font-family: 'Inter', sans-serif; font-size: 13px;
    padding: 9px 11px; outline: none; width: 100%; transition: border-color 0.15s; resize: vertical;
  }
  .field input:focus, .field textarea:focus, .field select:focus { border-color: ${t.amber}; }
  .field input::placeholder, .field textarea::placeholder { color: ${t.textGhost}; }
  .field select option { background: ${t.surface}; }

  /* pills */
  .pills { display: flex; flex-wrap: wrap; gap: 5px; }
  .pill { padding: 4px 10px; border-radius: 20px; border: 1px solid ${t.borderMid}; background: ${t.surfaceHigh}; color: ${t.textLow}; font-size: 11px; cursor: pointer; transition: all 0.12s; font-family: 'JetBrains Mono', monospace; }
  .pill:hover { border-color: ${t.borderHigh}; color: ${t.text}; }
  .pill.active-cue { background: transparent; border-color: transparent; color: ${t.text}; font-weight: 600; }
  .pill.active-hazard { background: ${t.hazardBg}; border-color: ${t.hazard}; color: ${t.hazard}; font-weight: 600; font-family: 'Inter', sans-serif; }

  /* act group pill */
  .pill.active-act { background: ${t.amber}; border-color: ${t.amber}; color: #0D0D0D; font-weight: 600; font-family: 'Inter', sans-serif; }

  /* buttons */
  .btn-primary { background: ${t.amber}; color: #0D0D0D; border: none; border-radius: 6px; padding: 10px 14px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; width: 100%; transition: opacity 0.15s; }
  .btn-primary:hover { opacity: 0.85; }
  .btn-ghost { background: transparent; color: ${t.textLow}; border: 1px solid ${t.borderMid}; border-radius: 6px; padding: 9px 14px; font-family: 'Inter', sans-serif; font-size: 12px; cursor: pointer; width: 100%; transition: all 0.15s; }
  .btn-ghost:hover { border-color: ${t.borderHigh}; color: ${t.text}; }
  .btn-icon { background: none; border: none; cursor: pointer; color: ${t.textGhost}; font-size: 15px; padding: 2px 5px; border-radius: 4px; transition: color 0.12s; line-height: 1; font-family: 'Inter', sans-serif; }
  .btn-icon:hover { color: ${t.textLow}; }
  .btn-icon.danger:hover { color: ${t.hazard}; }
  .btn-sm { background: transparent; color: ${t.textLow}; border: 1px solid ${t.borderMid}; border-radius: 5px; padding: 6px 12px; font-family: 'Inter', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.12s; white-space: nowrap; }
  .btn-sm:hover { border-color: ${t.amber}; color: ${t.amber}; }
  .btn-sm.active { border-color: ${t.amber}; color: ${t.amber}; }

  /* show header on main */
  .show-hdr { margin-bottom: 28px; padding-bottom: 18px; border-bottom: 1px solid ${t.borderMid}; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
  .show-title { font-family: 'Playfair Display', serif; font-size: 32px; color: ${t.text}; line-height: 1.1; }
  .show-meta { font-size: 12px; color: ${t.textMuted}; margin-top: 5px; display: flex; gap: 16px; flex-wrap: wrap; }
  .show-hdr-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

  /* runtime bar */
  .runtime-bar { background: ${t.surface}; border: 1px solid ${t.borderMid}; border-radius: 8px; padding: 12px 18px; display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 24px; }
  .runtime-stat { display: flex; flex-direction: column; gap: 2px; }
  .runtime-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: ${t.textMuted}; }
  .runtime-value { font-family: 'JetBrains Mono', monospace; font-size: 18px; color: ${t.amber}; font-weight: 600; }
  .runtime-value.warn { color: ${t.hazard}; }

  /* act groups */
  .act-group { margin-bottom: 24px; }
  .act-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; cursor: pointer; user-select: none; }
  .act-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: ${t.textMuted}; font-weight: 600; }
  .act-line { flex: 1; height: 1px; background: ${t.borderMid}; }
  .act-toggle { font-size: 11px; color: ${t.textMuted}; }
  .act-runtime { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${t.amberDim}; }

  /* scene cards */
  .scenes-list { display: flex; flex-direction: column; gap: 8px; }
  .scene-card { display: flex; background: ${t.surface}; border: 1px solid ${t.border}; border-radius: 8px; overflow: hidden; transition: border-color 0.12s, box-shadow 0.12s; position: relative; cursor: grab; }
  .scene-card:hover { border-color: ${t.borderHigh}; }
  .scene-card.dragging { opacity: 0.4; }
  .scene-card.drag-over { box-shadow: 0 -3px 0 ${t.amber}; }
  .scene-card.has-hazard { border-color: ${t.hazardBorder}; background: ${t.hazardBg}; }

  /* the signature amber cue tape */
  .cue-tape { width: 4px; flex-shrink: 0; background: ${t.amber}; }
  .cue-tape.hazard-tape { background: ${t.hazard}; }

  .scene-body { flex: 1; padding: 14px 18px; display: flex; flex-direction: column; gap: 7px; }
  .scene-top { display: flex; align-items: baseline; gap: 10px; justify-content: space-between; }
  .scene-number { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${t.amber}; letter-spacing: 0.05em; font-weight: 600; flex-shrink: 0; }
  .scene-name { font-size: 15px; font-weight: 600; color: ${t.text}; flex: 1; }
  .scene-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .drag-handle { cursor: grab; color: ${t.textGhost}; font-size: 14px; padding: 2px 4px; user-select: none; }

  .scene-details { display: flex; gap: 20px; flex-wrap: wrap; }
  .detail-group { display: flex; flex-direction: column; gap: 1px; }
  .detail-label { font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase; color: ${t.textMuted}; }
  .detail-value { font-size: 12px; color: ${t.textMid}; }

  .cue-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .cue-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; padding: 2px 7px; border-radius: 3px; border: 1px solid; }
  .hazard-tags { display: flex; gap: 5px; flex-wrap: wrap; }
  .hazard-tag { font-size: 10px; padding: 2px 8px; border-radius: 3px; background: ${t.hazardBg}; border: 1px solid ${t.hazardBorder}; color: ${t.hazard}; font-weight: 600; letter-spacing: 0.04em; }
  .scene-notes { font-size: 11px; color: ${t.textMuted}; font-style: italic; border-top: 1px solid ${t.border}; padding-top: 7px; }
  .wings-row { font-size: 11px; color: ${t.textLow}; }
  .wings-label { color: ${t.textMuted}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-right: 6px; }

  /* intermission */
  .intermission-marker { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
  .int-line { flex: 1; height: 1px; background: ${t.borderMid}; }
  .int-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${t.textMuted}; letter-spacing: 0.12em; text-transform: uppercase; }

  /* empty */
  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; gap: 10px; color: ${t.textGhost}; text-align: center; }
  .empty-icon { font-size: 40px; opacity: 0.4; margin-bottom: 6px; }
  .empty p { font-size: 13px; max-width: 220px; line-height: 1.6; }

  /* calling mode */
  .calling-overlay { position: fixed; inset: 0; background: #050505; z-index: 200; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; }
  .calling-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
  .calling-title { font-family: 'Playfair Display', serif; font-size: 22px; color: ${t.amber}; }
  .calling-list { display: flex; flex-direction: column; gap: 20px; max-width: 680px; margin: 0 auto; width: 100%; }
  .calling-card { border-left: 4px solid ${t.amber}; padding: 18px 24px; background: #111; border-radius: 0 8px 8px 0; }
  .calling-card.calling-hazard { border-left-color: ${t.hazard}; }
  .calling-num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: ${t.amber}; margin-bottom: 4px; }
  .calling-scene-name { font-family: 'Playfair Display', serif; font-size: 26px; color: #F5F0E8; margin-bottom: 10px; }
  .calling-row { display: flex; gap: 28px; flex-wrap: wrap; }
  .calling-dl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #444; margin-bottom: 3px; }
  .calling-dv { font-size: 15px; color: #C8C0B0; }
  .calling-hazard-strip { background: #1f0a0a; border: 1px solid #4a1a1a; border-radius: 5px; padding: 6px 12px; margin-top: 10px; font-size: 12px; color: ${t.hazard}; font-weight: 600; }
  .calling-notes { margin-top: 10px; font-size: 13px; color: #555; font-style: italic; }

  /* wings view */
  .wings-overlay { position: fixed; inset: 0; background: #050505; z-index: 200; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; }
  .wings-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
  .wings-title { font-family: 'Playfair Display', serif; font-size: 22px; color: #F5F0E8; }
  .wings-list { display: flex; flex-direction: column; gap: 12px; max-width: 680px; margin: 0 auto; width: 100%; }
  .wings-card { background: #111; border: 1px solid #222; border-radius: 8px; padding: 14px 18px; display: flex; gap: 16px; align-items: flex-start; }
  .wings-card-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${t.amber}; min-width: 60px; padding-top: 2px; }
  .wings-card-body { flex: 1; }
  .wings-card-name { font-size: 15px; font-weight: 600; color: #F5F0E8; margin-bottom: 4px; }
  .wings-card-cast { font-size: 13px; color: #888; margin-bottom: 4px; }
  .wings-card-wings { font-size: 13px; color: #C8C0B0; }
  .wings-label-sm { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #444; margin-right: 6px; }

  /* toast */
  .toast { position: fixed; bottom: 24px; right: 24px; background: ${t.surface}; border: 1px solid ${t.borderMid}; border-radius: 8px; padding: 12px 18px; font-size: 13px; color: ${t.text}; z-index: 300; box-shadow: 0 4px 20px rgba(0,0,0,0.4); animation: slideUp 0.2s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* modal */
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 150; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: ${t.surface}; border: 1px solid ${t.borderMid}; border-radius: 10px; padding: 24px; width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 14px; }
  .modal h3 { font-family: 'Playfair Display', serif; font-size: 18px; color: ${t.text}; }
  .modal-actions { display: flex; gap: 8px; }

  /* act manager */
  .act-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
  .act-row input { flex: 1; }

  @media (max-width: 900px) {
    .shows-panel { display: none; }
    .sidebar { width: 260px; }
    .layout { flex-direction: column; overflow: visible; }
    .sidebar { width: 100%; border-right: none; border-bottom: 1px solid ${t.borderMid}; max-height: 50vh; }
    .main { padding: 20px 16px; }
    .calling-overlay, .wings-overlay { padding: 20px; }
  }

  @media print {
    .shows-panel, .sidebar, .hdr-right, .show-hdr-actions, .scene-actions, .runtime-bar .runtime-label { display: none !important; }
    .layout { display: block; }
    .main { padding: 0; background: white; }
    body { background: white; color: black; }
    .show-title { color: black; font-size: 26px; }
    .show-meta { color: #555; }
    .scene-card { border: 1px solid #ccc; break-inside: avoid; margin-bottom: 8px; background: white; }
    .cue-tape { background: #999 !important; }
    .scene-name, .detail-value { color: #111; }
    .scene-number, .act-label { color: #555; }
    .scene-notes { color: #777; }
    .act-line { background: #ccc; }
    .hazard-tag { color: #900; background: #fee; border-color: #fcc; }
    .intermission-marker { break-inside: avoid; }
    .runtime-bar { border: 1px solid #ccc; background: #fafafa; }
    .runtime-value { color: #333 !important; font-size: 14px; }
  }
`;
}

// ── helpers ───────────────────────────────────────────────────────────────────
function addMinutes(timeStr, mins) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}
function fmtDuration(totalMins) {
  if (!totalMins) return "—";
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
function formatDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch { return d; }
}

// ── main component ────────────────────────────────────────────────────────────
export default function PlacesPlease() {
  const storage = useRef(loadFromStorage());

  // theme
  const [theme, setTheme] = useState("dark");
  const t = TOKENS[theme];

  // shows list + current show
  const [shows, setShows] = useState(() => {
    const s = storage.current;
    return s.shows && s.shows.length ? s.shows : [newShow()];
  });
  const [activeShowId, setActiveShowId] = useState(() => {
    const s = storage.current;
    return s.activeShowId || shows[0]?.id;
  });
  const show = shows.find(s => s.id === activeShowId) || shows[0];

  // sidebar tab
  const [sideTab, setSideTab] = useState("show"); // "show" | "scene" | "acts"

  // scene form
  const [form, setForm] = useState(newScene());
  const [editingId, setEditingId] = useState(null);

  // overlays
  const [callingMode, setCallingMode] = useState(false);
  const [wingsMode, setWingsMode] = useState(false);
  const [deletingShowId, setDeletingShowId] = useState(null);

  // collapsed acts
  const [collapsedActs, setCollapsedActs] = useState({});

  // toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // drag
  const dragId = useRef(null);
  const dragOverId = useRef(null);

  // ── auto-save ───────────────────────────────────────────────────────────────
  useEffect(() => {
    saveToStorage({ shows, activeShowId });
  }, [shows, activeShowId]);

  // ── toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // ── show helpers ────────────────────────────────────────────────────────────
  function updateShow(key, val) {
    setShows(ss => ss.map(s => s.id === show.id ? { ...s, [key]: val } : s));
  }
  function addShow() {
    const s = newShow();
    setShows(ss => [...ss, s]);
    setActiveShowId(s.id);
    showToast("New show created");
  }
  function confirmDeleteShow() {
    if (shows.length === 1) { showToast("Can't delete the only show"); setDeletingShowId(null); return; }
    const remaining = shows.filter(s => s.id !== deletingShowId);
    setShows(remaining);
    if (activeShowId === deletingShowId) setActiveShowId(remaining[0].id);
    setDeletingShowId(null);
    showToast("Show deleted");
  }
  function duplicateShow() {
    const dup = { ...JSON.parse(JSON.stringify(show)), id: uid(), name: show.name + " (copy)" };
    setShows(ss => [...ss, dup]);
    setActiveShowId(dup.id);
    showToast("Show duplicated");
  }

  // ── act helpers ─────────────────────────────────────────────────────────────
  function addAct() {
    const acts = [...(show.acts || []), { id: uid(), name: `Act ${(show.acts?.length || 0) + 1}` }];
    updateShow("acts", acts);
  }
  function updateAct(actId, name) {
    updateShow("acts", show.acts.map(a => a.id === actId ? { ...a, name } : a));
  }
  function deleteAct(actId) {
    if ((show.acts || []).length <= 1) { showToast("Need at least one act"); return; }
    updateShow("acts", show.acts.filter(a => a.id !== actId));
    // re-assign orphaned scenes to first remaining act
    const fallback = show.acts.find(a => a.id !== actId)?.id;
    setShows(ss => ss.map(s => s.id === show.id ? {
      ...s,
      acts: s.acts.filter(a => a.id !== actId),
      scenes: s.scenes.map(sc => sc.actId === actId ? { ...sc, actId: fallback } : sc)
    } : s));
  }
  function toggleAct(actId) {
    setCollapsedActs(c => ({ ...c, [actId]: !c[actId] }));
  }

  // ── scene helpers ───────────────────────────────────────────────────────────
  function updateScenes(fn) {
    setShows(ss => ss.map(s => s.id === show.id ? { ...s, scenes: fn(s.scenes) } : s));
  }
  function toggleCue(cue) {
    setForm(f => ({ ...f, cues: f.cues.includes(cue) ? f.cues.filter(c => c !== cue) : [...f.cues, cue] }));
  }
  function toggleHazard(h) {
    setForm(f => ({ ...f, hazards: f.hazards.includes(h) ? f.hazards.filter(x => x !== h) : [...f.hazards, h] }));
  }
  function handleAddScene() {
    if (!form.name.trim()) { showToast("Scene needs a name"); return; }
    const actId = form.actId || show.acts?.[0]?.id;
    const scene = { ...form, actId };
    if (editingId) {
      updateScenes(ss => ss.map(s => s.id === editingId ? { ...scene, id: editingId } : s));
      setEditingId(null);
      showToast("Scene updated");
    } else {
      updateScenes(ss => [...ss, { ...scene, id: uid() }]);
      showToast("Scene added");
    }
    setForm(newScene());
  }
  function addIntermission() {
    updateScenes(ss => [...ss, { ...newScene(), id: uid(), name: "INTERMISSION", duration: "15", isIntermission: true, actId: show.acts?.[0]?.id }]);
  }
  function deleteScene(id) {
    updateScenes(ss => ss.filter(s => s.id !== id));
  }
  function startEdit(scene) {
    setForm({ ...scene });
    setEditingId(scene.id);
    setSideTab("scene");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function cancelEdit() {
    setEditingId(null);
    setForm(newScene());
  }

  // ── drag to reorder ─────────────────────────────────────────────────────────
  function onDragStart(e, id) { dragId.current = id; e.dataTransfer.effectAllowed = "move"; }
  function onDragOver(e, id) { e.preventDefault(); dragOverId.current = id; }
  function onDrop(e) {
    e.preventDefault();
    if (!dragId.current || dragId.current === dragOverId.current) return;
    updateScenes(ss => {
      const from = ss.findIndex(s => s.id === dragId.current);
      const to = ss.findIndex(s => s.id === dragOverId.current);
      if (from < 0 || to < 0) return ss;
      const next = [...ss];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    dragId.current = null;
    dragOverId.current = null;
  }

  // ── runtime calculations ────────────────────────────────────────────────────
  const scenes = show.scenes || [];
  const totalMins = scenes.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
  const intermissionMins = scenes.filter(s => s.isIntermission).reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
  const performanceMins = totalMins - intermissionMins;
  const estimatedEnd = show.curtainUp ? addMinutes(show.curtainUp, totalMins) : "";

  // ── per-act runtime ─────────────────────────────────────────────────────────
  function actRuntime(actId) {
    return scenes.filter(s => s.actId === actId && !s.isIntermission).reduce((a, s) => a + (parseInt(s.duration) || 0), 0);
  }

  // ── render ──────────────────────────────────────────────────────────────────
  let sceneCounter = 0;

  // group scenes by act
  const acts = show.acts || [];
  const scenesByAct = {};
  acts.forEach(a => { scenesByAct[a.id] = []; });
  const unassigned = [];
  scenes.forEach(s => {
    if (s.actId && scenesByAct[s.actId]) scenesByAct[s.actId].push(s);
    else unassigned.push(s);
  });

  return (
    <>
      <style>{FONTS + buildCSS(t)}</style>

      {/* calling mode */}
      {callingMode && (() => {
        let cn = 0;
        return (
          <div className="calling-overlay">
            <div className="calling-hdr">
              <div className="calling-title">{show.name || "Run Sheet"} — Calling View</div>
              <button className="btn-sm" onClick={() => setCallingMode(false)}>✕ Exit</button>
            </div>
            <div className="calling-list">
              {scenes.length === 0 && <p style={{ color: "#444", textAlign: "center" }}>No scenes yet.</p>}
              {scenes.map(sc => {
                if (sc.isIntermission) return (
                  <div key={sc.id} style={{ textAlign: "center", padding: "12px 0", color: "#444", fontFamily: "JetBrains Mono", fontSize: 11, letterSpacing: "0.12em" }}>
                    — INTERMISSION {sc.duration ? `· ${sc.duration} min` : ""} —
                  </div>
                );
                cn++;
                return (
                  <div key={sc.id} className={`calling-card${sc.hazards?.length ? " calling-hazard" : ""}`}>
                    <div className="calling-num">SCENE {String(cn).padStart(2, "0")}</div>
                    <div className="calling-scene-name">{sc.name}</div>
                    <div className="calling-row">
                      {sc.cast && <div><div className="calling-dl">Cast</div><div className="calling-dv">{sc.cast}</div></div>}
                      {sc.duration && <div><div className="calling-dl">Duration</div><div className="calling-dv">{sc.duration} min</div></div>}
                      {sc.cues?.length > 0 && <div><div className="calling-dl">Cues</div><div className="calling-dv">{sc.cues.join(" · ")}</div></div>}
                    </div>
                    {sc.hazards?.length > 0 && <div className="calling-hazard-strip">⚠ {sc.hazards.join(" · ")}</div>}
                    {sc.notes && <div className="calling-notes">{sc.notes}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* wings view */}
      {wingsMode && (() => {
        let wn = 0;
        const wingScenes = scenes.filter(s => !s.isIntermission);
        return (
          <div className="wings-overlay">
            <div className="wings-hdr">
              <div className="wings-title">{show.name || "Run Sheet"} — Wings</div>
              <button className="btn-sm" onClick={() => setWingsMode(false)}>✕ Exit</button>
            </div>
            <div className="wings-list">
              {wingScenes.length === 0 && <p style={{ color: "#444", textAlign: "center" }}>No scenes yet.</p>}
              {wingScenes.map((sc, i) => {
                wn++;
                const nextSc = wingScenes[i + 1];
                return (
                  <div key={sc.id} className="wings-card">
                    <div className="wings-card-num">SCENE {String(wn).padStart(2, "0")}</div>
                    <div className="wings-card-body">
                      <div className="wings-card-name">{sc.name}</div>
                      {sc.cast && <div className="wings-card-cast"><span className="wings-label-sm">On stage</span>{sc.cast}</div>}
                      {sc.wings && <div className="wings-card-wings"><span className="wings-label-sm">In wings</span>{sc.wings}</div>}
                      {nextSc && <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
                        <span className="wings-label-sm">Next</span>{nextSc.name}{nextSc.cast ? ` — ${nextSc.cast}` : ""}
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* delete show modal */}
      {deletingShowId && (
        <div className="modal-bg">
          <div className="modal">
            <h3>Delete show?</h3>
            <p style={{ fontSize: 13, color: t.textLow }}>"{shows.find(s => s.id === deletingShowId)?.name || "Untitled"}" will be permanently deleted.</p>
            <div className="modal-actions">
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeletingShowId(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: t.hazard }} onClick={confirmDeleteShow}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <div className="app">
        {/* header */}
        <header className="hdr">
          <div className="hdr-left">
            <h1>Places Please</h1>
            <span className="tagline">Run Sheet Generator</span>
          </div>
          <div className="hdr-right">
            <button className="btn-sm" onClick={() => setTheme(th => th === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "☀ Light" : "☽ Dark"}
            </button>
          </div>
        </header>

        <div className="layout">
          {/* shows panel */}
          <div className="shows-panel">
            <div className="shows-panel-header">
              <div className="sec-label">Your Shows</div>
            </div>
            <div className="shows-list">
              {shows.map(s => (
                <div key={s.id} className={`show-item${s.id === activeShowId ? " active" : ""}`} onClick={() => setActiveShowId(s.id)} title={s.name || "Untitled"}>
                  {s.name || "Untitled"}
                </div>
              ))}
            </div>
            <div className="shows-panel-footer">
              <button className="btn-ghost" onClick={addShow}>+ New show</button>
            </div>
          </div>

          {/* sidebar */}
          <aside className="sidebar">
            <div className="sidebar-tabs">
              {[["show", "Show"], ["scene", "Scene"], ["acts", "Acts"]].map(([id, label]) => (
                <button key={id} className={`s-tab${sideTab === id ? " active" : ""}`} onClick={() => setSideTab(id)}>{label}</button>
              ))}
            </div>

            <div className="sidebar-body">
              {/* show details tab */}
              {sideTab === "show" && <>
                <div className="field"><label>Show name</label><input value={show.name} onChange={e => updateShow("name", e.target.value)} placeholder="e.g. Into the Woods" /></div>
                <div className="field"><label>Venue</label><input value={show.venue} onChange={e => updateShow("venue", e.target.value)} placeholder="e.g. The Playhouse" /></div>
                <div className="field"><label>Date</label><input type="date" value={show.date} onChange={e => updateShow("date", e.target.value)} /></div>
                <div className="field"><label>Curtain up</label><input type="time" value={show.curtainUp} onChange={e => updateShow("curtainUp", e.target.value)} /></div>
                <div className="field"><label>Director</label><input value={show.director} onChange={e => updateShow("director", e.target.value)} placeholder="Director's name" /></div>
                <div className="field"><label>DSM / Stage Manager</label><input value={show.dsm} onChange={e => updateShow("dsm", e.target.value)} placeholder="Your name" /></div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="btn-ghost" style={{ flex: 1, fontSize: 11 }} onClick={duplicateShow}>Duplicate</button>
                  <button className="btn-ghost" style={{ flex: 1, fontSize: 11, color: t.hazard, borderColor: t.hazardBorder }} onClick={() => setDeletingShowId(show.id)}>Delete</button>
                </div>
              </>}

              {/* add scene tab */}
              {sideTab === "scene" && <>
                <div className="sec-label">{editingId ? "Editing scene" : "Add scene"}</div>
                <div className="field"><label>Scene name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Act 1 Scene 2" /></div>

                {/* act assignment */}
                {acts.length > 1 && (
                  <div className="field">
                    <label>Act</label>
                    <div className="pills">
                      {acts.map(a => (
                        <button key={a.id} className={`pill${(form.actId || acts[0]?.id) === a.id ? " active-act" : ""}`} onClick={() => setForm(f => ({ ...f, actId: a.id }))}>{a.name}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="field"><label>Cast on stage</label><input value={form.cast} onChange={e => setForm(f => ({ ...f, cast: e.target.value }))} placeholder="e.g. Alice, Bob, Ensemble" /></div>
                <div className="field"><label>In the wings (next scene prep)</label><input value={form.wings} onChange={e => setForm(f => ({ ...f, wings: e.target.value }))} placeholder="e.g. Carol ready SR" /></div>
                <div className="field"><label>Duration (mins)</label><input type="number" min="0" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 8" /></div>

                <div className="field"><label>Cue types</label>
                  <div className="pills" style={{ marginTop: 4 }}>
                    {CUE_TYPES.map(c => (
                      <button key={c} className={`pill${form.cues.includes(c) ? " active-cue" : ""}`}
                        style={form.cues.includes(c) ? { background: t.cueColors[c] + "22", borderColor: t.cueColors[c], color: t.cueColors[c] } : {}}
                        onClick={() => toggleCue(c)}>{c}</button>
                    ))}
                  </div>
                </div>

                <div className="field"><label>Hazards</label>
                  <div className="pills" style={{ marginTop: 4 }}>
                    {HAZARD_TYPES.map(h => (
                      <button key={h} className={`pill${form.hazards.includes(h) ? " active-hazard" : ""}`} onClick={() => toggleHazard(h)}>{h}</button>
                    ))}
                  </div>
                </div>

                <div className="field"><label>Notes / warnings</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Check flying harness before this scene" /></div>

                <button className="btn-primary" onClick={handleAddScene}>{editingId ? "Save changes" : "+ Add scene"}</button>
                {editingId
                  ? <button className="btn-ghost" onClick={cancelEdit}>Cancel edit</button>
                  : <button className="btn-ghost" onClick={addIntermission}>+ Add intermission</button>
                }
              </>}

              {/* acts manager tab */}
              {sideTab === "acts" && <>
                <div className="sec-label">Manage acts</div>
                {acts.map(a => (
                  <div key={a.id} className="act-row">
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <input value={a.name} onChange={e => updateAct(a.id, e.target.value)} placeholder="Act name" />
                    </div>
                    <button className="btn-icon danger" onClick={() => deleteAct(a.id)}>×</button>
                  </div>
                ))}
                <button className="btn-ghost" onClick={addAct}>+ Add act</button>
                <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4, lineHeight: 1.5 }}>Acts let you group scenes and get per-act runtimes. Assign a scene to an act in the Scene tab.</p>
              </>}
            </div>
          </aside>

          {/* main run sheet */}
          <main className="main">
            {/* show header */}
            <div className="show-hdr">
              <div>
                <div className="show-title">{show.name || "Your Show"}</div>
                <div className="show-meta">
                  {show.venue && <span>{show.venue}</span>}
                  {show.date && <span>{formatDate(show.date)}</span>}
                  {show.dsm && <span>DSM: {show.dsm}</span>}
                  {show.director && <span>Dir: {show.director}</span>}
                </div>
              </div>
              <div className="show-hdr-actions">
                {scenes.length > 0 && <>
                  <button className="btn-sm" onClick={() => { setSideTab("scene"); }}>+ Scene</button>
                  <button className="btn-sm" onClick={() => setWingsMode(true)}>Wings</button>
                  <button className="btn-sm" onClick={() => setCallingMode(true)}>Calling</button>
                  <button className="btn-sm" onClick={() => window.print()}>Print</button>
                </>}
              </div>
            </div>

            {/* runtime bar */}
            {scenes.length > 0 && (
              <div className="runtime-bar">
                <div className="runtime-stat">
                  <span className="runtime-label">Total runtime</span>
                  <span className="runtime-value">{fmtDuration(totalMins)}</span>
                </div>
                <div className="runtime-stat">
                  <span className="runtime-label">Performance</span>
                  <span className="runtime-value">{fmtDuration(performanceMins)}</span>
                </div>
                {intermissionMins > 0 && <div className="runtime-stat">
                  <span className="runtime-label">Interval</span>
                  <span className="runtime-value">{fmtDuration(intermissionMins)}</span>
                </div>}
                {show.curtainUp && <div className="runtime-stat">
                  <span className="runtime-label">Curtain up</span>
                  <span className="runtime-value">{show.curtainUp}</span>
                </div>}
                {estimatedEnd && <div className="runtime-stat">
                  <span className="runtime-label">Est. end</span>
                  <span className={`runtime-value${totalMins > 180 ? " warn" : ""}`}>{estimatedEnd}</span>
                </div>}
                <div className="runtime-stat">
                  <span className="runtime-label">Scenes</span>
                  <span className="runtime-value">{scenes.filter(s => !s.isIntermission).length}</span>
                </div>
              </div>
            )}

            {/* empty state */}
            {scenes.length === 0 && (
              <div className="empty">
                <div className="empty-icon">💡</div>
                <p>Add your first scene using the Scene tab on the left.</p>
              </div>
            )}

            {/* scenes grouped by act */}
            {acts.map(act => {
              const actScenes = [...(scenesByAct[act.id] || [])];
              if (actScenes.length === 0) return null;
              const isCollapsed = collapsedActs[act.id];
              const actMins = actRuntime(act.id);

              return (
                <div key={act.id} className="act-group">
                  <div className="act-header" onClick={() => toggleAct(act.id)}>
                    <span className="act-label">{act.name}</span>
                    {actMins > 0 && <span className="act-runtime">{fmtDuration(actMins)}</span>}
                    <div className="act-line" />
                    <span className="act-toggle">{isCollapsed ? "▸" : "▾"}</span>
                  </div>

                  {!isCollapsed && (
                    <div className="scenes-list">
                      {actScenes.map(sc => {
                        if (sc.isIntermission) return (
                          <div key={sc.id}>
                            <div className="intermission-marker">
                              <div className="int-line" />
                              <span className="int-label">Intermission{sc.duration ? ` · ${sc.duration} min` : ""}</span>
                              <div className="int-line" />
                              <button className="btn-icon danger" onClick={() => deleteScene(sc.id)}>×</button>
                            </div>
                          </div>
                        );

                        sceneCounter++;
                        const num = String(sceneCounter).padStart(2, "0");
                        const hasHazard = sc.hazards?.length > 0;

                        return (
                          <div
                            key={sc.id}
                            className={`scene-card${hasHazard ? " has-hazard" : ""}${dragId.current === sc.id ? " dragging" : ""}${dragOverId.current === sc.id ? " drag-over" : ""}`}
                            draggable
                            onDragStart={e => onDragStart(e, sc.id)}
                            onDragOver={e => onDragOver(e, sc.id)}
                            onDrop={onDrop}
                          >
                            <div className={`cue-tape${hasHazard ? " hazard-tape" : ""}`} />
                            <div className="scene-body">
                              <div className="scene-top">
                                <span className="drag-handle" title="Drag to reorder">⠿</span>
                                <span className="scene-number">SCENE {num}</span>
                                <span className="scene-name">{sc.name}</span>
                                <div className="scene-actions">
                                  <button className="btn-icon" title="Edit" onClick={() => startEdit(sc)}>✎</button>
                                  <button className="btn-icon danger" title="Delete" onClick={() => deleteScene(sc.id)}>×</button>
                                </div>
                              </div>

                              <div className="scene-details">
                                {sc.cast && <div className="detail-group"><span className="detail-label">Cast</span><span className="detail-value">{sc.cast}</span></div>}
                                {sc.duration && <div className="detail-group"><span className="detail-label">Duration</span><span className="detail-value">{sc.duration} min</span></div>}
                              </div>

                              {sc.wings && (
                                <div className="wings-row"><span className="wings-label">Wings</span>{sc.wings}</div>
                              )}

                              {sc.cues?.length > 0 && (
                                <div className="cue-tags">
                                  {sc.cues.map(c => (
                                    <span key={c} className="cue-tag" style={{ borderColor: t.cueColors[c] + "66", color: t.cueColors[c], background: t.cueColors[c] + "11" }}>{c}</span>
                                  ))}
                                </div>
                              )}

                              {hasHazard && (
                                <div className="hazard-tags">
                                  {sc.hazards.map(h => <span key={h} className="hazard-tag">⚠ {h}</span>)}
                                </div>
                              )}

                              {sc.notes && <div className="scene-notes">{sc.notes}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* unassigned scenes (shouldn't normally happen) */}
            {unassigned.length > 0 && (
              <div className="act-group">
                <div className="act-header">
                  <span className="act-label">Unassigned</span>
                  <div className="act-line" />
                </div>
                <div className="scenes-list">
                  {unassigned.map(sc => {
                    sceneCounter++;
                    return (
                      <div key={sc.id} className="scene-card" draggable onDragStart={e => onDragStart(e, sc.id)} onDragOver={e => onDragOver(e, sc.id)} onDrop={onDrop}>
                        <div className="cue-tape" />
                        <div className="scene-body">
                          <div className="scene-top">
                            <span className="scene-number">SCENE {String(sceneCounter).padStart(2, "0")}</span>
                            <span className="scene-name">{sc.name}</span>
                            <div className="scene-actions">
                              <button className="btn-icon" onClick={() => startEdit(sc)}>✎</button>
                              <button className="btn-icon danger" onClick={() => deleteScene(sc.id)}>×</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
