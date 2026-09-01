import React from 'react';

const THEME_STORAGE_KEY = "stayfit_theme_v1";

// ── Design Tokens ─────────────────────────────────────────────────────────────
// Palette: Deep navy dark / clean white light, emerald accent, amber highlight
// Feel: Premium wellness app — modern, fresh, trusted, friendly

const COLORS_DARK = {
  bg:             "#0F172A",  // Deep navy-slate (feels rich, not flat-black)
  card:           "#1E293B",  // Elevated card
  card2:          "#334155",  // Nested / secondary
  card3:          "#475569",  // Subtle dividers, chips
  border:         "rgba(148,163,184,0.12)",
  accent:         "#10B981",  // Emerald green — health, growth, vitality
  accent2:        "#34D399",  // Lighter emerald for highlights
  accent3:        "#F59E0B",  // Amber — goals, warnings, highlights
  warn:           "#F87171",  // Soft red
  text:           "#F1F5F9",  // Near-white, easy on eyes
  muted:          "#94A3B8",  // Slate-400
  success:        "#10B981",  // Alias accent
  purple:         "#818CF8",  // Indigo, variety
  gold:           "#FBBF24",  // Gold for streaks/badges
  glass:          "#1E293B",
  glassBorder:    "rgba(148,163,184,0.12)",
  glassHighlight: "rgba(255,255,255,0.03)",
  mesh1: "#0F172A", mesh2: "#0F172A", mesh3: "#0F172A",
};

const COLORS_LIGHT = {
  bg:             "#F8FAFC",  // Cool near-white
  card:           "#FFFFFF",
  card2:          "#F1F5F9",  // Slate-100
  card3:          "#E2E8F0",  // Slate-200
  border:         "rgba(15,23,42,0.07)",
  accent:         "#059669",  // Emerald-600 (darker = readable on white)
  accent2:        "#10B981",  // Emerald-500
  accent3:        "#D97706",  // Amber-600
  warn:           "#DC2626",  // Red-600
  text:           "#0F172A",  // Near-black
  muted:          "#64748B",  // Slate-500
  success:        "#059669",
  purple:         "#4F46E5",  // Indigo-600
  gold:           "#D97706",
  glass:          "#FFFFFF",
  glassBorder:    "rgba(15,23,42,0.07)",
  glassHighlight: "rgba(255,255,255,1)",
  mesh1: "#F8FAFC", mesh2: "#F8FAFC", mesh3: "#F8FAFC",
};

function resolveIsDark(themeMode) {
  if (themeMode === "dark") return true;
  if (themeMode === "light") return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return true;
}

function getThemeColors(isDark) {
  return isDark ? { ...COLORS_DARK } : { ...COLORS_LIGHT };
}

function loadStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch (_) {}
  return "dark";
}

function saveTheme(themeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  } catch (_) {}
}

function applyCssVars(C, isDark) {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  Object.entries(C).forEach(([k, v]) => r.style.setProperty(`--sf-${k}`, v));
  r.style.setProperty("--sf-is-dark", isDark ? "1" : "0");
  r.dataset.theme = isDark ? "dark" : "light";
}

