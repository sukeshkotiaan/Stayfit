import React from 'react';

const THEME_STORAGE_KEY = "stayfit_theme_v1";

const COLORS_DARK = {
  bg: "#0a0a0a", // Deep OLED black
  card: "#121212", // Elevated dark
  card2: "#1a1a1a",
  card3: "#222222",
  border: "rgba(255,255,255,0.08)",
  accent: "#DFFF00", // High-visibility chartreuse/neon lime
  accent2: "#A5FF00",
  accent3: "#FFFFFF",
  warn: "#FF3366",
  text: "#FFFFFF",
  muted: "#888888",
  success: "#DFFF00",
  purple: "#888888", // Removed purple, mapped to neutral
  gold: "#FFD700",
  glass: "#121212", // Replaced glass with solid flat for premium feel
  glassBorder: "rgba(255, 255, 255, 0.08)",
  glassHighlight: "rgba(255, 255, 255, 0.02)",
  mesh1: "#0a0a0a",
  mesh2: "#0a0a0a",
  mesh3: "#0a0a0a",
};

const COLORS_LIGHT = {
  ...COLORS_DARK,
  bg: "#F9FAFB",
  card: "#FFFFFF",
  card2: "#F3F4F6",
  card3: "#E5E7EB",
  border: "rgba(0, 0, 0, 0.06)",
  text: "#111827",
  muted: "#6B7280",
  accent: "#111827", // Stark black on white for premium look
  accent2: "#374151",
  success: "#10B981",
  glass: "#FFFFFF",
  glassBorder: "rgba(0, 0, 0, 0.06)",
  glassHighlight: "rgba(255, 255, 255, 1)",
  mesh1: "#F9FAFB",
  mesh2: "#F9FAFB",
  mesh3: "#F9FAFB",
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
  return "dark"; // Default to dark for fitness
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
  const cardBase = {
    background: C.card,
    border: `1px solid ${C.border}`,
    boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.02)",
  };

  return {
    glass: cardBase, // Keeping the key 'glass' to not break App.jsx, but it's flat now
    app: {
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Inter', sans-serif",
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
      padding: "1rem",
      position: "relative",
      zIndex: 1,
    },
    card: {
      ...cardBase,
      borderRadius: 16,
      padding: "2rem",
      width: "100%",
      maxWidth: 440,
    },
    input: {
      width: "100%",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "12px 16px",
      color: C.text,
      fontSize: 15,
      fontFamily: "'Inter', sans-serif",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.2s",
    },
    select: {
      width: "100%",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "12px 16px",
      color: C.text,
      fontSize: 15,
      fontFamily: "'Inter', sans-serif",
      outline: "none",
    },
    btn: {
      background: C.accent,
      border: "none",
      borderRadius: 8,
      padding: "14px 28px",
      color: isDark ? "#000000" : "#FFFFFF",
      fontWeight: 600,
      fontSize: 15,
      cursor: "pointer",
      width: "100%",
      fontFamily: "'Inter', sans-serif",
      letterSpacing: "0.01em",
      transition: "opacity 0.2s",
    },
    btnSm: {
      background: C.card2,
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      padding: "8px 16px",
      color: C.text,
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
      fontFamily: "'Inter', sans-serif",
      transition: "all 0.15s",
    },
    btnDanger: {
      background: "transparent",
      border: `1px solid ${C.warn}40`,
      borderRadius: 6,
      padding: "8px 16px",
      color: C.warn,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "'Inter', sans-serif",
    },
    label: {
      fontSize: 13,
      color: C.muted,
      marginBottom: 8,
      display: "block",
      fontWeight: 500,
      letterSpacing: "0.01em",
      textTransform: "uppercase",
    },
    row: { display: "flex", gap: 12, alignItems: "center" },
    metricCard: {
      ...cardBase,
      borderRadius: 12,
      padding: "16px 20px",
    },
    nav: {
      ...cardBase,
      borderRadius: 0,
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      padding: "14px 28px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    bottomNav: {
      background: C.card,
      borderTop: `1px solid ${C.border}`,
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      zIndex: 1000,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    },
    drawer: {
      background: C.card,
      borderTop: `1px solid ${C.border}`,
      borderRadius: "16px 16px 0 0",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1002,
      padding: "16px",
      paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
      boxShadow: isDark ? "0 -4px 24px rgba(0,0,0,0.5)" : "0 -4px 24px rgba(0,0,0,0.05)",
    },
    modal: {
      ...cardBase,
      borderRadius: 16,
      padding: 24,
      maxWidth: 380,
      width: "100%",
    },
    pill: (active) => ({
      padding: "8px 20px",
      borderRadius: 22,
      border: active ? "none" : `1px solid ${C.border}`,
      background: active ? C.text : C.bg,
      color: active ? C.bg : C.text,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "'Inter', sans-serif",
      fontWeight: 500,
      transition: "all 0.18s",
    }),
    tabPanel: {
      animation: "sfFadeIn 0.2s ease forwards",
    },
  };
}

function globalStylesCss(isDark) {
  const optBg = isDark ? "#121212" : "#ffffff";
  const optColor = isDark ? "#ffffff" : "#111827";
  return `
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { display: none; } /* Clean, app-like feel */
    input[type=number]::-webkit-inner-spin-button { display: none; }
    select option { background: ${optBg}; color: ${optColor}; }
    @keyframes sfFadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sfShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .sf-fade-in { animation: sfFadeIn 0.25s ease forwards; }
    .sf-skeleton {
      background: linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"} 25%, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"} 50%, ${isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"} 75%);
      background-size: 200% 100%;
      animation: sfShimmer 1.4s ease infinite;
      border-radius: 4px;
    }
  `;
}

function GlobalStyles({ isDark }) {
  return <style>{globalStylesCss(isDark)}</style>;
}

function MeshBackground({ C, isDark }) {
  // Removed animated gradient meshes to align with modern minimal guidelines
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
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Theme</div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16 }}>Interface appearance</div>
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
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { resolveIsDark, getThemeColors, loadStoredTheme, saveTheme, applyCssVars, buildStyles, globalStylesCss, GlobalStyles, MeshBackground, ThemePicker };