function buildStyles(C, isDark) {
  const shadow = isDark
    ? "0 1px 3px rgba(0,0,0,0.4)"
    : "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)";
  const shadowMd = isDark
    ? "0 4px 16px rgba(0,0,0,0.5)"
    : "0 4px 16px rgba(15,23,42,0.08)";

  const cardBase = {
    background: C.card,
    border: `1px solid ${C.border}`,
    boxShadow: shadow,
  };

  return {
    glass: cardBase,
    app: {
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: C.text,
      display: "flex",
      flexDirection: "column",
      position: "relative",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    center: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      minHeight: "100vh",
      padding: "1.25rem",
      position: "relative",
      zIndex: 1,
    },
    card: {
      ...cardBase,
      borderRadius: 20,
      padding: "2rem",
      width: "100%",
      maxWidth: 440,
    },
    input: {
      width: "100%",
      background: isDark ? "rgba(255,255,255,0.04)" : C.card2,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "13px 16px",
      color: C.text,
      fontSize: 15,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.2s, box-shadow 0.2s",
      lineHeight: 1.4,
    },
    select: {
      width: "100%",
      background: isDark ? "rgba(255,255,255,0.04)" : C.card2,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "13px 16px",
      color: C.text,
      fontSize: 15,
      fontFamily: "inherit",
      outline: "none",
      appearance: "none",
      cursor: "pointer",
    },
    btn: {
      background: C.accent,
      border: "none",
      borderRadius: 12,
      padding: "15px 28px",
      color: "#FFFFFF",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      width: "100%",
      fontFamily: "inherit",
      letterSpacing: "0.01em",
      transition: "opacity 0.15s, transform 0.1s",
      boxShadow: isDark ? `0 0 0 0 ${C.accent}` : `0 2px 8px ${C.accent}44`,
    },
    btnSm: {
      background: isDark ? "rgba(255,255,255,0.06)" : C.card2,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "7px 14px",
      color: C.text,
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.15s",
    },
    btnDanger: {
      background: "transparent",
      border: `1px solid ${C.warn}50`,
      borderRadius: 8,
      padding: "7px 14px",
      color: C.warn,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "inherit",
    },
    label: {
      fontSize: 12,
      color: C.muted,
      marginBottom: 7,
      display: "block",
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    row: { display: "flex", gap: 12, alignItems: "center" },
    metricCard: {
      ...cardBase,
      borderRadius: 16,
      padding: "16px 18px",
    },
    nav: {
      background: C.card,
      borderBottom: `1px solid ${C.border}`,
      borderRadius: 0,
      padding: "12px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 100,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      boxShadow: isDark ? "none" : "0 1px 0 rgba(15,23,42,0.05)",
    },
    bottomNav: {
      background: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.96)",
      borderTop: `1px solid ${C.border}`,
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      zIndex: 1000,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      boxShadow: isDark ? "0 -1px 0 rgba(148,163,184,0.06)" : "0 -1px 0 rgba(15,23,42,0.06)",
    },
    drawer: {
      background: C.card,
      borderTop: `1px solid ${C.border}`,
      borderRadius: "20px 20px 0 0",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1002,
      padding: "20px 16px",
      paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
      boxShadow: isDark ? "0 -8px 40px rgba(0,0,0,0.6)" : "0 -8px 40px rgba(15,23,42,0.1)",
    },
    modal: {
      ...cardBase,
      borderRadius: 20,
      padding: 24,
      maxWidth: 380,
      width: "100%",
    },
    pill: (active) => ({
      padding: "9px 20px",
      borderRadius: 24,
      border: active ? "none" : `1px solid ${C.border}`,
      background: active ? C.accent : "transparent",
      color: active ? "#FFFFFF" : C.muted,
      cursor: "pointer",
      fontSize: 14,
      fontFamily: "inherit",
      fontWeight: active ? 700 : 500,
      transition: "all 0.18s",
    }),
    tabPanel: {
      animation: "sfFadeIn 0.2s ease forwards",
    },
  };
}

function globalStylesCss(isDark) {
  const optBg = isDark ? "#1E293B" : "#ffffff";
  const optColor = isDark ? "#F1F5F9" : "#0F172A";
  const accentColor = isDark ? "#10B981" : "#059669";
  return `
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { display: none; }
    input[type=number]::-webkit-inner-spin-button { display: none; }
    select option { background: ${optBg}; color: ${optColor}; }
    @keyframes sfFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sfShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes sfPulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    .sf-fade-in { animation: sfFadeIn 0.25s ease forwards; }
    .sf-tab-panel { animation: sfFadeIn 0.22s ease forwards; }
    .sf-skeleton {
      background: linear-gradient(90deg,
        ${isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)"} 25%,
        ${isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.08)"} 50%,
        ${isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)"} 75%);
      background-size: 200% 100%;
      animation: sfShimmer 1.5s ease infinite;
      border-radius: 8px;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: ${accentColor}66 !important;
      box-shadow: 0 0 0 3px ${accentColor}18 !important;
    }
    button:active { opacity: 0.82; transform: scale(0.97); }
  `;
}

function GlobalStyles({ isDark }) {
  return <style>{globalStylesCss(isDark)}</style>;
}

function MeshBackground({ C, isDark }) {
  return <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, background: C.bg }} />;
}

function ThemePicker({ themeMode, setThemeMode, COLORS, S, FONTS }) {
  const options = [
    { id: "dark", label: "Dark", icon: "🌙" },
    { id: "light", label: "Light", icon: "☀️" },
    { id: "system", label: "Auto", icon: "⚙️" },
  ];
  return (
    <div style={{ ...S.metricCard, marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: COLORS.text }}>Appearance</div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 14 }}>Interface theme</div>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setThemeMode(id)}
            style={{
              ...S.pill(themeMode === id),
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "10px 8px",
            }}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ fontSize: 13 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { resolveIsDark, getThemeColors, loadStoredTheme, saveTheme, applyCssVars, buildStyles, globalStylesCss, GlobalStyles, MeshBackground, ThemePicker };
