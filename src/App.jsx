import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "./firebase";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp, onSnapshot
} from "firebase/firestore";
// ── Theme (inlined — no separate theme.js needed) ─────────────────────────────
const THEME_STORAGE_KEY = "stayfit_theme_v1";

const COLORS_DARK = {
  bg: "#070d1a",
  card: "#0e1628",
  card2: "#131d30",
  card3: "#1a2540",
  border: "rgba(99,130,191,0.15)",
  accent: "#10e8b8",
  accent2: "#5b9cf6",
  accent3: "#fb8c3f",
  warn: "#f5455c",
  text: "#eef2ff",
  muted: "#7a88aa",
  success: "#10e8b8",
  purple: "#9b7cf8",
  gold: "#f5c543",
  glass: "rgba(14, 22, 40, 0.55)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  glassHighlight: "rgba(255, 255, 255, 0.06)",
  mesh1: "#0d1e3a",
  mesh2: "#0a1f2e",
  mesh3: "#102a45",
};

const COLORS_LIGHT = {
  ...COLORS_DARK,
  bg: "#e8f0ff",
  card: "rgba(255, 255, 255, 0.72)",
  card2: "rgba(255, 255, 255, 0.55)",
  card3: "#e4eaf5",
  border: "rgba(99, 130, 191, 0.22)",
  text: "#1a2340",
  muted: "#5a6a8a",
  glass: "rgba(255, 255, 255, 0.65)",
  glassBorder: "rgba(255, 255, 255, 0.9)",
  glassHighlight: "rgba(255, 255, 255, 0.8)",
  mesh1: "#dce8ff",
  mesh2: "#c5d8f5",
  mesh3: "#b8cce8",
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

const BLUR = "blur(20px) saturate(180%)";

function buildStyles(C, isDark) {
  const glassBase = {
    background: C.glass,
    backdropFilter: BLUR,
    WebkitBackdropFilter: BLUR,
    border: `1px solid ${C.glassBorder}`,
    boxShadow: isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
      : "0 8px 32px rgba(99, 130, 191, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
  };

  return {
    glass: glassBase,
    app: {
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Inter', 'DM Sans', sans-serif",
      color: C.text,
      display: "flex",
      flexDirection: "column",
      position: "relative",
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
      ...glassBase,
      borderRadius: 24,
      padding: "2rem",
      width: "100%",
      maxWidth: 440,
    },
    input: {
      width: "100%",
      background: isDark ? C.card2 : "rgba(255,255,255,0.85)",
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "11px 16px",
      color: C.text,
      fontSize: 15,
      fontFamily: "'Inter', 'DM Sans', sans-serif",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.2s",
    },
    select: {
      width: "100%",
      background: isDark ? C.card2 : "rgba(255,255,255,0.85)",
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: "11px 16px",
      color: C.text,
      fontSize: 15,
      fontFamily: "'Inter', 'DM Sans', sans-serif",
      outline: "none",
    },
    btn: {
      background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accent2} 100%)`,
      border: "none",
      borderRadius: 12,
      padding: "13px 28px",
      color: "#07121f",
      fontWeight: 700,
      fontSize: 15,
      cursor: "pointer",
      width: "100%",
      fontFamily: "'Inter', 'DM Sans', sans-serif",
      letterSpacing: "0.02em",
      boxShadow: `0 4px 20px ${C.accent}40`,
    },
    btnSm: {
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      border: `1px solid ${C.border}`,
      borderRadius: 9,
      padding: "7px 16px",
      color: C.muted,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "'Inter', 'DM Sans', sans-serif",
      transition: "all 0.15s",
    },
    btnDanger: {
      background: "transparent",
      border: `1px solid ${C.warn}77`,
      borderRadius: 9,
      padding: "7px 16px",
      color: C.warn,
      fontSize: 13,
      cursor: "pointer",
      fontFamily: "'Inter', 'DM Sans', sans-serif",
    },
    label: {
      fontSize: 13,
      color: C.muted,
      marginBottom: 6,
      display: "block",
      fontWeight: 500,
      letterSpacing: "0.01em",
    },
    row: { display: "flex", gap: 12, alignItems: "center" },
    metricCard: {
      ...glassBase,
      borderRadius: 16,
      padding: "16px 18px",
    },
    nav: {
      ...glassBase,
      borderRadius: 0,
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      padding: "13px 28px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    bottomNav: {
      ...glassBase,
      borderRadius: 0,
      borderBottom: "none",
      borderLeft: "none",
      borderRight: "none",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      display: "flex",
      zIndex: 1000,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    },
    drawer: {
      ...glassBase,
      borderRadius: "20px 20px 0 0",
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1002,
      padding: "12px 16px",
      paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
      boxShadow: isDark ? "0 -8px 32px rgba(0,0,0,0.5)" : "0 -8px 32px rgba(99,130,191,0.15)",
    },
    modal: {
      ...glassBase,
      borderRadius: 16,
      padding: 24,
      maxWidth: 340,
      width: "100%",
    },
    pill: (active) => ({
      padding: "8px 20px",
      borderRadius: 22,
      border: active ? "none" : `1px solid ${C.border}`,
      background: active
        ? `linear-gradient(135deg, ${C.accent} 0%, ${C.accent2} 100%)`
        : isDark ? C.card2 : "rgba(255,255,255,0.5)",
      color: active ? "#07121f" : C.muted,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "'Inter', 'DM Sans', sans-serif",
      fontWeight: active ? 700 : 500,
      transition: "all 0.18s",
      boxShadow: active ? `0 2px 12px ${C.accent}44` : "none",
    }),
    tabPanel: {
      animation: "sfTabIn 0.32s ease forwards",
    },
  };
}

function globalStylesCss(isDark) {
  const track = isDark ? "transparent" : "rgba(0,0,0,0.04)";
  const thumb = isDark ? "rgba(99,130,191,0.25)" : "rgba(99,130,191,0.35)";
  const optBg = isDark ? "#0e1628" : "#ffffff";
  const optColor = isDark ? "#eef2ff" : "#1a2340";
  return `
    * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: ${track}; }
    ::-webkit-scrollbar-thumb { background: ${thumb}; border-radius: 2px; }
    input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }
    select option { background: ${optBg}; color: ${optColor}; }
    @keyframes sfFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sfTabIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sfPulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
    @keyframes sfSlideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
    @keyframes sfMeshDrift { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(2%,-2%) scale(1.04); } 66% { transform: translate(-2%,2%) scale(0.98); } }
    @keyframes sfShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .sf-fade-in { animation: sfFadeIn 0.35s ease forwards; }
    .sf-tab-panel { animation: sfTabIn 0.32s ease forwards; }
    .sf-skeleton {
      background: linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} 25%, ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)"} 50%, ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} 75%);
      background-size: 200% 100%;
      animation: sfShimmer 1.4s ease infinite;
      border-radius: 8px;
    }
  `;
}

function GlobalStyles({ isDark }) {
  return <style>{globalStylesCss(isDark)}</style>;
}

function MeshBackground({ C, isDark }) {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none", background: C.bg }}>
      <div style={{
        position: "absolute", width: "70%", height: "70%", top: "-10%", left: "-10%",
        background: `radial-gradient(circle, ${C.accent}22 0%, transparent 70%)`,
        animation: "sfMeshDrift 18s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", width: "60%", height: "60%", bottom: "-5%", right: "-5%",
        background: `radial-gradient(circle, ${C.accent2}20 0%, transparent 70%)`,
        animation: "sfMeshDrift 22s ease-in-out infinite reverse",
      }} />
      <div style={{
        position: "absolute", width: "50%", height: "50%", top: "30%", left: "40%",
        background: `radial-gradient(circle, ${isDark ? C.mesh3 : C.mesh2}88 0%, transparent 65%)`,
        animation: "sfMeshDrift 26s ease-in-out infinite",
        animationDelay: "-8s",
      }} />
    </div>
  );
}

function ThemePicker({ themeMode, setThemeMode, COLORS, S, FONTS }) {
  const options = [
    { id: "dark", label: "Dark", icon: "🌙" },
    { id: "light", label: "Light", icon: "☀️" },
    { id: "system", label: "System", icon: "💻" },
  ];
  return (
    <div style={{ ...S.metricCard, marginBottom: 16 }}>
      <div style={{ fontFamily: FONTS.head, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Appearance</div>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Choose how VitaTrack looks on your device</div>
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
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "12px 8px",
            }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LOGO_SRC = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCARiBXoDASIAAhEBAxEB/8QAHQABAQADAAMBAQAAAAAAAAAAAAECBwgDBQYECf/EAFsQAAIABAQDBQELCQQGBwYFBQABAgMEEQUhMUEGYXEHCBJRgRMUIjI3cnSRobGysyMzNkJSYnN1wRUngtEkNENTksIWF0RjotLhJjVVZGWTJUaUo/AYRVTi8f/EABsBAQACAwEBAAAAAAAAAAAAAAABBgIEBQcD/8QAPREBAAEDAgEICQQBBAICAwEAAAECAwQFESEGEjE0QVFxsRMiMjNhgZGh0XLB4fAUIyRCQ1LxFWIWNVOy/9oADAMBAAIRAxEAPwDsrqQoAhcwnkNgGo9QswADIsgwKnfUepABQQtgJyLyIAG2hciIoBsEdgBSdSsgFeY6ksLgNykWY3AXFwAFyoiL0AdCBFQD1GYADMdSX2FgKS5WQC6gBgLcyF2AAELcCaADMCoDqTcBcbFehEgHMqJYuwD1D1INQKMhyADME1AFDJcMBmLoqGTYAepENgKyLyBQJuGCgS7L6kyADUtr7jYdABHpmHqFzAbZFVwADZELACvIC7AEyKgHYA+YGViAVkBQIXqS9ysAmGQAUIhWAYIgA6F2AAbEVysLIAg3mQAMkW9yJ5lANkv5FACxNQwgKQrYAepMxcvMCIbgAV2CdwQC6AjKwJuXMBgCW3F8ygNsiZsq1AE1KLjUCC5WS4FDexLl2AWy1AAEK+ZLhZ6gUW5jQlwGjKQuQEZb5EFgKCFQAXIUCZFuRIAUj1yKQCsmhQAempNC3FgG40IAK8iFfMgApCsCPMXBUA2CyIioCXKR6lAB3GguA6h+ZC6gPUepBuBWFcABmQoTAmw20K9Q8sgIrFRCgMhmC2Aj6k1FhoBQFmgkA3IGVZgQFZGAHqUgF6EWo2LqAICqwDYbDMARFIhqALlsCNWAZixQBEVAmjAo5EuXYCDYBALBFyJmBQQACkCAoWo1RADGhSPIBkBqUAgMiMBkVE6lQB5kLcgCwLmQCgEAq5kGQYAAoEAKBGXYaEsBVkGTMq0AZE5DUZgWxBcXQAuZEGBQmRgBruBawbALQDYIB1BeRLW3AFvkRlAmw1BQItQy7E3ABB3KAIV5IgDUJ2KABGgtSgRLMtr6gm+QBWDLuAILeRUOgEHUPNgCk6lJsBcibgLzAqugL3ImABdCoDG4BQJzAuAGxdibBZAAgxsADQAF2J1FwBXmQPkNgKmiMACvQmgv5hZsCksUARXBSbgNBcqJuBRsQIB0LkLWJcC9CbFGwEFygCFzDHUAwlYIAEHYiADcAoABkArIUiyAupMwvMAXUiF/IquBNS5kLfIAQZWHQBqUDYCMFIBSPUMIC7D0IUAQIACgltwAZSACk1C0AoBHyAtxcCwB8wR5lAg3HQAMhoUgFFhlYAL2BGAFrFRNy9AJuXcnUoE3C8i32IBQ7C4fICIrzJoXUCFRBmAvcAAUOwuQAwLsqAMMifmABdWQvQBmMiN7AAV5oJEAIWBQILFYAjF7jYWApHcFbALQMbEYAtggBAABQyCwBIpNxmBdgNSAHmEBtkALsQcgLzIy5jcCWBRYCXtoOo5FvYCWFgAAtkABbbi6F9iWzADUbBAXUnIqDABXIigRhBhWAq1G5BzArzIVkADIMuoAIACBgoE6i5epFqBSB6jMCgjH1gUgQzALUDcoE2Fg9CgQblGYAMACNZhOxSICkGmw9ALkLXAAhSIMC6AEdgKCLqAGdxqXqQAUgAo3Iy3AaAACcigjApHqUWAmrDKLXAiBdgBAtbAAXQl7svQMCFJqgBRqQoBsgZc9AIVggAIFuBLlHQgFyZChgRlJyKBNWXciGQFbG4DAhSNFAE3KAIy7BgCWKQrAEbA9ADKSxQDA3JmBSAAXQXGwAMhbAAS6GrGQDMAMCkbsEALlYmpVYMAQrIAZepOpdQJuVCzCYE3HUPkEBULhoAACAUg3KABBroBbhgZASw6h2AAuYGwEsW1yFAi8ijJhARgo3AEDyC1AIW5l3JyAuZGwMtwAAAoRC6gRhaAqAjKr2IXkBAik3AuxL+QZQFsgLkYFI9ShAS7KmNggBC6EAtvIjBQIwhYAEVkuXMBbK4I7lSAj1DLYjAalREUA0NgAJ6AoAakKM7gQMpLAEAygLkuUABoyX8igEAgBCvMgAtiJFsLoCMqyHqOQEyKNx0AmdyhEAFDIA3LzIWwEKNgAGxLBAUhQACIAK2kQalAm5Q8iAUZEYfkBSPoEUBohsRgA7gXLsAIUlgGYGQAPMCxQC5kVrl6kWoFYGgAmhUCAUjZdiXfkBSFCAnMFYzAERUAJYWGSDQBjcWDAoZGAGRRsTMColhuW4ELkCAUiBQILAAUhdiWQFsOhC7AQrIi23AnMIqsAIUWIBQQoEvsX6AAJ1F7Fy0IABdwBNgtBcXApEUATcFSyAAMMmoFIBoBdgNgBEN8igARlAADIm+QFINhZ+YALUFAhdgAICgBqQpGBQRIAUhRqgABALcmw6DPyApMrgq8wJ0DzKTcAWw5Es7gAhYrAO1xkAwJbMpAkA6FWRAgK0NiMK4DItgNABEUbARi7C5lAhSMagXoRDqAL6kZVYAFmNyXLzANggzAo6hEsBSNhjUArgLIAORbhCyAnUtyaMcwKkNSMq0AIZAMByJmWwQBgPzPBXVdPRU0dTVTpcmTLV4444rKFdSJmIjeUTMRG8vO+Z4aqqp6WU51ROlypSzcUyJQperNT8X9rTUcdLw5JUSWTq50OX+GH+r+g1riuLYji05z8Trp9VG/95HdLotEcDL5QWbU821HOn7OLk63at8Lcc6fs31iXaLwnRxeH+1FURLangcf16HpKjtdwOW/yeH4jNXmlAvtZpK/lkPFfI41fKDLqnhtHy/LlV63k1Tw2j5fluqV2xYHHFaPDsRlrztA/6nu8L7SOE62JQvEXTxPaoluBfToc82Q11FGv5dM8dp+X4KNayqZ4zE/L8OrqKtpa2Sp1JUSZ8t6Ry41EvqP0J5XOV8LxCswyep+H1c+lmL9aVG1fqtGbH4U7V6iVFBT8QSPby9PdMmG0S5uHR+h2MXlDZuTzb0c2fs6mNrlqvhdjmz9m4tiX8j8mF4lRYnRwVdDUy6iRGvexwO66PyfI/Wjv01RVG9M7w7dNUVRvHQa6i5SGSVAFrgNBcgApEABdgTUWsAYAAF2IXMCFWY6k3yAFQJYABoUCXKRrMrAEKQBmNtQAKBsNgIL8hoPQCkKrEugK8wS5QAQXMARsAAUgZQI9AigCF6i/kQA8gkXVDR2AhQRACkVi7gCIvUmYFAuABH0KGAJcuxADKS4AoAAhdybhgUmRSbgC65DIadQIXqTMAXoQqGoC24HUm4F6D0AuBAyobAExuRIAGCgBoLi5GBUHzBPQCtEaFy5AQqIALuMhcXAX8iMMNAVLIgWY0AFJbmALqASwFICgTYKxSbaAVCxL2DAoFxcCZlIigGQZ3DAPMXKSwCwAAuo2IAF2igMANCFAahkVygS7DKNgGxOhdiZgC5EsAAdwUCFBFyAtiaAu4DLUX8g/MmgDkXQAAyFuR5AUWZLgAUEetgAZV5AACXKwAF7k3AMbFDuAWg2JmXYAhqRlTAli28gFqA0ImVkAF0B4quok01NMnz5kMqVKhccccTsoUs2yJmIjeUTO3GX4uIsZocDwubiFfNUuTLWSXwo4toUt2znzjfi3E+J6xxVETk0cD/I00L97DzfnFzPL2g8VVHE+MRTbxQUUluGmleS/af7z/wDQ+ZbuUbVtVqyqpt259SPv/exTtT1KrIq5lE+pH3Y3F2LA4jkbiz1LYmwV9wKMgGSkuVPInoUk3e84Q4lxLhvEFUUUxxSon+WkRP3kxc/J8zoLhPiCg4iwuGuoY8tJsqJ++lxeT/z3OY4T3vCPENXw5i0FdSxOKD4M6TfKbBuuvkzr6XqlWJVFNXGift8YdTTtSqxaubVxon7OlyM/HguJUuK4ZIxCjmqZInwKKB7rzT5rQ/YXqmqKoiqOiVzpqiqN46ABplMkjBNBsBQ9NCC4BCzFhyApBoUBuGQbAVAIACZlIBdiFABBgXAEsCgTRlRGUCFRC3AMMMmQDQWDKAaCvcDMABqQAxmC3AMmZXoAIC5kAMehQAIAAsW6IUCFzsMyO4DNF1Ix6gCk5gCkSKrEeTApAWwAAl2AaBRsBAWxAKCblAmTKQoEeYHIuiAhSbZjcCvMAaANy5EtcACLUqVyNWAruL+Y2JqBdRYcgAsCXKBCk3KAIWwbAheRC9AIy7AMBYnUoAizKxoQAOgF2gLzIwVATa5QHzAhQQAwiogFIByAodiZjkAG43DApC6kQF6jcDIA7EYWoeoBhlGgESYuGEBVoTcFYE0ZXqQu4BZC5LMAXmRK5SXAOxWiD0Ao6EAF6i2QAE3GZQgCuyMu1xsBCkADIoQQEWQ6ltmTQAwL8huBRk0CX5ACoak6AHqUlwBSIo1AO9wCcgKQABqLAcwDyNU9uvEkUmRL4cpZnvpqU2qaekH6sHq8/ReZtKpnS5EiZNmxKGXLhccT8kldnL/EWJzcYxytxOc23UTXFDfaHSFeiSRwdfy5s2It09NXl2uLreTNuzFunpq8u1665CslikqiAECCwsUAAuYBKQpAQhkoiOJkLsSNldh3EkVLiUeAVMf5Gqbjp7vKGZuvVfWjdaeRylh8+bSVkmrkROCbJjUyCJbNO51BgdfKxPCKTEJL95UyoZi5XWa9HdFx5P5c12ps1f8AHo8P4WvQsrn25tT/AMejwfuJ1G5SxO8hUQLICkDLuA6kt5BjmBVoGOZGA2KRaAC2z1BBcCjqQagUBaBALeZCsATQALzArJYr8yJgNRbcFAEKyNABYaFSAMgKBLlIUB1IUZAQoY3AgzuGygAhuAI2EXcMAGyF6gBcPqQAAgmBeoysCPQCk2F+QQDIug3IwL0BGUCMu2YHMBsTctx9gEKSzAABlAXJuCgAtSFYDoQvQj5gValIABOpXzCABDIjAt7slsxzAABFdwAeZEEBdEQrGqANAgyYAFIBlsY7lRACLkCWAaizFigEQIoDYEAFJuABSDMuwC25Be5dwFyF3DAXAIAKyblAgKtMwgBC7i3mAvcW8gS4FuS40FgA2KRAEw2VZkAudidRuOgALUBgNSks2VgBcg1APzKtARgNWHkEV8wIiomxdEARBewsBSJ22CKwAJ1FwD5F1Q0GoAMbgArAm5UBAisiQDcuoIBWNyB6gCkzKAYBGB8x2pVroOBcUmwReGOZLUmF/Lahf1NnOWqN59u01wcGSZf+8rYIX6QxP+ho1qxSeUNc1ZUU90QqGuV87JiO6IYsalIzhOMgQsAgG4AApCg3QZgIAZGK1LuEPJLaN69iNb7r4NVPFFeKjqI5S+S/fL7WaGuzbvd5nxOlxmnekM2VGvVRL+h2dCr5uZEd8TH7/s62i1c3LiO+J/LbG4C0LqXpdAmRdCAV6BEKBNy5BkQDMrBNQKiXBbbgR8ik3KwIsyhMATQqeRN8igTmUEuBSFJuBURvyKLAQrJ0DQDUF2CAmRXkTQALl0A3zAAXIBSXGZeoDYELbICAFAhSFQEVyglswA2LcMCFsRF6gS/kLFXIMAybDoNwBRuLoCW3KRhAUO4JcAXoTYICsmZSANy5kzLfzAhctiCwBjYtggJmNSkAZouxCoBuAtRkAfmQruTYC5DYai1mA6EvmUmQAbgryQC1gNiAXUhQABMwgF8wBmAuAAGoKQC2BNSgQDmXYCO1w8xYt8wJa2otYNlAheoJqBdiWyKPUCaFZHqEBbsg6ACk1YAFBCpZAQZjcAUIgAXKiDoBVzA1YQBC7DJ0ApNRyCQB8wAADLmQAihgCF1yDIBdych6gAAVWAIguUBroGS7LmBEGGhsA2sEEAAKQC2vqTkgOgCwt5FbF7ATQuqIAFssi6IhWAQWoVybgVkVisAa97dpTj4NkRpZQVsDfrDEv6mj2jojtWo3W8CYjBBDeOTDDPS+REm/qTOeI2ik8oKJpyonviFP1ynm5MT3w8bMWWIZHDcZBYuw6gAATsAF2NcwBCghCaF2uQX5gW5t7u9yX7nxmftFHKh9Uon/AFNRQq7N69hlC6XhCKpj1rKiKYvkq0K+xnX0Kiasyme6J8tv3dXRaedl0z3RP4ffrQpNysva6puOhWiPkBVYjWeRbZDYBsAAItcysEYBjUW3KrASxSNlADYEAqIVE3AFQAELqGQCj1IAKQBACkfIWArGoCAdBsHmQBqCgCFJYANgLlAWJYCwAFJoAfmLlvcgAqIACRQxqBE2V6hDUAwgAJYAbAW6I9CrQAQbDMtsgA1IAG4yGQAFuEg7AMwiIu4E6jUFAlvIruw+QQAmViogFVhkBkBHlkEmLMtgBBZlVgCJuBuBciLMdQ8tAAuUiAcyhhNgAEMgJ0DZcggBLDcoERdSF6ALWA5ojzAAIWAaZgFfkgJYrCHMCFI9QAHQWDAF2BNwBQSzAoIysCPUpNgvIB9o2Fi7gRjcu5GBQQrAgL1DAAiKBLFuQoEFhmF5AUECAoyCRM75AXQNjYmwDK4LYPkBNguQAFtnmCDTQCggApAsi5ATQbFsGBNguZSAUg0AFaINi7AS4VxqVARi4eoQFCIVARgoYHiqZMqokTJE6FRS5sDgjT3TVmjlrGqGdheL1eGz7+OmnRS3fdJ5P1Vn6nVMWatY0/268NxQ1EriSlgvBGoZNWktIllBH6/BfSE4Gv4s3bMXaY40+Th65jTctRcp6afJqsJFUNtQ8imqihAwiQADsgkBC89idkLkQDMhCE1MrEsxsPPQU82rrJNJJhcc2dGoIIVq23Y6iwLD5WGYRS4fK+BTyoZafnZZv6bmn+w7hyKsxaPH6iXeRSXgkXXwpj39F9bRu1JJFu5P4s27c3qv+XR4LXoOLNFub0/8ujwViwGRYlgLsly2GQEAsh6AUmosgwKiAZgAXqQByDL0DzQEBQBEXYbEsARSMAAOhQItAy+hGAyA5IudgAzIhmAeQLtmRABcbBaAUbkWpbXAIMgApOo3AFJuHmVAQbDUoEXItxtkTqA2KABLouwAE6FRLFtzAhcwRABtkORdgIUXJ1ApAy9QIgHYuwAhbEzQFIxe5bAQoyADImYKwC0GwIAuUi1KAJ6l3KBjoirQACJFJfzADRl6hACahlYaAE0GRQJ1K2MgAIW4yAbELuQAVWQIwG4Lcl8wKs9AAAyuS5QBOhVcbjXUALjcgDMFIAzLYl7FAEAAApAKR9QEBdCFuTIAN8yjcBkA8iIBfMoyIAfmNShaAB0BAKGiFYDa5LgABYFWoEF/IpNgBWQqAbDcjKgIByCApLFJyAWKAgDBGUCepcyDQC7kHMuwEuFYFsA2JsXcIBsTcpEAKQtsgIiq5EMwFijYATc8FfSU9bRTqSrlKbInQOCZA9Gmfo3DZExExtKJiJjaXNvHPDlTwzjEdJOUUdPHeKnnWymQf5rR/wDqfOXTZ0/xRgVBxDhceH4hL8UDzgjh+FLi2ihfn9pz/wAXcI4pwzWuVVwe0p43+RqYF7yZy5PkykanpdWLVNdEb0T9vgpupabVjVTXRHqeT0FrixlFD4TFs5DkpcBK5bE7IRkeRkQbCBO7sLMaDYZJHuuEeHqziPF5dBSw+GH4U6a172XBu3/RE4R4axXiWv8Ac1BJtKhf5WfGveS1ze75HQXCPDmH8N4WqKig8UTznTol76bF5v8Aotjq6bpleVXzquFHn4Onp2mV5VXOq4UR9/hD9mB4ZSYRhkjD6OX7ORIh8MK3fm3zep+2+xSF3ppimIpjohdaaYpiKY6DQuQFsjJkLUAARFIXUCDmG87ABrmPUBAGhoVE1AaFzGxAF/MFDAnqV5oDRgRDMbBXAIpLi70AvMc0LE3Aod7AAS4VxYICvkRFIAFyoagToXMgAFRL2LoBNykAF0AAERSPkVAQPQAAgABbeYZC6ABqQt/IARWKQAC6jYCXQ2KTMCggAIuwRACbGYDQBAaFAgKQC9CMFAE30KQCgm+ZdQAAADOw2IALqABNxoBncCrmEGQBuUakAFd7EKBMy6hheYADmAINAUAMiFAJk3uW5ABUTMu2QELsR5blAhdghcCMqRFmUAQIoE2AABZ6lIEAL0HoQCkBWBAEL7ABcIoE9AwV2sBNiomxQG40AeoEA1eYALPUblRAHMCwAq6E3LnclwKsgwOoEKExpmAsAAItChcibgVELkRdAG5RlsTPcBbMpL30ADMoIgLysR6lFgIXXUmxUgILWKwBNgUj8wKS4DuAzCLqAICgAj89fR0tdSzKWrkS58iYrRy44bpn6CETETG0omImNpaf4y7KZ0MUdTw3PUcGvuSdF75fJj36P6TWeI4diGGVDp8Ro59JMTt4ZsDhv0ej9GdWJJ6o8VXSU1VJcqpkSp8tqzhmQqJfWcPK0K1cne1PNn7OJk6JauTvanmz9nKcMD3RXCdBYl2dcJ1jijWHOlje9NMcC+hZHo53ZFgkUV4MTxOBeXvH9qORXoWVTPDafm5NzQ8qmeG0/NpWNWMUzdsnsiwKF3mYjiUxeV4F9iPdYd2b8I0ccMxYZ7pjW9RMca+h5GVGhZNXTtHzTRomTV7W0fNobCsOrcUnKTh1HPqpjdrSoHFbq9F6s2Pwr2TT5sUFRxDPUmXr7lkxXjfKKLb0+k23SUlNSSVJppEqRLWShlwqFfUebc6uNoNm3O92edP2dTG0Kzb43Z50/Z+XDMPosNopdHQU0unp5atDBArL/wBWfrBHodymmKY2jodymmKY2gHQMIlIUE1AZhl21AEBR6ACFZEBWMiBZAAy3TIBQQAUmoLoBNB1KOgB8iZjMALgACkK9CJgFkyk3KAuS/IPkXYBoTXQLmXbIBsTIWAF1GiDRMwFwxYXAZl6kRQADyIrAUP6SZlADmL7B8gJmNxtmUAQvQbgAgSwFRGigABcbgMydS5kYFDIigBkQANNhYoAg3L0AAPkQZgW4AAEfUWuVcwCsCF2AIAlwGaKLkApCh+YAmugLoAI2i5EAdAuYuAKTYugz3Ag5F2yItQG9i7jTMjAqAuHmAIwXoBAA/MC6LMi1DzKA3uTmXIAEwOpABQidAKQdAAKRjYCkuFmAAKQAW5NABSZMbBANAvMX5BANgkLgAUEsAKRIvUATXQMAEii241AZ2A0DAbEtuHqUAQZjcACtbkAuWhBqAKCaBAAykWYC5ddSWzAAo2AAZWI7gAW4YysA1JuHFDDqyKOF5JgZE2H0/QL8gKCMvqBCsJktmA6DUajoBXoRMr0DQBghU8gFyNgXS1AhUuQvC9Mw215gUNk8XJ/QTxbAXbmAkUCdAxfMrzAEtmAAbDyBQIUiyKwGZMwi3YBsg3LkBOQBdQI0EUACdC7kzAuxCkbS1AFMfEnDdaHq8Q4iwPDr+7sXoadrVRz4b/Re5MUzPQwru0W43rnaHttdBY+Gr+1XgilbUOMe6IltIkxRf0SPR1fbdw3Kv7moMTqHzghgX2s+0Y12eilzbuuafa9q9T9d/JtQZeZpap7d5X/AGfhub1mVS/oj187t0xKK/scAo4flzon9h9Iwb09jSr5VaXT/wBm/wAp/DfLfMK3mc9TO3DiO/vMIwlLn7R/1JD24cSfrYThL9Jn+ZP+Be7nz/8Ay7Tf/KfpLoZ9SmgZXbnjCt7XAsPi+TMjX2s/dI7dZi/P8OQv5FVb7URODejsZU8rNLq/7NvlP4bvBqGk7dsGjdqvBa+RzgmQzP8AI9zQ9sfBdREoZlVWU38amaX1NnznGux00ty3r+nXPZvR8+Hns2MwfNYdx3wjiP8AqvEFDE/KOZ4H/wCKx76lq6eql+0pp0qdB+1LjUS+o+VVFVPTDpWsmze93VE+E7vMsx1HihvZvMuTMX2Ba4ABEtuUWAEdxqUAQuo5gLkuyq+pMwLYJE9C7AGNydBqgAL0D1AnUt0CJALFIwAtmCrmAJmEXIIAiAAVAltwBeZNQVZATcFtmAGgZOgAvUi5FIADLf6QBBuCgCehSAMyggC3MoFgIUbjQCApAC1G4RdcwIUhQBEUACJ5jcrAEfIqAEYQGQAajcu4EBRoAyBOYzAthbIbgCBFRAAAAO5eo2IBULZkDApLDYIAEENABfQhQDC1IUAQtwAzAQAImbCKAQsQJgAykyApBYtgIXYjyAFQIUBoNiFvmBCk3KBGNEV6ACDcblALzD1IEBQOp63iDHcKwHD46/F8Qp6KmgWcc6NQp8lu3yRNNM1TtEcUVVRTG8vZPnkeObOlyoIpkyKGCCFe+iidkurZz3x73jqeU5lLwbhrqos0q2sThl9YYNX6mj+K+OeLeKZjix3Hauplt5SIYvZylyUMOR3cXk/kXeNz1Y+/0cfI1uxb4UetP2+rrjizth4C4cijl1OOyqufD/sKJe2jv1WS+k1jj/eZlKKKDAeGJsf7M2tn+Ff8EOf1nOeSVkklyMHY7tjQMS37UTVPx/hxr2tZNz2fV/vxbbxft/7Qq1/6LU4dhsL2kUqjf0x3Pm63tS7QqxtzeL8TgvtJjUtfUj4hMviOjRg41v2bcfSGlVl5FftVz9X0M7jfjKN3i4sxyJ/PYzY3dt4o4lxPtVoqHEcfxSrpXTT4opM+pijgbUGWTNMJ3No91z45MP8AmtR9w+GfZtxjXJimOiez4PthXbk5FETVPTHa7JgzgRehjL+AjPc86XlHcFJYAAXcB1D5BhAQNqFN+R6nifiHDOHsPdZiM9S4NIIFnHMflCtzR/GXH+NcQRRyJUcVBh7yUiVF76Nfvxb9FkaOXn2sbhPGe5zs3U7OJwnjV3NscT9ofD2COKS6h1tSv9jTe+s+cWiNd4z2tY/Utw4dS0tBL2cS9pH9eRrxNJWQbOBe1S/d6J2j4Kxkaxk3uiebHw/PS97V8Y8T1bbn47WtP9WCZ4V9CPXTsTxCc7zK+qjb/anRf5n4cyo0pu11dMudVeuVe1VMv1ycSxKREopGI1cuJaOGdEn9p73CuPOK6C3s8Ymzl+zUJTF9Z8uDKi9XRxpmYZUX7lud6apj5tu4F2vLxQy8cw3w7OdSu/0wv+hsbAcfwnG6b22GV0qpX60MLtFD1h1Ry3rqfow+qqqCrgqqKom08+F3hmS4vDEjoY+rXqJ2r4x93Vxtcv252uetH3dXpplNW8A9psFVHLw7iJwSZ0XvYKtZQRvyjX6r56G0YYoYkmmmmrposOPk279POolacbLtZNHOtz/BbmBcux92yZAABmQpM7gXkGL2AC/mAMgBCgCDqeKqqpFLIin1E6XJlQZxRzIlDCvVmueK+2PhvC3HJwz2mLVEOX5H3spPnE9fQ+luzXcnamN2nl6hjYdPOv1xT5/TpbLusz1eN8Q4Lgspx4pidLSW2mTF4n/h1Oc+Ju1Xi7GfFBKrYcNp4v8AZ0i8Ltzi1Ph5s6ZNmubOmRzZkWbjmROJv1Z0bWl1T7c7Khm8trVPDGo3+M8I+nT5Ohcc7a+HaaFwYZS1eJRr9a3soPpeZ8Li/bPxXWOKGhl0eHQbeCX7SL6YjWfiFzeowbNHZuq+Vyn1LI/7ObHw4ffp+73eKcV8SYq4v7QxyunwxO7g9s1D9CPTxNRO8Wb83mzApsxTFMbRDhXb1y7POrqmZ+MsvE9CMEYfMfIhSMACPMWISXFxYBG6WCXkXcBO5Zb59T9NJW1dHGo6Sqn08azTlzHDb6D8xBtEpiqqmd4l9lhPaXxnhqUMGNTaiH9mphU1fWfYYN254hLahxfBpFRDvHTxuCL6HdGndQz4V4tqvppdXH13UMf2Ls/Pj57unMA7WuEMUihlzayZh05/q1UHhV/lK6PuKSspqySp1JPlVEqLSOVGoofpRxWrH7cJxbFMJnqdhmIVNHGt5M1w/VoadzTaZ9iVkw+W16nhkURMd8cJ/Hk7PTXmgznXhntn4hoHDLxeRIxSUtYrezm/Ssn6m0+Fu0/hXHVDLVb7hqX/ALGr95nyi0ZoXMS7b4zC2YPKPAzNopr2nunh/H3fbhGMuZBHDDFDEooXmmndMyWprO7E7gyAYB8htkTcMChEAFDsQoELfzC5i6YEXIFYAIm4VgBQgyMA9RcLzKwIAVgLkKtCbgM9y6C+wQE3GpWyAMxYFAjLsGgAJuUgFIUAB6gABqMwAGwZMwFy35kfQZbgUgTAFvkLIAB1J0K+oyAlikdxyAMoasToA3Kn5EWeZegBk3KR6AVghXcCF1GhALoNiasZgMrDqWxFYCgmYAttxe40IAzLmiZlAbkGTLYCZlGehABckgLAEQrGQEWg2AyAaqwGwQBItyavINAUgLsA2sRFyJ0Au5BlcN7AFqUAAs9SPUXuOoFYWmZC2zAmhSZjMAV5k2KAsNBcgBguuoYDQkUVldngxCspaCjnVlZUS5FPJgcc2bMitDBCtW2cr9tXbbW8Rxz8D4WmzaLB84JtSvezapcv2YPrZvYOn3cyvm0dHbPc08zOt4lO9fT2Q2P2udumFcORzsJ4bhlYtisN4YpnivT075tfDfJHMvFPEuO8UYg8Qx/Ep9dPb97437yBeUMOiR6l6ZKyI2XnC02xhx6kce/tVDLzr2VPrTw7uxInd3MbmTMcjfaYAMwAAAm5tHutv++Sg+a1H3DV7Nn91r45KD5rUfcNPUOq3P0z5NrC6xb8YdmS/gIyRjL+Auhluear6ZXBABdiFC8gGp6HjXiah4ZwmKsqn45kXvZEhP30yL+i82e0xWupsNw+fW1cxS5EiBxxxeSRzbxhj9XxJjU3EaluGD4MmVfKXBsuvm/M52o5v+NRtT7U/wB3cnVdQ/xLfNo9qej4fF+fiDGsQx7Eo8QxKc5kyLKGFfBlw/swrZHrrkYKnVVNU7zPFSqqqqpmap3kZNCkZiwAHoGSAARKQXBAhW8jY/ZZx/Mw2bKwbGZzioYmoZM+J3ch7Jv9n7DW+pVbc+1i/XYr59EtjGybmPci5bni61gaihUSaaejW5lbM1h2LcWutpv+j9fNcVTTwXpY4nnHLWsPWH7Ohs++RcMe/TftxXSvuJk0ZNqLlKdQNQfdsqwB6AR5FJdsLUCsgiaS1Nd8f9qmC8O+0oqG2J4jDk5cuL8nLf70X9EfS3aruztTG7Vy82xh2/SXqto/vR3vvqyrp6OmjqaqfLkyZavFMmRKGGH1ZqbjXtqoKNzKXhum/tCcsvdE28MpdFrEai4t4tx3iipc3Fq2OOVe8FPB72VB0h/qz0Luzs2NMpp43OMvPtU5Y3ru9GJHNjvnp/h7niXijHeI57m4viU6oV7qVfwy4ekKyPSk3B06aIpjaIUy7euXqpruVTMz3qmAA+YUgQGSeZUzFAxQyJfImYIQoZCkJTUoFyAA1AQeguCEpCMACFBALmELhkCodQmMwPpeFuOuJuG4oYaDEZkUhPOnnPxy36PT0Nw8GdsuDYlFBTY5K/supeXtL+KTE+usPqc8ENa9iW7vTHF2tO1/NwZiKK96e6eMfx8nbFPUSaiTDOkTZc2VGrwxwReKGLo0eVHIfCPGWP8AC85RYXXRwyb++p5nvpUXo9PQ3lwJ2t4JjjgpMT8OFV0WVpkV5Ub5RbdGcm9hXLfGOMPQdL5VYmZtRc9Sr49Hyn8tlbgkMUMSTTTTV0/MtvI01oQBCwFIX6CbgX1BLobAXQi0DC0AIpFoLAXVkepSJALlYZACRSWLmAJsBsA6lyC5k1AuYZNAgKQCwFJmNwwA5lWhAKToOo6AW7AAAmjzKGAsFzJYMCsmpV1ADIjYXIWAtyX8gmAKCWzDzAIItuYAPQmwuxmBRYepHzAqsRjLYXApGOgVwHoW/kEyKwFAIBSC9ivQACDQCrQLkELAS5dtSXFgCKRgCkZbciaAEXQgAthdDMjAN3Fih8wJdFXkLEApGXK5HyAouiFyAhVlkQICsi1G43AAvQj5gMi5NkQeoFG5BzAAbDQC5MnINhAX7R1D0IBTxVc+TS00yoqJsEqTKgccyZG7KCFK7bfkeSJ2XPY5j70HaXFWVU7gjBJ/+iymv7TnQP8AOxrP2Kfkv1vN5eZu4OFXmXYt0/Oe6GrmZdOLamur5fF8t28dqlTxriMeE4TNjk8PU8fvUsnVxL9eP93yh9TVdyN7g9Dx8e3j24t242iFGvXq79c11zxlR6kB9nyGSxWAlNBsW2YAE0KgBizZ/da+OPD/AJrUfcNYs2d3XPjkw/5rUfcNPUOq3P0z5NrC6xb8YdmS/gIuhJfwEZbHmq+wbhoguAF7FvmeGrnyqenmz50XhlyoHHG/JJXZEzsiZ2jdqnt14gbjk8O08eStOqbPf9SH+v0Gp4r7n7scxGbiuL1eIzm3HUTYpmeybyXorL0PwRMpWVfm/dmv+7PPs3JnJvVXJ+Xh2IQWBrtQ2BAEDAyASpEC6gAxmMyRG/ImpRYIfpwivqcLxSnxCkjcM6nmKOB9Nuj0OoMBxCRiuEUuI07vLqJSmQryvqvR3XocsQ2ubr7BsVVRgdXhcyK8VHN8cteUEf8A6p/SdjR700XZtz0T5u/oORNF6bU9FXnH8Nl6CyCdw7Isq3mQ2INMwB+PGcUoMIw+bXYjUy6anlK8cyN2XReb5HquOeLsJ4Twt1mITLxxXUmRA/fzn5JeXM5o424wxfi3EXU4jNcEiBv2FLA/ycpf1fNm9iYVd+d54Qrut8obOm08yn1rnd3eL6vtH7V8RxxzcPwJzKDDn72KbpOnL/lXI1pcxZOhYbVmizTzaIeV5uffzrnpL9W8+XgrJcE5n12aikuUhBsqyIBsQBVoQpCDUpAYoVkuUbkSC0ABiG1xcbgCsZhAgNiF9SNAQhWAJncv2kBIF6kLsQBbk3ABsMEAGSIFzA+84C7S8c4Zigpp0yLEMOWXsJ0WcC/ci26aG/8Ag3i7BeKaL22F1SimQr8pIjymS+q8uZyKj9OGYhW4XWy63D6mbTVMt3gmS4rNf5rkaWRhUXeNPCVm0flNk4ExRc9ejunpjwn9ujwdop5A1H2bdr1NicUvDeJXLo6x+9gqllKmv979l/UbcgjhjhTTTurq25xbtqq1O1UPT8DUcfPt+ks1b+ceMAZbIh828FuTUoCxEVvZBXAPIhddhsAtkTQIAW5Mg+hbcgDIxcqQEBXkLgETmXOxMwHoUgVwKrEWosVaAGSxb5E1AqCJoGBSal2IAVi5DqMgCJkUgF6EKuQAdQTYaIC5bECHMCkKRgE8wwNMgG+Q3AtuBX0IVi4EzG5SXAaBAIC7aEWRdQBBuUnUCvQZ2BAA1GRVmBNA8xbyDAuQ1BLgUEF7AFcP6wVdAJe2QsBcCsiDKkAAzF/MARguoE0QzBeQEZVYPmTYCkWoRXyAMmZcw9AJmXMLkRLMCkQuAF3fQvUZkeoC1ygAMgiaMvQAkEABLF0GxjMatZu3MDXvb1x1/wBCeCps6mjhWK1zdPQreGJr30y3lCs+tjiuOOKOOKOZFFHFE24oondtvNtvzZ9729cYPjDtCq50mb48PoG6SiSeThhfvo/8US+hI+AZ6FpGFGLjxvHrVcZ/aPkpOqZc5F+dvZjhH5GRls7EZ1HOANiqwCyGQaGgEBSMARleQAxZs/uufHJh3zao+4axZs7uu/HJh3zao+4aeodVufpnybOF1i34x5uzJf5tGWxjB8BdC3PNV+FkUWJYAfL9qtZFRcCYnMgitHNgUhf42oX9TZ9TY1727THDwbIhTyjrYE/SGJ/0NbMq5tiuY7paeoVzRjXJjulo2MxZmzFlL2efsQUn2BCZgosEILFQCRebDKRagAUiZIAepGAufedhVZFJ40jpr+9qaWOFrnDaJfYfB2PrOyJuDtBwtrLxOOF9PAzZw5mm/RPxhtYNU05NuY74dFw6FsghdFzehj0Pj+0rjnD+D8N8c3w1FfNT9z0qizi/ei8oeZ+3tF4ki4W4SrMZl06qJsnwwS4G7LxRRKFN8k2coY1idfjOKT8TxKojqKmfF4o44vsS2S2R0cDC9PPPq6IVXlHr3/x9PobXvJj6R3+Pc83EWN4lxBis3E8VqYp8+Z6QwLaGFbJHryF5ljimKY2h5XXcquVTVXO8yr0IASwAhsCEj0IXUAQLIWKYyiTcMZeYZCELcmZSAzAFyEBSBGIoyAIF3CIUgRgpABCkABAAEMwAAsAAYCAAWGYuBSAAVGyezDtRreHopeG4zFNrMKyULveZIX7vnDy+g1qTqfO7apuU7VQ28LOv4V2Ltmraf7097tLCsRo8ToZVdQVMuop5sPigmQO6a/z5H6zk3s544xTg+v8AFIbqKCbF+XpYovexc4fKLmdN8K8QYbxHhEvEsLnqbJjyiheUcuL9mJbM4WTi1WZ+D1nRNes6nRzeiuOmP3j4eT26sEOgVjVd9Nww8th0At7DcchoBNwXUMCBXuXVAAANQJqV8hsToAbBSXApG76AWAXYQLkAfMnQIWsA2LkOYQC5F9RbbACAoAEyGY6gFqGGUArDVhhAQalAEKyaF2AEepehNQDLkRcygCWuGHoA2CSC0GoFGoIrgHqBmHbYC23JcBALZDUouBLBAXzAtwxclgDAAF0IhqNAALfIjApAhuAGwGwBalehGACGpciL1ABBl6gTIcivzQAlykyCABFzJYAWwIAtyDZURK4CxQTPkBXrkTfMIoE3sXMW3CAgZbojApr3t/4pi4W7M8SqqeZ7OtqrUdK07NRx5OJdIbv0NgxO0Nzl3viY66niXCOHZcT9nR07qpqTyccx+GG680lF9J0tJxv8jKopnojjPyaGpX/QY9VUdPR9Wh4VZJLTRFsLWRT0VR4QPQBkJLiwsUIQMpMwBLFDCEAyBIhs/uufHHh/zWo+4awubP7rfxx0HzWo+4aeodVufpnybWF1i34x5uy5fwEUkr4CMnrkeaL8EBUBPU1528fohS/PofuRmw2jXnbx+iFL8+h+5Gamf1evwaGp9UueDSDWZizJsxZTlCQFehOgQMAAAkEigCFIAJ1KAI0CgCH1PZQ/7wcJ+XH9yI+WZ9R2T/GFhPy4/uRGxje+o8Y82xie/o8Y83Rq0QsF8EqLo9Fa87wC/uyr/wCPI/FhOabKx0v3gH/dliH8eR+LCczeIsWle5nx/Dy3lp16n9MecjIGDpqiADYALgECggsBeY2FyEANgQhDIhCmIFRBfchAyoxbKRKFuUiBiKPUDqQgAFwAAsgkBAgAKwBAUZAQAAAGwAIUgAiKEBVke/4H4uxLhHGIa6gj8UuKynyIn7ydD5Pn5PY+fbMGrmNVEVxtL7WL1yxci5bnaY7XYnBvE2GcU4NLxLDZt4HlMlxfDkx7wxL/APlz3dzkzsrxniDB+KqdcPyJlXNqIlBNpV8GdDvfyt+1sdYyXFFKhijg8EbhTihvfwvyvuV/Ksehq2joev6Bq86lY51UbVU8J7p8Px2M9QA8zWd5C6EG+YFZAAKLkRQIykZcwAFibgGC/QS2YAoFgICsgFCJuUCbl3AYC5LBFfUABoW4E6kHUoEyKgQCshdgAIuZbk6AVk1DF8gG43AdgKEQACu5FcrAnoV6EL0AiWQCGQFJctnYmVgA3HQtgFgHkS4AbgW8wKuhLBgCvqCajUCvUjKR6gUaE2FwKRh5l2AmxcrDYbaAECdAAYLfKxG8gLmQuxLsC6h3QaGYEHQC9gKTcLUryAbk3FwBWAgwIWyF8hfICBBoqQAb5E3KA3BGW4EiSa8PmcLdtmKvGO1biKshbcENW5EF9oZaUH2pncVdN9hImzb28EuKP6E2fzzxCpircQqayN3iqJ0c5vnFE4v6lo5M2t7ldfdER9f/AEr2v3NqKKO+Zn6f+3hKQpblZLAMBIwLAIAwAICkYE2A1LoBibO7rnxx4f8ANqj7hrI2d3Xfjkw/5tUfcNTUOq3P0z5NnC6xb8Y83ZcHwEZGMv4CMtUeaL8XIC5agORrrt6/RCk+fQ/cjNiO5rrt6/RGj+fw/cjNTP6vX4NDU+qXPBpEMEKdsoI9CFJqSKQAChagmoFAAAnoWxNhsABHcCH1PZP8YWE/Lj+5EfLs+o7J/jCwn5cf3Ij743vqPGPNsYnWKPGPN0ctAtQtCl0eited4Ff3Y4j/ABpH4sJzIuh033gPixxD+NI/FhOZdixaT7mfH8PL+WfXqf0x5yAXI2zqKhspLkBApSFuQGguQZkBfMEfIJgUEKESF0MTK2RigIUiIQrIWxLGMoXqUlgrGIyAVnoWzCEGZWgDdiAOhCQAAWwIsy2ApAwAsRlIAeQ2BGBSAAPUAWAh7HhnAcU4jxiVhmFU7mzo9Yv1YId4onskfv4H4SxXi3FVRYfK8MuGznT417yVD5t+fktzp3gfhLCuFMKVFh0r30VnPnxr8pOi83y8lsaeVlU2o2jpWXQuT93Ua+fXwtx29/wj89j8PZvwJhfB2HeGQlUV82FKpq4lnE/2YfKHl9J9c8i6LImpwq65rnep6vj41vGtxbtRtELmTcJgxfdXYDXQbgNUQpAHQMItgIUhWwBAi7AAiIoEA0ZbgGR6guwAnQv2h6ANUORNigHkiXKLAOoCKBixsUj5AXQJ3IgBXpYLQjC0AblsLjMCMdQAGRXYbEQF9A7gZ2AjLsER3AdQ+TKR8gKLZAjzABDLW5cwCZNxYoE1ZWL7DICDcpEgLYhSAEmXQizDyAo3GRNAKyBjqBbeQZLgBuW+dxqS2YFJroUO4E6lZOoAFIgAKiIbgXQmotuOYDYoysT6gL1DDJoARQ+pMwG5QLgGyZlJyYFvsM7k3yGYFCyBAPU8YzIpXDGKzodYKGc1/wADP58y8pUHyIfsP6A8eZcHY18wnfcZ/P2X+al/Ih+xFw5M+7ueMfuq/KD26Pm8iGhEzIszgpYpbAILZjqAQlGAxkSHoQDcIBYPUjYBmzu678cmH/Nqj7hrA2f3XM+2PD/mtR9w09Q6rc8J8mzhdYt+MebsuX8BFfUkHwF0MrHmq/AyIMwKjXPb3+iFJ8/h+5GbGsa57e/0Qo/n8P3IzUzur1+DQ1TqlzwaQZNikKjsoIikLsSIAxqNgQCKRsKS9iXD1Gwt8iMCw2B32IygbIQ+o7J/jBwn+JH9yI+XPqOyj4wsJ/iR/ciPvjR/rUeMebYxOsW/GPN0ctCkh0LmXJ6M153gPiyxD+NI/FhOZdjpnvA/FjiH8eR+LCcy6lj0n3M+P4eX8suvU/pjzlXqR5C5DpqiMAEC3DIQgUE3D1CF9QRsEAmVEaM5EqbPnQyZEqZOmxO0MEELiifRIERMzwYlRsThfse4pxaGCfXqVhFPFn+XzmP/AALT1Nn8N9jXCmGeGZXS52KzlrFPi8Mv0gX+ZpXs6zb4b7+DvYXJnPy+PN5sd88Pt0/ZzjS01RVx+zpKedUR/syoHE/qPqMH7N+NsTih9lgM+RBErqOpalQ29TqTDsMoMOlqVQUdPSwJWtJlKDL01P1+FN3tn5nPr1Wr/jCzY3Ii1Hvrkz4Rt953c80PYdxHOlKOsxPDqV7wrxTGvoyPc0nYPJ8KdXxJN8W6lUqt9bN3qyGxq1Z96rtdi1yV023HGjfxmf4aipuwzAYV+XxfEZr5QwQ/YfpXYfwtb/W8S/41/kbTKfOcu9P/ACbNPJ7TaeizH3/LU03sO4cf5vEsSg9YWfjndhWHOF+x4grIXt46eFr6mbkfmOpMZd6P+TGrk3plXTaj7/loOs7CsUTbo8epJq2U2TFA36o+fxHsh42pFFFKoqashh09hUK79HY6dZi4U1Zq59adQux0tK9yQ0657MTT4T+d3HWKcNcRYXF4cRwSvp+cUhtfSro9RdeJw7rVHbjhXh8Oi8j0WNcHcM4xDbEcFop7z9+pSgi+mGxsUan/AOVLj5PIftsXflMfvH4cg7lN/Y/2HYLPUUzBsRqqCZbKXN/KwN/ajXXEfZXxfg3imQ0UOJU8P+1pH4nbzcLzRuW8y1c6JVrM5Oahi8aqN4744/z9nw4LNgmSZjlzpccuZDrDGmmvRmJsOHMTHSt8iABABcACANkgEAAufX9m3AmJcZV/5O9Nh0qK0+qihyX7sPnF9h+7ss7OK3iyphrq72lJg0uL30y1opz/AGYP6xbHSmE4dR4Xh8mgw+nl01NJh8MEuBWSX9XzOfl5kW/Vo6Vw5P8AJqrMmL+RG1vsjv8A4+P0fm4ZwHDOHsKl4bhdNDJkQa7xRxbxRPds9oyhnFmZqneXqFu3RapiiiNogDQ2JmiGYlfUMr6D1AIZEdkXYCWaLfIivuWzAlkUIjy3ABlFgInkLMvqS7AqDJqAHQoX0BoCC2RWshnYCbDkVEAMAt8gJbyGZUxa4BD6ALcwC5C2YvYagTcuwvYgBlGbIBWNATqBQQAANi9QJsNii9gJcuuoeaItAAK7C4BBhkAt0RBlAg5FQyuAsibla8iXAPMupMy3zAgvsNy6AQuwGwANbkLcCC5QBGEC3sAehLhsLQAwEsy+gEZUT0LZANCAMBoLZlRHqBWNQQAUE1AtyAaAPQMuYAEfmAAvmGFoNgGwvcq0IwGQ5lCQHpOO8+DsaX/yE77jP5+S/wAzL+RD9h/QPjlf+yOMr/5Cd9xn8/Zf5qX8iH7C48mfd3PGP3VflB7dv5qZIhVkWVwGSAQyISoIGSJ0AAQj1DAYBkKyADZ/db+OOg+a1H3DWD1Nn91v446D5rUfcNPUOq3P0z5NnC6zb8Y83ZUHwEW9yQfAXQuh5qv0BdRsADNc9vf6I0fz+H8OM2Ma57e/0Sovn8P4cZqZ3V6vBoap1S54NImJlYlip7KAgDBIXGoINguUhbjZJqE8yDO9xsLqALk7AGHyJsNkDPqOyf4wsJ/iR/ciPl2fT9k/xhYT8uP7kR9ceP8AWp8Y82xidYt+Mebo+HRFJDoi3Lg9Ga87wPxY4h/GkfiwnMZ033gn/djiP8aR+LCcxssWk+5nx/DzDll16n9MecqLmKeZkdRUZAAQg0INiXCAXGqI8iAZYbt2Su3ofqwbDMQxnEZWH4ZSzKmpmu0MEC+t+S5nRHZf2U4fw6peJYupdfitrq6vKp3+6nq/3n6Gtk5VFiN56e519K0bI1Kva3G1MdM9kfmfg1xwH2RY3j0EutxWJ4VQRZpRQ3nTFyhei5s3nwhwZgHC8hQYVQQQTWrRz4/fTYusT/pY+ihSS8xmV/IzLl7pnaO56dpmg4mnxE0U71d89Py7vkJJIoIjUdpb5kYb5F2AaggApMykAWKQvIA2S3kNABVzIy9CAXXUjhT1+oajYD0fEvCmAcRSnBi2GU9Q2spvh8MyHpEszUnF/YhUynHU8M16nQaqlqnaLpDHo/U3xsLJ6n3tZNy37MuVnaLh50T6Wjj3xwn6/lxhjWE4pgtY6PFqCoo520M2C1+j0fofiTR2bjWD4bjFFFR4nRSKyREreCbDe3R6p80aY467FJkpR1nCk9zIUruinxe+/wAEe/RnTs59FfCvhKh6nyQyMfevHnn093b/AD8vo0yQ89fR1eH1kdHXU02mqJbtFLmQuGJeh4WdCJiVPqpmmdp6UTJuVIkSeSSbb0QR0yt0jafZH2YTscilY1jsqOThifilSXlFU/5Qc9z2fY/2UxTnJx/imQ4ZeUdNQxrOLyimLZeUP0m9YIVAlDCkklZJLJI5mXm7epb+q+cn+S3pNsjLjh2U9/xn4fDt8GFLIk00iCRJlQS5cuFQwQQK0MKWiSPIW4OQ9FiIiNoAwtRuEhAxYA89SgiyArGwImA2AYsALzI9AA3KQoE5WBSAPQt8iZlAC1kMgBEUgYAWyAAtgwGAuLjYmgFWoGQAMERQJyHUFAE3KwBAikYF5IlhaxbgQZl5omoBAABcqAQEeYKyMC6k6lSyIA1BWOoABkQF0JuA2BXpqQLkUCIot5kAFsS1ggHqUg3AXBSXzApAABSLQZgC5Ai1AAMbAH9QRdgBAUAQpFqGBSF2D8wBAmUACIoEWRcrAAR3GwDyApBtcXAbl2GpNwPS8cO3COMv/wCQnfcZ/P2X+al/Ih+xH9AePMuDcba/+HzvuM/n7K/NS/kQ/YXHkx7u54x+6r8oPeUfNmVERSzOBClAZAAIARgrIBCWK1cAQF0IwDNn91v446D5rUfcNXs2h3WvjjoPmtR9w09Q6rc8J8mzhdZt+MebsqX8BFJL+AjI81X6BZksUWuAWhrnt7/RKj+fw/hxmxrGue3v9EqP5/D+HGaub7irwaGqdUueDSJGUhVdlACBlGwg0AJ2EzKLEYFImGToNhlcakA2FJcXyIEB9R2T/GFhP8SP7kR8ufUdlHxhYT/Ej+5EfXH97T4x5tjE6xb8Y83R8OgC0Rcy3PR2u+8F8WOIfxpH4sJzE2dOd4P4sMQ/jSPxYTmFssWk+5nx/DzHlj12n9MecqVMxvmDqKjMMri5iLhGzK5GCEID2XC+CYjxHjUnCsLkObPmvV5QwQ7xRPZI/Jh9HVYhXSaGikxz6ifGoJcEKzibOqeyvgil4OwNSmoJuI1CUVZPS1f7EP7q+vU08zKjHp4dMu7oWjV6le48KI6Z/aPj5PP2c8D4bwfhXuemSnVk1L3TVRL30x+S8oVsj6vRWRdgViuuqurnVTxetY+Pbx7cW7UbRCZAWHUxfdQgQC7kZdRsBGFoLjQAgNQARSACpAm4AqI+oAF6E6l0JfICsmxQAJZPJ6C+QuB8/wAY8IYJxVRORitJDHGlaVUQZTZXSL+jyOd+0Ls4xrhObFUWddhjfvaqXD8DlGv1Xz0OqTCdKlzYIpcyCGOGJOGKGJXTT1TW5s2MquzPfDhatoGNqNO8xza++P373E8iVOmzoJMmXFNmRxKGCGBXcTeiSN/9k3ZbLwv2ONcRyoJuIZRSaZ5w0/OLzi+pdT7TAuA+GcGx6fjNBh8Mupm/BTd4ZXn4F+rf/wD4fTpJaGxkZ03I5tHCHI0TkpTi1+mytqqo6I7PHx8vESssy7AnQ5y6FwtR1LsACXmCAUZk6h3AZ3HUFANk0BQJkNWCgEMgRgUgKBGGGLXAXBbACFyAyAl8yoiADcFZACC1sMmABRuAJoW4tZgBsAQCoPUdCcwK9CFehGBWGgTcC6BE1L0AJkZdRqA1JfMuiIA5i/kCgTmAy5ATqGFzKBLF3BLgNy5WJ0F9gFhsXIZARXDQLcCFYZAKQuQsA2IW4AdSF1JbMC3BHcIB6FuHciAFI7jYBuOpXoS3mALkQAXUDIANA2TMuwEzsC7EALUpB1AtiaBDcCkDKBCggDcehVpcAACAek48z4Nxr5hO+4z+fsr81L+RD9iP6B8dfohjXzCd9xn8/ZX5qD5EP2Fx5M+7ueMfuq/KD3lHzZaGWqIi5FlcBbAhcgAGgvyAj+sAjAdAmEGBAwNgIbP7rfxx4f8ANaj7hq9m0O638cdB81qPuGnqHVbnhPk2sLrNvxjzdly/gIyMYPgLoZdTzVfRZMBDcAa57e/0So/n8P4cZsY1z29/olR/P4fw4zVzfcVeDQ1TqlzwaRbIyvUxKvsoAENysCMIDMAQyIBMwBqEAyBSdhAxsCNhGfUdk/xg4T/Ej+5EfLs+o7J/jCwn5cf3Ij7Y8f6tPjHm2MTrFvxjzdHw6FJDoLu5bHo7XfeE+K/Ef40j8WE5fvkdQd4T4rsS/jSPxYTl1MsWle5nx/DzPlh12n9Mecs0LmKYudNUWVwYlQRLLYGLPpOzThyZxVxdR4Wk/YeL2lTEv1ZUPwvpyXqYV1xRTNU9jOxYrv3KbdEbzM7Ntd3fgpUlF/0rxCX/AKTUwuGihiXwJe8fWL7Dc6SSseKmky5EiCRJlqCXLhUMEKVlDCskjyK5U796q9XNcvadNwKMHHps0dnT8Z7ZNx1BT4t8AIA2sLlSI1YComrKgkAJcoALqTQbjcBuNwVrICblzuS3MoDcWFxn5gTcasugWYBMg0ZdgIVWAAm4GhQCzCIEgKSwaKAGVxyI8gDKsiXyC8wKTTIrAEKEQCgaaAABlYZWuABNSgCZ2L1IAKxsTMAmC3IwCvcF+obgCB6gAVEsXNAQDcrAhcwRgCgeoAhWLgBuFkLgGRgMC6kfIoAiBUR6gH5gquS4ApC5AGkTUoAjLbIiK7gTqAUCblyRC9QIOYGewBMuViACkKQAUmhQCWQ2IALsQr0IBUyAoEKyX5D0AoAYEYKxfICAouBC5WIADAKAsTIo2AAmwADqABQENQJdAABoUciLIAwirLUgF1CF7MAek46f/sfjXzCd9xn8/pf5qX8iH7D+gHHn6G418wnfcZwBKylS/kQ/Yi48mfd3PGP3VblB7y382VihgsrgFhsUjCQhSMARF3DAlyFIAuL3BMgDNn91n446H5pUfcNYWNod1r446H5pUfcNPUOq3PCfJtYPWbfjDsqX8BFepJfwEU81X2FZB1AFWhrjt9/RKi+fw/hxmxjXHb7+idD8/h/DjNXM9xV4OfqnVLng0kRlbJcrCgBLgE7JUqMS3GwpAhuNkFhYuhNxsIAwidkBCmI2FZ9P2Tv+8LCf4kf3Ij5Zs+p7J/jDwj+JH9yI+tiP9WnxhsYnWLfjHm6PWhluSHQqLU9Ia57w3xXYj/Gp/wAWE5dOoe8Pl2W4j/Gp/wAWE5cTyLDpXuZ8fw805YR/vaf0x5yybFzEtzqKlK3Mkzx6lhIRLywq+R0H3Z8AhpeH6vH5kK9rXTPZSn5S4Hn9MVzn6mhjmToZUtXjiahhXm3kvrOy+EcKl4Lw3huGSobQ01PDA/lWzf0nL1S7zbcUx2rZyPw/S5dV2qOFEfef43e3zSC0D1IivvTQZFJkAuXYm5QI/JD1LkTQAVEKABBsBSBcy2An2l5EKrgQpNwAepQAIVPImQAasMDmAKS4ArJ1BQASJcbgUg3KwBBsAGRdyLmLAV5gmguAKQdAAKuhAAvkVk6gBoEVAQpBYCrUPUhckBCkKBBluXMlgGRdRbIbARC5SZAC8yIACkKA1A9RYCbBZouRNwLnoSwYAIbl6joBHyBQAIBoBQQqAXIV8hbICXFykaAMpORQIgUAQoAAhSAMgwALlYaEAFfQELrqAWodgGBBfyKkHkA2INgAK2CACgmwDmBcoEA3G4FuRFehEAKToM2A0G5W2QAwuZVzAEdx0DKBCsmRQGwDABE6FZHqBddSFSIAKTUqQHpOPP0Nxr5hO+4z+f8AB+al/Ih+w7/49/QzG/5fO+4zgCV+Zl/Ih+xFx5M+7ueMfuq3KD3lHzZooT8gyzOAAWDRCUAehADJmgxdACAAOgBOoDc2h3W/jjoPmtR9w1fubQ7rfxx0HzWo+4aeodVufpnybOF1m34x5uypfwEXMkv4CMjzVfgjK9AAysa37ff0Tofn8P4cZsexrjt+/RKh+fw/hxmtme5qc/Vep3PBpExKLla2efboik0JcnZLIguCNjdbluYXuL2J2GTYuRMbDYMwCMbAyXFyE7IGz6rsl+MPCflx/ciPk9z6vsk+MTCflx/ciPrYj/Vp8YbGJ1i3+qPN0jDoUkOiBZ3pLXPeI+K3Ef41P+LCctnUfeI+KzEf41P+LCctXyLDpXuZ8fw815X9dp/THnLIXIhudNU5ZIysYLIyTzDGXv8As7o1iHHWDUcSbhmVcF+ifi/odkQO9+pyn2DyFO7UcKf+79pH9ED/AMzquDJHA1Wf9SI+D0bkZb2xa6++dvpH8s2CIaanKXI6lIypAQpGXbMBkLJkLa+gADPQgF2I2EygQpC8gINigCXKS5XyAhcgicwCew1CAFIy7k3AZF2BHcB0KNiXAAMICgnIO4B6l3IVAAGAJcuRBqAfIaaguiAXAAEGTKAI9QisPJACDUoAjQGQF0HNE2LmAXMZXIVAR3FwUBcWRCgNiFIwFikRQBUTcXAlwvMpAKQbhABoMwBSLMLQANy6k11AFTAZAL0DA2AguXYmuoDqNy5EAAtiXAaj0KAJqOQQApEy7AAR8hqEAWZdiblYEehdiXzKBBmBpoBciFGwEuVEDAFGxEBSMpNgC0G4WQfmAYF7jqAKCALlGQQEuB1GTAAvImQFIwxkAWhURl2AhSIoEZSFYERc0TK5dWB6Pjz9Dcav/wDD533GcASvzMv5EP2I7/4+y4Lxv+XzvuM/n/Jf5KX8iH7EXHkz7q54wq/KD3lHzeQBMuhZVfVAgCR+RGUjAxYKyMCWAAEGpSADaHda+OKg+a1H3DV7Nn91v446D5rUfcNTUOq3P0z5NnC6zb8Y83Zcv4C6F6kl/ARTzRflGZC2YBaGt+379EaL5/D+HGbIsa27wDtwlQ/P4fw4zWy/c1OfqvU7ng0izG5GyFdiHny3BFqUnYNBclyNkbDJPzBiETsM0FzImHoNjdbkbJcjI2N1IQpOwbH1PZL8YmEfxI/uRHyrZ9T2SZ9ouEfxI/uRH0se8p8YffD6xb/VHm6Th0RSQ5IFmelNcd4r4rMR/j0/4sJyytDqXvFfFZiP8en/ABYTlrZFh0r3M+P4ebcruuU/pjzlU8zJZswRksjpqnLJ6E0QLYMGwO77MS7UMOT3lzl/4TqiC1jkDshrPcPaVgc5u0LqVLfSJNHX8vRrmV/VY/1Yn4PSeRtcTiVU91XnELzGpSPI5a3qS4WYAoJoVagTMZlJbmBbkzGQQACxdgHUi1HUc0AZeoysS4DqENS7AFzIw35AAxbIcggCzKOhADBXoRaAAwGBWNCAAXewGoAaoZkAbhhZF0AgzDeYuAFhcAUguAKQIoAEuLgUhURANAC8gItCktYtwD5AEAMLmABdGNQAGhGBuBbZEKw9ACyAAALQACblHMlgCZQ0iAW/kQdABRmRFuAZCu4AmxSBgBuXUXABhACFsBqAIUiQFGxCgBqTVl0Aheg1IgARb3AAaBMMAxbcmqABZspNCgQoIA3G45ABuOYCAPMpMh0AuVyDQAUbEzAFJYtiWApBsAKiFysTbMAiixOgApLu4AvJEz8wwAADAMIoA9Hx7+hmN/y+d9xn8/pX5qX8iH7Ef0A4+y4Mxv8Al877jP5/S/zUHyIfsRceTPurnjCr8oPeUfN5FmZLMwTMl5llcBlYDUBIRlIEIyOwYYEADAbgAIRmz+618cdB80qPuGsGbP7rXxx0HzSo+4amodVufpnybeD1i34x5uy5fwEZaoxl/ARkjzRfYMhcMgF6Gte8D+iND8/h/DjNlbGtO8F+iND8/h/DjNfL9zU5+q9TueDR7MU8wyMr2zz1lclzG5BsMri9zDcpJuzuLmNxcbDK+QuYXCGyXkvsQmgGyFuRsMhGyBn1XZJ8YuEfxI/uRHyh9X2SfGJhH8SP7kR9bMf6lPjDZw+sW/1R5uk1ojLckOhSyPSmt+8Sv7rMR/jU/wCLCcs7HU3eJ+KzEv41P+LCcslh0r3M+P4ebcruuU/pjzkMoTFamSOkqkqi3IS5LCX6sLqo6HEqaul/Cp5sE1f4Yk/6HbOHVMFXQ09VLiUUE+XDMha3TVzh6E6l7v8AjaxbgCnkTJniqMOidNH5+FZwP6GcjVbe9EV9y5cjcrmX67Mz7Ubx8v4lsXQBk0OE9FVgAAToGFyAoehNyvQCbBC5egEBepGAYa8hoXYCMFIBSDQIAwVEAPUdRsAA5l6EAvUELcAxewvzJfkBQ+REABSFAhdgRAAC+oBE0AyAuQIUCFGoAmYz8ykAbABgW4JcoAmZQ9ABL5jVC1wBUMyeoF6hDYACFADIWuFYMCMtsiZlAXQAAPUEvyKBC5kKgINitkyuBRvmHyIALqS5egBgiKAyIVaBsCaAoAhWNABFoC5WIgCz1KQANyggALMbABoUnQaAW1iFIAZUTYoEaKkS5QJoXPUnUoDUMiZUwIBfMrAiLqSxQBEB0ArIi66gCaFZNWAKTqGUCBl0DYBJEuVAAGQWACwyHoBWQqIAsNxfcXApCi+QHouPf0Mxv+XzvuM/n9B+al/Ih+xH9AuPf0Mxv+XzvuM/n7B+al/Ih+xFx5M+6ueMKvr/ALyj5s0ZIxRkiyy4KlIgQhbEyFyEivQxehWQARlIAAAENod1r446H5rUfcNXm0O638cVB81qPuGpqHVbn6Z8mzhdZt+MebsqX8BGWxjL+Aio80X4QFwgKzWneC/RGh/mC/DjNlmtO8H+iND/ADCH8OYa+V7qpztW6nc8GjWY3KzFs4Ozz0bJchRsFxchBsMr5Zi5jcInYZFRBqNjdUymIGxutwS4uNkbqfVdknxiYR/Ej+5EfKXPq+yL4xcJ/iR/ciPpZj/Up8YbGH1i3+qPN0otEZEh0LuWF6Y1x3ifisxL+NT/AIsJyydTd4l/3V4n/Gp/xYTld8iwaV7mfH8PN+V3XKf0x5ypTFFR01TlkVERSWK+ZsTsD4pg4f4zgoqqZ4aLE0pExt5QR395F9OXqjXTZIW4YlFC2olmmtj5XrcXaJontbOHk14t+m9R0xLuqHPlYySNfdiXGkPFXDUMirmJ4pQwqXUK+cyHSGYuu/M2CvMql23Vbqmmrph7JiZVvKs03bc8JQoCyPm2U1GgD1AMIuwAmRR0F76gAgABMysMCDUpMgKHyAAlwGVAR8hsVoICIo3CAmeo1GZQJkCgCMC4WTAFGVyAHcIPIuVgIy2QQsAIVMjAFBEvMAsmUm4YFREwgAzuLAoEyKCAUbjTUisBd7B6hWGgBDIEsBUGLkAbAaooEQWoQTzApGXcABfkNy2AxKLhANQLi4DmQoQC25FmUIBa40QVyPMAtS2IXMAAhuBNxcpABcwQCh5giAPQFJkBQEwBCrzIOoApEACA6ACgMICABAAUZAQFAEYC1KAuQFAAhQJmgFqXcAHyINAGZSZF2AlwtQNwLuMwQBmVBDQCNFIV8wJqCk3zAuxC6DcAswQuYHo+PP0Mxr+XzvuM/n7K/NS/kQ/Yj+gXHv6GY3/L533Gfz9lfmpfyIfsRcOTPu7njCr8oPeUfN5AuhDIs0uCFzAsQBSWFgBGikYEZCshKAAAQ2j3WvjiofmlR9w1ebQ7rXxxUPzWo+4amodVufpnybWF1m34x5uyZfwEZGMv4CMjzRfQligBka07wf6IUP8AMIfw4zZRrXvCfohQ/wAwh/DjPhk+6qc7Vup3PBoyIwMmYs4mzzwJcMg2FuRslwRsKCC/kNkKmVcyAbDIg6jkTsKMiC42Bn1fZF8YuEfxI/uRHyTZ9X2Q/GNhH8SP7kRnaj16fGGxh9Zt/qjzh0xDoXfQkOgO+9Na47xfxWYj/Hp/xYTlc6n7xeXZXiX8en/FhOVrlh0r3M+P4eccreuU/pjzlkjJM8abMkzpKpMPJsLmCZlcMdgqZHYJ7hjMPfcE8R13C3EFPi9DF76W7TJbfvZsD1hf/wDMmdccJ4/h/EuCSMWw2b7STNWcL+FLi3hiWzRxT4j6/sy45r+DMY9tKvPoJzSqqa9lGv2l5RLz9DQzsP09POp9qFj5P63OBc9Hc93P2nv/AC6+Iz1vDeN4dj+EycTwqphqKaasmtYXvDEtmvI9mVyYmJ2l6hRXTcpiqmd4kREAiGZncoQAlw7WBWBLlJluGwBchsToBcyBMMBcblItQCzKBmBC3Q1JZIAFkNQAKkTqMwKwCXsBciWLbcgAaixQJyBUACBBqBdSFZABdg0RAAivIgFBOpddAJuBsAKGQagBbyLyIBbZAE6gUdANAIrFdiACqw3DRAKRFIBQydBfMC65i/IIAQJF9CAMikyG4AO4LfMALohQAAAWzIAwBWkQW5gW4BGALmGTUBYblIA0Y6lIBXbYP6RlsFoBEVE3Gm4BaltZhXABBEAFsLAiAbFTGw0AgsVEuA1KQbgUDcAQpNwAKRhfQBbDIgAoBGBehAi9QGQHMgB2AeQ6gBoUn1gLh3CKBGNhuUAQXHMC7BXJ6jPYD0vHv6G41/L533Gfz8lfmpfyIfsR/QLjz9Dca/l877jP5+yvzUHyIfsLhyZ93c8Y/dV+UHvKPmzRkjFGXQszgLYpECBUAAlLXGQGwQxaIZEepIhCsxepIu5tHus/HFRcqSo+4atZtLus/HDRfNKj7hpah1W54T5NnC6zb8Y83ZMv4C6GVzGX8BF6Hmq/QpMy7EyAGtO8J+iFD/MIfw4zZhrPvC/ohQ/zCH8OM+OR7uXO1bqdzwaLZGVmDZxtnnW42S5G9ibk7G6hhgjY3GNgQbG7JFRiijY3W4IBsbqGRkY2RuNn1fZE/wC8fB/4kf3Ij5Nn1fZD8Y+D/wASP7kRnaj148Wzh9Zt/qjzh01Doi7kh+Cirkdx6c1r3jviqxL+PT/iwnK18jqjvH5dlOJfx6f8WE5UuWDS/cz4/h5zysj/AHlP6Y85ZoqZhfmVM6aqzDyIyueNMyTDHZlfIEvkAjY6jYjuVBGz6js+4zxfg7FPdeHTPHIjsp9NG37Oaufk/JnUHAXG2C8Y4d7ow2d4KiBL29LMdpkp9N1zRxymfpwvEq7Cq+VX4dVzaWqlO8EyXFZr/NcmaOVhUX+McJd3R9evafPMn1qO78O40/IqNLdm3bVR1ylYfxWoaOquoYayBWlR/LX6j56dDc0qbLmyoZsuOGOXGk4YoXdRLzTOBesV2Z2rh6Vg6hj51HPs1b+ceMMtwxzLfI+LdRFRAwD1A0LrqAQIXawDQhdsyIAMijICJZh3GexQJfILQaFsBC5kAApCrqAZLFsABC3AEKxmR8wHQC5XYCIaAWAtwuZGAKhkNiACgAQIFtmAZCgBsS5Q0BEV+Y10IADGdgrbgNCu9iblAajQIMAGTmALuNgLgQvQhQAtzGoAXdiaZh9S3yAB2RNwAKiBAVi9kR8igATMt8gIik6BZALIqJcvIAxsQLQBqNwtABXmRFysEBOgsUgAuSyGTIAAKACJkVgGRFaDyAhWTMbAVvIIInIBuXUMgAuw9CAEFqLlAjKCAXXQj5lJqAWReZFqL7AVAgAMCyAF0GxC7AQWKTcC9CIFbAmpbEKBABuARdiBcwFrjccwB6Tjz9Dsb+YTvuM/n9K/NS/kQ/Yj+gPHv6GY3/L533Gfz+lfmpfyIfsRcOTPu7njCr8oPeUfNmUhfMsyvqLpkCISoI0AkACAEKyIlCMhkzElBY2j3WfjiovmlR9w1cbR7rPxw0XzSo+6aeodVueE+Tawus2/GPN2TB+bRSS/gIp5ov0KwiIoENad4X9EKD+YQ/hxmzDWXeG/Q+h/mEP4cw+V/wB3Lm6v1O54NFsxZWYnJ2edIwkNhcbG6mLuRjxEbDIHtsI4Y4ixekdXhuDVdTTq/wCUggyfS+voetnSZkibHKnS45cyBuGOCNWcLWqa2JmiYjdnVbrpiKpiYiXjRdrEuHoRswW5LkzBOyFuwQDYGfV9kPxjYP8AxI/uRHyZ9Z2QfGPg/wDEj+5EZ249eGzh9Zt/qjzdMrRFQh0COw9Pa17yHxUYn/Hp/wAWE5RTOre8j8U+J/x6f8WE5QuWDS/cz4/h53yrj/d0/pjzlmZI8aZkjpKvMPImZJnjRkmGEwzbFzFMoYzC3KYlJQyQuS4YY7MoYj6/gXtD4h4QjUuhqfb0Ld4qSfeKXz8O8L6fQfGsJmFdFNcbVRvD62L93Hr59qqYn4OsOAe1bhvidS6abN/s3EXl7nqIso3+5Fo+mT5GwE01c4TgdrM2DwV2rcTcNQwU8U9YnQw5ewqom3Cv3Y9V9aORkaX22p+S56byu22oy4+cfvH4+jqwh8DwT2q8L8S+CQ6h4dXRZe56pqHxP92LR/byPvYYk0rbnJuW67c7VRsumNl2cmjn2qomFuEUjzMGwpAUCOwRXYgFIupWRAUmYsgAZScwAYtlmFoVZgAxoQCkuhYoEAGoFAG4EbsyvQEAAAC6jcjLkAsRMoAiGSGhdQILl2JqAKxow7gQMoAAC27AbEDAAMIoDoQdCgQPUFQABkAMoTD0AhciWKBFzL0IXUCXKCAVIBE3Ao6EHUCtiwYAiDuLgChomwvsBVoHkCAUAAQoJmBWNhbIAEiPQo2AmwFigRgtyAL2CKGBOoKAIVoWFwJfIr0yAAly67EZVoAY0IFkBdwyFAhQyagUgKBM7BIquQBcuRNhkBbDcnQAX0AQAWDzBAFxuV5EArRNBuAKyDbMfYBQNiAek49/QzG/5fO+4z+f0r81L+RD9h/QDj924Kxv+XzvuM/n/K/NS/kQ/YXDkz7u54wq3KD3lHzZgFLM4ABYWISbgtgA2ILgJAASG5izIxYYp6m0e6x8cVF80qPumrrG0e6z8cNF80qPuGpqHVbn6Z8m1hdZt+MebsmX8BGWRjL+Ainmi/QrJuCgHyNZd4f9D6D+YQ/hzDZhrLvEfofQfzCH8OYfK97Eubq/Urng0UTIjZGzl7PONxsxbDZiydhle556CjjrK+mpoU2506CXZa++iS/qfmh1Pq+y+mdZx5g8lZpVCmPpCnF/kTEbzs+lqj0lymiO2Yh0pQUkmjo5VLIlwy5UiBQQQwqySSNF94Oigp+LaSqlS1D7rpfFMaVvFFDE1fraxv5rXmad7yVOlS4LWJZqZMlRPk0mv6m/kU7216121E4VW3Zt57NNJ+ZbkWeYaOfsocyodiNkGzHdWxfIjINhkfWdj/xkYP8AxI/uRHyVz63se+MjB/4kf3IjO3HrQ2cLrNv9UecOm4dAnmFoNzqvUGs+8l8U2Jv/AL+n/FhOTvFkdYd5X4pcT/j0/wCNCclws7+l+5nx/Dz7lTH+7p/THnLyp3M4WeJPMzTOmq8w8qZU8jxpmVwwmGZbmN7luSwlncIxTLcMdlRbmJUEbKwQuoQyTKjFIyDF5JdtT7jg3tM4m4ZUEmTWOtoof+zVTccKX7r1h+zkfCJi5hXbpuRtVG762Mm9j18+1VMT8HUPBfbLwxjkUFPiETweriy8M6K8qJ8o9F62NkSpsubLhmy44Y4IleGKF3TXU4XhhWp9NwjxtxHwvGv7JxOZBIveKnme/lRf4Xp6WOXf0uJ4252W7A5YV0bU5VO8d8dP06PJ2NbInU03wh264VVeGRxHRR0E52Xt5F5kp82vhQ/WbWwfGMNxilhqsLrqeskxfryY1El18mcm7j3LXtwueHqeLmRvZrifh2/TpfuuArMp8W+m5dATqAuULIZARZgDfMCvQiuVsIA/Im4fIoC9xfIjRUACyBAKOhC8wIGBsBdgkNrDRARLMblGSABaEKBM2XYl7IoEFxZgBqysABkGNsyXAr5E3AAFYfMgFJuLsAVcgENQICk5gCkbuVW0AmgLYmrAvUDUAQFJ1AuxCom4FyDIVARgu46AQoehLABYaFAcgQAVkL1IBQQvQCblBEwGZfUE3AFQY0AjKiPQJ5gXIZEyAFbuNFkABNysaDUCFIHqAC8y2IAeosNR6gGVaAAQpORbAAg+ZAG4v5hhgXoOoDAEKQBuUWzJzAWKTUXAabjcBAXcg9BqA6jcFdgFs9ByC0zFgFrEZUS4Ho+P8+Csc/l877jP5/y/zUv5EP2H9AOP1fgrG0v/AIfO+4z+f8r8zL+RD9hceTPurnjCrcoPeUfNmjIxKWVwFsC3JkQkIzJWuGBiWxChJYj0LmRolCMjMiNbgYvU2j3WfjhovmlR901czaXdY+OGj+Z1H3TT1DqtzwnybWF1m34x5uyJfwEZGMv4CKear7CjIhbAMzWPeI/Q6g/mMP4cw2azWPeJ/Q6g/mMP4cw+d32Jc3V+pXPBohmDdyxGF2znbPN1egRLi/kNjdmrH3vYNTxT+P4JyV1T00yN+tkv6nwF8ja/dtpHHimMVzWUEmXKXVtt/wBDO1TvXDoaTR6TMtx8d/pxbvUTsa67wNMp/AsM/wAN4qeslxX8k7p/0NjQrI+W7V6VVPZ9jMvw+JwyPaQ9YWmb9yN6ZhfdRo9Ji3KfhLmZrwmDY8fis1uRnM2eZIyC+xHoTsblymNxcbG6t5H1vY7F/eTg6/fj/DiPkG8j6zsdv/1lYN/Ej/DiM7cetDZwp/3Nv9UecOoIdDIxh0RmjpPUYaw7yvxSYr/Gp/xoTkpPI617yyb7JMU/j0/40JyTod/S/cz4/hQOVPWqfCPOWaZkmeNPMyTOkq8w8yZlc8SZkmSwmGdzJM8abKGMw8lwmYwsyRLDZkmVECCJhkEY3CDFmnsVMxTKgx2ZjoYoJhEs0zJMwSKgxlkrPU9hg2K4jg9ZDV4ZXT6OfD+vKjcLa8n5rkz16fmVRZETETG0kVVUzE0ztLc3CHbliVIoafiKjgr5ejnybS5q5tfBi+o29wnx1wzxNClheJyop9s6eb+Tmr/C9equjju5YI4oIlFBE4Yk7pp5pmhe021c408JWTA5U5uNtFyefHx6fr+d3dF7lOVeEu1vi3AvBJnVSxWlWXs6tuKJLlH8L6bm4eD+2LhbGvBJro48IqnZeGod5bfKNZfTY5N7AvW+O28fBc8HlLg5W0TVzau6fz0NkkRhJnSp0qGbKjhjlxq8MULumuTPJtkaTvxMSjuCrQgSuwQIrgA8yvTQICablDCzAl8guYKBBcBAABsAuW+REW9kAVwxqHoBGC6ETAouCAW4yuOhLgVkKtCPUCkQY1APMLUFANk6lIgLmGS7CAeg2BQJdjMoYEKTMoAbAAQoHoAeuRNS6EYBZF5kQYFJmUm4FJmC6ATcugROoFeaCuQvqAJZF0IwFioi0KBAV2IA3KMgBCvMgAIvUlh1ArJsHYuqAmhbkzGQBlCYAheQGwELkyDkBV5EfkVIX8gBNGAwBQR8gBdNAs8xe2wDUm5RuBGiobhZgECabhsChkYQAC+wApLWFirmBOgbQ6AAggXQCAIAUiKyMCoE5lA9Jx5+h2NfMJ33Gfz+lL8lL+RD9h/QDj3LgzGv5fO+4z+f8r81L+RD9hcOTPu7njCr8oPeUfNkUhUWVX1A1ASqDAAjIisAA0GCRAVkAxiSNo91j44aP5nUfdNXvQ2h3WPjho/mdR9009R6rc8J8m1g9Yt+MebsiD4CMjGX+bRTzWV9H5BaBlXkANX94z9DaD+Yw/hzDaDy3NXd479DKD+Yw/hzDC57Mubq/Urng0LclyXQuaOzzXcbZE2GYsbG7yQZvM3x3cqT2XDGI1b/AO0VvhXSCFL7TQkMSVjpPsOpoZHZvh8xa1EUye/8UTPrZp9d3uTlHOzOd3RP4fc6H4cekKrwWupXColNppkFvO8LP3JNiKGzh65m5K+VRFVMxLjaCFwLwRaw+9fpkVxH7uJ6d0PEWJUjVnKq5kNv8TPW3OdMPKKqebVNM9jNsxbJcMbMVbI+RBcbINj67sb+MrBv4kf4cR8gfXdjnxl4N/Fj/DiMqI9aG1hdZt/qjzh1FDoLkh0BvvUoa07yijfZFi0UMEUXhm08Tsr2Smw3ZyL7RRaHf9XTyqqnmU9RKgnSZkLgjlxwqKGKF5NNPVHK/bj2TTeE6mZjuByo5mBTYvfwK7dHE/1X+49nto9m+xpmRTTHo57VP5S6fcuTGRTxiI2n8tUJs8kLZj4baFTOypLyQmZ4oXmZpoMWS1MkYXMiWMsypmMPUy0DFmmhcxuEwxmGVymNyoljsyXkXQiAY7MioxTKETDJMyTMEVBjszWoIvMqzCNlBCoIWG5mmYFTDF9FwpxlxDwxMUWEYlNkyr3ikRe/lRdYXl6qzNw8H9umG1ThkcS0UVDMeXuinTjlvrD8KH0uc+3uRmtexLV72o4upga1mYPC3Xw7p4x/fDZ25hOK4di1HDV4bXU9ZJi0jkxqJettGfsWehxNgWMYpglaqvCcQqKKdo4pUdvEvJrRrkzcHBfblPl+Cm4po/aw6e6qWG0fWKDR9Vboci/plyjjRxXbT+V2Ne2pyI5k9/TH5j+8W+rMHquHuIcHx+kVXhGISKuVb33gi99Byih1hfU9qn5HNmmaZ2lbLdyi5TFVE7xPcheg5jIhmiBdiAHmUhbcwD1HQbDYCWLZjUgBgpNQLkNCZXDAMblFkBMy7AaAQFuNwA1IVNARi4GYAWKLATIaDcuwELqETO4BB6j0AAFDAbEFhsABSAVALIAGFexCgTIpGUBkQBgCkMgMdS6gZAAGQCh/QQICgAARBlAZMgAFIAAzGpQBAW4YAWBLsBuNwGBb8gRZFAcxzJ1LsBH5gLUAUhQAQbJuUCFAAlwxkVAS7G2QLbcCCw6gBa4uUgBahoLyLsAsBmNdQFgABMiojCAqzI9QigHkQFAj8kBoLZgek4+/QzG/5fO+4z+f0v8ANS/kQ/Yf0C47/Q7Gl/8AITvuM/n7L/NS/kL7C4cmfd3PGFW5Qe8o+bNFRjcyLK4KgiZkAYAAgDIwLfMEGhIpGABDaPdY+OGj+Z1H3TVzeZtHus59sNH8zqPumnqHVbnhPk2cLrNvxjzdjy/zaKSX8BFR5rK/F0VktYaAVGre8f8AoZQfzKH8OYbS2NW94/8AQug/mUP4cwxr9mXM1jqVzwaCbImGQ1NnmitkZi2E8xsbsJjaTa1s2dc8CUMOH8HYRSJW9lRy0+vhVzlXDKR1WIU0hK7mzoILdYkjsGTApUqGWslDCoUuiPtahbOS1O9dyvu2jzen4ixR0OP4BSKPww1tTMltedpbf2nvJjyNQds2M+5O0DhKWo7KnnKdGr6KKNQ/YbZbcUV1ofWJ4yseLkelv3rf/jMeUOYu2Glipu0fGFaymzIZsP8AihR8psbN7wlI5XGlNU297UUUOfm4W0ayi1NWqPWl59qVHo8u5T8Z+/FGypmI2I2aW6jYiYbGwrZ9b2N/GXg38SP8OI+QZ9d2N/GZg38SP8OIypjjDawus2/1R5w6jh0RkSDQptvU4HkeKplSqiRMkT5UE2VMhcMyXHCooY4Xk009UzyZbhoImN+EuV+3Tsln8NxzuIOGpMydgzbin06vFHSc/Ny+eq38zT0uPxH9BZktRwuGJJpqzT0ZoHti7D4Zkc7HOCqeGCa7xz8Nhyhi83J8n+5p5eR2cPP32ouT81N1jQJje9jRw7Y/H4+jn6FmSZlMkTZE6OTOlxy5kuJwxwRwtRQtapp5pmNrHYUyrhLNMyR408jJMlhLyLUt7mCZkrhEsi3MUVBiyKjFMtwxmGaYRjctwx2ZFRiiq4RLLYq1MUZIMWSewTZjcqCJZXLuYsqbJYsx0RLsXCNluUxKghVqZpmF7oJtBD92F4lXYVVwVmG1k+kqIPgzJUbhiXLLbkbc4J7cqqncFNxVTe6Zay9108KhmLnFDpF6W6M0tcHwvY9u9G1UN7C1PKwat7Ne3w7J+TtTh7H8I4golWYRXyayS9XA84H5RQ6wvkz2iz0OJsFxbEcFrYa3Cq6fR1EOkcqK115PZrk8jdXAfbfKmOXR8WSFKi0VbIg96/lwLTrD9CONkaZXRxo4x9180zlbj5G1GTHMq7+z+Pn9W7in5sPrqTEKOXV0VRKqaeavFBNlRKKGJcmj9KOZMbLdTVFUbwmReoASgTKNAICpk11AoehCgQFZALYE01AAPMtgwCDJuAGYSKydAGZQskEAJmUMBkQFADqQJgW5CgCalG40AKxBuXVACPkNgBQEW4GLzKgyAVk2CRQJ6Aq5h2AhdgQAgGrMoEAGYDQqAAcxbkQt9wBAUCMoYSAjzLsHyI8sgGdhcuxMwFwBsAZQwBMhoNSgQtyZBAUPNDclgKGyepQIEXIbgRoalFwFyNsblYEZQRXAuwzsAAyGYyIrgMxsCgRZFegIATLoR8hyAraJmVpEAahFGQB8iDUWsBdiF2JsBSFQyA9Jx1+h2NfMJ33Gfz+gX5KX8iH7Ef0B46/Q/GvmE77jP5+y3eVL+RD9iLhyZ93c8YVflB7yj5simJUWVwGSKRMXApTFi4FZPQB6BIAQIGLkASrNod1l/wB8NH8zqPumrWzaPdY+OKi+aVH3DT1DqtzwnybOF1i34x5uyZfwEUkv4C6FsebL7C6kLcADVneR/Qug/mUP4Uw2mtDVfeT/AELw/wDmUP4UwiroczWeo3PBoJsxZGwsz4bPMkZYXZoNKxhFF4RsRL6zszke6+O8GkJeL/SoY2uUN3/Q6lmvN2OauwCRHVdosmas1TU8ya/oUK+06SScWT3PrbjaF65L2+bjVVd8/tDmzt0r3O7Rqty4r+45UuBcooYfE/rOjcBqFWYLR1a0nU8Ef0wo5Y40qIcR40xms/Vm1ky3S9jozsmrPdvZzgs15xQ06lPrC/D/AEIp6Za+hZMXM+/Hfx+k/wAvhe8lRr3Ng1elnDHMkv1SaNJxvO50P3iJCm8A+6EvfU1XLjvyd0znSKJNmFdPrOTyht8zOqnviJ/b9luRGNxdkbOJuzIyLUrGxup9d2Mv+8zBv4kf4cR8c2fX9jHxm4L/ABI/w4hEcW1g9Zt/qjzh1NDewEOg6mw9VgWYCAFJEk1mM7DYDX/ah2XYHxpKjqbKgxdQ2grZUC9/bRTIf1lz1Xnsct8ccH8QcHYm6LG6Jy4Ym/Y1EHvpM5ecMX9HZryO5D8WNYVh2M4dMw/FKORWUs1WjlToFFC/8nz1N7Gzq7PCeMOFqehWczeuj1a+/v8AH8uC4TJam8O0rsHrKX2uI8FxxVUnOKLD5sX5WBf93E/hLk8+bNK1NLUUtTMpquRNp58qLwzJc2BwxQPyaeaZ3rN+3ejemVBzdPv4dXNu07fHs+rxozREhex9nPlloL5k5hAZIq5ERUEKUEDGVTMkzDMyQYzDNO+hbmMJlqGIVOxEUIlUy+piZIIUqZAEMkymKZbksZhRcnQqCFRUQoRKlSuQaBi+i4L4vxzhOrc7CayKGVG7zaeZ76VM6w+fNWfM6E7Ou1LAuKvBRT4lh2KPL3PNi97Mf7kW/R2fU5ZvkTNNNNprQ1MnDt3448J73b0rXcrT52pnenuno+Xd/eDuZPyKc5dmvbBiOEKXh3Ejm4hQq0ME/WdKXX9ddc+ex0Dg2KUGL4fKr8NqpVVTTFeGZLd10fk+TzOBkYtyxPrdHe9K0zWMbUaN7c+tHTE9Mfx8X7SblyBrOsjLe6I3kNgFswEEAL6kRWBOpbkAFIVEYB6BBsqAPQgdwuYFQDItADLcbkfmBeoegtcgApGAHqMwLgFqUbDoA3FwQAEUiYFYsLi4BgjF2ALYbEuABdQBCsmpboCMaIuYsBCsXFwICkALzF8wMgBSLIoAEsLgVgiKAQvmQcwK35BkGgBXLcgfMArFbIUAR9ChgNiAeoFehNi6BgERlsTMAygbANURIZlelwBCkAtvMm5QgAD1JqALsGAIwivXIaZgQXLqQANy2AEsCgAS/mUgB21KNiAW2dxuBfOwHpOOv0Pxr5hO+4z+fkv81L+RD9iP6BceZcG418wnfcZ/P6X+Zl/Ih+wuHJn3dzxhV+UHvKPmyBLhMsrgsshuQm5G4yAAFBMg3mNzYYehAQnYZA9SMlGyM2n3V/jio/mdR9w1Y2bR7rHxx0XzSo+4aeodVueE+TawusW/GPN2VB+bXQzVzGX8BFzPN18gZSACs1V3lP0Kw/8AmUP4Uw2oar7yf6F4ev8A6lD+FMDl611G74OfsyoyiSSPG3Y+ezy+Kt2TaPDNeRk4kZQwKIbMt9m1u7BSOPG8YrmspdPBKXWKJv8Aob2xSeqPDais2kSY5j/wwt/0NX92nD4ZPDWJ129RWeBdIIUv6s+y7U654f2eY5UKLwtUkUCfyrQ/1M6eh6JpP+hpkXPhM+bllzYpsUc6J5zInG/V3Ogu7xXe34EmUzf+qVsyBclF75fac5QzV7NJPY3L3X65xRY9h7eV5U+FdU4X9hERxVPk3dmjOp37YmP3/ZsXtbplXdnWNyvD4mqVzIesLTOVJUXihUXnmdkYzTe6sHrabw39tTzJdusLRxtLTlL2UfwoG4H1Tt/QVQ6fKmja7RX3xMfT/wBvJctzHUGOyq7si3MLhsbI3ZH2HYtn2m4N8uZ+HEfGXPsuxVv/AKzsG+XM/DiJiG3gz/urf6o84dTLRWLkIc0hYzeriAKA2FkQACk1ADI+V484B4c4xp/Di1HaphVpdZJtDOg5eK2a5O6PqgZUV1UTvTO0vnds0XqZouRvE97kvtB7HeKOGXMq6CB4zhsLb9rTwP2sC/fl6+sN10NbJ7eh344Ve+58H2gdlfC3F3tKibTe4MRjz920sKhiif78OkfrnzR1rGqT0XfqqOoclonevFnb4T+0/n6uQLmSPvuOuyLizhdzKiXI/tbD4f8AtNJC24V+/L+FD1V1zPgoU0da3couRvTO6nZOLdxq+Zdp2kRUQH0arNFMFpmVMDJFRChEsri7IUMVRUiItwiVWRb2Mbi4YzDNMXMUyphDK6GREUIZIqMUzJNEsZVGWRiS4QyZTFMXDHZWExcA2Zpn0HBPGWM8JYj7qwuo/Jxte2p485c1c1581mfOXGpjXRTXG1Ubw+lm7XZri5bnaY7YdcdnfH+DcZUlqWP3PiEuG86jmRe+h5wv9aHn9Nj69aZHEGG1dVh9bKraGomU9TJi8UuZLitFCzovsn7V6biBysIx6KXSYrlDLm/Bl1D/AOWLlo9vI4OXp82/Wt8Y8no+icpqMrazk8K+yeyfxP2n7NqsmVi3BzFvBuOgAjKs0BoBENCsAQy1RiPUBuBsXYCFIi7gTfMuiGoegE0Ksyal2Am4BQFyXzK7kQDcFJ0AWGQRcgJsAtQBdgNiAXkBsAJfMtkQoDMjKAJoXNkCbuAuUm5WgIrlIhyAu2RBmAKtCFRMrgLiwLyAgQF1YCkWuRXexEBcyMosBN7AFyQEZUAwIUnUaALBZAqYCwI2GAYQ2AFQYAAhUSwBaF6E6i4AMFyuA2D0Dz0JsAYvkEAAQDAAIAXYLmGTqA0BQAIxmALmHyCHQCPUuhCsCdAwUAkQoA9Hx5+huNfy+d9xn8/Jf5qD5EP2H9A+O/0Oxr5hO+4z+fsu3spfyIfsLhya93c8YVjX/eUfNUVEZSyS4MAA0IFQCIwDYYMQMgiFuADtYNkCdmL1Npd1b446P5nUfdNWs2j3V7/9cdF80qPumpqHVbnhPk2cLrFHjHm7Ml/m0ZK5jL+Ai3yPN17hQFoAI9DVPeWy4Kw5/wD1OH8KYbXNSd56Jw8EYdb/AOJw/hTBDl611G54NBRTT6XgTgvGeM581Yepcmmku02pnX8ELt8FJZt8j5FeJrc6s7GsBiwLgHDqeZC4Z9RB7qnJqz8UeaT6Q+Feg22UbRdOpzcjm1+zEbz+Ghu0Ds7xzg+VLq6mOTWUMcSg90SE0oInook81fZ6Hy9O7rM617Q8H/t3gzFMKghTmzadxSsv14ffQ/WkckTW5ctu1mldoiYZ69p9GFepi37NUf8AuPJ092HUqpuzfDY0rOoimTovWN2+qx6zvHVXufs4nyVFaKpqpUq3mruJ/YfV8A0zw/gjBaTeVRSlF18KbNY96Wu//DcEoL5x1Eyc1yhhSX2sypjjsteZ/t9I5v8A9Yj67Q0VdqE2X3aqxye0GbTxRWhqaKOG3m4WmvtZrdQ3R9b2OTvcHaVgs5u0Mc9youkULX22J2UjT70W8u3V/wDaPN1i9IXzRx/xfh7w7izF6N5exrJkK6Xv/U7BULskcwduFMqLtJxNbT1Lnr/FDn9hjstXKy3P+PRXHZPnH8Ph27EcRhG7smZOykM7lTMFzKTsjdkz7HsVa/6z8F+XM/DiPi27H2HYnd9qOC/xJn4cRGzawOtW/wBUecOrYdAxBoFzIetQAu4AW8yJDcvUCPIIvQW8wIUNDQCAFSAlk3c+D477K+FeK3MqJtJ/Z+IR5+66RKGKJ/vw6ReufM+8YSM6LlVud6Z2fG/j2sinmXaYmPi5L437HOLuHXMqKSQsYoYc/a0kLcyFfvS9V6XRrlpwxOCNOGKF2aas0/I76a9D5Djfs54V4thijxLDoYKtrKsp/wAnOXVrKL/EmdWzqkxwuR81TzuSlNW9WNVt8J/P5ca3MkbV417DeJMHcdTgcyHGqNZ+GFeCfCucOkXo/Q1fPpp1LPjp6mTMkzpbtHLmQuGKF+TTzR1bV6i7G9E7qfl4V/Eq5t6mY/ve8aMlkLolz6tNmEzC5UETDNB3MS3CFuLkCyCF6GRiuZkGKlTMUW4RLIIl8gEM02OZiioMdl5FIEELcyuYopKFCdidChCplTaaabTWaaIZLQbHQ3j2Odq8UTk4BxTU30gpq6Y/ogmP7Ivp8zecESiRw1exubsU7UoqWZJ4c4kqG6Z2gpKuN5yvKCN/s+T2ONm4H/Zbj5L1ye5STG2NlTw7Kv2n8/V0ATQQNNXTRWcV6AMZAWAaBE3KAQasCAEXcmaABgcy5AQvUACbDYLyAFV2HcmwzAMIIaAVgE0ApGUARFQtuGAGw6BARIuRC2AbEReSJpkAKxyAAME3ArJ0LuLbgTMbBABsVhEzWQFtkT0AuBQiFdgGRLIMLMBcuY0IAKwL3AmhWS/mHoAQFrBagVrIdQRgNykXMbgXIgXMANxuUARgACgMgAFQAgZQ7gENyBgBuENNQKGCMCgbk3ApGUdAJsGABUQbgCt2RFkLBAUj1KsxuBEGXYbAARAD0vHX6HY18wnfcZ/PqW37KX8iH7Ef0F46/Q7GvmE77jP59S/zUv5EP2It/Jr3dzxj91Y1/wBuj5skZGOhUyyuCtx6kBCVAZADIUxAoBAKEAwkZtLurL++Kj+Z1H3TVptLuq/HFSfMqj7pp5/VbnhPk2cPrFHjHm7Kl/m0WxJf5tFZ5wvSjqRZDMCtmre8fRVNZwbh8ulpp0+OHEoYnDKgcTS9lMV8jaVrhpWsTE7NXNxoyrFVmZ23co8BcKVuK8YYZQVmG1culjnKKfFHJihh8EN4mm2t0rep1ZA1CrOyS0S2MY0loet4gxOTg2CVuK1MSUqkkRzorvXwq9vXQdMtHTNMt6Xbr9bffjM/CP7L2jiSdzkvtDwWLDe0mtwSVA4Zc6rhchfuTWnD963odQ8NYjLxrAqDFZdlDV08E5JO9vEk7emhrztR4YVV2ocHYrLgTU6pUidl/u37SG/oovoEcJ4tTX8WM3Goro47TH0nh+8Nn00mGVTQS4UlDLgUKXRWOeu8zUKfxhh9LD/2aiu1zjib+yx0ZZXiRy121Vnu3tIxZ/qyIoZC/wAMKRNEbyw5UXfRYUUx2zEfu+GhdrHs8AqvceNUFXe3saqVMvyUav8AVc9ZFZM8U6dEoIktbO30H12eezM7xVHY7gUxRwqOF5RJNepzt3nKVyeLsNrF/wBpo3C+sEVvsN4cF16xLhHCK9O/t6OXE3/hsaz70OHqZhOC1yh99LqI5TfKKG6+tHypji9J12IvadNcfCfvDQ8EWSueWC0Wp4opcSR9x2DYLIxntAlQ1shT6akkxVEUESvC4llDf1M5jZQMezOTdptUzxmdnz8PD+MzKeGfLwfEI5USvDGqeJp9Mj883Bsbh/8A7RiH/wCmj/yOzoFCoVDolstDJwQ2MOct8ck6P/6z9P5cUrCMab/90Yh/+nj/AMj7nsXwzEpHaRg86fhtZJlwxzG445EShX5OLVtHTUUCWaSLLtcc59LHJii1dpuek9mYno7p8XkWoGoMVrHmQrZAC5i9w3fQbALldyMuwEzGYK9AD0IgVgCdSgBsEOQYEiSep89xfwbw7xVTuVjWGyp8aVoJ0K8E2DpGs/TQ+hVymVNU0zvEvnctUXaZprjePi5u417BcXooplRwvWwYlJWapp7Uuclyi+DF9RqPFMMxDCayOixOin0dRBrLnS3DF9eq5o7syPWcQ4Bg/EFC6LGMOp66TqlNgu4X5p6p80dKxqddPCuN1YzuSti7vVYnmz3dMfmHDum4ub4457Ak1Mq+Eq/wvVUdXFl0hmf536ml8d4fxrh+tdFjWHVFFOTyUyHKLnDFpEujOvZyrd72ZU3N0rJwp/1aeHf2fV6+9yoWG593NVFRimUMZZFMQghne4MblTCNmSLcxQCNmaMsjAyDGVCIUIEyohUESySBColiFIAMiaO5jexdQhvPsN7TLxSOGMfqM8oKKqjf0S4n9j9DeizRwxDeGJNNpp7HSHYX2hf29SQ4Di87/wDFKeD8jMif+sQLz/eX1rM4moYW3+rR83oPJnXuftiX54/8Z/b8fRtdAZNXQ9Djr0tkQr5gCAFAlishUBCkKAD0FsiAC3INrgUmg2LsBANwwL6kZRncAyAXAIoAEzDAAWLmC35AYgWCAcwnkXMlgKQoAiD5FIACHQANCoACasu5CgNxkABNC5WJ1ADcqAzAPkTQq0IBSasF2ALUbkzAFdhYdScrgEioiyLoBGmUagCFdwQCoERQIVEGgFtmQpALmQMeoAK5cgAIXqNQAIALoNSAAUE6AUPQiD6gXYmRUTICvMjKTcC9BzA3AAjGwFAsAPR8efodjXzCd9xn8+Zb/JS/kQ/Yf0H46/Q/GvmE77jP57wfm5fyIfsLdyb93c8YVnXvbo+bNMyRgmVMsm7hbM2yEuUkLlIL2IFBLluDZHkRFZEE7KETQuQBm0u6v8cVH8zqPumrHqbS7qqv2x0nKiqPumnn9VueE+TYw+sUeMebsuX8BGTyRjL/ADaL6nnK9FxmLF0QBaHxna1xhVcG8O02JUtHJq451WpDgmRuFJOCOK+XyT7LVGo+9DH4eB8N54pD+FMM7cRNURLnatersYdy5bnaYjg+V/6+8Yvnw/Q//fi/yPl+0HtJx/jDD1h02XIoaFtRRyZDb9o1p4m9uR8O1fMygdtTbi3TE9DzbI1jNvUTRXcmYnw/Z0p3b8Tirez2CjjivMw6ojkW38Lfjh+816GyKmkkVM2mmzYbxU032st+UXhih+yJmge7Pi8NPxPX4PFHZV1Oo5a845b/APK39B0MllzNW7G1S/6BfjJ0+jfs4fTo+2yRu0SONOKsQir+JcVrIndzqybFf/E7HXnEdSqPA6+svb2FNNmX6QNnE8E2KZeOLNxNxPq8zK1G+8uLyur39Fb8Z8nliiuzwzM7dTOzI0fXZTd4h1J2BVMVX2W4Vd3cj2kh/wCGJmHeEp/b9m8+YobumqZU2/kr2f2nqO7DVe14Nr6S93T17dvJRwpn2/afROu4Bxymhh8Tio44l1hz/oa88K3pFn/c6Pt30bfSNv2cmtJs3R3Y8Ot/bmKWtdy6eH098/6GjvdFrN7pHTHd2pFT9m8ipihtHWz5k581ey+wzucIVHkzYm5n01T2RM/t+77XiPEVg+BV2KRJNUtPHOs3k7K9jSEnt/xaKBX4eoU2l/t4zYnb/XOj7L8ThgiUMdS4KeHn4olf6jlaGXZmdm3FUby7XKLVcjFyKbdmvbhvPR3tzRdvWMPTAKD/AO/F/ke+7P8AtcxHiPi6gwSfg9LTy6lxJzIJsTatC3o+hz8rn2XYi3/1qYJ/EmfhxH1qtURTM7ONha3n3Mm3RVc4TVG/CO/wdZrMEh0RTRemKgQrQEXILMpNwAAzAtxmQAMnqNAMgGZSFAhWTIAMhuV2sNgJoUdSPkAt55n48WwvD8Xoo6PEqORWU8a99KnQKKH6z9g2JiZjjDGqmKo2mODR/HfYPSVCmVXCdZ7kmvNUdS3FLfKGPWH1uaP4l4ax7hqsdJjeGzqSO9oYoleCP5MSyZ3BrqfmxLDqHEqOOjxCkkVVNGrRyp0CihfozoWNSuW+FfGFbz+TGNkb1WfUq+30/H0cKQop0Px52FUNSplXwpU+4p2vuOe25T5Qxaw+t0aM4l4exrhyudFjWHzqOb+r41eGPnDEsovQ7NnKt3vZlR8/SMrCn/Vp4d8dH98Xq0y6ksLmw5jIEuG/IIZJlTMEZJhEwzQMSphiq1MiZC4QqZkmYGSJQtsyhAILjYmYTCNgqIwBmefDqyqw+vkVtFPjkVEiNRy5kLzha3PzplTzImN+ElMzTO8OuOy7jKn4v4ehqveS66TaCskp/Bi/aX7r1R9e9Djzs74rqeEeJZOJyfFHJfvKmUn+clvVdVqjrjCq6lxLD6evo50M6nqJamSo1vCyt52L6CveOiXq/J3WI1Cxza59enp+Px/Pxfr0REUhorEegKR3AqIXOwAAMjAuosLZAAQWdx1AFGpNAKS5SMAWxMirQAidSogF0CYCSAhQLAMxmLlQGJbeQ2yJmwBSIuoBghQJa2oZdh0AmRSdRmkAYF+QYAWKkg1mAumCMt7AMiaFyIAuUhUBH1LYmVysATYBcwKgTMuwAW+kl/IqeQAdQRgW41Is9QBSFWg1YECK2NQIgVIgDqNSjLUBkSxdgBNAA7gGyoiCAFJqLAC2RABbkGpQIgLC1wAA01AZlYJuBQQu+YEQeTLvkAFyFZAPScefobjb/wDp877jP57S3+Sl/Ih+xH9CePf0Mxv+XzvuM/ntL/NS/kQ/YW3k37u54wrWu+3R82ZTEpZXCZIqMUUGykYFwKi56mNxcgW+YJcXJF2IGyALm1O6m/74qX5lUfdNVPU2p3U/jipPmVR9009Q6rc8J8mzh9Yo8Y83Zkv82itEl/m0ZM85XkQJ1DAGou9Er8D4b/NIfwZht3Y1H3oHbgfDP5pD+DMPpa9uHJ1zqF3wc6rIj0yK8yPI3nlL2vAmMx4DxphOKJ2hkVMPjz/UfvYvqbOzoJicPiTunmmcLxw+NW0ude9k2OScd4DwuqU6GZPlSYZFSr3cMyFWd+tr+prX46JXTklk7VV2J7eMeU/sw7Y6n3N2aY7N8VooqVy4esTUP9WcmS5XghXQ6Q7x+MUtJwUsJimw+6q2fA4JafvvBC7uJry0RzlFHcysx6rS5U3ufmRRE9EflixDqYuIiiPpsrMw3b3W6tQ4njdDf4cmVOS5puF/0N3YrK904bVU1vz0mOX9MLRzX3da103aTJkxRNQVVNMlW83k1/U6d/VhfNGrdjap6PyZuek0+KJ7JmP3/dwtUwTJUyZIafjlxRS/VNo7L4Gw/wDsvg7CMPVryKOXC7Ldq7+05uxLhy/azNwRQeLx4v4becLj8X2HV8MMEEtQwpKFZJckZXp6GhyWx+bcvVT/AMZ5v5/ZpXvS4h7PBcHwxX8U6oinvpCrfazQ0MWRtLvMVnunjmRRqO8FHRwqy2iid39SRqp+RsWY2ohXtevelz7nw4fR5E0fadiNn2pYJ/EmfhxHw7Z9r2Hv+9PBP4kz8OIzrj1ZaWnx/u7X6o84dZw6GSJBoDmvYYV5kKNQBFqC5ALi5CvIAiBhAWxOpb3JmABegQCxHZMuxGAbGwQyAbDJC4AWDZSPMArFIMkA6o/Fi+E4di9FHRYnRSKynj+FLnQKJf8AoftKkTEzHGGNVMVRtVG8NEcfdhUEUEys4Qn+CNZ+4aiLJ8oI9uj+k0ZjGG4hhFfMoMUpJ1JUy/hS5sPha581zWR3U7bnpOK+F8D4ooHR41QSqqX+pE1aOW/OGJZo6WPqVdHCvjH3VbUuS9i/6+P6tXd2fx/eDiXUqNrdonYtjOB+0ruH3MxbD4c3LS/0iUuaXw1zWfI1U4YoInBFC4YoXZpqzTO1avUXY3olRczBv4dfMvU7AuTcH1aTJMyMEZJhEwzTyCMSoMdmRkjAoRszQZimV6BEqCBMIW5SACouhASgN2d2/jKKTUxcJV01ezm3mUMUX6sX60vo9VzNJnloqqfRVkmspZsUqfJjUyXGn8GJO6Z8MizF63NMt7TM6vByKb1PZ0/GO2HcazWtw7o+d7O+JpPFXC1Ji0pKGZGvBUQfsTF8Jf1XU+jdiq10zRVNM9j2axeovW6blE7xMbwIPmAYvqakKkg0ARMmx0AFBLMoE0AGwDYMbACghUBC7EsAKCFTABDUmgFyGoJcCkz8ipi4BDoBcCFuQoE5FCAEKCAUm5WTcCkuUl0BdiWZUL5gRgoAhbAARFRNCgGkMyFAnUpOhdQBOgKswJoUjKwDyCIAKwCAA9AOoFWgIVAOgehNCgCFIBdCFvmRgBoigCIMZAAHyKyZgALCwFY2J6lSAlx6iwsAATLqA6EYKAIwXUCIZltmG8gDCsRaBID0nHf6HY1/L533Gfz2l/mpfyIfsP6E8efodjf8vnfcZ/PWX+al/Ih+wtvJv3dzxhWtd9uj5s/QpjfMqLI4agAC9ARFCAC4QSXDJcAUjZGLZAGbV7qPxxUvzKo+6aobNr91G3/XFS/Maj7pp6h1W54T5NjDj/cUeMebsyV+bRSS/wA2i6HnS8wpOhVmTQCs1F3ov0Hw3+aQ/hTDbpqHvRfoPhn80h/BmH0s+3Dk651C74fu50ZiZhI33lSQrM9pg2M4ng82KdheIVVFMiVoopExw+Lr5nrUrFTImE01TTPOpnaX6cTravEKmKqrqqdVT4/hTJsbiifqz8hlchOxvM8ZSxNzIxbI2H1PZbXQ0HaDgdRE7Qqshgi6RJw/1OvHZLw+Rw9Qz4qXEKaqhdvYzoJl+kSZ25SzFPkS5qd/HBDH9KTNXIjjC8ckbn+ndt90xP1/9NRysI8feTmzXDeXBTKtvbdweH7TcShvBbmfPycD8HHVRj+VpuHwUq87qO57XFqqGiwurq44lCpEiOY29rQtnxmd9nfwMaMWm7MxtvVVV9XJfahif9qcf45VrOF1cUuHpAlD/RnzD1Mp02ZUTZlRMbcc2OKZF1ibf9TBnSiNo2eV3rk3blVye2Zn6oz7bsNz7VME+XM/DiPiUfa9hvxq4L8uZ+HERX7Mvtp/W7X6o84daQ5IpINEZehzHsMAHQagT1HIJl1AMnUZl2AZB9ARgV6DQlwAYuXQgDqNgygQZC+YYADQWuBegsQbAW1yMLQbAUIlhfYA8ykCANJo+C7SOy/AeL5cdUoIcPxW3vauVB8PlHD+suep98GZ0XKrc86mdnwyMa1k0TRdp3hxXxxwdj3CGIe5cXpbS4n+RqJfvpU1covPk8z55Znc+M4VQYxh03D8SpJVVSzVaOVMhunz5Pmc49qvY9XcPqbi3Dym12Fq8UyVbxTqdf8ANDz1W53MXUKbnq18Jef6vyauY293H9anu7Y/MNUopinkVnTVQTM0eNM8iIRKhEvmEGLJFRiZIMVQIUlAnmZIiKtCQCzHoCAQ3A3JYtp93PiaLC+KYsDqJlqXE8oL6Qzl8F+qyOlYbNWOG6afNpqmXUyI3Lmyo1HBEtok7pnYvAGPyuJOFaDGJbXjny7TYb/BmLKJfTn6nC1SxtVFyO16JyP1Hn26sWueNPGPDt+k+b6DQhbA5K7FtyNsuwQEKyPQICu5AAKOQIBSDcuwE9CgARZApAKidQAKR65hF3ACxABbAIAOgD1I9QKiPUrAC1syNhlyAmxb7BgCFZGEBbuwWgzsTMAtSsbkAFYIA0CBXkBC9CXFwD8wUnQCp2BOYQBFXkLkTAMDqEAyK7EuLgC7BkegAcgNWBbZBMEAFJmAKRWYsUCFAAbBXQuL3AEAAFIUACFuBF5F0IALmTcpGBQS5QAbuNSAOQRXa4YAiWZUNwA2GpAPScefobjf8vnfcZ/PSX+al/Ih+xH9CuPf0Mxv+XzvuM/npL/NS/kQ/YWzk57u54wreu+3R82ZkmYoFkcNlcXJuUC3IwMwKQXAAEAFZL2DI2NwbRtXuov++Sk+ZVH3TVLNqd1B/wB8tH8yqfumnn9WueE+TZw+sUeMebtCW/yaMnmYys5aK73PO13AxqALsai70X6D4Z/NIfwZhtxZmpO9B+g+G/zSH8KYfSz7cOTrnULvh+7nQBg6DymC4IESKgNAEwjI0UXI2SNXgiW7TX1HZHZ9WrEuC8Gr739rRS2+qVv6HHMFk7nUPd8rvdfZjQy286WbNp36RXX2mvkR6sStHJO7zcqujvjyn+WwmlqfFdtmIrDezPGZ3602SqeHrG7H2mdjT3ehrXL4Uw3DYJlnVVnjjh84YIb/AGmvajeuFx1a96HCuVfCfvwc+ZWstFkLFtZEeaOi8kTc+17DfjTwX5cz8OI+JeR9p2Gv+9TBflzPw4jGv2Zbmn9btfqjzh1pBoV3JB8FFzRzHsEHqUgApMygCIDVlQEsLBl2zAgzKgBGBoUAQqauAI2VaAgCwAeQABFsBNykbC1AZ3KR5jmgLkEOZACzDuy2ADoRwp6lsGBpjtf7IJGKqdjfC0iCRiOcc6jhtDBUebh2hj5aM52ny5sifHIny45c2XE4Y4IlaKFrVNbM7vaTVmat7Z+y6RxRImYxg8qXJxyXDeJfBhqkv1YvKLyi9GdXDz5o9S5PDvU7XeTsXom/jRtV2x3+Hx8/FzAkZGVTJnUtTMpqiVHJnSonBHLjVooYlqmvMw2O30vPpiYnaVKjG5QxllkVGNypkoZaBZkuVAUtzEXJY7MxYiKEJcqZCAZqz1N292LiHwVNfw3Oj97HD7pp03+sso0vSz9DSCPdcC4zHw/xdhmLwt+GRPhcxJ2vA8ol9DNfJteltTS6OkZc4eZRd7Inj4T0uz021cIwp5kM2BRy4lFBEk4Ylo09GeSxVXs0TvG4/IK4Q3CRiwYAMWyJqUCMFIBWToCvoBOQYTzKAJcAAkBoEA1KGTmBXcIg9QLvqALABkCPUC2uAL+QEtmUNi4EYBUgIVEDewFZC7EArJzGRQA2BABRsQCgnoVgBoTIagC6kAAMrG1gDJqC7AEBsSwBFGhN8wLtkARANAwUCFsCALAAC66DRBBsCZDIaDIC9Qw2OoAEKBHYuViaFAjBULgBYjuAKQoAEG4AIajcoAIPQiAqBFa4A9Hx9+hmN/y+f9xn885f5qX8iH7Ef0M4+/QvG/5fP+4z+eUv81L+RD9hbOTnu7njCt677dHzZluYXKixy4mzNMtzHcoF3BAEKtQCNgZEYuS4SEYI9CAZtXuofHNR/Mqn7hqlm1u6f8ctH8yqfuGpn9WueE+TZw/f0eMO0Jb/ACa6FMZf5tdDLY88XaFuRlysQAak70H6DYb/ADSH8KYbcSNR96H9BsO/mkP4Uw+tn24cnXOoXfBzqzFlbuiXyOg8pgXmNwMidkqQNjIABkRgYxRO1kdA91isczh3F6CJ++k1kM1LlHD/AJnP6y1Nwd1yuUvinFaHaopIZi6wRf8AqfG9G9Eu1yfu+jz7fx3j6w6JiSOdu87W+14rw3D0sqWjcb6xxf5I6Hjb8Ksco9tWI/2j2k4xH41FDJmQ08DXlBCv6tmvjRvXutXKu9zMLmf+UxH7/s+LdmYNoRPPIxN550urPtOwxf3q4L8uZ+HEfFH23YYv71ME+XM/DiMbnsy3NO63a/VHnDrOHQXQh0By3sEKgmTIAFmNGCgQuxMkUAB6AAQIACi3MjAtiZhXG4F2IMygNyDoOYDYDcXAAdQrAVBAICF2IMwAC1LuAINSsCXFrjmVAai7eOzaHHqSZxFgtOli0iG8+VAv9ZgS1+WtvNZeRzW1Z2eR3hEm+vmc394jgSHCMQ/6T4VJUNBWTLVMEKykznv8mL7ep2NPy/8Aqq+Sjcp9GjacuzH6o/f8/XvaefIqIsypHYUVkimJlcIUERSUCMreRgZEolSkehLhChmNyoClTVs9CEburBDrbsWxt432d4XPjicU6RC6aa+cGS/8PhPtmaE7q2LOGbjOCRttWgqpeemfhiy9V9BvpO6uVbLt8y9VD2HQsn/Jwbdc9O2304G5epLZhms66saELYAQoAg2K/ILJANSFQtcCFysQaAEXTUi1zDABhZF3Ag3BWBBoABRYIXAhc7AATMMBAX0IVgCC5cgARGUjsBR6kKAF7E6AC3JcFACxLgBewLsAA0AYAXy0CyYbSAg8SW58b2i9o/DPA8i+L1viqoleXRyPfTo/TZc2c88Y94Hi/F5scrA5cnA6W9oYoEpk9rnE8l6I6WHpWRlcaY2jvn+8XPytSsY07VTvPdDrGrrKajg8dVPlU8H7U2YoF9LZ81iHaNwNRTHBU8V4RLiWq90p/Zc4lxXGcUxac52K4jWV0x/rT50Uf2s/BGodoYV6Hct8maNvXufSHIr5QV7+pR9ZdwSO1Ts9mxKCHjDCG3/AN/b7UfSYZjuD4pLhjw3E6Oshi09jPhi+q5/Pfw56L6Dz00+ZImKZJmRypkLvDFBE4Wn6GVfJq3MerXMeMb/AIY06/cifWoif7839ErrK+QbucT8K9r/AB3w7FBDJxmZX00P/Z678rC1yifvl6M3n2cdvXDnEM+Xh+OS/wCw6+OyhcyPxSJj5R/q9H9JyMvQ8nHjnRHOj4fh1MbV8e9O0+rPx/LcpTGXHDFCnC001dNaMy3OM6ogHkRgCsbEzADcWyKAHUEuwG4AAtsg9BoNwJcFItQLe5EVi9wBEAwADuVgNgiajQBYK5RcCahZAbAVrmTkXPQcgJYDkAPR9oH6FY5/L533Gfzyg/NQfIh+w/oZ2g/oTjn8vnfcZ/PKU/ycHyIfsLZyd93c8YVvXPbo+bIoIWJxGSLqYplRG4yFyIMkGxclyXAybJcgISrIGQBc2t3UPjmo/mVT9w1Oza/dOz7ZqT5lU/dNTPn/AG1zwnybOH7+jxh2lL/NoyMZX5tdCrU89XU3KGTQCmou9D+g2G/zSH8KYbdNRd6H9BsN/mkP4Uw+tn3kOTrnULvg50uMiA6WzylbhslwAFyMXsNhbjoS5QFrn1PZdxJBwhxfT4xOkxTqfwRSp8EPwvBFa7XNWvY+XvYXy1MZp3jaX1s3q7Nym5RPGJ3h1HiXa9wVSYVFWSMVhrJvhvLp5UuL2kUWyd1lzOYMQq51fiVVXTlaOonRzYktnE72PDow2Y27UUdDe1LV7+oc2Lm0RHctwEGfVyw+07Dn/epgny5n4cR8U2fadhr/AL1cE+XM/DiMLnsy3NO63a/VHnDrSHRFEGgRynsMGpRuTcC7keo1ZbWAhQAGqGxCgQLMC9gGnQpNchyAvKwyI9AgHqVEtmUB0IXYgC3MWBQItQCvMAMg9AwJcZjUMBfzCzKQC7AMgF2J0KNQFz1/EWE0mN4LV4TXwKOlqpTlzFur6Nc0810PYPQjzViYmYneGNdEV0zTVG8S4i4swSr4b4jrcFrU/a001weK1lHDrDEuTVmesTN/96LhmGdRUXFVNK9/IapappawN+8ifR3X+I0BZlnxr3prcVPINWwZwcqq12dnh2fhU0VIxTMrmw5ilILkoCogAyuTUhQgLdBogFRdzFMpKNn3PYRiH9ndp2GeJtQVXjporbuOGy+ux1lB8FI4gwKtmYdjtBXyovDHT1MuYn0iR23TzIZsKmQO8EaUUL8080cHVKNq4qeicjb/ADrFy3PZO/1j+HleoeZBlqctczRlJsNgBSO4XMCjcE6gNOguAAzKES2YBgrQAAbkAu43IUA+gJmXUAhYAAyFQaAOxChgCMFAhQyXAW3FvIahAC5IEAF0ZNysAGNiaANQgVgS46FSJuAKxYXsgJE1DDmaR7cu2mXw7Nm8OcLxyp+ML3tTUteKCk5LaKP6kew7xnaVFwjgsODYPNUOOYhA/DGtaaVo5nV6Q+rOR24oo4o44oooom4ooondxN6tvzLLo2kRdiL96OHZHf8AHwV/VtTm3PobU8e2e7+X6sRrKnEK2bW11RNqaqdF4pk6bF4oo3zbPyMN7DUuMRERsq/ilzJdTFhEDIxZQEIZpLdZGKMrgbX7H+2PFOEJ0nC8amTcRwJvw+GJ+KbSrzge8P7r9DrLBsTosXw2RiOHVUuqpKiBRyp0uK6iTP562ubZ7vfaTN4QxqXgmKTm8BrZqT8TypZjyUxeULyUS9div6vpFN6mb1mPWjpjv/nzdzS9UqtVRauz6vf3fw6+BjBGooU1Eorq6aZlqUpbREzKwwD0IVaDkAQDWQAgQ3sGBQQtwA6kLnYCAoAhSABqMy7EQAtyACj1CAEBQgBLeReROgBjMu1wgPQdoeXBGO/y6f8AcZ/PGW/yUv5EP2H9B+1Geqfs74inxaQYZPb/AOBn895a/JQLyhS+otfJ33dfjCua57dDNMvMxMlkWLdxGSKQNgUMlyNgX0DJcjexBsouQlwnZWyD0ABm1+6b8ctJ8xqfumqDbHdO+OWk+Y1P3TUzurXPCfJsYfv6PGHaMtfk0Ukr82i8zz5dYMy7ECAqNQ96P9B8N/mkP4Uw29oag70v6DYY/wD6pD+FMPrY95Dk651C74OdGyXZLi51NnlEKLkWgGyVbJqBsSJdmV+Zi2W42FuCJl5jY3GA9SIbIZJi5jcj6jZKs+17DfjVwT+JH+HEfE3yPtuwx/3q4J8uZ+HEfO57EtzT+t2v1R5w61h0MiQ6B8zkvYIMxcqI+gC+ZSW8hdgX1BCgGRhjQAuZchsAJuBuAA3KuoyAXJzKTbIB6jQWKwIV8iAANygCO5c7AiAXBSANS7akyuVgCFYQERVqA9AG4fIlmAPVcX4RJx7hvEMGnwpw1ciKBN/qxW96/R2ZxRUypkifMkT4XBMlxOCOF7RJ2a+k7sislfyOQe27DVhHaZi8iCDwyp81VMvpMXif/i8R1tLubVVUfNSuWOLzqLd+OmOE+ceUvjDK5gZHaUFkgQJhDJAguSKCMBDJOxTFFuAFyXIBXy1Oz+zyuhxHgnBq1O7mUctPrDD4X9aOL0zq3u/1qq+y/DIb3dPFMkv0jb/5jl6pTvbifit3I+7zcqujvp8pj8thMmxXzJ6nCejmgKgBCgjQFIABRsTqNdwKiKwDApAhcCqwCJmBSK5QAGoIBQFcWAaEQKA6gPMgAMFAgyD5DIBYNhIIAhuG/IAUg1LyAJDqRlAAhQIVC9kAGZ+LGa6mw3DKrEauZ7OnpZUU2bF5Qwq7P2bNs0t3tOI4sL4Dp8Gppjgn4vUeCPwvP2UHvovpfhRs4ePOTfptR2z/AO2vlX4sWark9jm3jfiGr4q4qr8frIn7SrmtwQt/m5ayggXJKx6SInibG56ZTTFFMU09EPP6qpqqmqrplCoWLYlCdC2KAICk0IADYEgmXxZWMWRakIdd92LjOZxHwU8JrZntMQwdwyYoondzJL/NxelnD/hXmbeRxX3d+Io+H+1PDPFG4afEInQzlfJ+P4D9I1CdpS0/DnqULW8SMfJmaeirj+V10fJm/jxzumnh+GTIisLQ47qoxkNS2swIUgWQDYC+ZfUCAbFAbBEAFyDIXVATYqItC52AhcyAABuUCLMFI9QATAtYCshVoAAQCyYGve8TXQ0PYvxPNcVnMo3Ih6xtQ/1OE/F5HYPfDxJUvZOqC/vq/EZMpLlC/G/unHiTRcdBo5uNNXfP4VfWaudfiO6GazMk8zGEyudtymQRiUgXcMxFwKzFhu4AAbECVKY3DYQrZtjum/HNSfMan7qNS3zNvd0aU5na/BMSyk4fPifqkjTz5/21zwls4cf7ijxh2dL/ADaKSV+bRluUBdBolsy6iwDqag70v6DYZ/NIfwZht/0NP96d24Gwz+aQ/gzD7WPeQ5OudQu+DnJ2ImS9wdV5QyTLcxQuBQQufkEgYzAQpLkAGV/IjIALsQDoAbPtuwzPtVwT+JM/DiPiT7XsK+NbBP4kz8OI+dz2Jbundbtfqjzh1vDojIxh0MjkPYIR6lbJnoygE8iAoAE2AABjqAKtCFAgLn6C/kARCpeZAFtypgaARlAAEsE8yrUCDcu4AAgtcCteRNByAFBLFQC4ViAA7FWoy0JmBbk1LqAMYl71nOXeroYJXFOEV6VnUUcUuL/BHl986PNF97aSnhuAVKWcM6dLv1hhf/KbmBVtfhweUlvn6dX8Np+8Of07GWp44dDMsjyyY2W5US5L5hizLcwuVAZAnIXsEKLkuCRegIEAejOk+69P9rwDUSd5WIR/+KGH/I5seh0F3UJjiwTG5O0FTKiXrDF/kc/UY/0ZWLkvXzdQpjv38t/2btZbZgaZleepACC1AhXsGAG5MhmUCB5Bl2AmpdgQCgiLuAAYAhb2AAAdCMCrUBDICF1JoW4DREWZbBgGgwGBChBgQqJ0AApGMwLqM7kK7gQZovUAQouQChEG4CL4LRyn3vq6Ofx7hWG3/J0uHe0Xyo44r/VCjqxnIPeou+12d4tFQSEulmd3k9TE5nhEuPrlUxi/OGprWKWLUxZeVOUpEUAUFIShC6AIQjKw7AYhlIEPLR1EyjrJNZKi8MynmQzYGtnC1EvsP6E4ZVQ1lFT1UPwZ8mCYukST/qfzwizhcPmrHd/ZNiCxXs54exBf7TD5SfWGHwv60VnlLRvRbr8Y/v0WLk/XtXXT4S+qHQMhUFoXmRlGoDYmY3KBNyohWwA3JkUCFuF5hgS4LkxYBoTmHqUCIFFwBMivTImQFXMDYiTAF0GxMwLsLEKAI2krlMZivD4d2By531sYU3GuH8BgmJqRJmVc2FbRRNQw/V4jnd2Pve8Fjy4g7W8cqpczxyKaaqOS/wB2UrP/AMTiPgWy/wCn2vRY1FM93nxU3NuekyKqviFItCm41WSBimLkbjLmRslyXBstxmS5GwMg2YXF+YSrZLkuGyBYWb77llL7XjfHKtw5SMOhgTtvFH/kjQLiyOqO5HhUUrhnHsamwWVVWQyJUXnDLhz+tnO1a5zMWv4/lvadRzsin4OiYMoUWxdETMo62qhkGQC52NN96qL/ANicKh88UX4Mw3G9GaV71kxLhnBJN84q6KL6JcS/qfbH95Dka7O2n3fD94c9JlMblOq8pUXIiokVMpiW4ABWBAFJcABuUhIagEAtz7bsKV+1XBLbRzH/APtxHxB993e5Xte1bDf3Jc6P6JbPld9iW9psb5lqP/tHm6vh0MsiaIvM5D18uTMXCApL5lWgAPkTIF2AX8gxYALWHMjLewAIm9ygERh6lsBBdAICgDYCBAtgItRmLIuoEZcyX2AFAuTqAAKA5kepbDcAyALQBmECgDS/ewSfCWExPVYg0v8A7UZuc0h3tZ1sDwKnv8KqmR/RBb/mNrCje/S4+vTtp9zw/eHPUOli3MYTIszyeekKQBipkjFFQQoDGwFC1MXqL5EjJk0JcAU393TX/oPEC/76n+7MNAG/u6Z/qfEX8Wn+7MNDUfcT8vN3+TP/AOyt/P8A/wAy3oQpLorr1QLuFqHqAA6CwDYLmCAV2A6EAblyuQWArIXMAGTMtxsBNggV2AJgiKBC/QFqAINQFqBQ8yMaABZgMC3D5hBALAXIBRcZtCwEK2FYjAFJoXYBoTQIPMAi7gAHkjkjvaS/Z9qMibb89hkqL6Ioof6HW0S96zl7vi0ng4nwCutlNopkm/OGNv8A5jt8n6tsyI74lyNbp3xZ+Ew0WyWAL2poVEKiEqVk2KBGQrIAZNwxcASxSBCNHXfdSxf3d2VSqGKNOZhtXNp7bqFvxwv/AMT+g5FN4d0HHYaTjDEuH50aUvEaZTZae8yU9F1hii/4Tka3Z9Lh1TH/AB4/35OnpF30WVTv28P783VGxAndFKCuxsEMvMcgAQIBQxkEBMy7BsgBFCHUCMIDcACoALZAmYApOgYQAuu4ZALawINgKN8iLyZc1oAPmO1DiOVwnwNi/EEyJJ0tNF7KG9vFMeUCXO7R9M3ZXZzD3zuL1FOw3gmjmu0DVbXJPfSVC/ri9EbmBj/5F+mjs7fBq5l/0Nmqrtc5TZkybNjmzo3HNjiccyJ6xRN3b9W2YXMWwmX1TmVxcxFxuMr5luYXLfzINlZLkYCVbI2YgGzK5CMlyQZLlbGRAxbsnE9lc707vnD3/R3skwGjjluXPmyfdU9PXxzH4vsscadlnDEzi/j/AAjAoIW5U+eoqhpfBlQe+ib9Fb1P6D00qCRKhlykoZcMKhghWySsl9BXdev7RTajxdvR7XGq58nm3G4HUrLvpmXYdQwDtZmg+9lPtK4ckX1dRG108C/qb8Oce9ZUe04qwij2k0UUf/HH/wD6GxjRvchweUlfN0+v47R94abTuXYJWB03mAnYuxColKhEKmEKANQlegIhdhA9QCMJGMiMBAzZ3dnkqZ2kxTbfmaGbF9LUP9TWJuTurUvj4kxqstlKo4Jd+cUaf/KfG/O1uXV0Sjn59qPjv9OLotZpF2JD8FFucl6wnoBmAAVwlcq0AguAAKhYARgIAXQKxB0ApOYQ2AF6AAAQtgGRBfMMCkKsiWAAb6hoCk1AAaBZhZZFsAZLFGwEGQyYtYAUhQJFo2c897CrUeMYFQqLOVTzZrXyooUvus6GiT8LRyh3i8Q939qFXJhd4aKTKp/W3if1xG/ptO97fuVzlTd5mBNP/lMR+/7NcluAWF5iIqIwBkioxXUq6hCgEJFD5EDAWFyJjcC7M6E7p8trCMcnWyjqJMP0Qxf5nPTeTOk+6zJ8HAtZPt+dxCKH/hhh/wAzn6jP+jKw8mKN9Qpnu38m4RkTcpXnqKPQBDYC52BFoW+YEGhRsBM2XQl9ioAQZaACkCFwAYAFyIVWAELsTMb5gXcZDIWAMhWTYCgiKA5kDbAFEIZALdk3GZUA3yDIAGw3KtABGLjQbgVk0ATApC57EAZWZoLvkUHj4cwDElD/AKvWzJLf8SBP/kN/Kxq/vOYa8S7JMTihg8cyimSqqHl4YrN/REzoaVc9HmW6vj58GjqVv0mLXHw8uLjgjF1cM9GUSDMqItSkJUt/pILgUjDMQlb3BABURlRL5hAe54Jxqbw3xbheOyb3o6mGZEv2oNIl6wtnprhRWZjXTFdM0z0SmmZpmKo6Yf0Rop8mppZVRTxwzJU6BTIIlpFC1dM87ZpruscYQ45wU8BqY/FXYPaXDd5xyIr+B+mcPovM3LqeaZePVj3qrdXY9Axr8X7VNyO1FYDoNjXfcZUNicwG43LbIgFZHfQFQEQK2MwJyLawFgAJYAUnoLAAVkCuBWGhoLsCIpNy6gBmNSRPww3A9VxbjdDw5w9XY1iUxQUlHIinTG97LJLm3ZH89uLcdreJuJcQx7EIm6mtnubEm/gp/BhXJKy9DePe87Qvd+JwcCYXP8VNRxKbiMULyjm6wy+kOr52Oei3aNiehtekq6avJWdVyfS3PRx0R5gJuLnactlcGNyhKtkuGRkGy3K9DG4bJFBjcXI3NlfmTQNkvmNzZTGLLQyTPpuzTg6u454vo8AolEoZsXiqZyWUmSvhRv0yXNmNdcUUzVVO0QyopmqqIjplv3uX8HORhdfxpXSXDMrP9FoXEv8AZQv38S6vL0OkUrQ2PwcP4VR4Lg1JhWHyVJpKSTDJkwJaQpW+k/eUPLyJyLs3JXDGsxZtxRBmhrmUcjWfcJ0A9AJFkjlvvJ1ft+06dKTv7npJMrp8KL/mOpJmi6nHPbBXf2h2mY9UJ3Sq3KX+BKD/AJTbw49fdVeVtzbEpo76vKJfK3CIinReei1KQoFRbmIJNmQTJcXAruLmNxcC3GxBdACkLfmAOgu6jSKHBccrms5tTLlJ8oYW/wDmOfLnUXdrpHS9mlPOih8Lq6mbOv5q6hX3WauVO1tYeTFvn58Vd0TP7fu2clkWwIcx6WtydBmAKEyaj0AOxSACkAXMC5kK9BqAv5AjFuYFIUaACFIAKiMqAEKgwA0IygS4QKgIyrIZ3FwCzDYyGwDQEfIICoZjQgFZC3CA8VTNhky4psxqGCCFxRN6JLM4g4lxOLGOIsRxWN51dTMm+jidvqsdTdu+P/2H2cYh4I1DUVtqST5+/wDhP0h8TOSWlsdvS7e1NVahcr8mKrlFiOzj9UKiWB1VMUERSUbCWZSJluABBfMACXFwKCJlQQI6r7u1GqbsvoI/DZ1E6bOfO8Xh/wCU5TbsdndllF/Z/Z5gVLo4aOCN/wCL33/MczVKtrcR8Vs5I2pqy6qu6n94fT7EuV8hscF6MNsbDMATUuw3JoBURajcMA9QL3yDAF1IXUCLMdRmgAbKQAXYELsAzQBAKCbluA1CyD5EAo5EXIr5gQWKvMW8gJYIqABuwyBFYBzD5FfmRWAq0IUlrAMisjzCQFI8xuVANCbixQIeq4twyDF+GMUwuNJqspJsnPzihaX12PbGE27Sts7mVFU01RMMaoiqJiX865kuKVHFKjTUUDcDT2adiXPru2TB3gXafj9B4bS3VufKyy8Ez36+0+QbzPULVyLtFNcdsbvPLlE265onsnZSmNxczYsiXJdgGy3BChK5DYnQAUxFwRuKQgBs+s7KeLZ3BPG1FjkHiip4X7Krlw/7STFbxLqsolzhO56CqkVlJJqqadBOkT4FMlTIXdRQtXTXofztTtmdEd1rtKhg9nwLjU9Q6vC5sb9XJb+lw+q8iu69gTeo9PRHGnp8P4dzRsz0Vfoa+iejx/l0juHrkYpp5oyyKatSFWeQyRNQKNcx1IAKTYAMmNgVAQMuRAAz1DC0AqZHdl+ogF6BEzLYA9QR5DICsK4aADRZmr+8F2mSOz/hVqkjhjxyvhil0Mp/qec2JeUP1s+m7TeN8I4E4Xn43i8z3sPvaeRC/f1EzaCFfa9kcG8dcV4vxnxPVY/jU3x1E92ggT95Jlr4MuFbJfW8zr6Vp85FfPrj1Y+/97XM1DN9DTzKfan7PVT586pnzKiomxzp02NxzJkbvFHE3dt82zxtmFy3LgrOzJAbEuSMgjEXI3NmTZLkZGyEq2DFvMXzBsyuEzG5HYJ2ZgxhM0om0km3pkiN0LIkTqiol01NJjnTpsagly4FeKOJuySXm2dyd3ns2g4A4STrYIIsbxBQzK6NZ+z/AGZSflDv5u58X3Zex2LApUnjHielti02G9DSzF/qsD/XiX+8a+hczoKFWRV9W1CLk+htzw7fisGm4XMj0tccexkskHyHQHCdhMwi3ugBM2EswnsZAeKomwypMybE0lBC4m+iOGcUqoq/E6qui1qJ8c5/4onF/U7E7T8R/srgHHa5ReGKCimQwP8AfiVofraOMkrK3lkdDCp4TKi8r7u9dq3HZvP9+gALm6pqghUwBSbgC3ICMJUXsQXAvMEAFQJcoQPRnaHZxhqwrgbBaCyTlUcvxfKiXif1s5C4VoI8W4lw3DYIHG6iqlwNLycSv9R23TwqCBS4FaCFeGFclkjRzJ6IXPkhZ3quXZ+Efv8Ah5LkyuAuZoLyAZB5ALlJfkLgVi4ZNwKBnqFoAY10JyFmBdMiLID7QGg1KiPUC7E0ZdiZaAW5A+o2AC+YSLYCPzBWTcC5EuNNhbcCiyI8ypAQpNygNgtCF2AhWgMgIIslkNz0HaBxHT8K8KV2NzrRRSILSZbdvaTHlDD9JlTTNUxEPnduU2qJrqnaI4tBd5jiZYpxjKwORHenwuC0dnk50aTi+heFerNT3PJW1E+srJ9ZVTHNnz5kUyZG9Yoondv6WeFlqs24tW4ojseP5+VOXkV3p7Z+3Z9lbKYlPq01KY3LcCglwAZLgAAGACF2AB5aKRFVV9PTQJuKbNhgS87tI7ow6nhpKWTSy/gSZcMuHpCkl9hyB2NYc8U7TcDp1CnDLqVURp6eGWvE/sOxoc1c4eqV+tTSvvI+zMWrlye2Yj6cf3V6jmBqcpcy+ZRk8hsAIy2yIAuUisNwLfyINxcBbmUiLbLMAHkS/It8gJkGAACQbLmwJmW+QsAFhcmbKBEUmrKwI8y9SDYBuGUPICagXAFeb1IwyoA7kKyWAbi4LbyAnMruL2DdgIV6EDAMBlyAXI9GXYWugOX++FgbkY/g/EcEHvKuRFSzWl+vA7w36p29DQqZ2p3h+HHxJ2YYnJlS/FU0MKraeyz8UvOJesPiOKU7wprR5l90LI9LiRTPTTw/CmaxY9HkzV2VcWTF/MgR2HLVFuQpCQXFyXuE7MkLmJSDYZC3IwJclw9QEhlKmTJU2CbKmRS5kESigjhdnC07pp7NGJi2QOv+wHtXk8X0EGCY1Ogl8QU8GrdlWQr9eH97zXqbfTTzP5y0lXU0VXKq6OfMp6iTGo5U2XF4YoIlo0zqnsP7bqTiNSMB4qmyqPGrKCTUP3sqr/8ALHy0exUNV0ebczesR6vbHd/Hks+m6nFcRauzx7J7/wCW8dwyKJPLcuZXHdTYaIoeYDYbBeQAhbBgCIFYyAgL0F8tABPUuxABUAAG4I3YC9T5XtK46wHgTh6ZjGNVFlnDT08D/KVEe0EC+16I+X7Z+2Xh/gCnjo4IocSxyKG8qhlx/A8opr/VXLVnGnHHF2O8aY7MxnH611FRF72XAspcmD9iCHZfWzr6fpdeRMV18KfNzc3UKbMc2jjV5P39p3HuOdoPEUWLYxGoJcF4aWkgb9nTweS835vc+UYIy2UUU0UxTTG0QrlVVVczVVPGVRbmKFzJjsyuLmNxcbmzPQNmNyXG5syuR6AjdiQbFyXKQkbZL+ZbH0XAfAvEvHOJqg4dw6ZUWdps+L3smSvOOPRdNT511xRG8ztDKmiap2h8/TQzJ9RLp5EqZNmzIlBLlwQuKKOJ6JJas6z7vXYasEdPxRxjSwR4plHSUMfvoaXyij2cfLbqfWdi/YtgPZ9Jgr5/gxTHooff1syD3sr92VC/grnqza0N0it5+rTcibdro73dw9NiiYrudPcyUKS829StGPjS1PV0eP0FZxBVYNSRudPo5cMdTFC7wynE8oG/2t7bHD2mXUquU0TETPT0Pa8gVeYIZpsVIhXoBAVaEYGrO83iXuTs6ho4WvFX1kuU/Pww3jf3V9JzDFobp71WJe0x7CMHheVNTx1Eee8cVl9UL+k0qzrYtO1uPi8w5R3vS59Uf+O0f35yDqY3KjYcNQgEBQQuoAjBCAAG4FvkGyC4FuCalQRs2V3b8L/tDtHl1ccHilYfIjnt+UT97D9bOqEklkaU7q2D+xwDFMamQWdXUKTLb3hgV39b+o3YlkcrKq51x6byax/Q4NMz01bz/fkADTY13fTMFbGuoELew6EAuqJoABdSC4YFvkNiIoEepSCwFZG7D7SbgZcyaZgOwAqsCdALqR3Fw8wKuYdiZ2KgBMi66kAIPLQvQlgKOpABWNhsLAEGGNEBG7LLU5c7xHGy4g4lWCUE3xYbhkThiiheU2dpFFzS0XqbR7fuP1wvgf8AZGHTksXr4Gk4XnTynk4+r0X07HLN97vM7Gm43/bV8lJ5Uarw/wAS3P6vx+8sri5j0KmdlRtluUwuZJ+YFWRSC4FIBcIAAwBAFqAzKBa+QG4+6vhDqOKMTxiOW3BSUylQReUcb/8AKmdJQK0KRq/u24K8L7O5NbHAlOxKdFPb3cC97Cn9D+k2i9Cs5tfPvT8Hq2gY/oMGiJ6Z4/X+Nh9CDYI1HaGXYgAFFiAUMACIIoeQEf0FzGoaAmmpciZlAmhdUGOQAMjRQFuYZC5ARFsQZgNCkLyADcJEQFaJZlYAWshoOpGBQiBgXqGxcARlTYAB5kaKAJnuLIuZAA0BbABmhoGB46mCGOVFLjhUcEacMSe6eqOB+0nh+Zwtx5jGBRQOGXT1MTkX3lRe+gf0M77ehzf3wuFn4cL4xkS9P9Cq2ls85cT+tfQd7k/k+iyPRz0VefY42tY/pLHPjpp8nOhVqTQNl2VNegJcEJVFMbi4FFyDcbi3JcgI3FbFzG4uE7DZizJsxbIDcyUVjx3I4iE7N0dlPb1jHDik4XxLDNxfC4bQwTk71Mhcm/hrk8zqDhHinAuKsMhxHAsSkVshr33gfvoH5RQ6wvqfz1Z+7AccxbAMQgxHBcRqcPq4NJsiPwt8mtIlyZxc7RbWRvVb9Wr7Oth6rcs+rXxj7v6LJpq6DOXuA+8rXyPZ0vGOEw1kCydZRe9mdYpbyfoby4P7SOC+KoYf7Ix+kmTol/q82L2U1cvDEVfJ03Ix/bp4d8cYWCxnWL/s1ce59gCQxrw30XMJp6M0W4Auw0AdQTUAXMeo9RYAyX5BtLVkcStdK/QDIjdsz5HjPtK4L4SlOLGuIKOTNtdSJcftJsXJQw5mheP+8/WzlMpeC8HVLC8lW1/vo+sMtZL1NzHwL9/2KeHf2NW9mWbPtTxdJ8T8R4Lw3hceJY5iVNQUkCzmTo7X5Jat8kcx9rfeNxDE4J2FcDQTMPpIrwx4jNX5eYv+7h/UXN5mjuJuJMd4mxF4hxBitViNS3lFOjuoOUMOkK6Hq3FcsWJo9qz61z1p+zi5Op3Lvq2+EfdKmZNqJ8yfPmzJ02ZF4o5kyJxRRvzberMEWLMwZ1nO6WaKzxpmVwbBGyvMxsAuVESuZWa1TQ3EuXfUwiigTzjhXWJHmpZM6pmKCnlTZ0TySlwOJ/UhubJdmMTPscB7MuPsb/8AdvCWKRpaxTZXsofpisbD4Z7sXGeIRqLHMSw3CJTSfhgbnzOllkmfC7mWLXtVQ+lvGu3PZploqHzPe8KcKcR8V1SpeHcGq8RjvZxSoPycPWN5I664L7unZ/gbhnYhS1GO1MOfjrY/yafKCHL6TbOH4fR4fSw0lDSU9LIh0lyJaghXojk39cop4Wo3dKzpNdXG5Ozm7s17skMEcuu46r4ZzWf9n0UTUPSOZv0R0bgeDYXgmHS8Owigp6Gjlq0MmTAoYV/m+bP2wqxYoranByMy7kTvXP4dixjW7MbUQyMYllzPDW1tNRUkyqq6iXTyJUPijmTIlDDCubZoPtU7YZuJwTcH4TmzJFHFeGdXfBjmrdQfsrnqfK1aquTtDV1HVLGBb512ePZHbP8Ae97rtr7WZeDwTsA4ZnQzcSa8E+qhd4abzUL3j+w9t3bMLjpOBYsVqVE6jFaiKdFFG7xOFZQu/PNnOeGYXPxnFaXC6SFxz6qdDKg3zbzf0XZ2fgWGycKwikwymhUMmlkwyoUuSsbORTTaoiiO1X9DyL2p5dWVd6KeER3b/wAdL2K0sRhZIqNJcSwA3AhJl7K3mXY9Pxni8GBcK4ri0y1qSljmJN2vElkvV2JiN52hhcriimaquiHKHa9jP9t9o2M1aivLgqHTys7pQy/e5eqifqfJNkijjjiijjicUcTbib3b1Jc7lMc2IiHjl+7N67VcnpmZn6srhEKjJ8lRSAgUj5C7AFRGCXAC4IBbghQCM4E21DCrxN2S83sYH13Y9gf/AEi7Q8Moo4PFIlR+6J/l4IM7ersjCqrmxMy+lmzVeuU26emZ2dQ9muCLh/gjCcLt4Y5VOopqt+vF76L63b0PpWzCFPV6szRxZned3sVm1Tat00U9ERt9DcMtgQ+qPQLmUWADIWG4AnQoYDqR56BFAnUrFswgJuXcjABhFvcARhFQYEeoCKBAVBgRi4QYFGpEAGhSB5AVryAAB8wNELAHofJ9pvGuHcF8PR4hVNTamZeCkpk85sf9IVuz9PH/ABfhPB2BTMTxSbdu8MiRC/fz4/2Yf6vY5D414pxXi7Hp2LYrMvFF72VKhfvJMG0MP+e5vYeJN6edV7Kv65rNOFR6O3O9c/b4/h+DHsXxDHcYqcWxOe51VURuOOJ6LyS8klkkfjTJmQsMRERtDzWuqa6pqq4zLO4McyksFVyoiKShUwY3LcCpmSMC3yCFZHqAAIUjYFP04bRzsRxGmoKeFxTambDKgSWbcTsflubL7uOBPF+0OXXTJfip8Llupif/AHjygX0u/ofK9ci3RNU9jawsacnIotR2y6ewKgl4ZhNJhslJS6WTBJhsrZQpK/8AU/eSFe9TGrKpM7zvL2OimKaYpjogS8ysEIZGxXoLhANhsRFAmhdCACkaG4uA5F6ktmXoAbGwJ6AXIDYieYAF1IwD0BQAsLkRQHUbEeTLkA2AJcAXoT1LlsBC2JuVgQIPUAHkUeo9QBBYbgGxcblQD1IV2ImAyKRFyAMbEGYBHouPOHabinhTEsCqrezrJEUELf6kesMXo7HvrkiSiVjKiuaKoqp6YY10xXTNM9Ev504lR1OG4hU4fWQRS6mlmxSZsL1UULsz85vLva8GvDeJpHF1HKtSYnaVVeFZQT4Vk38pfWjRmh6TiZMZNmm7Hb59qiZNibF2bc9jIXILmw+K3FzEq5kDMXMbhvmBbkZLkuQKLkuS4TsraMbkZGyE7D1I9QyNgLkDZLkJ2XQvtH4lFf30Oj0a6PVGDZi35kSRD63h3tH454e8MOFcT4hKlw5KVMj9rLt8mI2HgfeV4yo4YIMSw3CcShWTj8MUqOL6MrmjnFYxbNS7hY9326IltW8q/b9mqXT+Hd6PDomliXCddJ83T1MEf1M+ioO8pwFOt7ppsZpfl03i+xnHt8x4mtDRq0XEq7Jj5tunVMmO3f5O1YO8N2YNXeL1cHKKijJN7xPZdAssYqouUNFMOKXHF5v6TBxRXzif0ny/+Cxu+fr/AA+savkd0f35uxq3vK9n8v8A1aVi9V8im8P2s9FineiwaWrYbwtiU9+dRPglr6rnK9yRM+lOjYlPZM/N86tUyZ6JiPk3tj/ec4xq/FBhWEYTh0LVoYo/FOjX02RrviXtR4/4hTgxTiivcp/7Kni9jB9EJ8W35Ebe5tW8LHtexRDXryr1z2qpZTI243G23E9Ym7t+rzPG3cjvcdTYfKIR3CYiMLkSmIZ3zDV9jGGJLNuyNi9nfZDxtxqpdRQYZFR4fE1etrLy5dvOFPOL0PnXdot086udoZ0W6652pjeWurNbHmwyhr8UqYabDKKprp0TsoKeU43f0OwOCe7Twjhil1HEdRPx6pWbgf5KQn8lZv1ZuPBcAwfA6ZU2DYZR0ElK3gp5MMH02zZx7+tWqZ2txv8AZ1LOl3Ko3rnZxTwt2B9pmNwwTJmDycKkxfr185QNL5CuzZWA91d+8ix3i35UuipfsiiOnFCoXfczT8zl3NZya+idv78W9RplinpjdpDD+7L2eU9nVzcYrX5TKnwr6ke7o+wHstp7NcLwTWt5tRHFf6zaupIsjUqzsirprn6tmnEs09FMPi6Dsr7PKNp0/BuDQtaOKnUT+s+mosGwqhhUNFhtFSpaKTTwQ/Yj90LMj41XblXtVTL6026KeiGDhss231EMKWhlES6SzPmzXYxZ4qyspqOnc+qnypEmFXcc2NQperNbcW9tXCOEOOTh8ybjFTDl4adWlp843l9BlTRVVO0Q1cnNsYsb3a4hs3xep8F2h9qXDXCcuOQ56xDEkve0lPEnZ/vxaQr6zR3GPazxZxFBMp4amHC6KPL2FI2ool+9Hq/Q15OicTberd3zZt28TtrVLP5V770YsfOf2j8/R9Lx5x9xFxlVXxKoUqjhivKo5LalQ83+0+bPnYZzhSuzwq9goI5scMEELjjiaUMK1bbsl9JuxEUxtCoXrteRXz7k7zLdfdiwD3fjtXxHOleKTQQ+ykNrJzYtX6Q/adGQ6HyfZRwyuFOCMPwqJL2/g9rUvzmxZxfRofWHKv3OfXMvUdFwYwsSm32zxnxn+7IX0BNz5OqugD5kAXtmad70mOw0fB9JgkuO03EqhRRwr/dS83/4vCjcUTtbmcmd4LHocc7RauXKj8VNh0KpJdndNrON/wDE7f4TZxaOdcie5wOUeV6DCqpjpq4fn7NebAlwdZ5pClRiVAZAhQhURi4uAYZAEpmUnqG+QFDBi7kIHFY6I7q3DnsMEr+JZ0FplZH7Cnb/AN3DnE11i+w5+w2gqMUxOmw6kgcc+pmwypaXm3Y7a4TwenwDh6gwemS9nRyYZSa3a1fq7s08yvanbvWnkvh+lyZvTHCnzn+Ht0g7IXJFa17nNehPS8c49I4a4TxLHZ8XvaOnijS/aitaFersc09nHb1j+CTYaTiOGLGKBxNuO9p8q7u7P9ZcmfYd73iP2OFYbwpTTffVUXuuqSekELtAn1iz/wAJzfBCoUdbDxqarW9UdKn6zqly1lRTaq25v7u8uDeLcC4sw1V+B4hLqpdvfwaTJb8oodUz36zRwFgeMYjglfBX4VXT6Kpgd4ZkmOz9dmuTN6cA94eFOCj4ypLbe76WH644P6o+V/T66ONHGG5gcobV71b3qz39n8OiQj1uAY5hWPUEFfhFfT1tNGrqZKjuvVar1PYrNX1OfMTHCVipqiqN4ngtgQq5EMgm5SAXYmwCAIuoYAgSsVIPXUCF2HoAIUgWYDcNFRAKhbcPTUgFRHYpFqBWS5WGAbAPHNmwSoIo5kcMEMKvFFE7KFebYJnZ5HlnsfFdpvaJgvBNA3VRqoxCZDenooIvfxPzi/Zh5nw3ah24UeH+1wvhBy62rV4Y62JXlSn+6v139RzxildV4lXTa6vqZtTUzonFMmzIrxRM6eLp9VfrXOEKpq/KOixE2sad6u/sj8+T2fGPFGL8WYzMxTGKj2k2LKXLhyglQfswrZfaelMUW+R3KaYpjaFCuXKrlU11zvMrcpF0KSwXIEKEKEYlXMDIjJcJhGylJuUANCZhkmxcEGYQN5WOrO7pw48D4Ck1k+U4arFIvdEy6zUGkC+i79TnDs+4em8U8ZYdg0tPwTpqc+JL4MqHOJ/QdsUkmCnkQSJUKglS4VBBCtoUrJfQcjU720RbjtXLknhc6urIq7OEePb9vN5R0GYa8jir4hRYgC4Y2KBNwXOxAD1LnYIjewAJAqAgzDvcoEuUiL9QEsUj1FwKCalQB+YSuMggIWw9RYAyMu5ABdgibgUZDYgFBNNAAQCyDACw1ABal0FyagA9BuLAUlxqUCAqAB5AdQBCpbELcD5/tA4apOLuE6/AK1QqXVSmoI2s5cxZwxLozgnGsOrMHxerwnEZblVdHOikzoWtIk9ej19T+i0STVmc397XgFxwQcd4dJ99AoZOJQwrWHSCb6aP0LDoGd6K56CqeFXR4/y4ms4npLfpaemny/hzddWCMW7MXLjKrwzI2S4uQnZbgxuW4FGRLkuY7pVmL8y3IxulLglwAYZHYlyE7DZGw2Ykbmw2SJkZCJllEI2Rsr0MTHdlELcxbDfMxbISN3Mb5iJmLZG6dmVzFsxbI2Y7sopZXF8jC/nkPERunZk2DC5b2RG5EL4bn1PZ12e8T8e4j7kwGhccmCK0+rm+9kSflRbvkszZnYb2C1/FEMnHeLYJ+HYNFaKTTfBn1S8/3IH56s62wDBsMwPDJOG4VQyKGjkq0uRJh8MMPPm+bzONnatRZ3ot8avtDqYmnVXfWr4Q1R2XdgHCXCTk12KS4cexaG0XtqiD8jLf7kvT1ZuOVBDAlCkkkrJLRIzaRNCtXr9y9Vzq53d61ZotRtRGzLoUxUSW5+PFcVw7C6d1GIVtPSS1+tNjUJ8JqiI3llVVFMb1TtD9rV0YPLU1xjnbFwzRuKCgl1eIzFdXlw+CD/iiPiMZ7aOIp7th1BQ0UPnGnNi+uyNarNsx27uXf1rDs/8ALfw4/wAN/wAMVyRzIYFeK0K84nY5QxTtB41rrwzuIquCB/qybS19SPQVWLYpVX91YnXT76+0qIn/AFMf8ymeiHNucp7cexbmfnt+XXmIY/guHw+Ktxaip1+/PhR8zifaxwLh8Thix2XPiX6tPLimfYcux+GJNtJvnn9p4Y1zt0M6b81djn3eVGRPsURH1n8N/Yv284RArYXgldVRX+FOiUqH/M+Kx3tr4wroYpdCqLC5b3lQeONLrEazZjG8jZondyMjW8+7wm5t4cP5frx7HMXxqdFNxXE6utibv+VmNr0Wh6k8seZ4mjo2qtocauqa53qneVu2jFpBsxcWZsxL57MkkbO7vHCX9vcXrF6qV46DC7THdZRzv1IfTX6DWVLIn1lVKpaaVFNnTY1BLgh1iibsl9J2V2YcKy+EeEKPCV4Yp9vaVUa/Xmxa+i09D4ZFzmU7R0y7/J7Tv8vKiur2aeM+PZD6eHJX8zJjIM5j002DuS3ky7ABqFpYPRgek43xuVw9wrieMTXZUtPFHDzjtaFfTY4mqJ02onzJ8+NxzZsbjmRPeJu7f0tm/u9RxIpdDh/C8iO0c+L3VUpP9SHKBPq8/wDCc+ux1MSjm0c7ved8qMz02TFqOijznpTUvIhUbaslikyBItykWQYC4QAFYBADBGCBNyrN2JbI8lHIn1VXKpaaXFMnzo1LlwLWKJuyQlMRvwhuHuw8L+7uIaniWplXkYfD7OnutZsWrXRfadJJWWR872b8Ny+FOEaDBoLOOVB4p8a/XmvOJ/Tl6H0pxr9z0le71XR8H/DxaaJ6emfGf7swPFUT5UiRMmz4lBKlwuOOJvJJK7Z5msjUfeg4s/sDgGPCKeb4a7GG5EPhecMpZzIvo976mNq3NyuKYbmVfpx7VVyrsc2dpnFEzi7jfE8bcTcqdN8NOn+rJhygX0Z9Wz5tNmMMKtkZ2LLTTFMREPMrtyblc11dMslFkYtXdwE8yXye44Yx3GOHq2GswbEqihnp3blR2UXWHR+pvDgrvDxylBTcW4b7XZ1lGrPrFL/yOerkbufG7Yt3Y9aG3i6hkYs726uHd2O8uFOL+HeKKVVGB4tTVq3ghitHD1heaPfJq+uZ/PahqKijqYailqJ1POhfvZkqNwRL1RtHhLt04ywSGCTXzJONU8OXhqV4ZiXKNf1RzbunVRxondZsXlNbq9W/Tt8Y4x+fN1yS5qDhPt+4OxRQS8VVTgtRFk/bQ+OVf5cP9TaGEYxhmL06qMNr6aslPSKRMUf2GjXaro9qFgsZljI93VEv35vMrImmtSo+bZLh8wyXAbl6kG4FIy2zDzAiD1CyG4FQFgAIVkApBdWzZ+avr6Ogp4qisqZNLKhV3HOjUC+smI3RMxEby/VYja87mpuLu3bhHCfHJwpzsaqYcl7BeGVfnG/6GmeM+13i/iZTJCrFhdFHk6ejbhbX70er+o3LODdudm0OJmcoMTGjaJ5090fnodA8e9q3C3CimSJlUsQxBLKkpYlFEn+9FpCc8doXadxJxjFFIqJ/uLDW/e0dPE1C/lvWJ/UfDN3u9W3d82S7Otj4Vuzx6ZUzUNcyczenfm090fv3sr7IJ3Mbi5uuKyYRLlQQyTCJmEBkgRDcIZAguBQQlwSzuMtDG7FwxZEIH5AXQJ5mKZ7vgXh6q4q4qocEpU17eZ+VjX+zlrOOL6DGqqKY3l9LVqq7XFFMcZby7r3CnuTCaniirlOGdXfkaW+0qF5xer+w3dZpdD82FUVPh+H09BSy1LkU8uGXKhW0KVkfqbKvfuzduTU9c0/Dpw8em1HZ59oH1IuZT4t1Ni6bAAR5lWRAwALnYgAW3DKA6kGwyAbl5kbKA3GoIwKiJjIANx1BdgI8ykSKAyQG4AjQ9CvUPQA2RAuQEY1A1QAuxNC7ASxWEAC8gCABqLBgGEgwwFgsxYtrAEFkwOgALUmYAu4QyuGA3PyYtQUuJYfUUVbIhn01RLilTZcWkULVmj9a1BMTMTvCJjeNpcE9rXBVXwJxjUYPPUUdLF+VopzWUyS3l6rRnyN0dzdtfZ/S8e8IzaGFQS8Tp7zaCfF+rMt8Fv8AZi0f0nD2IUlVh9fUUFdIjp6qnmOXOlRrOCJPNMvml58Zdrj7UdP5U/UMOca5w9mej8PFcXMWy3Om0F2FyAjcUEuRsgVmLFyNhIW5iGyNxWYslzFsjdlEDYuS5Lkbp2UjZGyMxTsrZg2GyN+RG6YhG8yNhsxuRMsogZiytmDZjuyiBuxi3mGzFtGO7LZbkuYmcuGKOOGCCGKOKJpQqFXbb0SXmRMp2WXBHMmQy5cEUccUShhhhV3E3okt2dW93jsHl4dBT8U8bUcM2vdplJh0xXhp/KOYt4/3dEfu7tPYnL4dk0/F3FdKo8amQqOkpJiuqKF6RRL/AHj/APD1Ogvglc1LVJne1anh2z+HbwcCI2uXI+TGCFQrmZ3Iz8eKYlRYXRR1mIVMump5avFHHFZf+rK/VVFMbzLr1VRTG8zwftbS1Z8/xbxZgfDcnx4nWwwzWrwSJfvpkXRI1lxn2s1VW5lJw7BFSyHk6qNflIvkr9Xq8zWFXUTKidHOnzY5s2N3ijjicUUXVs4GXrlFM82xG/x7P5V7M12mj1bEbz39n8vu+Ke2DG61xSMFkQ4ZIeSmxWjnNfYjXldX1dfOc+uqp1TNbu45sbif16Hhm6niZyar92/O9c7qzkZV3Ine5Vukx53PFFEzOI8URs2mjUxizPFEeSJnjiN+2+bG5I8wyRG9bYSwiPHGZxWPHEzftPhU8UwwZ5IjBm9RL5yweZPCZM93wLw3XcWcSU2DUMLTmO82bbKVLXwo3/TnY2Yq2hFFuu5XFFEbzLZ/do4K91V8fFtfJvIpm5dGol8OZ+tH6adbnRCVvU/BgGF0eDYRS4XQS/Z01LLUuXDyW75vU/ec27cm5Vu9X0rApwceLUdPTPxlQL3DufN0iw5AbZANDxVU6XIkRz5sSgly4XHHE9Ekrs8u1zU/eT4rWCcGf2RTTLVmLtylZ5wyV8N+vwfUzt0TXVFMNXMyacWxVdq7Ic+9oHEM3ini/EcZmNuCdNakJ/qyocoF9GfqeiZhC3uZHciIiNoeRXblV2ua6umZ3AColglhbIMj0CWSDMUy3JNjMAXIF0DJoQIVk0KmCAhzZuju08HOuxibxZWyb01E3LpFEvhTnrF/hX1s1Rw1gtdxBjtJg+HwOKoqZigTtlCt4nySzO0eEcEpOHeH6PB6FJSKWWoE94nvE+beZqZV3m082O1ZOTenf5OR6auPVo8+z6dL2kCsskZeIMlkszlvRmFRNly5UUUyNQQQwuKKJ6JLVnEHbJxlHxpx1WYlLmROhkv3PRQ7KVC9f8Tu/oN+96XjV4DwguH6Kd4cQxdOCJwu0UuQvhP1+D6s5MhVlkdfT7O0eklUOUObzqox6ezjLyJlMEZ7HTVaYCoxKiUSy1KTcqIYyqDvcAMVhP24diFbh05TqCrn0k1aRyZjgf1H4lkVMjbc3mJ3hszh7tr49wmCGVMxOViMpZeGslKJ2+UrM+9wXvIS14YcZ4aiWWcyjn3/APDEc7kbNevFtV9NLo2NYzLPCmuZ8ePm68wjt27P62Fe3xKpoI3rDU07X1rI+uwvjnhDE1D7g4jwyc4tF7oSf0M4Vv5XHhhveyv52NerTqJ6JdO1ynyKfbpifs/oRIqJM7OVMlzF+7Gn9h5U7bP6D+f1JiNdSRKKmraqREtHLnRQ/Yz28jjfjCnS9hxRjEFtF7pbX1nxnTauypu0cqaJ9q3P1d0uJLV2HtIP2kcTU3ap2h0+Uviqudv21DF9qP2wdsXaOv8A8zTX1p5f+Rh/8dc74ff/APJ8btpn7fl2W5kH7RVEnozjaLti7RnDb/pLM9KeX/kfhqe1HtAnt+04qr1f9jww/YiY0253wieVGN2Uz9vy7YvyZ+SrxOhpIXFVVtNIhWrmToYbfWcP1fGPFdXC1U8S4vMT1TqokvqPTT586fF4p86bNi85kbi+1n0p0ye2prXOVdP/AAt/Wf4doYx2p8B4WmqjiWjji/YkNzYvqPiMc7w/DshRwYRhOIYhEvgxzLSoH9OZzJA/CrQpLorFvkbFGnWo6eLm3+U2XXwoiKf78W2OIO3jjPEfHLw+GjwiTFp7GD2kxf4ov8jXmM43iuMz4p+LYlV10xu7c+a4lfktF9B6sG5bs27fsw4uRm5GT72uZ/vczb3ImRal3Pq1FTKY3BKNmRTFFBspSXJcI2ZXKjG4TCNmdxcxBIyvzKYXKmEMhuY3LcIUEuLgVAxuVBEwp1B3cuCf7B4ceOV8hw4jikKcKiWcqTrDD1er9DUHYbwRHxdxVDPq5UX9k4fFDMqW1lMi1hl+ur5HXMqBQQJJJJaJaJHI1LI4ejp+a6cl9M3n/KuR4fvKwqyKswuYOMvAS5Q0AehLhjcCgbgCDMDQB1A2ACwBQIC3yHQCF2zFiXAqRLDmXcALkKlkAFvMC4C4JuUA9AhcjugKSxeQAAjYAu5CkVwBSci6AQuREGBSBFAnUalTvkAJkAX1AiHQBgAUIBkBsQCjYg6gGvErbGge9D2XRYxRzOM8BpfFiVNB/p0mWs6iUv10t4ofrRv9GMcKiTRs4mVXi3YuUPhk49GRbmip/NpPfIpvbvJ9kcWA1E/i7hynbwmdH4q2ngX+qxt/DS/3bf0PkaIbtkX/ABsmjJtxcoUy/YrsVzRWrZEyNkbPs+KtkuRxGLZDLZlcNmFyNkbp2ZtkbMLi9yN07MmzG4uYtkbp2ZN5kuY3I3mRulWzFsjZi2RunZW2S5LmLeRjMpiGVyNmN7kbzMd2cQrMIitmDZG6YImYsreZHmYzLKIYt+Z1X3Vux2GklU/HXFNK/dUa8eGUk2H81DtOiT/Wf6q2WZ8l3W+yCHiWul8Y8R0zeD00y9HIjWVXMherW8EL+l9Gdhwy4YUvCkuXkV/VNQ23s258fw7Gn4e+1yv5MoEkue5XZK7MIm0ay7Ue0uXg3tMIwOOCdiPwZk5ZwU/LnFy2KxfyKLFHPrl0snKt41HPuS+j4945wrhaQ5cyJVOIRQ3lUsEWfWJ/qo0FxXxJi3Eld7pxOocST/JyYcpcteSX9Xmenn1M+pqJlTUzo50+ZF4o5kcV4on5tmEUV9yn52ddyp2nhT3flSs7U7uXVtPCnu/KuLmSJ3R42wnkaFNDnTLGPM8cR5ImeKNm5bpYTLB7njiM4mYRG9bh8peOIwiM4jxxG/bhhLFmLyRlEYRG7bfKWLPHEzOIwiN62+UsIjxs8jI0btD5TwYypUydNgkypcUyZHEoYIIVdxNuyS5nWXYtwNBwdw2vdMELxWsSmVUaz8HlLT8l9tz4ju99nfsVK4uxqR+Uavh8iNfBX+9a8/L6TeiSSML1zf1YXnk3pPo6f8q7HGej4R3/AD8lINway3i1KvpGgWQDcBkfmBjOmQypcUcyJQwQpuKJ6JLVnGna1xS+LuN6zEYIm6OU/YUcL0UuF6+ru/oN5d5PjB4JwssDop3hrsVThicLzlyF8J+uhy+nkdLCtbRz5UXlTqHPrjGono4z49jNBGKZkjeVBQPUXAEYAAEBIoZEUgAkL+YuA0L4ktciGzOwfs/i4qx1YriUl/2NQxpxKJZT5izUHRav6DC5XFFO8vvi4tzKuxat9Mtmd3LgeLB8GfEmIyXDX4hAvYQRLOVJ/o4tehuDw2MZcKghSSSSySSskjO6OLcrmurnS9XwcOjDsU2qOiPv8WOZ6/iDFqLBMGq8WxGapVJSSnNmxvZLbq9D2LeV7XOXu9Xx/wD2jXrgnCp96WljUeIRwPKZN2l9IdXzsfTHszerimGOfmU4lma56ezxam4/4rreMuK63HqxxL20dpMpvKVKXwYF0X1tnokzxpWViosVNMUxtDzq5XNyqa6umXkyLcwRkjJ89mVwmTkXkGMskZGKKQxkuVMlwghmMjC5ktAx2ZAiKggRchcg2QFMWVAXcqIiiESy2IGCUKgECUKjJGJkgiWSZACUbKVEXMoQu4A9RuDCYuQlC3FyEuDZlcqZjcpKNmaZU7GCKghkmDG5QKGQEoVFuY3KghT2PDODV/EOOUuD4ZJc2pqY/DD5QreJ8ks2fgky5k6dBJlQRRzI4lDDBCruJvJJLzOrewns6XB+EPEcSlJ41WQL2l8/c8G0tc/M1crIixRv2urpOmV597m/8Y6Z/va+v4D4YoOE+G6bB6BXhlK82Y1nNmP4Ub6/YfQMXsS5W6qpqneXqNq3TaoiiiNohbkLzJzMX0Ay5EzADIuwy3AIakKBCk0CQAFZNgKT0LbIiAF6BMiAoJmtyoAgxe4ysAZBYWApBuUBqMgAJcMMoAmRRluAYQIBUEgQA8wi9CbAUmrKAJpkWxGNgKANwIy5DUgAtwiPkAaAVgAYRdsybWAtw9CJABmgigDw1dPJqZEyRPlwTZUyFwRwRq8MULVmmt0cc94LslqOCa+PG8GlRzuHaiPK2bo43+pF+75RejOzLn5sSoaXEaKdRVlPLqKafA5c2TMhvDMheqaN/Az68O5zo6J6YaeZh0ZNG09PZL+b3oSLQ2928dj1ZwTPm41gsE2q4djjvfWOjb0hj84fKL0Zp6KIvFjIt5FuK7c8FSu2a7NfMrjiNi5iHkfTdhsouY3DZCRvYjdiNmNyN07M7kuY3I2RMp2W5GyXI2QnZTFi9jFvMjdMQrMbkbI2Y7sohWYti5GQnZbmLI2EyJlIzYfYN2a1faNxbDImwzJWC0bUeIVEKtltLhf7UX1K7PleCeGsU4v4mo+H8Gk+1q6qOyb+DLhXwo4vKFLNn9AuzXg3CuB+EqPh/CYfeSIbzprVop81/CmRc2/oVkcrUs3/AB6ObT7U/b4uhg4s3qt6vZh7zC6Klw2gp6Cip5dPS08tS5MqWrQwQpWSR+qKJJXulzZhOiglwOKOJQwwq7bdkl5tmiu1rtKixL2uB8PzooaLOGoqoXZzvOGHyh57lLycmmzTzqul1c3OtYVvnVfKO97TtT7TU3OwThuf5wVFbA/phlv7YvoNOxO7bu23qeDxWQ8bKtk3a79fOqUTLzbmVc59yf4eRslzHxC+Zq8xrbsmzG/MlyNk02zcbMItSt+ZhE8zZt0MZlGzxxGUTzMWblFL5zLFvIwZmzxxM3LcMJlhEYRGURibtEMJYsxiMojB6m3Q+NUsGbP7DuzuPibEIcbxWTEsGpo/ewtW90xr9Vfurd+h67sj7PKnjLEfdNUpkjBqeL8tNWTmv9iDn5vY6mw2ipsPopNFRyIKenkwKCXLgVlClsfeqvmxtCx6Dos5NUX70epHRHf/AB5vPLgUEKUMKhSVkkrJIyIynwegoL3GwAoGYAan4saxGkwrC6nEq2bDKpaaW5k2J7JI/Y3ZcznbvNcbqrqYeDsNm/kpMSmYhFC8oo/1Zfpq+dj62bU3K+a5+pZ1OFjzdnp7PjLVfHnE1VxbxRWY1VeJKbFaTLbyly18GFen1tnoWAduI2jaHlVy5Vdrmuqd5kMkzG5SWClzMSkoXYjBLg2UlwAKLmNwQbLmNAez4ZwTEuI8akYRhVO59TPdktoVvFE9oVuyJmI6WVFFVdUU0xvMvYdnnCWIcZcSScKolFBKTUdTPtlJl7xPnsl5nY3DWDYfgODU2E4ZIUmlp4PDBDu/OJ+bbzbPT9m/BmH8GcPS8No0pk6K0dTUtWinTN3yS2R9RocjIv8ApJ2joelaJpEYNvnV+3PT8Ph+WTRjEmVPmem404jw3hXh2qxzFZyl0tPDeyfvpkT0ghW7byNemJqnaHbrriimaqp4Q+N7eO0SXwNwtFDSxwvGa6Fy6OX+x5zXyW3mzjOdPmT5sc6dHFMmTInFHHE7uJt3bfNnuu0HijEeMeJqrHMSmPxzYrS5SfvZMtfBgXJfW7nzvizLFi4/oKNu2elQNUzpzLu8ezHR/fi8l8yowTMkbDmMkzJMwRkmEMmVMiexUGMskXYiZbhiIpGEyEMgQqCGSG5EW5LGVATFggGQCAqMkYoy2IQtiC4JQqLYiMkECKiBBDIgBKFRUTYpKFWQJsALcEYuSgAWZfUAANEBkhdkRSUFwQuQQouS4CGSZUyI3z2D9k0c2ZI4p4npbSlaOiopi+E9pka8vJep8r96mzTzqm5g4N3Nuxbtx4z3PZ93zswjoIZXFnEFP4aqOHxUNNMWcpP/AGkS/aey2N5w5Kwhh8K5l6lbvXqr1fOqen4GDawrMWrf/ue8yINynxbqMuwsNAJkirmBa+4AECAIWKQCgMABZk2FwDKgAFrELrqSwBFuyACoWAVwJmGNWUAEAAYyCLYCDchQBM7gvMCB5l1IBdiaFF1oAQdrkuUAMhkTcA8mUhXoBBqA2BbkDFgKCFQAANARjQuxMgBWCALlyJYdAL1FyNsoHiqqeTVU8ynqJUudJmwuCZLjhUUMcLyaaeqOTO3rsMqOH45/EXB9PNqcIzjqKKG8Uyk83DvFL+tdDrgxih8RuYebcxK+dR0dsd7VysS3k07VfV/NHmSJnWHbf2A0uNOfj3BcuVRYm2451D8GTUPdwbQRfU+RytieH12F4jOw/EqSdSVciJwzZM6BwxwPmmXPEzbWVTvRPHuVfIxbmPVtXHDvfmuRsrMGbL4FyXIGyE7LcjZLkZCVuRsjZGyJlMQtzFslyNmO7KF0MYmDCJkSmIG8siXMW2Qx3ZbM0eSXLmTY4JUqCKZMjiUMEEKu4m8kkvM8DdlfQ6f7pHZRE3J7QOIqW2+E082H/wDfa+79Pka2Tk02Lc11PtYsVXq4ppbG7tXZYuAuF/7QxWRD/wBIMShUVTE83Ig1hkrprFz6G2a2rp6Gjm1VXPlyJEqFxTJkyK0MKW7Z+XiHG8L4fwuZiOK1UFPIh884on5QrVvkc3dpvH2IcX1fsYVHSYVLivKpr5xfvR+b5aIo2bmTNU11cZl0s3ULOm2oojjV2R+8vc9qPaZO4iimYVg7mSMJTtHG8o6nr5Q8t9zXTjPz+IKJ3K9emq5VzqlGyMq5k3JuXJ3l5vEVHhvmZKI+E23y5zyXFzx+IrZj6M5zO4bPG4g2TFs3WJmETLcwbPtTQiahsxbI2Ytn3ppYTKtmLFzFuxtUQxmUiPHE8zKJmET3Zt0Q+cyjZ932T9nNbxjWw1dWplNgsqL8pOtZzWv1IP6vY9x2T9lFXxBHJxfH5c2lwr4UuT8GZU/+WHnvsdG0FHT0VJLpaWTLkyZUKhly4FaGFLZI2onaFj0fQasiYvZEbUdkd/8AHmwwnD6PC8Pk0FBTy6emkQqCXLgVlCj9VwVMhfaaYpjaOgYJvmLZBKoMJB6gM0OYPXcR4xQ4Fg1ViuIz4ZNJTQOOZE9eSXNvJExG87Qxqqiimaqp4Q+W7Y+N5PBnDMc+W4YsTqbyqKXf9a2cb5Q/acg1E+bUT5k+fMimTZkTjjjid3FE3dtnvO0Hiyu4y4ln4vWOKGB+8p5N8pMtaQrnu35nzzZ2cez6Kn4vMtZ1Kc6/vHsR0fn5rcjJcH3cdSoiKiUqi5GJdQjYICALgjJcIZC4R7DAcFxLHsVk4XhVLHU1c52hgh25t7JebImdk00zVMUxHGXjwPDa/GsVkYXhlNHU1c+Lwy5cO/N+SW7OuOyTs/ouCMH8HvJ+KVEKdXU21/ch8oV9ep4eyLs5w/gjDPHF4KrF58K901VtF+xB5Qr6z75ZHKycnn+rT0PQtD0SMWPTXo9fy/lclkGiFujTWV+bEaqnoKKfWVU5SZEiW5k2N6QwpXbOKe2/tNq+POIPBTuOTglJE1RSHl49vaxL9p/UjtyZCo4XC0mmrNNXuaO7XOwHCuIY52LcLRSsJxSK8cchq1PPfRfAi5rLobuFdt26963I1fHv37XNtTw7Y73KXjcSKkey4i4fxfhrE5mF45h8+hq5esExZRLzhekS5o9czvxMTG8KNXRNFU0zGy7lRjkVMMGZTFGRDFkioxTsZIMZZ3KYXVihCvzAQCFRUYlQQyLcxTKEMrluY3JcI2ZoIxTMkEKVGN7FvkQhUUiHIlDJMyWhgjJBEwpVoRvMXDFQS4JFWRlcwKEMsgS4bJAEuXa4RsvMpjmLkjLIEuL5BC5gXIEMrgxuVEgWBRRRwwQpxRROySV22frwfDK/GMRlYdhlJNqqqc7QS5cN2/8AJczpzsc7H6Phf2eL44pVbjNlFBDbxSqZ/u/tRfvbbeZr5GTRZp3npdHTtMvZ1e1EcO2eyP73Pn+w/sgdPFJ4j4tpk52UdLQRr4HlHMXn5Q/Sb7hVkFCloHqV69fqvVc6p6Rg4FrCt+jtx4z2yrD0IU+LdSwvYo6gGQMoAhQAzROpSPzAo1FyAUEHUCksNxYCvQmwCAD1BQIHoVIARcy+pABdiLQO5QIvIB5FuAWouLi4Bk6F6ACFIGBSbl2ItQD5FQ0GugB5E1LbzJsBckETYXABl2yIAQLqTQAVEKgBEVgAAyK4FIyk6gVEKMgFyNZjIXzApBoUAOhC23Ajzytc+I7UezLhnj+g9nitN7KughtIr5KSnS+Tf60PJ/UfcZNBGdu5XaqiqidpYV26bkc2qN4cCdqfZdxRwBVRRYjTOqwuKK0nEJELcqLyUW8D5M+DbP6YVlJTVlPMp6mRKnyZsPhmS5kCihjXk08mjnrtX7t2H10U3E+BpkGHVDvFHQTYm5Mb/cesPR5FlxNbpqjm3+E97g5elzb3qtcY7nKbMW/M9/xNwfxHw7WTKTFcLqKebA7NOF/SvNHz0V07NWfkztUXqLkb0Tu49NcVdE9C3J4uZCGUyyUjF+ZG+ZG7KEbMfEZM8cWTImWUK4rEbuYtk8UK1aS5mHOZbK1cxvbU+g4Q4R4l4sqVI4fwaqrf2pqh8MqBecUbtCl6m2+FezjgPhCZBiPHWLy+I8TlPxQYRhr8dPBF5TJmkXTJdTUycu1Yj1p49zLaKY51yebHfP8AePyeDu2di83jGtk8T8SU0yVw9IjUUmVGrOtiT0/hrd76HSPHfaLgPCFM6Kl9lW4hBCoZdLIaUEpLJeJrKFLy1NM8VdrHEGMSP7Ow6GXguGQw+CGRSZReFaJxbLkrHxLm+JO7u27t8yo52bcyKt56OxqZGvUWKfR4kce2qf2j8/R7nijijGOJsUdfi1S5kealy1lBKXlCtuurPVOO+p4G9woji10b8Vdru1XKpqqneZeZxBRHjTKfGbbHd5blueNNluYTbTzmdy3PHd3JfzZHoznPJ4sieIxuRsmLZzmfiMWzFxE8RnFs3WIxbK3cwiPrTSxmocRG2zBu2uR9z2f9mmP8VxwVDlxYdhredVOhzjX7kO/XQ+9FEy+lmxdv18y1TvL4/DaCtxOul0OH0s2qqZrtBLlw3bN+dl/Y/S4VFKxTiaGXWV6tFLpvhSpL5/tRfUfecE8GYHwlRewwum/KxK02pmZzZnV7Lksj6VJJWRuU07LrpnJ6ixtcyPWq7uyPyxhhUKskZE3KZLMAhbAMiFQzAXGQRjFF4eYEnzJcqXFHMjhghhTiiiidkktWzlDt37RI+LsW/srDJkUOCUcx+Fp/6xMWXtHyWy9T6fvBdp6rI53CXD1Renhfhr6mXF+ca1lwvyW730NHRO508TH5vr1dKi8oNZ9LM41meEdM9/w8Hj0LcCxvqmosEUAikCAoYAQjFw9SMAyNZFulqzZXZb2TYvxdHKr8Qhm4bg97+1ihtMnrylp/eeRhXXTRG8vvj413JuRbtU7zL5PgbhLGuMMYhw7CKdxWs50+LKXJh84n/TVnWPZtwHhHBWFewooPbVcxL3TVxw+/mvyXlD5I9zwxw/hXDmFSsNwijl01PAtIV76J/tRPd8z2yOVfyZucI6HoWk6Hbwo9JXxr7+7w/KK2wsVvYI1XeRCyBbASxX5ahhaAei4z4TwHi3DHQY7h0mslWfgbVo5b84YtYWcv9qnYRxBw57XEeG/aY1hkN4ooIYf9IkrnD+suaOvCNI2LGTcs9E8GhmadZyo9eOPf2v5wNRQxOGNOGKF2aas0zNK5212j9kXCXGkMc+ppFQYk9K2lhUMbf78OkfrnzObO0Lsd4u4O9pUql/tXDYW/9KpIXF4V+/BrD9h2bGbbu8OiVRzdIv428xHOp74a7Wli2FyNm244ZJmKKghkZp5HjRUyEM0wYp3LcIllct0Y3FwhkVGNxdhDO5OoT2LYIDJMxCCJZXLcxTLcIZC5jcqCGSZkYFuEMhcgWgRsyRUYXLclGzINkTAQtwmTRETAyKY3LclEskxkzFPzKmA0CYBKFGoP24JhGKY5iMGH4RQz62pjdlLlQ3a5vyQmYjpTTTNU7Q/GfZ9m/ZvxDxtUqKkk+5cOhitNrZyagXKFfrPkjbPZl2D09G5WI8Yxw1c9WihoZUX5OB/vxfrdFkbzpaeRS08unp5MuTKlrwwQS4VDDCvJJaHLyNRin1bfGe9adM5NV3Ji5k8I7u3593n4Pmez7gTAeC8OVPhdP4p8aSnVcxJzZr67Lkj6xZKyAOPXXVXO9UrrZs0WaIotxtEJcBF5mL6mQJuUAEAgFiLkAgKTQDO4C9i6ompQBOpQAyIXRBaALZEGYAo5kQXkBXciKSwDMahZjYCvQhdCXAZhcxzKAYGRAKAigYtBeQKBOhdidQAZSPQICjqTe4y8wLqLjRBgTMMoAiK9AGwAsPtJ1ApB6gC9Q8ggBEy3yJoLgCsC4BsnIFuBGVdBkFmBEVEsEBSJgACkQQFJrqrl9CAeq4k4ewjiChdFi9DJq5T08a99Bzhi1RoftD7v8y0yr4ccuvlZv3LUWhmrlDFo/XM6OI0mrPMzouVUTvTLnZul42ZxuU+t3xwn6uAsZ4JlUFZHSV9FWYdUwuzlxpp/Qz09RwnD/sa5rlHB/kf0A4h4fwjH6R0uMYdT1kq1kpkOcPSLVehqHi/sFkR+OfwzicUiJ5qmq/fQ9FGs16o6NrU71PCalWy9E1HHnnY9fPjunp+/S5Tj4Vq18CpkRdbo8MfDOKQ6ewa8/aGz+LOD+JuF5sX9s4RUSZKdlPgh8cqLpEsj5uOP2iundcjbjVL/AHx9HCqzs21VzbkbT8Y2fGPAcST+BL/40eWXw1XTLeKbIg/xXPqGZy3nYTql+e76Mp1PI24bfR83L4RjbvMrlbdQwHv8DwbDcMjU6Ghp6memmplVB7TwvlDe30pn74NDNLI17uVerjjU16tRyaumr6cHtqnHsWraaGmqq+dFTQ/BkQtQSl0ghtD9R+NzE4bKyS2PzJmcLNCqGrXXVXVzqp3lk82ZQx2PG2S7PjVb3IqefxcypngTM0z4VWmUVPOmZX5nhhiMvEfGbSec8txc8dxcw9EnnPJcjeZh4hcejOczUVi+I8TyHisPRp5zOJkuFFDdJvN6Lc+x4T7NeK+I3DMk0EVDSN51NWnBD1UOsXoZRbl9bFq5fq5lumZn4PjlGlq8j6LhLg7iDiqcoMIw+OOTe0dTM97Kg6xPXojdvB3Ytw5hMUupxaKPGKmHO0xeGTC+UK19TZ1LTyaaTBIkSoJUqBWhgghUMMK5JH1ps96y4XJi5XMVZE7R3R0/Xo82teAux7AsDcFZizWLV8Oa8cNpMD/dh36s2bBLhghUMKSSVkkskZoh9oiI6FvxcOzi0cy1TtC9RfyIES2VG4ZAG4HK5QIVAxjiUKbvoBlE7Ghe3ztW9zwT+F+F6m8+K8FbWS3+bW8uB/teb2MO2rteh/0jhvhOp8UecurxCW8ofOCW/PZxfQaEmu50cbF/51qXruv7b4+NPjP7R+XgXNgrQSOipu4XIEAXHUAIVFJqVATMqLY/dgWC4tjtbDR4Ph9RWzm7WlQXUPV6JdRMxHSmmmquebTG8vw6ns+HOHcZ4kr1Q4LQTqyc/heBe9gXnFFokbm4F7Ao3FLq+Lq1Ja+4qWLPpFH/AJG8cDwTC8EoYKHCqGRR08P6kqG1+be75s0ruZTTwp4rJp/Jq/ennX/Vp+/8f3g1b2ZdiGFYI5eI8SOViuIQ2ihk2/ISn0fw31yNwS4IYIVDCkklZJLJLkZdAc25cquTvVK8YmFZxKOZap2/vao6gXMG0mhSFWaAEQCAblzuTPYZgXcIjKgHUxcMMWVrFeY1A1v2hdjfB/FqmVDo/wCzMQi0qqOFQtv96DSL6jnrjvsR414Z8dRS0yxqhhu/bUabjhX70Gq9LnZqJFCr332NuzmXLXDfeHLy9IxsnjMbT3w/nRFDFBHFLjhigmQu0UMSs0+aGx3Vxp2ccIcXS4v7YweRHPf/AGmSvZzl/iWvrc0fxr3cMTp4o5/CmLS6yXqqas95GuSjWT9bHTtahbr4VcFaytAyLXG360ff6NCNlTue34k4V4j4bqHJx3Bqyhe0UyW/BF0iWTPUQrK6zRuxVFUbw4ldFVudqo2llCUxWgD5skwQoFTKjFFQQu5kjHUoQy1RCJlCAyTMHqVBDMu5FoAhkgS4uEKjJGKKghdwQoQC5ASMg1uRMupKJLhMWyCCGRCN2V27HtuG+Gsf4jqVT4HhNVXRXs4pcHvIebi0SImqIjeWVFuquebTG8vV3P0YdR1mJVkFHh9LOq6mN2hlSYHFE30RvPgju8z5nhqOLcSUtf8A+JRu79Y9PoN4cKcJcP8AC9KqfA8Lp6KG3vooYbxxdYnmzQvahbo4U8ZWDD5N5F7jd9WPv9Py0LwD2BYnWuXV8WVP9nyXn7kkNRTYvlRaQ/ab84V4XwPhihVHgmHSaOV+s4VeOPnFE82e6sodC7HKvZNy97U8FvwtKxsOP9Onj3z0orIdRmU13RQq0I9CrQA0hsNCMAXRE2LsBOY1AAdSkKBNxuPQbgXcB5aEApC9RsA01AuGAzJuBtcAsgykYFQIiu4EYWZdiaAUMAAEQJgAXcMCFzIi2YEKAAJzKTcBfzLkQoBkAYBlWgGoDK40BAGpSIoAX8wtQwCsR5jcoECuEVgATMAECsZARFQWpGBcgERqzAtl5kK+QQBIAAQIFADLQEAF0AAEAQHjnSZU6XFLmS4Y4IlaKGJJp9Uz4Pinsk4Jx5xzI8KVDURXftqN+zd+cOj+g2C9CExMx0PhfxrV+nm3KYmPi5t4m7vWLU7im4Bi9NWQX97KqV7KP/iV0zXOPcA8Y4FE3iPD1dBLTt7WXB7SB+sNztiyeuYcCejt0PpF2YcLI5MYtzjbmafvH3/LgqCJQxeGP3sSyaas0eeHNHamM8K8O4vC4cSwTD6q7veORD4vpWZ8fiXYpwNWRRRyqKpoYnp7nqGkvR3PrF+O1w7/ACTyaZ3t1xP2/LluxTfuJdgFC03h/EVTLe0M+Qol9KZ6Gs7AuIYFelxvDZ/KOCOB/YPSUy5legajR029/CY/LT711KjZU7sS45l38ErDZ3yapK/0o/FO7IePpeSwWXM+RUwf5kTMd7Wq0vNp6bVX0fBGSPs32VdoCf6Nzn0ny3/zGcHZXx8//wAuTl1nS/8AMwnZj/8AH5f/APKr6S+LRkj7iDsl4+jy/sSGDnFUQL+p+ym7FuO5lnMp8Pkr9+qX9DGaYZU6Zm1dFqr6S16mRs25R9g/EMxJ1eM4dT8oIYo2e9w7sCoFCniHENXNi3UiTDAvruYc2G3b0HUK/wDr28ZiP3aHvYzkQxTpilyYIpscTsoYIXE39B09hXY5wRQxQRx4dOrI4dXUTnEn1Ssj7LCcAwfCpSl4bhlHSQp/7KUk/p1MebDqWOSmRV72uI8OP4cs4J2dcZYx4YqXAqiVLidva1P5KFfTmfe8Pdgs+NwTcfxqGBauTRw3d/LxM314fPPqXfIc2HaxuTOHa4171T8ej7PleF+z/hTh1QvD8IkOdD/t569pM+l6eh9UkkMwS71qxbs0823TER8FegJsXIPqEK7ES8gAKLAATqNgGYzCG4FzSNOd4KPtFqKGZQcO4bMWDOH/AEidSR+KfNW8LSzhh6am4sxEk+pnbr5lXO23auZjf5NqbfOmnfucAzfaUs1yZ8qZJmQuzgmQuFr0ZYYvGdzY3w1geNQODFcJoq1PedJTf06nwuL9hnA9Y45lNT1WHTInf/R514V/hiudGjOpn2oUzJ5K36eNqqJ+zlbwOxLWOgcU7vcp/wDu3iaZDyqKa/1ws9NO7vWPr81j+GzOsuOE+0ZVqe1zKtB1Cnpt/SY/LSwNxLu+cUOKzxfC0vP33+R+2n7u+Ku3uniSjl8oKeKL/In/ACbXeiNDz5/65+zSKhYiVs27HReHd3rCYIV7u4hrp0W6lSYYF9dz6rCexfgOgjhjiwqOtjhWtVOcSforI+dWbbjobVrkznV+1EU+M/jdyXTSp9TOUmlkTaiY8lDKgcTf0H3vDHZFxxjfgmPDFh1PFZ+1rIvBk91DqzqzCcDwjCZMMrDMNo6KFaKTJhh+tZnsFCvI+FefM+zDs43JS3TxvV7+HBpvhHsEwGhcE7H6ydis1ZuXB+Tk/wCb+o2vg+EYbhFHDSYbQ09HIhSSgkwKFevn6n7tis067tdftSsWLp+NiRtaoiPP6otCsbBOx824i0sMrh2Ys7AXXQEWWhQGwIlkAKmEETK4F0dhbIaAANCbgCwghQIVhAARrLMpAPDU0lPUyIpNRJlTpUWsEyBRQv0eRrfi7sQ4Ex5RTZeHRYVUxXftaGLwK/OB5P6jZ4M6LldE70zs+N7GtX42uUxLlTinu5cS0TimYBitHicu78Mud+RmW9fev6TWXEHBPFvD8USxjh7EKWGH/aeycUD6RLI73sm80YzJcMcLhizheTWzN2jUblPtcXFv8ncevjRM0/f+/V/OtNXtfNbGVjuriLs84Mx5Rf2jw3h02OJWcyCV7OP6YbGvMf7uXCdT4o8JxHEcMiayhcSnQJ+tn9Zt0ajbnpjZyL3JzJo9iYn7OWLZjc3XjHdy4qp88LxfDK+HymKKTF9d0fG4v2R9omGeJzeGqmfBD+vTRwzU/odzZpybVXRU5d3TMu37VufN8Qin7K7B8Ww9uGvwqupWv99TxQ/aj8d1ezaT55H2iYnoaVVNVM7TCFLb1FiWCApbARMpLZmVgiUKtQi2CFRTFGaTIRKBhtLVoylS450ShlQRzInooIW2/oJ3RtLHUp9BhXA/GOKxJYfw1ic5P9ZyHCvpdj7HBewjj6vUMVVIocNgbz9vPvEl8mG586r9un2pbVrAybvsUTPyat0HiS1aR0bgXdwoYffY3xFUT3f4FLJUC+mLM2Bw/wBkHAODRKKTgEmpmJpqZVxOa/oeX1GtXqFqno4upY5OZdz29qfn+HIuCYHjWNzlKwjCayujbt+RlOJX66GyeGewPjHE/BMxSZSYPKesMyL2k3/hhy+s6ppaSnpZalU0mVIlr9SXAoYfoR5rLZI07mpVz7MbO1j8mLFHG7VNX2ap4Q7CuDcFign18qdjFRDZ3qnaWnygWvqbOoaGkoaaGnpKaTTyYfgy5UCghXoj9INGu7Xc9qd3ex8SxjxtapiDawvsQp82yjRQ76jICXDBQIUlkNALoCbhagEkUdBqBMwgvIrQAIhWAQJcXzyAu4ehOpbgRDQrGVgCFmRFAhWTcqyQC4CIAKws9SPIANswgwLfyG4sQC5k0GxVnmBLlZNy2AbjMACFXMgANFQVxoBMwirUMCblfIaaC4EzZUQXzzAtwGhsBChaEAC41AFIUZANAQMAMwwBSF3AAjA2AIbhC4DoUjKwAaDIwARSALMoDAgzFwBfQm4Q3ApBuGAyK+REACKQAV2IAswDS8iOGHyKVaAY+zh/ZQ8ENvgoyRNwbMVDDfQysvIMrYAZPQlxkgAAyApNgNgLsS+ZehAKTcumhAAzDAFJ0KyaAFYOwAAr0JcoDREKQC6i4JzADIuwSADmCMBqAhmAGhQgBCsgAFJYC5WILBaAFcrsTYZAAA+QCwBQDZFoWxLALFYI9QGwYKwGRHYAAuZQ7EQFWoZCgCdBqEAWRdSMdADzIoIb3tmVXRUwPHPky5q8MyGGNeUSTX1npcS4P4XxF3r8AwuofnHSwX+lI98QmKpjolhVboq9qN3wGI9jvZ3WX8XDVPJb3kTIpf2M9HWd3/gOcvyMrEqb5FT4vtRty/mNz6xkXY6KpatenYtftW4+jR0/u38Mxu8nHMXlcmpcX9D19R3bKH/s/FFSv4lMn9jOgQZxmXo/5PhVo2FV/wBcfdzjH3a51/ecWQW50b/8xj//AE11W/Fsr/8ARP8A8x0e8hsZf517vfP/AOBwf/D7z+XO0nu15fleK2/k0tv6n7ZHdswz/bcUVz+RTwr7Wb9IyJzb0/8AJlGh4Mf8PvP5aSpO7lwvLjUVRi+LVCX6vvIb/Qe8o+wns+kNOPDque1/vauKz9FY2iW5hOVen/k+1Ok4dPRbh8dQ9mXAVH4XJ4Ww5xQ7zJfjf1s+hosGwuhSVHh9HTpaeykQw/Yj2BD5zcqq6ZbVGPat+xTEeEJ4U8nmEksoVYyIzB9lYzIAGZQAJuCgBtkQu4AZkVi5IICLIZlyDAZB9CaFAWsQoAjGZRcAARZgW5C2FkAfIbC+xLsC7EsNRYCjUbEAFGxAKQFzAmiL1CItQLmS/mUlgCK+QIwKQIAChDYCFuQegApEygORCgANiMAAikuA5BDqGA0BWLARDoCp7AQDMMCoi8gOYF6gXuAAA0AiK+gG4EzRW0TcoEQZSANgMr5FYAXBNQKNgTcByKGRAXTcnMryIBUMiDYCoLUiAFdgRAC7DYiZcwAIUBYmQ6lyALkAiX2ANF0AAEKgBFkL5i2ZbAL7CxNxcC8ydSkzYDcq5DoLWAegTGxAL1IMxqBUTUvUgBZFIigTcrW4DAbixAAsVAMAOQIBSIZgBkVXJyHICkzbBQJoUhQIwtANwCBeZADyGuuRctyMCh5C+QQDYWuRLmM0AsUjC0AMoQtkBLlzZMhcCk+oZl65AQFAB8gOo3AlmUACXLfIligQMpNwLCGgQCi+QXMmVwAZeRAHUIoAgKAIAUArgiY3ArFsh0AESBWHkAsBcLNAELAl7ALF6E2CuASuUehGBSFAEepbkeQyArJuABSIoAj5DMruTMArlWQbIgG5VqTkNwKCDMCi4CQDUbCwYERSIdABSbhsC6aBkbLkAI9AwAuUmhQBAXKwEKTUALeRSF9QFwGQCjQEAMpLACkRdtSPkBddSdBqMgBQAIOo5AAUhV0AgfIoeQAdSalAmQ1FisAGBe+oEGw9AgFy3yHoGBB0GotkAuUhQAJZF0Ag5FRNwKhqQAXJEtmXIgFDIwBQ3kCagFmNVYFAiLpqQoAgzZeQE1LyJ0LsAvsBsTQBYFY2AlwA3cCkDKuYE6DMtwBFmgW/IagQAaAGLFzJe4FIUgF1BOYAoIHcCoXYRAK7jmQAAkyjcACZplAg6FIgLcBhgS2ZdxkAD1Ii5hsCWA1DzAoJYoBAjKncATfMvINebAAEAAMPkBWRjPcq6gQAqYDqSyK8yWYF5kvcC24DYuZEW3MCB8ioAARaFAgsVEd75ACj0I9QKrghQIUE0AbF2Fw9AAAAiK8gR5gC3uCAXYXsMgwBLNlZNAGiGQG4DUF3G4E0D5FFrgQcik6gNi6oMgDYC42AqAJ0AtiFuN9AADIgA0BeQEuVjIj0AodiLQWAtshcg6gBcoAgQGoCwKAIUbkYFZAg0BQwhmABLZluAYIVsCFRCgQqzIEAL6AMCFYsQAUnQuQC9iBDcAyk3KBAigB6gbEAodiF2AmYelhoOYDQX8iojYAXswEAZX1CIBbkQvcoC2QDIBehAyoAiFehEALbIiKAJuUKwEYG+RQI1kEOQAoAAXFyWyCABAANC9CZlQAhSaAUiCRQI9S8ggAJYovkBCkWeo3ArsCaDMC5EGozAMqWQTRAGpciKxWBLIIDkAuNSgCLyLuRalfmBHqE9gXMBmQo1AmwsNGNwCuAVgCX2KgAQI2GgGexUNEAIUCwELkggA6BkRWwAayF2LgTUMBAB0LYgFbINCgQC+QApAAALsAJyLZEzLe4AAgAvQm5QAZMy3ADUgApNWLFAEvsXkS2QADQoDYn1FIBXkTQWCAvMmuQADkNy3ROYBsF2AAhXqQCsgAFVyPmUmoDMAqAWyCIUCIqAAEuUAFcZAiYArZAwDFxkUA9BoGiAUhdxzADYnMPQChjQPMCPQq0IUAATcBsVMEWoFFwQCjILQAGRl2GwEKrWGQAbgWADYInILmBSMrGwE0Gw0LZANiFCYAgDApCkXMAUm5WgBCsagQoIwK8kECAOZRkTcAwUWsBMxcuxAA+wuwQE3Fy7gACBgLl2yJYALsF3IBXcInqW/ICXzGpbkyACxQAFyF2AX3IvMoVgJqUm5bbgSyAQzAqIUjAFC5j1Ai1LmRFQEG40ZWAYWRLoANSt2JuNQLsQqXmAHQMgApB0KBEih6EWgDcXGRcrACZjIAW4HUbABrsAAYGxMwAGYApGWwtcA1kNiXKAICgSwT5h6BWAZAPyAFAJfMBYF6kWoFIsioAQMugAEepQtQJqwxbMALZahaAqAmZSXDAugIMwKS5eZNwBbjcIACPkVAQZl1IwKCZlVwIA8wBVmGCXsBSBi7AruEh6jICBagIChdRuAG4JuXQCXFgUAn5BgACC+Y5gLZjTMtwgHoCdS2AXRHcZBAXYLQiyKA2FiFAgFwBb5ELkQCkzZWTQCvQgKBLluRBsAXYhWAzCIUCZh6l2IA1GSZUycwLYBACbDUu40YEKTRlAjKBfIARC45gXYEtcoE0CKL2AIbBZoOwAE6FAEZfUgApA9QGhctQQCkYuXYAReZQuYDXUm4eYArAIAGQ6DO4DYBhAXYlikYFIOhUABHqGAG4Wg2ArIUmaAbluhqwwJmVIIAR6lJuALyJoVWIgAXMai4FGwZACuHqGEAKTRlAi5lAYEuVgANiahlTAEfIrzJuA2KGibANxZlSIAKQoAE1CyAMLQurH2AQoVkGwJcFIBXoS/mCgS+ZQiaALlIADKCb5AUWyG4uBEgVMARZgFyYEA0LkAt5EZSABoXQMACZCwC6GrLYiyApAXLUCDkUaARB6lQAmxSB8gKidRkGBRsQIAUbgAiFDzAEuABdiF2FwDsATQChoEdwGSFvIIoEFi3GQDYiCQ9AAC1LmAZA1cLmAv5luR5lSAiLYjQAAoAhdialAlykWpcgBEMygCaFJYA89AgUCDYFAiBUyAAtRkVAS4tmUIAsg9CZFuBMwLFuAIAugFGg3DAhSZDICoXJcoETzKyIAW3mQoeYEYWosMwLYlxcdQAW4GwAoJuAyKxuGgFgNgsgG1xkGABAEAL0JcoEY2Go6AFzKrAKwDIjKACFgNgGjI7jMuoBZomQuGA0LtkTYABctvMllcChixALsTMpALqGToVACbjRi+YFuQtgwFsiFAEC0KLAT7AXYATLQryIlmNwKLZEADQu4D5AEwRDoA2BVpmQAvMAqAWA0IuYFdyFIBQ7kvmUCZlTCuEgHQm5dyRAUZWCWREgLla5PQFAEWpWRAVk0eQ1CyAN+QzKsgwGQsTQANy3zIVAQZAbgALF2Ai5lyINQGYKiPLJAVDcEAot5gXYBpBBkzApEGAK3naxNykYFJcJFAaEbKQA0FoELeYFQ+sDQAR3KwBLi7uLDYABvmVALIgepWAGVxsQAGCgQqCeYyQAlyhATmNihaARO5dxbzAEyL6ksgwAz1KwACuRFAWIXqAIwipACAtybgFmVWFgBCoJgA8wrEYArsSxdiZgUahEAuhE8ykugLuRjUoEWhSAAVZkAFJoXoABOguM0ALkFyDQEG5QAQC8xcAyZbAtgBGijcAAyWAW3KQMCixCgAAAIVgCegA0AoGwvZACJFIAtmW5NygQLqVkSAoQIwAfMFYEGZRmBLgAAH9YLcCZgZgAXMAARZMMqWWYEvmXKwJvmBehNy5ACdQuReRLAXNAAAQoAgWhSABcC3IC6ghQBNNg7lACwAD7CBFAPQlykeYDMqyF8iK4FBCsAR+ZSZgBZlFwJmX1IyrQAR6gAXYlygATcPoXPcALBhgOhAWwE3KRalAm452KNgJqUKwAmgK0AAyIV5AFzILZlyeYABEYFsOpLsNsAXUBARleQYuBMrF2BNgKCFAhQQC7jVjQcwIy+g1zIBVkCblugJ1KiWHQCuwI2VABmTcrAEWpQAAAEKBcB6EWYzADoFcrAABkYF9SMpAAKQCkZbjUCDoNwALsAAAyI9QLqCAChMnQIAUAASw0KBNw2V3ADUhSALCxdiAVWG4AAWDzJsAK2TPQaaABmUAQAoAZgABcAAikAEehQAI9AtQAGw2AAbBAANwwACDAAgAAAAAAAKiAAC7gAGNwADCAALUMAAHoABCoASIAAKtAgAC0CAAhXoABFqXcACFQADcoAEZAABdgAG4YABah6AAQqAAIgAB6lWgABBAAETcAAXYACAAAVAACAAC7gAQAAAtQALuGAAepAABUABC7gAUbAATYAAGQAAVgAGEAARAALsQAC+Q3AAMbgAGNwAJuZAAYlYABhgAUjAAIPQAAiAAV6haAAEGAAYQAEAAAq1AAMIACIyAAjG4AEAAFQ3AAMIACFQABEAIFepACRdhuAAQYAEKAAYAApNwAGxAALsQACobAAFoFqAAYYAEKgAIVgAQqAAhWABAAB//Z";




const COLORS = COLORS_DARK;
const FONTS = { head: "'Syne', sans-serif", body: "'Inter', 'DM Sans', sans-serif" };

const INITIAL_USERS = [
  { id: 1, username: "admin", password: "admin123", role: "admin", name: "Admin", active: true, createdAt: new Date().toISOString() },
];

const GOALS = ["Lose weight gradually & sustainably", "Build muscle while losing fat", "Improve overall health & fitness", "Maintain current weight"];
const FOOD_PREFS = ["Vegetarian", "Non-Vegetarian", "Vegan", "Keto / Low-carb"];
const FITNESS_LEVELS = ["Beginner", "Moderate", "Active"];
const WORKOUT_TYPES = ["Home", "Gym", "Outdoor"];
const WORKOUT_FREQUENCIES = ["1x per week", "2x per week", "3x per week", "4x per week", "5x per week", "Daily"];
const MEDICAL_CONDITIONS = ["Diabetes", "Hypertension", "Thyroid disorder", "PCOD / PCOS", "Heart condition", "Other"];

// Country → States map
const COUNTRY_STATES = {
  India: ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh","Puducherry","Chandigarh"],
  USA: ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"],
  UK: ["England","Scotland","Wales","Northern Ireland"],
  Australia: ["New South Wales","Victoria","Queensland","Western Australia","South Australia","Tasmania","ACT","Northern Territory"],
  Canada: ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland","Nova Scotia","Ontario","Prince Edward Island","Quebec","Saskatchewan"],
  UAE: ["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"],
  Germany: ["Bavaria","Berlin","Hamburg","Hesse","Lower Saxony","North Rhine-Westphalia","Rhineland-Palatinate","Saxony","Baden-Württemberg"],
  "Other": ["N/A"],
};

// Country-specific food databases
const COUNTRY_FOODS = {
  India: {
    Breakfast: ["Idli", "Dosa", "Poha", "Upma", "Paratha", "Thepla", "Puri", "Besan Chilla", "Oats Porridge", "Daliya", "Sabudana Khichdi", "Aloo Paratha", "Moong Dal Chilla", "Bread Uttapam", "Ragi Dosa"],
    Lunch: ["Dal Rice", "Roti Sabzi", "Rajma Chawal", "Chole Bhature", "Biryani", "Khichdi", "Sambar Rice", "Curd Rice", "Paneer Curry", "Mixed Veg Dal", "Palak Dal", "Fish Curry Rice", "Chicken Curry Roti", "Egg Curry Rice", "Baingan Bharta"],
    "Evening Snack": ["Chai & Biscuits", "Samosa", "Bhel Puri", "Roasted Chana", "Sprouts Chaat", "Makhana", "Banana", "Poha Chivda", "Peanuts", "Fruit Chaat", "Dhokla", "Chikki"],
    Dinner: ["Dal Makhani", "Palak Paneer", "Grilled Chicken", "Fish Tikka", "Vegetable Khichdi", "Multigrain Roti & Sabzi", "Tofu Stir Fry", "Egg Bhurji Roti", "Light Soup & Roti", "Dalia Khichdi", "Moong Dal Soup"],
    Munching: ["Almonds", "Walnuts", "Peanut Butter", "Dark Chocolate", "Makhana", "Roasted Seeds", "Dates", "Figs", "Dried Apricots", "Coconut Bites"],
    Fruits: ["Papaya", "Watermelon", "Banana", "Apple", "Pomegranate", "Guava", "Mango", "Orange", "Pineapple", "Pear", "Kiwi", "Grapes", "Chikoo", "Jamun", "Amla"],
  },
  USA: {
    Breakfast: ["Oatmeal", "Greek Yogurt", "Eggs & Toast", "Pancakes", "Bagel", "Smoothie Bowl", "Cereal", "Avocado Toast", "French Toast", "Breakfast Burrito"],
    Lunch: ["Sandwich", "Caesar Salad", "Burrito Bowl", "Soup & Bread", "Grilled Chicken Wrap", "Tuna Salad", "Mac & Cheese", "BLT Sandwich", "Club Sandwich", "Pasta Salad"],
    "Evening Snack": ["Crackers & Cheese", "Apple & PB", "Trail Mix", "Granola Bar", "Hummus & Veggies", "String Cheese", "Pretzels", "Fruit Cup"],
    Dinner: ["Grilled Salmon", "Chicken Breast", "Steak & Veggies", "Pasta", "Tacos", "Burger", "Pizza", "Stir Fry", "Soup & Salad", "Meatloaf"],
    Munching: ["Almonds", "Cashews", "Peanut Butter Crackers", "Dark Chocolate", "Popcorn", "Rice Cakes", "Sunflower Seeds"],
    Fruits: ["Apple", "Banana", "Blueberries", "Strawberries", "Watermelon", "Grapes", "Peach", "Mango", "Pineapple", "Orange", "Kiwi", "Cherries", "Raspberries", "Cantaloupe", "Plum"],
  },
  UK: {
    Breakfast: ["Porridge", "Full English", "Toast & Beans", "Muesli", "Kippers", "Crumpets", "Yogurt & Granola", "Scrambled Eggs"],
    Lunch: ["Sandwich", "Jacket Potato", "Ploughman's", "Soup", "Salad", "Fish & Chips", "Pasty", "Scotch Egg"],
    "Evening Snack": ["Biscuits & Tea", "Scone", "Fruit", "Crackers & Cheese", "Yogurt"],
    Dinner: ["Roast Dinner", "Shepherd's Pie", "Fish & Chips", "Curry", "Pasta", "Stew", "Stir Fry", "Grilled Chicken"],
    Munching: ["Almonds", "Crisps", "Dark Chocolate", "Dried Fruit", "Oat Biscuits"],
    Fruits: ["Apple", "Banana", "Strawberries", "Raspberries", "Blackberries", "Pear", "Plum", "Grapes", "Orange", "Kiwi", "Mango", "Blueberries", "Peach", "Watermelon", "Melon"],
  },
};
// Default for countries not specifically listed
const DEFAULT_FOODS = {
  Breakfast: ["Oats", "Eggs & Toast", "Yogurt", "Fruit Smoothie", "Cereal", "Pancakes", "Bread & Butter"],
  Lunch: ["Grilled Chicken & Rice", "Salad", "Sandwich", "Soup", "Pasta", "Stir Fry", "Wrap"],
  "Evening Snack": ["Fruits", "Nuts", "Yogurt", "Crackers", "Protein Bar"],
  Dinner: ["Grilled Fish", "Chicken & Veggies", "Pasta", "Soup & Bread", "Rice & Curry", "Salad Bowl"],
  Munching: ["Almonds", "Walnuts", "Dark Chocolate", "Dried Fruits", "Seeds"],
  Fruits: ["Apple", "Banana", "Orange", "Mango", "Pineapple", "Watermelon", "Grapes", "Kiwi", "Papaya", "Pear", "Strawberries", "Blueberries", "Peach", "Pomegranate", "Guava"],
};

const HEALTHY_SWAPS = {
  "White Rice": "Brown Rice", "Wheat Bread": "Multigrain Bread", "Butter": "Olive Oil",
  "Milk": "Low-fat Milk", "Cheese": "Low-fat Paneer", "Banana": "Apple", "Mango": "Papaya",
  "Samosa": "Roasted Chana", "Chai & Biscuits": "Green Tea & Makhana", "Paratha": "Multigrain Roti",
  "Biryani": "Khichdi", "Chole Bhature": "Chole & Roti", "Pancakes": "Oatmeal",
  "Mac & Cheese": "Pasta with Veggies", "Pizza": "Grilled Chicken Wrap",
};




// ── Food lists filtered by dietary preference ─────────────────────────────────
const PREF_FOODS = {
  India: {
    Vegetarian: {
      Breakfast: ["Idli", "Dosa", "Poha", "Upma", "Besan Chilla", "Oats Porridge", "Daliya", "Moong Dal Chilla", "Ragi Dosa", "Thepla", "Aloo Paratha", "Bread Uttapam", "Sabudana Khichdi"],
      Lunch: ["Dal Rice", "Roti Sabzi", "Rajma Chawal", "Khichdi", "Sambar Rice", "Curd Rice", "Paneer Curry", "Mixed Veg Dal", "Palak Dal", "Baingan Bharta", "Chole Rice", "Vegetable Pulao"],
      "Evening Snack": ["Chai & Biscuits", "Bhel Puri", "Roasted Chana", "Sprouts Chaat", "Makhana", "Fruit Chaat", "Dhokla", "Chikki", "Poha Chivda", "Peanuts"],
      Dinner: ["Dal Makhani", "Palak Paneer", "Vegetable Khichdi", "Multigrain Roti & Sabzi", "Tofu Stir Fry", "Dalia Khichdi", "Moong Dal Soup", "Paneer Bhurji Roti"],
      Munching: ["Almonds", "Walnuts", "Makhana", "Roasted Seeds", "Dates", "Figs", "Dried Apricots", "Peanut Butter"],
      Fruits: ["Papaya", "Watermelon", "Banana", "Apple", "Pomegranate", "Guava", "Mango", "Orange", "Pineapple", "Pear", "Kiwi", "Grapes", "Amla", "Jamun"],
    },
    "Non-Vegetarian": {
      Breakfast: ["Eggs & Toast", "Boiled Eggs", "Egg Omelette", "Egg Bhurji", "Poha with Egg", "Idli with Egg Curry", "Chicken Sandwich", "Dosa", "Oats Porridge"],
      Lunch: ["Chicken Curry Roti", "Fish Curry Rice", "Egg Curry Rice", "Mutton Biryani", "Chicken Biryani", "Dal Rice", "Roti Sabzi", "Rajma Chawal", "Prawn Curry Rice", "Khichdi"],
      "Evening Snack": ["Chicken Kebab", "Egg Sandwich", "Roasted Chana", "Sprouts Chaat", "Fish Tikka", "Boiled Eggs", "Peanuts", "Fruit Chaat"],
      Dinner: ["Grilled Chicken", "Fish Tikka", "Egg Bhurji Roti", "Chicken Soup", "Mutton Curry Roti", "Prawn Stir Fry", "Baked Fish", "Chicken Khichdi", "Dal Makhani", "Light Soup & Roti"],
      Munching: ["Almonds", "Walnuts", "Boiled Eggs", "Chicken Jerky", "Roasted Seeds", "Peanut Butter", "Dates"],
      Fruits: ["Papaya", "Watermelon", "Banana", "Apple", "Pomegranate", "Guava", "Mango", "Orange", "Kiwi", "Grapes", "Amla"],
    },
    Vegan: {
      Breakfast: ["Moong Dal Chilla", "Besan Chilla", "Oats Porridge", "Poha", "Ragi Dosa", "Daliya", "Idli with Sambar", "Upma with Veggies", "Fruit Smoothie Bowl", "Sabudana Khichdi"],
      Lunch: ["Dal Rice", "Roti Sabzi", "Rajma Chawal", "Mixed Veg Dal", "Palak Dal", "Khichdi", "Sambar Rice", "Tofu Curry Rice", "Chickpea Salad", "Baingan Bharta"],
      "Evening Snack": ["Roasted Chana", "Sprouts Chaat", "Makhana", "Fruit Chaat", "Dhokla", "Peanuts", "Bhel Puri without Curd", "Coconut Water"],
      Dinner: ["Tofu Stir Fry", "Vegetable Khichdi", "Dalia Khichdi", "Moong Dal Soup", "Palak Tofu", "Rajma Curry Roti", "Lentil Soup", "Mixed Veg Curry"],
      Munching: ["Almonds", "Walnuts", "Roasted Seeds", "Dates", "Figs", "Dried Apricots", "Peanut Butter", "Makhana"],
      Fruits: ["Papaya", "Watermelon", "Banana", "Apple", "Pomegranate", "Guava", "Mango", "Orange", "Pineapple", "Kiwi", "Amla", "Jamun"],
    },
    "Keto / Low-carb": {
      Breakfast: ["Egg Omelette", "Boiled Eggs", "Paneer Scramble", "Avocado with Eggs", "Chicken Salad", "Egg Bhurji", "Cheese Omelette", "Bulletproof Coffee"],
      Lunch: ["Grilled Chicken Salad", "Fish Curry (no rice)", "Paneer Tikka", "Egg Salad", "Chicken Lettuce Wrap", "Tuna Salad", "Mutton Curry (no rice)", "Prawn Stir Fry"],
      "Evening Snack": ["Boiled Eggs", "Paneer Cubes", "Almonds", "Walnuts", "Cheese", "Roasted Seeds", "Cucumber with Hummus"],
      Dinner: ["Grilled Chicken", "Baked Fish", "Mutton Soup", "Paneer Steak", "Chicken Soup", "Egg Drop Soup", "Fish Tikka", "Prawn Masala (no rice)"],
      Munching: ["Almonds", "Walnuts", "Macadamia Nuts", "Cheese Cubes", "Roasted Seeds", "Pork Rinds", "Dark Chocolate (85%+)"],
      Fruits: ["Avocado", "Strawberries", "Raspberries", "Blackberries", "Blueberries", "Kiwi", "Watermelon (small)", "Guava"],
    },
  },
  USA: {
    Vegetarian: {
      Breakfast: ["Oatmeal", "Greek Yogurt", "Eggs & Toast", "Pancakes", "Smoothie Bowl", "Avocado Toast", "French Toast", "Fruit & Granola"],
      Lunch: ["Caesar Salad", "Veggie Wrap", "Soup & Bread", "Grilled Cheese", "Caprese Sandwich", "Black Bean Bowl", "Pasta Salad", "Hummus Wrap"],
      "Evening Snack": ["Apple & PB", "Hummus & Veggies", "Trail Mix", "Granola Bar", "Crackers & Cheese", "Fruit Cup"],
      Dinner: ["Pasta", "Veggie Stir Fry", "Bean Tacos", "Grilled Cheese & Soup", "Veggie Burger", "Mushroom Risotto", "Eggplant Parmesan"],
      Munching: ["Almonds", "Cashews", "Dark Chocolate", "Popcorn", "Rice Cakes", "Sunflower Seeds"],
      Fruits: ["Apple", "Banana", "Blueberries", "Strawberries", "Watermelon", "Grapes", "Peach", "Mango", "Orange", "Kiwi"],
    },
    "Non-Vegetarian": {
      Breakfast: ["Eggs & Toast", "Breakfast Burrito", "Bacon & Eggs", "Omelette", "Smoked Salmon Bagel", "Chicken Sausage", "Turkey Wrap"],
      Lunch: ["Grilled Chicken Wrap", "Tuna Salad", "BLT Sandwich", "Club Sandwich", "Chicken Caesar Salad", "Shrimp Tacos", "Turkey Sub"],
      "Evening Snack": ["Hard Boiled Eggs", "Jerky", "Tuna Crackers", "Cheese & Crackers", "Protein Bar"],
      Dinner: ["Grilled Salmon", "Chicken Breast", "Steak & Veggies", "Tacos", "Shrimp Stir Fry", "Baked Cod", "Turkey Meatballs", "Chicken Soup"],
      Munching: ["Almonds", "Cashews", "Dark Chocolate", "Popcorn", "Sunflower Seeds"],
      Fruits: ["Apple", "Banana", "Blueberries", "Strawberries", "Watermelon", "Grapes", "Peach", "Mango", "Orange"],
    },
    Vegan: {
      Breakfast: ["Oatmeal with Berries", "Smoothie Bowl", "Avocado Toast", "Fruit Salad", "Chia Pudding", "Tofu Scramble"],
      Lunch: ["Black Bean Bowl", "Veggie Wrap", "Lentil Soup", "Quinoa Salad", "Hummus Wrap", "Buddha Bowl"],
      "Evening Snack": ["Hummus & Veggies", "Trail Mix", "Fruit Cup", "Rice Cakes with Almond Butter", "Roasted Chickpeas"],
      Dinner: ["Tofu Stir Fry", "Bean Tacos", "Lentil Curry", "Pasta Primavera", "Veggie Burger", "Chickpea Curry"],
      Munching: ["Almonds", "Cashews", "Dark Chocolate", "Dried Fruits", "Sunflower Seeds"],
      Fruits: ["Apple", "Banana", "Blueberries", "Strawberries", "Watermelon", "Mango", "Orange", "Kiwi", "Raspberries"],
    },
    "Keto / Low-carb": {
      Breakfast: ["Eggs & Bacon", "Cheese Omelette", "Avocado & Eggs", "Smoked Salmon & Cream Cheese", "Keto Pancakes"],
      Lunch: ["Grilled Chicken Salad", "Tuna Lettuce Wrap", "BLT (no bread)", "Steak Salad", "Cobb Salad"],
      "Evening Snack": ["Hard Boiled Eggs", "Cheese Cubes", "Almonds", "Pepperoni Slices", "Celery & Almond Butter"],
      Dinner: ["Grilled Salmon", "Steak & Asparagus", "Chicken Thighs", "Shrimp Stir Fry (no rice)", "Lamb Chops"],
      Munching: ["Almonds", "Macadamia Nuts", "Cheese", "Dark Chocolate (85%+)", "Pork Rinds"],
      Fruits: ["Avocado", "Strawberries", "Raspberries", "Blackberries", "Blueberries"],
    },
  },
};

// Get foods filtered by preference and meal
function getFoodsByPref(country, foodPref, mealKey) {
  if (!foodPref) return (COUNTRY_FOODS[country] || DEFAULT_FOODS)[mealKey] || [];
  const prefFoods = PREF_FOODS[country]?.[foodPref]?.[mealKey];
  if (prefFoods && prefFoods.length > 0) return prefFoods;
  // Country has no pref-specific list — use India lists as sensible default for Indian dishes
  const indiaFoods = PREF_FOODS.India?.[foodPref]?.[mealKey];
  if (indiaFoods && indiaFoods.length > 0) return indiaFoods;
  return (COUNTRY_FOODS[country] || DEFAULT_FOODS)[mealKey] || [];
}

// ── Comprehensive Food Health Database ────────────────────────────────────────
// status: "healthy" | "moderate" | "unhealthy"
// score: 1–10 (10 = most nutritious)
// reason: why it's rated this way
// suggestion: healthier alternative
const FOOD_HEALTH_DB = {
  // ── Grains & Carbs ──────────────────────────────────────────────────────────
  "White Rice":         { status:"moderate", score:5, cal:130, reason:"High GI (72), low fibre, causes blood sugar spikes", suggestion:"Brown Rice or Millets (GI 50, 3× more fibre)" },
  "Brown Rice":         { status:"healthy",  score:8, cal:110, reason:"Low GI, high fibre, rich in B vitamins & magnesium", suggestion:"Already a healthy choice ✓" },
  "Multigrain Roti":    { status:"healthy",  score:9, cal:80,  reason:"High fibre, low GI, rich in complex carbs & minerals", suggestion:"Already a healthy choice ✓" },
  "Paratha":            { status:"moderate", score:4, cal:200, reason:"High in oil/ghee, refined flour — calorie-dense with low nutrients", suggestion:"Multigrain Roti with minimal oil or baked paratha" },
  "White Bread":        { status:"unhealthy",score:3, cal:80,  reason:"Refined maida, GI 75, zero fibre, causes insulin spike", suggestion:"Multigrain / Whole Wheat Bread (GI 48, 5× fibre)" },
  "Oats":               { status:"healthy",  score:10,cal:150, reason:"Beta-glucan lowers cholesterol, high fibre, reduces hunger", suggestion:"Already a top choice ✓" },
  "Poha":               { status:"healthy",  score:7, cal:120, reason:"Light, iron-rich, easily digestible, low fat", suggestion:"Add peanuts for protein boost" },
  "Idli":               { status:"healthy",  score:9, cal:40,  reason:"Fermented, probiotic, low-cal, easily digestible, no oil", suggestion:"Already a healthy choice ✓" },
  "Dosa":               { status:"healthy",  score:8, cal:120, reason:"Fermented batter, good protein-carb balance, probiotic benefits", suggestion:"Opt for oil-free or minimal-oil preparation" },
  "Upma":               { status:"healthy",  score:7, cal:180, reason:"Semolina-based, satisfying, good with vegetables", suggestion:"Use whole wheat rava for extra fibre" },
  "Biryani":            { status:"moderate", score:4, cal:350, reason:"High in refined rice, oil & spices; calorie-dense", suggestion:"Veg Khichdi or Brown Rice pulao (50% fewer calories)" },
  "Khichdi":            { status:"healthy",  score:9, cal:200, reason:"Protein-complete (dal+rice), easy to digest, balanced macros", suggestion:"Already a healthy choice ✓" },
  "Puri":               { status:"unhealthy",score:2, cal:110, reason:"Deep-fried maida — high trans fat, no fibre, spikes blood sugar", suggestion:"Baked whole wheat puri or chapati" },
  "Bhatura":            { status:"unhealthy",score:2, cal:200, reason:"Deep-fried maida — extremely calorie-dense, clogs arteries", suggestion:"Whole wheat naan baked in oven" },
  "Naan":               { status:"moderate", score:4, cal:260, reason:"Refined flour, high calorie when buttered", suggestion:"Whole wheat roti or thin tandoori roti" },
  "Pasta":              { status:"moderate", score:5, cal:220, reason:"Refined semolina, moderate GI; healthiness depends on sauce", suggestion:"Whole grain pasta with tomato-vegetable sauce" },
  "Pancakes":           { status:"moderate", score:4, cal:180, reason:"Refined flour + sugar + butter — nutrient-poor", suggestion:"Oat pancakes with banana (50% less sugar, high fibre)" },
  // ── Proteins ────────────────────────────────────────────────────────────────
  "Dal":                { status:"healthy",  score:10,cal:150, reason:"High plant protein, fibre, folate, iron — cornerstone of healthy diet", suggestion:"Already a top choice ✓" },
  "Paneer":             { status:"healthy",  score:7, cal:265, reason:"High protein & calcium; watch portion (100g max) due to saturated fat", suggestion:"Low-fat paneer for weight loss goals" },
  "Eggs":               { status:"healthy",  score:9, cal:78,  reason:"Complete protein, choline for brain, vitamin D, B12", suggestion:"Boil or poach — avoid frying in butter" },
  "Chicken":            { status:"healthy",  score:8, cal:165, reason:"Lean protein, B3, selenium; grilled/baked is heart-healthy", suggestion:"Grilled or tandoori — avoid fried chicken" },
  "Fish":               { status:"healthy",  score:10,cal:150, reason:"Omega-3 EPA/DHA reduces heart disease by 35%, anti-inflammatory", suggestion:"Already a top choice ✓ — aim for 2× per week" },
  "Rajma":              { status:"healthy",  score:9, cal:110, reason:"High protein, fibre, iron, folate — excellent for weight loss", suggestion:"Already a healthy choice ✓" },
  "Chole":              { status:"healthy",  score:8, cal:120, reason:"Rich in protein, fibre, manganese; low glycemic index", suggestion:"Avoid high oil — dry roasted spice preparation" },
  "Tofu":               { status:"healthy",  score:8, cal:76,  reason:"Complete plant protein, calcium, isoflavones for bone health", suggestion:"Stir-fry with vegetables — excellent swap for paneer" },
  "Soya Chunks":        { status:"healthy",  score:8, cal:52,  reason:"52g protein per 100g — one of the highest plant proteins", suggestion:"Already a healthy choice ✓" },
  "Mutton":             { status:"moderate", score:4, cal:294, reason:"High saturated fat raises LDL; high purine content", suggestion:"Lean chicken or fish (70% less saturated fat)" },
  "Prawns":             { status:"healthy",  score:8, cal:99,  reason:"Low calorie, high protein, selenium, iodine, omega-3", suggestion:"Grilled/steamed — avoid butter/cream preparations" },
  // ── Vegetables & Salads ─────────────────────────────────────────────────────
  "Salad":              { status:"healthy",  score:10,cal:30,  reason:"Low calorie, high micronutrients, fibre — perfect filler", suggestion:"Add seeds/nuts for healthy fats and protein" },
  "Sabzi / Curry":      { status:"healthy",  score:8, cal:100, reason:"Depends on preparation; vegetables are nutrient-dense", suggestion:"Steam or sauté with minimal oil" },
  "Sprouts":            { status:"healthy",  score:10,cal:30,  reason:"Enzyme-rich, high protein, vitamin C triples upon sprouting", suggestion:"Already a top superfood ✓" },
  // ── Dairy & Beverages ───────────────────────────────────────────────────────
  "Curd / Yogurt":      { status:"healthy",  score:9, cal:100, reason:"Probiotic, calcium, B12, boosts gut microbiome", suggestion:"Plain Greek yogurt for 2× protein" },
  "Milk":               { status:"healthy",  score:8, cal:120, reason:"Complete nutrition — protein, calcium, B12, vitamin D", suggestion:"Low-fat milk for weight management" },
  "Buttermilk":         { status:"healthy",  score:9, cal:40,  reason:"Probiotic, cooling, aids digestion, very low calorie", suggestion:"Already a top choice ✓" },
  "Chai":               { status:"moderate", score:5, cal:60,  reason:"Antioxidants in tea are good, but sugar & milk add calories", suggestion:"Green tea or tulsi tea — no sugar" },
  "Coffee":             { status:"moderate", score:6, cal:5,   reason:"Antioxidants, improves metabolism; avoid with excess sugar/cream", suggestion:"Black coffee or with plant milk — no sugar" },
  "Green Tea":          { status:"healthy",  score:9, cal:2,   reason:"EGCG antioxidants, boosts metabolism by 4%, anti-inflammatory", suggestion:"Already a top choice ✓" },
  "Fruit Juice":        { status:"unhealthy",score:3, cal:120, reason:"No fibre, concentrated sugar (same as soda), spikes insulin fast", suggestion:"Whole fruit or infused water — zero sugar" },
  "Coconut Water":      { status:"healthy",  score:8, cal:45,  reason:"Natural electrolytes, potassium, zero added sugar", suggestion:"Already a healthy choice ✓" },
  // ── Snacks & Street Food ────────────────────────────────────────────────────
  "Samosa":             { status:"unhealthy",score:2, cal:250, reason:"Deep-fried maida+potato — 15g trans fat, 0 fibre, spikes blood sugar", suggestion:"Roasted chana chaat or baked mini samosa" },
  "Pakora / Bhajia":    { status:"unhealthy",score:2, cal:200, reason:"Deep-fried in high-heat oil — carcinogens, high saturated fat", suggestion:"Air-fried vegetable cutlet or baked kebab" },
  "Vada Pav":           { status:"unhealthy",score:2, cal:290, reason:"Fried vada + refined pav — 30g+ fat, 0 fibre, 290+ kcal", suggestion:"Boiled egg sandwich or sprouts wrap" },
  "Chole Bhature":      { status:"unhealthy",score:2, cal:500, reason:"Fried bhatura + oily chole — 500+ kcal in one meal, very high fat", suggestion:"Chole with multigrain roti (half the calories)" },
  "Makhana":            { status:"healthy",  score:8, cal:50,  reason:"Low GI, high magnesium & phosphorus, anti-ageing antioxidants", suggestion:"Already a healthy snack ✓" },
  "Roasted Chana":      { status:"healthy",  score:9, cal:120, reason:"28g protein per 100g, high fibre, iron — one of best Indian snacks", suggestion:"Already a top snack ✓" },
  "Nuts (Mixed)":       { status:"healthy",  score:9, cal:175, reason:"Heart-healthy fats, vitamin E, magnesium, reduces LDL by 10%", suggestion:"30g max per day — unsalted & unroasted best" },
  "Almonds":            { status:"healthy",  score:10,cal:165, reason:"Vitamin E, magnesium, healthy fats — 23 almonds = ideal snack", suggestion:"Already a top choice ✓" },
  "Biscuits":           { status:"unhealthy",score:2, cal:120, reason:"Refined maida, 8-12g sugar per serving, zero nutritional value", suggestion:"Makhana or rice cakes or a small handful of nuts" },
  "Chips":              { status:"unhealthy",score:1, cal:150, reason:"Ultra-processed, 10g salt per 100g, acrylamide carcinogen when fried", suggestion:"Roasted peanuts or air-popped popcorn" },
  "Namkeen":            { status:"moderate", score:3, cal:130, reason:"High sodium, processed oils; occasional only", suggestion:"Roasted seeds (sunflower, pumpkin) or puffed rice" },
  "Chai & Biscuits":    { status:"unhealthy",score:2, cal:180, reason:"Sugar + refined biscuits — empty calories, no nutrition", suggestion:"Green tea + 10 almonds (protein + antioxidants)" },
  // ── Sweets & Desserts ───────────────────────────────────────────────────────
  "Mithai / Ladoo":     { status:"unhealthy",score:1, cal:350, reason:"25-40g sugar per piece, saturated fat, zero fibre, high GI", suggestion:"1 date + 2 walnuts for natural sweetness & omega-3" },
  "Halwa":              { status:"unhealthy",score:2, cal:280, reason:"Ghee + sugar + refined semolina — very calorie-dense", suggestion:"Oats halwa with jaggery (40% fewer calories)" },
  "Gulab Jamun":        { status:"unhealthy",score:1, cal:175, reason:"Fried + sugar syrup — pure calorie bomb with no nutritional value", suggestion:"Fruit chaat with honey (natural sugar + vitamins)" },
  // ── Fruits ──────────────────────────────────────────────────────────────────
  "Apple":              { status:"healthy",  score:9, cal:95,  reason:"Quercetin & fibre reduce heart disease risk by 20%, keeps full", suggestion:"Already a top choice ✓" },
  "Banana":             { status:"healthy",  score:7, cal:105, reason:"Potassium, B6, energy — good pre-workout but moderate GI (51)", suggestion:"Best in morning or pre-workout" },
  "Papaya":             { status:"healthy",  score:9, cal:55,  reason:"Papain enzyme aids digestion, high vitamin C, anti-inflammatory", suggestion:"Already a top choice ✓" },
  "Watermelon":         { status:"healthy",  score:7, cal:30,  reason:"95% water, lycopene antioxidant, very low calorie", suggestion:"Excellent hydration fruit — ideal at lunch" },
  "Mango":              { status:"moderate", score:6, cal:100, reason:"Nutritious but high natural sugar (14g/100g) — limit to 1 cup", suggestion:"Eat with protein to slow sugar absorption" },
  "Orange":             { status:"healthy",  score:9, cal:62,  reason:"Vitamin C boosts immunity & iron absorption, flavonoids protect heart", suggestion:"Already a top choice ✓" },
  "Pomegranate":        { status:"healthy",  score:10,cal:83,  reason:"Punicalagin antioxidants — 3× more than red wine, lowers BP", suggestion:"Already a superfruit ✓" },
  "Grapes":             { status:"moderate", score:6, cal:104, reason:"Resveratrol is good but high natural sugar — limit to 15–20 grapes", suggestion:"Prefer red/purple grapes for more antioxidants" },
  // ── Oils & Condiments ───────────────────────────────────────────────────────
  "Ghee":               { status:"moderate", score:5, cal:112, reason:"Butyrate for gut health but high saturated fat — 1 tsp max/day", suggestion:"Replace with olive oil for cooking" },
  "Olive Oil":          { status:"healthy",  score:9, cal:119, reason:"Monounsaturated fats reduce LDL, anti-inflammatory polyphenols", suggestion:"Already a top choice ✓" },

  // ── Indian Breakfast ────────────────────────────────────────────────────────
  "Thepla":             { status:"healthy",  score:7, cal:120, reason:"Made from whole wheat + methi — rich in iron, fibre, and antioxidants from fenugreek", suggestion:"Limit ghee; pair with curd for protein" },
  "Besan Chilla":       { status:"healthy",  score:9, cal:110, reason:"High protein (chickpea flour), low GI, low fat — excellent weight loss breakfast", suggestion:"Already a top choice ✓ Add veggies for micronutrients" },
  "Oats Porridge":      { status:"healthy",  score:10,cal:150, reason:"Beta-glucan fibre reduces cholesterol by 10%, keeps full for 4+ hours", suggestion:"Already a top choice ✓ Add nuts/seeds for healthy fats" },
  "Daliya":             { status:"healthy",  score:9, cal:130, reason:"Broken wheat — high fibre, protein, complex carbs; low GI, ideal for weight loss", suggestion:"Already a top choice ✓" },
  "Sabudana Khichdi":   { status:"moderate", score:5, cal:250, reason:"Tapioca pearls are pure starch with zero protein/fibre — energy dense, low nutrition", suggestion:"Have in small portions; add peanuts for protein" },
  "Aloo Paratha":       { status:"moderate", score:4, cal:250, reason:"Potato filling + maida/wheat + ghee = high carb, high fat, moderate protein", suggestion:"Multigrain paratha with paneer filling — 40% more protein" },
  "Moong Dal Chilla":   { status:"healthy",  score:9, cal:100, reason:"Soaked moong — complete protein, low GI, high fibre, iron, folate; very satiating", suggestion:"Already a top choice ✓" },
  "Bread Uttapam":      { status:"moderate", score:5, cal:160, reason:"White bread batter reduces fibre vs traditional fermented rice-urad; moderate nutrition", suggestion:"Traditional fermented rice-urad uttapam is much healthier" },
  "Ragi Dosa":          { status:"healthy",  score:9, cal:100, reason:"Finger millet — highest calcium grain, iron-rich, low GI, gluten-free, anti-diabetic", suggestion:"Already a superfood choice ✓" },
  // ── Indian Lunch ────────────────────────────────────────────────────────────
  "Dal Rice":           { status:"healthy",  score:9, cal:280, reason:"Complete protein (dal + rice amino acid complementation), B vitamins, fibre, iron", suggestion:"Use brown rice or millets to lower glycemic impact" },
  "Roti Sabzi":         { status:"healthy",  score:9, cal:220, reason:"Whole wheat roti + vegetable sabzi = balanced macros, high fibre, low fat", suggestion:"Already a top Indian meal ✓ Use minimal oil in sabzi" },
  "Rajma Chawal":       { status:"healthy",  score:8, cal:300, reason:"Rajma is high protein + fibre; chawal provides carbs. Lower GI than biryani", suggestion:"Use brown/red rice; avoid excess oil in rajma" },
  "Sambar Rice":        { status:"healthy",  score:9, cal:260, reason:"Lentil-based sambar is high protein; fermentation probiotic benefits; vegetable micronutrients", suggestion:"Already a top South Indian meal ✓" },
  "Curd Rice":          { status:"healthy",  score:8, cal:220, reason:"Probiotic curd + rice — excellent gut health, cooling, easily digestible", suggestion:"Use brown rice; add pomegranate/cucumber for micronutrients" },
  "Paneer Curry":       { status:"healthy",  score:7, cal:280, reason:"High protein & calcium; watch oil quantity in curry base", suggestion:"Reduce cream/butter; use low-fat paneer for weight management" },
  "Mixed Veg Dal":      { status:"healthy",  score:10,cal:200, reason:"Multiple vegetables + protein dal = maximum micronutrient diversity. Anti-inflammatory.", suggestion:"Already an excellent choice ✓" },
  "Palak Dal":          { status:"healthy",  score:10,cal:180, reason:"Spinach + lentils = iron absorption synergy, folate, protein, vitamin K", suggestion:"Already a nutritional powerhouse ✓" },
  "Fish Curry Rice":    { status:"healthy",  score:8, cal:320, reason:"Omega-3 from fish, complete protein, B12; rice provides energy", suggestion:"Use brown rice; avoid coconut milk excess for calorie management" },
  "Chicken Curry Roti": { status:"healthy",  score:8, cal:350, reason:"Lean protein from chicken + whole wheat roti = balanced, satiating meal", suggestion:"Grilled/baked chicken curry with less oil is heart-healthy" },
  "Egg Curry Rice":     { status:"healthy",  score:8, cal:300, reason:"Eggs are complete protein; curry spices are anti-inflammatory", suggestion:"2-egg serving is ideal; use minimal oil in curry" },
  "Baingan Bharta":     { status:"healthy",  score:8, cal:120, reason:"Roasted eggplant — very low calorie, fibre-rich, B vitamins, antioxidants", suggestion:"Already a healthy dish ✓ Avoid excess ghee" },
  // ── Indian Evening Snack ─────────────────────────────────────────────────────
  "Bhel Puri":          { status:"moderate", score:4, cal:180, reason:"Puffed rice is fine but chutneys add sugar/salt, puri adds fat. Calorie-dense for a snack", suggestion:"Sprouts bhel (replace puri with sprouts) for 3× more protein" },
  "Poha Chivda":        { status:"moderate", score:5, cal:150, reason:"Flattened rice is okay but fried version has excess oil; high sodium", suggestion:"Baked poha chivda with peanuts — same crunch, 50% less oil" },
  "Peanuts":            { status:"healthy",  score:8, cal:160, reason:"High protein (7g/oz), heart-healthy fats, resveratrol — one of best budget snacks", suggestion:"Roasted unsalted — 30g serving (small handful)" },
  "Fruit Chaat":        { status:"healthy",  score:9, cal:80,  reason:"Mixed fruits = vitamin diversity; chaat masala adds antioxidant spices; very low calorie", suggestion:"Already an excellent snack ✓" },
  "Dhokla":             { status:"healthy",  score:8, cal:80,  reason:"Fermented chickpea batter = probiotic, high protein, low fat, steamed not fried", suggestion:"Already a healthy snack ✓ Avoid fried garnish" },
  "Chikki":             { status:"moderate", score:5, cal:120, reason:"Jaggery + peanuts/seeds = natural sugar + protein. Better than refined sweets but calorie-dense", suggestion:"1 small piece max; prefer peanut chikki over sugar chikki" },
  // ── Indian Dinner ────────────────────────────────────────────────────────────
  "Dal Makhani":        { status:"moderate", score:5, cal:250, reason:"Protein-rich black dal, but butter+cream makes it calorie-dense and high in saturated fat", suggestion:"No-cream dal makhani (use cashew paste) — 60% less saturated fat" },
  "Palak Paneer":       { status:"healthy",  score:8, cal:200, reason:"Iron from spinach + protein from paneer + curcumin from spices = nutritional powerhouse", suggestion:"Low-fat paneer; minimal cream; already a healthy choice" },
  "Grilled Chicken":    { status:"healthy",  score:9, cal:165, reason:"Lean protein, no added fat, selenium, B3 — ideal for weight management and muscle building", suggestion:"Already a top choice ✓ Season with herbs, not heavy sauces" },
  "Fish Tikka":         { status:"healthy",  score:9, cal:140, reason:"Baked/grilled fish — omega-3, lean protein, zero carbs, anti-inflammatory", suggestion:"Already a top choice ✓" },
  "Vegetable Khichdi":  { status:"healthy",  score:9, cal:220, reason:"Dal + rice + vegetables = complete nutrition, easy digestion, balanced macros", suggestion:"Already an excellent dinner choice ✓" },
  "Multigrain Roti & Sabzi": { status:"healthy", score:9, cal:200, reason:"Multigrain flour = diverse fibre types + micronutrients; vegetable sabzi adds vitamins", suggestion:"Already a top choice ✓ Use minimal oil in sabzi" },
  "Tofu Stir Fry":      { status:"healthy",  score:9, cal:180, reason:"Complete plant protein, calcium, isoflavones; vegetables add fibre and micronutrients", suggestion:"Already a top choice ✓" },
  "Egg Bhurji Roti":    { status:"healthy",  score:8, cal:280, reason:"Scrambled eggs = complete protein + choline; whole wheat roti = complex carbs + fibre", suggestion:"Limit oil in bhurji; add spinach/tomatoes for micronutrients" },
  "Light Soup & Roti":  { status:"healthy",  score:8, cal:200, reason:"Soup = high satiety, low calorie, hydrating; roti = complex carbs. Perfect light dinner", suggestion:"Already a healthy dinner ✓" },
  "Dalia Khichdi":      { status:"healthy",  score:9, cal:210, reason:"Broken wheat + dal = complete protein, very high fibre, low GI — ideal for weight loss", suggestion:"Already one of the best dinner options ✓" },
  "Moong Dal Soup":     { status:"healthy",  score:10,cal:120, reason:"Very low calorie, high protein, easy to digest, alkalizing — ideal light dinner", suggestion:"Already a top choice ✓ Add ginger+turmeric for anti-inflammatory benefits" },
  // ── Indian Munching ──────────────────────────────────────────────────────────
  "Walnuts":            { status:"healthy",  score:10,cal:185, reason:"Highest omega-3 among nuts (2.5g/oz), reduces LDL by 16%, brain-protective DHA precursor", suggestion:"Already a top choice ✓ 4–5 halves daily is ideal" },
  "Peanut Butter":      { status:"healthy",  score:7, cal:190, reason:"Healthy fats, 8g protein per 2 tbsp, magnesium, B6 — but watch portions (calorie-dense)", suggestion:"Natural peanut butter only — no added sugar/oil versions" },
  "Dark Chocolate":     { status:"moderate", score:6, cal:170, reason:"Flavonoids improve heart health BUT still high sugar/fat — 1-2 squares (70%+ cocoa only)", suggestion:"70%+ dark chocolate, max 20g daily" },
  "Roasted Seeds":      { status:"healthy",  score:9, cal:155, reason:"Pumpkin/sunflower/flax seeds = zinc, magnesium, omega-3, plant protein", suggestion:"Already a top snack ✓ Mix varieties for diverse nutrients" },
  "Dates":              { status:"moderate", score:6, cal:70,  reason:"Natural sugar + fibre + iron + potassium. Good for energy but high GI — limit to 2-3/day", suggestion:"Pair with nuts to slow sugar absorption" },
  "Figs":               { status:"healthy",  score:7, cal:30,  reason:"Calcium, fibre, antioxidants; fresh figs are low-cal; dried figs are calorie-dense", suggestion:"Fresh figs preferred; 2-3 dried figs max" },
  "Dried Apricots":     { status:"moderate", score:6, cal:48,  reason:"Iron, vitamin A, fibre but high natural sugar concentration when dried — 3-4 pieces max", suggestion:"Prefer fresh apricots; if dried, choose sulphite-free" },
  "Coconut Bites":      { status:"moderate", score:5, cal:185, reason:"Coconut has healthy MCT fats but very calorie-dense; watch portion sizes", suggestion:"Fresh coconut in small amounts is better than dried/sweetened" },
  // ── Fruits (all remaining) ────────────────────────────────────────────────────
  "Guava":              { status:"healthy",  score:10,cal:68,  reason:"4× more vitamin C than orange, high fibre, low GI (12), antioxidant lycopene", suggestion:"Already a superfruit ✓ Excellent for diabetes management" },
  "Pineapple":          { status:"healthy",  score:7, cal:82,  reason:"Bromelain enzyme aids digestion, vitamin C, manganese, anti-inflammatory", suggestion:"Eat with meals for digestive benefit; avoid if diabetic in large amounts" },
  "Pear":               { status:"healthy",  score:8, cal:102, reason:"High fibre (5.5g), sorbitol aids digestion, copper, vitamin K — underrated fruit", suggestion:"Already a healthy choice ✓ Eat with skin for max fibre" },
  "Kiwi":               { status:"healthy",  score:9, cal:61,  reason:"2× vitamin C of orange, serotonin improves sleep, actinidin aids protein digestion", suggestion:"Already a top choice ✓ Eat 2 kiwis before bed for better sleep" },
  "Chikoo":             { status:"moderate", score:5, cal:83,  reason:"Natural sugars (20g/100g) + some fibre + vitamin C. High GI — limit if diabetic", suggestion:"Small serving only; prefer lower-sugar fruits for weight loss" },
  "Jamun":              { status:"healthy",  score:9, cal:62,  reason:"Lowers blood sugar (jamboline compound), antioxidant anthocyanins, iron, calcium", suggestion:"Already a medicinal superfruit ✓ Especially good for diabetics" },
  "Amla":               { status:"healthy",  score:10,cal:44,  reason:"Highest vitamin C in any fruit (600mg/100g), rejuvenating, powerful anti-inflammatory", suggestion:"Already a superfood ✓ Fresh amla or amla juice daily" },
  "Strawberries":       { status:"healthy",  score:9, cal:32,  reason:"Ellagic acid prevents cancer, very low calorie, high vitamin C, lowers LDL", suggestion:"Already a top choice ✓ Fresh preferred" },
  "Blueberries":        { status:"healthy",  score:10,cal:57,  reason:"ORAC score of 4600 — highest antioxidant among common fruits, brain-protective flavonoids", suggestion:"Already a superfood ✓" },
  "Peach":              { status:"healthy",  score:7, cal:39,  reason:"Beta-carotene, vitamin C, low calorie, potassium — good for skin and immunity", suggestion:"Already a healthy choice ✓" },
  "Cherries":           { status:"healthy",  score:8, cal:50,  reason:"Melatonin improves sleep, anthocyanins reduce gout, anti-inflammatory", suggestion:"Already a top choice ✓" },
  "Raspberries":        { status:"healthy",  score:10,cal:52,  reason:"Highest fibre among berries (8g/cup), ellagic acid, ketones aid fat metabolism", suggestion:"Already a top choice ✓" },
  "Cantaloupe":         { status:"healthy",  score:7, cal:34,  reason:"Very low calorie, high beta-carotene (eye health), 90% water (hydrating)", suggestion:"Already a healthy choice ✓" },
  "Plum":               { status:"healthy",  score:7, cal:30,  reason:"Chlorogenic acid reduces anxiety, sorbitol aids digestion, vitamin K for bone health", suggestion:"Already a healthy choice ✓" },
  // ── USA / UK Foods ───────────────────────────────────────────────────────────
  "Oatmeal":            { status:"healthy",  score:10,cal:150, reason:"Beta-glucan soluble fibre reduces cholesterol, controls blood sugar, keeps full 4+ hours", suggestion:"Already a top breakfast ✓ Add berries and nuts" },
  "Greek Yogurt":       { status:"healthy",  score:9, cal:130, reason:"2× protein of regular yogurt (17g/serving), probiotic, calcium, B12", suggestion:"Plain, unsweetened only — flavoured versions have 15-20g added sugar" },
  "Eggs & Toast":       { status:"healthy",  score:7, cal:250, reason:"Eggs = complete protein; choose whole grain toast for fibre", suggestion:"Whole grain toast + poached/boiled eggs — avoid frying in butter" },
  "Avocado Toast":      { status:"healthy",  score:8, cal:250, reason:"Monounsaturated fats from avocado + whole grain = heart-healthy, high satiety", suggestion:"Whole grain bread; watch portion — avocado is calorie-dense" },
  "Smoothie Bowl":      { status:"healthy",  score:7, cal:300, reason:"Nutrient-dense when made with fruits + seeds; can be high sugar if sweetened", suggestion:"No added sugar; use unsweetened plant milk; add protein powder" },
  "Bagel":              { status:"moderate", score:4, cal:270, reason:"Refined flour, high GI, low fibre — essentially a large dense white roll", suggestion:"Whole grain bagel (thin) with avocado instead of cream cheese" },
  "Cereal":             { status:"moderate", score:3, cal:200, reason:"Most cereals = 10-15g sugar per serving, fortified not whole — very processed", suggestion:"Plain oats or whole grain muesli (no added sugar)" },
  "French Toast":       { status:"moderate", score:4, cal:280, reason:"White bread + egg + butter/oil — high refined carbs and fat", suggestion:"Whole grain bread French toast with no syrup + fresh berries" },
  "Breakfast Burrito":  { status:"moderate", score:5, cal:350, reason:"Can be nutritious (eggs+beans) but often high sodium, refined tortilla, excess cheese", suggestion:"Whole wheat tortilla + egg whites + black beans + salsa" },
  "Sandwich":           { status:"moderate", score:6, cal:350, reason:"Nutrition depends entirely on bread type and fillings; can range from great to poor", suggestion:"Whole grain bread + lean protein + salad filling, no mayo" },
  "Caesar Salad":       { status:"moderate", score:5, cal:300, reason:"Romaine lettuce is healthy but Caesar dressing = high fat/sodium/calorie", suggestion:"Light dressing or olive oil + lemon; add grilled chicken for protein" },
  "Burrito Bowl":       { status:"healthy",  score:7, cal:450, reason:"Beans + rice + vegetables = good macros; avoid sour cream/cheese excess", suggestion:"Brown rice base; extra beans; guac instead of sour cream" },
  "Grilled Chicken Wrap": { status:"healthy", score:8, cal:320, reason:"Lean protein + whole wheat wrap + vegetables = balanced, portable meal", suggestion:"Already a good choice ✓ Use whole wheat wrap" },
  "Tuna Salad":         { status:"healthy",  score:8, cal:200, reason:"Omega-3 rich tuna, high protein, low calorie — watch mayo quantity", suggestion:"Use Greek yogurt instead of mayo for extra protein" },
  "BLT Sandwich":       { status:"moderate", score:4, cal:380, reason:"Bacon is high sodium + saturated fat; white bread adds refined carbs", suggestion:"Turkey or avocado instead of bacon on whole grain bread" },
  "Grilled Salmon":     { status:"healthy",  score:10,cal:230, reason:"Highest EPA/DHA omega-3, complete protein, B12, D, selenium — reduces heart disease 36%", suggestion:"Already a top choice ✓ 2-3 servings per week recommended" },
  "Chicken Breast":     { status:"healthy",  score:9, cal:165, reason:"Leanest protein source, B3, selenium, phosphorus — ideal for weight management", suggestion:"Already a top choice ✓ Grill/bake; avoid frying" },
  "Steak & Veggies":    { status:"moderate", score:5, cal:400, reason:"Lean steak has iron and protein but red meat saturated fat raises LDL — max 1-2×/week", suggestion:"Lean cuts (sirloin); pair with roasted not creamed vegetables" },
  "Tacos":              { status:"moderate", score:5, cal:350, reason:"Can be nutritious but often high sodium corn shells + processed toppings + sour cream", suggestion:"Corn tortilla + grilled fish/chicken + salsa + no sour cream" },
  "Burger":             { status:"unhealthy",score:2, cal:550, reason:"Processed beef + refined bun + cheese + sauce = 550+ kcal, 35g fat, high sodium", suggestion:"Lettuce wrap + lean turkey burger + no sauce, or plant-based burger" },
  "Stir Fry":           { status:"healthy",  score:8, cal:300, reason:"High vegetable content, quick cooking preserves nutrients, lean protein option", suggestion:"Already a healthy choice ✓ Use minimal oil; soy sauce in moderation" },
  "Soup & Salad":       { status:"healthy",  score:9, cal:250, reason:"High water content = low calorie density; salad = fibre; soup = warming satiety", suggestion:"Already a healthy combo ✓ Avoid creamy soups and croutons" },
  "Meatloaf":           { status:"moderate", score:4, cal:350, reason:"Ground beef + breadcrumbs + glaze = high saturated fat and sodium", suggestion:"Turkey or lentil loaf with oat binder — 50% less saturated fat" },
  "Jacket Potato":      { status:"moderate", score:5, cal:290, reason:"Whole baked potato has fibre and potassium but high GI; toppings matter most", suggestion:"Baked sweet potato with cottage cheese topping — lower GI, more nutrients" },
  "Soup":               { status:"healthy",  score:7, cal:150, reason:"Generally low calorie, high satiety, good hydration — depends on sodium/cream content", suggestion:"Avoid cream soups; choose vegetable/broth-based" },
  "Crackers & Cheese":  { status:"moderate", score:4, cal:250, reason:"Refined crackers + cheese = high sodium, saturated fat, low fibre", suggestion:"Rice cakes or whole grain crackers + cottage cheese" },
  "Trail Mix":          { status:"moderate", score:6, cal:170, reason:"Nuts are healthy but dried fruit + chocolate chips add sugar; calorie-dense", suggestion:"Make your own: nuts + seeds only, no chocolate or sweetened fruit" },
  "Granola Bar":        { status:"moderate", score:4, cal:190, reason:"Most are essentially candy bars with oats — 15-20g sugar, preservatives", suggestion:"Whole nut bar or homemade oat+nut balls (no added sugar)" },
  "Hummus & Veggies":   { status:"healthy",  score:9, cal:100, reason:"Chickpea hummus = plant protein + olive oil fats; raw veggies = fibre + micronutrients", suggestion:"Already a top snack ✓" },
  "Apple & PB":         { status:"healthy",  score:8, cal:200, reason:"Fibre from apple + protein/fats from PB = balanced, satiating snack", suggestion:"Natural peanut butter only; 1 tbsp serving" },
  "Popcorn":            { status:"healthy",  score:7, cal:110, reason:"Whole grain, high fibre, very low calorie when air-popped; antioxidant polyphenols", suggestion:"Air-popped with light salt or herbs — avoid butter/caramel" },
  "Rice Cakes":         { status:"moderate", score:5, cal:35,  reason:"Low calorie but very low nutrition — high GI, no fibre, no protein", suggestion:"Top with avocado or nut butter to add healthy fats and protein" },
  "Sunflower Seeds":    { status:"healthy",  score:8, cal:160, reason:"Highest vitamin E content of any food, selenium, magnesium, anti-inflammatory", suggestion:"Already a top choice ✓ 30g unsalted serving" },
  "Cashews":            { status:"healthy",  score:7, cal:160, reason:"Copper (immune + bone health), magnesium, iron — but lower fibre than almonds", suggestion:"18 cashews = 1 serving; roasted unsalted" },
  "Porridge":           { status:"healthy",  score:10,cal:150, reason:"Oat porridge = beta-glucan fibre, slow-release energy, heart-protective", suggestion:"Already a top choice ✓ Add berries, not sugar" },
  "Full English":       { status:"moderate", score:3, cal:600, reason:"Bacon + sausage + beans + toast + eggs = high sodium, saturated fat, calories", suggestion:"Poached eggs + baked beans + grilled tomato + no bacon/sausage" },
  "Toast & Beans":      { status:"moderate", score:6, cal:280, reason:"Baked beans = protein + fibre but canned versions high in sodium and sugar", suggestion:"Whole grain toast + low-sodium baked beans or homemade" },
  "Muesli":             { status:"healthy",  score:8, cal:200, reason:"Oats + dried fruit + nuts = fibre, slow energy, micronutrients — no cooking needed", suggestion:"Choose no-added-sugar muesli; add fresh fruit instead of dried" },
  "Scrambled Eggs":     { status:"healthy",  score:8, cal:220, reason:"High complete protein, choline for brain health, vitamin D", suggestion:"Cook in minimal butter; add vegetables for micronutrients" },
  "Roast Dinner":       { status:"moderate", score:5, cal:600, reason:"Can be nutritious (lean meat + vegetables) but often high in fat from gravy and roasted potatoes", suggestion:"Lean chicken or turkey; boiled not roasted potatoes; vegetable gravy" },
  "Shepherd's Pie":     { status:"moderate", score:5, cal:400, reason:"Lamb + mashed potato = high saturated fat; vegetable content helps nutrition", suggestion:"Lean lamb or lentil filling; sweet potato topping" },
  "Curry":              { status:"healthy",  score:7, cal:300, reason:"Turmeric/spices are powerfully anti-inflammatory; depends on coconut cream vs tomato base", suggestion:"Tomato-based curry over coconut cream; minimal oil" },
  "Stew":               { status:"healthy",  score:7, cal:280, reason:"Slow-cooked vegetables + protein = nutrient-dense, high satiety, low fat option", suggestion:"Already a good choice ✓ Reduce salt and use lean meat" },
  "Crisps":             { status:"unhealthy",score:2, cal:150, reason:"Fried potato = acrylamide (carcinogen when fried), very high sodium, 10g fat per small bag", suggestion:"Roasted peanuts or air-popped popcorn — same crunch, 70% less fat" },
  "Oat Biscuits":       { status:"moderate", score:5, cal:70,  reason:"Oats are good but biscuit form = added sugar, butter, low fibre vs whole oats", suggestion:"Whole oat crackers (no sugar) or just a handful of oats" },
  "Peanut Butter Crackers": { status:"moderate", score:5, cal:200, reason:"Processed crackers reduce nutritional benefit; peanut butter is healthy", suggestion:"Rice cakes or whole grain crackers with natural peanut butter" },
  "Dried Fruit":        { status:"moderate", score:5, cal:85,  reason:"Concentrated natural sugar + fibre + iron, but 3-5× more calories than fresh fruit per weight", suggestion:"Prefer fresh fruit; if dried, max 30g and choose unsulphited" },
  "Protein Bar":        { status:"moderate", score:5, cal:200, reason:"Highly variable — some are nutritious, many are candy bars with protein powder added", suggestion:"Check: < 5g sugar, > 15g protein, whole ingredients list" },
  "Wrap":               { status:"moderate", score:6, cal:300, reason:"Depends on filling and wrap type; whole grain wrap with vegetables can be nutritious", suggestion:"Whole wheat wrap + salad + lean protein + no sauce" },
  "Soup & Bread":       { status:"healthy",  score:7, cal:300, reason:"Vegetable soup = low calorie density + hydration; bread type determines quality", suggestion:"Whole grain bread + broth-based vegetable soup" },
  "Grilled Fish":       { status:"healthy",  score:9, cal:150, reason:"Lean protein, omega-3, zero carbs, B12 — superior to other animal proteins for heart health", suggestion:"Already a top choice ✓" },
  "Salad Bowl":         { status:"healthy",  score:9, cal:200, reason:"High volume, low calorie, maximum micronutrient diversity — ideal for weight loss", suggestion:"Add seeds/nuts for healthy fats; use olive oil dressing" },
  "Blackberries":       { status:"healthy",  score:9, cal:43,  reason:"Anthocyanins reduce heart disease risk by 25%, high vitamin C and K, very low calorie", suggestion:"Already a top choice ✓" },
  "Kippers":            { status:"healthy",  score:8, cal:180, reason:"Smoked herring = omega-3, vitamin D, B12 — excellent brain food despite higher sodium", suggestion:"High omega-3 benefit outweighs sodium; 2× per week ideal" },
  "Pasty":              { status:"unhealthy",score:3, cal:450, reason:"Shortcrust pastry (high saturated fat) + potato/meat filling = very calorie-dense, low fibre", suggestion:"Veggie-filled filo pastry for 60% fewer calories" },
  "Pizza":              { status:"unhealthy",score:2, cal:500, reason:"Refined white dough + processed cheese + cured meat = 500+ kcal, 20g sat fat per 2 slices", suggestion:"Whole wheat thin crust + vegetable toppings + less cheese" },
  "Pretzels":           { status:"moderate", score:4, cal:110, reason:"Low fat but made from refined flour, extremely high sodium (400mg per serving)", suggestion:"Rice cakes or whole grain crackers — same crunch, lower sodium" },
  "Scone":              { status:"moderate", score:3, cal:220, reason:"Refined flour + butter + sugar = high GI, minimal nutritional value, calorie-dense", suggestion:"Oat-based scone with minimal sugar, no clotted cream" },
  "Crumpets":           { status:"moderate", score:4, cal:100, reason:"Refined wheat, high GI, moderate nutrition — better than pastry but not whole grain", suggestion:"Whole grain crumpet or rye crispbread with avocado" },
  "Ploughman's":        { status:"moderate", score:5, cal:500, reason:"Cheese + pickle + bread can work nutritionally but often very high sodium and saturated fat", suggestion:"Smaller cheese portion, whole grain bread, extra salad" },

  // ── Egg preparations ────────────────────────────────────────────────────────
  "Boiled Egg":         { status:"healthy",  score:9,  cal:78,  reason:"Hard/soft boiled = zero added fat, complete protein, vitamin D, B12, choline for brain health", suggestion:"Already the healthiest way to eat eggs ✓" },
  "Fried Egg":          { status:"moderate", score:6,  cal:90,  reason:"Pan-fried in butter/oil adds 30-40 kcal and saturated fat vs boiled", suggestion:"Use minimal olive oil or non-stick pan; poached or boiled is healthier" },
  "Scrambled Eggs":     { status:"healthy",  score:8,  cal:90,  reason:"High complete protein, B12, vitamin D; avoid excess butter", suggestion:"Cook with minimal butter or olive oil spray" },
  "Poached Egg":        { status:"healthy",  score:9,  cal:72,  reason:"Zero added fat, highest nutrient retention of any cooking method", suggestion:"Already the healthiest egg prep ✓" },
  "Egg White":          { status:"healthy",  score:8,  cal:17,  reason:"Pure protein (4g each), zero fat, zero cholesterol", suggestion:"Good for weight loss; include 1 whole egg for fat-soluble vitamins" },
  "Egg Omelette":       { status:"healthy",  score:7,  cal:100, reason:"Good protein with vegetables; fat depends on oil used", suggestion:"Use minimal oil; add veggies (spinach, tomato, onion) for micronutrients" },
  "Boiled Eggs":        { status:"healthy",  score:9,  cal:78,  reason:"Hard/soft boiled = zero added fat, complete protein, B12, choline", suggestion:"Already the healthiest way to eat eggs ✓" },
  // ── Rice preparations ────────────────────────────────────────────────────────
  "Fried Rice":         { status:"moderate", score:4,  cal:200, reason:"Refined white rice + oil + soy sauce = high GI, high sodium, moderate nutrition", suggestion:"Brown rice stir-fry with less oil and more vegetables" },
  "Veg Fried Rice":     { status:"moderate", score:5,  cal:180, reason:"Better than non-veg fried rice but still high oil and white rice", suggestion:"Use brown rice, minimal oil, extra veggies for a healthier version" },
  "Chicken Fried Rice": { status:"moderate", score:5,  cal:220, reason:"High protein from chicken but fried rice = high GI, sodium, oil", suggestion:"Grilled chicken + brown rice bowl is a much healthier alternative" },
  "Steamed Rice":       { status:"moderate", score:6,  cal:130, reason:"Plain steamed white rice — better than fried but high GI (72)", suggestion:"Use brown rice or mix with dal for lower GI and complete protein" },
  "Jeera Rice":         { status:"moderate", score:6,  cal:150, reason:"White rice with cumin; cumin aids digestion but base is high GI", suggestion:"Brown jeera rice or millets jeera for better fibre" },
  "Peas Pulao":         { status:"moderate", score:6,  cal:170, reason:"White rice + peas = some protein, but still high GI base", suggestion:"Brown rice pulao with more mixed vegetables" },
  // ── Potato preparations ──────────────────────────────────────────────────────
  "Boiled Potato":      { status:"moderate", score:6,  cal:77,  reason:"Moderate GI (78) when boiled; good potassium and B6, but low fibre", suggestion:"Cool after boiling to form resistant starch (lowers GI to ~50)" },
  "Sweet Potato":       { status:"healthy",  score:9,  cal:86,  reason:"Low GI (44), extremely high beta-carotene, high fibre, vitamin C", suggestion:"Already an excellent choice ✓ Bake or steam, don't fry" },
  "Baked Potato":       { status:"moderate", score:6,  cal:130, reason:"Baking keeps nutrients; high GI when eaten hot, lower GI cold", suggestion:"Eat with skin for fibre; top with cottage cheese not butter/sour cream" },
  "Mashed Potato":      { status:"moderate", score:4,  cal:180, reason:"Butter + cream + white potato = high GI, high saturated fat", suggestion:"Mashed sweet potato with olive oil — same comfort, much more nutrition" },
  "Roasted Potato":     { status:"moderate", score:5,  cal:150, reason:"Oil absorption during roasting adds fat; high GI potato base", suggestion:"Air-roast with minimal oil; sweet potato is healthier alternative" },
  // ── Chicken preparations ─────────────────────────────────────────────────────
  "Boiled Chicken":     { status:"healthy",  score:9,  cal:150, reason:"Zero added fat, maximum lean protein retention, very low calorie", suggestion:"Already the leanest chicken prep ✓ Season with herbs, not cream sauces" },
  "Grilled Chicken":    { status:"healthy",  score:9,  cal:165, reason:"Minimal fat, high protein, Maillard reaction creates flavour without deep frying", suggestion:"Already a top choice ✓" },
  "Baked Chicken":      { status:"healthy",  score:8,  cal:165, reason:"Low fat, high protein, retains moisture better than grilling", suggestion:"Already a healthy choice ✓ Avoid cream or butter-based marinades" },
  "Chicken Tikka":      { status:"healthy",  score:8,  cal:160, reason:"Yogurt-marinated grilled chicken = high protein, probiotic benefits", suggestion:"Already a healthy choice ✓ Skip the butter drizzle at end" },
  "Fried Chicken":      { status:"unhealthy",score:2,  cal:320, reason:"Battered + deep fried = 15-20g trans/saturated fat, high calories, acrylamide", suggestion:"Grilled or baked chicken — 50% fewer calories, zero trans fat" },
  "Chicken Curry":      { status:"moderate", score:6,  cal:200, reason:"Good protein from chicken but curry sauce oil adds significant fat/calories", suggestion:"Tomato-based curry with minimal oil; avoid cream-heavy restaurant versions" },
  // ── Paneer preparations ──────────────────────────────────────────────────────
  "Grilled Paneer":     { status:"healthy",  score:7,  cal:200, reason:"High protein + calcium, grilling avoids extra oil of frying", suggestion:"Already a good choice ✓ Use low-fat paneer for weight management" },
  "Paneer Tikka":       { status:"healthy",  score:7,  cal:220, reason:"Marinated and grilled — good protein, calcium, spices are anti-inflammatory", suggestion:"Already a healthy snack/meal ✓ Minimal butter finish" },
  "Paneer Bhurji":      { status:"moderate", score:6,  cal:250, reason:"High protein but preparation uses significant oil and cream in many recipes", suggestion:"Minimal oil, no cream version is much healthier" },
  // ── Fish preparations ────────────────────────────────────────────────────────
  "Grilled Fish":       { status:"healthy",  score:9,  cal:150, reason:"Best omega-3 retention with zero added fat — superior heart health food", suggestion:"Already a top choice ✓" },
  "Steamed Fish":       { status:"healthy",  score:10, cal:120, reason:"Maximum nutrient retention, zero added fat, highest omega-3 bioavailability", suggestion:"Already the best fish preparation ✓" },
  "Fried Fish":         { status:"moderate", score:4,  cal:280, reason:"Deep frying destroys omega-3s and adds 15-20g fat; fried batter has zero nutrition", suggestion:"Grilled or baked fish — keeps omega-3 intact, 40% fewer calories" },
  // ── Salad variations ─────────────────────────────────────────────────────────
  "Fruit Salad":        { status:"healthy",  score:9,  cal:60,  reason:"Mixed fruits = diverse vitamins, antioxidants, fibre with very low calorie density", suggestion:"No added sugar or cream; natural sweetness is enough ✓" },
  "Green Salad":        { status:"healthy",  score:10, cal:30,  reason:"Leafy greens = folate, iron, vitamin K, lowest calorie density of any food", suggestion:"Already perfect ✓ Use olive oil + lemon dressing" },
  "Vegetable Salad":    { status:"healthy",  score:9,  cal:50,  reason:"Raw vegetables maximise enzyme activity, fibre, and micronutrients", suggestion:"Add seeds/nuts for healthy fats and protein ✓" },
  "Chicken Salad":      { status:"healthy",  score:8,  cal:180, reason:"Lean protein + vegetables = excellent weight loss meal", suggestion:"Use yogurt dressing instead of mayo; add seeds for omega-3" },
  // ── Other common items ───────────────────────────────────────────────────────
  "Oat Porridge":       { status:"healthy",  score:10, cal:150, reason:"Rolled oats = beta-glucan fibre, slow energy, reduces cholesterol", suggestion:"Already a top breakfast ✓ Add berries and nuts, no sugar" },
  "Fruit Smoothie":     { status:"moderate", score:6,  cal:200, reason:"Blending destroys some fibre; better than juice but less filling than whole fruit", suggestion:"Add protein powder or Greek yogurt; no added sugar or honey" },
  "Protein Shake":      { status:"moderate", score:6,  cal:120, reason:"Convenient protein source but processed; quality varies widely by brand", suggestion:"Whole food protein (eggs, dal, chicken) is superior; use shake only post-workout" },
  "Vegetable Soup":     { status:"healthy",  score:9,  cal:80,  reason:"High volume, low calorie, hydrating, vitamin-rich — excellent for weight management", suggestion:"Already excellent ✓ Low sodium broth base" },
  "Chicken Soup":       { status:"healthy",  score:8,  cal:100, reason:"Anti-inflammatory properties, high protein, electrolytes — great for recovery", suggestion:"Already a healthy choice ✓ Avoid cream" },
  "Tomato Soup":        { status:"healthy",  score:7,  cal:90,  reason:"Lycopene (antioxidant) is better absorbed cooked; good vitamins C and K", suggestion:"Avoid cream versions; tomato-broth base is healthier" },
  "Corn Flakes":        { status:"unhealthy",score:2,  cal:200, reason:"Ultra-processed, very high GI (84), 8-12g sugar, fortified not whole grain", suggestion:"Plain oats or whole grain muesli with no added sugar" },
  "Peanut Butter Toast":{ status:"healthy",  score:7,  cal:280, reason:"Protein + healthy fats + complex carbs — good balanced breakfast", suggestion:"Whole grain toast + natural peanut butter (no sugar added)" },
  "Avocado Toast":      { status:"healthy",  score:8,  cal:250, reason:"Monounsaturated fats, fibre, potassium — heart-healthy and filling", suggestion:"Whole grain bread; watch avocado portion (calorie-dense)" },
  "Granola":            { status:"moderate", score:4,  cal:180, reason:"Oats are healthy but granola has added honey/sugar/oil — calorie-dense", suggestion:"Plain oats with berries — same nutrition, much less sugar" },
  "Cheese Toast":       { status:"moderate", score:4,  cal:250, reason:"Processed cheese + white bread = high sodium, saturated fat, low nutrition", suggestion:"Cottage cheese on whole grain toast — same satisfaction, more protein" },
  "Veg Sandwich":       { status:"healthy",  score:7,  cal:280, reason:"Vegetables + whole grain bread = good fibre, vitamins, complex carbs", suggestion:"Whole grain bread + hummus + raw vegetables for maximum nutrition" },
  "Club Sandwich":      { status:"moderate", score:4,  cal:450, reason:"Mayonnaise + processed meat + white bread = high fat, sodium, refined carbs", suggestion:"Whole grain + grilled chicken + mustard instead of mayo" },
  "Chaat":              { status:"moderate", score:5,  cal:200, reason:"Depends on ingredients; chutneys add sugar/salt, fried puri adds fat", suggestion:"Sprouts chaat without fried items is a much healthier version" },
  "Sprouts Chaat":      { status:"healthy",  score:9,  cal:100, reason:"Sprouted legumes = tripled vitamin C, high protein, fibre, probiotic activity", suggestion:"Already a superfood snack ✓" },
  "Idli Sambar":        { status:"healthy",  score:9,  cal:200, reason:"Fermented idli (probiotic) + protein-rich sambar = complete, low-fat meal", suggestion:"Already one of the healthiest Indian meals ✓" },
  "Masala Dosa":        { status:"moderate", score:5,  cal:300, reason:"Good fermented batter but potato filling + excess oil makes it calorie-dense", suggestion:"Plain dosa with sambar instead of masala dosa — 30% fewer calories" },
  "Pav Bhaji":          { status:"unhealthy",score:2,  cal:450, reason:"Refined white pav + butter-laden bhaji = very high saturated fat, refined carbs", suggestion:"Multigrain pav with minimal butter + more vegetables in bhaji" },
  "Pasta Salad":        { status:"moderate", score:5,  cal:280, reason:"Pasta (high GI) + dressing can add significant fat; vegetable content varies", suggestion:"Whole grain pasta + olive oil + plenty of vegetables and lean protein" },
  "Sandwich":           { status:"moderate", score:6,  cal:350, reason:"Nutrition depends entirely on bread type and fillings", suggestion:"Whole grain bread + lean protein + lots of vegetables, no mayo" },
  "Wrap":               { status:"moderate", score:6,  cal:300, reason:"Nutritious if whole wheat wrap with lean filling", suggestion:"Whole wheat wrap + grilled chicken/paneer + salad filling" },
};

// Macros (protein_g / carbs_g / fat_g per typical serving) for common foods
const MACRO_DB = {
  "White Rice":       { p:3,  c:28, f:0  }, "Brown Rice":     { p:3,  c:23, f:1  },
  "Oats":             { p:5,  c:27, f:3  }, "Idli":           { p:2,  c:8,  f:0  },
  "Dosa":             { p:3,  c:20, f:2  }, "Roti":           { p:3,  c:15, f:1  },
  "Multigrain Roti":  { p:4,  c:14, f:1  }, "Paratha":        { p:4,  c:25, f:8  },
  "Dal":              { p:9,  c:20, f:1  }, "Paneer":         { p:11, c:2,  f:20 },
  "Eggs":             { p:6,  c:1,  f:5  }, "Boiled Egg":     { p:6,  c:1,  f:5  },
  "Egg White":        { p:4,  c:0,  f:0  }, "Chicken":        { p:31, c:0,  f:4  },
  "Grilled Chicken":  { p:31, c:0,  f:4  }, "Chicken Breast": { p:31, c:0,  f:4  },
  "Fish":             { p:26, c:0,  f:5  }, "Grilled Fish":   { p:26, c:0,  f:5  },
  "Grilled Salmon":   { p:25, c:0,  f:14 }, "Tuna Salad":     { p:20, c:4,  f:8  },
  "Rajma":            { p:9,  c:20, f:1  }, "Chole":          { p:9,  c:19, f:2  },
  "Tofu":             { p:8,  c:2,  f:4  }, "Soya Chunks":    { p:52, c:33, f:0  },
  "Milk":             { p:8,  c:12, f:5  }, "Curd / Yogurt":  { p:11, c:4,  f:5  },
  "Greek Yogurt":     { p:17, c:6,  f:0  }, "Khichdi":        { p:8,  c:35, f:3  },
  "Salad":            { p:2,  c:4,  f:0  }, "Green Salad":    { p:2,  c:4,  f:0  },
  "Sprouts":          { p:4,  c:5,  f:0  }, "Banana":         { p:1,  c:27, f:0  },
  "Apple":            { p:0,  c:25, f:0  }, "Mango":          { p:1,  c:25, f:0  },
  "Almonds":          { p:6,  c:6,  f:14 }, "Nuts (Mixed)":   { p:5,  c:8,  f:14 },
  "Peanut Butter":    { p:8,  c:6,  f:16 }, "Walnuts":        { p:4,  c:4,  f:18 },
  "Oatmeal":          { p:5,  c:27, f:3  }, "Pasta":          { p:8,  c:43, f:1  },
  "Sandwich":         { p:15, c:45, f:8  }, "Burger":         { p:25, c:40, f:30 },
  "Pizza":            { p:12, c:60, f:18 }, "Biryani":        { p:12, c:55, f:12 },
  "Poha":             { p:3,  c:25, f:2  }, "Upma":           { p:4,  c:32, f:5  },
  "Dal Rice":         { p:12, c:55, f:2  }, "Roti Sabzi":     { p:8,  c:40, f:5  },
  "Egg Bhurji Roti":  { p:18, c:32, f:12 }, "Scrambled Eggs": { p:14, c:1,  f:15 },
  "Paneer Curry":     { p:14, c:10, f:18 }, "Dal Makhani":    { p:10, c:28, f:12 },
  "Sweet Potato":     { p:2,  c:20, f:0  }, "Avocado Toast":  { p:6,  c:28, f:14 },
};
function getFoodMacros(foodName) {
  if (!foodName) return null;
  if (MACRO_DB[foodName]) return MACRO_DB[foodName];
  const lower = foodName.toLowerCase();
  const key = Object.keys(MACRO_DB).find(k => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower));
  if (key) return MACRO_DB[key];
  const h = FOOD_HEALTH_DB[foodName] || Object.values(FOOD_HEALTH_DB)[0];
  const cal = h?.cal || 150;
  return { p: Math.round(cal * 0.15 / 4), c: Math.round(cal * 0.55 / 4), f: Math.round(cal * 0.30 / 9) };
}

// Analyse a food item from the database
function getFoodHealth(foodName) {
  if (!foodName) return { status:"moderate", score:5, cal:null, reason:"Unknown food", suggestion:"Choose whole, unprocessed foods" };
  // 1. Direct exact match
  if (FOOD_HEALTH_DB[foodName]) return FOOD_HEALTH_DB[foodName];
  const lower = foodName.toLowerCase().trim();
  // 2. Case-insensitive exact match
  const exactKey = Object.keys(FOOD_HEALTH_DB).find(k => k.toLowerCase() === lower);
  if (exactKey) return FOOD_HEALTH_DB[exactKey];
  // 3. DB key is contained in food name (e.g. "Dal Rice" contains "Dal")
  const containsKey = Object.keys(FOOD_HEALTH_DB).find(k => lower.includes(k.toLowerCase()));
  if (containsKey) return FOOD_HEALTH_DB[containsKey];
  // 4. Food name is contained in DB key
  const inKey = Object.keys(FOOD_HEALTH_DB).find(k => k.toLowerCase().includes(lower));
  if (inKey) return FOOD_HEALTH_DB[inKey];
  // 5. Word-level overlap match (at least one significant word matches)
  const stopWords = new Set(["and","with","&","the","a","of","in","on","at","for","or","to","by"]);
  const foodWords = lower.split(/[\s\/&+,]+/).filter(w => w.length > 2 && !stopWords.has(w));
  let bestKey = null, bestScore = 0;
  for (const k of Object.keys(FOOD_HEALTH_DB)) {
    const kWords = k.toLowerCase().split(/[\s\/&+,]+/).filter(w => w.length > 2 && !stopWords.has(w));
    const overlap = foodWords.filter(w => kWords.some(kw => kw.includes(w) || w.includes(kw))).length;
    const score = overlap / Math.max(foodWords.length, 1);
    if (score > bestScore && score >= 0.4) { bestScore = score; bestKey = k; }
  }
  if (bestKey) return FOOD_HEALTH_DB[bestKey];
  // 6. Keyword-based classification for truly unknown foods
  return classifyUnknownFood(lower);
}

function classifyUnknownFood(lower) {
  // Unhealthy signals
  if (/deep.fri|pakora|bhajia|vada pav|bhature|chips|crisp|cookie|cake|pastry|donut|candy|soda|cola|jalebi|gulab jamun|ladoo|mithai|halwa|biscuit|maida/.test(lower))
    return { status:"unhealthy", score:2, cal:null, reason:"Contains deep-frying, refined flour, or high sugar — nutritionally poor foods", suggestion:"Choose baked, grilled, or whole-grain version" };
  // Fried (without deep) — moderate
  if (/^fried |fried rice| fried /.test(lower))
    return { status:"moderate", score:4, cal:null, reason:"Pan-frying adds oil and reduces some nutrients; nutrition depends on base ingredient", suggestion:"Try grilled, baked, or air-fried version for healthier option" };
  // Healthy cooking methods
  if (/^boiled |^steamed |^grilled |^baked |^poached |^roasted /.test(lower))
    return { status:"healthy", score:8, cal:null, reason:"Healthy cooking method preserves nutrients without adding excess fat", suggestion:"Already a healthy preparation ✓" };
  // Healthy ingredients
  if (/salad|sprout|oat|dal|lentil|legume|quinoa|millet|ragi|jowar|bajra|soup|sabzi|stir.fry|green|leafy|broccoli|spinach|palak|tofu|curd|yogurt|fruit|berry|seed|fish|salmon|tuna/.test(lower))
    return { status:"healthy", score:7, cal:null, reason:"Contains whole, minimally processed ingredients with good nutritional profile", suggestion:"Already a healthy choice ✓" };
  // Moderate default
  return { status:"moderate", score:5, cal:null, reason:"Moderately nutritious — quality depends on preparation method and portion size", suggestion:"Choose minimal oil, less salt, whole-grain versions where possible" };
}

// ── Medical condition dietary & workout adjustments ────────────────────────
const MEDICAL_FOOD_ADJUSTMENTS = {
  "Diabetes": {
    avoid: ["White Rice", "Sugary Drinks", "White Bread", "Sweets", "Fruit Juice", "Potatoes"],
    prefer: ["Whole Grains", "Leafy Greens", "Eggs", "Legumes", "Nuts", "Berries", "Oats"],
    note: "Low GI foods only. Consistent meal timing. Monitor carbs per meal.",
  },
  "Hypertension": {
    avoid: ["Salt", "Processed Meats", "Canned Soups", "Pickles", "Fried Foods", "Alcohol"],
    prefer: ["Bananas", "Leafy Greens", "Beets", "Oats", "Omega-3 Fish", "Garlic"],
    note: "DASH diet. Limit sodium < 1500 mg/day. Avoid high-sodium condiments.",
  },
  "Thyroid disorder": {
    avoid: ["Raw Cruciferous Veg in excess", "Soy", "Processed Foods"],
    prefer: ["Selenium-rich foods", "Brazil Nuts", "Fish", "Eggs", "Berries"],
    note: "Take thyroid meds on empty stomach. Consistent iodine intake.",
  },
  "PCOD / PCOS": {
    avoid: ["Refined Carbs", "Sugar", "Processed Foods", "Excess Dairy", "Alcohol"],
    prefer: ["Omega-3 Foods", "Fiber-rich Foods", "Leafy Greens", "Berries", "Legumes"],
    note: "Low GI diet manages insulin resistance. Anti-inflammatory focus.",
  },
  "Heart condition": {
    avoid: ["Saturated Fats", "Trans Fats", "Fried Foods", "Red Meat", "Alcohol", "Salt"],
    prefer: ["Oats", "Salmon", "Walnuts", "Olive Oil", "Berries", "Avocado", "Flaxseed"],
    note: "Mediterranean diet. No high-intensity workouts without doctor clearance.",
  },
};

const MEDICAL_WORKOUT_RESTRICTIONS = {
  "Diabetes": {
    avoidExercises: [],
    warning: "Monitor blood sugar before/after exercise. Carry fast sugar. Avoid fasted high-intensity.",
    intensityLimit: null,
  },
  "Hypertension": {
    avoidExercises: ["Barbell Squat 5×5", "Deadlift 5×5", "Heavy Deadlift 5×5", "Overhead Press 5×5"],
    warning: "Avoid heavy isometric straining. Keep HR moderate (< 75% max). No breath-holding.",
    intensityLimit: "Moderate",
  },
  "Heart condition": {
    avoidExercises: ["Deadlift 5×5", "Barbell Squat 5×5", "Sprint Intervals", "10×100m all-out sprints", "Jump Squat 3×15", "10×200m sprints"],
    warning: "MUST consult cardiologist before starting. Keep HR moderate. No high-intensity heavy lifts.",
    intensityLimit: "Beginner",
  },
  "PCOD / PCOS": {
    avoidExercises: [],
    warning: "Regular moderate exercise is highly beneficial. Avoid over-training. Yoga & strength training recommended.",
    intensityLimit: null,
  },
  "Thyroid disorder": {
    avoidExercises: [],
    warning: "Hypothyroid: start slow, build gradually. Hyperthyroid: avoid high-intensity until levels stabilise.",
    intensityLimit: null,
  },
};

function filterExercisesForMedical(exercises, conditions) {
  const avoidList = (conditions || []).flatMap(c => (MEDICAL_WORKOUT_RESTRICTIONS[c]?.avoidExercises || []));
  if (!avoidList.length) return exercises;
  return exercises.filter(ex =>
    !avoidList.some(avoid => ex.toLowerCase().includes(avoid.toLowerCase().split(" ")[0]))
  );
}

function getMedicalWorkoutWarnings(conditions) {
  return (conditions || [])
    .filter(c => MEDICAL_WORKOUT_RESTRICTIONS[c])
    .map(c => ({ condition: c, warning: MEDICAL_WORKOUT_RESTRICTIONS[c].warning }));
}

function getMedicalIntensityLimit(conditions) {
  const limits = (conditions || []).map(c => MEDICAL_WORKOUT_RESTRICTIONS[c]?.intensityLimit).filter(Boolean);
  if (limits.includes("Beginner")) return "Beginner";
  if (limits.includes("Moderate")) return "Moderate";
  return null;
}

// Calculation functions
// ── Body composition formulas (all clinically validated) ──────────────────────
// BMI: standard WHO formula
function calcBMI(w, h) { return +(w / ((h / 100) ** 2)).toFixed(1); }

// Body Fat %: Deurenberg et al. 1991 — BMI-based, widely used in apps
// Note: may overestimate by ~3% in overweight individuals
function calcBodyFat(bmi, age, gender) {
  return +(1.20 * bmi + 0.23 * age - 10.8 * (gender === "Male" ? 1 : 0) - 5.4).toFixed(1);
}

// BMR: Mifflin-St Jeor 1990 — most accurate for non-athletes
// Male: 10W + 6.25H - 5A + 5  |  Female: 10W + 6.25H - 5A - 161
function calcBMR(w, h, age, gender) {
  return gender === "Male"
    ? +(10 * w + 6.25 * h - 5 * age + 5).toFixed(0)
    : +(10 * w + 6.25 * h - 5 * age - 161).toFixed(0);
}

// Skeletal Muscle Mass: Janssen et al. 2000 — 45% of LBM
// LBM = weight × (1 - BF%), skeletal muscle ≈ 45% of LBM
function calcSkeletalMuscle(w, bf) { return +(w * (1 - bf / 100) * 0.45).toFixed(1); }

// Muscle Mass (total): Janssen et al. 2000 — 50% of LBM
// FIXED: was 0.85×LBM which is physiologically impossible (would be ~60% body weight)
// Skeletal muscle ≈ 50% of LBM, total contractile tissue ≈ 50%
function calcMuscleMass(w, bf) { return +(w * (1 - bf / 100) * 0.50).toFixed(1); }

// Fat-Free Mass (LBM): total weight minus fat mass
function calcFatFree(w, bf) { return +(w * (1 - bf / 100)).toFixed(1); }

// Subcutaneous Fat: ~80% of total fat mass is subcutaneous (vs ~20% visceral)
function calcSubFat(w, bf) { return +(w * bf / 100 * 0.80).toFixed(1); }

// Visceral Fat Score (1–15 scale, clinically calibrated proxy):
// Formula: 1 + excess_body_fat × 0.35 + age_factor × 0.12
// Excess fat = max(0, BF% - healthy threshold)  →  Male: 20%, Female: 30%
// Age factor = max(0, age - 20)
// Based on Gallagher (2000) BF%-visceral fat correlation + Bergman (2011) age factor
// Gives realistic values: lean young = 1-2, healthy = 2-4, overweight = 5-8, obese = 9-15
function calcVisceralFat(w, bf, age, gender) {
  const threshold = gender === "Female" ? 30 : 20;
  const excessFat = Math.max(0, bf - threshold);
  const ageFactor = Math.max(0, age - 20) * 0.12;
  const score = 1 + excessFat * 0.35 + ageFactor;
  return +(Math.min(15, Math.max(1, score)).toFixed(1));
}

// Total Body Water: Watson et al. 1980 gold-standard formula
// Male: TBW = 2.447 - 0.09156×age + 0.1074×height_cm + 0.3362×weight_kg
// Female: TBW = -2.097 + 0.1069×height_cm + 0.2466×weight_kg
function calcBodyWater(w, bf, gender, age, h) {
  if (gender === "Male") {
    return +(2.447 - 0.09156 * (age || 30) + 0.1074 * (h || 170) + 0.3362 * w).toFixed(1);
  } else {
    return +(-2.097 + 0.1069 * (h || 160) + 0.2466 * w).toFixed(1);
  }
}

// Bone Mass: Heymsfield et al. — approximately 5.8% of LBM
// More accurate than flat % of body weight
function calcBoneMass(w, gender, bf) {
  const lbm = w * (1 - (bf || 20) / 100);
  return +(lbm * 0.058).toFixed(1);
}

// Protein requirement: ISSN 2017 — 1.6 g/kg body weight for general health/fitness
// Range: 1.2 (sedentary) to 2.2 (athletic) g/kg
function calcProtein(w) { return +(w * 1.6).toFixed(1); }

// Muscle glycogen storage: approximately 2.5% of muscle mass (15–20g glycogen/100g muscle)
function calcMuscleStorage(mm) { return +(mm * 0.025).toFixed(1); }
// Metabolic Age uses BMR comparison + body fat % penalty + visceral fat adjustment
// Reference BMR uses same height/weight as user so comparison is fair, varying only age
function calcMetabolicAge(bmr, age, gender, weight, height, bodyFat, visceralFat) {
  // Reference BMR for this user's own body at each age (only age changes)
  const refBMR = (a) => gender === "Male"
    ? 10 * weight + 6.25 * height - 5 * a + 5
    : 10 * weight + 6.25 * height - 5 * a - 161;

  // Find the age whose reference BMR is closest to actual BMR
  let baseMeta = age;
  let minD = Infinity;
  for (let a = 10; a <= 90; a++) {
    const d = Math.abs(bmr - refBMR(a));
    if (d < minD) { minD = d; baseMeta = a; }
  }

  // Body fat penalty: each 5% above healthy range adds ~1.5 years
  const healthyBF = gender === "Male" ? 18 : 25;
  const bfPenalty = bodyFat > healthyBF ? Math.round((bodyFat - healthyBF) / 5 * 1.5) : 0;

  // Visceral fat penalty: above 9 adds years
  const vfPenalty = visceralFat > 9 ? Math.round((visceralFat - 9) * 0.8) : 0;

  return Math.max(10, Math.min(90, baseMeta + bfPenalty + vfPenalty));
}

function computeAllMetrics({ weight: w, height: h, age, gender }) {
  const bmi = calcBMI(w, h);
  const bf  = calcBodyFat(bmi, age, gender);
  const bmr = calcBMR(w, h, age, gender);
  const mm  = calcMuscleMass(w, bf);
  return {
    bmi,
    bodyFat:        bf,
    bmr,
    skeletalMuscle: calcSkeletalMuscle(w, bf),
    muscleMass:     mm,
    fatFree:        calcFatFree(w, bf),
    subcutaneous:   calcSubFat(w, bf),
    visceral:       calcVisceralFat(w, bf, age),
    bodyWater:      calcBodyWater(w, bf, gender, age, h),
    boneMass:       calcBoneMass(w, gender, bf),
    metabolicAge:   calcMetabolicAge(bmr, age, gender, w, h, bf, calcVisceralFat(w, bf, age)),
    protein:        calcProtein(w),
    muscleStorage:  calcMuscleStorage(mm),
  };
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: "Underweight", color: COLORS.accent2 };
  if (bmi < 25) return { label: "Normal", color: COLORS.success };
  if (bmi < 30) return { label: "Overweight", color: COLORS.accent3 };
  return { label: "Obese", color: COLORS.warn };
}
function healthScore(metrics) {
  let s = 100;
  if (metrics.bmi > 30) s -= 20; else if (metrics.bmi > 25) s -= 10;
  if (metrics.bodyFat > 30) s -= 15; else if (metrics.bodyFat > 25) s -= 8;
  if (metrics.visceral > 10) s -= 10;
  return Math.max(30, Math.min(100, s));
}

// Smart meal timing engine
function calcSmartTimes(schedule) {
  const find = (keywords) => schedule.find(s => keywords.some(k => s.label.toLowerCase().includes(k)));
  const toMin = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const toTime = (mins) => { const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60); const m = ((mins % 1440) + 1440) % 1440 % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; };

  const wakeSlot = find(["wake", "morning"]);
  const officeSlot = find(["office", "work", "college", "school"]);
  const gymSlot = find(["gym", "workout", "exercise", "yoga"]);
  const sleepSlot = find(["sleep", "bed"]);
  const lunchBreak = find(["lunch break", "lunch"]);
  const eveningSlot = find(["evening", "snack", "break"]);

  const wakeMin = toMin(wakeSlot?.time) ?? 360;    // default 6am
  const officeMin = toMin(officeSlot?.time) ?? 540; // default 9am
  const sleepMin = toMin(sleepSlot?.time) ?? 1380;  // default 11pm
  const gymMin = toMin(gymSlot?.time);

  // Smart breakfast: 30–45 min after wake, before office if possible
  let breakfastMin = wakeMin + 40;
  if (gymMin && gymMin < officeMin) breakfastMin = gymMin + 30; // post-gym breakfast

  // Lunch: lunchbreak slot or ~4–5 hrs after breakfast
  let lunchMin = toMin(lunchBreak?.time) ?? breakfastMin + 270;

  // Evening snack: 2.5–3 hrs after lunch
  let snackMin = toMin(eveningSlot?.time) ?? lunchMin + 165;

  // Dinner: 2 hrs before sleep, min 7pm
  let dinnerMin = Math.max(1140, sleepMin - 120);

  // Pre-workout if gym
  let preWorkout = gymMin ? toTime(gymMin - 30) : null;
  let postWorkout = gymMin ? toTime(gymMin + 60) : null;

  // Water: wake, before each meal -20min, mid-morning, mid-afternoon, before sleep
  const waterTimes = [
    { time: toTime(wakeMin), note: "1 glass warm water (wake up)" },
    { time: toTime(breakfastMin - 20), note: "1 glass water before breakfast" },
    { time: toTime(breakfastMin + 90), note: "1 glass water (mid-morning)" },
    { time: toTime(lunchMin - 20), note: "1 glass water before lunch" },
    { time: toTime(lunchMin + 90), note: "1 glass water (mid-afternoon)" },
    { time: toTime(snackMin - 15), note: "1 glass water before snack" },
    { time: toTime(dinnerMin - 30), note: "1 glass water before dinner" },
    { time: toTime(sleepMin - 30), note: "½ glass water before sleep" },
  ];

  return {
    breakfast: toTime(breakfastMin),
    lunch: toTime(lunchMin),
    eveningSnack: toTime(snackMin),
    dinner: toTime(dinnerMin),
    preWorkout,
    postWorkout,
    waterTimes,
    sleepTime: sleepSlot?.time ?? toTime(sleepMin),
    wakeTime: wakeSlot?.time ?? toTime(wakeMin),
  };
}

// Daily water intake based on weight + activity
function calcDailyWater(weight, fitnessLevel) {
  const base = weight * 0.033;
  const extra = fitnessLevel === "Active" ? 0.75 : fitnessLevel === "Moderate" ? 0.5 : 0.25;
  return (base + extra).toFixed(1);
}




// ── Motivational quotes ───────────────────────────────────────────────────────
const MOTIVATIONAL_QUOTES = [
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Health is not about the weight you lose, but the life you gain.", author: "Anonymous" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "You don't have to be extreme, just consistent.", author: "Anonymous" },
  { text: "Every step forward is a step toward achieving something bigger.", author: "Brian Tracy" },
  { text: "Your only limit is your mind.", author: "Anonymous" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't wish for a good body. Work for it.", author: "Anonymous" },
];

function getTodayQuote() {
  const day = new Date().getDay();
  return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
}

// ── Streak calculator ─────────────────────────────────────────────────────────
function calcStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  let prev = new Date();
  prev.setHours(0, 0, 0, 0);
  for (const log of sorted) {
    const d = new Date(log.date);
    d.setHours(0, 0, 0, 0);
    const diff = (prev - d) / (1000 * 60 * 60 * 24);
    if (diff <= 1) { streak++; prev = d; }
    else break;
  }
  return streak;
}

// ── BMI Gauge SVG ─────────────────────────────────────────────────────────────

// ── BMIGauge ──
function BMIGauge({ bmi, color, label }) {
  // Semi-circle gauge: angles go from 200° to 340° (bottom-left to bottom-right via top)
  const min = 15, max = 40;
  const pct = Math.min(1, Math.max(0, (bmi - min) / (max - min)));
  // 200° start, 340° end = 140° sweep
  const startDeg = 200, endDeg = 340, sweep = endDeg - startDeg;
  const needleDeg = startDeg + pct * sweep;
  const cx = 60, cy = 58, r = 44;
  const toXY = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  // 4 colour zones across the arc
  const zones = [
    { from: startDeg, to: startDeg + sweep * 0.25, color:"#4f8ef7" },  // Underweight
    { from: startDeg + sweep * 0.25, to: startDeg + sweep * 0.5, color:"#00d4aa" }, // Normal
    { from: startDeg + sweep * 0.5, to: startDeg + sweep * 0.75, color:"#f7934f" }, // Overweight
    { from: startDeg + sweep * 0.75, to: endDeg, color:"#f7504f" },    // Obese
  ];
  const arcPath = (a1, a2, col) => {
    const [x1, y1] = toXY(a1);
    const [x2, y2] = toXY(a2);
    const large = (a2 - a1) > 180 ? 1 : 0;
    return (
      <path key={col} d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
        stroke={col} strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.4" />
    );
  };
  // Active needle tip
  const tipLen = r - 8;
  const needleRad = (needleDeg * Math.PI) / 180;
  const [nx, ny] = [cx + tipLen * Math.cos(needleRad), cy + tipLen * Math.sin(needleRad)];

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
      <svg viewBox="0 0 120 80" style={{ width:"100%", maxWidth:120, overflow:"visible" }}>
        {/* Zone arcs */}
        {zones.map(z => arcPath(z.from, z.to, z.color))}
        {/* Active needle */}
        <line x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)}
          stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} />
      </svg>
      {/* BMI value + label OUTSIDE SVG so they scale with CSS */}
      <div style={{ fontWeight:800, fontSize:22, color:color, lineHeight:1, marginTop:-6 }}>{bmi}</div>
      <div style={{ fontSize:12, fontWeight:600, color:color, marginTop:2 }}>{label}</div>
    </div>
  );
}

// ── Goal Progress Ring ────────────────────────────────────────────────────────

// ── GoalRing ──
function GoalRing({ current, target, start, color, size = 80 }) {
  const totalLoss = Math.abs(start - target);
  const achieved = Math.abs(start - current);
  const pct = totalLoss > 0 ? Math.min(1, achieved / totalLoss) : 0;
  const pctVal = Math.round(pct * 100);
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div style={{ position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position:"absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      {/* Text outside SVG for crisp rendering */}
      <div style={{ position:"relative", zIndex:1, textAlign:"center", lineHeight:1 }}>
        <div style={{ fontSize: size > 70 ? 16 : 14, fontWeight:800, color }}>{pctVal}%</div>
      </div>
    </div>
  );
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function sbGetUser(username) {
  // Get ALL users and filter in JS — no Firestore index needed
  try {
    const snap = await getDocs(collection(db, "users"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return all.find(u => u.username?.toLowerCase() === username?.toLowerCase()) || null;
  } catch(e) {
    console.error("sbGetUser error:", e.message);
    return null;
  }
}
async function sbGetAllUsers() {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch(e) { return []; }
}
async function sbCreateUser(user) {
  try {
    const { id, ...rest } = user;
    const docId = id ? String(id) : null;
    if (docId) {
      await setDoc(doc(db, "users", docId), rest);
      return { data: { id: docId, ...rest }, error: null };
    } else {
      const ref = await addDoc(collection(db, "users"), rest);
      return { data: { id: ref.id, ...rest }, error: null };
    }
  } catch(e) { return { data: null, error: e }; }
}
async function sbUpdateUser(id, updates) {
  try {
    await updateDoc(doc(db, "users", String(id)), updates);
    return null;
  } catch(e) {
    console.error("sbUpdateUser error:", e);
    return e;
  }
}
async function sbGetLogs(userId) {
  try {
    const snap = await getDocs(query(collection(db, "weight_logs"), where("user_id", "==", String(userId))));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
  } catch(e) { return []; }
}
async function sbAddLog(entry) {
  try {
    await addDoc(collection(db, "weight_logs"), entry);
    return null;
  } catch(e) { return e; }
}
// Food log helpers — uses food_logs table
function normalizeUserId(id) {
  return id == null ? "" : String(id);
}
async function sbGetFoodLogs(userId) {
  const uid = normalizeUserId(userId);
  try {
    const snap = await getDocs(query(collection(db, "food_logs"), where("user_id", "==", uid)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.logged_at || b.logged_date) - new Date(a.logged_at || a.logged_date));
  } catch(e) { return []; }
}
async function sbAddFoodLog(entry) {
  const payload = { ...entry, user_id: normalizeUserId(entry.user_id) };
  try {
    const ref = await addDoc(collection(db, "food_logs"), payload);
    return { data: { id: ref.id, ...payload }, error: null };
  } catch(e) {
    return { data: null, error: e };
  }
}
async function sbDeleteFoodLog(id) {
  try {
    await deleteDoc(doc(db, "food_logs", String(id)));
    return null;
  } catch(e) { return e; }
}

async function sbUpdateFoodLog(id, updates) {
  try {
    await updateDoc(doc(db, "food_logs", String(id)), updates);
    return null;
  } catch(e) {
    return e;
  }
}

const ACTIVITY_SUGGESTIONS = [
  "Wake Up", "Morning Walk", "Breakfast", "Get Ready", "Office", "Office Arrival",
  "College", "Gym", "Workout", "Yoga", "Meditation", "Mid-Morning Snack", "Lunch",
  "Lunch Break", "Evening Snack", "Evening Walk", "Dinner", "Wind Down", "Sleep",
  "Tea Break", "Prayer", "School Drop", "Cooking", "Study Time", "Work From Home",
];

function toTitleCase(str) {
  return (str || "").replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ── ActivityInput ──
function ActivityInput({ newSlot, setNewSlot, addSlot, S, COLORS }) {
  const [showSugg, setShowSugg] = useState(false);
  const filtered = newSlot.label.length > 0
    ? ACTIVITY_SUGGESTIONS.filter(s => s.toLowerCase().includes(newSlot.label.toLowerCase()) && s.toLowerCase() !== newSlot.label.toLowerCase())
    : ACTIVITY_SUGGESTIONS;
  const handleChange = (e) => { setNewSlot(p => ({ ...p, label: toTitleCase(e.target.value) })); setShowSugg(true); };
  const pickSugg = (s) => { setNewSlot(p => ({ ...p, label: s })); setShowSugg(false); };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "1 1 200px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input type="time" style={{ ...S.input, width: "100%" }}
              value={newSlot.time} onChange={e => setNewSlot(p => ({ ...p, time: e.target.value }))} />
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 10, color: COLORS.muted, pointerEvents: "none" }}>Start</span>
          </div>
          <span style={{ color: COLORS.muted, fontSize: 13 }}>→</span>
          <div style={{ position: "relative", flex: 1 }}>
            <input type="time" style={{ ...S.input, width: "100%" }}
              value={newSlot.endTime || ""} onChange={e => setNewSlot(p => ({ ...p, endTime: e.target.value }))} />
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 10, color: COLORS.muted, pointerEvents: "none" }}>End</span>
          </div>
        </div>
        <div style={{ flex: "2 1 200px", position: "relative" }}>
          <input style={{ ...S.input, width: "100%" }} placeholder="Activity (e.g. Gym)" value={newSlot.label}
            onChange={handleChange} onFocus={() => setShowSugg(true)}
            onBlur={() => setTimeout(() => setShowSugg(false), 150)} autoComplete="off" />
          {showSugg && filtered.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1a2236",
              border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 10, zIndex: 99,
              maxHeight: 180, overflowY: "auto", marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              {filtered.slice(0, 8).map(s => (
                <div key={s} onMouseDown={() => pickSugg(s)}
                  style={{ padding: "9px 14px", fontSize: 14, color: "#f0f4ff", cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,170,0.1)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <button onClick={addSlot}
          style={{ ...S.btnSm, color: COLORS.accent, border: `1px solid ${COLORS.accent}`,
            padding: "8px 16px", whiteSpace: "nowrap", flexShrink: 0 }}>+ Add</button>
      </div>
    </div>
  );
}


// Medical alert banner for food

// ── MedicalFoodAlert ──
function MedicalFoodAlert({ conditions, COLORS }) {
  const relevant = (conditions || []).filter(c => MEDICAL_FOOD_ADJUSTMENTS[c]);
  if (!relevant.length) return null;
  return (
    <div style={{ background: "#2a1500", border: "1px solid #f7934f55", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#f7934f", marginBottom: 8 }}>⚕️ Dietary Adjustments for Your Medical Conditions</div>
      {relevant.map(c => {
        const adj = MEDICAL_FOOD_ADJUSTMENTS[c];
        return (
          <div key={c} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(247,147,79,0.15)" }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#f7934f", marginBottom: 3 }}>{c}</div>
            <div style={{ fontSize: 12, color: "#00d4aa", marginBottom: 1 }}>✅ Prefer: {adj.prefer.join(", ")}</div>
            <div style={{ fontSize: 12, color: "#f7504f", marginBottom: 1 }}>❌ Avoid: {adj.avoid.join(", ")}</div>
            <div style={{ fontSize: 11, color: "#8892aa", fontStyle: "italic" }}>{adj.note}</div>
          </div>
        );
      })}
    </div>
  );
}

// Medical alert banner for workout

// ── MedicalWorkoutAlert ──
function MedicalWorkoutAlert({ conditions, COLORS }) {
  const warnings = getMedicalWorkoutWarnings(conditions || []);
  if (!warnings.length) return null;
  return (
    <div style={{ background: "#1a0a1a", border: "1px solid #f7504f55", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#f7504f", marginBottom: 8 }}>⚠️ Workout Adjustments for Your Medical Conditions</div>
      {warnings.map(({ condition, warning }) => (
        <div key={condition} style={{ marginBottom: 6, fontSize: 12 }}>
          <span style={{ fontWeight: 600, color: "#f7934f" }}>{condition}: </span>
          <span style={{ color: "#f0f4ff" }}>{warning}</span>
        </div>
      ))}
    </div>
  );
}

// Food picker for a single meal category with country-aware suggestions + custom add

// ── SimpleLineChart ──
function SimpleLineChart({ data, color, targetWeight }) {
  if (!data || data.length < 2) return null;
  const weights = data.map(d => d.weight);

  // Projection: linear trend from last half of data toward target
  let projPts = [];
  if (targetWeight && data.length >= 2) {
    const n = data.length;
    const half = Math.max(2, Math.floor(n / 2));
    const recent = data.slice(n - half);
    const xs = recent.map((_, i) => i);
    const ys = recent.map(d => d.weight);
    const xMean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
    const denom = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
    const slope = denom !== 0
      ? xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0) / denom
      : 0;
    if (slope !== 0 && Math.sign(slope) === Math.sign(targetWeight - weights[n - 1])) {
      const stepsNeeded = Math.ceil((targetWeight - weights[n - 1]) / slope);
      const projCount = Math.min(Math.abs(stepsNeeded), 30);
      if (projCount > 0) {
        projPts = Array.from({ length: projCount + 1 }, (_, i) => ({
          xi: n - 1 + i,
          w: +(weights[n - 1] + slope * i).toFixed(1),
        }));
      }
    }
  }

  const allVals = targetWeight
    ? [...weights, targetWeight, ...projPts.map(p => p.w)]
    : weights;
  const min = Math.min(...allVals) - 1, max = Math.max(...allVals) + 1;
  const totalPts = data.length + (projPts.length > 0 ? projPts.length - 1 : 0);
  const W = 600, H = 200, pX = 44, pY = 20;
  const toX = (i) => pX + (i / Math.max(1, totalPts - 1)) * (W - pX * 2);
  const toY = (w) => pY + ((max - w) / (max - min)) * (H - pY * 2 - 20);
  const pts = data.map((d, i) => [toX(i), toY(d.weight)]);
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const areaD = `${pathD} L ${pts[pts.length - 1][0]} ${H - 20} L ${pts[0][0]} ${H - 20} Z`;
  const targetY = targetWeight ? toY(targetWeight) : null;
  const projPathD = projPts.length > 1
    ? projPts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.xi)} ${toY(p.w)}`).join(" ")
    : null;
  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => +(min + (max - min) * (1 - i / ySteps)).toFixed(1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={pX - 6} y1={y} x2={W - pX + 6} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={pX - 10} y={y + 4} textAnchor="end" fill="#8892aa" fontSize="9">{v}</text>
          </g>
        );
      })}
      {/* Target weight dashed line */}
      {targetY && (
        <>
          <line x1={pX} y1={targetY} x2={W - pX} y2={targetY} stroke="#00d4aa" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" />
          <text x={W - pX + 4} y={targetY + 4} fill="#00d4aa" fontSize="9" fontWeight="700">TARGET</text>
        </>
      )}
      {/* Projection (dashed gold line) */}
      {projPathD && (
        <path d={projPathD} fill="none" stroke="#f5c543" strokeWidth="2" strokeDasharray="8 5"
          strokeLinecap="round" opacity="0.75" />
      )}
      {/* Area fill */}
      <path d={areaD} fill="url(#ag2)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points — only show every Nth to avoid clutter */}
      {pts.map(([x, y], i) => {
        const showLabel = data.length <= 10 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 8) === 0;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={showLabel ? 4 : 2.5} fill={color} />
            {showLabel && <>
              <text x={x} y={y - 8} textAnchor="middle" fill="#f0f4ff" fontSize="10" fontWeight="600">{data[i].weight}</text>
              <text x={x} y={H - 6} textAnchor="middle" fill="#8892aa" fontSize="9">{data[i].date?.slice(5)}</text>
            </>}
          </g>
        );
      })}
      {projPts.length > 1 && (() => {
        const last = projPts[projPts.length - 1];
        return <text x={toX(last.xi)} y={toY(last.w) - 8} textAnchor="middle" fill="#f5c543" fontSize="9" fontWeight="700">{last.w}</text>;
      })()}
    </svg>
  );
}

// ── FoodMealPicker ──
function FoodMealPicker({ mealKey, foods, selectedFoods, setSelectedFoods, country, foodPref, COLORS, S }) {
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [showSugg, setShowSugg] = useState(false);
  // Filter foods by dietary preference
  const countryFoods = foodPref && foodPref !== ""
    ? getFoodsByPref(country, foodPref, mealKey)
    : (COUNTRY_FOODS[country] || DEFAULT_FOODS)[mealKey] || [];
  const allFoodsForMeal = [...new Set([...countryFoods, ...(foods[mealKey] || [])])];
  const filtered = search.length > 0 ? allFoodsForMeal.filter(f => f.toLowerCase().includes(search.toLowerCase())) : allFoodsForMeal;
  const suggFiltered = customInput.length > 1 ? allFoodsForMeal.filter(f => f.toLowerCase().includes(customInput.toLowerCase()) && !selectedFoods[mealKey]?.includes(f)) : [];
  const selected = selectedFoods[mealKey] || [];

  const toggleFood = (f) => {
    setSelectedFoods(p => {
      const cur = p[mealKey] || [];
      return { ...p, [mealKey]: cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f] };
    });
  };
  const addCustom = (food) => {
    const f = toTitleCase(food.trim());
    if (!f) return;
    setSelectedFoods(p => ({ ...p, [mealKey]: [...new Set([...(p[mealKey] || []), f])] }));
    setCustomInput("");
    setShowSugg(false);
  };

  return (
    <div>
      <input style={{ ...S.input, marginBottom: 10 }} placeholder={`Search ${mealKey} foods...`} value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, maxHeight: 140, overflowY: "auto" }}>
        {filtered.map(f => (
          <button key={f} onClick={() => toggleFood(f)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${selected.includes(f) ? COLORS.accent : COLORS.border}`, background: selected.includes(f) ? `${COLORS.accent}33` : COLORS.card2, color: selected.includes(f) ? COLORS.accent : COLORS.muted, fontSize: 13, cursor: "pointer", fontFamily: FONTS.body }}>{f}</button>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="Add your own food..." value={customInput} onChange={e => { setCustomInput(toTitleCase(e.target.value)); setShowSugg(true); }}
            onFocus={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 150)}
            onKeyDown={e => e.key === "Enter" && customInput.trim() && addCustom(customInput)} />
          <button onClick={() => customInput.trim() && addCustom(customInput)} style={{ ...S.btnSm, color: COLORS.accent, border: `1px solid ${COLORS.accent}`, padding: "8px 14px" }}>+ Add</button>
        </div>
        {showSugg && suggFiltered.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1a2236", border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 10, zIndex: 99, maxHeight: 150, overflowY: "auto", marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            {suggFiltered.slice(0, 6).map(s => (
              <div key={s} onMouseDown={() => addCustom(s)} style={{ padding: "9px 14px", fontSize: 13, color: "#f0f4ff", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,170,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{s}</div>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>Selected: {selected.join(", ")}</div>
      )}
    </div>
  );
}





// ── Health Drinks Tab ─────────────────────────────────────────────────────────

// ── WaterTracker ──
function WaterTracker({ dailyWater, userId, waterTimes, S, COLORS, FONTS }) {
  const totalGlasses = Math.round(dailyWater / 0.25);
  const [doneGlasses, setDoneGlasses] = useState(() => {
    try { return parseInt(localStorage.getItem(`water_${new Date().toDateString()}_${userId}`) || "0"); } catch { return 0; }
  });
  const markGlass = (n) => {
    const val = doneGlasses === n ? n - 1 : n;
    setDoneGlasses(val);
    try { localStorage.setItem(`water_${new Date().toDateString()}_${userId}`, val); } catch {}
  };
  const pct = Math.round((doneGlasses / totalGlasses) * 100);
  return (
    <div style={{ ...S.metricCard, marginTop:"1rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700 }}>💧 Water Tracker</div>
        <div style={{ fontSize:13, color:COLORS.accent2, fontWeight:700 }}>{doneGlasses} / {totalGlasses} glasses · {pct}%</div>
      </div>
      <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, marginBottom:12 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${COLORS.accent2},${COLORS.accent})`, borderRadius:3, transition:"width 0.3s" }} />
      </div>
      <div style={{ fontSize:11, color:COLORS.muted, marginBottom:8, textAlign:"center" }}>
        💧 Tap each drop to log a glass of water
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
        {Array.from({length:totalGlasses}).map((_,i) => (
          <button key={i} onClick={() => markGlass(i+1)}
            style={{ width:36, height:36, borderRadius:8, border:`1.5px solid ${i<doneGlasses?COLORS.accent2:COLORS.border}`, background:i<doneGlasses?`${COLORS.accent2}20`:COLORS.card2, cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
            {i<doneGlasses?"💧":"○"}
          </button>
        ))}
      </div>
      {pct>=100 && <div style={{ fontSize:12, color:COLORS.success, fontWeight:600, textAlign:"center" }}>🎉 Daily water goal achieved!</div>}
      {pct<100 && <div style={{ fontSize:12, color:COLORS.muted }}>{totalGlasses-doneGlasses} more glasses to reach your {dailyWater}L goal today</div>}
      <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${COLORS.border}` }}>
        <div style={{ fontSize:12, color:COLORS.muted, fontWeight:600, marginBottom:6 }}>RECOMMENDED SCHEDULE</div>
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {(waterTimes||[]).map((w,i) => (
            <div key={i} style={{ display:"flex", gap:10, fontSize:12, color:COLORS.muted }}>
              <span style={{ color:COLORS.accent2, fontWeight:600, minWidth:48 }}>{w.time}</span>
              <span>{w.note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ActivityTimer — fullscreen workout activity timer with calorie tracking ────

// ── TodayTimeline ──
function TodayTimeline({ timeline, userId, S, COLORS, FONTS }) {
  const [doneItems, setDoneItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`done_${new Date().toDateString()}_${userId}`) || "{}"); } catch { return {}; }
  });
  const toggleDone = (key) => {
    const next = { ...doneItems, [key]: !doneItems[key] };
    setDoneItems(next);
    try { localStorage.setItem(`done_${new Date().toDateString()}_${userId}`, JSON.stringify(next)); } catch {}
  };
  const doneCount = Object.values(doneItems).filter(Boolean).length;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:13, color:COLORS.muted }}>{doneCount} of {timeline.length} completed today</div>
        <div style={{ height:6, flex:1, margin:"0 12px", background:"rgba(255,255,255,0.08)", borderRadius:3 }}>
          <div style={{ height:"100%", width:`${timeline.length?(doneCount/timeline.length*100):0}%`, background:`linear-gradient(90deg,${COLORS.success},${COLORS.accent})`, borderRadius:3, transition:"width 0.3s" }} />
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:COLORS.success }}>{timeline.length?Math.round(doneCount/timeline.length*100):0}%</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {timeline.map((item, i) => {
          const key = `${item.time}_${item.activity}`;
          const done = doneItems[key];
          return (
            <div key={i} onClick={() => toggleDone(key)} style={{ ...S.metricCard, display:"flex", gap:14, alignItems:"flex-start", borderLeft:`3px solid ${done?COLORS.success:item.type==="water"?COLORS.accent2:item.type==="meal"?COLORS.accent:COLORS.border}`, cursor:"pointer", opacity:done?0.65:1, transition:"all 0.2s", userSelect:"none" }}>
              <div style={{ minWidth:52, fontSize:13, fontWeight:700, color:done?COLORS.success:item.type==="water"?COLORS.accent2:item.type==="meal"?COLORS.accent:COLORS.muted, fontFamily:FONTS.head }}>{item.time}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:2, textDecoration:done?"line-through":"none", color:done?COLORS.muted:COLORS.text }}>{item.activity}</div>
                <div style={{ fontSize:12, color:COLORS.muted }}>{item.suggestion}</div>
              </div>
              <div style={{ fontSize:18, flexShrink:0 }}>{done?"✅":item.type==="water"?"💧":item.type==="meal"?"🍽️":"📍"}</div>
            </div>
          );
        })}
      </div>
      {doneCount===timeline.length && timeline.length>0 && (
        <div style={{ textAlign:"center", padding:"16px", marginTop:8, background:`${COLORS.success}12`, borderRadius:12, border:`1px solid ${COLORS.success}30` }}>
          <div style={{ fontSize:24, marginBottom:4 }}>🎉</div>
          <div style={{ fontWeight:700, color:COLORS.success }}>Perfect day! All tasks completed!</div>
        </div>
      )}
    </div>
  );
}

// ── WaterTracker — interactive glass check-off tracker ───────────────────────

// ── FoodScoreRow ──
function FoodScoreRow({ entry, isLast, COLORS }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = entry.status === "healthy" ? COLORS.success : entry.status === "moderate" ? COLORS.accent3 : COLORS.warn;
  const statusIcon  = entry.status === "healthy" ? "✅" : entry.status === "moderate" ? "⚡" : "⚠️";
  const statusLabel = entry.status === "healthy" ? "Healthy" : entry.status === "moderate" ? "Moderate" : "Unhealthy";
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 3fr", gap:0, padding:"12px 16px",
        borderBottom: !expanded && !isLast ? `1px solid ${COLORS.border}` : "none",
        background: "transparent", alignItems:"start" }}>
        <div>
          <div style={{ fontWeight:600, fontSize:14, color:COLORS.text, marginBottom:3 }}>{entry.food}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ height:4, width:60, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
              <div style={{ height:"100%", width:`${entry.score*10}%`, background:statusColor, borderRadius:2 }} />
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:statusColor }}>{entry.score}/10</span>
            {entry.cal && <span style={{ fontSize:10, color:COLORS.muted }}>{entry.cal} kcal</span>}
          </div>
        </div>
        <div style={{ fontSize:12, color:COLORS.muted, paddingTop:2 }}>{entry.mealLabel}</div>
        <div style={{ paddingTop:2 }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:`${statusColor}18`, color:statusColor, border:`1px solid ${statusColor}33`, whiteSpace:"nowrap" }}>
            {statusIcon} {statusLabel}
          </span>
        </div>
        <div>
          {entry.status !== "healthy" ? (
            <div>
              <div style={{ fontSize:12, color:COLORS.success, fontWeight:600, marginBottom:3 }}>→ {entry.suggestion}</div>
              <button onClick={() => setExpanded(e => !e)}
                style={{ fontSize:10, color:COLORS.muted, background:"transparent", border:"none", cursor:"pointer", padding:0, textDecoration:"underline" }}>
                {expanded ? "Hide reason ▲" : "Why? ▼"}
              </button>
            </div>
          ) : (
            <div style={{ fontSize:12, color:COLORS.success }}>{entry.suggestion}</div>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ padding:"8px 16px 12px", background:`${statusColor}07`, borderBottom:`1px solid ${COLORS.border}`, borderLeft:`3px solid ${statusColor}` }}>
          <div style={{ fontSize:12, color:COLORS.muted, lineHeight:1.6 }}>
            <b style={{ color:statusColor }}>Why rated {statusLabel}:</b> {entry.reason}
          </div>
        </div>
      )}
    </div>
  );
}

// ── FoodScoreTab — full food score analysis tab ───────────────────────────────


// ── LogsWrapper — groups Calorie Burn, Food Log, Sleep, Vitals as sub-tabs ───

// ── LogsWrapper ──
function LogsWrapper({ userId, userLogs, foodLogs, sleepLogs, calorieBurns, profile, onBurnSaved, onSaved, onFoodSaved, COLORS, FONTS, S }) {
  const [logsTab, setLogsTab] = useState("foodlog");
  const TABS = [
    { key:"foodlog",    label:"🍱 Food Log" },
    { key:"calorieburn",label:"🔥 Calorie Burn" },
    { key:"sleep",      label:"😴 Sleep" },
    { key:"vitals",     label:"❤️ Vitals" },
  ];
  return (
    <div>
      <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>📋 Logs</div>
      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:14 }}>Track your daily health data</div>
      <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
        {TABS.map(({key,label}) => (
          <button key={key} onClick={() => setLogsTab(key)}
            style={{ ...S.pill(logsTab===key), whiteSpace:"nowrap", flexShrink:0, fontSize:13 }}>
            {label}
          </button>
        ))}
      </div>
      {logsTab === "foodlog" && (
        <FoodLog userId={userId} foodLogs={foodLogs} profile={profile||{}}
          onLogsChange={(entry) => { onFoodSaved && onFoodSaved(entry); }} COLORS={COLORS} FONTS={FONTS} S={S} />
      )}
      {logsTab === "calorieburn" && (
        <CalorieBurnTab userId={userId} calorieBurns={calorieBurns}
          onBurnSaved={() => { onBurnSaved && onBurnSaved(); }}
          COLORS={COLORS} FONTS={FONTS} S={S} />
      )}
      {logsTab === "sleep" && (
        <SleepTracker userId={userId} sleepLogs={sleepLogs}
          onSaved={() => { onSaved && onSaved(); }}
          COLORS={COLORS} FONTS={FONTS} S={S} />
      )}
      {logsTab === "vitals" && (
        <HealthVitalsTab userId={userId} COLORS={COLORS} FONTS={FONTS} S={S} />
      )}
    </div>
  );
}
// ── FoodScoreWrapper — tabs for food score, drinks, soups ────────────────────

// ── FoodScoreWrapper ──
function FoodScoreWrapper({ likedFoods, conditions, S, COLORS, FONTS, onGoToSettings }) {
  const [fsTab, setFsTab] = useState("scores");
  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto",
        paddingBottom:4, scrollbarWidth:"none" }}>
        {[
          { key:"scores", label:"🥗 Food Score" },
          { key:"drinks", label:"🥤 Health Drinks" },
          { key:"soups",  label:"🍲 Healthy Soups" },
        ].map(({key,label}) => (
          <button key={key} onClick={() => setFsTab(key)}
            style={{ ...S.pill(fsTab===key), whiteSpace:"nowrap", flexShrink:0, fontSize:13 }}>
            {label}
          </button>
        ))}
      </div>
      {fsTab === "scores" && <FoodScoreTab likedFoods={likedFoods} conditions={conditions}
        S={S} COLORS={COLORS} FONTS={FONTS} onGoToSettings={onGoToSettings} />}
      {fsTab === "drinks" && <HealthDrinksSoupsTab type="drinks" COLORS={COLORS} FONTS={FONTS} S={S} />}
      {fsTab === "soups"  && <HealthDrinksSoupsTab type="soups"  COLORS={COLORS} FONTS={FONTS} S={S} />}
    </div>
  );
}

// ── FoodScoreTab ──
function FoodScoreTab({ likedFoods, conditions, S, COLORS, FONTS, onGoToSettings }) {
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("meal");

  const mealLabels = { Breakfast:"🌅 Breakfast", Lunch:"☀️ Lunch", "Evening Snack":"🍎 Evening Snack", Dinner:"🌙 Dinner", Munching:"🥜 Munching", Fruits:"🍉 Fruits" };
  const allEntries = [];
  Object.entries(likedFoods || {}).forEach(([meal, foods]) => {
    (foods || []).forEach(food => {
      const health = getFoodHealth(food);
      allEntries.push({ food, meal, mealLabel: mealLabels[meal] || meal, ...health });
    });
  });

  if (allEntries.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🥗</div>
        <div style={{ fontFamily:FONTS.head, fontSize:18, fontWeight:700, marginBottom:8 }}>No foods selected yet</div>
        <div style={{ fontSize:14, color:COLORS.muted, marginBottom:20 }}>Go to My Preferences → Foods and select the foods you eat regularly. We'll analyse each one for you.</div>
        <button onClick={onGoToSettings} style={{ ...S.btn, width:"auto", padding:"10px 24px" }}>Go to My Preferences →</button>
      </div>
    );
  }

  const healthy   = allEntries.filter(e => e.status === "healthy");
  const moderate  = allEntries.filter(e => e.status === "moderate");
  const unhealthy = allEntries.filter(e => e.status === "unhealthy");
  const avgScore  = +(allEntries.reduce((a,e) => a + e.score, 0) / allEntries.length).toFixed(1);
  const dietGrade = avgScore >= 8 ? "A" : avgScore >= 6.5 ? "B" : avgScore >= 5 ? "C" : "D";
  const gradeColor = avgScore >= 8 ? COLORS.success : avgScore >= 6.5 ? COLORS.accent : avgScore >= 5 ? COLORS.accent3 : COLORS.warn;

  const filtered = allEntries
    .filter(e => scoreFilter === "all" || e.status === scoreFilter)
    .sort((a, b) => sortBy === "score" ? a.score - b.score : a.meal.localeCompare(b.meal));

  return (
    <div>
      <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>🥗 Food Score Report</div>
      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:20 }}>
        Analysis of {allEntries.length} foods you've selected, based on nutritional science & GI index.
      </div>

      {/* Diet grade card */}
      <div style={{ ...S.metricCard, marginBottom:16, background:`${gradeColor}0e`, border:`1px solid ${gradeColor}33`, display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ textAlign:"center", minWidth:80 }}>
          <div style={{ fontSize:56, fontWeight:800, fontFamily:FONTS.head, color:gradeColor, lineHeight:1 }}>{dietGrade}</div>
          <div style={{ fontSize:11, color:COLORS.muted, fontWeight:600 }}>DIET GRADE</div>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:6, color:gradeColor }}>
            {avgScore >= 8 ? "Excellent diet! Your food choices are highly nutritious." :
             avgScore >= 6.5 ? "Good diet with room for improvement." :
             avgScore >= 5 ? "Average diet — several items need healthier swaps." :
             "Diet needs significant improvement. Many high-risk foods selected."}
          </div>
          <div style={{ fontSize:13, color:COLORS.muted }}>Average food score: <b style={{ color:gradeColor }}>{avgScore}/10</b></div>
          <div style={{ marginTop:8, height:8, background:"rgba(255,255,255,0.08)", borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(avgScore/10)*100}%`, background:`linear-gradient(90deg,${gradeColor},${gradeColor}aa)`, borderRadius:4, transition:"width 0.5s" }} />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {[{label:"✅ Healthy",count:healthy.length,color:COLORS.success},{label:"⚡ Moderate",count:moderate.length,color:COLORS.accent3},{label:"⚠️ Unhealthy",count:unhealthy.length,color:COLORS.warn}].map(({label,count,color}) => (
            <div key={label} style={{ textAlign:"center", background:`${color}15`, border:`1px solid ${color}33`, borderRadius:10, padding:"8px 14px", minWidth:70 }}>
              <div style={{ fontSize:20, fontWeight:700, color }}>{count}</div>
              <div style={{ fontSize:10, color:COLORS.muted, fontWeight:600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter & Sort */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6, flex:1, flexWrap:"wrap" }}>
          {[{key:"all",label:`All (${allEntries.length})`,color:COLORS.accent},{key:"healthy",label:`✅ Healthy (${healthy.length})`,color:COLORS.success},{key:"moderate",label:`⚡ Moderate (${moderate.length})`,color:COLORS.accent3},{key:"unhealthy",label:`⚠️ Unhealthy (${unhealthy.length})`,color:COLORS.warn}].map(({key,label,color}) => (
            <button key={key} onClick={() => setScoreFilter(key)}
              style={{ padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:scoreFilter===key?700:400,
                border:scoreFilter===key?"none":`1px solid ${COLORS.border}`,
                background:scoreFilter===key?color:COLORS.card2,
                color:scoreFilter===key?"#fff":COLORS.muted }}>
              {label}
            </button>
          ))}
        </div>
        <select style={{ ...S.select, maxWidth:140, padding:"6px 12px", fontSize:12 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="meal">Sort by Meal</option>
          <option value="score">Sort by Score ↑</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ ...S.metricCard, padding:0, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 3fr", gap:0, background:"rgba(255,255,255,0.04)", padding:"10px 16px", borderBottom:`1px solid ${COLORS.border}` }}>
          {["FOOD ITEM","MEAL","HEALTH STATUS","SUGGESTION"].map(h => (
            <div key={h} style={{ fontSize:10, fontWeight:700, color:COLORS.muted, letterSpacing:0.8 }}>{h}</div>
          ))}
        </div>
        {filtered.map((entry, i) => (
          <FoodScoreRow key={`${entry.food}_${i}`} entry={entry} isLast={i === filtered.length - 1} COLORS={COLORS} />
        ))}
      </div>

      {/* Action plan */}
      {unhealthy.length > 0 && (
        <div style={{ ...S.metricCard, marginTop:14, background:`${COLORS.warn}0a`, border:`1px solid ${COLORS.warn}33` }}>
          <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, color:COLORS.warn, marginBottom:10 }}>
            ⚠️ Action Plan — Replace These {unhealthy.length} Unhealthy Items
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {unhealthy.map((entry,i) => (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, borderLeft:`3px solid ${COLORS.warn}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>{entry.food}</div>
                  <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>Score: {entry.score}/10 · {entry.mealLabel}</div>
                </div>
                <div style={{ fontSize:22, flexShrink:0 }}>→</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:COLORS.success }}>{entry.suggestion}</div>
                  <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>{entry.reason.slice(0,80)}...</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, fontSize:12, color:COLORS.muted, textAlign:"center" }}>
            💡 Replace these in My Preferences → Foods to get a healthier AI meal plan
          </div>
        </div>
      )}
      {unhealthy.length === 0 && moderate.length <= 2 && (
        <div style={{ ...S.metricCard, marginTop:14, background:`${COLORS.success}0d`, border:`1px solid ${COLORS.success}33`, textAlign:"center", padding:"1.5rem" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🌟</div>
          <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:700, color:COLORS.success, marginBottom:4 }}>Excellent food choices!</div>
          <div style={{ fontSize:13, color:COLORS.muted }}>Your selected foods are predominantly healthy. Your AI meal plan will be highly nutritious.</div>
        </div>
      )}
    </div>
  );
}

// ── TodayTimeline — checkable daily activity list ─────────────────────────────

// ── GroceryListView ──
function GroceryListView({ activeDays, dayIngredients, copiedGrocery, setCopiedGrocery, COLORS, FONTS, S }) {
  const [view, setView] = useState("day");
  const [selectedDay, setSelectedDay] = useState(activeDays[0] || "Monday");
  const weekIngredients = [...new Set(activeDays.flatMap(d => dayIngredients[d]?.ingredients || []))].sort();
  const dayList = dayIngredients[selectedDay]?.ingredients || [];
  const buildCopyText = () => {
    if (view === "week") return "🛒 Weekly Grocery List\n\n" + weekIngredients.map(i => "• " + i).join("\n") + "\n\nvia Stayfit";
    return "🛒 " + selectedDay + " Grocery List\n\n" + dayList.map(i => "• " + i).join("\n") + "\n\nvia Stayfit";
  };
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(buildCopyText()); setCopiedGrocery(true); setTimeout(() => setCopiedGrocery(false), 2500); } catch(e) {}
  };
  const handleShare = () => {
    const text = buildCopyText();
    if (navigator.share) navigator.share({ title:"🛒 Grocery List", text }).catch(()=>{});
    else window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  };
  const itemCount = view === "week" ? weekIngredients.length : dayList.length;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700, color:COLORS.success }}>🛒 Grocery List</div>
          <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>{itemCount} ingredients · pantry items excluded</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={handleCopy} style={{ ...S.btnSm, color:copiedGrocery?COLORS.success:COLORS.accent, borderColor:`${copiedGrocery?COLORS.success:COLORS.accent}44`, padding:"7px 14px", fontSize:12, fontWeight:600 }}>
            {copiedGrocery ? "✅ Copied!" : "📋 Copy"}
          </button>
          <button onClick={handleShare} style={{ ...S.btnSm, color:"#25d366", borderColor:"#25d36644", padding:"7px 14px", fontSize:12, fontWeight:600 }}>
            📲 Share
          </button>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {[["day","📅 By Day"],["week","📆 By Week"]].map(([k,l]) => (
          <button key={k} onClick={() => setView(k)} style={{ padding:"7px 18px", borderRadius:20, fontSize:12, fontWeight:view===k?700:500, cursor:"pointer", border:`1.5px solid ${view===k?COLORS.accent:COLORS.border}`, background:view===k?`${COLORS.accent}18`:"transparent", color:view===k?COLORS.accent:COLORS.muted }}>
            {l}
          </button>
        ))}
      </div>
      {view === "day" && (
        <div>
          <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
            {activeDays.map(day => (
              <button key={day} onClick={() => setSelectedDay(day)} style={{ padding:"6px 14px", borderRadius:20, fontSize:12, whiteSpace:"nowrap", flexShrink:0, cursor:"pointer", fontWeight:selectedDay===day?700:400, border:`1.5px solid ${selectedDay===day?COLORS.accent2:COLORS.border}`, background:selectedDay===day?`${COLORS.accent2}18`:"transparent", color:selectedDay===day?COLORS.accent2:COLORS.muted }}>
                {day.slice(0,3)}
              </button>
            ))}
          </div>
          {dayList.length === 0 ? (
            <div style={{ textAlign:"center", padding:"1.5rem", color:COLORS.muted, fontSize:13 }}>No ingredients found for {selectedDay}</div>
          ) : (
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {dayList.map((item,i) => (
                <span key={i} style={{ padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:500, background:`${COLORS.success}12`, color:COLORS.success, border:`1px solid ${COLORS.success}25` }}>{item}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {view === "week" && (
        <div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {weekIngredients.map((item,i) => (
              <span key={i} style={{ padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:500, background:`${COLORS.success}12`, color:COLORS.success, border:`1px solid ${COLORS.success}25` }}>{item}</span>
            ))}
          </div>
          <div style={{ fontSize:11, color:COLORS.muted, marginTop:10 }}>{weekIngredients.length} unique ingredients across all 7 days</div>
        </div>
      )}
      <div style={{ borderTop:`1px solid ${COLORS.border}`, paddingTop:8, marginTop:12, fontSize:11, color:COLORS.muted }}>
        💡 Salt, oil, sugar, spices & pantry staples excluded
      </div>
    </div>
  );
}
// ── FoodScoreRow — individual row in food score table (needs own state for expand) ──

// ── StepCounter ──
function StepCounter({ userId, COLORS, FONTS, S }) {
  const [steps, setSteps]         = useState(0);
  const [tracking, setTracking]   = useState(false);
  const [supported, setSupported] = useState(null);
  const [permission, setPermission] = useState(null);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [dailySteps, setDailySteps] = useState([]);
  const stepRef      = useRef(0);
  const lastAccelRef = useRef(null);
  const lastStepTime = useRef(0);

  const detectStep = useCallback((event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    const magnitude = Math.sqrt((acc.x||0)**2 + (acc.y||0)**2 + (acc.z||0)**2);
    const last = lastAccelRef.current;
    if (last !== null) {
      const delta = Math.abs(magnitude - last);
      const now = Date.now();
      // Debounce: min 300ms between steps to avoid double-counting
      if (delta > 2.5 && now - lastStepTime.current > 300) {
        stepRef.current += 1;
        setSteps(stepRef.current);
        lastStepTime.current = now;
      }
    }
    lastAccelRef.current = magnitude;
  }, []);

  const startTracking = useCallback(() => {
    window.addEventListener("devicemotion", detectStep);
    setTracking(true);
  }, [detectStep]);

  const stopTracking = useCallback(() => {
    window.removeEventListener("devicemotion", detectStep);
    setTracking(false);
  }, [detectStep]);

  // Auto-start on mount — request permission and begin immediately
  useEffect(() => {
    loadDailySteps();

    const tryStart = async () => {
      if (typeof DeviceMotionEvent === "undefined") {
        setSupported(false); return;
      }
      setSupported(true);
      // iOS 13+ requires permission
      if (typeof DeviceMotionEvent.requestPermission === "function") {
        try {
          const perm = await DeviceMotionEvent.requestPermission();
          setPermission(perm);
          if (perm === "granted") startTracking();
        } catch(e) { setPermission("denied"); }
      } else {
        // Android / desktop — no permission needed
        setPermission("granted");
        startTracking();
      }
    };

    tryStart();
    // Cleanup on unmount
    return () => { window.removeEventListener("devicemotion", detectStep); };
  }, []);

  const loadDailySteps = async () => {
    try {
      const snap = await getDocs(collection(db, "step_logs"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.user_id === userId)
        .sort((a,b) => new Date(b.date)-new Date(a.date))
        .slice(0,7);
      setDailySteps(data);
    } catch(e) {}
  };

  const requestPermission = async () => {
    if (typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        const perm = await DeviceMotionEvent.requestPermission();
        setPermission(perm);
        if (perm === "granted") startTracking();
      } catch(e) { setPermission("denied"); }
    } else {
      setPermission("granted");
      startTracking();
    }
  };

  const saveSteps = async () => {
    if (steps <= 0) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const calories = Math.round(steps * 0.04); // ~0.04 kcal per step
    try {
      // Also save as calorie burn
      await addDoc(collection(db, "calorie_burns"), {
        user_id: userId, activity: "walking",
        calories, steps, duration_mins: Math.round(steps/100),
        logged_date: today, logged_at: new Date().toISOString(),
      });
      await addDoc(collection(db, "step_logs"), {
        user_id: userId, steps, calories, date: today,
        logged_at: new Date().toISOString(),
      });
      setSaved(true);
      loadDailySteps();
    } catch(e) {}
    setSaving(false);
  };

  const calBurned = Math.round(steps * 0.04);
  const goalSteps = 10000;
  const pct = Math.min(100, Math.round(steps/goalSteps*100));

  return (
    <div style={{ ...S.metricCard, marginBottom:14 }}>
      <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700, marginBottom:4 }}>👟 Step Counter</div>
      <div style={{ fontSize:12, color:COLORS.muted, marginBottom:12 }}>
        Uses your device motion sensor to count steps
      </div>

      {supported === false ? (
        <div style={{ textAlign:"center", padding:"1rem", color:COLORS.muted, fontSize:13 }}>
          <div style={{ fontSize:24, marginBottom:8 }}>📵</div>
          Step counting requires a mobile device with motion sensors.
          Use your phone to access this feature.
        </div>
      ) : (
        <div>
          {/* Big step count display */}
          <div style={{ textAlign:"center", marginBottom:14 }}>
            <div style={{ fontFamily:FONTS.head, fontSize:64, fontWeight:800, color:COLORS.accent,
              lineHeight:1, marginBottom:4 }}>{steps.toLocaleString()}</div>
            <div style={{ fontSize:13, color:COLORS.muted }}>steps today</div>
            <div style={{ fontSize:13, color:COLORS.accent3, fontWeight:600 }}>🔥 {calBurned} kcal burned</div>
          </div>

          {/* Progress to 10k goal */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
              <span style={{ color:COLORS.muted }}>Daily goal: 10,000 steps</span>
              <span style={{ color:COLORS.accent, fontWeight:700 }}>{pct}%</span>
            </div>
            <div style={{ height:8, background:"rgba(255,255,255,0.08)", borderRadius:4 }}>
              <div style={{ height:"100%", width:`${pct}%`,
                background:pct>=100?COLORS.success:`linear-gradient(90deg,${COLORS.accent},${COLORS.accent2})`,
                borderRadius:4, transition:"width 0.3s" }} />
            </div>
            {pct >= 100 && (
              <div style={{ fontSize:12, color:COLORS.success, fontWeight:700, marginTop:4, textAlign:"center" }}>
                🎉 Goal reached! Amazing!
              </div>
            )}
          </div>

          {/* Auto-tracking status */}
          <div style={{ textAlign:"center", marginBottom:12 }}>
            {permission === "denied" ? (
              <div style={{ padding:"10px 14px", borderRadius:10, background:`${COLORS.warn}10`,
                border:`1px solid ${COLORS.warn}44`, fontSize:13 }}>
                <div style={{ color:COLORS.warn, fontWeight:700, marginBottom:4 }}>⚠️ Permission Denied</div>
                <div style={{ fontSize:12, color:COLORS.muted, marginBottom:8 }}>
                  Motion sensor access was denied. To enable:
                </div>
                <div style={{ fontSize:11, color:COLORS.muted, textAlign:"left", marginBottom:8 }}>
                  📱 iPhone: Settings → Safari → Motion & Orientation Access → On<br/>
                  🤖 Android: Allow motion permissions in browser settings
                </div>
                <button onClick={requestPermission} style={{ ...S.btn, padding:"8px 20px" }}>
                  🔄 Try Again
                </button>
              </div>
            ) : tracking ? (
              <div style={{ padding:"8px 14px", borderRadius:10,
                background:`${COLORS.success}10`, border:`1px solid ${COLORS.success}44`,
                fontSize:12, color:COLORS.success, fontWeight:600 }}>
                📡 Auto-tracking active — walk with phone in pocket
              </div>
            ) : supported === false ? (
              <div style={{ textAlign:"center", padding:"2rem" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📱</div>
                <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:700, marginBottom:8 }}>
                  Phone Required
                </div>
                <div style={{ fontSize:13, color:COLORS.muted, lineHeight:1.6 }}>
                  Step tracking uses your phone's motion sensor.<br/>
                  Open this app on your phone to auto-track steps.
                </div>
              </div>
            ) : (
              <div style={{ padding:"8px 14px", borderRadius:10,
                background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}33`,
                fontSize:12, color:COLORS.muted }}>
                ⏳ Starting sensor…
              </div>
            )}
          </div>

          {/* Save button — shows when steps accumulated */}
          {steps > 0 && !saved && (
            <button onClick={saveSteps} disabled={saving}
              style={{ ...S.btn, marginBottom:10, padding:"12px",
                background:`linear-gradient(135deg,${COLORS.accent3},${COLORS.warn})`,
                opacity:saving?0.6:1 }}>
              {saving ? "Saving…" : `💾 Save ${steps.toLocaleString()} Steps`}
            </button>
          )}

          {saved && (
            <div style={{ textAlign:"center", fontSize:13, color:COLORS.success,
              fontWeight:700, marginBottom:10, padding:"8px",
              background:`${COLORS.success}10`, borderRadius:8 }}>
              ✅ {steps.toLocaleString()} steps saved — {calBurned} kcal logged!
            </div>
          )}

          {/* Recent history */}
          {dailySteps.length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted, marginBottom:8, letterSpacing:"0.05em" }}>
                RECENT STEPS
              </div>
              {dailySteps.map((d,i) => {
                const p = Math.min(100, Math.round(d.steps/goalSteps*100));
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                    <span style={{ fontSize:11, color:COLORS.muted, minWidth:70 }}>
                      {new Date(d.date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
                    </span>
                    <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.07)", borderRadius:3 }}>
                      <div style={{ height:"100%", width:`${p}%`, borderRadius:3,
                        background:p>=100?COLORS.success:COLORS.accent }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:p>=100?COLORS.success:COLORS.text, minWidth:55, textAlign:"right" }}>
                      {(d.steps||0).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ── CorrelationGraphs — sleep vs weight, exercise vs weight ──────────────────

// ── AchievementBadges ──
function AchievementBadges({ userLogs, foodLogs, sleepLogs, calorieBurns, COLORS, FONTS, S }) {
  const achieved = ALL_BADGES.filter(b => {
    try { return b.condition(userLogs, foodLogs, sleepLogs, calorieBurns); } catch(e) { return false; }
  });
  const locked = ALL_BADGES.filter(b => !achieved.find(a => a.id === b.id));

  return (
    <div style={{ ...S.metricCard, marginBottom:14 }}>
      <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700, marginBottom:4 }}>🏅 Achievement Badges</div>
      <div style={{ fontSize:12, color:COLORS.muted, marginBottom:12 }}>
        {achieved.length} of {ALL_BADGES.length} badges unlocked
      </div>

      {/* Progress bar */}
      <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, marginBottom:14 }}>
        <div style={{ height:"100%", width:`${Math.round(achieved.length/ALL_BADGES.length*100)}%`,
          background:`linear-gradient(135deg,${COLORS.accent},${COLORS.gold})`, borderRadius:3, transition:"width 0.5s" }} />
      </div>

      {/* Achieved badges */}
      {achieved.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:COLORS.success, marginBottom:8, letterSpacing:"0.05em" }}>✅ UNLOCKED ({achieved.length})</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {achieved.map(b => (
              <div key={b.id} style={{ display:"flex", flexDirection:"column", alignItems:"center",
                padding:"10px 12px", borderRadius:12, width:80, textAlign:"center",
                background:`${COLORS.gold}0d`, border:`1.5px solid ${COLORS.gold}44` }}>
                <div style={{ fontSize:24, marginBottom:4 }}>{b.icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color:COLORS.gold, lineHeight:1.2 }}>{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted, marginBottom:8, letterSpacing:"0.05em" }}>🔒 LOCKED ({locked.length})</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {locked.map(b => (
              <div key={b.id} style={{ display:"flex", flexDirection:"column", alignItems:"center",
                padding:"10px 12px", borderRadius:12, width:80, textAlign:"center",
                background:"rgba(255,255,255,0.03)", border:`1px solid ${COLORS.border}`,
                opacity:0.5, cursor:"pointer", position:"relative" }}
                title={b.desc}>
                <div style={{ fontSize:24, marginBottom:4, filter:"grayscale(1)" }}>{b.icon}</div>
                <div style={{ fontSize:10, fontWeight:600, color:COLORS.muted, lineHeight:1.2 }}>{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {achieved.length === 0 && (
        <div style={{ textAlign:"center", padding:"1rem", color:COLORS.muted, fontSize:13 }}>
          Start logging your health data to unlock badges! 🌱
        </div>
      )}
    </div>
  );
}
// ── AIHealthInsights — personalized AI-driven health analysis ─────────────────

// ── AIHealthInsights ──
function AIHealthInsights({ currentUser, profile, metrics, userLogs, foodLogs, sleepLogs, calorieBurns, COLORS, FONTS, S }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const CACHE_KEY = "ai_insights_" + currentUser.id;

  // Auto-generate on mount if no cached insights or cache > 24h old
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
        if (ageHours < 24) { setInsights(data); return; }
      } catch(e) {}
    }
    // No valid cache — generate now
    generateInsights();
  }, [currentUser.id]);

  const generateInsights = async () => {
    setLoading(true); setError(""); setInsights(null);
    try {
      const totalLost = userLogs.length >= 2
        ? +(userLogs[0].weight - userLogs[userLogs.length-1].weight).toFixed(1) : 0;
      const avgSleep = sleepLogs.length > 0
        ? (sleepLogs.slice(0,7).reduce((s,l)=>s+l.hours,0)/Math.min(7,sleepLogs.length)).toFixed(1) : null;
      const weekBurns = calorieBurns.slice(0,7).reduce((s,b)=>s+b.calories,0);
      const recentFoods = foodLogs.slice(0,20).map(l=>l.food_name).join(", ");

      const prompt = `You are a professional health coach. Analyze this user's health data and give 4-5 specific, actionable insights.

User Profile:
- Age: ${profile?.age || "unknown"}, Gender: ${profile?.gender || "unknown"}
- Weight: ${metrics?.weight || "unknown"}kg, BMI: ${metrics?.bmi || "unknown"} (${metrics?.bmi < 18.5 ? "Underweight" : metrics?.bmi < 25 ? "Normal" : metrics?.bmi < 30 ? "Overweight" : "Obese"})
- Goal: ${profile?.goal || "unknown"}, Fitness Level: ${profile?.fitnessLevel || "unknown"}
- Weight lost so far: ${Math.abs(totalLost)}kg ${totalLost > 0 ? "(losing)" : totalLost < 0 ? "(gaining)" : "(no change)"}
${avgSleep ? `- Average sleep: ${avgSleep} hours/night` : ""}
${weekBurns > 0 ? `- Calories burned this week (exercise): ${weekBurns} kcal` : ""}
${recentFoods ? `- Recently eaten: ${recentFoods.slice(0,200)}` : ""}

Give response as JSON only (no markdown):
{
  "overall_score": <number 1-10>,
  "overall_message": "<2 sentence summary of their health status>",
  "insights": [
    { "icon": "<emoji>", "title": "<short title>", "message": "<2-3 sentence specific insight>", "type": "positive|warning|tip" }
  ],
  "top_priority": "<single most important action they should take right now>"
}`;

      const { text } = await callAI(prompt, 1500);
      let clean = text.trim().replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setInsights(parsed);
      // Cache for 24 hours
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: parsed, timestamp: Date.now() })); } catch(e) {}
    } catch(e) {
      setError("Could not generate insights: " + e.message);
    }
    setLoading(false);
  };

  const typeColor = (type) => type==="positive" ? COLORS.success : type==="warning" ? COLORS.warn : COLORS.accent2;
  const typeBg   = (type) => type==="positive" ? `${COLORS.success}0d` : type==="warning" ? `${COLORS.warn}0d` : `${COLORS.accent2}0d`;

  return (
    <div style={{ ...S.metricCard, marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:insights?12:0 }}>
        <div>
          <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700 }}>🤖 AI Health Insights</div>
          <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>
            {loading ? "Analysing your health data…" : insights ? "Auto-refreshes every 24 hours" : "Personalised analysis"}
          </div>
        </div>
        {insights && !loading && (
          <div style={{ fontSize:11, color:COLORS.muted, padding:"4px 10px", borderRadius:20,
            background:"rgba(255,255,255,0.05)", border:`1px solid ${COLORS.border}` }}>
            ✅ Updated today
          </div>
        )}
      </div>

      {error && <div style={{ fontSize:12, color:COLORS.warn, marginTop:8 }}>{error}</div>}

      {loading && (
        <div style={{ padding:"1rem 0" }}>
          <div className="sf-skeleton" style={{ height:52, marginBottom:10, borderRadius:10 }} />
          <div className="sf-skeleton" style={{ height:72, marginBottom:8, borderRadius:10 }} />
          <div className="sf-skeleton" style={{ height:72, marginBottom:8, borderRadius:10 }} />
          <div style={{ fontSize:12, color:COLORS.muted, textAlign:"center", marginTop:8 }}>Analysing your health data…</div>
        </div>
      )}
      {insights && !loading && (
        <div>
          {/* Overall score */}
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px",
            background:`${COLORS.accent}0d`, borderRadius:10, marginBottom:12,
            border:`1px solid ${COLORS.accent}33` }}>
            <div style={{ textAlign:"center", flexShrink:0 }}>
              <div style={{ fontSize:28, fontWeight:800, color:COLORS.accent, fontFamily:FONTS.head }}>{insights.overall_score}/10</div>
              <div style={{ fontSize:10, color:COLORS.muted }}>Health Score</div>
            </div>
            <div style={{ fontSize:13, color:COLORS.text, lineHeight:1.6 }}>{insights.overall_message}</div>
          </div>

          {/* Individual insights */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
            {(insights.insights||[]).map((ins,i) => (
              <div key={i} style={{ display:"flex", gap:10, padding:"10px 12px",
                borderRadius:10, background:typeBg(ins.type), border:`1px solid ${typeColor(ins.type)}33` }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{ins.icon}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:typeColor(ins.type), marginBottom:3 }}>{ins.title}</div>
                  <div style={{ fontSize:12, color:COLORS.muted, lineHeight:1.5 }}>{ins.message}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Top priority */}
          {insights.top_priority && (
            <div style={{ padding:"10px 14px", borderRadius:10,
              background:`${COLORS.accent3}0d`, border:`1px solid ${COLORS.accent3}44` }}>
              <div style={{ fontWeight:700, fontSize:12, color:COLORS.accent3, marginBottom:4 }}>🎯 TOP PRIORITY</div>
              <div style={{ fontSize:13, color:COLORS.text }}>{insights.top_priority}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ── BloodPressureSugarLog — health vitals tracker ─────────────────────────────

// ── HealthVitalsTab ──
function HealthVitalsTab({ userId, COLORS, FONTS, S }) {
  const [vitals, setVitals] = useState([]);
  const [form, setForm] = useState({ systolic:"", diastolic:"", sugar:"", heartRate:"", date: new Date().toISOString().split("T")[0], time:"morning" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadVitals(); }, []);

  const loadVitals = async () => {
    try {
      const snap = await getDocs(collection(db, "health_vitals"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(v => v.user_id === userId)
        .sort((a,b) => new Date(b.date) - new Date(a.date));
      setVitals(data);
    } catch(e) { setVitals([]); }
    setLoading(false);
  };

  const save = async () => {
    if (!form.systolic && !form.sugar) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "health_vitals"), {
        user_id: userId,
        systolic: form.systolic ? parseInt(form.systolic) : null,
        diastolic: form.diastolic ? parseInt(form.diastolic) : null,
        sugar: form.sugar ? parseFloat(form.sugar) : null,
        heart_rate: form.heartRate ? parseInt(form.heartRate) : null,
        date: form.date,
        time: form.time,
        logged_at: new Date().toISOString(),
      });
      await loadVitals();
      setForm(p => ({ ...p, systolic:"", diastolic:"", sugar:"", heartRate:"" }));
    } catch(e) {}
    setSaving(false);
  };

  const deleteVital = async (id) => { await deleteDoc(doc(db, "health_vitals", id)); loadVitals(); };

  // BP classification
  const getBPStatus = (sys, dia) => {
    if (!sys) return null;
    if (sys < 120 && dia < 80) return { label:"Normal", color:COLORS.success };
    if (sys < 130 && dia < 80) return { label:"Elevated", color:COLORS.accent3 };
    if (sys < 140 || dia < 90) return { label:"High Stage 1", color:"#f97316" };
    if (sys >= 140 || dia >= 90) return { label:"High Stage 2", color:COLORS.warn };
    return null;
  };

  // Sugar classification
  const getSugarStatus = (sugar) => {
    if (!sugar) return null;
    if (sugar < 70) return { label:"Low (Hypoglycemia)", color:COLORS.warn };
    if (sugar < 100) return { label:"Normal (Fasting)", color:COLORS.success };
    if (sugar < 126) return { label:"Pre-diabetic", color:COLORS.accent3 };
    return { label:"High (Diabetic range)", color:COLORS.warn };
  };

  // Latest readings
  const latest = vitals[0];
  const bpStatus = latest ? getBPStatus(latest.systolic, latest.diastolic) : null;
  const sugarStatus = latest ? getSugarStatus(latest.sugar) : null;

  return (
    <div>
      <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>❤️ Health Vitals</div>
      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:16 }}>Track blood pressure, blood sugar and heart rate</div>

      {/* Current readings summary */}
      {latest && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:14 }}>
          {latest.systolic && (
            <div style={{ ...S.metricCard, background:bpStatus?`${bpStatus.color}0d`:"", border:`1px solid ${bpStatus?.color||COLORS.border}33` }}>
              <div style={{ fontSize:10, color:COLORS.muted, fontWeight:700, marginBottom:6 }}>BLOOD PRESSURE</div>
              <div style={{ fontSize:22, fontWeight:800, color:bpStatus?.color||COLORS.text }}>{latest.systolic}/{latest.diastolic}</div>
              <div style={{ fontSize:11, color:bpStatus?.color||COLORS.muted, marginTop:2 }}>{bpStatus?.label||""}</div>
            </div>
          )}
          {latest.sugar && (
            <div style={{ ...S.metricCard, background:sugarStatus?`${sugarStatus.color}0d`:"", border:`1px solid ${sugarStatus?.color||COLORS.border}33` }}>
              <div style={{ fontSize:10, color:COLORS.muted, fontWeight:700, marginBottom:6 }}>BLOOD SUGAR</div>
              <div style={{ fontSize:22, fontWeight:800, color:sugarStatus?.color||COLORS.text }}>{latest.sugar} <span style={{fontSize:12}}>mg/dL</span></div>
              <div style={{ fontSize:11, color:sugarStatus?.color||COLORS.muted, marginTop:2 }}>{sugarStatus?.label||""}</div>
            </div>
          )}
          {latest.heart_rate && (
            <div style={{ ...S.metricCard }}>
              <div style={{ fontSize:10, color:COLORS.muted, fontWeight:700, marginBottom:6 }}>HEART RATE</div>
              <div style={{ fontSize:22, fontWeight:800, color:COLORS.accent }}>{latest.heart_rate} <span style={{fontSize:12}}>bpm</span></div>
              <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>{latest.heart_rate < 60 ? "Low" : latest.heart_rate <= 100 ? "Normal" : "High"}</div>
            </div>
          )}
        </div>
      )}

      {/* Log form */}
      <div style={{ ...S.metricCard, marginBottom:14, border:`1px solid ${COLORS.accent}33`, background:`${COLORS.accent}06` }}>
        <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, color:COLORS.accent, marginBottom:12 }}>➕ Log Vitals</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={S.label}>Date</label>
            <input type="date" style={S.input} value={form.date} max={new Date().toISOString().split("T")[0]}
              onChange={e => setForm(p=>({...p,date:e.target.value}))} />
          </div>
          <div>
            <label style={S.label}>Time of Day</label>
            <select style={S.select} value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))}>
              <option value="morning">🌅 Morning (Fasting)</option>
              <option value="afternoon">☀️ Afternoon</option>
              <option value="evening">🌙 Evening</option>
              <option value="post-meal">🍽️ Post-meal (2hr)</option>
            </select>
          </div>
          <div>
            <label style={S.label}>🩸 Blood Pressure (Systolic/Diastolic)</label>
            <div style={{ display:"flex", gap:6 }}>
              <input type="number" style={{ ...S.input, textAlign:"center" }} placeholder="120" value={form.systolic}
                onChange={e => setForm(p=>({...p,systolic:e.target.value}))} />
              <span style={{ alignSelf:"center", color:COLORS.muted, fontSize:18 }}>/</span>
              <input type="number" style={{ ...S.input, textAlign:"center" }} placeholder="80" value={form.diastolic}
                onChange={e => setForm(p=>({...p,diastolic:e.target.value}))} />
            </div>
          </div>
          <div>
            <label style={S.label}>🍬 Blood Sugar (mg/dL)</label>
            <input type="number" style={S.input} placeholder="e.g. 95" value={form.sugar}
              onChange={e => setForm(p=>({...p,sugar:e.target.value}))} />
          </div>
          <div>
            <label style={S.label}>💓 Heart Rate (bpm)</label>
            <input type="number" style={S.input} placeholder="e.g. 72" value={form.heartRate}
              onChange={e => setForm(p=>({...p,heartRate:e.target.value}))} />
          </div>
        </div>
        <button onClick={save} disabled={(!form.systolic&&!form.sugar&&!form.heartRate)||saving}
          style={{ ...S.btn, opacity:(!form.systolic&&!form.sugar&&!form.heartRate)||saving?0.5:1 }}>
          {saving?"Saving…":"💾 Log Vitals"}
        </button>
      </div>

      {/* Reference ranges */}
      <div style={{ ...S.metricCard, marginBottom:14, background:"rgba(255,255,255,0.02)" }}>
        <div style={{ fontFamily:FONTS.head, fontSize:13, fontWeight:700, marginBottom:10 }}>📊 Reference Ranges</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
          {[
            { label:"BP Normal", value:"< 120/80", color:COLORS.success },
            { label:"BP High", value:"≥ 140/90", color:COLORS.warn },
            { label:"Sugar Normal (Fasting)", value:"70–99 mg/dL", color:COLORS.success },
            { label:"Sugar Pre-diabetic", value:"100–125 mg/dL", color:COLORS.accent3 },
            { label:"Heart Rate Normal", value:"60–100 bpm", color:COLORS.success },
            { label:"Heart Rate High", value:"> 100 bpm", color:COLORS.warn },
          ].map(({label,value,color}) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 10px",
              background:"rgba(255,255,255,0.03)", borderRadius:6, borderLeft:`2px solid ${color}` }}>
              <span style={{ color:COLORS.muted }}>{label}</span>
              <span style={{ fontWeight:600, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History log */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"1rem", color:COLORS.muted }}>Loading…</div>
      ) : vitals.length === 0 ? (
        <div style={{ ...S.metricCard, textAlign:"center", padding:"2rem" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>❤️</div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>No vitals logged yet</div>
          <div style={{ fontSize:13, color:COLORS.muted }}>Log your blood pressure and sugar readings above</div>
        </div>
      ) : (
        <div style={{ ...S.metricCard, padding:0, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", padding:"8px 14px",
            background:"rgba(255,255,255,0.04)", borderBottom:`1px solid ${COLORS.border}` }}>
            {["DATE","TIME","BP","SUGAR","HR"].map(h => (
              <div key={h} style={{ fontSize:9, fontWeight:700, color:COLORS.muted, letterSpacing:0.8 }}>{h}</div>
            ))}
          </div>
          {vitals.slice(0,20).map((v, i) => {
            const bp = getBPStatus(v.systolic, v.diastolic);
            const sg = getSugarStatus(v.sugar);
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",
                padding:"10px 14px", borderBottom: i<vitals.length-1?`1px solid ${COLORS.border}`:"none",
                background: i%2===0?"transparent":"rgba(255,255,255,0.015)", alignItems:"center" }}>
                <div style={{ fontSize:12, color:COLORS.text }}>
                  {new Date(v.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                </div>
                <div style={{ fontSize:11, color:COLORS.muted }}>{v.time}</div>
                <div>
                  {v.systolic ? (
                    <span style={{ fontSize:12, fontWeight:700, color:bp?.color||COLORS.text }}>{v.systolic}/{v.diastolic}</span>
                  ) : <span style={{ color:COLORS.muted }}>—</span>}
                </div>
                <div>
                  {v.sugar ? (
                    <span style={{ fontSize:12, fontWeight:700, color:sg?.color||COLORS.text }}>{v.sugar}</span>
                  ) : <span style={{ color:COLORS.muted }}>—</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:12, color:COLORS.accent }}>{v.heart_rate || "—"}</span>
                  <button onClick={() => deleteVital(v.id)}
                    style={{ background:"transparent", border:"none", color:`${COLORS.warn}66`, cursor:"pointer", fontSize:12 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ── Auto-calculate sleep quality from hours ──────────────────────────────────

function getSleepQuality(hours) {
  const h = parseFloat(hours) || 0;
  if (h >= 7 && h <= 9)  return { label:"Excellent", color:"#10e8b8", emoji:"😴", quality:5 };
  if (h >= 6 && h < 7)   return { label:"Good",      color:"#5b9cf6", emoji:"🙂", quality:4 };
  if (h >= 5 && h < 6)   return { label:"Fair",       color:"#fb8c3f", emoji:"😐", quality:3 };
  if (h > 9)              return { label:"Too Much",   color:"#f5c543", emoji:"🥱", quality:4 };
  return                         { label:"Poor",       color:"#f5455c", emoji:"😩", quality:2 };
}

const HEALTH_DRINKS = [
  { name:"Lemon Honey Ginger Water", emoji:"🍋", benefits:"Boosts immunity, aids digestion, alkalizes body", recipe:"1 glass warm water + juice of ½ lemon + 1 tsp honey + ½ inch grated ginger. Drink on empty stomach.", time:"5 min", category:"Morning Detox", calories:25 },
  { name:"Turmeric Golden Milk", emoji:"🥛", benefits:"Anti-inflammatory, improves sleep, boosts immunity", recipe:"1 cup warm milk + ½ tsp turmeric + ¼ tsp cinnamon + pinch black pepper + 1 tsp honey. Mix well.", time:"5 min", category:"Evening", calories:120 },
  { name:"Amla Juice", emoji:"🫙", benefits:"Highest vitamin C, anti-aging, boosts metabolism", recipe:"2 amla fruits blended with ½ cup water. Strain. Add pinch black salt. Or buy ready-made and dilute.", time:"5 min", category:"Morning", calories:30 },
  { name:"Jeera (Cumin) Water", emoji:"💧", benefits:"Boosts metabolism by 25%, reduces bloating, aids digestion", recipe:"1 tsp cumin seeds soaked in 2 cups water overnight. Boil for 5 min, strain, drink warm.", time:"Overnight + 5 min", category:"Morning Detox", calories:5 },
  { name:"Cinnamon Green Tea", emoji:"🍵", benefits:"Controls blood sugar, boosts metabolism, antioxidants", recipe:"1 green tea bag + ½ inch cinnamon stick. Steep in hot water 3-4 min. Add lemon if desired.", time:"5 min", category:"Anytime", calories:5 },
  { name:"Coconut Water & Lime", emoji:"🥥", benefits:"Natural electrolytes, hydration, post-workout recovery", recipe:"1 fresh coconut water + juice of ½ lime + pinch of black salt. Serve cold.", time:"2 min", category:"Post-Workout", calories:50 },
  { name:"Beetroot Carrot Juice", emoji:"🥕", benefits:"Iron-rich, improves stamina, detoxifies liver", recipe:"1 small beetroot + 2 carrots + 1 inch ginger. Juice together. Add lemon juice. Drink fresh.", time:"10 min", category:"Morning", calories:80 },
  { name:"Sabja (Basil Seeds) Drink", emoji:"🌿", benefits:"Cools body, controls blood sugar, rich in fibre", recipe:"1 tsp sabja seeds soaked 15 min in water. Add to 1 glass cold water + lemon + honey.", time:"15 min", category:"Cooling", calories:20 },
  { name:"Ash Gourd Juice", emoji:"🫛", benefits:"Detoxifies, improves mental clarity, weight loss", recipe:"200g ash gourd (white pumpkin) peeled and blended with ½ cup water. Strain. Add cumin powder.", time:"10 min", category:"Morning Detox", calories:15 },
  { name:"Pomegranate Mint Cooler", emoji:"🍹", benefits:"High antioxidants, heart health, reduces inflammation", recipe:"½ cup pomegranate seeds blended + 5-6 mint leaves + 1 glass cold water. Strain. Add black salt.", time:"8 min", category:"Anytime", calories:60 },
  { name:"Moringa Green Smoothie", emoji:"🌱", benefits:"92 nutrients, protein-rich, energy booster", recipe:"1 tsp moringa powder + 1 banana + 1 cup spinach + 1 cup coconut milk. Blend. Add honey.", time:"5 min", category:"Breakfast", calories:180 },
  { name:"Apple Cider Vinegar Drink", emoji:"🍎", benefits:"Improves digestion, controls blood sugar, weight loss", recipe:"1 tbsp ACV + 1 glass water + 1 tsp honey + pinch cinnamon. Drink before meals.", time:"2 min", category:"Before Meals", calories:15 },
];

const HEALTHY_SOUPS = [
  { name:"Tomato Soup", emoji:"🍅", benefits:"Lycopene antioxidant, vitamin C, very low calorie", recipe:"4 tomatoes + 1 onion + 2 garlic cloves. Roast, blend. Add vegetable stock, salt, pepper, basil. Simmer 10 min.", time:"25 min", calories:70, difficulty:"Easy" },
  { name:"Moong Dal Soup", emoji:"🫘", benefits:"High plant protein, easily digestible, anti-inflammatory", recipe:"½ cup yellow moong dal + 4 cups water. Pressure cook 3 whistles. Season with turmeric, cumin, ginger, salt.", time:"20 min", calories:120, difficulty:"Easy" },
  { name:"Spinach & Garlic Soup", emoji:"🥬", benefits:"Iron, folate, bone-protective vitamin K, antioxidants", recipe:"2 cups spinach + 4 garlic cloves + 1 onion. Sauté, add stock, blend. Season with pepper and nutmeg.", time:"20 min", calories:60, difficulty:"Easy" },
  { name:"Carrot Ginger Soup", emoji:"🥕", benefits:"Beta-carotene, anti-nausea, immune booster, anti-inflammatory", recipe:"3 carrots + 2 inch ginger + 1 onion + vegetable stock. Boil until soft, blend. Add coconut milk.", time:"30 min", calories:90, difficulty:"Easy" },
  { name:"Chicken Clear Soup", emoji:"🍗", benefits:"Collagen, electrolytes, anti-inflammatory, aids recovery", recipe:"500g chicken bones + 4 cups water + ginger + garlic + vegetables. Simmer 45 min. Strain. Season.", time:"1 hour", calories:80, difficulty:"Easy" },
  { name:"Mushroom Soup", emoji:"🍄", benefits:"Vitamin D, B vitamins, immunity boosting beta-glucans", recipe:"250g mushrooms + 1 onion + 2 garlic + 2 cups vegetable stock. Sauté, add stock, blend half.", time:"25 min", calories:100, difficulty:"Easy" },
  { name:"Lentil (Masoor Dal) Soup", emoji:"🫙", benefits:"High protein, fibre, iron, folate — complete meal in a bowl", recipe:"1 cup masoor dal + 1 onion + 2 tomatoes + cumin + turmeric + 4 cups water. Pressure cook. Add lemon.", time:"25 min", calories:180, difficulty:"Easy" },
  { name:"Broccoli Soup", emoji:"🥦", benefits:"Sulforaphane (cancer-fighting), vitamin C, calcium, fibre", recipe:"2 cups broccoli + 1 potato + 1 onion + vegetable stock. Boil, blend, season with pepper and nutmeg.", time:"25 min", calories:85, difficulty:"Easy" },
  { name:"Sweet Corn Soup", emoji:"🌽", benefits:"Antioxidants lutein & zeaxanthin (eye health), energy", recipe:"1 cup corn kernels + 4 cups vegetable stock. Blend half, mix with whole kernels. Add corn starch slurry.", time:"20 min", calories:110, difficulty:"Easy" },
  { name:"Rasam (Pepper Soup)", emoji:"🌶️", benefits:"Digestive, anti-cold remedy, iron absorption booster", recipe:"1 tsp tamarind paste + 1 tomato + ½ tsp pepper + cumin + turmeric + curry leaves. Boil 10 min.", time:"15 min", calories:40, difficulty:"Easy" },
  { name:"Pumpkin Soup", emoji:"🎃", benefits:"Beta-carotene, vitamin A, very low calorie, high fibre", recipe:"500g pumpkin cubed + 1 onion + 2 garlic + vegetable stock. Roast pumpkin, blend with stock.", time:"35 min", calories:75, difficulty:"Easy" },
  { name:"Green Detox Soup", emoji:"🥗", benefits:"Chlorophyll detox, fibre-rich, alkalizing, weight loss", recipe:"Spinach + cucumber + celery + ginger + vegetable stock. Blend cold for gazpacho or serve warm.", time:"10 min", calories:55, difficulty:"Very Easy" },
];

// ── SleepTracker ──
function SleepTracker({ userId, sleepLogs, onSaved, COLORS, FONTS, S }) {
  const [hours, setHours] = useState("7");
  const [date, setDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate()-1);
    return d.toISOString().split("T")[0];
  });
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const autoQ = getSleepQuality(hours);
  const save = async () => {
    if (!hours || parseFloat(hours) <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "sleep_logs"), {
        user_id: userId, hours: parseFloat(hours),
        quality: autoQ.quality, date, logged_at: new Date().toISOString(),
      });
      onSaved();
      const d = new Date(date); d.setDate(d.getDate()-1);
      setDate(d.toISOString().split("T")[0]);
      setHours("7");
    } catch(e) {}
    setSaving(false);
  };

  const deleteSleep = async (id) => { await deleteDoc(doc(db, "sleep_logs", id)); onSaved(); };

  // Last 7 days stats
  const last7 = sleepLogs.slice(0,7);
  const avgHours = last7.length > 0 ? (last7.reduce((s,l) => s+l.hours, 0) / last7.length).toFixed(1) : 0;
  const avgQuality = last7.length > 0 ? Math.round(last7.reduce((s,l) => s+l.quality, 0) / last7.length) : 0;
  const sleepScore = avgHours > 0 ? Math.min(100, Math.round((Math.min(avgHours, 8)/8)*60 + (avgQuality/5)*40)) : 0;
  const scoreColor = sleepScore >= 75 ? COLORS.success : sleepScore >= 50 ? COLORS.accent3 : COLORS.warn;

  return (
    <div style={{ ...S.metricCard, marginBottom:14 }}>
      <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:700, marginBottom:12 }}>😴 Sleep Tracker</div>

      {/* Weekly summary */}
      {last7.length > 0 && (
        <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
          {[
            { label:"Avg Sleep", value:`${avgHours}h`, color:COLORS.accent2 },
            { label:"Quality", value:`${getSleepQuality(avgHours).emoji} ${getSleepQuality(avgHours).label}`, color:getSleepQuality(avgHours).color },
            { label:"Sleep Score", value:`${sleepScore}/100`, color:scoreColor },
          ].map(({label,value,color}) => (
            <div key={label} style={{ flex:1, minWidth:80, background:`${color}10`, borderRadius:10,
              padding:"10px 12px", border:`1px solid ${color}30`, textAlign:"center" }}>
              <div style={{ fontSize:15, fontWeight:700, color }}>{value}</div>
              <div style={{ fontSize:10, color:COLORS.muted, marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Log sleep form */}
      <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:10, padding:"12px", marginBottom:12, border:`1px solid ${COLORS.border}` }}>
        <div style={{ fontSize:13, fontWeight:600, color:COLORS.muted, marginBottom:10 }}>Log Last Night's Sleep</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={S.label}>Date (night of)</label>
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)}
              style={{ ...S.input, padding:"8px 12px", fontSize:13 }} />
          </div>
          <div>
            <label style={S.label}>Hours slept</label>
            <input type="number" min="1" max="14" step="0.5" value={hours}
              onChange={e => setHours(e.target.value)}
              style={{ ...S.input, padding:"8px 12px", fontSize:13 }} placeholder="7" />
          </div>
        </div>
        {/* Auto quality indicator */}
        {hours && parseFloat(hours) > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
            borderRadius:10, marginBottom:10,
            background:autoQ.color+"10", border:"1.5px solid "+autoQ.color+"44" }}>
            <span style={{ fontSize:22 }}>{autoQ.emoji}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:autoQ.color }}>{autoQ.label} Sleep</div>
              <div style={{ fontSize:11, color:COLORS.muted, marginTop:1 }}>
                {parseFloat(hours)<6.5 ? "💡 Try going to bed earlier to reach 7+ hours"
                  : parseFloat(hours)>9 ? "✅ Great sleep! Well-rested"
                  : "✅ Optimal 7-9h range"}
              </div>
            </div>
          </div>
        )}
        <button onClick={save} disabled={!hours||saving}
          style={{ ...S.btn, padding:"10px 24px", opacity:!hours||saving?0.5:1 }}>
          {saving?"Saving…":"💾 Log Sleep"}
        </button>
      </div>

      {/* Sleep log history */}
      {sleepLogs.length > 0 && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:COLORS.muted, marginBottom:8 }}>RECENT SLEEP LOG</div>
          {sleepLogs.slice(0,7).map((log, i) => {
            const q = getSleepQuality(log.hours);
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                background:"rgba(255,255,255,0.03)", borderRadius:8, marginBottom:4,
                borderLeft:`3px solid ${q.color}` }}>
                <span style={{ fontSize:11, color:COLORS.muted, minWidth:80 }}>
                  {new Date(log.date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
                </span>
                <span style={{ fontSize:14, fontWeight:700, color:COLORS.accent2 }}>{log.hours}h</span>
                <span style={{ fontSize:14 }}>{q.emoji}</span>
                <span style={{ fontSize:12, fontWeight:600, color:q.color, flex:1 }}>{q.label}</span>
                <button onClick={() => deleteSleep(log.id)}
                  style={{ background:"transparent", border:"none", color:`${COLORS.warn}77`, cursor:"pointer", fontSize:13 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ── CalorieBurnTab — log and view activity calorie burns ─────────────────────

// ── CalorieBurnTab ──
function CalorieBurnTab({ userId, calorieBurns, onBurnSaved, COLORS, FONTS, S }) {
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("30");
  const [customCal, setCustomCal] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [viewDays, setViewDays] = useState(7);

  const today = new Date().toISOString().split("T")[0];

  // Auto-calculate calories from activity + duration
  const actInfo = ACTIVITIES.find(a => a.id === activity);
  const autoCal = actInfo ? Math.round(actInfo.calPerMin * parseFloat(duration || 0)) : 0;
  const finalCal = customCal ? parseInt(customCal) : autoCal;

  const save = async () => {
    if (!activity || !finalCal) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "calorie_burns"), {
        user_id: userId, activity,
        calories: finalCal,
        duration_mins: parseInt(duration) || 0,
        logged_date: date,
        logged_at: new Date().toISOString(),
      });
      onBurnSaved();
      setActivity(""); setDuration("30"); setCustomCal("");
      setDate(today);
    } catch(e) {}
    setSaving(false);
  };

  const deleteburn = async (id) => {
    await deleteDoc(doc(db, "calorie_burns", id));
    onBurnSaved();
  };

  // Group by date
  const byDate = {};
  calorieBurns.forEach(b => {
    if (!byDate[b.logged_date]) byDate[b.logged_date] = [];
    byDate[b.logged_date].push(b);
  });

  // Last N days for chart
  const days = Array.from({length:viewDays}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (viewDays-1-i));
    return d.toISOString().split("T")[0];
  });
  const chartData = days.map(d => ({
    date: d,
    total: (byDate[d] || []).reduce((s,b) => s+b.calories, 0),
    label: new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short"}),
  }));
  const maxCal = Math.max(500, ...chartData.map(d => d.total));

  // Weekly total
  const weekTotal = chartData.reduce((s,d) => s+d.total, 0);

  // Activity colors
  const actColors = { walking:"#4f8ef7", strength:"#f7934f", cardio:"#f7504f",
    yoga:"#9b7cf8", swimming:"#00d4aa", running:"#f5c543", cycling:"#10e8b8" };

  return (
    <div>
      <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>🔥 Calorie Burn</div>
      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:16 }}>Track calories burned through exercise and activity</div>

      {/* Log activity form */}
      <div style={{ ...S.metricCard, marginBottom:14, border:`1px solid ${COLORS.accent3}33`, background:`${COLORS.accent3}06` }}>
        <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, color:COLORS.accent3, marginBottom:12 }}>➕ Log Activity</div>

        {/* Date + Duration row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={S.label}>Date</label>
            <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={{ ...S.input, padding:"8px 12px", fontSize:13 }} />
          </div>
          <div>
            <label style={S.label}>Duration (minutes)</label>
            <input type="number" min="1" max="300" value={duration} onChange={e => setDuration(e.target.value)}
              style={{ ...S.input, padding:"8px 12px", fontSize:13 }} placeholder="30" />
          </div>
        </div>

        {/* Activity selector */}
        <div style={{ marginBottom:10 }}>
          <label style={S.label}>Activity Type</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {ACTIVITIES.map(a => (
              <button key={a.id} onClick={() => { setActivity(a.id); setCustomCal(""); }}
                style={{ padding:"8px 14px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:activity===a.id?700:400,
                  border:`2px solid ${activity===a.id?(actColors[a.id]||COLORS.accent):COLORS.border}`,
                  background:activity===a.id?`${actColors[a.id]||COLORS.accent}18`:"transparent",
                  color:activity===a.id?(actColors[a.id]||COLORS.accent):COLORS.muted }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calories display */}
        {activity && (
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.06)",
              borderRadius:9, padding:"6px 14px", border:`1.5px solid ${COLORS.accent3}44` }}>
              <input type="number" min="0" max="9999"
                style={{ width:72, background:"transparent", border:"none", outline:"none",
                  fontSize:18, fontWeight:700, color:COLORS.accent3, textAlign:"center" }}
                value={customCal || autoCal || ""}
                onChange={e => setCustomCal(e.target.value)}
                placeholder="0" />
              <span style={{ fontSize:12, color:COLORS.muted }}>kcal</span>
            </div>
            {autoCal > 0 && !customCal && (
              <span style={{ fontSize:11, color:COLORS.muted }}>auto-calculated · edit if needed</span>
            )}
            <button onClick={save} disabled={!activity || !finalCal || saving}
              style={{ marginLeft:"auto", padding:"10px 28px", borderRadius:9, border:"none",
                background:`linear-gradient(135deg,${COLORS.accent3},${COLORS.warn})`,
                color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer",
                opacity:!activity||!finalCal||saving?0.5:1 }}>
              {saving?"Saving…":"🔥 Log Burn"}
            </button>
          </div>
        )}
      </div>

      {/* Weekly summary */}
      <div style={{ ...S.metricCard, marginBottom:14, background:`${COLORS.accent3}08`, border:`1px solid ${COLORS.accent3}30` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700 }}>📊 Calorie Burn History</div>
            <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>
              Total this period: <b style={{ color:COLORS.accent3 }}>{weekTotal} kcal</b>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[7,14,30].map(d => (
              <button key={d} onClick={() => setViewDays(d)}
                style={{ padding:"5px 12px", borderRadius:8, fontSize:12, cursor:"pointer",
                  border:`1px solid ${viewDays===d?COLORS.accent3:COLORS.border}`,
                  background:viewDays===d?`${COLORS.accent3}18`:"transparent",
                  color:viewDays===d?COLORS.accent3:COLORS.muted, fontWeight:viewDays===d?700:400 }}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        {chartData.some(d => d.total > 0) ? (
          <svg viewBox={`0 0 ${chartData.length * 40} 120`} style={{ width:"100%", height:"auto" }}>
            {chartData.map((d, i) => {
              const barH = Math.max(2, (d.total / maxCal) * 80);
              const x = i * 40 + 8;
              const col = d.total > 0 ? COLORS.accent3 : "rgba(255,255,255,0.1)";
              return (
                <g key={i}>
                  <rect x={x} y={100-barH} width={24} height={barH} rx="4" fill={col} opacity="0.85" />
                  {d.total > 0 && <text x={x+12} y={96-barH} textAnchor="middle" fill={col} fontSize="8" fontWeight="700">{d.total}</text>}
                  <text x={x+12} y={112} textAnchor="middle" fill="#8892aa" fontSize="7">{d.label.split(" ")[0]}</text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div style={{ textAlign:"center", padding:"1rem", color:COLORS.muted, fontSize:13 }}>No activity logged yet</div>
        )}
      </div>

      {/* Activity log list by date */}
      {Object.entries(byDate).slice(0, 10).map(([date, burns]) => {
        const dayTotal = burns.reduce((s,b) => s+b.calories, 0);
        return (
          <div key={date} style={{ ...S.metricCard, marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>
                {date === today ? "Today" : new Date(date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
              </div>
              <div style={{ fontWeight:700, color:COLORS.accent3, fontSize:14 }}>🔥 {dayTotal} kcal</div>
            </div>
            {burns.map((b, i) => {
              const col = actColors[b.activity] || COLORS.accent;
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px",
                  background:"rgba(255,255,255,0.03)", borderRadius:8, marginBottom:4,
                  borderLeft:`3px solid ${col}` }}>
                  <span style={{ fontSize:13, flex:1, fontWeight:500 }}>
                    {ACTIVITIES.find(a=>a.id===b.activity)?.label || b.activity}
                  </span>
                  {b.duration_mins > 0 && <span style={{ fontSize:11, color:COLORS.muted }}>{b.duration_mins} min</span>}
                  <span style={{ fontSize:13, fontWeight:700, color:col }}>{b.calories} kcal</span>
                  <button onClick={() => deleteburn(b.id)}
                    style={{ background:"transparent", border:"none", color:`${COLORS.warn}77`, cursor:"pointer", fontSize:13 }}>✕</button>
                </div>
              );
            })}
          </div>
        );
      })}
      {calorieBurns.length === 0 && (
        <div style={{ ...S.metricCard, textAlign:"center", padding:"2rem" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🏃</div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>No activities logged yet</div>
          <div style={{ fontSize:13, color:COLORS.muted }}>Log your first workout above to start tracking calories burned!</div>
        </div>
      )}
    </div>
  );
}
// ── Weekly Schedule with expandable exercise rows ────────────────────────────

// ── FoodLog ──
function FoodLog({ userId, foodLogs, onLogsChange, profile, S, COLORS, FONTS }) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // ── Calorie target: TDEE-based (Mifflin-St Jeor BMR × activity multiplier)
  // BMR = 10×weight + 6.25×height - 5×age + 5 (male) / -161 (female)
  // TDEE = BMR × activity factor (1.2 sedentary → 1.55 active)
  // Target = TDEE - 500 for weight loss, TDEE for maintenance
  const bmr0 = (profile.weight && profile.height && profile.age)
    ? calcBMR(+profile.weight, +profile.height, +profile.age, profile.gender||"Male")
    : 1800;
  const actMult = profile.fitnessLevel==="Active"?1.55:profile.fitnessLevel==="Moderate"?1.375:1.2;
  const tdee = Math.round(bmr0 * actMult);
  const isLose = profile.goal?.toLowerCase().includes("lose");
  const targetCal = isLose ? tdee - 500 : tdee;
  const dailyWaterTarget = +((parseFloat(profile.weight)||70)*0.033 +
    (profile.fitnessLevel==="Active"?0.75:profile.fitnessLevel==="Moderate"?0.5:0.25)).toFixed(1);

  const MEAL_LIST = [
    { id:"Breakfast",     icon:"🌅", label:"Breakfast",     color:"#f7934f" },
    { id:"Lunch",         icon:"☀️",  label:"Lunch",         color:"#00d4aa" },
    { id:"Evening Snack", icon:"🍎", label:"Evening Snack", color:"#4f8ef7" },
    { id:"Dinner",        icon:"🌙", label:"Dinner",        color:"#a78bfa" },
    { id:"Munching",      icon:"🥜", label:"Munching",      color:"#f7504f" },
    { id:"Fruits",        icon:"🍉", label:"Fruits",        color:"#22c55e" },
  ];

  // Group logs by date + meal
  const logsByDate = {};
  (foodLogs||[]).forEach(l => {
    const k = l.logged_date;
    if (!logsByDate[k]) logsByDate[k] = {};
    if (!logsByDate[k][l.meal_type]) logsByDate[k][l.meal_type] = [];
    logsByDate[k][l.meal_type].push(l);
  });

  const viewLogs = logsByDate[selectedDate] || {};
  // Only food calories (not water ml)
  const viewTotal = Object.entries(viewLogs)
    .filter(([mType]) => mType !== "Water")
    .flatMap(([,entries]) => entries)
    .reduce((s,l) => s+(l.calories||0), 0);

  const deleteEntry = async (id) => { await sbDeleteFoodLog(id); onLogsChange(); };
  const statusColor = (s) => s==="healthy"?COLORS.success:s==="moderate"?COLORS.accent3:COLORS.warn;

  const pct = Math.min(100, Math.round(viewTotal/targetCal*100));
  const barColor = viewTotal>targetCal?COLORS.warn:viewTotal>=targetCal*0.85?COLORS.success:COLORS.accent;

  return (
    <div>
      {/* Header */}
      <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>🍱 Food Log</div>
      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:4 }}>
        Tap a meal → click + to add food items
      </div>
      {/* Calorie source explanation */}
      <div style={{ fontSize:11, color:COLORS.muted, background:`${COLORS.accent}0d`,
        borderRadius:8, padding:"6px 12px", marginBottom:14, display:"inline-block" }}>
        📊 Target: <b style={{color:COLORS.accent}}>{targetCal} kcal</b>
        {" "}= BMR ({bmr0} kcal) × activity ({actMult}×){isLose?" − 500 kcal deficit":""}
        {" "}| Goal: {profile.goal || "Maintain"}
      </div>

      {/* Date selector */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
        <input type="date" value={selectedDate} max={today}
          onChange={e => setSelectedDate(e.target.value)}
          style={{ ...S.input, width:"auto", padding:"7px 14px", fontSize:13 }} />
        {[-1,0].map(offset => {
          const d = new Date(); d.setDate(d.getDate()+offset);
          const ds = d.toISOString().split("T")[0];
          return (
            <button key={offset} onClick={() => setSelectedDate(ds)}
              style={{ padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
                border:`1px solid ${selectedDate===ds?COLORS.accent:COLORS.border}`,
                background:selectedDate===ds?`${COLORS.accent}20`:"transparent",
                color:selectedDate===ds?COLORS.accent:COLORS.muted }}>
              {offset===0?"Today":"Yesterday"}
            </button>
          );
        })}
      </div>

      {/* Calorie summary bar */}
      <div style={{ ...S.metricCard, marginBottom:14, background:`${barColor}08`, border:`1px solid ${barColor}30` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6 }}>
          <div>
            <span style={{ fontFamily:FONTS.head, fontSize:26, fontWeight:700, color:barColor }}>{viewTotal}</span>
            <span style={{ fontSize:13, color:COLORS.muted }}> / {targetCal} kcal</span>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {MEAL_LIST.map(m => {
              const mc = (viewLogs[m.id]||[]).reduce((s,l)=>s+(l.calories||0),0);
              if (!mc) return null;
              return <span key={m.id} style={{ fontSize:12, color:COLORS.muted }}>{m.icon} {mc}</span>;
            })}
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:barColor }}>
            {viewTotal>targetCal
              ? `⚠️ ${viewTotal-targetCal} kcal over`
              : `${targetCal-viewTotal} kcal remaining`}
          </span>
        </div>
        <div style={{ height:8, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`,
            background:`linear-gradient(90deg,${barColor},${barColor}cc)`,
            borderRadius:4, transition:"width 0.4s" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:COLORS.muted, marginTop:3 }}>
          <span>0</span><span>{Math.round(targetCal*0.5)}</span><span>{targetCal}</span>
        </div>
      </div>

      {/* Macro Breakdown */}
      {(() => {
        const entries = Object.entries(viewLogs).filter(([m])=>m!=="Water").flatMap(([,e])=>e);
        if (!entries.length) return null;
        const totP = entries.reduce((s,l)=>{ const m=getFoodMacros(l.food_name); return s+(m?.p||0); },0);
        const totC = entries.reduce((s,l)=>{ const m=getFoodMacros(l.food_name); return s+(m?.c||0); },0);
        const totF = entries.reduce((s,l)=>{ const m=getFoodMacros(l.food_name); return s+(m?.f||0); },0);
        const totMacro = totP + totC + totF || 1;
        const pPct = Math.round(totP/totMacro*100);
        const cPct = Math.round(totC/totMacro*100);
        const fPct = 100 - pPct - cPct;
        const segs = [
          { label:"Protein", g:totP, pct:pPct, color:"#5b9cf6" },
          { label:"Carbs",   g:totC, pct:cPct, color:"#f7934f" },
          { label:"Fat",     g:totF, pct:fPct, color:"#f5c543" },
        ];
        const R=28, cx=36, cy=36, circ=2*Math.PI*R;
        let cumPct = 0;
        const arcs = segs.map(s => {
          const dash = (s.pct/100)*circ;
          const offset = -cumPct/100*circ - circ/4;
          cumPct += s.pct;
          return { ...s, dash, offset };
        });
        return (
          <div style={{ ...S.metricCard, marginBottom:14, display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ flexShrink:0 }}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                {arcs.map((a,i)=>(
                  <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={a.color} strokeWidth="10"
                    strokeDasharray={`${a.dash} ${circ-a.dash}`} strokeDashoffset={a.offset} strokeLinecap="butt" />
                ))}
                <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fill="#f0f4ff" fontSize="9" fontWeight="700">macros</text>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:FONTS.head, fontSize:12, fontWeight:700, color:COLORS.muted, marginBottom:8 }}>MACRO BREAKDOWN</div>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                {segs.map(s=>(
                  <div key={s.label}>
                    <div style={{ fontSize:10, color:s.color, fontWeight:700 }}>{s.label}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:COLORS.text }}>{s.g}g</div>
                    <div style={{ fontSize:10, color:COLORS.muted }}>{s.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Water tracker */}
      <WaterLog userId={userId} loggedDate={selectedDate} foodLogs={foodLogs}
        onLogsChange={onLogsChange} targetWater={dailyWaterTarget}
        COLORS={COLORS} FONTS={FONTS} S={S} />

      {/* Meal sections */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {MEAL_LIST.map(meal => {
          const entries = viewLogs[meal.id] || [];
          const mealTotal = entries.reduce((s,l)=>s+(l.calories||0),0);
          return (
            <MealSection key={meal.id}
              meal={meal} entries={entries} mealTotal={mealTotal}
              userId={userId} loggedDate={selectedDate}
              onLogsChange={onLogsChange} deleteEntry={deleteEntry}
              statusColor={statusColor} COLORS={COLORS} FONTS={FONTS} S={S} />
          );
        })}
      </div>
    </div>
  );
}

// ── MealSection — expandable meal card with food entries + add button ─────────

// ── FriendsTab ──
function FriendsTab({ currentUser, userLogs, foodLogs, sleepLogs, calorieBurns, metrics, COLORS, FONTS, S, notify }) {
  const [searchUser, setSearchUser] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [viewingFriend, setViewingFriend] = useState(null);
  const [friendData, setFriendData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFriendsData(); }, [currentUser.id]);

  const loadFriendsData = async () => {
    setLoading(true);
    try {
      const reqSnap = await getDocs(collection(db, "friend_requests"));
      const allReq = reqSnap.docs.map(d => ({ id:d.id,...d.data() }));
      setRequests(allReq.filter(r => r.to_id===currentUser.id && r.status==="pending"));
      setSentRequests(allReq.filter(r => r.from_id===currentUser.id && r.status==="pending"));
      const fSnap = await getDocs(collection(db, "friends"));
      const myF = fSnap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(f=>f.user1_id===currentUser.id||f.user2_id===currentUser.id);
      const fIds = myF.map(f=>f.user1_id===currentUser.id?f.user2_id:f.user1_id);
      if (fIds.length>0) {
        const uSnap = await getDocs(collection(db,"users"));
        const allU = uSnap.docs.map(d=>({id:d.id,...d.data()}));
        setFriends(fIds.map(id=>allU.find(u=>u.id===id)).filter(Boolean));
      } else setFriends([]);
    } catch(e) {}
    setLoading(false);
  };

  const searchForUser = async () => {
    if (!searchUser.trim()) return;
    setSearching(true); setSearchResult(null);
    try {
      const snap = await getDocs(collection(db,"users"));
      const found = snap.docs.map(d=>({id:d.id,...d.data()}))
        .find(u=>(u.username||"").toLowerCase()===searchUser.trim().toLowerCase()&&u.id!==currentUser.id&&u.role!=="admin");
      setSearchResult(found||"notfound");
    } catch(e) {}
    setSearching(false);
  };

  const sendRequest = async (toUser) => {
    if (sentRequests.find(r=>r.to_id===toUser.id)||friends.find(f=>f.id===toUser.id)) {
      notify("Already sent or already friends"); return;
    }
    try {
      await addDoc(collection(db,"friend_requests"),{
        from_id:currentUser.id, from_name:currentUser.name||currentUser.username,
        from_username:currentUser.username, to_id:toUser.id,
        to_username:toUser.username, status:"pending", created_at:new Date().toISOString(),
      });
      notify("Friend request sent to @"+toUser.username);
      setSearchUser(""); setSearchResult(null); loadFriendsData();
    } catch(e) { notify("Failed to send request"); }
  };

  const respondToRequest = async (req, accept) => {
    try {
      await updateDoc(doc(db,"friend_requests",req.id),{status:accept?"accepted":"rejected"});
      if (accept) {
        await addDoc(collection(db,"friends"),{user1_id:req.from_id,user2_id:req.to_id,created_at:new Date().toISOString()});
        notify("Now friends with "+req.from_name);
      } else notify("Request declined");
      loadFriendsData();
    } catch(e) {}
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm("Remove this friend?")) return;
    try {
      const snap = await getDocs(collection(db,"friends"));
      const toDelete = snap.docs.find(d=>(d.data().user1_id===currentUser.id&&d.data().user2_id===friendId)||(d.data().user2_id===currentUser.id&&d.data().user1_id===friendId));
      if (toDelete) await deleteDoc(doc(db,"friends",toDelete.id));
      setViewingFriend(null); setFriendData(null); loadFriendsData();
    } catch(e) {}
  };

  const viewFriendProgress = async (friend) => {
    setViewingFriend(friend); setFriendData(null);
    try {
      const [ls,fs,ss,bs] = await Promise.all([
        getDocs(collection(db,"weight_logs")),getDocs(collection(db,"food_logs")),
        getDocs(collection(db,"sleep_logs")),getDocs(collection(db,"calorie_burns")),
      ]);
      const fl = (snap) => snap.docs.map(d=>({id:d.id,...d.data()})).filter(d=>d.user_id===friend.id);
      setFriendData({ logs:fl(ls).sort((a,b)=>new Date(a.logged_at)-new Date(b.logged_at)), food:fl(fs), sleep:fl(ss), burns:fl(bs), profile:friend.profile_data||{} });
    } catch(e) {}
  };

  if (viewingFriend) {
    const d = friendData;
    const logs = d?.logs||[];
    const first=logs[0], latest=logs[logs.length-1];
    const lost = first&&latest ? +(first.weight-latest.weight).toFixed(1) : 0;
    const streak = d ? calcStreak(logs) : 0;
    const p = d?.profile||{};
    const bmi = p.weight&&p.height ? calcBMI(+p.weight,+p.height) : null;
    const bmiC = bmi ? bmiCategory(bmi) : null;
    const avgSleep = d?.sleep?.length>0 ? (d.sleep.slice(0,7).reduce((s,l)=>s+l.hours,0)/Math.min(7,d.sleep.length)).toFixed(1) : null;
    const weekBurns = d?.burns?.slice(0,7).reduce((s,b)=>s+b.calories,0)||0;
    return (
      <div>
        <button onClick={()=>{setViewingFriend(null);setFriendData(null);}} style={{...S.btnSm,marginBottom:14}}>← Back</button>
        <div style={{...S.metricCard,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{width:50,height:50,borderRadius:"50%",background:`linear-gradient(135deg,${COLORS.accent},${COLORS.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#07121f"}}>
              {(viewingFriend.name||viewingFriend.username||"?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{fontFamily:FONTS.head,fontSize:16,fontWeight:700}}>{viewingFriend.name||viewingFriend.username}</div>
              <div style={{fontSize:12,color:COLORS.muted}}>@{viewingFriend.username}{p.goal?" · "+p.goal:""}</div>
            </div>
          </div>
          {!d ? <div style={{textAlign:"center",padding:"1rem",color:COLORS.muted}}>Loading…</div> : (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {[
                  {label:"Weight Lost",value:lost>0?"▼ "+lost+" kg":lost<0?"▲ "+Math.abs(lost)+" kg":"No change",color:lost>0?COLORS.success:lost<0?COLORS.warn:COLORS.muted},
                  {label:"Current Weight",value:latest?latest.weight+" kg":p.weight?p.weight+" kg":"—",color:COLORS.accent2},
                  {label:"Log Streak",value:streak+" days 🔥",color:streak>0?COLORS.accent3:COLORS.muted},
                  {label:"Total Logs",value:logs.length+" entries",color:COLORS.accent},
                  bmi?{label:"BMI",value:bmi+" · "+(bmiC?.label||""),color:bmiC?.color||COLORS.muted}:null,
                  avgSleep?{label:"Avg Sleep",value:avgSleep+"h/night",color:COLORS.accent2}:null,
                  weekBurns>0?{label:"Cals Burned (7d)",value:weekBurns+" kcal",color:COLORS.accent3}:null,
                ].filter(Boolean).map(({label,value,color})=>(
                  <div key={label} style={{...S.metricCard,background:color+"0a",border:"1px solid "+color+"30"}}>
                    <div style={{fontSize:11,color:COLORS.muted,marginBottom:4}}>{label}</div>
                    <div style={{fontSize:14,fontWeight:700,color}}>{value}</div>
                  </div>
                ))}
              </div>
              <AchievementBadges userLogs={logs} foodLogs={d.food} sleepLogs={d.sleep} calorieBurns={d.burns} COLORS={COLORS} FONTS={FONTS} S={S}/>
            </div>
          )}
        </div>
        <button onClick={()=>removeFriend(viewingFriend.id)} style={{...S.btnDanger,padding:"8px 16px"}}>Remove Friend</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:FONTS.head,fontSize:20,fontWeight:700,marginBottom:4}}>👥 Friends</div>
          <div style={{fontSize:13,color:COLORS.muted}}>Connect with friends and view each other's progress</div>
        </div>
        <div style={{...S.metricCard,padding:"8px 14px",background:`${COLORS.accent}08`,border:`1px solid ${COLORS.accent}33`}}>
          <div style={{fontSize:11,color:COLORS.muted,marginBottom:3}}>Your username</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontWeight:700,fontSize:14,color:COLORS.accent}}>@{currentUser.username}</span>
            <button onClick={()=>{
              navigator.clipboard.writeText(currentUser.username).then(()=>notify("✓ Username copied!")).catch(()=>{});
            }} style={{...S.btnSm,padding:"3px 10px",fontSize:11}}>📋 Copy</button>
          </div>
        </div>
      </div>
      {requests.length>0 && (
        <div style={{...S.metricCard,marginBottom:14,background:COLORS.accent3+"0a",border:"1px solid "+COLORS.accent3+"44"}}>
          <div style={{fontFamily:FONTS.head,fontSize:14,fontWeight:700,color:COLORS.accent3,marginBottom:10}}>🔔 Friend Requests ({requests.length})</div>
          {requests.map(req=>(
            <div key={req.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:10,marginBottom:6,flexWrap:"wrap",gap:8}}>
              <div><div style={{fontWeight:700}}>{req.from_name}</div><div style={{fontSize:12,color:COLORS.muted}}>@{req.from_username}</div></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>respondToRequest(req,true)} style={{...S.btn,width:"auto",padding:"7px 18px",fontSize:13}}>✓ Accept</button>
                <button onClick={()=>respondToRequest(req,false)} style={{...S.btnDanger,padding:"7px 14px"}}>✕ Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{...S.metricCard,marginBottom:14}}>
        <div style={{fontFamily:FONTS.head,fontSize:14,fontWeight:700,marginBottom:10}}>🔍 Add a Friend</div>
        <div style={{display:"flex",gap:8}}>
          <input style={{...S.input,flex:1}} placeholder="Enter username" value={searchUser}
            onChange={e=>setSearchUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchForUser()}/>
          <button onClick={searchForUser} disabled={searching} style={{...S.btn,width:"auto",padding:"11px 20px",fontSize:13,opacity:searching?0.6:1}}>
            {searching?"…":"Search"}
          </button>
        </div>
        {searchResult==="notfound" && <div style={{fontSize:13,color:COLORS.warn,marginTop:10}}>❌ No user found</div>}
        {searchResult&&searchResult!=="notfound" && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background:"rgba(255,255,255,0.04)",borderRadius:10,marginTop:10,flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:COLORS.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:COLORS.accent}}>
                {(searchResult.name||searchResult.username||"?")[0].toUpperCase()}
              </div>
              <div><div style={{fontWeight:700}}>{searchResult.name||searchResult.username}</div><div style={{fontSize:12,color:COLORS.muted}}>@{searchResult.username}</div></div>
            </div>
            <button onClick={()=>sendRequest(searchResult)} style={{...S.btn,width:"auto",padding:"8px 20px",fontSize:13}}>➕ Send Request</button>
          </div>
        )}
      </div>
      {sentRequests.length>0 && (
        <div style={{...S.metricCard,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:COLORS.muted,marginBottom:8}}>⏳ Pending</div>
          {sentRequests.map(req=><div key={req.id} style={{fontSize:13,color:COLORS.muted,padding:"4px 0"}}>Waiting for @{req.to_username}</div>)}
        </div>
      )}
      {loading ? <div style={{textAlign:"center",padding:"1.5rem",color:COLORS.muted}}>Loading…</div> :
       friends.length===0&&requests.length===0 ? (
        <div style={{...S.metricCard,textAlign:"center",padding:"2.5rem"}}>
          <div style={{fontSize:40,marginBottom:12}}>👥</div>
          <div style={{fontFamily:FONTS.head,fontSize:16,fontWeight:700,marginBottom:8}}>No friends yet</div>
          <div style={{fontSize:13,color:COLORS.muted}}>Search for a friend by username above!</div>
        </div>
       ) : (
        <div>
          {friends.length>0&&<div style={{fontFamily:FONTS.head,fontSize:14,fontWeight:700,marginBottom:10}}>👥 My Friends ({friends.length})</div>}
          {friends.map(friend=>(
            <div key={friend.id} style={{...S.metricCard,marginBottom:8,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>viewFriendProgress(friend)}>
              <div style={{width:44,height:44,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${COLORS.accent},${COLORS.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"#07121f"}}>
                {(friend.name||friend.username||"?")[0].toUpperCase()}
              </div>
              <div style={{flex:1}}><div style={{fontWeight:700}}>{friend.name||friend.username}</div><div style={{fontSize:12,color:COLORS.muted}}>@{friend.username}</div></div>
              <div style={{fontSize:12,color:COLORS.accent}}>View Progress →</div>
            </div>
          ))}
        </div>
       )}
    </div>
  );
}

// ── FeedbackButton — floating feedback widget ─────────────────────────────────



// ── BroadcastBanner — shows admin broadcast at top of dashboard ───────────────

// ── HealthReportPrint ──
function HealthReportPrint({ user, profile, metrics, userLogs, foodLogs, sleepLogs, calorieBurns, stepLogs, COLORS }) {
  const p = profile || {};
  const [reportDays, setReportDays] = useState(7);
  const RANGE = reportDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Filter by selected range
  const logs30    = userLogs.filter(l => now - new Date(l.logged_at||l.date).getTime() < RANGE)
                            .sort((a,b) => new Date(a.logged_at||a.date) - new Date(b.logged_at||b.date));
  const food30    = foodLogs.filter(l => now - new Date(l.logged_at).getTime() < RANGE);
  const sleep30   = sleepLogs.filter(l => now - new Date(l.logged_at||l.date).getTime() < RANGE);
  const burns30   = calorieBurns.filter(l => now - new Date(l.logged_at||l.date).getTime() < RANGE);

  // Stats
  const firstW    = userLogs.length > 0 ? userLogs[0].weight : +p.weight||0;
  const latestW   = userLogs.length > 0 ? userLogs[userLogs.length-1].weight : +p.weight||0;
  const totalLost = +(firstW - latestW).toFixed(1);
  const avgSleep  = sleep30.length > 0 ? (sleep30.reduce((s,l)=>s+l.hours,0)/sleep30.length).toFixed(1) : null;
  const avgCal    = food30.length > 0 ? Math.round(food30.reduce((s,f)=>s+(f.calories||0),0)/Math.max(1,new Set(food30.map(f=>f.date)).size)) : null;
  const totalBurn = burns30.reduce((s,b)=>s+(b.calories||0),0);
  const bmi       = p.weight && p.height ? (p.weight/(p.height/100)**2).toFixed(1) : null;
  const bmiLabel  = bmi ? (+bmi<18.5?"Underweight":+bmi<25?"Normal":+bmi<30?"Overweight":"Obese") : null;

  const today = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  const todayMeals = p.savedMealPlan?.[today];

  const S_PRINT = {
    page:   { fontFamily:"'Inter',sans-serif", color:"#1a1a2e", background:"#fff", padding:"32px 40px", maxWidth:800, margin:"0 auto" },
    h1:     { fontSize:28, fontWeight:800, color:"#10e8b8", marginBottom:4 },
    h2:     { fontSize:18, fontWeight:700, color:"#1a1a2e", marginBottom:12, marginTop:24, borderBottom:"2px solid #10e8b8", paddingBottom:6 },
    h3:     { fontSize:14, fontWeight:700, color:"#333", marginBottom:6 },
    card:   { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px", marginBottom:10 },
    row:    { display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #eee", fontSize:13 },
    label:  { color:"#666", fontWeight:500 },
    value:  { color:"#1a1a2e", fontWeight:700 },
    grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
    grid3:  { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 },
    statCard: { background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:10, padding:"12px", textAlign:"center" },
    badge:  { display:"inline-block", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:"#e0f2fe", color:"#0369a1" },
  };

  return (
    <div style={S_PRINT.page}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, borderBottom:"3px solid #10e8b8", paddingBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <img src={LOGO_SRC} alt="JIS Stayfit" style={{ height:52, width:"auto", objectFit:"contain" }} />
          <div style={{ fontSize:13, color:"#666" }}>Personal Health Report</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:18, fontWeight:700 }}>{user.name||user.username}</div>
          <div style={{ fontSize:12, color:"#666" }}>Generated: {new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</div>
          <div style={{ fontSize:11, color:"#999", marginTop:2 }}>Data: Last 30 days + All-time totals</div>
        </div>
      </div>

      {/* Section 1: Health Overview */}
      <div style={S_PRINT.h2}>Section 1 — Health Overview</div>
      <div style={S_PRINT.grid3}>
        {[
          { label:"Current Weight", value:(latestW||p.weight||"—")+" kg", bg:"#f0fdf4", border:"#86efac" },
          { label:"Target Weight",  value:(p.targetWeight||"—")+" kg",     bg:"#eff6ff", border:"#93c5fd" },
          { label:"Total Lost",     value:(totalLost>0?"▼ ":"")+(Math.abs(totalLost)||"0")+" kg", bg:"#fdf4ff", border:"#d8b4fe" },
          { label:"BMI",            value:bmi?(bmi+" ("+bmiLabel+")"):"—",  bg:+bmi>25?"#fef2f2":"#f0fdf4", border:+bmi>25?"#fca5a5":"#86efac" },
          { label:"Height",         value:(p.height||"—")+" cm",           bg:"#fffbeb", border:"#fcd34d" },
          { label:"Days Logged",    value:userLogs.length+" days",          bg:"#f0f9ff", border:"#7dd3fc" },
        ].map(({label,value,bg,border}) => (
          <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:10, padding:"12px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#1a1a2e" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={S_PRINT.grid2}>
        <div style={S_PRINT.card}>
          {[["Age",p.age||"—"],["Gender",p.gender||"—"],["Goal",p.goal||"—"],["Fitness Level",p.fitnessLevel||"—"],["Conditions",((p.conditions||[]).join(", "))||"None"]].map(([l,v])=>(
            <div key={l} style={S_PRINT.row}><span style={S_PRINT.label}>{l}</span><span style={S_PRINT.value}>{v}</span></div>
          ))}
        </div>
        <div style={S_PRINT.card}>
          {[["Log Streak",calcStreak(userLogs)+" days 🔥"],["All-time Logs",userLogs.length],["Logs (30d)",logs30.length],["Avg Logs/Week",((userLogs.length/Math.max(1,Math.ceil((now-new Date(userLogs[0]?.logged_at||now).getTime())/604800000)))||0).toFixed(1)]].map(([l,v])=>(
            <div key={l} style={S_PRINT.row}><span style={S_PRINT.label}>{l}</span><span style={S_PRINT.value}>{v}</span></div>
          ))}
        </div>
      </div>

      {/* Section 2: Weight Progress */}
      <div style={S_PRINT.h2}>Section 2 — Weight Progress (Last {reportDays} Days)</div>
      {logs30.length === 0 ? (
        <div style={{ ...S_PRINT.card, color:"#666", textAlign:"center" }}>No weight logs in last 30 days</div>
      ) : (
        <div>
          <div style={S_PRINT.grid3}>
            {[
              { label:"Starting Weight (30d)", value:(logs30[0]?.weight||"—")+" kg" },
              { label:"Latest Weight",         value:(logs30[logs30.length-1]?.weight||"—")+" kg" },
              { label:"Change (30d)",          value:((logs30[0]&&logs30[logs30.length-1])?(logs30[logs30.length-1].weight-logs30[0].weight).toFixed(1)+" kg":"—") },
            ].map(({label,value})=>(
              <div key={label} style={S_PRINT.statCard}>
                <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:16, fontWeight:800 }}>{value}</div>
              </div>
            ))}
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, marginTop:12 }}>
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                {["Date","Weight (kg)","Change","Note"].map(h=><th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"#475569", fontWeight:700, borderBottom:"2px solid #e2e8f0" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {logs30.slice(-20).map((l,i,arr)=>{
                const prev = arr[i-1];
                const change = prev ? (l.weight-prev.weight).toFixed(1) : "—";
                return (
                  <tr key={l.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"7px 12px" }}>{new Date(l.logged_at||l.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</td>
                    <td style={{ padding:"7px 12px", fontWeight:700 }}>{l.weight}</td>
                    <td style={{ padding:"7px 12px", color:change!=="—"?(+change<0?"#16a34a":+change>0?"#dc2626":"#666"):"#999", fontWeight:700 }}>{change!=="—"?(+change<0?"▼ ":+change>0?"▲ ":"")+Math.abs(change):"—"}</td>
                    <td style={{ padding:"7px 12px", color:"#666" }}>{l.note||""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 3: Nutrition */}
      <div style={S_PRINT.h2}>Section 3 — Nutrition (Last {reportDays} Days)</div>
      <div style={S_PRINT.grid3}>
        {[
          { label:"Avg Daily Calories", value:avgCal?(avgCal+" kcal"):"—" },
          { label:"Food Entries (30d)",  value:food30.length },
          { label:"Daily Water Target",  value:(p.dailyWater||calcDailyWater(+p.weight||70,p.fitnessLevel||"Beginner"))+"L" },
        ].map(({label,value})=>(
          <div key={label} style={S_PRINT.statCard}>
            <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:16, fontWeight:800 }}>{value}</div>
          </div>
        ))}
      </div>
      {todayMeals && (
        <div style={{ marginTop:12 }}>
          <div style={S_PRINT.h3}>Today's Meal Plan ({today})</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                {["Meal","Time","Foods","Calories"].map(h=><th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"#475569", fontWeight:700, borderBottom:"2px solid #e2e8f0" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[["breakfast","🌅 Breakfast"],["lunch","☀️ Lunch"],["eveningSnack","🍎 Snack"],["dinner","🌙 Dinner"]].map(([key,label])=>{
                const m = todayMeals[key];
                if (!m) return null;
                return (
                  <tr key={key} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"7px 12px", fontWeight:600 }}>{label}</td>
                    <td style={{ padding:"7px 12px", color:"#666" }}>{m.time||"—"}</td>
                    <td style={{ padding:"7px 12px" }}>{(m.items||[]).map(i=>i.food).filter(Boolean).join(", ")}</td>
                    <td style={{ padding:"7px 12px", fontWeight:700 }}>{m.totalCal||0} kcal</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Section 4: Activity & Sleep */}
      <div style={S_PRINT.h2}>Section 4 — Activity & Sleep (Last {reportDays} Days)</div>
      <div style={S_PRINT.grid3}>
        {[
          { label:"Total Cals Burned",  value:totalBurn>0?(totalBurn.toLocaleString()+" kcal"):"—" },
          { label:"Burn Sessions",      value:burns30.length },
          { label:"Avg Sleep",          value:avgSleep?(avgSleep+"h/night"):"—" },
        ].map(({label,value})=>(
          <div key={label} style={S_PRINT.statCard}>
            <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:16, fontWeight:800 }}>{value}</div>
          </div>
        ))}
      </div>
      {burns30.length > 0 && (
        <div style={S_PRINT.card}>
          <div style={S_PRINT.h3}>Calorie Burn Log (Last 10 sessions)</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#f1f5f9" }}>
                {["Date","Activity","Duration","Calories"].map(h=><th key={h} style={{ padding:"6px 10px", textAlign:"left", color:"#475569", fontWeight:700, borderBottom:"1px solid #e2e8f0" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {burns30.slice(-10).map(b=>(
                <tr key={b.id} style={{ borderBottom:"1px solid #f8fafc" }}>
                  <td style={{ padding:"5px 10px" }}>{new Date(b.logged_at||b.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</td>
                  <td style={{ padding:"5px 10px" }}>{b.activity||"—"}</td>
                  <td style={{ padding:"5px 10px" }}>{b.minutes||"—"} min</td>
                  <td style={{ padding:"5px 10px", fontWeight:700 }}>{b.calories} kcal</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sleep30.length > 0 && (
        <div style={S_PRINT.card}>
          <div style={S_PRINT.h3}>Sleep Log (Last 14 nights)</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {sleep30.slice(-14).map(s=>{
              const q = getSleepQuality(s.hours);
              return (
                <div key={s.id} style={{ textAlign:"center", padding:"8px 12px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0", minWidth:80 }}>
                  <div style={{ fontSize:11, color:"#666" }}>{new Date(s.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
                  <div style={{ fontWeight:800, fontSize:16 }}>{s.hours}h</div>
                  <div style={{ fontSize:10, color:q.color }}>{q.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 5: Vitals */}
      <div style={S_PRINT.h2}>Section 5 — Latest Vitals</div>
      <div style={S_PRINT.card}>
        {p.vitals ? (
          <div style={S_PRINT.grid2}>
            {[
              ["Blood Pressure", p.vitals.bp||"—", "Normal: 120/80 mmHg"],
              ["Blood Sugar",    p.vitals.sugar?""+p.vitals.sugar+" mg/dL":"—", "Normal: 70-100 mg/dL (fasting)"],
              ["Heart Rate",     p.vitals.heartRate?""+p.vitals.heartRate+" bpm":"—", "Normal: 60-100 bpm"],
              ["SpO2",           p.vitals.spo2?""+p.vitals.spo2+"%":"—", "Normal: 95-100%"],
            ].map(([l,v,normal])=>(
              <div key={l} style={{ padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
                <div style={{ fontSize:11, color:"#666" }}>{l}</div>
                <div style={{ fontSize:16, fontWeight:800 }}>{v}</div>
                <div style={{ fontSize:10, color:"#999" }}>{normal}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color:"#999", textAlign:"center", padding:"1rem" }}>No vitals recorded yet</div>
        )}
      </div>

      {/* Section 6: Full Meal Plan */}
      <div style={S_PRINT.h2}>Section 6 — Weekly Meal Plan</div>
      {(() => {
        const plan = profile.savedMealPlan;
        if (!plan) return <div style={{ ...S_PRINT.card, color:"#999", textAlign:"center" }}>No meal plan generated yet</div>;
        const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        const MEALS = [["breakfast","🌅 Breakfast"],["lunch","☀️ Lunch"],["eveningSnack","🍎 Snack"],["dinner","🌙 Dinner"]];
        return (
          <div>
            {DAYS.map(day => {
              const dp = plan[day];
              if (!dp) return null;
              return (
                <div key={day} style={{ marginBottom:16, pageBreakInside:"avoid" }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#1a1a2e", marginBottom:8,
                    borderLeft:"4px solid #10e8b8", paddingLeft:10 }}>{day}</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#f8fafc" }}>
                        {["Meal","Time","Foods","Cal"].map(h=>(
                          <th key={h} style={{ padding:"6px 10px", textAlign:"left", color:"#475569",
                            fontWeight:700, borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MEALS.map(([key,label]) => {
                        const m = dp[key];
                        if (!m) return null;
                        const foods = (m.items||[]).map(i=>i.food).filter(Boolean).join(", ");
                        return (
                          <tr key={key} style={{ borderBottom:"1px solid #f8fafc" }}>
                            <td style={{ padding:"5px 10px", fontWeight:600 }}>{label}</td>
                            <td style={{ padding:"5px 10px", color:"#666" }}>{m.time||"—"}</td>
                            <td style={{ padding:"5px 10px" }}>{foods||"—"}</td>
                            <td style={{ padding:"5px 10px", fontWeight:700 }}>{m.totalCal||0}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background:"#f0fdf4" }}>
                        <td colSpan={3} style={{ padding:"5px 10px", fontWeight:700, color:"#16a34a" }}>Daily Total</td>
                        <td style={{ padding:"5px 10px", fontWeight:800, color:"#16a34a" }}>
                          {MEALS.reduce((s,[k])=>s+(dp[k]?.totalCal||0),0)} kcal
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Section 7: Achievements */}
      <div style={S_PRINT.h2}>Section 7 — Achievements & Milestones</div>
      <div style={S_PRINT.grid3}>
        {[
          { label:"Total Days Logged",  value:userLogs.length+" days" },
          { label:"All-time Weight Lost", value:(totalLost>0?"▼ ":"")+Math.abs(totalLost)+" kg" },
          { label:"Member Since",       value:user.created_at?new Date(user.created_at).toLocaleDateString("en-GB",{month:"short",year:"numeric"}):"—" },
        ].map(({label,value})=>(
          <div key={label} style={S_PRINT.statCard}>
            <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:16, fontWeight:800 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop:32, paddingTop:16, borderTop:"2px solid #e2e8f0", fontSize:11, color:"#999", textAlign:"center" }}>
        <div>Generated by <b style={{ color:"#10e8b8" }}>JIS Stayfit</b> · {new Date().toLocaleString("en-GB")}</div>
        <div style={{ marginTop:4 }}>⚠️ This is a wellness tracking report only. Not a medical document. Please consult your doctor for medical advice.</div>
      </div>
    </div>
  );
}

// ── PrintReportButton — shows report in modal then prints ────────────────────

// ── PrintReportButton ──
function PrintReportButton({ currentUser, profile, metrics, userLogs, foodLogs, sleepLogs, calorieBurns, stepLogs, COLORS, FONTS, S, label }) {
  const [showReport, setShowReport] = useState(false);

  const handlePrint = () => {
    // Add print style to hide modal chrome and print only report
    const style = document.createElement("style");
    style.id = "print-report-style";
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #health-report-print-root { display: block !important; }
        #health-report-print-root { position: fixed; top:0; left:0; width:100%; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const s = document.getElementById("print-report-style");
      if (s) s.remove();
    }, 1000);
  };

  return (
    <>
      <button onClick={() => setShowReport(true)}
        style={{ ...S.btn, width:"auto", padding:"10px 20px", fontSize:13,
          background:"linear-gradient(135deg,#10e8b8,#5b9cf6)",
          display:"flex", alignItems:"center", gap:8 }}>
        {label ? `📄 ${label}` : "📄 Download Health Report"}
      </button>

      {showReport && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:9999,
          overflowY:"auto", padding:"20px 0" }}>
          <div style={{ maxWidth:860, margin:"0 auto", padding:"0 20px" }}>
            {/* Print controls */}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end",
              paddingTop:"max(env(safe-area-inset-top, 0px), 50px)",
              paddingBottom:12, paddingLeft:0, paddingRight:0,
              position:"sticky", top:0,
              background:"rgba(0,0,0,0.8)", backdropFilter:"blur(10px)",
              zIndex:10 }}
              className="no-print">
              <button onClick={handlePrint}
                style={{ background:"#10e8b8", border:"none", borderRadius:10,
                  padding:"10px 24px", fontSize:14, fontWeight:700, color:"#07121f", cursor:"pointer" }}>
                🖨️ Print / Save PDF
              </button>
              <button onClick={() => setShowReport(false)}
                style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
                  borderRadius:10, padding:"10px 20px", fontSize:14, color:"#fff", cursor:"pointer" }}>
                ✕ Close
              </button>
            </div>
            {/* Report */}
            <div id="health-report-print-root">
              <HealthReportPrint
                user={currentUser} profile={profile} metrics={metrics}
                userLogs={userLogs} foodLogs={foodLogs} sleepLogs={sleepLogs}
                calorieBurns={calorieBurns} stepLogs={stepLogs||[]}
                COLORS={COLORS}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── SettingsPanel ──
function SettingsPanel({ currentUser, users, setUsers, setCurrentUser, scheduleSlots, setScheduleSlots, selectedFoods, setSelectedFoods, activeMealTab, setActiveMealTab, notify, S, COLORS, onSaved, themeMode, setThemeMode }) {
  const profile = currentUser.profile || {};
  const [form, setForm] = useState({
    weight: profile.weight || "", height: profile.height || "", age: profile.age || "",
    gender: profile.gender || "", units: profile.units || "kg/cm", targetWeight: profile.targetWeight || "",
    goal: profile.goal || "", foodPref: profile.foodPref || "",
    fitnessLevel: profile.fitnessLevel || "", workoutType: profile.workoutType || "",
    conditions: profile.conditions || [], medications: profile.medications || "",
    country: currentUser.country || profile.country || "India",
    state: currentUser.state || profile.state || "",
  });
  const [newSlot, setNewSlot] = useState({ time: "", label: "", duration: 30 });
  const [activeSection, setActiveSection] = useState("body");
  const [activeMeal, setActiveMeal] = useState("Breakfast");
  const [editingSlot, setEditingSlot] = useState(null);
  const [editSlotData, setEditSlotData] = useState({});

  const country = form.country || currentUser.country || profile.country || "India";

  function addSlot() {
    if (!newSlot.time || !newSlot.label) return;
    setScheduleSlots(p => [...p, newSlot].sort((a, b) => a.time.localeCompare(b.time)));
    setNewSlot({ time: "", endTime: "", label: "" });
  }
  function removeSlot(i) { setScheduleSlots(p => p.filter((_, idx) => idx !== i)); }

  async function saveAll() {
    const updatedProfile = { ...profile, ...form, schedule: scheduleSlots, likedFoods: selectedFoods };
    // Persist to Supabase (country/state on user record, profile_data for rest)
    await sbUpdateUser(currentUser.id, {
      profile_data: updatedProfile,
      country: form.country,
      state: form.state,
    });
    const updatedUsers = users.map(u => u.id === currentUser.id
      ? { ...u, profile: updatedProfile, country: form.country, state: form.state } : u);
    setUsers(updatedUsers);
    const updated = { ...currentUser, profile: updatedProfile, country: form.country, state: form.state };
    setCurrentUser(updated);
    saveSession(updated);
    notify("Preferences saved!");
  }

  const sections = [
    { key: "body", label: "Body & Goal" },
    { key: "medical", label: "Medical" },
    { key: "foods", label: "Foods" },
    { key: "schedule", label: "Schedule" },
    { key: "fitness", label: "Fitness" },
  ];

  const inp = (key, type = "text", placeholder = "") => (
    <input style={S.input} type={type} placeholder={placeholder} value={form[key] || ""}
      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
  );
  const sel = (key, opts, labels) => (
    <select style={S.select} value={form[key] || ""} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}>
      <option value="">Select</option>
      {opts.map((o, i) => <option key={o} value={o}>{labels ? labels[i] : o}</option>)}
    </select>
  );

  return (
    <div>
      <div style={{ fontFamily: FONTS.head, fontSize: 18, fontWeight: 700, marginBottom: "1rem" }}>My Preferences</div>
      {themeMode != null && setThemeMode && (
        <ThemePicker themeMode={themeMode} setThemeMode={setThemeMode} COLORS={COLORS} S={S} FONTS={FONTS} />
      )}
      <div style={{ ...S.metricCard, marginBottom:16, background:COLORS.accent2+"08", border:"1px solid "+COLORS.accent2+"33" }}>
        <div style={{ fontFamily:FONTS.head, fontSize:13, fontWeight:700, color:COLORS.accent2, marginBottom:8 }}>🌐 Translate App to Your Language</div>
        <div style={{ fontSize:12, color:COLORS.muted, lineHeight:1.8 }}>Translate to Hindi, Marathi, Tamil, Kannada and 100+ languages for free:</div>
        <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ fontSize:12, padding:"8px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8, borderLeft:"3px solid #4CAF50" }}>🤖 <b style={{color:COLORS.text}}>Android (Chrome):</b> Tap ⋮ menu → Translate… → select language</div>
          <div style={{ fontSize:12, padding:"8px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8, borderLeft:"3px solid #2196F3" }}>🍎 <b style={{color:COLORS.text}}>iPhone (Safari):</b> Tap AA in address bar → Translate to…</div>
          <div style={{ fontSize:12, padding:"8px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8, borderLeft:"3px solid #9C27B0" }}>💻 <b style={{color:COLORS.text}}>Desktop (Chrome):</b> Right-click anywhere → Translate to…</div>
        </div>
      </div>
      {/* Section nav */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {sections.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveSection(key)}
            style={{ padding: "6px 16px", borderRadius: 20, fontSize: 13, fontFamily: FONTS.body, cursor: "pointer",
              border: activeSection === key ? "none" : `1px solid ${COLORS.border}`,
              background: activeSection === key ? `linear-gradient(135deg, ${COLORS.accent3}, ${COLORS.warn})` : COLORS.card2,
              color: activeSection === key ? "#fff" : COLORS.muted, fontWeight: activeSection === key ? 600 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* BODY & GOAL */}
      {activeSection === "body" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Country & State */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={S.label}>Country</label>
              <select style={S.select} value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, state: "" }))}>
                <option value="">Select country</option>
                {Object.keys(COUNTRY_STATES).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>State / Region</label>
              <select style={S.select} value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} disabled={!form.country}>
                <option value="">Select state</option>
                {(COUNTRY_STATES[form.country] || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={S.label}>Current Weight ({form.units === "lbs/inches" ? "lbs" : "kg"})</label>{inp("weight", "number")}</div>
            <div><label style={S.label}>Height ({form.units === "lbs/inches" ? "inches" : "cm"})</label>{inp("height", "number")}</div>
            <div><label style={S.label}>Age</label>{inp("age", "number")}</div>
            <div><label style={S.label}>Gender</label>{sel("gender", ["Male", "Female"])}</div>
          </div>
          <div>
            <label style={S.label}>Target Weight ({form.units === "lbs/inches" ? "lbs" : "kg"})</label>
            {inp("targetWeight", "number", "e.g. 65")}
          </div>
          <div>
            <label style={S.label}>Unit System</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["kg/cm", "lbs/inches"].map(u => (
                <button key={u} onClick={() => setForm(p => ({ ...p, units: u }))}
                  style={{ ...S.pill(form.units === u), flex: 1 }}>{u}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={S.label}>Primary Goal</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Lose weight gradually & sustainably", "Build muscle while losing fat", "Improve overall health & fitness", "Maintain current weight"].map(g => (
                <button key={g} onClick={() => setForm(p => ({ ...p, goal: g }))}
                  style={{ background: form.goal === g ? `${COLORS.accent}22` : COLORS.card2, border: `1px solid ${form.goal === g ? COLORS.accent : COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: FONTS.body }}>
                  {form.goal === g ? "✓ " : ""}{g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MEDICAL */}
      {activeSection === "medical" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={S.label}>Medical Conditions</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Diabetes", "Hypertension", "Thyroid disorder", "PCOD / PCOS", "Heart condition", "Other"].map(opt => {
                const sel = (form.conditions || []).includes(opt);
                return (
                  <button key={opt} onClick={() => setForm(p => {
                    const cur = p.conditions || [];
                    return { ...p, conditions: sel ? cur.filter(x => x !== opt) : [...cur, opt] };
                  })} style={{ background: sel ? `${COLORS.accent}22` : COLORS.card2, border: `1px solid ${sel ? COLORS.accent : COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: FONTS.body }}>
                    {sel ? "✓ " : ""}{opt}
                  </button>
                );
              })}
            </div>
          </div>
          {(form.conditions || []).length > 0 && (
            <div>
              <label style={S.label}>Medications (with timing)</label>
              <textarea style={{ ...S.input, minHeight: 90, resize: "vertical" }} placeholder="e.g. Metformin 500mg after breakfast..."
                value={form.medications} onChange={e => setForm(p => ({ ...p, medications: e.target.value }))} />
            </div>
          )}
          <div>
            <label style={S.label}>Food Preference</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Vegetarian", "Non-Vegetarian", "Vegan", "Keto / Low-carb"].map(p => (
                <button key={p} onClick={() => setForm(prev => ({ ...prev, foodPref: p }))}
                  style={{ ...S.pill(form.foodPref === p), padding: "6px 16px", fontSize: 13 }}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOODS */}
      {activeSection === "foods" && (
        <div>
          <MedicalFoodAlert conditions={form.conditions} COLORS={COLORS} />

          {/* Food Preference — Vegetarian / Non-Veg etc */}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Food Preference</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Vegetarian", "Non-Vegetarian", "Vegan", "Keto / Low-carb"].map(p => (
                <button key={p} onClick={() => {
                  setForm(prev => ({ ...prev, foodPref: p }));
                  setSelectedFoods(prev => {
                    const meals = ["Breakfast", "Lunch", "Evening Snack", "Dinner", "Munching", "Fruits"];
                    const next = {};
                    meals.forEach(mealKey => {
                      const allowed = new Set(getFoodsByPref(country, p, mealKey));
                      next[mealKey] = (prev[mealKey] || []).filter(f => allowed.has(f));
                    });
                    return next;
                  });
                }}
                  style={{ ...S.pill(form.foodPref === p), padding: "8px 18px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  {p === "Vegetarian" && "🥦"}
                  {p === "Non-Vegetarian" && "🍗"}
                  {p === "Vegan" && "🌱"}
                  {p === "Keto / Low-carb" && "🥑"}
                  {p}
                </button>
              ))}
            </div>
            {form.foodPref && (
              <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 6, padding: "6px 12px", background: `${COLORS.accent}10`, borderRadius: 8 }}>
                {form.foodPref === "Vegetarian" && "🥦 No meat or seafood. Eggs & dairy included. AI meal plan will avoid all meat."}
                {form.foodPref === "Non-Vegetarian" && "🍗 All foods included. AI will suggest balanced meals with lean meats, fish & eggs."}
                {form.foodPref === "Vegan" && "🌱 No animal products. No meat, dairy, or eggs. AI will use plant-based proteins only."}
                {form.foodPref === "Keto / Low-carb" && "🥑 High fat, low carb. Under 50g carbs/day. AI will avoid grains, rice & sugar."}
              </div>
            )}
          </div>

          <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>
            Select your favourite foods per meal — AI uses these to build your personalised plan.
            Country: <span style={{ color: COLORS.accent }}>{country}</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {["Breakfast", "Lunch", "Evening Snack", "Dinner", "Munching", "Fruits"].map(m => (
              <button key={m} onClick={() => setActiveMeal(m)}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontFamily: FONTS.body, cursor: "pointer",
                  border: activeMeal === m ? "none" : `1px solid ${COLORS.border}`,
                  background: activeMeal === m ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})` : COLORS.card2,
                  color: activeMeal === m ? "#fff" : COLORS.muted, fontWeight: activeMeal === m ? 600 : 400 }}>
                {m} {(selectedFoods[m] || []).length > 0 && <span style={{ opacity: 0.8 }}>({(selectedFoods[m] || []).length})</span>}
              </button>
            ))}
          </div>
          <FoodMealPicker mealKey={activeMeal} foods={selectedFoods} selectedFoods={selectedFoods}
            setSelectedFoods={setSelectedFoods} country={country} foodPref={form.foodPref || ""} COLORS={COLORS} S={S} />
        </div>
      )}

      {/* SCHEDULE */}
      {activeSection === "schedule" && (
        <div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>Edit your daily schedule. Meal times auto-recalculate.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto", marginBottom: 12 }}>
            {scheduleSlots.map((s, i) => (
              <div key={i} style={{ background: COLORS.card2, borderRadius: 8, padding: "8px 12px", marginBottom: 2 }}>
                {editingSlot === i ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="time" value={editSlotData.time}
                      onChange={e => setEditSlotData(p => ({ ...p, time: e.target.value }))}
                      style={{ ...S.input, flex: 1, minWidth: 100, fontSize: 13, padding: "5px 8px" }} />
                    <span style={{ color: COLORS.muted, fontSize: 12 }}>→</span>
                    <input type="time" value={editSlotData.endTime || ""}
                      onChange={e => setEditSlotData(p => ({ ...p, endTime: e.target.value }))}
                      style={{ ...S.input, flex: 1, minWidth: 100, fontSize: 13, padding: "5px 8px" }} />
                    <input value={editSlotData.label}
                      onChange={e => setEditSlotData(p => ({ ...p, label: e.target.value }))}
                      style={{ ...S.input, flex: 2, minWidth: 120, fontSize: 13, padding: "5px 8px" }} />
                    <button onClick={() => {
                      setScheduleSlots(p => p.map((sl, idx) => idx === i ? editSlotData : sl));
                      setEditingSlot(null);
                    }} style={{ background: COLORS.accent, border: "none", borderRadius: 6,
                      padding: "5px 12px", color: "#07121f", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>✓</button>
                    <button onClick={() => setEditingSlot(null)}
                      style={{ background: "transparent", border: `1px solid ${COLORS.border}`,
                        borderRadius: 6, padding: "5px 10px", color: COLORS.muted, cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ color: COLORS.accent, fontWeight: 700, fontSize: 13, minWidth: 90 }}>
                      {s.time}{s.endTime ? ` → ${s.endTime}` : ""}
                    </div>
                    <div style={{ flex: 1, fontSize: 14 }}>{s.label}</div>
                    <button onClick={() => { setEditingSlot(i); setEditSlotData({ ...s }); }}
                      style={{ background: "transparent", border: "none", color: COLORS.accent2,
                        cursor: "pointer", fontSize: 13, padding: "0 4px" }}>✏️</button>
                    <button onClick={() => removeSlot(i)}
                      style={{ background: "transparent", border: "none", color: COLORS.warn,
                        cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <ActivityInput newSlot={newSlot} setNewSlot={setNewSlot} addSlot={addSlot} S={S} COLORS={COLORS} />
        </div>
      )}

      {/* FITNESS */}
      {activeSection === "fitness" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Fitness Level</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Beginner", "Moderate", "Active"].map(l => (
                <button key={l} onClick={() => setForm(p => ({ ...p, fitnessLevel: l }))}
                  style={{ ...S.pill(form.fitnessLevel === l), flex: 1 }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={S.label}>Workout Preference</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Home", "Gym", "Outdoor"].map(l => (
                <button key={l} onClick={() => setForm(p => ({ ...p, workoutType: l }))}
                  style={{ ...S.pill(form.workoutType === l), flex: 1 }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={S.label}>Workout Frequency</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {WORKOUT_FREQUENCIES.map(l => (
                <button key={l} onClick={() => setForm(p => ({ ...p, workoutFrequency: l }))}
                  style={{ ...S.pill(form.workoutFrequency === l), fontSize: 13 }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Reminders & Push Notifications ── */}
      {(() => {
        const [notifPerm, setNotifPerm] = useState(() => typeof Notification !== "undefined" ? Notification.permission : "default");
        const DEFAULT_REMINDERS = [
          { label:"Weigh-in reminder", time:"07:00", enabled:true },
          { label:"Breakfast log",     time:"09:00", enabled:true },
          { label:"Lunch log",         time:"13:30", enabled:true },
          { label:"Water check-in",    time:"15:00", enabled:true },
          { label:"Dinner log",        time:"20:00", enabled:true },
          { label:"Sleep log",         time:"22:30", enabled:false },
        ];
        const [reminders, setReminders] = useState(() => {
          try { return JSON.parse(localStorage.getItem("sf_reminders") || "null") || DEFAULT_REMINDERS; } catch { return DEFAULT_REMINDERS; }
        });
        const saveReminders = (r) => {
          localStorage.setItem("sf_reminders", JSON.stringify(r));
          setReminders(r);
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type:"SCHEDULE_REMINDERS", reminders: r.filter(x=>x.enabled) });
          }
        };
        const requestPermission = async () => {
          if (typeof Notification === "undefined") return;
          const perm = await Notification.requestPermission();
          setNotifPerm(perm);
          if (perm === "granted") {
            saveReminders(reminders);
            notify("Reminders enabled! You'll get daily check-in alerts.");
          }
        };
        return (
          <div style={{ ...S.metricCard, marginTop:20, background:`${COLORS.purple}0a`, border:`1px solid ${COLORS.purple}33` }}>
            <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, color:COLORS.purple, marginBottom:12 }}>🔔 Daily Reminders</div>
            {notifPerm !== "granted" ? (
              <div>
                <div style={{ fontSize:13, color:COLORS.muted, marginBottom:10 }}>Enable push notifications to get daily reminders for logging weight, meals, and water.</div>
                {notifPerm === "denied"
                  ? <div style={{ fontSize:12, color:COLORS.warn }}>Notifications are blocked. Enable them in your browser site settings.</div>
                  : <button onClick={requestPermission} style={{ ...S.btn, width:"auto", padding:"9px 20px", background:`linear-gradient(135deg,${COLORS.purple},${COLORS.accent2})` }}>Enable Reminders</button>
                }
              </div>
            ) : (
              <div>
                {reminders.map((r, i) => (
                  <div key={r.label} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                    <input type="checkbox" checked={r.enabled} onChange={e => saveReminders(reminders.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x))} style={{ width:16, height:16, accentColor:COLORS.purple }} />
                    <span style={{ flex:1, fontSize:13, color:r.enabled?COLORS.text:COLORS.muted }}>{r.label}</span>
                    <input type="time" value={r.time} onChange={e => saveReminders(reminders.map((x,j)=>j===i?{...x,time:e.target.value}:x))}
                      style={{ ...S.input, width:110, padding:"5px 10px", fontSize:13 }} />
                  </div>
                ))}
                <div style={{ fontSize:11, color:COLORS.muted, marginTop:6 }}>Reminders schedule daily at the set times.</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Save button */}
      <button onClick={async () => { await saveAll(); notify("✅ Preferences saved!"); if(onSaved) onSaved(); }} style={{ ...S.btn, marginTop: "1.5rem", background: `linear-gradient(135deg, ${COLORS.accent3}, ${COLORS.warn})`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        💾 Save & Return to Dashboard
      </button>
      <div style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", marginTop: 8 }}>
        Changes are saved to your account and sync across devices
      </div>
    </div>
  );
}


// ─── PDF Export ───────────────────────────────────────────────────────────────

// ── MealPlanTabWrapper ──
function MealPlanTabWrapper({ currentUser, profile, metrics, smartTimes, likedFoods, dailyWater, COLORS, S, fetchLatestProfile, setCurrentUser }) {
  const [fetching, setFetching] = useState(true);
  const [freshProfile, setFreshProfile] = useState(profile);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setFetching(true);
      try {
        const snap = await getDoc(doc(db, "users", String(currentUser.id)));
        if (cancelled) return;
        if (snap.exists() && snap.data().profile_data) {
          const latest = snap.data().profile_data;
          if (latest.savedMealPlan) {
            latest.savedMealPlan = normalizePlanToWeekly(latest.savedMealPlan);
          }
          setFreshProfile(latest);
          setCurrentUser(prev => {
            const updated = { ...prev, profile: latest };
            try { saveSession(updated); } catch(e) {}
            return updated;
          });
        }
      } catch(e) {
        console.warn("MealPlanTabWrapper: could not fetch fresh profile", e?.message);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }
    refresh();
    return () => { cancelled = true; };
  }, [currentUser.id]);

  if (fetching) {
    return (
      <div style={{ padding: "30px 0", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, color: COLORS.muted, fontSize: 14 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </path>
          </svg>
          Fetching your latest meal plan...
        </div>
      </div>
    );
  }

  return (
    <AIMealPlan
      profile={freshProfile}
      metrics={metrics}
      smartTimes={smartTimes}
      likedFoods={freshProfile.likedFoods || likedFoods}
      dailyWater={dailyWater}
      COLORS={COLORS}
      FONTS={{ head:"'Syne',sans-serif", body:"'Inter','DM Sans',sans-serif" }}
      S={S}
      userId={currentUser.id}
      onPlanSaved={async (plan) => {
        const updatedProfile = { ...freshProfile, savedMealPlan: plan };
        await sbUpdateUser(currentUser.id, { profile_data: updatedProfile });
        setFreshProfile(updatedProfile);
        setCurrentUser(prev => {
          const updated = { ...prev, profile: updatedProfile };
          try { saveSession(updated); } catch(e) {}
          return updated;
        });
      }}
    />
  );
}


// ── Plan format normalizer ────────────────────────────────────────────────────
// Converts admin 1-day plan format to the 7-day format that AIMealPlan expects.
// Admin plan: { totalCal, meals: { Breakfast: { time, items, totalCal, tip } } }

// ── Pantry items to exclude from grocery list ────────────────────────────────

const PANTRY_ITEMS = new Set([
  "salt", "oil", "sugar", "water", "butter", "ghee", "baking soda", "eno", "vinegar",
  "black pepper", "pepper", "red chili powder", "chili powder", "turmeric", "cumin",
  "cumin seeds", "mustard seeds", "coriander powder", "garam masala", "cardamom",
  "cloves", "bay leaf", "bay leaves", "curry leaves", "asafoetida", "hing", "saffron",
  "cooking oil", "sunflower oil", "olive oil", "coconut oil", "white sugar", "brown sugar",
  "jaggery", "honey", "spices", "whole spices", "mixed spices", "seasoning",
  "biryani masala", "sambar powder", "chaat masala", "rasam powder", "pav bhaji masala",
  "chole masala", "meat masala",
]);

function isPantryItem(name) {
  const n = (name || "").toLowerCase().trim();
  return PANTRY_ITEMS.has(n)
    || n.includes("salt")
    || n.includes(" oil")
    || n.startsWith("oil")
    || n.includes("sugar")
    || n.includes("masala")
    || (n.includes("powder") && (n.includes("chili") || n.includes("chilli") || n.includes("spice")));
}

// ── Ingredient database: food → raw ingredients ───────────────────────────────

const INGREDIENT_DB = {
  "Idli": ["Rice (idli rice)", "Urad dal"],
  "Dosa": ["Rice", "Urad dal"],
  "Poha": ["Flattened rice (poha)", "Onion", "Peanuts", "Lemon", "Green chili"],
  "Upma": ["Semolina (rava)", "Onion", "Green chili"],
  "Aloo Paratha": ["Whole wheat flour", "Potatoes", "Onion", "Coriander leaves", "Green chili"],
  "Paratha": ["Whole wheat flour"],
  "Oats Porridge": ["Oats", "Milk", "Honey", "Fruits"],
  "Daliya": ["Broken wheat (daliya)", "Milk"],
  "Besan Chilla": ["Chickpea flour (besan)", "Onion", "Tomato", "Green chili"],
  "Moong Dal Chilla": ["Yellow moong dal", "Onion", "Ginger", "Green chili"],
  "Sabudana Khichdi": ["Sabudana (tapioca)", "Peanuts", "Potatoes", "Green chili"],
  "Ragi Dosa": ["Ragi flour", "Rice flour", "Yogurt", "Onion"],
  "Thepla": ["Whole wheat flour", "Fenugreek leaves (methi)", "Yogurt"],
  "Egg Omelette": ["Eggs", "Onion", "Tomato", "Green chili"],
  "Boiled Eggs": ["Eggs"],
  "Egg Bhurji": ["Eggs", "Onion", "Tomato", "Green chili"],
  "Eggs & Toast": ["Eggs", "Bread", "Butter"],
  "Dal Rice": ["Rice", "Toor dal", "Onion", "Tomato", "Garlic"],
  "Roti Sabzi": ["Whole wheat flour", "Seasonal vegetables", "Onion", "Tomato", "Garlic", "Ginger"],
  "Rajma Chawal": ["Kidney beans (rajma)", "Rice", "Onion", "Tomato", "Garlic", "Ginger", "Cream"],
  "Chole Rice": ["Chickpeas (chole)", "Rice", "Onion", "Tomato", "Garlic", "Ginger"],
  "Khichdi": ["Rice", "Moong dal", "Ginger"],
  "Sambar Rice": ["Rice", "Toor dal", "Tamarind", "Drumstick", "Tomato", "Onion"],
  "Curd Rice": ["Rice", "Yogurt (curd)", "Milk", "Green chili", "Ginger", "Pomegranate"],
  "Paneer Curry": ["Paneer", "Onion", "Tomato", "Garlic", "Ginger", "Cream"],
  "Palak Paneer": ["Paneer", "Spinach (palak)", "Onion", "Tomato", "Garlic", "Ginger", "Cream"],
  "Dal Makhani": ["Black urad dal", "Kidney beans", "Butter", "Cream", "Onion", "Tomato", "Garlic", "Ginger"],
  "Baingan Bharta": ["Eggplant (baingan)", "Onion", "Tomato", "Garlic", "Green chili", "Coriander"],
  "Tofu Stir Fry": ["Tofu", "Capsicum", "Onion", "Garlic", "Ginger", "Soy sauce", "Broccoli", "Carrot"],
  "Grilled Chicken": ["Chicken breast", "Lemon", "Garlic", "Herbs"],
  "Chicken Curry": ["Chicken", "Onion", "Tomato", "Garlic", "Ginger", "Yogurt", "Cream"],
  "Chicken Biryani": ["Chicken", "Basmati rice", "Onion", "Yogurt", "Tomato", "Garlic", "Ginger"],
  "Fish Curry": ["Fish", "Onion", "Tomato", "Garlic", "Ginger", "Coconut milk"],
  "Fish Tikka": ["Fish fillets", "Yogurt", "Garlic", "Ginger", "Lemon"],
  "Egg Curry": ["Eggs", "Onion", "Tomato", "Garlic", "Ginger"],
  "Mutton Curry": ["Mutton", "Onion", "Tomato", "Garlic", "Ginger", "Yogurt"],
  "Chicken Soup": ["Chicken", "Onion", "Garlic", "Carrot", "Pepper", "Bay leaves"],
  "Moong Dal Soup": ["Yellow moong dal", "Ginger", "Garlic", "Lemon", "Coriander"],
  "Vegetable Khichdi": ["Rice", "Moong dal", "Mixed vegetables", "Ginger"],
  "Dalia Khichdi": ["Broken wheat (dalia)", "Moong dal", "Vegetables", "Ginger"],
  "Multigrain Roti & Sabzi": ["Multigrain flour", "Seasonal vegetables", "Onion", "Tomato"],
  "Paneer Bhurji Roti": ["Paneer", "Onion", "Tomato", "Green chili", "Whole wheat flour"],
  "Roasted Chana": ["Chickpeas (chana)"],
  "Sprouts Chaat": ["Mixed sprouts", "Onion", "Tomato", "Green chili", "Lemon"],
  "Makhana": ["Fox nuts (makhana)"],
  "Bhel Puri": ["Puffed rice", "Sev", "Onion", "Tomato", "Tamarind chutney", "Coriander chutney"],
  "Dhokla": ["Chickpea flour (besan)", "Yogurt", "Ginger", "Green chili"],
  "Almonds": ["Almonds"],
  "Walnuts": ["Walnuts"],
  "Peanut Butter": ["Peanuts"],
  "Dates": ["Dates"],
  "Papaya": ["Papaya"],
  "Watermelon": ["Watermelon"],
  "Banana": ["Bananas"],
  "Apple": ["Apples"],
  "Pomegranate": ["Pomegranate"],
  "Guava": ["Guava"],
  "Mango": ["Mangoes"],
  "Orange": ["Oranges"],
  "Oats": ["Oats"],
};

function getIngredients(foodName) {
  if (!foodName) return [];
  const name = foodName.trim();
  if (INGREDIENT_DB[name]) return INGREDIENT_DB[name];
  const key = Object.keys(INGREDIENT_DB).find(k =>
    k !== "_default" && (
      name.toLowerCase().includes(k.toLowerCase())
      || k.toLowerCase().includes(name.toLowerCase())
    )
  );
  return key ? INGREDIENT_DB[key] : [];
}

// ── AIMealPlan ──

// ── normalizePlanToWeekly — converts any plan format to 7-day weekly object ──
function normalizePlanToWeekly(plan) {
  if (!plan) return null;
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const MEALS = ["breakfast","lunch","eveningSnack","dinner","morningSnack","preWorkout"];
  // Already weekly format
  if (plan["Monday"] || plan["Monday"] === null) return plan;
  // Single day format (admin generated) — copy to all days
  const hasMeals = MEALS.some(m => plan[m]);
  if (hasMeals) {
    const weekly = {};
    DAYS.forEach(d => { weekly[d] = { ...plan }; });
    return weekly;
  }
  return plan;
}
function AIMealPlan({ profile, metrics, smartTimes, likedFoods, dailyWater, COLORS, FONTS, S, userId, onPlanSaved }) {
  // plan comes directly from profile.savedMealPlan — parent App refreshes this from Supabase
  // normalizePlanToWeekly handles both 1-day (admin) and 7-day (user) formats
  const [plan, setPlan] = useState(normalizePlanToWeekly(profile.savedMealPlan) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiProvider, setAiProvider] = useState("");
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [showGrocery, setShowGrocery] = useState(false);
  const [copiedGrocery, setCopiedGrocery] = useState(false);
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const allFoods = Object.values(likedFoods).flat();
  const hasFoods = allFoods.length > 0;

  // Sync when parent refreshes profile (admin generates plan → parent fetches → prop updates)
  useEffect(() => {
    if (profile.savedMealPlan) {
      setPlan(normalizePlanToWeekly(profile.savedMealPlan));
    }
  }, [profile.savedMealPlan]);

  async function generatePlan() {
    setLoading(true); setError(""); setPlan(null);
    const bmr = metrics?.bmr || 1800;
    const tdee = Math.round(bmr * (profile.fitnessLevel === "Active" ? 1.55 : profile.fitnessLevel === "Moderate" ? 1.375 : 1.2));
    const goalCalories = profile.goal?.includes("lose") || profile.goal?.includes("Lose") ? tdee - 400 : profile.goal?.includes("muscle") ? tdee + 200 : tdee;
    const protein = metrics?.protein || Math.round((parseFloat(profile.weight) || 70) * 1.6);

    const prompt = `You are a certified clinical nutritionist and gut health specialist creating a personalised 7-day meal plan.

USER PROFILE:
- Age: ${profile.age}, Gender: ${profile.gender}, Weight: ${profile.weight}kg, Height: ${profile.height}cm
- Goal: ${profile.goal || "Improve health"}
- Food Preference: ${profile.foodPref || "Mixed"} (STRICTLY follow — no meat for Vegetarian/Vegan)
- Country: ${profile.country || "India"} (use authentic regional foods)
- Daily Calorie Target: ${goalCalories} kcal | Protein Target: ${protein}g
- Medical Conditions: ${(profile.conditions||[]).join(", ")||"None"}
- Medications: ${profile.medications||"None"}

MEAL TIMES:
- Breakfast: ${smartTimes?.breakfast||"08:00"} | Lunch: ${smartTimes?.lunch||"13:00"}
- Evening Snack: ${smartTimes?.eveningSnack||"17:00"} | Dinner: ${smartTimes?.dinner||"20:00"}
${smartTimes?.preWorkout ? `- Pre-Workout Snack: ${smartTimes.preWorkout}` : ""}
- Daily Water: ${dailyWater}L

FOODS USER LIKES (use as base, build around them):
- Breakfast: ${(likedFoods.Breakfast||[]).join(", ")||"Any"}
- Lunch: ${(likedFoods.Lunch||[]).join(", ")||"Any"}
- Evening Snack: ${(likedFoods["Evening Snack"]||[]).join(", ")||"Any"}
- Dinner: ${(likedFoods.Dinner||[]).join(", ")||"Any"}
- Munching: ${(likedFoods.Munching||[]).join(", ")||"Nuts/seeds"}
- Preferred Fruits: ${(likedFoods.Fruits||[]).join(", ")||"Seasonal fruits"}

━━━ BALANCED MEAL REQUIREMENTS (MANDATORY) ━━━

LUNCH must always contain ALL FOUR of:
  ✦ PROTEIN — dal, legumes, eggs, chicken, paneer, tofu, fish, lentils
  ✦ FIBRE — green vegetables, salad, sabzi, beans, whole grains
  ✦ COMPLEX CARBS — brown rice, multigrain roti, quinoa, millets
  ✦ WATERY FRUIT — include 1 watery/cooling fruit (watermelon, cucumber, orange, papaya, pineapple, pear) as a side

DINNER must always contain ALL FOUR of:
  ✦ LEAN PROTEIN — grilled/baked chicken, fish, dal, tofu, paneer, eggs
  ✦ FIBRE-RICH VEGETABLES — at least 2 colourful vegetables (spinach, broccoli, carrots, bottle gourd, beetroot)
  ✦ LIGHT CARBS — only 1-2 rotis or small portion of rice; prefer millets or dalia at dinner
  ✦ GUT-HEALTHY ELEMENT — curd/yogurt, buttermilk, kimchi, pickle (small), or fermented food

━━━ GUT HEALTH ESSENTIALS (include daily) ━━━
Each day MUST include at least 3 of these gut-boosting suggestions as food items or drink recommendations:
  • Morning warm water with lemon or jeera water (before breakfast)
  • Curd / yogurt / raita with lunch or dinner
  • Buttermilk / chaas (afternoon)
  • Prebiotic foods — banana, garlic, onion, oats, flaxseeds
  • Probiotic foods — idli, dosa, dhokla, fermented pickles, kefir
  • Fibre boosters — chia seeds, psyllium husk, flaxseed, whole fruits
  • Herbal drinks — green tea, ginger tea, turmeric milk (golden milk at night)
  • Digestive aids — ajwain water, fennel seeds after meals, triphala at bedtime

━━━ DAILY DRINK RECOMMENDATIONS (add as items) ━━━
Include EXACTLY these drinks distributed across the day:
  1. Morning: 1 glass warm lemon water OR jeera/coriander water (before breakfast)
  2. Mid-morning: Green tea / herbal tea (between breakfast and lunch)
  3. Afternoon: Buttermilk / coconut water / fresh fruit juice (no sugar)
  4. Evening: Ginger lemon tea OR turmeric tea
  5. Night: Turmeric milk / golden milk OR chamomile tea (30 min before bed)
  Note: ${dailyWater}L plain water throughout the day

━━━ FRUIT INTEGRATION ━━━
- Use the user's preferred fruits naturally across the week
- Watery fruits (watermelon, cucumber-based, orange) → lunch sides
- Antioxidant fruits (pomegranate, berries, amla) → morning or snack
- Prebiotic fruits (banana, papaya) → breakfast or post-workout
- Vary fruit across 7 days — no same fruit on consecutive days

━━━ MEDICAL CONDITION SPECIFIC RULES ━━━
${(profile.conditions||[]).filter(c=>["Diabetes","Hypertension","PCOD / PCOS","Heart condition","Thyroid disorder"].includes(c)).map(c => {
  const adj = {"Diabetes":"STRICTLY low GI only. No white rice, sugar, fruit juice, white bread. Prefer: oats, dal, brown rice, berries, nuts. Fixed meal times, count carbs per meal.","Hypertension":"NO added salt, no processed meats, no pickles. Prefer: banana, spinach, oats, fish, garlic. DASH diet principles.","PCOD / PCOS":"No refined carbs or sugar. Anti-inflammatory focus. Prefer omega-3, fiber, berries, leafy greens. Low GI throughout.","Heart condition":"NO fried foods, saturated fats, red meat. Mediterranean diet. Olive oil only. Include oats, salmon, walnuts, berries daily.","Thyroid disorder":"Avoid excess raw cruciferous veg and soy. Include selenium foods (Brazil nuts, fish). Moderate iodine."};
  return `- ${c}: ${adj[c]||"Adapt plan for this condition."}`;
}).join("\n") || "None — standard healthy diet."}

━━━ GENERAL RULES ━━━
1. BUILD AROUND USER'S FOODS — use their liked foods as foundation. Healthify prep method (less oil, baked vs fried, whole grain swaps).
2. UNHEALTHY ITEMS — include max 2x/week as treats with smaller portions + note why.
3. EXACT QUANTITIES — "1 medium bowl (150g)", "2 rotis (60g each)", "1 cup (200ml)".
4. VARIETY — rotate across 7 days, no same meal on consecutive days.
5. MEDICAL — strictly avoid trigger foods for listed conditions (see rules above).
6. EACH MEAL NOTE — 1-line gut health or nutrition benefit tip.

Respond ONLY with valid JSON, no markdown fences, no explanation:
{
  "Monday": {
    "breakfast": { "time": "${smartTimes.breakfast}", "items": [{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "lunch": { "time": "${smartTimes.lunch}", "items": [{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "eveningSnack": { "time": "${smartTimes.eveningSnack}", "items": [{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "dinner": { "time": "${smartTimes.dinner}", "items": [{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "munching": { "time":"Anytime", "items": [{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "dailyDrinks": ["Morning: warm lemon water", "Afternoon: buttermilk", "Night: turmeric milk"],
    "gutTip": "one daily gut health tip",
    "totalDayCal": 0,
    "water": "${dailyWater}L"
  },
  "Tuesday": {}, "Wednesday": {}, "Thursday": {}, "Friday": {}, "Saturday": {}, "Sunday": {}
}

CRITICAL — For every item in the plan:
- If the item is a HEALTHY version of something the user selected: set swapped:false, originalFood:null, swapReason:null
- If you REPLACED an unhealthy user item: set swapped:true, originalFood:"original food name", swapReason:"specific reason why it was replaced and why the new item is better (include calories, nutrients, health impact)"
- NEVER include deep-fried, high-sugar, maida-based, or processed items as main meals`;

    try {
      const { text: rawText2, provider } = await callAI(prompt, 8000);
      let clean2 = rawText2.trim();
      let parsed2 = null;
      try {
        parsed2 = JSON.parse(clean2);
      } catch(parseErr2) {
        console.warn("User plan JSON truncated, repairing...");
        const days2 = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        for (let d = days2.length - 1; d >= 0; d--) {
          const idx = clean2.lastIndexOf(`"${days2[d]}"`);
          if (idx === -1) continue;
          let depth = 0, start = clean2.indexOf("{", idx), end = -1;
          for (let i = start; i < clean2.length; i++) {
            if (clean2[i] === "{") depth++;
            else if (clean2[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
          }
          if (end > 0) {
            try { parsed2 = JSON.parse(clean2.substring(0, end + 1) + "\n}"); break; } catch(e3) { continue; }
          }
        }
        if (!parsed2) throw new Error("Could not parse meal plan: " + parseErr2.message);
      }
      // Fill any missing days
      const DAYS2 = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
      const avail2 = DAYS2.filter(d => parsed2[d] && Object.keys(parsed2[d]).length > 0);
      if (avail2.length > 0) {
        DAYS2.forEach((d, i) => {
          if (!parsed2[d] || Object.keys(parsed2[d]).length === 0) {
            parsed2[d] = { ...parsed2[avail2[i % avail2.length]] };
          }
        });
      }
      setPlan(parsed2);
      setAiProvider(provider);
      console.log("Meal plan generated via", provider);
      if (onPlanSaved) onPlanSaved(parsed2);
    } catch(e) {
      console.error("AI meal plan error:", e);
      if (e.message === "ALL_RATE_LIMITED" || e.message?.includes("RATE_LIMITED")) {
        setError("⏱ All free AI providers are rate-limited right now. Please wait 1–2 minutes and try again.");
      } else {
        setError("Could not generate plan: " + e.message);
      }
    }
    setLoading(false);
  }

  const mealIcons = { breakfast:"🌅", lunch:"☀️", eveningSnack:"🍎", dinner:"🌙", munching:"🥜" };
  const mealLabels = { breakfast:"Breakfast", lunch:"Lunch", eveningSnack:"Evening Snack", dinner:"Dinner", munching:"Munching" };
  const mealColors = { breakfast: COLORS.accent2, lunch: COLORS.accent3, eveningSnack: COLORS.success, dinner: COLORS.accent, munching: COLORS.muted };

  if (!hasFoods) {
    return (
      <div>
        <div style={{ fontFamily: FONTS.head, fontSize: 18, fontWeight: 700, marginBottom: "1rem" }}>AI Meal Plan</div>
        <MedicalFoodAlert conditions={profile.conditions} COLORS={COLORS} />
        <div style={{ ...S.metricCard, textAlign: "center", padding: "2.5rem" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🍽️</div>
          <div style={{ fontFamily: FONTS.head, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Select your food preferences first</div>
          <div style={{ fontSize: 14, color: COLORS.muted }}>Go to <b style={{ color: COLORS.accent }}>My Preferences → Foods</b> and select foods you enjoy. Once saved, your admin will generate a personalised meal plan for you.</div>
        </div>
      </div>
    );
  }
  if (!plan) {
    return (
      <div>
        <div style={{ fontFamily: FONTS.head, fontSize: 18, fontWeight: 700, marginBottom: "1rem" }}>AI Meal Plan</div>
        <div style={{ ...S.metricCard, textAlign: "center", padding: "2.5rem" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
          <div style={{ fontFamily: FONTS.head, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Your meal plan is being prepared</div>
          <div style={{ fontSize:14, color:COLORS.muted, marginBottom:20 }}>
              Your food preferences have been saved. Your admin will generate a personalised 7-day AI meal plan for you shortly.
              You'll be notified when it's ready — check back here.
            </div>
          <button
            onClick={async () => {
              setFetching(true);
              try {
                const profileSnap = await getDoc(doc(db, "users", String(userId)));
          const data = profileSnap.exists() ? { profile_data: profileSnap.data().profile_data } : null;
                const latestPlan = data?.profile_data?.savedMealPlan;
                if (latestPlan) {
                  setPlan(normalizePlanToWeekly(latestPlan));
                  try {
                    const cached = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
                    if (cached?.profile) { cached.profile.savedMealPlan = latestPlan; saveSession(cached); }
                  } catch(e) {}
                }
              } catch(e) {}
              setFetching(false);
            }}
            style={{ background: "transparent", border: `1px solid ${COLORS.accent}`, borderRadius: 10, padding: "9px 22px", color: COLORS.accent, fontSize: 13, cursor: "pointer", fontFamily: FONTS.body, fontWeight: 600 }}>
            🔄 Check Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with grocery list */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:"1rem" }}>
        <div>
          <div style={{ fontFamily:FONTS.head, fontSize:18, fontWeight:700 }}>AI-Generated Meal Plan</div>
          <div style={{ fontSize:13, color:COLORS.muted, marginTop:2 }}>Personalised by your admin · {dailyWater}L water daily</div>
        </div>
        {plan && <button onClick={() => setShowGrocery(g=>!g)} style={{ ...S.btnSm, color:COLORS.success, borderColor:`${COLORS.success}44`, padding:"7px 14px", fontSize:12, fontWeight:600 }}>🛒 {showGrocery?"Hide List":"Grocery List"}</button>}
      </div>
      {showGrocery && plan && (() => {
        const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        // Extract food names from meal objects
        // Meal structure: { items: [{food:"Oat Dosa", qty:..., type:"food|drink|fruit"}], note:"tip" }
        const exF=(m)=>{
          const f=[];
          if(!m) return f;
          if(typeof m==="object" && !Array.isArray(m)) {
            // Standard meal object with items array
            if(Array.isArray(m.items)) {
              m.items.forEach(item => {
                if(item && item.food && typeof item.food==="string" && item.food.length>1) {
                  // Skip drinks and water items
                  if(item.type!=="drink" && !/water|tea|coffee|juice|milk|shake|smoothie/i.test(item.food)) {
                    f.push(item.food.trim());
                  }
                }
              });
            }
            // Also check direct food/main/name keys
            ["food","main","name"].forEach(k => {
              if(m[k] && typeof m[k]==="string" && m[k].length>1) f.push(m[k].trim());
            });
          } else if(Array.isArray(m)) {
            m.forEach(i => { if(i && typeof i==="string" && i.length>1) f.push(i.trim()); });
          }
          return f;
        };
        const di={};DAYS.forEach(day=>{
          const dp=plan[day];if(!dp)return;
          const af=[];
          // Extract from each meal type
          ["breakfast","lunch","eveningSnack","dinner","morningSnack","preWorkout"].forEach(mealKey=>{
            if(dp[mealKey]) af.push(...exF(dp[mealKey]));
          });
          // Also try Object.values for any other structure
          if(af.length===0) Object.values(dp).forEach(m=>af.push(...exF(m)));
          const s=new Set();
          af.forEach(food=>{
            const ings=getIngredients(food);
            if(ings.length>0) ings.forEach(ing=>{if(!isPantryItem(ing))s.add(ing);});
            else if(food.length>2&&!isPantryItem(food)) s.add(food);
          });
          if(s.size>0)di[day]={foods:af,ingredients:[...s].sort()};
        });
        const ad=DAYS.filter(d=>di[d]);if(ad.length===0)return null;
        return(<div style={{...S.metricCard,marginBottom:14,border:`1px solid ${COLORS.success}44`,background:`${COLORS.success}06`}}><GroceryListView activeDays={ad} dayIngredients={di} copiedGrocery={copiedGrocery} setCopiedGrocery={setCopiedGrocery} COLORS={COLORS} FONTS={FONTS} S={S}/></div>);
      })()}

      {error && <div style={{ ...S.metricCard, background: `${COLORS.warn}11`, border: `1px solid ${COLORS.warn}44`, color: COLORS.warn, fontSize: 13, marginBottom: 12, padding: "12px 16px" }}>{error}</div>}

      {loading && (
        <div style={{ ...S.metricCard, padding: "3rem", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20 }}>Your AI nutritionist is crafting a personalised 7-day plan...</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {["Analysing your food preferences", "Calculating nutrition targets", "Building your meal plan", "Adding healthy boosters"].map((txt, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.7 + i*0.075 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accent }} />
                <div style={{ fontSize: 10, color: COLORS.muted, maxWidth: 70, textAlign: "center", lineHeight: 1.3 }}>{txt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan && !loading && (
        <div>
          <MedicalFoodAlert conditions={profile.conditions} COLORS={COLORS} />
          {/* Day tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}>
            {days.map(d => (
              <button key={d} onClick={() => setSelectedDay(d)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontFamily: FONTS.body, cursor: "pointer", border: selectedDay === d ? "none" : `1px solid ${COLORS.border}`, background: selectedDay === d ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})` : COLORS.card2, color: selectedDay === d ? "#fff" : COLORS.muted, fontWeight: selectedDay === d ? 600 : 400 }}>{d.slice(0,3)}</button>
            ))}
          </div>

          {plan[selectedDay] && (() => {
            const day = plan[selectedDay];
            return (
              <div>
                {/* Day total */}
                <div style={{ ...S.metricCard, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: `${COLORS.accent}0d`, border: `1px solid ${COLORS.accent}33` }}>
                  <div>
                    <div style={{ fontFamily: FONTS.head, fontSize: 15, fontWeight: 700 }}>{selectedDay}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>💧 {day.water || `${dailyWater}L water throughout the day`}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.accent, fontFamily: FONTS.head }}>{day.totalDayCal || "~"} <span style={{ fontSize: 13, fontWeight: 400, color: COLORS.muted }}>kcal</span></div>
                  </div>
                </div>

                {/* Meal cards */}
                {Object.entries(mealLabels).map(([key, label]) => {
                  const meal = day[key];
                  if (!meal) return null;
                  const col = mealColors[key];
                  return (
                    <div key={key} style={{ ...S.metricCard, marginBottom: 10, borderLeft: `3px solid ${col}` }}>
                      {/* Meal header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{mealIcons[key]}</span>
                          <div>
                            <div style={{ fontFamily: FONTS.head, fontSize: 14, fontWeight: 700 }}>{label}</div>
                            <div style={{ fontSize: 12, color: col, fontWeight: 600 }}>{meal.time}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: col }}>{meal.totalCal}</div>
                          <div style={{ fontSize: 10, color: COLORS.muted }}>KCAL</div>
                        </div>
                      </div>

                      {/* Food items table */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                        {(meal.items || []).map((item, i) => {
                          const typeIcon = item.type === "drink" ? "🥤" : item.type === "fruit" ? "🍎" : null;
                          const typeBg = item.type === "drink" ? "#0ea5e911" : item.type === "fruit" ? "#22c55e11" : null;
                          const typeColor = item.type === "drink" ? "#0ea5e9" : item.type === "fruit" ? "#22c55e" : null;
                          return (
                          <div key={i} style={{ marginBottom: item.swapped ? 6 : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: item.swapped ? `${COLORS.success}08` : (typeBg || COLORS.bg), borderRadius: item.swapped ? "8px 8px 0 0" : 8, padding: "8px 12px", border: item.swapped ? `1px solid ${COLORS.success}30` : (typeColor ? `1px solid ${typeColor}33` : "none"), borderBottom: item.swapped ? "none" : undefined }}>
                              <div style={{ fontSize: 14, flexShrink: 0 }}>{typeIcon || <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: item.healthy === false ? COLORS.warn : col }} />}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  {item.food}
                                  {item.swapped && <span style={{ fontSize: 10, color: COLORS.success, background: `${COLORS.success}18`, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>🔄 Healthier Choice</span>}
                                  {item.healthy === false && !item.swapped && <span style={{ fontSize: 11, color: COLORS.warn, background: `${COLORS.warn}18`, borderRadius: 4, padding: "1px 5px" }}>treat</span>}
                                  {item.type === "drink" && <span style={{ fontSize: 10, color: typeColor, background: `${typeColor}18`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>DRINK</span>}
                                  {item.type === "fruit" && <span style={{ fontSize: 10, color: typeColor, background: `${typeColor}18`, borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>FRUIT</span>}
                                </div>
                                {item.swapped && item.originalFood && (
                                  <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>Replaced: <span style={{ textDecoration: "line-through", color: COLORS.warn }}>{item.originalFood}</span></div>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: COLORS.muted, whiteSpace: "nowrap" }}>{item.qty}</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: item.swapped ? COLORS.success : (typeColor || col), whiteSpace: "nowrap", minWidth: 56, textAlign: "right" }}>{item.cal > 0 ? `${item.cal} kcal` : "—"}</div>
                            </div>
                            {item.swapped && item.swapReason && (
                              <div style={{ background: `${COLORS.success}07`, border: `1px solid ${COLORS.success}25`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "7px 12px", fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>
                                💡 <b style={{ color: COLORS.success }}>Why swapped:</b> {item.swapReason}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>

                      {/* Health tip */}
                      {meal.note && (
                        <div style={{ fontSize: 12, color: COLORS.muted, background: `${col}0d`, borderRadius: 8, padding: "8px 12px", lineHeight: 1.6, borderLeft: `2px solid ${col}44` }}>
                          💡 {meal.note}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Daily Drinks */}
                {day.dailyDrinks && day.dailyDrinks.length > 0 && (
                  <div style={{ ...S.metricCard, marginBottom: 8, background: "#0ea5e90d", border: "1px solid #0ea5e933" }}>
                    <div style={{ fontFamily: FONTS.head, fontSize: 13, fontWeight: 700, color: "#0ea5e9", marginBottom: 8 }}>🥤 Daily Drinks Schedule</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {day.dailyDrinks.map((drink, i) => (
                        <div key={i} style={{ fontSize: 13, color: COLORS.text, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14 }}>💧</span>
                          <span>{drink}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gut Tip */}
                {day.gutTip && (
                  <div style={{ ...S.metricCard, marginBottom: 8, background: "#22c55e0d", border: "1px solid #22c55e33" }}>
                    <div style={{ fontFamily: FONTS.head, fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>🌿 Today's Gut Health Tip</div>
                    <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{day.gutTip}</div>
                  </div>
                )}

                {/* Medical disclaimer */}
                {profile.conditions && profile.conditions.length > 0 && (
                  <div style={{ ...S.metricCard, background: `${COLORS.warn}0d`, border: `1px solid ${COLORS.warn}33`, marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: COLORS.muted }}>⚠️ Adapted for: <b style={{ color: COLORS.text }}>{profile.conditions.join(", ")}</b>. AI guidance only — always consult your doctor.</div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── AdminDietPlan ──
function AdminDietPlan({ p, metrics, u, COLORS, onPlanSaved }) {
  const [plan, setPlan] = useState(p.savedMealPlan || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiProvider, setAiProvider] = useState("");
  const [adminDay, setAdminDay] = useState("Monday"); // hoisted from render IIFE
  const hasFoods = p.likedFoods && Object.values(p.likedFoods).some(f => f?.length > 0);

  // Load from saved plan only — NO auto-generate in admin
  useEffect(() => {
    if (p.savedMealPlan) setPlan(p.savedMealPlan);
  }, [p.savedMealPlan]);

  async function generate() {
    setLoading(true); setError("");
    const bmr = metrics?.bmr || 1800;
    // Use user's actual fitness level (not hardcoded Moderate)
    const actMult = p.fitnessLevel === "Active" ? 1.55 : p.fitnessLevel === "Moderate" ? 1.375 : 1.2;
    const tdeeRaw = Math.round(bmr * actMult);
    // Apply 500 kcal deficit for weight loss goals, maintenance otherwise
    const isWeightLoss = (p.goal || "").toLowerCase().includes("lose");
    const targetCal = isWeightLoss ? tdeeRaw - 500 : tdeeRaw;
    const protein = metrics?.protein || Math.round((parseFloat(p.weight)||70)*1.6);

    const prompt = `You are a certified clinical nutritionist building a 7-day personalised meal plan as a health professional.

USER PROFILE:
- Age: ${p.age} | Gender: ${p.gender} | Weight: ${p.weight}kg | Height: ${p.height}cm
- Goal: ${p.goal || "Improve health"}
- Food Preference: ${p.foodPref || "Mixed"} (STRICT — no meat/eggs for Vegetarian; no animal products for Vegan)
- Country: ${p.country || "India"} (use authentic regional foods)
- Daily Calorie Target: ${targetCal} kcal (BMR ${bmr} × activity ${actMult} = TDEE ${tdeeRaw}${isWeightLoss ? ` − 500 deficit = ${targetCal}` : ""}) | Protein Target: ${protein}g
- Medical Conditions: ${(p.conditions||[]).join(", ")||"None"}
- Medications: ${p.medications||"None"}

USER'S FOOD PREFERENCES (analyse each for healthiness):
- Breakfast: ${(p.likedFoods?.Breakfast||[]).join(", ")||"Any"}
- Lunch: ${(p.likedFoods?.Lunch||[]).join(", ")||"Any"}
- Evening Snack: ${(p.likedFoods?.["Evening Snack"]||[]).join(", ")||"Any"}
- Dinner: ${(p.likedFoods?.Dinner||[]).join(", ")||"Any"}
- Munching: ${(p.likedFoods?.Munching||[]).join(", ")||"Nuts"}
- Preferred Fruits: ${(p.likedFoods?.Fruits||[]).join(", ")||"Seasonal fruits"}

━━━ BALANCED MEAL REQUIREMENTS (MANDATORY) ━━━

LUNCH must contain ALL FOUR:
  ✦ PROTEIN — dal, legumes, eggs, chicken, paneer, tofu, fish
  ✦ FIBRE — green vegetables, salad, sabzi, beans
  ✦ COMPLEX CARBS — brown rice, multigrain roti, millets
  ✦ WATERY FRUIT — 1 cooling fruit side (watermelon, orange, papaya, pear, cucumber)

DINNER must contain ALL FOUR:
  ✦ LEAN PROTEIN — grilled/baked source (fish, chicken, dal, tofu, eggs, paneer)
  ✦ FIBRE-RICH VEGETABLES — 2+ colourful vegetables (spinach, broccoli, carrots, bottle gourd)
  ✦ LIGHT CARBS — 1-2 rotis or small rice; prefer millets/dalia at dinner
  ✦ GUT-HEALTHY ELEMENT — curd, buttermilk, raita, or fermented food

━━━ GUT HEALTH & DRINKS (MANDATORY DAILY) ━━━
Distribute across meals:
  • Morning: Warm lemon water or jeera water (add to breakfast)
  • Lunch: Curd / yogurt / raita / buttermilk
  • Evening: Ginger tea or coconut water
  • Night: Turmeric milk / golden milk or chamomile tea
  • Include 1 prebiotic food (banana, oats, garlic, onion, flaxseeds)
  • Include 1 probiotic food (curd, idli, dosa, dhokla, fermented pickle)

━━━ FRUIT INTEGRATION ━━━
- Include preferred fruits naturally (breakfast, snack, or lunch side)
- Prefer watery fruits at lunch, antioxidant fruits at breakfast/snack

━━━ FOOD HEALTH ASSESSMENT & SWAP RULES (CRITICAL) ━━━

For EVERY food item the user has selected, you MUST assess its healthiness:

UNHEALTHY indicators (replace these):
  ✗ Deep-fried foods: samosa, puri, bhatura, fried pakora, vada, poori
  ✗ High sugar: mithai, ladoo, halwa, gulab jamun, jalebi, cake, pastry, biscuits
  ✗ Refined carbs: white bread, maida roti, ultra-processed cereals
  ✗ High-fat processed: butter naan (excess), cream-heavy curries, full-fat fried snacks
  ✗ Sugary drinks: packaged fruit juice, soda, sweetened chai, cold drinks
  ✗ Excessive oil: restaurant-style deep-fried items

HEALTHY SWAP LOGIC:
  → Replace unhealthy item with the healthiest similar alternative
  → Keep the SAME MEAL CATEGORY and similar taste profile
  → Mark swapped items with swapped:true, originalFood and swapReason
  → Example: "Samosa" → "Roasted Chana Chaat" (swapReason: "Samosa is deep-fried with ~250 kcal & 15g fat. Roasted chana gives same crunch with 3x protein and 80% less fat.")
  → Example: "White Bread" → "Multigrain Toast" (swapReason: "White bread spikes blood sugar rapidly (GI 75). Multigrain has 3x fibre, lower GI 48, and keeps you full longer.")
  → Example: "Biscuits with Chai" → "Makhana (Fox nuts) with Chai" (swapReason: "Biscuits contain refined flour & 8-12g added sugar per serving. Makhana is low-calorie, high-protein, and anti-inflammatory.")

HEALTHY items: ALWAYS include as-is (dal, sabzi, curd, fruits, nuts, grilled items, multigrain roti, oats, eggs, lean meats)

IMPORTANT: Even if ALL user-selected foods are unhealthy, build the plan with healthy alternatives. Never include unhealthy foods just because user likes them. Health > preference. But ALWAYS explain why via swapReason.

━━━ MANDATORY RULES ━━━
1. FOOD PREFERENCE STRICT — Vegetarian: no meat/seafood/eggs. Vegan: no dairy/eggs/meat. Non-Veg: all fine.
2. QUANTITIES EXACT — "1 cup (200g)", "2 rotis (60g each)", "1 glass (200ml)"
3. CALORIES per item mandatory
4. VARIETY — rotate dishes across 7 days, no same meal two days in a row
5. MEDICAL — strictly exclude trigger foods for listed conditions

Return ONLY valid JSON, no markdown, in this EXACT 7-day format:
{
  "Monday": {
    "breakfast": { "time":"8:00 AM", "items":[{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"nutritional tip" },
    "lunch": { "time":"1:00 PM", "items":[{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "eveningSnack": { "time":"5:00 PM", "items":[{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "dinner": { "time":"8:00 PM", "items":[{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "munching": { "time":"Anytime", "items":[{"food":"name","qty":"amount","cal":0,"healthy":true,"swapped":false,"originalFood":null,"swapReason":null,"type":"food|drink|fruit"}], "totalCal":0, "note":"tip" },
    "dailyDrinks": ["Morning: warm lemon water","Afternoon: buttermilk","Evening: ginger tea","Night: turmeric milk"],
    "gutTip": "one daily gut health tip",
    "totalDayCal": 0,
    "water": "as per daily target"
  },
  "Tuesday": {},
  "Wednesday": {},
  "Thursday": {},
  "Friday": {},
  "Saturday": {},
  "Sunday": {}
}`;

    try {
      const { text: rawText, provider } = await callAI(prompt, 8000);

      // Repair truncated JSON — if response was cut off, find the last complete day
      let clean = rawText.trim();

      // Remove any trailing incomplete content after the last complete "}" for Sunday
      // Strategy: try parse first, if fails try to find and close the last complete object
      let parsed = null;
      try {
        parsed = JSON.parse(clean);
      } catch(parseErr) {
        console.warn("JSON truncated, attempting repair...", parseErr.message);
        // Find the last complete day block by finding matching braces
        // Remove everything after the last successfully closed day
        const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        for (let d = days.length - 1; d >= 0; d--) {
          const dayKey = `"${days[d]}"`;
          const idx = clean.lastIndexOf(dayKey);
          if (idx === -1) continue;
          // Try truncating after this day's content
          // Find the closing brace for this day by counting depth
          let depth = 0, start = clean.indexOf("{", idx), end = -1;
          for (let i = start; i < clean.length; i++) {
            if (clean[i] === "{") depth++;
            else if (clean[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
          }
          if (end > 0) {
            // Build repaired JSON with only complete days
            const repaired = clean.substring(0, end + 1) + "\n}";
            try {
              parsed = JSON.parse(repaired);
              console.log(`Repaired: kept days up to ${days[d]}`);
              break;
            } catch(e2) { continue; }
          }
        }
        if (!parsed) throw new Error("JSON repair failed: " + parseErr.message);
      }

      // Fill missing days by copying from available days
      const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
      const available = DAYS.filter(d => parsed[d] && Object.keys(parsed[d]).length > 0);
      if (available.length > 0) {
        DAYS.forEach((d, i) => {
          if (!parsed[d] || Object.keys(parsed[d]).length === 0) {
            parsed[d] = { ...parsed[available[i % available.length]] };
          }
        });
      }

      setPlan(parsed);
      setAiProvider(provider);
      console.log("Diet plan generated via", provider, "- days:", Object.keys(parsed).join(", "));
      if (onPlanSaved) onPlanSaved(parsed);
    } catch(e) {
      console.error("AI diet plan error:", e);
      if (e.message?.includes("RATE_LIMITED") || e.message?.includes("429")) {
        setError("All AI providers are rate-limited. Please wait 1–2 minutes and try again.");
      } else {
        setError("Could not generate plan: " + e.message);
      }
    }
    setLoading(false);
  }

  const mealColors = { "Breakfast":"#4f8ef7","Lunch":"#f7934f","Evening Snack":"#00d4aa","Dinner":"#00d4aa","Munching":"#8892aa" };
  const mealIcons = { "Breakfast":"🌅","Lunch":"☀️","Evening Snack":"🍎","Dinner":"🌙","Munching":"🥜" };

  return (
    <div>
      <MedicalFoodAlert conditions={p.conditions} COLORS={{ accent: "#00d4aa", warn: "#f7504f", muted: "#8892aa", text: "#f0f4ff", card2: "#1a2236", bg: "#0a0f1e", border: "rgba(255,255,255,0.08)", accent2: "#4f8ef7", accent3: "#f7934f" }} />
      {/* Summary bar */}
      {metrics && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8, marginBottom:12 }}>
          {[
            (() => {
              const am = p.fitnessLevel === "Active" ? 1.55 : p.fitnessLevel === "Moderate" ? 1.375 : 1.2;
              const tdeeDisp = Math.round(metrics.bmr * am);
              const isWL = (p.goal || "").toLowerCase().includes("lose");
              const targetDisp = isWL ? tdeeDisp - 500 : tdeeDisp;
              return ["Daily Target", `${targetDisp} kcal`, "#00d4aa"];
            })(),
            ["Protein Target", `${metrics.protein}g`, "#4f8ef7"],
            ["Water Target", `${metrics.dailyWater}L`, "#4f8ef7"],
            ...(plan ? (() => {
              // Support both old (plan.totalCal) and new (plan.Monday.totalDayCal) formats
              const dayCal = plan.totalCal || plan["Monday"]?.totalDayCal || 0;
              const dayProtein = plan.totalProtein || 0;
              return [
                ["Day Calories", `${dayCal} kcal`, dayCal > Math.round(metrics.bmr * (p.fitnessLevel === "Active" ? 1.55 : p.fitnessLevel === "Moderate" ? 1.375 : 1.2)) ? "#f7504f" : "#00d4aa"],
                ...(dayProtein > 0 ? [["Day Protein", `${dayProtein}g`, "#4f8ef7"]] : []),
              ];
            })() : [])
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:"#0a0f1e", borderRadius:8, padding:"8px 12px" }}>
              <div style={{ fontSize:10, color:"#8892aa", fontWeight:600, marginBottom:2 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize:15, fontWeight:700, color:c }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Regenerate button + provider badge */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {aiProvider && (
            <span style={{ fontSize:11, padding:"2px 10px", borderRadius:20, fontWeight:700,
              background: aiProvider === "Claude" ? "#7c3aed22" : "#00d4aa15",
              color: aiProvider === "Claude" ? "#a78bfa" : "#00d4aa",
              border: `1px solid ${aiProvider === "Claude" ? "#7c3aed44" : "#00d4aa33"}`,
            }}>
              ✦ Generated by {aiProvider}
            </span>
          )}
          {loading && (
            <span style={{ fontSize:11, color:"#8892aa" }}>
              Trying Gemini → Claude fallback if needed...
            </span>
          )}
        </div>
        <button onClick={generate} disabled={loading} style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.08)`, borderRadius:8, padding:"6px 14px", color: loading ? "#8892aa" : "#00d4aa", fontSize:12, cursor: loading?"not-allowed":"pointer" }}>
          {loading ? "Generating..." : plan ? "↻ Regenerate Plan" : "✨ Generate Plan"}
        </button>
      </div>

      {error && <div style={{ color:"#f7504f", fontSize:13, marginBottom:10 }}>{error}</div>}

      {loading && (
        <div style={{ textAlign:"center", padding:"2rem", color:"#8892aa", fontSize:13 }}>
          AI is building a personalised diet plan for {u.name}...
        </div>
      )}

      {!plan && !loading && (
        <div style={{ textAlign:"center", padding:"2rem" }}>
          {hasFoods ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🍽️</div>
              <div style={{ fontSize: 14, color:"#f0f4ff", fontWeight:600, marginBottom:6 }}>No plan generated yet</div>
              <div style={{ fontSize: 13, color:"#8892aa", marginBottom:14 }}>Click "✨ Generate Plan" above to create a personalised AI diet plan for this user.</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 14, color:"#f0f4ff", fontWeight:600, marginBottom:6 }}>No food preferences set</div>
              <div style={{ fontSize: 13, color:"#8892aa" }}>User hasn't selected their food preferences yet. Ask them to go to My Preferences → Foods and save their selections first.</div>
            </div>
          )}
        </div>
      )}

      {plan && !loading && (() => {
        // Support both plan formats:
        // Old 1-day: { meals: { Breakfast: {...} }, dailyDrinks, gutTip }
        // New 7-day: { Monday: { breakfast: {...}, ... }, Tuesday: {...} }
        const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
        const is7Day = DAYS.some(d => plan[d]);
        // adminDay state is hoisted to AdminDietPlan component level (see below)

        if (is7Day) {
          // 7-day format — show day tabs
          const day = plan[adminDay] || {};
          const mealKeyMap = [
            { key:"breakfast", label:"Breakfast", icon:"🌅", col:"#4f8ef7" },
            { key:"lunch", label:"Lunch", icon:"☀️", col:"#f7934f" },
            { key:"eveningSnack", label:"Evening Snack", icon:"🍎", col:"#00d4aa" },
            { key:"dinner", label:"Dinner", icon:"🌙", col:"#00d4aa" },
            { key:"munching", label:"Munching", icon:"🥜", col:"#8892aa" },
          ];
          return (
            <div>
              <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                {DAYS.map(d => (
                  <button key={d} onClick={() => setAdminDay(d)}
                    style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
                      border: adminDay===d ? "none" : "1px solid rgba(255,255,255,0.08)",
                      background: adminDay===d ? "linear-gradient(135deg,#00d4aa,#4f8ef7)" : "transparent",
                      color: adminDay===d ? "#fff" : "#8892aa", fontWeight: adminDay===d ? 600 : 400 }}>
                    {d.slice(0,3)}
                  </button>
                ))}
              </div>
              {/* Day header + swap summary */}
              <div style={{ background:"#00d4aa0d", border:"1px solid #00d4aa22", borderRadius:8, padding:"8px 14px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#f0f4ff" }}>{adminDay}</span>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {(() => {
                    const allItems = ["breakfast","lunch","eveningSnack","dinner","munching"].flatMap(k => day[k]?.items || []);
                    const swappedCount = allItems.filter(i => i.swapped).length;
                    return swappedCount > 0 ? (
                      <span style={{ fontSize:11, padding:"2px 10px", borderRadius:20, background:"#00d4aa18", color:"#00d4aa", border:"1px solid #00d4aa33", fontWeight:600 }}>
                        🔄 {swappedCount} unhealthy item{swappedCount > 1 ? "s" : ""} swapped
                      </span>
                    ) : (
                      <span style={{ fontSize:11, padding:"2px 10px", borderRadius:20, background:"#22c55e12", color:"#22c55e", border:"1px solid #22c55e30", fontWeight:600 }}>
                        ✅ All items healthy
                      </span>
                    );
                  })()}
                  <span style={{ fontSize:13, color:"#00d4aa", fontWeight:700 }}>{day.totalDayCal || "~"} kcal</span>
                </div>
              </div>
              {mealKeyMap.map(({ key, label, icon, col }) => {
                const meal = day[key]; if (!meal) return null;
                return (
                  <div key={key} style={{ background:"#0a0f1e", borderRadius:10, padding:"12px 14px", marginBottom:10, borderLeft:`3px solid ${col}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:18 }}>{icon}</span>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14, color:"#f0f4ff" }}>{label}</div>
                          <div style={{ fontSize:11, color:col, fontWeight:600 }}>{meal.time}</div>
                        </div>
                      </div>
                      <div style={{ fontSize:16, fontWeight:700, color:col }}>{meal.totalCal} kcal</div>
                    </div>
                    {(meal.items||[]).map((item, i) => (
                      <div key={i} style={{ marginBottom: item.swapped ? 6 : 2 }}>
                        <div style={{ display:"flex", gap:8, padding:"7px 10px", borderRadius: item.swapped ? "8px 8px 0 0" : 8, background: item.swapped ? "rgba(0,212,170,0.06)" : i%2===0?"rgba(255,255,255,0.02)":"transparent", alignItems:"center", border: item.swapped ? "1px solid rgba(0,212,170,0.25)" : "none", borderBottom: item.swapped ? "none" : undefined }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, color:"#f0f4ff", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              {item.food}
                              {item.swapped && (
                                <span style={{ fontSize:10, background:"#00d4aa22", color:"#00d4aa", borderRadius:4, padding:"1px 6px", fontWeight:700, whiteSpace:"nowrap" }}>
                                  🔄 SWAPPED
                                </span>
                              )}
                              {item.type === "drink" && <span style={{ fontSize:9, color:"#0ea5e9", background:"#0ea5e918", borderRadius:3, padding:"1px 4px", fontWeight:700 }}>DRINK</span>}
                              {item.type === "fruit" && <span style={{ fontSize:9, color:"#22c55e", background:"#22c55e18", borderRadius:3, padding:"1px 4px", fontWeight:700 }}>FRUIT</span>}
                            </div>
                            {item.swapped && item.originalFood && (
                              <div style={{ fontSize:11, color:"#8892aa", marginTop:1 }}>
                                Replaced: <span style={{ textDecoration:"line-through", color:"#f7504f" }}>{item.originalFood}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize:12, color:"#8892aa", whiteSpace:"nowrap" }}>{item.qty}</div>
                          <div style={{ fontSize:12, fontWeight:600, color: item.swapped ? "#00d4aa" : col, whiteSpace:"nowrap" }}>{item.cal||"—"} kcal</div>
                        </div>
                        {item.swapped && item.swapReason && (
                          <div style={{ background:"rgba(0,212,170,0.05)", border:"1px solid rgba(0,212,170,0.2)", borderTop:"none", borderRadius:"0 0 8px 8px", padding:"7px 10px", fontSize:11, color:"#8892aa", lineHeight:1.5 }}>
                            💡 <b style={{ color:"#00d4aa" }}>Why swapped:</b> {item.swapReason}
                          </div>
                        )}
                      </div>
                    ))}
                    {meal.note && <div style={{ fontSize:11, color:"#8892aa", marginTop:6, fontStyle:"italic", padding:"6px 10px", background:"rgba(255,255,255,0.03)", borderRadius:6 }}>💡 {meal.note}</div>}
                  </div>
                );
              })}
              {day.dailyDrinks?.length > 0 && (
                <div style={{ background:"#0ea5e90d", border:"1px solid #0ea5e933", borderRadius:10, padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:"#0ea5e9", marginBottom:6 }}>🥤 Daily Drinks</div>
                  {day.dailyDrinks.map((d2, i) => <div key={i} style={{ fontSize:12, color:"#f0f4ff", display:"flex", gap:8 }}><span>💧</span>{d2}</div>)}
                </div>
              )}
              {day.gutTip && <div style={{ background:"#22c55e0d", border:"1px solid #22c55e33", borderRadius:10, padding:"10px 14px" }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#22c55e", marginBottom:3 }}>🌿 Gut Tip</div>
                <div style={{ fontSize:12, color:"#f0f4ff" }}>{day.gutTip}</div>
              </div>}
            </div>
          );
        }

        // Legacy 1-day format fallback
        return (
          <div>
            {Object.entries(plan.meals || {}).map(([meal, data]) => {
              const col = mealColors[meal] || "#8892aa";
              return (
                <div key={meal} style={{ background:"#0a0f1e", borderRadius:10, padding:"12px 14px", marginBottom:10, borderLeft:`3px solid ${col}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:18 }}>{mealIcons[meal]||"🍽️"}</span>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:"#f0f4ff" }}>{meal}</div>
                        <div style={{ fontSize:11, color:col }}>{data.time}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:16, fontWeight:700, color:col }}>{data.totalCal} kcal</div>
                  </div>
                  {(data.items||[]).map((item,i) => (
                    <div key={i} style={{ display:"flex", gap:8, padding:"6px 8px", borderRadius:6, background:i%2===0?"rgba(255,255,255,0.02)":"transparent", fontSize:13, color:"#f0f4ff", alignItems:"center" }}>
                      <div style={{ flex:1 }}>{item.food}</div>
                      <div style={{ color:"#8892aa", fontSize:12 }}>{item.qty}</div>
                      <div style={{ color:col, fontSize:12, fontWeight:600 }}>{item.cal||"—"} kcal</div>
                    </div>
                  ))}
                  {data.tip && <div style={{ fontSize:11, color:"#8892aa", marginTop:6, fontStyle:"italic" }}>💡 {data.tip}</div>}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}


// ── AdminUserDataView — loads Firebase collection for a user and renders ──────

// ── AdminUserList ──
function AdminUserList({ adminUsers, deleteUser, enableUser, approveUser, rejectUser, changeUserPassword, COLORS, S, FONTS, allFoodLogs }) {
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const approved = adminUsers.filter(u => u.approved !== false);
  const filtered = approved.filter(u => {
    const matchSearch = !searchQ || u.name?.toLowerCase().includes(searchQ.toLowerCase()) || u.username?.toLowerCase().includes(searchQ.toLowerCase()) || u.country?.toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = filterStatus==="all" || (filterStatus==="active"&&u.active) || (filterStatus==="disabled"&&!u.active) || (filterStatus==="no-plan"&&!u.profile_data?.savedMealPlan);
    return matchSearch && matchStatus;
  });
  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:700, flex:1 }}>
          All Users ({filtered.length}{filtered.length!==approved.length?` of ${approved.length}`:""})
        </div>
        <input style={{ ...S.input, maxWidth:220, padding:"8px 14px", fontSize:13 }}
          placeholder="🔍 Search name, username, country..."
          value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        <select style={{ ...S.select, maxWidth:160, padding:"8px 12px", fontSize:13 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Users</option>
          <option value="active">Active Only</option>
          <option value="disabled">Disabled</option>
          <option value="no-plan">No Meal Plan</option>
        </select>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {filtered.length===0 ? (
          <div style={{ padding:"2rem", textAlign:"center", color:COLORS.muted }}>No users match your search.</div>
        ) : (
          filtered.map(u => <UserCard key={u.id} u={u} deleteUser={deleteUser} enableUser={enableUser} approveUser={approveUser} rejectUser={rejectUser} changeUserPassword={changeUserPassword} COLORS={COLORS} S={S} allFoodLogs={allFoodLogs} />)
        )}
      </div>
    </div>
  );
}


// ── Calorie Bar Chart ─────────────────────────────────────────────────────────

// ── AdminPanel ──
function AdminPanel({ adminUsers, deleteUser, enableUser, approveUser, rejectUser, changeUserPassword, COLORS, S, FONTS, allFoodLogs, currentUserId, notify }) {
  const [adminSection, setAdminSection] = useState("users");
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [newAdminPass, setNewAdminPass] = useState("");
  const [confirmAdminPass, setConfirmAdminPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const allApproved = adminUsers.filter(u => u.approved !== false);
  const pending = adminUsers.filter(u => u.approved === false);
  const activeToday = allApproved.filter(u => {
    if (!u.lastSeen) return false;
    return (Date.now() - new Date(u.lastSeen).getTime()) < 24*60*60*1000;
  });
  const atRisk = allApproved.filter(u => {
    if (!u.lastSeen) return true;
    return (Date.now() - new Date(u.lastSeen).getTime()) > 7*24*60*60*1000;
  });
  const noMealPlan = allApproved.filter(u => !u.profile_data?.savedMealPlan);

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    try {
      await addDoc(collection(db, "broadcasts"), {
        message: broadcastMsg.trim(),
        created_at: new Date().toISOString(),
        from: "Admin",
      });
      notify("✓ Broadcast sent to all users!");
      setBroadcastMsg("");
    } catch(e) { notify("Failed to send broadcast"); }
    setBroadcasting(false);
  };

  const changeAdminPassword = async () => {
    if (!newAdminPass || newAdminPass.length < 4) { setPassMsg("❌ Password must be at least 4 characters"); return; }
    if (newAdminPass !== confirmAdminPass) { setPassMsg("❌ Passwords do not match"); return; }
    try {
      await updateDoc(doc(db, "users", "admin-001"), { password_hash: newAdminPass });
      setPassMsg("✅ Admin password changed successfully!");
      setNewAdminPass(""); setConfirmAdminPass("");
      setTimeout(() => { setPassMsg(""); setShowAdminSettings(false); }, 2000);
    } catch(e) { setPassMsg("❌ Error: " + e.message); }
  };

  return (
    <div>
      {/* Admin Dashboard Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8, marginBottom:14 }}>
        {[
          { label:"Total Users",   value:allApproved.length, color:COLORS.accent2, icon:"👥" },
          { label:"Active Today",  value:activeToday.length, color:COLORS.success,  icon:"🟢" },
          { label:"Pending",       value:pending.length,     color:pending.length>0?COLORS.accent3:COLORS.muted, icon:"⏳" },
          { label:"At Risk (7d)",  value:atRisk.length,      color:atRisk.length>0?COLORS.warn:COLORS.muted, icon:"⚠️" },
          { label:"No Meal Plan",  value:noMealPlan.length,  color:noMealPlan.length>0?COLORS.accent3:COLORS.muted, icon:"🍽️" },
        ].map(({label,value,color,icon}) => (
          <div key={label} style={{ ...S.metricCard, textAlign:"center", padding:"10px 8px",
            background:`${color}0a`, border:`1px solid ${color}30` }}>
            <div style={{ fontSize:18, marginBottom:2 }}>{icon}</div>
            <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:800, color }}>{value}</div>
            <div style={{ fontSize:10, color:COLORS.muted, marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none", alignItems:"center" }}>
        {[["users","👥 Users"],["competitions","🏆 Challenges"],["feedback","💬 Feedback"],["broadcast","📢 Broadcast"]].map(([k,l]) => (
          <button key={k} onClick={() => setAdminSection(k)}
            style={{ ...S.pill(adminSection===k), whiteSpace:"nowrap", flexShrink:0, fontSize:13 }}>
            {l}
          </button>
        ))}
        <button onClick={() => setShowAdminSettings(s => !s)}
          style={{ marginLeft:"auto", ...S.btnSm, padding:"7px 14px", fontSize:12, flexShrink:0,
            color:COLORS.accent, borderColor:`${COLORS.accent}44` }}>
          ⚙️ Admin Settings
        </button>
      </div>

      {/* Admin Settings Panel */}
      {showAdminSettings && (
        <div style={{ ...S.metricCard, marginBottom:16, border:`1px solid ${COLORS.accent}44`,
          background:`${COLORS.accent}06` }}>
          <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, color:COLORS.accent, marginBottom:14 }}>
            🔐 Change Admin Password
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <div>
              <label style={S.label}>New Password</label>
              <input type="password" style={S.input} placeholder="Min 4 characters"
                value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Confirm Password</label>
              <input type="password" style={S.input} placeholder="Repeat new password"
                value={confirmAdminPass} onChange={e => setConfirmAdminPass(e.target.value)} />
            </div>
          </div>
          {passMsg && (
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10,
              color: passMsg.startsWith("✅") ? COLORS.success : COLORS.warn }}>
              {passMsg}
            </div>
          )}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={changeAdminPassword}
              style={{ ...S.btn, width:"auto", padding:"9px 24px", fontSize:13 }}>
              🔐 Update Password
            </button>
            <button onClick={() => { setShowAdminSettings(false); setPassMsg(""); setNewAdminPass(""); setConfirmAdminPass(""); }}
              style={{ ...S.btnSm, padding:"9px 18px" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {adminSection === "users" && (
        <AdminUserList adminUsers={adminUsers} deleteUser={deleteUser} enableUser={enableUser}
          approveUser={approveUser} rejectUser={rejectUser}
          changeUserPassword={changeUserPassword} COLORS={COLORS} S={S} FONTS={FONTS}
          allFoodLogs={allFoodLogs} />
      )}
      {adminSection === "competitions" && (
        <AdminCompetitions allUsers={adminUsers} currentUserId={currentUserId}
          COLORS={COLORS} S={S} FONTS={FONTS} notify={notify} />
      )}

      {adminSection === "feedback" && (
        <AdminFeedbackTab COLORS={COLORS} FONTS={FONTS} S={S} />
      )}

      {adminSection === "broadcast" && (
        <div>
          <div style={{ fontFamily:FONTS.head, fontSize:18, fontWeight:700, marginBottom:4 }}>📢 Broadcast Message</div>
          <div style={{ fontSize:13, color:COLORS.muted, marginBottom:16 }}>
            Send a message to all users — it will appear as a notification when they next open the app.
          </div>
          <div style={{ ...S.metricCard }}>
            <label style={S.label}>Message</label>
            <textarea rows={4} style={{ ...S.input, resize:"none", marginBottom:12 }}
              placeholder="e.g. New feature: Grocery List is now available! Check your Meal Plan tab."
              value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} />
            <button onClick={sendBroadcast} disabled={!broadcastMsg.trim()||broadcasting}
              style={{ ...S.btn, width:"auto", padding:"10px 24px",
                opacity:!broadcastMsg.trim()||broadcasting?0.5:1 }}>
              {broadcasting ? "Sending…" : "📢 Send to All Users"}
            </button>
          </div>
          <BroadcastHistory COLORS={COLORS} FONTS={FONTS} S={S} />
        </div>
      )}
    </div>
  );
}
// ── AdminCompetitions — create & manage challenges ────────────────────────────

// ── AdminCompetitions ──
function AdminCompetitions({ allUsers, currentUserId, COLORS, S, FONTS, notify }) {
  const [competitions, setCompetitions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name:"", description:"", startDate:"", endDate:"", participants:[] });
  const [loading, setLoading] = useState(false);
  const [expandedComp, setExpandedComp] = useState(null);
  const [memberData, setMemberData] = useState({});

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    const data = await sbGetCompetitions();
    setCompetitions(data);
  };

  const loadMembers = async (compId) => {
    const members = await sbGetCompetitionMembers(compId);
    setMemberData(prev => ({ ...prev, [compId]: members }));
  };

  const toggleExpand = async (compId) => {
    if (expandedComp === compId) { setExpandedComp(null); return; }
    setExpandedComp(compId);
    await loadMembers(compId);
  };

  const createCompetition = async () => {
    if (!form.name || !form.startDate || !form.endDate || form.participants.length === 0) {
      notify("⚠ Fill in all fields and select at least one participant");
      return;
    }
    setLoading(true);
    const { data: comp, error } = await sbCreateCompetition({
      name: form.name,
      description: form.description,
      start_date: form.startDate,
      end_date: form.endDate,
      created_by: currentUserId,
      status: "active",
      created_at: new Date().toISOString(),
    });
    if (error || !comp) { notify("⚠ Failed to create competition"); setLoading(false); return; }

    // Invite all selected participants
    for (const userId of form.participants) {
      const user = allUsers.find(u => u.id === userId);
      const startW = parseFloat(user?.profile_data?.weight || user?.profile?.weight || 70);
      await sbInviteToCompetition(comp.id, userId, startW);
    }

    notify("✓ Competition created! Invitations sent.");
    setForm({ name:"", description:"", startDate:"", endDate:"", participants:[] });
    setShowCreate(false);
    loadCompetitions();
    setLoading(false);
  };

  const toggleParticipant = (userId) => {
    setForm(p => ({
      ...p,
      participants: p.participants.includes(userId)
        ? p.participants.filter(id => id !== userId)
        : [...p.participants, userId]
    }));
  };

  const statusColor = (s) => s === "active" ? COLORS.success : s === "ended" ? COLORS.muted : COLORS.accent3;
  const eligible = allUsers.filter(u => u.active && u.approved !== false && u.profile_data?.weight);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:FONTS.head, fontSize:18, fontWeight:700 }}>🏆 Challenges & Competitions</div>
          <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>Create weight loss challenges between users</div>
        </div>
        <button onClick={() => setShowCreate(s => !s)}
          style={{ ...S.btn, width:"auto", padding:"9px 20px", fontSize:13 }}>
          {showCreate ? "✕ Cancel" : "+ New Challenge"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ ...S.metricCard, marginBottom:20, border:`1px solid ${COLORS.accent}44`,
          background:`${COLORS.accent}06` }}>
          <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, color:COLORS.accent, marginBottom:14 }}>
            🏁 Create New Challenge
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={S.label}>Challenge Name *</label>
              <input style={S.input} placeholder="e.g. May Weight Loss Challenge"
                value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={S.label}>Description</label>
              <input style={S.input} placeholder="Challenge details (optional)"
                value={form.description} onChange={e => setForm(p => ({...p, description:e.target.value}))} />
            </div>
            <div>
              <label style={S.label}>Start Date *</label>
              <input type="date" style={S.input} min={today}
                value={form.startDate} onChange={e => setForm(p => ({...p, startDate:e.target.value}))} />
            </div>
            <div>
              <label style={S.label}>End Date *</label>
              <input type="date" style={S.input} min={form.startDate || today}
                value={form.endDate} onChange={e => setForm(p => ({...p, endDate:e.target.value}))} />
            </div>
          </div>

          {/* Participant selector */}
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>
              Select Participants * ({form.participants.length} selected)
            </label>
            {eligible.length === 0 ? (
              <div style={{ fontSize:13, color:COLORS.muted }}>No eligible users (need active users with profile)</div>
            ) : (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {eligible.map(u => {
                  const selected = form.participants.includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleParticipant(u.id)}
                      style={{ padding:"8px 14px", borderRadius:10, cursor:"pointer", fontSize:13,
                        border:`2px solid ${selected ? COLORS.accent : COLORS.border}`,
                        background: selected ? `${COLORS.accent}18` : COLORS.card2,
                        color: selected ? COLORS.accent : COLORS.muted, fontWeight: selected ? 700 : 400,
                        display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:"50%",
                        background:`${COLORS.accent}22`, display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:13, fontWeight:700, color:COLORS.accent }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ textAlign:"left" }}>
                        <div>{u.name}</div>
                        <div style={{ fontSize:10, opacity:0.7 }}>{u.profile_data?.weight}kg</div>
                      </div>
                      {selected && <span style={{ fontSize:14 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={createCompetition} disabled={loading}
            style={{ ...S.btn, opacity:loading?0.6:1 }}>
            {loading ? "Creating…" : "🚀 Launch Challenge"}
          </button>
        </div>
      )}

      {/* Competitions list */}
      {competitions.length === 0 ? (
        <div style={{ ...S.metricCard, textAlign:"center", padding:"2.5rem" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🏆</div>
          <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>No challenges yet</div>
          <div style={{ fontSize:13, color:COLORS.muted }}>Create your first weight loss challenge above</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {competitions.map(comp => {
            const isExpanded = expandedComp === comp.id;
            const members = memberData[comp.id] || [];
            const now = new Date();
            const end = new Date(comp.end_date);
            const daysLeft = Math.ceil((end - now) / (1000*60*60*24));
            const isLive = now >= new Date(comp.start_date) && now <= end;

            // Leaderboard from members
            const ranked = [...members]
              .filter(m => m.status === "active" || m.status === "invited")
              .map(m => {
                const user = allUsers.find(u => u.id === m.user_id);
                const currentW = parseFloat(user?.profile_data?.weight || m.current_weight || m.start_weight || 0);
                const lost = +(parseFloat(m.start_weight||0) - currentW).toFixed(1);
                return { ...m, user, currentW, lost };
              })
              .sort((a,b) => b.lost - a.lost);

            return (
              <div key={comp.id} style={{ ...S.metricCard, overflow:"hidden" }}>
                {/* Header */}
                <div style={{ display:"flex", gap:12, alignItems:"center", cursor:"pointer" }}
                  onClick={() => toggleExpand(comp.id)}>
                  <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                    background:`linear-gradient(135deg, ${COLORS.gold}22, ${COLORS.accent3}22)`,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                    🏆
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:COLORS.text }}>{comp.name}</div>
                    <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>
                      {new Date(comp.start_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} → {new Date(comp.end_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                      {" · "}{members.length} participants
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:700,
                      background: isLive ? `${COLORS.success}18` : `${COLORS.muted}18`,
                      color: isLive ? COLORS.success : COLORS.muted,
                      border: `1px solid ${isLive ? COLORS.success : COLORS.muted}33` }}>
                      {isLive ? `🟢 Live · ${daysLeft}d left` : now < new Date(comp.start_date) ? "⏳ Upcoming" : "🏁 Ended"}
                    </div>
                  </div>
                  <span style={{ fontSize:18, color:COLORS.muted, transition:"transform 0.2s",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                </div>

                {/* Expanded leaderboard */}
                {isExpanded && (
                  <div style={{ borderTop:`1px solid ${COLORS.border}`, marginTop:12, paddingTop:12 }}>
                    {comp.description && (
                      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:12,
                        padding:"8px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                        {comp.description}
                      </div>
                    )}

                    {ranked.length === 0 ? (
                      <div style={{ fontSize:13, color:COLORS.muted, textAlign:"center", padding:"1rem" }}>
                        No participants have joined yet
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:COLORS.muted, marginBottom:8, letterSpacing:"0.05em" }}>
                          🏅 LEADERBOARD
                        </div>
                        {ranked.map((m, idx) => {
                          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx+1}.`;
                          const barW = ranked[0].lost > 0 ? Math.max(0, Math.round(m.lost / ranked[0].lost * 100)) : 0;
                          return (
                            <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:10,
                              padding:"10px 12px", borderRadius:10, marginBottom:6,
                              background: idx === 0 ? `${COLORS.gold}10` : "rgba(255,255,255,0.03)",
                              border: `1px solid ${idx === 0 ? COLORS.gold+"33" : "transparent"}` }}>
                              <div style={{ fontSize:18, minWidth:28, textAlign:"center" }}>{medal}</div>
                              <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                                background:`${COLORS.accent}22`, display:"flex", alignItems:"center",
                                justifyContent:"center", fontWeight:700, fontSize:14, color:COLORS.accent }}>
                                {m.user?.name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontWeight:600, fontSize:13, color:COLORS.text }}>
                                  {m.user?.name || m.user_id}
                                </div>
                                <div style={{ height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, marginTop:4 }}>
                                  <div style={{ height:"100%", width:`${barW}%`,
                                    background: idx===0 ? COLORS.gold : idx===1 ? "#c0c0c0" : COLORS.accent,
                                    borderRadius:3, transition:"width 0.5s" }} />
                                </div>
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontWeight:700, fontSize:15,
                                  color: m.lost > 0 ? COLORS.success : m.lost < 0 ? COLORS.warn : COLORS.muted }}>
                                  {m.lost > 0 ? "▼" : m.lost < 0 ? "▲" : "—"} {Math.abs(m.lost)} kg
                                </div>
                                <div style={{ fontSize:10, color:COLORS.muted }}>
                                  {m.status === "invited" ? "⏳ Pending" : `${m.currentW}kg now`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── UserCompetitions — user-side competition view & leaderboard ───────────────

// ── UserCompetitions ──
function UserCompetitions({ userId, userName, currentWeight, userLogs, COLORS, S, FONTS, notify }) {
  const [competitions, setCompetitions] = useState([]);
  const [joining, setJoining] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [memberData, setMemberData] = useState({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyCompetitions();
  }, [userId]);

  const loadMyCompetitions = async () => {
    setLoading(true);
    // Get all competition members for this user
    const memberSnap = await getDocs(collection(db, "competition_members"));
    const myMemberships = memberSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.user_id === userId);
    if (!myMemberships || myMemberships.length === 0) { setCompetitions([]); setLoading(false); return; }

    // Get competition details
    const compIds = myMemberships.map(m => m.competition_id);
    const compSnap = await getDocs(collection(db, "competitions"));
    const comps = compSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(c => compIds.includes(c.id));

    // Merge membership status
    const merged = (comps || []).map(c => ({
      ...c,
      myStatus: myMemberships.find(m => m.competition_id === c.id)?.status || "invited",
      myStartWeight: myMemberships.find(m => m.competition_id === c.id)?.start_weight,
    }));
    setCompetitions(merged);
    setLoading(false);
  };

  const loadLeaderboard = async (compId) => {
    const members = await sbGetCompetitionMembers(compId);
    // For each member, get their latest weight from users table
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(u => members.map(m => m.user_id).includes(u.id));

    const ranked = members
      .filter(m => m.status === "active")
      .map(m => {
        const u = (users||[]).find(u => u.id === m.user_id);
        const currentW = parseFloat(u?.profile_data?.weight || m.start_weight || 0);
        const lost = +(parseFloat(m.start_weight||0) - currentW).toFixed(1);
        const isMe = m.user_id === userId;
        return { ...m, userName: u?.name || "User", currentW, lost, isMe };
      })
      .sort((a,b) => b.lost - a.lost);
    setMemberData(prev => ({ ...prev, [compId]: ranked }));
  };

  const joinCompetition = async (compId) => {
    setJoining(compId);
    const startW = parseFloat(currentWeight) || 70;
    const err = await sbJoinCompetition(compId, userId, startW);
    if (!err) {
      // Update starting weight with current weight
      await sbUpdateCompWeight(compId, userId, startW);
      notify("✓ You've joined the challenge! Your starting weight has been recorded.");
      loadMyCompetitions();
    } else {
      notify("⚠ Failed to join. Please try again.");
    }
    setJoining(null);
  };

  const toggleExpand = async (compId) => {
    if (expanded === compId) { setExpanded(null); return; }
    setExpanded(compId);
    await loadLeaderboard(compId);
  };

  const pending = competitions.filter(c => c.myStatus === "invited");
  const active  = competitions.filter(c => c.myStatus === "active");

  if (loading) {
    return (
      <div style={{ textAlign:"center", padding:"2rem", color:COLORS.muted, fontSize:13 }}>
        <div style={{ fontSize:24, marginBottom:8 }}>⏳</div>
        Loading your challenges...
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div style={{ ...S.metricCard, textAlign:"center", padding:"2.5rem" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🏆</div>
        <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:700, marginBottom:8 }}>No challenges yet</div>
        <div style={{ fontSize:13, color:COLORS.muted, lineHeight:1.6 }}>
          Your admin hasn't created any challenges yet.<br/>
          When you're invited to a weight loss challenge, it will appear here.<br/>
          <span style={{ color:COLORS.accent, fontWeight:600 }}>Check back soon!</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom:16 }}>
      {/* Invitations banner */}
      {pending.length > 0 && (
        <div style={{ ...S.metricCard, marginBottom:10,
          background:`${COLORS.accent3}0e`, border:`1px solid ${COLORS.accent3}44` }}>
          <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, color:COLORS.accent3, marginBottom:10 }}>
            🎯 Challenge Invitations ({pending.length})
          </div>
          {pending.map(comp => (
            <div key={comp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 12px", background:"rgba(255,255,255,0.04)", borderRadius:10, marginBottom:6 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14, color:COLORS.text }}>{comp.name}</div>
                <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>
                  {new Date(comp.start_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} → {new Date(comp.end_date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}
                </div>
                {comp.description && <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>{comp.description}</div>}
              </div>
              <button onClick={() => joinCompetition(comp.id)} disabled={joining === comp.id}
                style={{ ...S.btn, width:"auto", padding:"8px 18px", fontSize:13, flexShrink:0,
                  opacity: joining === comp.id ? 0.6 : 1 }}>
                {joining === comp.id ? "Joining…" : "🏁 Join!"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active challenges */}
      {active.map(comp => {
        const isExp = expanded === comp.id;
        const members = memberData[comp.id] || [];
        const me = members.find(m => m.isMe);
        const myRank = me ? members.indexOf(me) + 1 : null;
        const now = new Date();
        const end = new Date(comp.end_date);
        const daysLeft = Math.max(0, Math.ceil((end - now) / (1000*60*60*24)));

        return (
          <div key={comp.id} style={{ ...S.metricCard, marginBottom:8, overflow:"hidden" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
              onClick={() => toggleExpand(comp.id)}>
              <div style={{ fontSize:24, flexShrink:0 }}>🏆</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15, color:COLORS.text }}>{comp.name}</div>
                <div style={{ fontSize:12, color:COLORS.muted, marginTop:1 }}>
                  {daysLeft > 0 ? `${daysLeft} days remaining` : "Challenge ended"}
                  {myRank && ` · You're ranked #${myRank}`}
                </div>
              </div>
              {me && (
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:800, fontSize:16,
                    color: me.lost > 0 ? COLORS.success : COLORS.muted }}>
                    {me.lost > 0 ? "▼" : "—"} {Math.abs(me.lost)} kg
                  </div>
                  <div style={{ fontSize:10, color:COLORS.muted }}>your loss</div>
                </div>
              )}
              <span style={{ fontSize:16, color:COLORS.muted, transition:"transform 0.2s",
                transform: isExp ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </div>

            {/* Leaderboard */}
            {isExp && (
              <div style={{ borderTop:`1px solid ${COLORS.border}`, marginTop:12, paddingTop:12 }}>
                {members.length === 0 ? (
                  <div style={{ fontSize:13, color:COLORS.muted, textAlign:"center", padding:"0.5rem" }}>
                    Loading leaderboard…
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:COLORS.muted, marginBottom:8, letterSpacing:"0.05em" }}>
                      🏅 LEADERBOARD — {members.length} participants
                    </div>
                    {members.map((m, idx) => {
                      const medal = idx===0?"🥇":idx===1?"🥈":idx===2?"🥉":`${idx+1}`;
                      const barW = members[0]?.lost > 0 ? Math.max(0, Math.round(m.lost / members[0].lost * 100)) : 0;
                      return (
                        <div key={m.user_id} style={{ display:"flex", alignItems:"center", gap:10,
                          padding:"10px 12px", borderRadius:10, marginBottom:5,
                          background: m.isMe
                            ? `${COLORS.accent}10`
                            : idx===0 ? `${COLORS.gold}10` : "rgba(255,255,255,0.03)",
                          border:`1.5px solid ${m.isMe ? COLORS.accent+"55" : idx===0 ? COLORS.gold+"33" : "transparent"}` }}>
                          <div style={{ fontSize:m.isMe?16:14, minWidth:28, textAlign:"center", fontWeight:700 }}>{medal}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontWeight: m.isMe ? 700 : 500, fontSize:13,
                                color: m.isMe ? COLORS.accent : COLORS.text }}>
                                {m.userName}
                              </span>
                              {m.isMe && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:8,
                                background:`${COLORS.accent}22`, color:COLORS.accent, fontWeight:700 }}>YOU</span>}
                            </div>
                            <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:2, marginTop:4 }}>
                              <div style={{ height:"100%", width:`${barW}%`,
                                background: m.isMe ? COLORS.accent : idx===0 ? COLORS.gold : idx===1 ? "#94a3b8" : COLORS.accent3,
                                borderRadius:2 }} />
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontWeight:700, fontSize:14,
                              color: m.lost > 0 ? COLORS.success : m.lost < 0 ? COLORS.warn : COLORS.muted }}>
                              {m.lost > 0 ? "▼" : m.lost < 0 ? "▲" : "—"} {Math.abs(m.lost)} kg
                            </div>
                            <div style={{ fontSize:10, color:COLORS.muted }}>{m.currentW} kg now</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}







// ── StepCounter — device pedometer / motion sensor step detection ─────────────

// ── UserCard ──
function UserCard({ u, deleteUser, enableUser, approveUser, rejectUser, changeUserPassword, COLORS, S, allFoodLogs }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  const [editPass, setEditPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const p = u.profile_data || {};
  const d = u.device_info || {};

  // Compute health metrics from profile
  const metrics = p.weight && p.height && p.age && p.gender ? (() => {
    const w = parseFloat(p.weight), h = parseFloat(p.height), age = parseInt(p.age);
    const g = p.gender;
    const bmi = +(w / ((h/100)**2)).toFixed(1);
    const bf = +(1.20*bmi + 0.23*age - 10.8*(g==="Male"?1:0) - 5.4).toFixed(1);
    const bmr = g==="Male" ? +(10*w+6.25*h-5*age+5).toFixed(0) : +(10*w+6.25*h-5*age-161).toFixed(0);
    const lbm = w*(1-bf/100);
    const bmiCat = bmi<18.5?"Underweight":bmi<25?"Normal":bmi<30?"Overweight":"Obese";
    const bmiColor = bmi<18.5?"#4f8ef7":bmi<25?"#00d4aa":bmi<30?"#f7934f":"#f7504f";
    const healthyBF = g==="Male"?18:25;
    const bfPenalty = bf>healthyBF ? Math.round((bf-healthyBF)/5*1.5) : 0;
    // Visceral fat: BF%-threshold + age proxy (Gallagher 2000 + Bergman 2011)
    const vfThreshold = g === "Female" ? 30 : 20;
    const vfExcess = Math.max(0, bf - vfThreshold);
    const vfAge = Math.max(0, age - 20) * 0.12;
    const vf = +(Math.min(15, Math.max(1, 1 + vfExcess * 0.35 + vfAge)).toFixed(1));
    const vfPenalty = vf>9 ? Math.round((vf-9)*0.8) : 0;
    const refBMR = (a) => g==="Male" ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161;
    let metaAge=age, minD=Infinity;
    for(let a=10;a<=90;a++){const dd=Math.abs(bmr-refBMR(a));if(dd<minD){minD=dd;metaAge=a;}}
    metaAge = Math.max(10,Math.min(90,metaAge+bfPenalty+vfPenalty));
    // Watson (1980) body water formula
    const bw = g==="Male"
      ? +(2.447 - 0.09156*age + 0.1074*h + 0.3362*w).toFixed(1)
      : +(-2.097 + 0.1069*h + 0.2466*w).toFixed(1);
    return {
      bmi, bmiCat, bmiColor, bf, bmr,
      muscleMass: +(lbm*0.50).toFixed(1),        // Janssen 2000: 50% of LBM
      fatFree: +lbm.toFixed(1),
      bodyWater: bw,                               // Watson 1980
      boneMass: +(lbm*0.058).toFixed(1),           // Heymsfield: 5.8% of LBM
      visceralFat: vf,
      protein: +(w*1.6).toFixed(1),
      metabolicAge: metaAge,
      dailyWater: +((w*0.033)+(p.fitnessLevel==="Active"?0.75:p.fitnessLevel==="Moderate"?0.5:0.25)).toFixed(1),
    };
  })() : null;

  return (
    <div style={{ background: COLORS.card2, borderRadius: 12, padding: "14px 16px", border: `1px solid rgba(255,255,255,0.08)` }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${COLORS.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent, fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
          {(u.name||"U")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: COLORS.text }}>{u.name}</div>
          <div style={{ fontSize: 12, color: COLORS.muted }}>@{u.username} · {u.country||"—"}{u.state ? `, ${u.state}` : ""} · Joined {u.created_at?.split("T")[0]}</div>
          <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
            {u.lastSeen && <span style={{ fontSize:11, color:(Date.now()-new Date(u.lastSeen).getTime())<86400000?COLORS.success:COLORS.muted }}>🕐 {(Date.now()-new Date(u.lastSeen).getTime())<3600000?Math.floor((Date.now()-new Date(u.lastSeen).getTime())/60000)+"m ago":(Date.now()-new Date(u.lastSeen).getTime())<86400000?Math.floor((Date.now()-new Date(u.lastSeen).getTime())/3600000)+"h ago":Math.floor((Date.now()-new Date(u.lastSeen).getTime())/86400000)+"d ago"}</span>}
            {u.profile_data?.savedMealPlan?<span style={{fontSize:11,color:COLORS.success}}>✅ Meal plan</span>:<span style={{fontSize:11,color:COLORS.accent3}}>⚠️ No meal plan</span>}
            {u.profile_data?.targetWeight&&u.profile_data?.weight&&<span style={{fontSize:11,color:COLORS.accent2}}>🎯 {Math.abs((+u.profile_data.weight-+u.profile_data.targetWeight).toFixed(1))}kg to goal</span>}
          </div>
        </div>
        <div style={{ fontSize: 12, color: COLORS.muted }}>{p.weight ? `${p.weight}kg · ${p.age}y · ${p.gender}` : "No profile"}</div>
        <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: u.active ? `${COLORS.success}22` : `${COLORS.warn}22`, color: u.active ? COLORS.success : COLORS.warn }}>
          {u.active ? "Active" : "Disabled"}
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{ background: "transparent", border: `1px solid ${COLORS.accent2}44`, borderRadius: 8, padding: "5px 12px", color: COLORS.accent2, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          {expanded ? "▲ Hide" : "▼ Details"}
        </button>
        {u.active
          ? <button style={{ background: "transparent", border: `1px solid ${COLORS.warn}`, borderRadius: 8, padding: "6px 14px", color: COLORS.warn, fontSize: 13, cursor: "pointer" }} onClick={() => deleteUser(u.id)}>Disable</button>
          : <button style={{ background: "transparent", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, padding: "6px 14px", color: "#8892aa", fontSize: 13, cursor: "pointer" }} onClick={() => enableUser(u.id)}>Enable</button>
        }
        {confirmDelete
          ? <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:12, color: COLORS.warn }}>Sure?</span>
              <button onClick={() => { deleteUser(u.id); setConfirmDelete(false); }} style={{ background: COLORS.warn, border:"none", borderRadius:6, padding:"4px 10px", color:"#fff", fontSize:12, cursor:"pointer", fontWeight:600 }}>Yes, Delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background:"transparent", border:`1px solid ${COLORS.border}`, borderRadius:6, padding:"4px 10px", color:COLORS.muted, fontSize:12, cursor:"pointer" }}>Cancel</button>
            </div>
          : <button onClick={() => setConfirmDelete(true)} style={{ background:"transparent", border:`1px solid #ff444444`, borderRadius:8, padding:"6px 14px", color:"#ff4444", fontSize:13, cursor:"pointer" }}>🗑 Delete</button>
        }
        <button onClick={() => {
          const pw = window.prompt(`Set new password for ${u.name||u.username}:`);
          if (pw && pw.length >= 4) { changeUserPassword(u.id, pw); }
          else if (pw) alert("Password must be at least 4 characters.");
        }} style={{ background:"transparent", border:`1px solid ${COLORS.accent3}44`,
          borderRadius:8, padding:"6px 14px", color:COLORS.accent3, fontSize:13, cursor:"pointer" }}>
          🔑 Reset PW
        </button>
        {u.approved !== false && (
          <PrintReportButton
            currentUser={u} profile={u.profile_data||{}} metrics={null}
            userLogs={[]} foodLogs={[]} sleepLogs={[]} calorieBurns={[]}
            COLORS={COLORS} FONTS={{ head:"'Syne',sans-serif", body:"'Inter',sans-serif" }}
            S={S} label="Report"
          />
        )}
      </div>

      {/* Expanded — tabbed view */}
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid rgba(255,255,255,0.08)` }}>

          {/* Tab bar — all 15 user tabs */}
          <div style={{ display:"flex", gap:5, marginBottom:14, overflowX:"auto",
            paddingBottom:4, scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
            {[
              ["account",    "👤 Account"],
              ["today",      "📅 Today"],
              ["metrics",    "📊 Metrics"],
              ["progress",   "📈 Progress"],
              ["foodlog",    "🍱 Food Log"],
              ["calorieburn","🔥 Calorie Burn"],
              ["sleep",      "😴 Sleep"],
              ["steps",      "👟 Steps"],
              ["vitals",     "❤️ Vitals"],
              ["insights",   "🤖 AI Insights"],
              ["workout",    "💪 Workout"],
              ["diet",       "🍽️ Meal Plan"],
              ["challenges", "🏆 Challenges"],
              ["foodscore",  "🥗 Food Score"],
              ["device",     "📱 Device"],
            ].map(([k,l]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                style={{ padding:"5px 14px", borderRadius:20, fontSize:11, cursor:"pointer",
                  whiteSpace:"nowrap", flexShrink:0,
                  border: activeTab===k ? "none" : `1px solid rgba(255,255,255,0.08)`,
                  background: activeTab===k ? `linear-gradient(135deg,${COLORS.accent},${COLORS.accent2})` : "transparent",
                  color: activeTab===k ? "#07121f" : "#8892aa",
                  fontWeight: activeTab===k ? 700 : 400 }}>{l}</button>
            ))}
          </div>

          {/* ACCOUNT TAB */}
          {activeTab === "account" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 14 }}>
                {[["Username", u.username], ["Country", `${u.country||"—"}${u.state?` / ${u.state}`:""}`], ["Registered", u.created_at?.split("T")[0]], ["Goal", p.goal||"—"], ["Food Pref", p.foodPref||"—"], ["Fitness Level", p.fitnessLevel||"—"], ["Workout Type", p.workoutType||"—"], ["Conditions", (p.conditions||[]).join(", ")||"None"], ["Medications", p.medications||"None"]].map(([l,v]) => (
                  <div key={l} style={{ background:"#0a0f1e", borderRadius:8, padding:"8px 12px" }}>
                    <div style={{ fontSize:10, color:COLORS.muted, fontWeight:600, marginBottom:2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontSize:12, color:COLORS.text }}>{v}</div>
                  </div>
                ))}
                <div style={{ background:"#0a0f1e", borderRadius:8, padding:"8px 12px" }}>
                  <div style={{ fontSize:10, color:COLORS.muted, fontWeight:600, marginBottom:4 }}>PASSWORD</div>
                  <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                    <span style={{ fontSize:13, color:COLORS.text, fontFamily:"monospace" }}>{showPass ? u.password_hash : "••••••••"}</span>
                    <button onClick={() => setShowPass(!showPass)} style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.08)`, borderRadius:6, padding:"1px 8px", color:"#8892aa", fontSize:11, cursor:"pointer" }}>{showPass?"Hide":"Show"}</button>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              {p.schedule?.length > 0 && (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:COLORS.accent, fontWeight:700, letterSpacing:1, marginBottom:8 }}>DAILY SCHEDULE</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {p.schedule.map((s,i) => <span key={i} style={{ padding:"3px 10px", borderRadius:20, background:"#111827", border:`1px solid rgba(255,255,255,0.08)`, fontSize:12, color:"#8892aa" }}>{s.time} — {s.label}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HEALTH METRICS TAB */}
          {activeTab === "metrics" && (
            <div>
              {metrics ? (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))", gap:8, marginBottom:12 }}>
                    {[
                      ["BMI", `${metrics.bmi}`, metrics.bmiColor, metrics.bmiCat],
                      ["Body Fat", `${metrics.bf}%`, "#f7934f", null],
                      ["BMR", `${metrics.bmr} kcal`, "#4f8ef7", null],
                      ["Muscle Mass", `${metrics.muscleMass} kg`, "#00d4aa", null],
                      ["Fat-free Wt", `${metrics.fatFree} kg`, "#8892aa", null],
                      ["Body Water", `${metrics.bodyWater} L`, "#4f8ef7", null],
                      ["Bone Mass", `${metrics.boneMass} kg`, "#8892aa", null],
                      ["Visceral Fat", `${metrics.visceralFat}/15`, metrics.visceralFat>10?"#f7504f":"#00d4aa", null],
                      ["Protein Need", `${metrics.protein} g/day`, "#4f8ef7", null],
                      ["Metabolic Age", `${metrics.metabolicAge} yrs`, metrics.metabolicAge>(parseInt(p.age)||30)?"#f7934f":"#00d4aa", null],
                      ["Daily Water", `${metrics.dailyWater} L`, "#4f8ef7", null],
                    ].map(([l,v,c,sub]) => (
                      <div key={l} style={{ background:"#0a0f1e", borderRadius:8, padding:"10px 12px" }}>
                        <div style={{ fontSize:10, color:COLORS.muted, fontWeight:600, marginBottom:4 }}>{l.toUpperCase()}</div>
                        <div style={{ fontSize:18, fontWeight:700, color:c }}>{v}</div>
                        {sub && <div style={{ fontSize:11, color:c, marginTop:2 }}>{sub}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ background:`${COLORS.accent}0d`, borderRadius:8, padding:"10px 14px", fontSize:12, color:COLORS.muted }}>
                    Based on: <b style={{ color:COLORS.text }}>{p.weight}kg · {p.height}cm · {p.age}y · {p.gender}</b>
                    {p.targetWeight && <> · Target: <b style={{ color:COLORS.accent }}>{p.targetWeight}kg</b></>}
                  </div>
                </>
              ) : (
                <div style={{ textAlign:"center", padding:"2rem", color:COLORS.muted, fontSize:14 }}>User hasn't completed their health profile yet.</div>
              )}
            </div>
          )}

          {/* DIET PLAN TAB */}
          {activeTab === "diet" && (
            <AdminDietPlan p={p} metrics={metrics} u={u} COLORS={COLORS}
              onPlanSaved={async (plan) => {
                const updatedProfile = { ...p, savedMealPlan: plan };
                await updateDoc(doc(db, "users", String(u.id)), { profile_data: updatedProfile });
              }}
            />
          )}


          {/* TODAY'S PLAN TAB */}
          {activeTab === "today" && (() => {
            const schedule = p.schedule || [];
            // smart times helper inline
            const toMinI = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
            const toTimeI = (mins) => { const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60); const mm = ((mins % 1440) + 1440) % 1440 % 60; return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`; };
            const find = (kws) => schedule.find(s => kws.some(k => s.label.toLowerCase().includes(k)));
            const wakeMin = toMinI(find(["wake","morning"])?.time) ?? 360;
            const sleepMin = toMinI(find(["sleep","bed"])?.time) ?? 1380;
            const gymMin = toMinI(find(["gym","workout","yoga"])?.time);
            const officeMin = toMinI(find(["office","work","college"])?.time) ?? 540;
            let bfMin = wakeMin + 40;
            if (gymMin && gymMin < officeMin) bfMin = gymMin + 30;
            const lunchMin = toMinI(find(["lunch break","lunch"])?.time) ?? bfMin + 270;
            const snackMin = lunchMin + 165;
            const dinnerMin = Math.max(1140, sleepMin - 120);

            const smartTimes = {
              breakfast: toTimeI(bfMin), lunch: toTimeI(lunchMin),
              eveningSnack: toTimeI(snackMin), dinner: toTimeI(dinnerMin),
              preWorkout: gymMin ? toTimeI(gymMin - 30) : null,
              wakeTime: find(["wake"])?.time || toTimeI(wakeMin),
              sleepTime: find(["sleep"])?.time || toTimeI(sleepMin),
            };
            const dailyWater = +((parseFloat(p.weight)||70)*0.033 + (p.fitnessLevel==="Active"?0.75:p.fitnessLevel==="Moderate"?0.5:0.25)).toFixed(1);
            const likedFoods = p.likedFoods || {};
            const conditions = p.conditions || [];

            // Build timeline
            const items = [];
            schedule.forEach(s => {
              const lbl = s.label.toLowerCase();
              let suggestion = "Stay active & hydrated";
              if (lbl.includes("wake")) suggestion = "1 glass warm water + stretch";
              else if (lbl.includes("gym")||lbl.includes("workout")) suggestion = "Pre-workout: water + light snack 30min before";
              else if (lbl.includes("office")||lbl.includes("work")) suggestion = "Carry a 1L water bottle to desk";
              else if (lbl.includes("sleep")||lbl.includes("bed")) suggestion = "Avoid screens, have turmeric milk";
              items.push({ time: s.time, activity: s.label, suggestion, type: "schedule" });
            });
            [
              { time: smartTimes.breakfast, activity: "Breakfast", suggestion: (likedFoods.Breakfast||[]).slice(0,2).join(" + ")||"Healthy breakfast", type: "meal" },
              { time: smartTimes.lunch, activity: "Lunch", suggestion: (likedFoods.Lunch||[]).slice(0,2).join(" + ")||"Balanced lunch", type: "meal" },
              { time: smartTimes.eveningSnack, activity: "Evening Snack", suggestion: (likedFoods["Evening Snack"]||[]).slice(0,2).join(" + ")||"Light snack", type: "meal" },
              { time: smartTimes.dinner, activity: "Dinner", suggestion: (likedFoods.Dinner||[]).slice(0,2).join(" + ")||"Light dinner", type: "meal" },
              ...(smartTimes.preWorkout ? [{ time: smartTimes.preWorkout, activity: "Pre-Workout Fuel", suggestion: "Banana or black coffee", type: "meal" }] : []),
            ].forEach(m => { if (!items.find(i => i.time === m.time)) items.push(m); });
            items.sort((a,b) => a.time.localeCompare(b.time));

            return (
              <div>
                {/* Medical food adjustments */}
                {conditions.filter(c => MEDICAL_FOOD_ADJUSTMENTS[c]).length > 0 && (
                  <div style={{ background:"#2a1500", border:"1px solid #f7934f55", borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#f7934f", marginBottom:8 }}>⚕️ Dietary Adjustments</div>
                    {conditions.filter(c => MEDICAL_FOOD_ADJUSTMENTS[c]).map(c => (
                      <div key={c} style={{ marginBottom:6, fontSize:12 }}>
                        <span style={{ fontWeight:600, color:"#f7934f" }}>{c}: </span>
                        <span style={{ color:"#00d4aa" }}>Prefer — {MEDICAL_FOOD_ADJUSTMENTS[c].prefer.slice(0,4).join(", ")}</span>
                        <span style={{ color:"#8892aa" }}> · Avoid — {MEDICAL_FOOD_ADJUSTMENTS[c].avoid.slice(0,4).join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Smart meal schedule */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:8, marginBottom:14 }}>
                  {[
                    { label:"Breakfast", time:smartTimes.breakfast, icon:"🌅" },
                    { label:"Lunch", time:smartTimes.lunch, icon:"☀️" },
                    { label:"Snack", time:smartTimes.eveningSnack, icon:"🍎" },
                    { label:"Dinner", time:smartTimes.dinner, icon:"🌙" },
                    { label:"Water", time:`${dailyWater}L`, icon:"💧" },
                    ...(smartTimes.preWorkout ? [{ label:"Pre-Workout", time:smartTimes.preWorkout, icon:"💪" }] : []),
                  ].map(({ label, time, icon }) => (
                    <div key={label} style={{ background:"#0a0f1e", borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                      <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                      <div style={{ fontSize:10, color:"#8892aa", marginBottom:2 }}>{label.toUpperCase()}</div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#4f8ef7" }}>{time}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:10, color:"#f0f4ff" }}>Hour-by-Hour Timeline</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ background:"#0a0f1e", borderRadius:8, padding:"10px 12px", display:"flex", gap:12, alignItems:"flex-start", borderLeft:`3px solid ${item.type==="water"?"#4f8ef7":item.type==="meal"?"#00d4aa":"rgba(255,255,255,0.08)"}` }}>
                      <div style={{ minWidth:48, fontSize:12, fontWeight:700, color:item.type==="meal"?"#00d4aa":"#8892aa" }}>{item.time}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#f0f4ff" }}>{item.activity}</div>
                        <div style={{ fontSize:11, color:"#8892aa" }}>{item.suggestion}</div>
                      </div>
                      <div style={{ fontSize:14 }}>{item.type==="water"?"💧":item.type==="meal"?"🍽️":"📍"}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* PROGRESS TAB */}
          {activeTab === "progress" && (() => {
            // UserCard doesn't have logs; show a prompt
            return (
              <div>
                {metrics ? (
                  <>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:8, marginBottom:14 }}>
                      {[
                        ["BMI", `${metrics.bmi}`, metrics.bmiColor, metrics.bmiCat],
                        ["Body Fat", `${metrics.bf}%`, "#f7934f", null],
                        ["Muscle Mass", `${metrics.muscleMass} kg`, "#00d4aa", null],
                        ["Visceral Fat", `${metrics.visceralFat}/15`, metrics.visceralFat>10?"#f7504f":"#00d4aa", null],
                        ["Metabolic Age", `${metrics.metabolicAge} yrs`, metrics.metabolicAge>(parseInt(p.age)||30)?"#f7934f":"#00d4aa", null],
                        ["Daily Water", `${metrics.dailyWater} L`, "#4f8ef7", null],
                      ].map(([l,v,c,sub]) => (
                        <div key={l} style={{ background:"#0a0f1e", borderRadius:8, padding:"10px 12px" }}>
                          <div style={{ fontSize:10, color:"#8892aa", fontWeight:600, marginBottom:4 }}>{l.toUpperCase()}</div>
                          <div style={{ fontSize:18, fontWeight:700, color:c }}>{v}</div>
                          {sub && <div style={{ fontSize:11, color:c, marginTop:2 }}>{sub}</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{ background:"#0a0f1e", borderRadius:10, padding:"12px 16px" }}>
                      <div style={{ fontSize:12, color:"#8892aa" }}>
                        Profile: <b style={{ color:"#f0f4ff" }}>{p.weight}kg · {p.height}cm · {p.age}y · {p.gender}</b>
                        {p.targetWeight && <> · Target: <b style={{ color:"#00d4aa" }}>{p.targetWeight}kg</b></>}
                        <br/>
                        Goal: <b style={{ color:"#f0f4ff" }}>{p.goal||"—"}</b> · Conditions: <b style={{ color:p.conditions?.length?"#f7934f":"#8892aa" }}>{(p.conditions||[]).join(", ")||"None"}</b>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:"center", padding:"2rem", color:"#8892aa", fontSize:14 }}>User hasn't completed health profile yet.</div>
                )}
              </div>
            );
          })()}

          {/* WORKOUT TAB */}
          {activeTab === "workout" && (() => {
            const level = p.fitnessLevel || "Beginner";
            const wType = p.workoutType || "Home";
            const freq = p.workoutFrequency || "3x per week";
            const freqNum = parseInt(freq) || 3;
            const conditions = p.conditions || [];
            const medLimit = getMedicalIntensityLimit(conditions);
            const effectiveLevel = medLimit || level;
            const dur = effectiveLevel === "Beginner" ? 45 : effectiveLevel === "Moderate" ? 60 : 75;
            const warnings = getMedicalWorkoutWarnings(conditions);

            // Simple split label for display
            const HOME_LABELS = { 1:"Full Body", 2:"Upper / Lower", 3:"Push / Pull / Legs", 4:"4-day Split", 5:"5-day Split", 6:"6-day Split" };
            const GYM_LABELS  = { 1:"Full Body", 2:"Upper / Lower", 3:"Push / Pull / Legs", 4:"4-day PPL+Legs", 5:"5-day Bro Split", 6:"6-day Bro Split" };
            const splitLabel = wType === "Gym" ? (GYM_LABELS[Math.min(freqNum,6)]||"3-day split") : (HOME_LABELS[Math.min(freqNum,6)]||"3-day split");

            const SAMPLE_HOME = {
              Beginner: ["Push-ups 3×12","Bodyweight Squats 3×15","Glute Bridge 3×15","Plank 3×30s","Superman 3×10","Calf Raise 3×15"],
              Moderate: ["Push-ups 4×15","Jump Squat 3×12","Inverted Row 3×10","Lunge 3×12 each","Pike Push-up 3×10","Mountain Climbers 3×20"],
              Active: ["Diamond Push-ups 4×15","Bulgarian Split Squat 3×12","Pull-ups 4×8","Jump Lunge 3×12","Dips 3×15","Hollow Body Hold 3×30s"],
            };
            const SAMPLE_GYM = {
              Beginner: ["Leg Press 3×12","Chest Press Machine 3×12","Lat Pulldown 3×12","Dumbbell Curl 3×12","Tricep Pushdown 3×12","Plank 3×30s"],
              Moderate: ["Barbell Squat 4×8","Bench Press 4×8","Barbell Row 4×8","Overhead Press 3×10","Dumbbell Curl 3×12","Cable Crunch 3×15"],
              Active: ["Deadlift 4×6","Incline Bench 4×8","Weighted Pull-ups 3×8","Romanian Deadlift 3×10","Barbell Curl 3×12","Face Pull 3×15"],
            };
            const SAMPLE_OUTDOOR = {
              Beginner: ["20 min brisk walk","Push-ups 3×12","Bodyweight Squats 3×15","Calf Raise 3×15","Park Bench Dips 3×10"],
              Moderate: ["25 min jog","Push-ups 4×15","Park Pull-ups 3×8","Jump Squat 3×12","Lunge 3×12 each"],
              Active: ["30 min run","Sprint Intervals 6×100m","Push-ups 4×20","Pull-ups 4×10","Plyometric Jumps 3×10"],
            };
            const sampleMap = wType==="Gym"?SAMPLE_GYM:wType==="Home"?SAMPLE_HOME:SAMPLE_OUTDOOR;
            const exercises = filterExercisesForMedical(sampleMap[effectiveLevel]||sampleMap["Beginner"], conditions);

            return (
              <div>
                {/* Medical warnings */}
                {warnings.length > 0 && (
                  <div style={{ background:"#1a0a1a", border:"1px solid #f7504f55", borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#f7504f", marginBottom:8 }}>⚠️ Workout Adjustments</div>
                    {warnings.map(({ condition, warning }) => (
                      <div key={condition} style={{ marginBottom:5, fontSize:12 }}>
                        <span style={{ fontWeight:600, color:"#f7934f" }}>{condition}: </span>
                        <span style={{ color:"#f0f4ff" }}>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Home tip */}
                {wType === "Home" && (
                  <div style={{ background:"#001a12", border:"1px solid #00d4aa44", borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#00d4aa", marginBottom:6 }}>🏠 Home Workout (No Equipment)</div>
                    <div style={{ fontSize:12, color:"#f0f4ff", lineHeight:1.6 }}>
                      Bodyweight training — no gym needed. Use chair for dips, wall for support, floor mat for ground exercises.
                    </div>
                  </div>
                )}
                {/* Stats */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8, marginBottom:14 }}>
                  {[
                    ["Type", wType, "#00d4aa"],
                    ["Level", effectiveLevel, "#4f8ef7"],
                    ["Split", splitLabel, "#f7934f"],
                    ["Duration", `${dur} min`, "#00d4aa"],
                    ["Frequency", freq, "#4f8ef7"],
                    ["Cal Burn", `~${dur*(effectiveLevel==="Beginner"?5:effectiveLevel==="Moderate"?7:9)} kcal`, "#f7934f"],
                  ].map(([l,v,c]) => (
                    <div key={l} style={{ background:"#0a0f1e", borderRadius:8, padding:"8px 12px" }}>
                      <div style={{ fontSize:10, color:"#8892aa", fontWeight:600, marginBottom:3 }}>{l.toUpperCase()}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Sample exercises */}
                <div style={{ fontWeight:700, fontSize:14, color:"#f0f4ff", marginBottom:10 }}>Sample Exercises ({effectiveLevel})</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {exercises.map((ex, i) => (
                    <div key={i} style={{ display:"flex", gap:10, alignItems:"center", background:"#0a0f1e", borderRadius:8, padding:"8px 12px" }}>
                      <div style={{ width:22, height:22, borderRadius:"50%", background:"#00d4aa22", display:"flex", alignItems:"center", justifyContent:"center", color:"#00d4aa", fontWeight:700, fontSize:11, flexShrink:0 }}>{i+1}</div>
                      <div style={{ fontSize:13, color:"#f0f4ff" }}>{ex}</div>
                    </div>
                  ))}
                </div>
                {medLimit && (
                  <div style={{ background:"#2a1500", borderRadius:8, padding:"10px 14px", marginTop:12, fontSize:12, color:"#f7934f" }}>
                    ⚕️ Intensity limited to <b>{medLimit}</b> due to medical conditions. Consult your doctor before increasing intensity.
                  </div>
                )}
              </div>
            );
          })()}
          {/* FOOD SCORE TAB — Admin view */}
          {activeTab === "foodscore" && (() => {
            const likedFoods = p.likedFoods || {};
            const allEntries = [];
            const mealLabels = { Breakfast:"🌅 Breakfast", Lunch:"☀️ Lunch", "Evening Snack":"🍎 Snack", Dinner:"🌙 Dinner", Munching:"🥜 Munching", Fruits:"🍉 Fruits" };
            Object.entries(likedFoods).forEach(([meal, foods]) => {
              (foods || []).forEach(food => {
                const health = getFoodHealth(food);
                allEntries.push({ food, meal, mealLabel: mealLabels[meal] || meal, ...health });
              });
            });

            if (allEntries.length === 0) {
              return <div style={{ textAlign:"center", padding:"2rem", color:"#8892aa", fontSize:14 }}>User hasn't selected food preferences yet.</div>;
            }

            const healthy   = allEntries.filter(e => e.status === "healthy");
            const moderate  = allEntries.filter(e => e.status === "moderate");
            const unhealthy = allEntries.filter(e => e.status === "unhealthy");
            const avgScore  = +(allEntries.reduce((a,e) => a + e.score, 0) / allEntries.length).toFixed(1);
            const dietGrade = avgScore >= 8 ? "A" : avgScore >= 6.5 ? "B" : avgScore >= 5 ? "C" : "D";
            const gradeColor = avgScore >= 8 ? COLORS.success : avgScore >= 6.5 ? COLORS.accent : avgScore >= 5 ? COLORS.accent3 : COLORS.warn;

            return (
              <div>
                {/* Grade summary */}
                <div style={{ display:"flex", gap:14, alignItems:"center", background:`${gradeColor}0d`, border:`1px solid ${gradeColor}30`, borderRadius:10, padding:"12px 16px", marginBottom:14, flexWrap:"wrap" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:44, fontWeight:800, color:gradeColor, lineHeight:1 }}>{dietGrade}</div>
                    <div style={{ fontSize:10, color:"#8892aa", fontWeight:600 }}>DIET GRADE</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:14, color:gradeColor, marginBottom:4 }}>
                      {avgScore >= 8 ? "Excellent food choices!" : avgScore >= 6.5 ? "Good diet, some improvements possible." : avgScore >= 5 ? "Average diet — several items need replacing." : "Diet needs significant improvement."}
                    </div>
                    <div style={{ fontSize:12, color:"#8892aa" }}>Avg score: <b style={{ color:gradeColor }}>{avgScore}/10</b> · {allEntries.length} foods · {unhealthy.length} unhealthy</div>
                    <div style={{ marginTop:6, height:5, background:"rgba(255,255,255,0.07)", borderRadius:3 }}>
                      <div style={{ height:"100%", width:`${(avgScore/10)*100}%`, background:gradeColor, borderRadius:3 }} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {[{l:"✅",c:healthy.length,col:COLORS.success},{l:"⚡",c:moderate.length,col:COLORS.accent3},{l:"⚠️",c:unhealthy.length,col:COLORS.warn}].map(({l,c,col}) => (
                      <div key={l} style={{ textAlign:"center", background:`${col}15`, borderRadius:8, padding:"6px 12px" }}>
                        <div style={{ fontSize:16, fontWeight:700, color:col }}>{c}</div>
                        <div style={{ fontSize:9, color:"#8892aa" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div style={{ background:"#0a0f1e", borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
                  {/* Header */}
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 3fr", gap:0, padding:"8px 14px", background:"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                    {["FOOD ITEM","MEAL","STATUS","SUGGESTION"].map(h => (
                      <div key={h} style={{ fontSize:9, fontWeight:700, color:"#8892aa", letterSpacing:0.8 }}>{h}</div>
                    ))}
                  </div>
                  {/* Rows */}
                  {allEntries.map((entry, i) => {
                    const sc = entry.status === "healthy" ? COLORS.success : entry.status === "moderate" ? COLORS.accent3 : COLORS.warn;
                    const icon = entry.status === "healthy" ? "✅" : entry.status === "moderate" ? "⚡" : "⚠️";
                    const lbl = entry.status === "healthy" ? "Healthy" : entry.status === "moderate" ? "Moderate" : "Unhealthy";
                    return (
                      <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 3fr", gap:0, padding:"10px 14px", borderBottom: i < allEntries.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: i%2===0 ? "transparent" : "rgba(255,255,255,0.01)", alignItems:"start" }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13, color:"#f0f4ff", marginBottom:2 }}>{entry.food}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <div style={{ height:3, width:50, background:"rgba(255,255,255,0.07)", borderRadius:2 }}>
                              <div style={{ height:"100%", width:`${entry.score*10}%`, background:sc, borderRadius:2 }} />
                            </div>
                            <span style={{ fontSize:10, color:sc, fontWeight:700 }}>{entry.score}/10</span>
                            {entry.cal && <span style={{ fontSize:9, color:"#8892aa" }}>{entry.cal}kcal</span>}
                          </div>
                        </div>
                        <div style={{ fontSize:11, color:"#8892aa", paddingTop:2 }}>{entry.mealLabel}</div>
                        <div style={{ paddingTop:2 }}>
                          <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"3px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:`${sc}18`, color:sc, border:`1px solid ${sc}33`, whiteSpace:"nowrap" }}>
                            {icon} {lbl}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color: entry.status === "healthy" ? COLORS.success : "#8892aa" }}>
                          {entry.status !== "healthy" ? (
                            <span><span style={{ color:COLORS.success, fontWeight:600 }}>→ {entry.suggestion.split("(")[0].trim()}</span><br/><span style={{ fontSize:10, color:"#8892aa" }}>{entry.reason.slice(0,70)}…</span></span>
                          ) : entry.suggestion}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {unhealthy.length > 0 && (
                  <div style={{ marginTop:10, padding:"10px 14px", background:`${COLORS.warn}0a`, border:`1px solid ${COLORS.warn}30`, borderRadius:10, fontSize:12, color:"#8892aa" }}>
                    ⚠️ This user has <b style={{ color:COLORS.warn }}>{unhealthy.length} unhealthy food choices</b>. Consider adjusting their AI meal plan to use healthier alternatives.
                  </div>
                )}
              </div>
            );
          })()}

          {/* FOOD LOG TAB — admin view */}
          {activeTab === "foodlog" && (() => {
            const userFoodLogs = (allFoodLogs || []).filter(l => l.user_id === u.id);
            const today2 = new Date().toISOString().split("T")[0];
            const logsByDate2 = {};
            userFoodLogs.forEach(l => {
              if (!logsByDate2[l.logged_date]) logsByDate2[l.logged_date] = [];
              logsByDate2[l.logged_date].push(l);
            });
            const dates = Object.keys(logsByDate2).sort().reverse().slice(0, 14);
            const statusColor2 = (s) => s==="healthy"?COLORS.success:s==="moderate"?COLORS.accent3:COLORS.warn;

            // Calorie target
            const bmiA = p.weight&&p.height ? calcBMI(+p.weight,+p.height) : 22;
            const bmrA = p.weight&&p.height&&p.age ? calcBMR(+p.weight,+p.height,+p.age,p.gender||"Male") : 1800;
            const amA = p.fitnessLevel==="Active"?1.55:p.fitnessLevel==="Moderate"?1.375:1.2;
            const isLoseA = (p.goal||"").toLowerCase().includes("lose");
            const targetA = isLoseA ? Math.round(bmrA*amA) - 500 : Math.round(bmrA*amA);

            if (userFoodLogs.length === 0) {
              return (
                <div style={{ textAlign:"center", padding:"2rem", color:"#8892aa" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🍱</div>
                  <div style={{ fontSize:14, color:COLORS.text, marginBottom:4 }}>No food logged yet</div>
                  <div style={{ fontSize:12 }}>User hasn't logged any meals.</div>
                </div>
              );
            }

            return (
              <div>
                {/* 14-day calorie overview */}
                {dates.length > 1 && (() => {
                  const chartData = dates.slice(0,14).reverse().map(date => {
                    const dayLogs = (logsByDate2[date]||[]).filter(l => l.meal_type !== "Water");
                    const total = dayLogs.reduce((s,l)=>s+(l.calories||0),0);
                    const d = new Date(date);
                    return { date, total, label: d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) };
                  });
                  return (
                    <div style={{ background:"#0a0f1e", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:COLORS.text, marginBottom:10 }}>
                        🔥 Calorie Intake (Last {chartData.length} days)
                      </div>
                      <CalorieBarChart data={chartData} targetCal={targetA} COLORS={COLORS} FONTS={FONTS} />
                    </div>
                  );
                })()}

                {/* Per-day log */}
                {dates.map(date => {
                  const dayLogs = logsByDate2[date] || [];
                  const foodLogs2 = dayLogs.filter(l => l.meal_type !== "Water");
                  const waterLogs2 = dayLogs.filter(l => l.meal_type === "Water");
                  const totalCal = foodLogs2.reduce((s,l)=>s+(l.calories||0),0);
                  const totalWater = waterLogs2.reduce((s,l)=>s+(l.calories||0),0);
                  const pctA = Math.min(100, Math.round(totalCal/targetA*100));
                  const barColA = totalCal > targetA ? COLORS.warn : totalCal >= targetA*0.85 ? COLORS.success : COLORS.accent;
                  return (
                    <div key={date} style={{ background:"#0a0f1e", borderRadius:10, padding:"12px 14px", marginBottom:10, border:"1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:COLORS.text }}>
                          {date === today2 ? "Today" : new Date(date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
                        </div>
                        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                          {totalWater > 0 && <span style={{ fontSize:11, color:COLORS.accent2 }}>💧 {totalWater}ml</span>}
                          <span style={{ fontWeight:700, fontSize:14, color:barColA }}>{totalCal} kcal</span>
                          <span style={{ fontSize:10, color:"#8892aa" }}>{pctA}% of target</span>
                        </div>
                      </div>
                      <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:2, marginBottom:10 }}>
                        <div style={{ height:"100%", width:`${pctA}%`, background:barColA, borderRadius:2 }}/>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                        {foodLogs2.map((entry, i) => {
                          const col = statusColor2(entry.health_status);
                          const timeStr = entry.logged_at
                            ? new Date(entry.logged_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})
                            : "";
                          return (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px",
                              background:"rgba(255,255,255,0.02)", borderRadius:6, borderLeft:`2px solid ${col}` }}>
                              {timeStr && <span style={{ fontSize:10, color:"#8892aa", minWidth:48 }}>{timeStr}</span>}
                              <span style={{ fontSize:12, fontWeight:600, color:"#f0f4ff", flex:1 }}>{entry.food_name}</span>
                              <span style={{ fontSize:10, color:"#8892aa" }}>{entry.quantity}</span>
                              <span style={{ fontSize:12, fontWeight:700, color:col }}>{entry.calories} kcal</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* DEVICE TAB */}
          {activeTab === "device" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px,1fr))", gap:8 }}>
              {[["Device", d.device||"—"], ["Browser", d.browser||"—"], ["OS", d.os||"—"], ["IP Address", d.ip||"—"], ["City", d.city||"—"], ["Country (IP)", d.country||"—"], ["Last Seen", d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "Never"], ["User Agent", d.userAgent ? d.userAgent.slice(0,40)+"..." : "—"]].map(([l,v]) => (
              <div key={l} style={{ background:"#0a0f1e", borderRadius:8, padding:"8px 12px" }}>
                <div style={{ fontSize:10, color:COLORS.muted, fontWeight:600, marginBottom:2 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:12, color:COLORS.text, wordBreak:"break-all" }}>{v}</div>
              </div>
            ))}
            </div>
          )}

          {/* ── Additional user tabs in admin ── */}
          {activeTab === "calorieburn" && (
            <AdminUserDataView collection="calorie_burns" userId={u.id} renderFn={(items) => (
              <CalorieBurnTab userId={u.id} calorieBurns={items} onBurnSaved={()=>{}} COLORS={COLORS} FONTS={{ head:"'Syne',sans-serif", body:"'Inter','DM Sans',sans-serif" }} S={S} />
            )} COLORS={COLORS} />
          )}
          {activeTab === "sleep" && (
            <AdminUserDataView collection="sleep_logs" userId={u.id} renderFn={(items) => (
              <SleepTracker userId={u.id} sleepLogs={items} onSaved={()=>{}} COLORS={COLORS} FONTS={{ head:"'Syne',sans-serif", body:"'Inter','DM Sans',sans-serif" }} S={S} />
            )} COLORS={COLORS} />
          )}
          {activeTab === "steps" && (
            <StepCounter userId={u.id} COLORS={COLORS} FONTS={{ head:"'Syne',sans-serif", body:"'Inter','DM Sans',sans-serif" }} S={S} />
          )}
          {activeTab === "vitals" && (
            <HealthVitalsTab userId={u.id} COLORS={COLORS} FONTS={{ head:"'Syne',sans-serif", body:"'Inter','DM Sans',sans-serif" }} S={S} />
          )}
          {activeTab === "insights" && (
            <AIHealthInsights
              currentUser={{ id: u.id }}
              profile={p}
              metrics={metrics}
              userLogs={[]}
              foodLogs={[]}
              sleepLogs={[]}
              calorieBurns={[]}
              COLORS={COLORS}
              FONTS={{ head:"'Syne',sans-serif", body:"'Inter','DM Sans',sans-serif" }}
              S={S}
            />
          )}
          {activeTab === "challenges" && (
            <UserCompetitions userId={u.id} userName={u.name||u.username}
              currentWeight={parseFloat(u.profile_data?.weight)||70} userLogs={[]}
              COLORS={COLORS} FONTS={{ head:"'Syne',sans-serif", body:"'Inter','DM Sans',sans-serif" }} S={S} notify={()=>{}} />
          )}

          )}
        </div>
      )}
    </div>
  );
}

// ── 30-day persistent session helpers ────────────────────────────────────────

// ── BroadcastBanner ──
function BroadcastBanner({ COLORS }) {
  const [bcast, setBcast] = useState(null);
  useEffect(() => {
    getDocs(collection(db, "broadcasts")).then(snap => {
      const msgs = snap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      if (msgs.length > 0) {
        const last = msgs[0];
        if (!localStorage.getItem("bcast_seen_"+last.id)) setBcast(last);
      }
    }).catch(()=>{});
  }, []);
  if (!bcast) return null;
  return (
    <div style={{ background:`linear-gradient(135deg,${COLORS.accent2},${COLORS.accent})`,
      padding:"10px 16px", display:"flex", justifyContent:"space-between",
      alignItems:"center", gap:10, flexWrap:"wrap" }}>
      <div style={{ fontSize:13, fontWeight:600, color:"#07121f" }}>📢 {bcast.message}</div>
      <button onClick={() => { localStorage.setItem("bcast_seen_"+bcast.id,"1"); setBcast(null); }}
        style={{ background:"rgba(0,0,0,0.15)", border:"none", borderRadius:20,
          padding:"4px 12px", fontSize:12, fontWeight:700, color:"#07121f", cursor:"pointer" }}>
        ✕ Dismiss
      </button>
    </div>
  );
}
// ── BroadcastHistory — shows past broadcasts in admin ────────────────────────

// ── BroadcastHistory ──
function BroadcastHistory({ COLORS, FONTS, S }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    getDocs(collection(db, "broadcasts")).then(snap => {
      setItems(snap.docs.map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,10));
    }).catch(()=>{});
  }, []);
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, marginBottom:8 }}>Past Broadcasts</div>
      {items.map(item => (
        <div key={item.id} style={{ ...S.metricCard, marginBottom:8, padding:"10px 14px" }}>
          <div style={{ fontSize:13, color:COLORS.text, marginBottom:4 }}>{item.message}</div>
          <div style={{ fontSize:11, color:COLORS.muted }}>
            {new Date(item.created_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
          </div>
        </div>
      ))}
    </div>
  );
}
// ── AdminFeedbackTab — view and delete user feedback ─────────────────────────

// ── AdminFeedbackTab ──
function AdminFeedbackTab({ COLORS, FONTS, S }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => { loadFeedback(); }, []);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "feedback"));
      setItems(snap.docs.map(d => ({ id:d.id, ...d.data() }))
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch(e) {}
    setLoading(false);
  };

  const deleteFeedback = async (id) => {
    await deleteDoc(doc(db, "feedback", id));
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const TYPE_COLORS = {
    suggestion: COLORS.accent2,
    feature:    COLORS.accent,
    bug:        COLORS.warn,
  };
  const TYPE_LABELS = {
    suggestion: "💡 Suggestion",
    feature:    "✨ Feature Request",
    bug:        "🐛 Bug Report",
  };

  return (
    <div>
      <div style={{ fontFamily:FONTS.head, fontSize:18, fontWeight:700, marginBottom:4 }}>
        💬 User Feedback
      </div>
      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:16 }}>
        {items.length} submission{items.length !== 1 ? "s" : ""}
      </div>

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[["all","All"],["suggestion","💡 Suggestions"],["feature","✨ Features"],["bug","🐛 Bugs"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilterType(k)}
            style={{ padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer",
              border:`1px solid ${filterType===k?COLORS.accent:COLORS.border}`,
              background:filterType===k?`${COLORS.accent}18`:"transparent",
              color:filterType===k?COLORS.accent:COLORS.muted, fontWeight:filterType===k?700:400 }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"2rem", color:COLORS.muted }}>Loading…</div>
      ) : items.filter(i=>filterType==="all"||i.type===filterType).length === 0 ? (
        <div style={{ ...S.metricCard, textAlign:"center", padding:"3rem" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
          <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:700, marginBottom:8 }}>
            No feedback yet
          </div>
          <div style={{ fontSize:13, color:COLORS.muted }}>
            Users can submit feedback using the 💬 button in their dashboard
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {items.filter(i=>filterType==="all"||i.type===filterType).map(item => {
            const col = TYPE_COLORS[item.type] || COLORS.accent;
            return (
              <div key={item.id} style={{ ...S.metricCard,
                borderLeft:`4px solid ${col}` }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:700, color:col,
                      padding:"2px 10px", borderRadius:20,
                      background:`${col}18`, border:`1px solid ${col}33` }}>
                      {TYPE_LABELS[item.type] || item.type}
                    </span>
                  </div>
                  <button onClick={() => deleteFeedback(item.id)}
                    style={{ background:"transparent", border:"none",
                      color:`${COLORS.warn}88`, cursor:"pointer", fontSize:16,
                      padding:"0 4px" }}>✕</button>
                </div>
                <div style={{ fontSize:14, color:COLORS.text, lineHeight:1.6,
                  marginBottom:10 }}>
                  {item.message}
                </div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:COLORS.muted }}>
                  <span>👤 @{item.username}</span>
                  <span>🕐 {new Date(item.created_at).toLocaleString("en-GB",
                    {day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── FeedbackButton ──
function FeedbackButton({ currentUser, notify, COLORS, FONTS, S }) {
  const [open, setOpen]       = useState(false);
  const [type, setType]       = useState("suggestion");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        user_id:   currentUser.id,
        username:  currentUser.username || currentUser.name,
        type,
        message:   message.trim(),
        created_at: new Date().toISOString(),
        read:      false,
      });
      setSent(true);
      setMessage("");
      setTimeout(() => { setSent(false); setOpen(false); }, 2000);
    } catch(e) { notify("Could not send feedback. Try again."); }
    setSending(false);
  };

  const TYPES = [
    { key:"suggestion", label:"💡 Suggestion" },
    { key:"feature",    label:"✨ Feature Request" },
    { key:"bug",        label:"🐛 Bug Report" },
  ];

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)}
        style={{ position:"fixed", bottom:"calc(72px + env(safe-area-inset-bottom, 0px) + 12px)", right:16, zIndex:999,
          width:44, height:44, borderRadius:"50%",
          background:`linear-gradient(135deg,${COLORS.accent2},${COLORS.accent})`,
          border:"none", boxShadow:`0 4px 16px ${COLORS.accent2}55`,
          cursor:"pointer", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:20,
          transition:"transform 0.2s",
          transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
        {open ? "✕" : "💬"}
      </button>

      {/* Popup */}
      {open && (
        <div style={{ position:"fixed", bottom:"calc(72px + env(safe-area-inset-bottom, 0px) + 64px)", right:16, zIndex:999,
          width:300, background:COLORS.card, borderRadius:16, padding:18,
          border:`1px solid ${COLORS.border}`,
          boxShadow:`0 8px 32px rgba(0,0,0,0.4)` }}>

          {sent ? (
            <div style={{ textAlign:"center", padding:"1rem" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🙏</div>
              <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700,
                color:COLORS.success }}>Thanks for your feedback!</div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700,
                marginBottom:12 }}>💬 Share Feedback</div>

              {/* Type selector */}
              <div style={{ display:"flex", gap:5, marginBottom:12, flexWrap:"wrap" }}>
                {TYPES.map(t => (
                  <button key={t.key} onClick={() => setType(t.key)}
                    style={{ padding:"4px 10px", borderRadius:20, fontSize:11,
                      cursor:"pointer", fontWeight:type===t.key?700:400,
                      border:`1px solid ${type===t.key?COLORS.accent:COLORS.border}`,
                      background:type===t.key?`${COLORS.accent}18`:"transparent",
                      color:type===t.key?COLORS.accent:COLORS.muted }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                rows={3}
                placeholder="Tell us what you think or what you'd like to see..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ width:"100%", background:COLORS.card2,
                  border:`1px solid ${COLORS.border}`, borderRadius:10,
                  padding:"9px 12px", color:COLORS.text, fontSize:13,
                  fontFamily:FONTS.body, resize:"none", outline:"none",
                  boxSizing:"border-box", marginBottom:10 }}
              />

              <button onClick={submit} disabled={!message.trim() || sending}
                style={{ ...S.btn, padding:"9px",
                  opacity:!message.trim()||sending ? 0.5 : 1 }}>
                {sending ? "Sending…" : "Send Feedback"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ── HealthReportPrint — full health report for print/PDF ─────────────────────

// ── App function below ──────────────────────────────────────────────────────

// ── Session helpers ────────────────────────────────────────────────────────────
const SESSION_KEY = "stayfit_session_v2";
function saveSession(user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ user, ts: Date.now() })); } catch(e) {}
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { user, ts } = JSON.parse(raw);
    if (Date.now() - ts > 30 * 24 * 60 * 60 * 1000) { localStorage.removeItem(SESSION_KEY); return null; }
    return user || null;
  } catch(e) { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
}


function CalorieBarChart({ data, targetCal, COLORS, FONTS }) {
  if (!data || data.length === 0) return null;
  const maxCal = Math.max(targetCal * 1.3, ...data.map(d => d.total));
  const W = 600, H = 180, padL = 44, padB = 28, padT = 10, padR = 10;
  const barW = Math.max(8, Math.min(36, (W - padL - padR) / data.length - 4));
  const toY = (cal) => padT + (H - padT - padB) * (1 - cal / maxCal);
  const targetY = toY(targetCal);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto" }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => {
        const y = toY(maxCal * f);
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={padL - 6} y={y + 4} textAnchor="end" fill="#8892aa" fontSize="9">{Math.round(maxCal * f)}</text>
          </g>
        );
      })}
      {/* Target line */}
      <line x1={padL} y1={targetY} x2={W - padR} y2={targetY} stroke={COLORS.success} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7"/>
      <text x={W - padR} y={targetY - 3} textAnchor="end" fill={COLORS.success} fontSize="9" fontWeight="700">TARGET {targetCal}</text>
      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + i * ((W - padL - padR) / data.length) + ((W - padL - padR) / data.length - barW) / 2;
        const barH = Math.max(2, (H - padT - padB) * (d.total / maxCal));
        const y = H - padB - barH;
        const over = d.total > targetCal;
        const pct = Math.round((d.total / targetCal) * 100);
        const col = over ? COLORS.warn : d.total >= targetCal * 0.85 ? COLORS.success : COLORS.accent;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="3"
              fill={col} opacity="0.85"/>
            <text x={x + barW/2} y={y - 3} textAnchor="middle" fill={col} fontSize="9" fontWeight="700">
              {d.total > 0 ? d.total : ""}
            </text>
            <text x={x + barW/2} y={H - padB + 10} textAnchor="middle" fill="#8892aa" fontSize="8">
              {d.label}
            </text>
            <text x={x + barW/2} y={H - padB + 19} textAnchor="middle" fill={col} fontSize="7" fontWeight="600">
              {d.total > 0 ? `${pct}%` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── FoodLog component ─────────────────────────────────────────────────────────
// ── MealFoodEntry — single inline food entry row per meal ─────────────────────
// ── Smart quantity units based on food type ──────────────────────────────────
function getFoodQuantityOptions(foodName) {
  const n = (foodName || "").toLowerCase();
  // Liquids first — word boundaries to avoid 'tea' in 'steamed', 'milk' in 'milkfish'
  if (/\bsoup\b|\bjuice\b|\bmilk\b|\bchai\b|\btea\b|\bcoffee\b|\bsmoothie\b|\bbuttermilk\b|\blassi\b|\bshake\b|\bdrink\b|\bbroth\b/.test(n))
    return { type:"ml", options:["100 ml","150 ml","200 ml","250 ml","300 ml","500 ml"], default:"200 ml" };
  // Eggs — must come before general items (catches: egg, eggs, boiled egg, fried egg, scrambled eggs)
  if (/egg/.test(n))
    return { type:"pcs", options:["1","2","3","4","5","6"], default:"2" };
  // Rice & grains by grams
  if (/rice|biryani|poha|upma|oatmeal|oats|porridge|daliya|dalia|khichdi|pasta|noodle|quinoa|cereal|muesli/.test(n))
    return { type:"gm", options:["50 gm","75 gm","100 gm","150 gm","200 gm","250 gm"], default:"100 gm" };
  // Breads & flatbreads by piece
  if (/roti|chapati|paratha|naan|bread|toast|puri|thepla|dosa|idli|uttapam|chilla|pancake|wrap|tortilla|bagel|crumpet/.test(n))
    return { type:"pcs", options:["1","2","3","4","5","6"], default:"2" };
  // Whole fruits by piece
  if (/apple|banana|orange|mango|pear|peach|plum|kiwi|guava|chikoo|pomegranate|lemon|amla|jamun/.test(n))
    return { type:"pcs", options:["1","2","3","4"], default:"1" };
  // Cut/small fruits by grams
  if (/grape|berr|cherry|cherri|watermelon|papaya|pineapple|melon|fig|date|apricot/.test(n))
    return { type:"gm", options:["50 gm","100 gm","150 gm","200 gm","300 gm"], default:"100 gm" };
  // Nuts & seeds by grams (small portions)
  if (/almond|walnut|cashew|peanut|pistachio|nut|seed|makhana|chana|rajma|legume/.test(n))
    return { type:"gm", options:["15 gm","20 gm","30 gm","50 gm","75 gm","100 gm"], default:"30 gm" };
  // Chicken / fish / meat
  if (/chicken|fish|meat|mutton|prawn|shrimp|salmon|tuna|lamb|beef|pork|turkey/.test(n))
    return { type:"gm", options:["50 gm","75 gm","100 gm","150 gm","200 gm","250 gm"], default:"100 gm" };
  // Vegetables / salads / curry / sabzi
  if (/salad|sabzi|vegetable|veg|paneer|tofu|sprout|bhaji|curry|stir.fry|potato|aloo|gobi|palak|broccoli|spinach/.test(n))
    return { type:"gm", options:["75 gm","100 gm","150 gm","200 gm","250 gm","300 gm"], default:"150 gm" };
  // Dal / lentils / beans
  if (/dal|dahl|lentil|bean|rajma|chole|sambar/.test(n))
    return { type:"gm", options:["75 gm","100 gm","150 gm","200 gm","250 gm"], default:"150 gm" };
  // Dairy
  if (/curd|yogurt|paneer|cottage|cheese|butter|ghee|cream/.test(n))
    return { type:"gm", options:["30 gm","50 gm","75 gm","100 gm","150 gm","200 gm"], default:"100 gm" };
  // Chocolate / sweets / dessert
  if (/chocolate|sweet|dessert|cake|cookie|biscuit|ladoo|halwa|mithai/.test(n))
    return { type:"gm", options:["15 gm","25 gm","30 gm","50 gm","75 gm","100 gm"], default:"30 gm" };
  // Default: size
  return { type:"size", options:["Small","Medium","Large","Extra Large"], default:"Medium" };
}

function calcCalForQty(qtyOption, qtyType, baseCal) {
  if (!baseCal) return 0;
  if (qtyType === "pcs") return Math.round(baseCal * (parseInt(qtyOption) || 1));
  if (qtyType === "ml")  return Math.round(baseCal * (parseInt(qtyOption) || 200) / 200);
  if (qtyType === "gm")  return Math.round(baseCal * (parseInt(qtyOption) || 100) / 100);
  const sizeMap = { Small:0.6, Medium:1.0, Large:1.5, "Extra Large":2.0 };
  return Math.round(baseCal * (sizeMap[qtyOption] || 1.0));
}

// ── MealFoodEntry ─────────────────────────────────────────────────────────────
// Layout order: [Time AM/PM] → [Search food] → [Qty pills] → [Calories] → [Add]
async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const json = await res.json();
    if (json.status !== 1) return null;
    const p = json.product;
    const name = p.product_name_en || p.product_name || "Unknown Product";
    const cal = Math.round((p.nutriments?.["energy-kcal_serving"] || p.nutriments?.["energy-kcal_100g"] || 0));
    return { name, cal };
  } catch { return null; }
}

function MealFoodEntry({ mealType, userId, loggedDate, onSaved, COLORS, FONTS, S }) {
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState("");
  const [showDrop, setShowDrop]   = useState(false);
  const [food, setFood]           = useState(null);
  const [qtyOption, setQtyOption] = useState("");
  const [cal, setCal]             = useState("");
  const [saving, setSaving]       = useState(false);
  const [scanning, setScanning]   = useState(false);
  const videoRef = useRef(null);

  // Time state — hour, minute, period (AM/PM)
  const nowH = new Date().getHours();
  const nowM = new Date().getMinutes();
  const [hour,   setHour]   = useState(nowH > 12 ? nowH - 12 : nowH === 0 ? 12 : nowH);
  const [minute, setMinute] = useState(Math.round(nowM / 5) * 5 % 60);
  const [period, setPeriod] = useState(nowH >= 12 ? "PM" : "AM");

  const allFoods = (() => {
    const cf = typeof COUNTRY_FOODS !== "undefined" ? COUNTRY_FOODS : {};
    const df = typeof DEFAULT_FOODS !== "undefined" ? DEFAULT_FOODS : {};
    const src = cf["India"] || df;
    return [...new Set([
      ...Object.values(src).flat(),
      ...(typeof FOOD_HEALTH_DB !== "undefined" ? Object.keys(FOOD_HEALTH_DB) : [])
    ])].sort();
  })();

  const filtered = search.trim().length >= 1
    ? allFoods.filter(f => f.toLowerCase().includes(search.toLowerCase())).slice(0, 15)
    : [];

  const qtyInfo = food ? getFoodQuantityOptions(food) : null;

  const pickFood = (name) => {
    setFood(name);
    setSearch(name);
    setShowDrop(false);
    const qi = getFoodQuantityOptions(name);
    setQtyOption(qi.default);
    const h = getFoodHealth(name);
    const c = calcCalForQty(qi.default, qi.type, h.cal);
    setCal(c ? String(c) : "");
  };

  const changeQty = (q) => {
    setQtyOption(q);
    if (food) {
      const qi = getFoodQuantityOptions(food);
      const h  = getFoodHealth(food);
      const c  = calcCalForQty(q, qi.type, h.cal);
      if (c) setCal(String(c));
    }
  };

  const save = async () => {
    if (!food || saving) return;
    setSaving(true);
    const h   = getFoodHealth(food);
    const h24 = period === "PM" ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const loggedAt = new Date(`${loggedDate}T${String(h24).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`).toISOString();
    const result = await sbAddFoodLog({
      user_id: userId, food_name: food, meal_type: mealType,
      quantity: qtyOption, calories: parseInt(cal) || 0,
      logged_date: loggedDate, health_status: h.status,
      health_score: h.score, logged_at: loggedAt,
    });
    if (result?.error) {
      setSaving(false);
      return;
    }
    onSaved(result.data);
    // Reset — keep time, clear food
    setFood(null); setSearch(""); setCal(""); setQtyOption(""); setOpen(false);
    setSaving(false);
  };

  const statusColor = (s) => s === "healthy" ? COLORS.success : s === "moderate" ? COLORS.accent3 : COLORS.warn;
  const h = food ? getFoodHealth(food) : null;

  // ── Closed state: just the + button ──
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 14px",
          borderRadius:9, border:`1.5px dashed ${COLORS.accent}55`,
          background:"transparent", cursor:"pointer", width:"100%",
          color:COLORS.accent, fontSize:13, fontWeight:600, marginTop:6 }}>
        <span style={{ width:22, height:22, borderRadius:"50%", background:`${COLORS.accent}22`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:17, lineHeight:1, flexShrink:0 }}>+</span>
        Add food item
      </button>
    );
  }

  // ── Open state ──
  return (
    <div style={{ background:`${COLORS.accent}08`, border:`1px solid ${COLORS.accent}40`,
      borderRadius:12, padding:"14px", marginTop:6 }}>

      {/* ── STEP 1: Time picker (AM/PM) ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, fontWeight:700, color:COLORS.muted, minWidth:36 }}>⏰ TIME</span>
        {/* Hour */}
        <select value={hour} onChange={e => setHour(+e.target.value)}
          style={{ ...S.select, width:58, padding:"7px 6px", fontSize:14, fontWeight:700, textAlign:"center" }}>
          {[12,1,2,3,4,5,6,7,8,9,10,11].map(h => (
            <option key={h} value={h}>{String(h).padStart(2,"0")}</option>
          ))}
        </select>
        <span style={{ fontSize:18, color:COLORS.muted, fontWeight:700 }}>:</span>
        {/* Minute */}
        <select value={minute} onChange={e => setMinute(+e.target.value)}
          style={{ ...S.select, width:58, padding:"7px 6px", fontSize:14, fontWeight:700, textAlign:"center" }}>
          {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
            <option key={m} value={m}>{String(m).padStart(2,"0")}</option>
          ))}
        </select>
        {/* AM / PM toggle */}
        <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:`1px solid ${COLORS.border}` }}>
          {["AM","PM"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding:"7px 14px", border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                background: period===p ? COLORS.accent : "transparent",
                color: period===p ? "#fff" : COLORS.muted }}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ marginLeft:"auto" }}>
          <button onClick={() => { setOpen(false); setFood(null); setSearch(""); setCal(""); }}
            style={{ background:"transparent", border:"none", color:COLORS.muted,
              cursor:"pointer", fontSize:20, padding:"2px 6px" }}>✕</button>
        </div>
      </div>

      {/* ── STEP 2: Search food ── */}
      <div style={{ marginBottom: food ? 12 : 0, position:"relative" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted }}>🔍 SEARCH FOOD</div>
          <button onClick={async () => {
            if (!("BarcodeDetector" in window)) {
              const code = prompt("Enter barcode number:");
              if (!code) return;
              const result = await lookupBarcode(code.trim());
              if (result) { setSearch(result.name); setFood(result.name); setCal(String(result.cal || "")); setQtyOption("1 serving"); }
              else alert("Product not found. Try entering the food name manually.");
              return;
            }
            setScanning(true);
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"environment" } });
              if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
              const detector = new window.BarcodeDetector({ formats:["ean_13","ean_8","upc_a","upc_e"] });
              let found = false;
              const scan = async () => {
                if (!videoRef.current || found) return;
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    found = true;
                    stream.getTracks().forEach(t => t.stop());
                    setScanning(false);
                    const result = await lookupBarcode(barcodes[0].rawValue);
                    if (result) { setSearch(result.name); setFood(result.name); setCal(String(result.cal || "")); setQtyOption("1 serving"); }
                    else alert("Product not found in database. Try entering the food name manually.");
                    return;
                  }
                } catch {}
                setTimeout(scan, 300);
              };
              scan();
            } catch (e) {
              setScanning(false);
              alert("Camera access denied. You can enter barcode manually.");
            }
          }} style={{ fontSize:11, color:COLORS.accent2, background:`${COLORS.accent2}15`, border:`1px solid ${COLORS.accent2}44`,
            borderRadius:6, padding:"4px 10px", cursor:"pointer", fontWeight:600 }}>
            📷 Scan Barcode
          </button>
        </div>
        {scanning && (
          <div style={{ position:"relative", marginBottom:8, borderRadius:10, overflow:"hidden", background:"#000" }}>
            <video ref={videoRef} style={{ width:"100%", maxHeight:160, objectFit:"cover", display:"block" }} playsInline muted />
            <div style={{ position:"absolute", top:8, right:8 }}>
              <button onClick={() => {
                if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop());
                setScanning(false);
              }} style={{ background:"rgba(0,0,0,0.7)", color:"#fff", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>✕ Cancel</button>
            </div>
            <div style={{ position:"absolute", bottom:8, left:0, right:0, textAlign:"center", color:"#fff", fontSize:12 }}>Point camera at barcode</div>
          </div>
        )}
        <input
          style={{ ...S.input, width:"100%", padding:"10px 14px", fontSize:14, boxSizing:"border-box" }}
          placeholder="Type food name (e.g. Dal, Apple, Rice, Chicken)..."
          value={search}
          autoComplete="off"
          onChange={e => {
            setSearch(e.target.value);
            setShowDrop(true);
            if (food && e.target.value !== food) { setFood(null); setCal(""); setQtyOption(""); }
          }}
          onFocus={() => { if (search.trim().length >= 1) setShowDrop(true); }}
          onBlur={() => setTimeout(() => setShowDrop(false), 250)}
        />

        {/* Dropdown — inline, not fixed, so it always appears */}
        {showDrop && filtered.length > 0 && (
          <div style={{
            position:"absolute", top:"100%", left:0, right:0, marginTop:3,
            background:"#0d1117",
            border:`2px solid ${COLORS.accent}77`,
            borderRadius:10,
            zIndex:9999,
            maxHeight:240,
            overflowY:"auto",
            boxShadow:"0 20px 60px rgba(0,0,0,0.9)",
          }}>
            {filtered.map((name, i) => {
              const fh = getFoodHealth(name);
              const qi = getFoodQuantityOptions(name);
              const fc = statusColor(fh.status);
              return (
                <div key={i}
                  onMouseDown={e => { e.preventDefault(); pickFood(name); }}
                  style={{
                    padding:"11px 14px", cursor:"pointer",
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    borderBottom: i < filtered.length-1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                    background: i%2===0 ? "#0d1117" : "#111827",
                  }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:"#f0f4ff" }}>{name}</div>
                    <div style={{ fontSize:11, color:"#8892aa", marginTop:1 }}>
                      {fh.cal ? `${fh.cal} kcal per ${qi.type==="pcs"?"piece":qi.type==="ml"?"200ml":"100g"}` : "Tap to select"}
                    </div>
                  </div>
                  <span style={{ fontSize:11, padding:"3px 9px", borderRadius:10, marginLeft:10,
                    background:`${fc}22`, color:fc, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>
                    {fh.status==="healthy"?"✅":fh.status==="moderate"?"⚡":"⚠️"} {fh.score}/10
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STEP 3: After food selected ── */}
      {food && h && (
        <div>
          {/* Health badge */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
            padding:"8px 12px", borderRadius:8, marginBottom:12,
            background:`${statusColor(h.status)}0e`, border:`1px solid ${statusColor(h.status)}33` }}>
            <span style={{ fontSize:13, fontWeight:700, color:COLORS.text }}>{food}</span>
            <span style={{ fontSize:10, padding:"2px 9px", borderRadius:10, fontWeight:700,
              background:`${statusColor(h.status)}25`, color:statusColor(h.status) }}>
              {h.status==="healthy"?"✅ Healthy":h.status==="moderate"?"⚡ Moderate":"⚠️ Unhealthy"}
            </span>
            {h.status !== "healthy" && h.suggestion && (
              <span style={{ fontSize:10, color:COLORS.success }}>💡 {h.suggestion.split("(")[0].trim()}</span>
            )}
          </div>

          {/* STEP 3a: Quantity */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted, marginBottom:7 }}>
              📏 QUANTITY
              <span style={{ fontWeight:400, marginLeft:6 }}>
                ({qtyInfo?.type === "pcs" ? "pieces" : qtyInfo?.type === "ml" ? "millilitres" : qtyInfo?.type === "gm" ? "grams" : "portion size"})
              </span>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {qtyInfo && qtyInfo.options.map(opt => (
                <button key={opt} onClick={() => changeQty(opt)}
                  style={{ padding:"7px 13px", borderRadius:8, fontSize:13, cursor:"pointer",
                    fontWeight: qtyOption===opt ? 700 : 400, whiteSpace:"nowrap",
                    border:`1.5px solid ${qtyOption===opt ? COLORS.accent : COLORS.border}`,
                    background: qtyOption===opt ? `${COLORS.accent}22` : "transparent",
                    color: qtyOption===opt ? COLORS.accent : COLORS.muted,
                    transition:"all 0.12s" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 3b: Calories + Add button */}
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted }}>🔥 CALORIES</div>
            <div style={{ display:"flex", alignItems:"center", gap:6,
              background:"rgba(255,255,255,0.06)", borderRadius:9,
              padding:"6px 14px", border:`1.5px solid ${COLORS.accent}44` }}>
              <input type="number" min="0" max="9999"
                style={{ width:72, background:"transparent", border:"none", outline:"none",
                  fontSize:18, fontWeight:700, color:COLORS.accent, textAlign:"center" }}
                placeholder="0"
                value={cal}
                onChange={e => setCal(e.target.value)} />
              <span style={{ fontSize:12, color:COLORS.muted, fontWeight:600 }}>kcal</span>
            </div>
            {cal && <span style={{ fontSize:11, color:COLORS.muted }}>auto-calculated · edit if needed</span>}
            <button onClick={save} disabled={!food || !cal || saving}
              style={{ marginLeft:"auto", padding:"9px 28px", borderRadius:9, border:"none",
                background: (food && cal && !saving)
                  ? `linear-gradient(135deg,${COLORS.accent},${COLORS.accent2})`
                  : "rgba(255,255,255,0.1)",
                color: (food && cal && !saving) ? "#fff" : COLORS.muted,
                fontSize:14, fontWeight:700, cursor: (food && cal && !saving) ? "pointer" : "not-allowed",
                transition:"all 0.15s", flexShrink:0 }}>
              {saving ? "Saving…" : "✓ Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WaterLog — water intake logger ───────────────────────────────────────────

function HealthDrinksSoupsTab({ type, COLORS, FONTS, S }) {
  const items = type === "drinks" ? HEALTH_DRINKS : HEALTHY_SOUPS;
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");

  const categories = type === "drinks"
    ? ["all","Morning Detox","Morning","Evening","Post-Workout","Before Meals","Anytime","Cooling","Breakfast"]
    : ["all","Easy","Very Easy"];

  const filtered = filter === "all" ? items :
    type === "drinks" ? items.filter(i => i.category === filter) :
    items.filter(i => i.difficulty === filter);

  return (
    <div>
      <div style={{ fontFamily:FONTS.head, fontSize:18, fontWeight:700, marginBottom:4 }}>
        {type === "drinks" ? "🥤 Healthy Drinks" : "🍲 Healthy Soups"}
      </div>
      <div style={{ fontSize:13, color:COLORS.muted, marginBottom:14 }}>
        {type === "drinks"
          ? "Easy-to-make health drinks with proven benefits"
          : "Nutritious soups you can make at home in under 1 hour"}
      </div>

      {/* Filter pills */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            style={{ padding:"5px 14px", borderRadius:20, fontSize:12, cursor:"pointer", whiteSpace:"nowrap",
              fontWeight:filter===cat?700:400,
              border:`1px solid ${filter===cat?COLORS.accent:COLORS.border}`,
              background:filter===cat?`${COLORS.accent}20`:"transparent",
              color:filter===cat?COLORS.accent:COLORS.muted }}>
            {cat === "all" ? `All (${items.length})` : cat}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map((item, i) => (
          <div key={i} style={{ ...S.metricCard, overflow:"hidden" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
              onClick={() => setExpanded(expanded===i?null:i)}>
              <div style={{ fontSize:28, flexShrink:0 }}>{item.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, color:COLORS.text }}>{item.name}</div>
                <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>{item.benefits.slice(0,60)}...</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:COLORS.accent }}>{item.calories} kcal</div>
                <div style={{ fontSize:10, color:COLORS.muted }}>{item.time}</div>
              </div>
              <span style={{ fontSize:16, color:COLORS.muted, transition:"transform 0.2s",
                transform:expanded===i?"rotate(180deg)":"rotate(0deg)" }}>▾</span>
            </div>

            {expanded === i && (
              <div style={{ borderTop:`1px solid ${COLORS.border}`, marginTop:10, paddingTop:10 }}>
                <div style={{ fontSize:12, color:COLORS.muted, marginBottom:8, lineHeight:1.6 }}>
                  <b style={{ color:COLORS.success }}>✨ Benefits:</b> {item.benefits}
                </div>
                <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:8, padding:"12px 14px",
                  border:`1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:COLORS.accent, marginBottom:6 }}>📝 Recipe</div>
                  <div style={{ fontSize:13, color:COLORS.text, lineHeight:1.7 }}>{item.recipe}</div>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:`${COLORS.accent3}18`, color:COLORS.accent3 }}>⏱ {item.time}</span>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:`${COLORS.accent}18`, color:COLORS.accent }}>🔥 {item.calories} kcal</span>
                  {item.category && <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:`${COLORS.accent2}18`, color:COLORS.accent2 }}>📌 {item.category}</span>}
                  {item.difficulty && <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:`${COLORS.success}18`, color:COLORS.success }}>✅ {item.difficulty}</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
// ── FoodScoreRow — individual row in food score table (needs own state for expand) ──

// ── FoodScoreTab — full food score analysis tab ───────────────────────────────

// ── TodayTimeline — checkable daily activity list ─────────────────────────────

// ── WaterTracker — interactive glass check-off tracker ───────────────────────

// ── ActivityTimer — fullscreen workout activity timer with calorie tracking ────
const ACTIVITIES = [
  { id:"walking",   label:"🚶 Walking",          calPerMin:5  },
  { id:"strength",  label:"💪 Strength Training", calPerMin:8  },
  { id:"cardio",    label:"🏃 Cardio / HIIT",     calPerMin:12 },
  { id:"yoga",      label:"🧘 Yoga",              calPerMin:4  },
  { id:"swimming",  label:"🏊 Swimming",          calPerMin:10 },
  { id:"running",   label:"🏃‍♂️ Running",          calPerMin:11 },
  { id:"cycling",   label:"🚴 Cycling",           calPerMin:9  },
];


function RestTimer({ S, COLORS, FONTS, userId, onCalorieSaved }) {
  const [timerSecs, setTimerSecs]       = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedRest, setSelectedRest] = useState(60);
  const [justFinished, setJustFinished] = useState(false);
  const [fullscreen, setFullscreen]     = useState(false);
  const [activity, setActivity]         = useState(null);
  const [showActivities, setShowActivities] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerSecs <= 0) { setTimerRunning(false); setJustFinished(true); return; }
    setJustFinished(false);
    const id = setTimeout(() => setTimerSecs(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timerRunning, timerSecs]);

  const startTimer = (secs) => {
    setTimerSecs(secs); setTimerRunning(true);
    setSelectedRest(secs); setJustFinished(false); setSaved(false);
  };
  const stopTimer = () => { setTimerRunning(false); setJustFinished(true); };
  const resetTimer = () => { setTimerRunning(false); setTimerSecs(0); setJustFinished(false); setSaved(false); };

  const elapsedSecs = selectedRest - timerSecs;
  const elapsedMins = elapsedSecs / 60;
  const calBurned = activity ? Math.round(ACTIVITIES.find(a => a.id === activity)?.calPerMin * elapsedMins) : 0;
  const mins = Math.floor(timerSecs / 60);
  const secs = timerSecs % 60;

  const saveBurn = async () => {
    if (!activity || calBurned <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "calorie_burns"), {
        user_id: userId,
        activity, calories: calBurned,
        duration_mins: Math.round(elapsedMins),
        logged_date: new Date().toISOString().split("T")[0],
        logged_at: new Date().toISOString(),
      });
      setSaved(true);
      if (onCalorieSaved) onCalorieSaved();
    } catch(e) {}
    setSaving(false);
  };

  const timerColor = timerSecs <= 10 && timerRunning ? COLORS.warn : COLORS.accent;

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <div style={{ position:"fixed", inset:0, background:"#070d1a", zIndex:9999,
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
        {/* Activity picker */}
        {!activity ? (
          <div style={{ textAlign:"center", maxWidth:500, width:"100%" }}>
            <div style={{ fontFamily:FONTS.head, fontSize:24, fontWeight:700, marginBottom:8, color:COLORS.text }}>
              What are you doing? 💪
            </div>
            <div style={{ fontSize:14, color:COLORS.muted, marginBottom:24 }}>Select activity to track calories burned</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
              {ACTIVITIES.map(a => (
                <button key={a.id} onClick={() => setActivity(a.id)}
                  style={{ padding:"16px", borderRadius:14, border:`2px solid ${COLORS.border}`,
                    background:COLORS.card2, color:COLORS.text, fontSize:15, fontWeight:600,
                    cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}>
                  {a.label}
                  <div style={{ fontSize:11, color:COLORS.muted, marginTop:4 }}>~{a.calPerMin} cal/min</div>
                </button>
              ))}
            </div>
            <button onClick={() => setFullscreen(false)} style={{ ...S.btnSm, padding:"10px 24px" }}>
              ← Back
            </button>
          </div>
        ) : (
          <div style={{ textAlign:"center", maxWidth:400, width:"100%" }}>
            {/* Activity name */}
            <div style={{ fontSize:16, color:COLORS.muted, marginBottom:8 }}>
              {ACTIVITIES.find(a => a.id === activity)?.label}
            </div>
            {/* Big timer */}
            <div style={{ fontFamily:FONTS.head, fontSize:96, fontWeight:800, color:timerColor,
              lineHeight:1, marginBottom:16, letterSpacing:"-2px" }}>
              {mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : `${secs}s`}
            </div>
            {/* Calories burned */}
            <div style={{ fontSize:20, color:COLORS.accent3, fontWeight:700, marginBottom:24 }}>
              🔥 {calBurned} kcal burned
            </div>
            {/* Preset buttons */}
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:16, flexWrap:"wrap" }}>
              {[30,60,90,120,300,600].map(s => (
                <button key={s} onClick={() => startTimer(s)}
                  style={{ padding:"10px 16px", borderRadius:10,
                    border:`2px solid ${selectedRest===s&&timerRunning?COLORS.accent:COLORS.border}`,
                    background:selectedRest===s&&timerRunning?`${COLORS.accent}22`:"transparent",
                    color:selectedRest===s&&timerRunning?COLORS.accent:COLORS.muted,
                    fontSize:14, fontWeight:600, cursor:"pointer" }}>
                  {s >= 60 ? `${s/60}m` : `${s}s`}
                </button>
              ))}
            </div>
            {/* Controls */}
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:20 }}>
              {!timerRunning ? (
                <button onClick={() => timerSecs > 0 ? setTimerRunning(true) : startTimer(selectedRest)}
                  style={{ padding:"14px 32px", borderRadius:12, border:"none",
                    background:`linear-gradient(135deg,${COLORS.accent},${COLORS.accent2})`,
                    color:"#07121f", fontSize:16, fontWeight:700, cursor:"pointer" }}>
                  ▶ Start
                </button>
              ) : (
                <button onClick={stopTimer}
                  style={{ padding:"14px 32px", borderRadius:12, border:"none",
                    background:COLORS.warn, color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer" }}>
                  ⏹ Stop
                </button>
              )}
              <button onClick={resetTimer}
                style={{ padding:"14px 24px", borderRadius:12,
                  border:`1px solid ${COLORS.border}`, background:"transparent",
                  color:COLORS.muted, fontSize:16, cursor:"pointer" }}>
                ↺ Reset
              </button>
            </div>
            {/* Save calorie burn */}
            {justFinished && calBurned > 0 && !saved && (
              <div style={{ ...S.metricCard, marginBottom:16, background:`${COLORS.success}0d`, border:`1px solid ${COLORS.success}33` }}>
                <div style={{ fontWeight:700, color:COLORS.success, marginBottom:8 }}>
                  ✅ Workout complete! Save {calBurned} kcal burned?
                </div>
                <button onClick={saveBurn} disabled={saving}
                  style={{ ...S.btn, padding:"10px 24px", opacity:saving?0.6:1 }}>
                  {saving ? "Saving..." : "💾 Save to Calorie Burn Log"}
                </button>
              </div>
            )}
            {saved && (
              <div style={{ color:COLORS.success, fontWeight:700, fontSize:14 }}>
                ✅ {calBurned} kcal saved to your log!
              </div>
            )}
            {/* Change activity / close */}
            <div style={{ display:"flex", gap:10, justifyContent:"center", marginTop:16 }}>
              <button onClick={() => setActivity(null)} style={{ ...S.btnSm, fontSize:13 }}>Change Activity</button>
              <button onClick={() => setFullscreen(false)} style={{ ...S.btnSm, fontSize:13 }}>← Close Fullscreen</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact mode (in workout tab)
  return (
    <div style={{ ...S.metricCard, marginBottom:"1rem",
      background:timerRunning?`${COLORS.accent}12`:COLORS.card2,
      border:`1px solid ${timerRunning?COLORS.accent+"44":COLORS.border}`, transition:"all 0.3s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700, marginBottom:4 }}>⏱️ Activity Timer</div>
          <div style={{ fontSize:11, color:COLORS.muted }}>
            {activity ? ACTIVITIES.find(a=>a.id===activity)?.label : "Tap to select activity & start"}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          {[30,60,90,120].map(s => (
            <button key={s} onClick={() => startTimer(s)}
              style={{ padding:"6px 12px", borderRadius:8,
                border:`1px solid ${selectedRest===s&&timerRunning?COLORS.accent:COLORS.border}`,
                background:selectedRest===s&&timerRunning?`${COLORS.accent}22`:COLORS.bg,
                color:selectedRest===s&&timerRunning?COLORS.accent:COLORS.muted,
                fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {s}s
            </button>
          ))}
          {timerRunning
            ? <button onClick={stopTimer} style={{ padding:"6px 12px", borderRadius:8, border:"none", background:COLORS.warn, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>⏹ Stop</button>
            : <button onClick={resetTimer} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${COLORS.warn}44`, background:"transparent", color:COLORS.warn, fontSize:12, cursor:"pointer" }}>Reset</button>
          }
          <button onClick={() => { setFullscreen(true); if (!activity) {} }}
            style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${COLORS.accent2}44`,
              background:`${COLORS.accent2}11`, color:COLORS.accent2, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            ⛶ Fullscreen
          </button>
        </div>
        {(timerRunning || timerSecs > 0) && (
          <div style={{ fontSize:32, fontWeight:700, fontFamily:FONTS.head, color:timerColor, minWidth:80, textAlign:"center" }}>
            {mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : `${secs}s`}
          </div>
        )}
      </div>
      {justFinished && <div style={{ fontSize:12, color:COLORS.success, fontWeight:600, marginTop:6 }}>✅ Done! Open fullscreen to save calories.</div>}
    </div>
  );
}

// ── AdminUserList — admin user search/filter list ─────────────────────────────


// ── Calorie Bar Chart ─────────────────────────────────────────────────────────

// ── FoodLog component ─────────────────────────────────────────────────────────
// ── MealFoodEntry — single inline food entry row per meal ─────────────────────
// ── Smart quantity units based on food type ──────────────────────────────────


// ── MealFoodEntry ─────────────────────────────────────────────────────────────
// Layout order: [Time AM/PM] → [Search food] → [Qty pills] → [Calories] → [Add]

// ── RecipeBuilder ─────────────────────────────────────────────────────────────
function RecipeBuilder({ onPickRecipe, COLORS, FONTS, S }) {
  const STORAGE_KEY = "sf_recipes_v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
  const [recipes, setRecipes] = useState(load);
  const [creating, setCreating] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [ingredients, setIngredients] = useState([{ food:"", cal:0 }]);
  const [open, setOpen] = useState(false);

  const save = (updated) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); setRecipes(updated); };

  const addRecipe = () => {
    if (!recipeName.trim() || !ingredients.some(i=>i.food.trim())) return;
    const totalCal = ingredients.reduce((s,i)=>s+(parseInt(i.cal)||0), 0);
    const r = { id: Date.now(), name: recipeName.trim(), ingredients, totalCal };
    save([...recipes, r]);
    setRecipeName(""); setIngredients([{ food:"", cal:0 }]); setCreating(false);
  };

  const deleteRecipe = (id) => save(recipes.filter(r => r.id !== id));

  return (
    <div style={{ ...S.metricCard, marginBottom:10, border:`1px solid ${COLORS.purple}33` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }} onClick={() => setOpen(o=>!o)}>
        <div style={{ fontFamily:FONTS.head, fontSize:13, fontWeight:700, color:COLORS.purple }}>📖 My Recipes {recipes.length > 0 && `(${recipes.length})`}</div>
        <span style={{ fontSize:16, color:COLORS.muted, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
      </div>
      {open && (
        <div style={{ marginTop:12 }}>
          {recipes.map(r => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${COLORS.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:COLORS.text }}>{r.name}</div>
                <div style={{ fontSize:11, color:COLORS.muted }}>{r.ingredients.map(i=>i.food).filter(Boolean).join(", ")} · {r.totalCal} kcal</div>
              </div>
              <button onClick={() => onPickRecipe && onPickRecipe(r)}
                style={{ ...S.btnSm, background:`${COLORS.accent}20`, border:`1px solid ${COLORS.accent}44`, color:COLORS.accent, borderRadius:6, padding:"5px 12px", fontSize:11 }}>
                + Log
              </button>
              <button onClick={() => deleteRecipe(r.id)}
                style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:16, cursor:"pointer", padding:"0 4px" }}>✕</button>
            </div>
          ))}
          {!creating ? (
            <button onClick={() => setCreating(true)}
              style={{ ...S.btnSm, marginTop:10, background:`${COLORS.purple}18`, border:`1px solid ${COLORS.purple}44`, color:COLORS.purple, borderRadius:8, padding:"7px 14px", width:"100%", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              + Create New Recipe
            </button>
          ) : (
            <div style={{ marginTop:12 }}>
              <input value={recipeName} onChange={e=>setRecipeName(e.target.value)}
                placeholder="Recipe name (e.g. Dal Rice Bowl)"
                style={{ ...S.input, marginBottom:8, fontSize:13 }} />
              {ingredients.map((ing, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                  <input value={ing.food} onChange={e=>setIngredients(prev=>prev.map((x,j)=>j===i?{...x,food:e.target.value}:x))}
                    placeholder="Food item" style={{ ...S.input, flex:2, fontSize:12 }} />
                  <input type="number" value={ing.cal} onChange={e=>setIngredients(prev=>prev.map((x,j)=>j===i?{...x,cal:e.target.value}:x))}
                    placeholder="kcal" style={{ ...S.input, width:70, fontSize:12 }} />
                  {ingredients.length > 1 && (
                    <button onClick={()=>setIngredients(prev=>prev.filter((_,j)=>j!==i))}
                      style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:18, cursor:"pointer" }}>✕</button>
                  )}
                </div>
              ))}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={()=>setIngredients(p=>[...p,{food:"",cal:0}])}
                  style={{ ...S.btnSm, background:`${COLORS.card2}`, border:`1px solid ${COLORS.border}`, color:COLORS.muted, borderRadius:6, fontSize:11, padding:"5px 10px", cursor:"pointer" }}>
                  + Ingredient
                </button>
                <button onClick={addRecipe}
                  style={{ ...S.btnSm, flex:1, background:`linear-gradient(135deg,${COLORS.purple},${COLORS.accent2})`, color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer", padding:"5px 10px" }}>
                  Save Recipe
                </button>
                <button onClick={()=>setCreating(false)}
                  style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:12, cursor:"pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── WaterLog — water intake logger ───────────────────────────────────────────
function WaterLog({ userId, loggedDate, foodLogs, onLogsChange, targetWater, COLORS, FONTS, S }) {
  // Form state — same pattern as MealFoodEntry
  const [open, setOpen]         = useState(false);
  const [selectedMl, setSelectedMl] = useState(250);
  const [customMl, setCustomMl] = useState("");
  const [saving, setSaving]     = useState(false);

  // Time state
  const nowH = new Date().getHours();
  const nowM = new Date().getMinutes();
  const [hour,   setHour]   = useState(nowH > 12 ? nowH - 12 : nowH === 0 ? 12 : nowH);
  const [minute, setMinute] = useState(Math.round(nowM / 5) * 5 % 60);
  const [period, setPeriod] = useState(nowH >= 12 ? "PM" : "AM");

  const WATER_OPTIONS = [100, 150, 200, 250, 300, 500, 750, 1000];

  // Total water logged today
  const waterEntries = (foodLogs||[]).filter(l => l.logged_date === loggedDate && l.meal_type === "Water");
  const todayWater   = waterEntries.reduce((s, l) => s + (l.calories||0), 0);
  const targetMl     = Math.round((targetWater||2.5) * 1000);
  const pct          = Math.min(100, Math.round(todayWater / targetMl * 100));
  const barColor     = pct >= 100 ? COLORS.success : pct >= 60 ? COLORS.accent2 : COLORS.accent;
  const glasses      = Math.round(todayWater / 250);

  const finalMl = customMl ? parseInt(customMl) : selectedMl;

  const save = async () => {
    if (!finalMl || finalMl <= 0 || saving) return;
    setSaving(true);
    const h24 = period === "PM" ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const loggedAt = new Date(`${loggedDate}T${String(h24).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`).toISOString();
    const result = await sbAddFoodLog({
      user_id: userId,
      food_name: `Water (${finalMl} ml)`,
      meal_type: "Water",
      quantity: `${finalMl} ml`,
      calories: finalMl,
      logged_date: loggedDate,
      health_status: "healthy",
      health_score: 10,
      logged_at: loggedAt,
    });
    onLogsChange(result?.data);
    // Reset
    setCustomMl("");
    setSelectedMl(250);
    setOpen(false);
    setSaving(false);
  };

  const deleteWater = async (id) => { await sbDeleteFoodLog(id); onLogsChange(); };

  return (
    <div style={{ background:COLORS.card2, borderRadius:12,
      border:`1px solid ${open ? COLORS.accent2 + "55" : COLORS.border}`,
      marginBottom:10, overflow:"visible", transition:"border-color 0.2s" }}>

      {/* ── Header — always visible ── */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", cursor:"pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ width:40, height:40, borderRadius:10, background:`${COLORS.accent2}20`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
          💧
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, color:COLORS.text }}>Water Intake</div>
          <div style={{ fontSize:12, color:COLORS.muted }}>
            {todayWater > 0
              ? `${todayWater} ml logged · ${targetMl - todayWater > 0 ? `${targetMl - todayWater} ml remaining` : "Goal reached! 🎉"}`
              : `Target: ${targetMl} ml (${targetWater}L)`}
          </div>
        </div>
        <div style={{ fontFamily:FONTS.head, fontSize:18, fontWeight:700, color:barColor, minWidth:60, textAlign:"right" }}>
          {pct}%
        </div>
        <span style={{ fontSize:18, color:COLORS.muted, transition:"transform 0.2s",
          display:"inline-block", transform:open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </div>

      {/* Progress bar */}
      <div style={{ height:5, background:"rgba(255,255,255,0.07)", margin:"0 16px 0" }}>
        <div style={{ height:"100%", width:`${pct}%`,
          background:`linear-gradient(90deg,${COLORS.accent2},${COLORS.accent})`,
          transition:"width 0.4s" }}/>
      </div>

      {/* ── Expanded content ── */}
      {open && (
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"14px 16px" }}>

          {/* Entry form: Time → Quantity → Add */}
          <div style={{ background:`${COLORS.accent2}08`, border:`1px solid ${COLORS.accent2}33`,
            borderRadius:12, padding:"14px", marginBottom:12 }}>

            {/* STEP 1: Time */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700, color:COLORS.muted, minWidth:36 }}>⏰ TIME</span>
              <select value={hour} onChange={e => setHour(+e.target.value)}
                style={{ ...S.select, width:58, padding:"7px 6px", fontSize:14, fontWeight:700, textAlign:"center" }}>
                {[12,1,2,3,4,5,6,7,8,9,10,11].map(h => (
                  <option key={h} value={h}>{String(h).padStart(2,"0")}</option>
                ))}
              </select>
              <span style={{ fontSize:18, color:COLORS.muted, fontWeight:700 }}>:</span>
              <select value={minute} onChange={e => setMinute(+e.target.value)}
                style={{ ...S.select, width:58, padding:"7px 6px", fontSize:14, fontWeight:700, textAlign:"center" }}>
                {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2,"0")}</option>
                ))}
              </select>
              <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:`1px solid ${COLORS.border}` }}>
                {["AM","PM"].map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    style={{ padding:"7px 14px", border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                      background: period===p ? COLORS.accent2 : "transparent",
                      color: period===p ? "#fff" : COLORS.muted }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 2: Quantity */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted, marginBottom:7 }}>💧 QUANTITY (ml)</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {WATER_OPTIONS.map(ml => (
                  <button key={ml}
                    onClick={() => { setSelectedMl(ml); setCustomMl(""); }}
                    style={{ padding:"7px 12px", borderRadius:8, fontSize:13, cursor:"pointer",
                      fontWeight: (selectedMl === ml && !customMl) ? 700 : 400,
                      border:`1.5px solid ${selectedMl === ml && !customMl ? COLORS.accent2 : COLORS.border}`,
                      background: selectedMl === ml && !customMl ? `${COLORS.accent2}22` : "transparent",
                      color: selectedMl === ml && !customMl ? COLORS.accent2 : COLORS.muted,
                      transition:"all 0.12s" }}>
                    {ml >= 1000 ? `${ml/1000}L` : `${ml} ml`}
                  </button>
                ))}
                {/* Custom input */}
                <div style={{ display:"flex", alignItems:"center", gap:4,
                  background:"rgba(255,255,255,0.05)", borderRadius:8,
                  padding:"4px 10px", border:`1.5px solid ${customMl ? COLORS.accent2 : COLORS.border}` }}>
                  <input type="number" min="1" max="5000"
                    placeholder="Custom"
                    value={customMl}
                    onChange={e => { setCustomMl(e.target.value); setSelectedMl(0); }}
                    style={{ width:64, background:"transparent", border:"none", outline:"none",
                      fontSize:13, fontWeight:600, color:COLORS.accent2, textAlign:"center" }} />
                  <span style={{ fontSize:11, color:COLORS.muted }}>ml</span>
                </div>
              </div>
            </div>

            {/* STEP 3: Add button */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
              <div style={{ fontSize:13, color:COLORS.muted }}>
                {finalMl > 0 && (
                  <span>Adding <b style={{ color:COLORS.accent2 }}>{finalMl} ml</b>
                    {" "}≈ {(finalMl/250).toFixed(1)} glass{finalMl/250 !== 1 ? "es" : ""}
                  </span>
                )}
              </div>
              <button onClick={save} disabled={!finalMl || finalMl <= 0 || saving}
                style={{ padding:"9px 28px", borderRadius:9, border:"none",
                  background: finalMl > 0 && !saving
                    ? `linear-gradient(135deg,${COLORS.accent2},${COLORS.accent})`
                    : "rgba(255,255,255,0.1)",
                  color: finalMl > 0 && !saving ? "#fff" : COLORS.muted,
                  fontSize:14, fontWeight:700,
                  cursor: finalMl > 0 && !saving ? "pointer" : "not-allowed",
                  opacity: finalMl > 0 && !saving ? 1 : 0.5 }}>
                {saving ? "Saving…" : "✓ Add"}
              </button>
            </div>
          </div>

          {/* Water log history for today */}
          {waterEntries.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ fontSize:11, fontWeight:700, color:COLORS.muted, marginBottom:4 }}>TODAY'S LOG</div>
              {waterEntries.sort((a,b) => new Date(a.logged_at)-new Date(b.logged_at)).map((e, i) => {
                const timeStr = e.logged_at
                  ? new Date(e.logged_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})
                  : "";
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8,
                    padding:"7px 10px", background:"rgba(255,255,255,0.03)",
                    borderRadius:8, borderLeft:`3px solid ${COLORS.accent2}` }}>
                    {timeStr && <span style={{ fontSize:11, color:COLORS.muted, minWidth:52 }}>{timeStr}</span>}
                    <span style={{ fontSize:14, flex:1 }}>💧</span>
                    <span style={{ fontSize:13, fontWeight:600, color:COLORS.accent2 }}>{e.calories} ml</span>
                    <button onClick={() => deleteWater(e.id)}
                      style={{ background:"transparent", border:"none",
                        color:`${COLORS.warn}77`, cursor:"pointer", fontSize:14, padding:"2px 6px" }}>✕</button>
                  </div>
                );
              })}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 10px",
                background:`${barColor}0d`, borderRadius:8, marginTop:4 }}>
                <span style={{ fontSize:12, color:COLORS.muted }}>Total today</span>
                <span style={{ fontSize:13, fontWeight:700, color:barColor }}>{todayWater} ml / {targetMl} ml</span>
              </div>
            </div>
          )}

          {pct >= 100 && (
            <div style={{ marginTop:10, fontSize:13, color:COLORS.success, fontWeight:700, textAlign:"center" }}>
              🎉 Daily water goal achieved!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── FoodLog — main food logging screen ────────────────────────────────────────

// ── MealSection — expandable meal card with food entries + add button ─────────
function MealSection({ meal, entries, mealTotal, userId, loggedDate, onLogsChange, deleteEntry, statusColor, COLORS, FONTS, S }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // { id, food_name, quantity, calories }
  const [editSaving, setEditSaving] = useState(false);
  const prevEntryCount = useRef(entries.length);
  useEffect(() => {
    if (entries.length > prevEntryCount.current) setOpen(true);
    prevEntryCount.current = entries.length;
  }, [entries.length]);

  return (
    <div style={{ background:COLORS.card2, borderRadius:12, overflow:"visible",
      border:`1px solid ${open?meal.color+"55":COLORS.border}`, transition:"border-color 0.2s", position:"relative" }}>

      {/* Meal header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
          cursor:"pointer", userSelect:"none", borderRadius:12 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:`${meal.color}20`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
          {meal.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, color:COLORS.text }}>{meal.label}</div>
          <div style={{ fontSize:12, color:COLORS.muted }}>
            {entries.length > 0
              ? `${entries.length} item${entries.length>1?"s":""} · ${mealTotal} kcal`
              : "Tap to log"}
          </div>
        </div>
        {mealTotal > 0 && (
          <div style={{ fontWeight:700, fontSize:16, color:meal.color }}>{mealTotal} kcal</div>
        )}
        <span style={{ fontSize:18, color:COLORS.muted, transition:"transform 0.2s",
          display:"inline-block", transform:open?"rotate(180deg)":"rotate(0deg)" }}>▾</span>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{ borderTop:`1px solid ${COLORS.border}`, padding:"12px 16px",
          borderRadius:"0 0 12px 12px", overflow:"visible" }}>
          {editing && (
            <div style={{ ...S.metricCard, marginBottom:10, border:`1px solid ${meal.color}55`, background:`${meal.color}10` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontFamily:FONTS.head, fontSize:13, fontWeight:800, color:meal.color }}>✏️ Edit food</div>
                <button onClick={() => { if (!editSaving) setEditing(null); }}
                  style={{ background:"transparent", border:"none", color:COLORS.muted, cursor:"pointer", fontSize:18 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 120px", gap:10, marginBottom:10 }}>
                <div>
                  <div style={{ ...S.label }}>Food</div>
                  <input style={S.input} value={editing.food_name || ""} onChange={e => setEditing(p => ({ ...p, food_name: e.target.value }))} />
                </div>
                <div>
                  <div style={{ ...S.label }}>Calories</div>
                  <input style={S.input} type="number" value={editing.calories ?? ""} onChange={e => setEditing(p => ({ ...p, calories: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ ...S.label }}>Quantity</div>
                <input style={S.input} value={editing.quantity || ""} onChange={e => setEditing(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={() => setEditing(null)} disabled={editSaving}
                  style={{ ...S.btnSm, opacity:editSaving?0.6:1, cursor:editSaving?"not-allowed":"pointer" }}>Cancel</button>
                <button
                  onClick={async () => {
                    if (!editing?.id) return;
                    setEditSaving(true);
                    const err = await sbUpdateFoodLog(editing.id, {
                      food_name: (editing.food_name || "").trim(),
                      quantity: (editing.quantity || "").trim(),
                      calories: parseInt(editing.calories) || 0,
                    });
                    setEditSaving(false);
                    if (err) return;
                    setEditing(null);
                    onLogsChange && onLogsChange();
                  }}
                  disabled={editSaving || !(editing.food_name || "").trim()}
                  style={{ ...S.btnSm, background:`linear-gradient(135deg,${meal.color},${COLORS.accent2})`, border:"none", color:"#07121f",
                    opacity:editSaving?0.6:1, cursor:editSaving?"not-allowed":"pointer", fontWeight:800 }}
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
          {entries.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:8 }}>
              {entries.map((entry, i) => {
                const col = statusColor(entry.health_status);
                const timeStr = entry.logged_at
                  ? new Date(entry.logged_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true})
                  : "";
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
                    background:"rgba(255,255,255,0.03)", borderRadius:8, borderLeft:`3px solid ${col}` }}>
                    {timeStr && <span style={{ fontSize:10, color:COLORS.muted, minWidth:48 }}>{timeStr}</span>}
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>{entry.food_name}</span>
                      <span style={{ marginLeft:6, fontSize:10, padding:"1px 6px", borderRadius:6,
                        background:`${col}18`, color:col, fontWeight:700 }}>
                        {entry.health_status==="healthy"?"✅":entry.health_status==="moderate"?"⚡":"⚠️"}
                      </span>
                    </div>
                    <span style={{ fontSize:11, color:COLORS.muted, background:"rgba(255,255,255,0.06)",
                      borderRadius:4, padding:"2px 8px", whiteSpace:"nowrap" }}>
                      {entry.quantity}
                    </span>
                    <span style={{ fontSize:14, fontWeight:700, color:meal.color, minWidth:60, textAlign:"right" }}>
                      {entry.calories||"—"} kcal
                    </span>
                    <button
                      onClick={() => setEditing({ id: entry.id, food_name: entry.food_name || "", quantity: entry.quantity || "", calories: entry.calories ?? 0 })}
                      style={{ background:"transparent", border:"none", color:`${COLORS.accent2}aa`,
                        cursor:"pointer", fontSize:15, padding:"2px 6px", flexShrink:0 }}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button onClick={() => deleteEntry(entry.id)}
                      style={{ background:"transparent", border:"none", color:`${COLORS.warn}77`,
                        cursor:"pointer", fontSize:15, padding:"2px 6px", flexShrink:0 }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}
          <RecipeBuilder COLORS={COLORS} FONTS={FONTS} S={S} onPickRecipe={async (recipe) => {
            await sbAddFoodLog({
              user_id: userId, food_name: recipe.name, meal_type: meal.id,
              quantity: "1 serving", calories: recipe.totalCal,
              logged_date: loggedDate, health_status: "moderate", health_score: 6,
              logged_at: new Date().toISOString(),
            });
            onLogsChange && onLogsChange();
          }} />
          <MealFoodEntry mealType={meal.id} userId={userId} loggedDate={loggedDate}
            onSaved={onLogsChange} COLORS={COLORS} FONTS={FONTS} S={S} />
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// COMPETITION / CHALLENGE SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

// Supabase helpers for competitions
async function sbGetCompetitions() {
  try {
    const snap = await getDocs(collection(db, "competitions"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  } catch(e) { return []; }
}
async function sbCreateCompetition(comp) {
  try {
    const ref = await addDoc(collection(db, "competitions"), comp);
    return { data: { id: ref.id, ...comp }, error: null };
  } catch(e) { return { data: null, error: e }; }
}
async function sbUpdateCompetition(id, updates) {
  try {
    await updateDoc(doc(db, "competitions", String(id)), updates);
    return null;
  } catch(e) { return e; }
}
async function sbGetCompetitionMembers(compId) {
  try {
    const snap = await getDocs(collection(db, "competition_members"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(m => m.competition_id === compId);
  } catch(e) { return []; }
}
async function sbInviteToCompetition(compId, userId, startWeight) {
  try {
    await addDoc(collection(db, "competition_members"), {
      competition_id: compId, user_id: userId,
      start_weight: startWeight, status: "invited",
      invited_at: new Date().toISOString(),
    });
    return null;
  } catch(e) { return e; }
}
async function sbJoinCompetition(compId, userId, startWeight) {
  try {
    const snap = await getDocs(collection(db, "competition_members"));
    const member = snap.docs.find(d => d.data().competition_id === compId && d.data().user_id === userId);
    if (member) {
      await updateDoc(doc(db, "competition_members", member.id), {
        status: "active", start_weight: startWeight, joined_at: new Date().toISOString()
      });
    }
    return null;
  } catch(e) { return e; }
}
async function sbUpdateCompWeight(compId, userId, currentWeight) {
  try {
    const snap = await getDocs(collection(db, "competition_members"));
    const member = snap.docs.find(d => d.data().competition_id === compId && d.data().user_id === userId);
    if (member) await updateDoc(doc(db, "competition_members", member.id), { current_weight: currentWeight });
    return null;
  } catch(e) { return e; }
}


// ── AdminPanel — wrapper with Users / Challenges section tabs ─────────────────
// ── AdminCompetitions — create & manage challenges ────────────────────────────

// ── UserCompetitions — user-side competition view & leaderboard ───────────────







// ── StepCounter — device pedometer / motion sensor step detection ─────────────
// ── CorrelationGraphs — sleep vs weight, exercise vs weight ──────────────────
function CorrelationGraphs({ userLogs, sleepLogs, calorieBurns, foodLogs, COLORS, FONTS, S }) {
  const [activeGraph, setActiveGraph] = useState("sleep-weight");

  // Build sleep vs weight data (match dates)
  const sleepWeightData = sleepLogs.slice(0,30).map(sl => {
    const nextDay = new Date(sl.date); nextDay.setDate(nextDay.getDate()+1);
    const nextDayStr = nextDay.toISOString().split("T")[0];
    const weightLog = userLogs.find(l => l.logged_at?.startsWith(nextDayStr) || l.date === nextDayStr);
    return weightLog ? { sleep: sl.hours, weight: weightLog.weight, date: sl.date } : null;
  }).filter(Boolean);

  // Build calories burned vs weight change
  const burnWeightData = calorieBurns.slice(0,30).map(b => {
    const nextDay = new Date(b.logged_date); nextDay.setDate(nextDay.getDate()+1);
    const nextDayStr = nextDay.toISOString().split("T")[0];
    const weightLog = userLogs.find(l => l.logged_at?.startsWith(nextDayStr));
    return weightLog ? { burned: b.calories, weight: weightLog.weight, date: b.logged_date } : null;
  }).filter(Boolean);

  // Build food calories vs weight
  const foodByDate = {};
  foodLogs.forEach(f => {
    if (f.meal_type==="Water") return;
    if (!foodByDate[f.logged_date]) foodByDate[f.logged_date] = 0;
    foodByDate[f.logged_date] += f.calories||0;
  });

  const renderScatter = (data, xKey, yKey, xLabel, yLabel, color) => {
    if (data.length < 3) return (
      <div style={{ textAlign:"center", padding:"2rem", color:COLORS.muted, fontSize:13 }}>
        <div style={{ fontSize:24, marginBottom:8 }}>📊</div>
        Need at least 3 data points. Keep logging {xLabel.toLowerCase()} and weight!
      </div>
    );

    const xs = data.map(d=>d[xKey]), ys = data.map(d=>d[yKey]);
    const minX=Math.min(...xs), maxX=Math.max(...xs), rangeX=maxX-minX||1;
    const minY=Math.min(...ys), maxY=Math.max(...ys), rangeY=maxY-minY||1;
    const W=280, H=140, pad=20;

    const pts = data.map(d => ({
      cx: pad + ((d[xKey]-minX)/rangeX) * (W-pad*2),
      cy: H-pad - ((d[yKey]-minY)/rangeY) * (H-pad*2),
      ...d
    }));

    // Simple linear regression
    const n=pts.length, sumX=xs.reduce((a,b)=>a+b,0), sumY=ys.reduce((a,b)=>a+b,0);
    const sumXY=data.reduce((a,d)=>a+d[xKey]*d[yKey],0), sumX2=xs.reduce((a,b)=>a+b*b,0);
    const slope=(n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
    const intercept=(sumY-slope*sumX)/n;
    const x1=minX, y1=slope*x1+intercept;
    const x2=maxX, y2=slope*x2+intercept;
    const line1cx=pad+0*(W-pad*2), line1cy=H-pad-((y1-minY)/rangeY)*(H-pad*2);
    const line2cx=pad+1*(W-pad*2), line2cy=H-pad-((y2-minY)/rangeY)*(H-pad*2);

    const correlation = slope > 0 ? "positive" : slope < 0 ? "negative" : "neutral";
    const corrMsg = xKey==="sleep"
      ? (slope<0 ? "💤 More sleep → lower weight (good!)" : "Sleep pattern needs improvement")
      : (slope<0 ? "🔥 More exercise → lower weight (great!)" : "Keep exercising consistently");

    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:"auto" }}>
          {/* Grid lines */}
          {[0.25,0.5,0.75].map(t => (
            <line key={t} x1={pad} y1={H-pad-(t*(H-pad*2))} x2={W-pad} y2={H-pad-(t*(H-pad*2))}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          {/* Trend line */}
          <line x1={line1cx} y1={Math.max(pad,Math.min(H-pad,line1cy))}
                x2={line2cx} y2={Math.max(pad,Math.min(H-pad,line2cy))}
                stroke={color} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
          {/* Data points */}
          {pts.map((p,i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r="4" fill={color} opacity="0.8" />
          ))}
          {/* Axis labels */}
          <text x={W/2} y={H-2} textAnchor="middle" fill="#8892aa" fontSize="8">{xLabel}</text>
          <text x={8} y={H/2} textAnchor="middle" fill="#8892aa" fontSize="8"
            transform={`rotate(-90,8,${H/2})`}>{yLabel}</text>
        </svg>
        <div style={{ fontSize:12, color, fontWeight:600, textAlign:"center", marginTop:4 }}>{corrMsg}</div>
      </div>
    );
  };

  return (
    <div style={{ ...S.metricCard, marginBottom:14 }}>
      <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700, marginBottom:4 }}>📊 Correlation Graphs</div>
      <div style={{ fontSize:12, color:COLORS.muted, marginBottom:12 }}>See how your habits affect your weight</div>

      <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto", scrollbarWidth:"none" }}>
        {[
          { key:"sleep-weight", label:"😴 Sleep vs Weight" },
          { key:"burn-weight",  label:"🔥 Exercise vs Weight" },
        ].map(({key,label}) => (
          <button key={key} onClick={() => setActiveGraph(key)}
            style={{ ...S.pill(activeGraph===key), whiteSpace:"nowrap", flexShrink:0, fontSize:12 }}>
            {label}
          </button>
        ))}
      </div>

      {activeGraph === "sleep-weight" && renderScatter(sleepWeightData, "sleep", "weight", "Hours Sleep", "Weight (kg)", COLORS.accent2)}
      {activeGraph === "burn-weight"  && renderScatter(burnWeightData,  "burned","weight", "Calories Burned", "Weight (kg)", COLORS.accent3)}
    </div>
  );
}
// ── AchievementBadges — unlock badges for health milestones ──────────────────
const ALL_BADGES = [
  { id:"first_log",     icon:"🌱", name:"First Step",        desc:"Logged your first weight entry",         condition: (logs,food,sleep,burns) => logs.length >= 1 },
  { id:"week_streak",   icon:"🔥", name:"7-Day Streak",      desc:"Logged weight 7 days in a row",          condition: (logs) => {
    if (logs.length < 7) return false;
    const sorted = [...logs].sort((a,b)=>new Date(b.logged_at)-new Date(a.logged_at));
    let streak = 1;
    for (let i=1; i<sorted.length; i++) {
      const diff = (new Date(sorted[i-1].logged_at) - new Date(sorted[i].logged_at)) / 86400000;
      if (diff <= 1.5) streak++; else break;
    }
    return streak >= 7;
  }},
  { id:"lose_1kg",      icon:"⚖️",  name:"1kg Down",         desc:"Lost your first kilogram",               condition: (logs) => logs.length>=2 && (logs[logs.length-1].weight - logs[0].weight) >= 1 },
  { id:"lose_5kg",      icon:"🎯", name:"5kg Legend",         desc:"Lost 5 kilograms — incredible!",         condition: (logs) => logs.length>=2 && (logs[logs.length-1].weight - logs[0].weight) >= 5 },
  { id:"lose_10kg",     icon:"🏆", name:"10kg Champion",      desc:"Lost 10 kilograms — you're a warrior!",  condition: (logs) => logs.length>=2 && (logs[logs.length-1].weight - logs[0].weight) >= 10 },
  { id:"food_logger",   icon:"🍱", name:"Food Logger",        desc:"Logged 50+ food entries",                condition: (logs,food) => food.length >= 50 },
  { id:"sleep_tracker", icon:"😴", name:"Sleep Champion",     desc:"Logged sleep for 7 days",                condition: (logs,food,sleep) => sleep.length >= 7 },
  { id:"burn_1000",     icon:"🔥", name:"Calorie Torcher",    desc:"Burned 1000+ calories through exercise", condition: (logs,food,sleep,burns) => burns.reduce((s,b)=>s+b.calories,0) >= 1000 },
  { id:"burn_5000",     icon:"💪", name:"Fitness Beast",      desc:"Burned 5000+ calories through exercise", condition: (logs,food,sleep,burns) => burns.reduce((s,b)=>s+b.calories,0) >= 5000 },
  { id:"water_master",  icon:"💧", name:"Hydration Master",   desc:"Logged water for 14 days",               condition: (logs,food) => food.filter(f=>f.meal_type==="Water").length >= 14 },
  { id:"30_logs",       icon:"📅", name:"Consistent Logger",  desc:"Logged weight 30+ times",                condition: (logs) => logs.length >= 30 },
  { id:"early_bird",    icon:"🌅", name:"Early Bird",         desc:"Logged 5 morning meals",                 condition: (logs,food) => food.filter(f=>f.meal_type==="Breakfast").length >= 5 },
];

// ── AIHealthInsights — personalized AI-driven health analysis ─────────────────
// ── BloodPressureSugarLog — health vitals tracker ─────────────────────────────
// ── SleepTracker component ────────────────────────────────────────────────────
// ── CalorieBurnTab — log and view activity calorie burns ─────────────────────


// ── FoodLog — main food logging screen ────────────────────────────────────────

// ── MealSection — expandable meal card with food entries + add button ─────────
function WeeklyScheduleExpand({ workout, S, COLORS, FONTS }) {
  const [expandedDay, setExpandedDay] = useState(null);
  return (
    <div style={{ ...S.metricCard, marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontFamily: FONTS.head, fontSize: 15, fontWeight: 700 }}>Weekly Schedule</div>
        <div style={{ fontSize: 11, color: COLORS.muted, background: `${COLORS.accent}15`, padding: "2px 10px", borderRadius: 20 }}>tap a workout day to see exercises ▾</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(workout.weeklyPlan || []).map(({ day, isWorkout, split, muscles, exercises }) => {
          const isOpen = expandedDay === day;
          return (
            <div key={day}>
              {/* Row header */}
              <div
                onClick={() => isWorkout && setExpandedDay(isOpen ? null : day)}
                style={{
                  display: "flex", gap: 12, alignItems: "center",
                  background: isOpen ? `${COLORS.accent}18` : isWorkout ? `${COLORS.accent}0a` : COLORS.bg,
                  borderRadius: isOpen ? "10px 10px 0 0" : 10,
                  padding: "10px 14px",
                  border: `1px solid ${isOpen ? COLORS.accent + "55" : isWorkout ? COLORS.accent + "28" : COLORS.border}`,
                  cursor: isWorkout ? "pointer" : "default",
                  userSelect: "none",
                }}>
                <div style={{ minWidth: 90, fontSize: 13, fontWeight: 700, color: isWorkout ? COLORS.accent : COLORS.muted }}>{day}</div>
                <div style={{ fontSize: 16, flexShrink: 0 }}>{isWorkout ? "💪" : "😴"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isWorkout ? COLORS.text : COLORS.muted }}>{isWorkout ? split : "Rest Day"}</div>
                  {muscles && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>🎯 {muscles}</div>}
                </div>
                {isWorkout && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: COLORS.muted }}>{(exercises || []).length} ex</span>
                    <span style={{ fontSize: 16, color: COLORS.accent, transition: "transform .2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                  </div>
                )}
              </div>
              {/* Exercises dropdown */}
              {isOpen && (
                <div style={{
                  background: `${COLORS.accent}07`,
                  border: `1px solid ${COLORS.accent}44`,
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  padding: "10px 14px",
                  display: "flex", flexDirection: "column", gap: 5,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, marginBottom: 4, borderBottom: `1px solid ${COLORS.accent}20` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent }}>{day} — {split}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{workout.duration} min · {workout.intensity}</div>
                  </div>
                  {(exercises || []).map((ex, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: COLORS.card, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${COLORS.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ fontSize: 13, color: COLORS.text }}>{ex}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ── AchievementBadges — unlock badges for health milestones ──────────────────




// ══════════════════════════════════════════════════════════════════════════════
// COMPETITION / CHALLENGE SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

// Supabase helpers for competitions


// ── AdminPanel — wrapper with Users / Challenges section tabs ─────────────────

function AdminUserDataView({ userId, collection: col, COLORS, FONTS, S, render, renderFn }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId || !col) return;
    setLoading(true);
    getDocs(query(collection(db, col), where("user_id","==",userId))).then(snap => {
      setData(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    }).catch(()=>{ setLoading(false); });
  }, [userId, col]);
  if (loading) return <div style={{ textAlign:"center", padding:"2rem", color:COLORS.muted, fontSize:13 }}>Loading...</div>;
  const fn = renderFn || render;
  return fn ? fn(data) : null;
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  // STAYFIT v3.1 - Fixed FoodScore, Grocery, SW cache
  if (typeof window !== "undefined") window._stayfitVersion = "3.1";
  // Unregister stale service workers
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
  const [allUsers, setAllUsers] = useState([]);
  const [userLogs, setUserLogs] = useState([]);
  const [foodLogs, setFoodLogs] = useState([]);
  const [allFoodLogs, setAllFoodLogs] = useState([]); // admin: all users' food logs
  const [competitions, setCompetitions] = useState([]); // shared competitions state
  const [calorieBurns, setCalorieBurns] = useState([]); // activity calorie burns
  const [sleepLogs, setSleepLogs] = useState([]); // sleep tracking
  const [screen, setScreen] = useState("loading");
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboard, setOnboard] = useState({});
  const [authForm, setAuthForm] = useState({ username: "", password: "", name: "", mode: "login", country: "", state: "" });
  const [authErr, setAuthErr] = useState("");
  const [dashTab, setDashTab] = useState("today");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [logForm, setLogForm] = useState({ weight: "", note: "" });
  const [selectedFoods, setSelectedFoods] = useState({ Breakfast: [], Lunch: [], "Evening Snack": [], Dinner: [], Munching: [], Fruits: [] });
  const [activeMealTab, setActiveMealTab] = useState("Breakfast");
  const [scheduleSlots, setScheduleSlots] = useState([
    { time: "06:00", label: "Wake Up", duration: 10 }, { time: "09:00", label: "Office", duration: 480 },
    { time: "13:00", label: "Lunch Break", duration: 60 }, { time: "18:30", label: "Gym", duration: 60 },
    { time: "23:00", label: "Sleep", duration: 480 },
  ]);
  const [newSlot, setNewSlot] = useState({ time: "", label: "", duration: 30 });
  const [notification, setNotification] = useState("");
  const [themeMode, setThemeMode] = useState(() => loadStoredTheme());
  const [systemThemeTick, setSystemThemeTick] = useState(0);
  const [showTranslate, setShowTranslate] = useState(false);

  useEffect(() => {
    saveTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemThemeTick(t => t + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeMode]);

  const isDark = resolveIsDark(themeMode);
  void systemThemeTick;
  const C = getThemeColors(isDark);
  const S = buildStyles(C, isDark);

  useEffect(() => {
    applyCssVars(C, isDark);
  }, [themeMode, systemThemeTick, isDark]);

  // Check for existing session on load + seed admin on first run
  useEffect(() => {
    // Auto-create admin user in Firebase if not exists
    (async () => {
      try {
        const existing = await sbGetUser("admin");
        if (!existing) {
          await sbCreateUser({
            id: "admin-001",
            username: "admin",
            password_hash: "admin123",
            role: "admin",
            name: "Admin",
            active: true,
            approved: true,
            created_at: new Date().toISOString(),
          });
          console.log("✅ Admin user created in Firebase");
        }
      } catch(e) { console.log("Admin seed:", e.message); }
    })();

    const u = loadSession();
    if (u) {
      setCurrentUser(u);
      if (u.profile?.likedFoods) setSelectedFoods(u.profile.likedFoods);
      if (u.profile?.schedule) setScheduleSlots(u.profile.schedule);
      // onSnapshot listeners will load data automatically
      setScreen(u.role === "admin" ? "admin" : "dashboard");
    } else {
      setScreen("login");
    }
  }, []);

  useEffect(() => {
    if (currentUser?.profile?.likedFoods) setSelectedFoods(currentUser.profile.likedFoods);
    if (currentUser?.profile?.schedule) setScheduleSlots(currentUser.profile.schedule);
  }, [currentUser?.id]);

  // ── Real-time listener for admin users list ────────────────────────────────
  useEffect(() => {
    if (screen !== "admin") return;
    // Subscribe to live updates on the users collection
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.created_at||0) - new Date(a.created_at||0));
      setAllUsers(users);
    }, (err) => {
      console.error("Users listener error:", err);
      loadAllUsers();
    });
    // Also poll every 20s as fallback (handles Firestore quota limits)
    const poll = setInterval(() => loadAllUsers(), 20000);
    return () => { unsub(); clearInterval(poll); };
  }, [screen]);

  async function loadLogs(userId) {
    const logs = await sbGetLogs(userId);
    setUserLogs(logs.map(l => ({ date: l.logged_at?.split("T")[0], weight: l.weight, note: l.note, ts: new Date(l.logged_at).getTime() })));
  }
  async function loadFoodLogs(userId) {
    const uid = normalizeUserId(userId);
    const logs = await sbGetFoodLogs(uid);
    setFoodLogs(logs);
  }
  function mergeFoodLogEntry(entry) {
    if (!entry?.id) return;
    setFoodLogs(prev => {
      if (prev.some(l => l.id === entry.id)) return prev;
      return [...prev, entry].sort((a, b) => new Date(b.logged_at || b.logged_date) - new Date(a.logged_at || a.logged_date));
    });
  }
  async function loadCalorieBurns(userId) {
    try {
      const uid = normalizeUserId(userId);
      const snap = await getDocs(query(collection(db, "calorie_burns"), where("user_id", "==", uid)));
      const burns = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.logged_date) - new Date(a.logged_date));
      setCalorieBurns(burns);
    } catch(e) { setCalorieBurns([]); }
  }
  async function loadSleepLogs(userId) {
    try {
      const uid = normalizeUserId(userId);
      const snap = await getDocs(query(collection(db, "sleep_logs"), where("user_id", "==", uid)));
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setSleepLogs(logs);
    } catch(e) { setSleepLogs([]); }
  }

  // Fetch latest profile_data from Supabase and update currentUser state.
  // Called when user opens Meal Plan tab so admin-generated plans show immediately.
  async function fetchLatestProfile(userId) {
    try {
      const snap = await getDoc(doc(db, "users", String(userId)));
      if (snap.exists() && snap.data().profile_data) {
        const latestProfile = snap.data().profile_data;
        setCurrentUser(prev => {
          const updated = { ...prev, profile: latestProfile };
          saveSession(updated);
          return updated;
        });
      }
    } catch (e) {
      // silently fail — stale data is fine as fallback
    }
  }

  async function loadAllUsers() {
    const users = await sbGetAllUsers();
    setAllUsers(users);
    // Also load all food logs for admin view
    try {
      const allFoodSnap = await getDocs(collection(db, "food_logs"));
      const allFoodData = allFoodSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => new Date(b.logged_date) - new Date(a.logged_date));
      setAllFoodLogs(allFoodData);
    } catch(e) {}
  }

  // ── Real-time listeners for current user ────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = String(currentUser.id);

    // 1. Own profile (meal plan, approval status, etc.)
    const unsubProfile = onSnapshot(doc(db, "users", uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.profile_data) {
        setCurrentUser(prev => {
          const updated = { ...prev, profile: data.profile_data };
          saveSession(updated);
          return updated;
        });
      }
    }, () => {});

    // 2. Weight logs
    const unsubLogs = onSnapshot(
      query(collection(db, "weight_logs"), where("user_id", "==", uid), orderBy("logged_at", "asc")),
      (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .map(l => ({ date: l.logged_at?.split("T")[0], weight: l.weight, note: l.note, ts: new Date(l.logged_at).getTime() }));
        setUserLogs(logs);
      }, () => {});

    // 3. Food logs
    const unsubFood = onSnapshot(
      query(collection(db, "food_logs"), where("user_id", "==", uid)),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.logged_at || b.logged_date) - new Date(a.logged_at || a.logged_date));
        setFoodLogs(docs);
      }, (err) => {
        loadFoodLogs(uid);
      });

    // 4. Calorie burns
    const unsubBurns = onSnapshot(
      query(collection(db, "calorie_burns"), where("user_id", "==", uid), orderBy("logged_date", "desc")),
      (snap) => {
        setCalorieBurns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, () => {});

    // 5. Sleep logs
    const unsubSleep = onSnapshot(
      query(collection(db, "sleep_logs"), where("user_id", "==", uid), orderBy("date", "desc")),
      (snap) => {
        setSleepLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, () => {});

    // Cleanup all listeners on unmount or user change
    return () => {
      unsubProfile();
      unsubLogs();
      unsubFood();
      unsubBurns();
      unsubSleep();
    };
  }, [currentUser?.id]);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); };

  const latestLog = userLogs.length > 0 ? userLogs[userLogs.length - 1] : null;
  const firstLog = userLogs.length > 0 ? userLogs[0] : null;
  const currentProfile = currentUser ? {
    weight: latestLog ? latestLog.weight : (currentUser.profile?.weight || 70),
    height: currentUser.profile?.height || 170, age: currentUser.profile?.age || 30, gender: currentUser.profile?.gender || "Male",
  } : null;
  const metrics = currentProfile ? computeAllMetrics(currentProfile) : null;
  const firstMetrics = firstLog && currentUser ? computeAllMetrics({ ...currentProfile, weight: firstLog.weight }) : null;

  async function getDeviceInfo() {
    const ua = navigator.userAgent;
    const device = /mobile/i.test(ua) ? "Mobile" : /tablet/i.test(ua) ? "Tablet" : "Desktop";
    const browser = /chrome/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : /firefox/i.test(ua) ? "Firefox" : /edge/i.test(ua) ? "Edge" : "Unknown";
    const os = /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "Mac" : /android/i.test(ua) ? "Android" : /iphone|ipad/i.test(ua) ? "iOS" : "Unknown";
    let location = { city: "Unknown", country: "Unknown", ip: "Unknown" };
    try {
      const r = await fetch("https://ipapi.co/json/");
      const d = await r.json();
      location = { city: d.city, country: d.country_name, ip: d.ip, region: d.region };
    } catch(e) {}
    return { device, browser, os, ...location, lastSeen: new Date().toISOString(), userAgent: ua };
  }

  async function login() {
    setAuthErr("Signing in...");
    try {
      // Admin check — first ensure admin exists, then verify password from Firebase
      if (authForm.username === "admin") {
        // Ensure admin exists in Firebase with default password
        try {
          const adminSnap = await getDoc(doc(db, "users", "admin-001"));
          if (!adminSnap.exists()) {
            await setDoc(doc(db, "users", "admin-001"), {
              username: "admin", password_hash: "admin123", role: "admin",
              name: "Admin", active: true, approved: true,
              created_at: new Date().toISOString(),
            });
          }
          // Get current admin password from Firebase
          const adminData = adminSnap.exists() ? adminSnap.data() : { password_hash: "admin123" };
          if (authForm.password !== adminData.password_hash) {
            setAuthErr("Invalid username or password");
            return;
          }
        } catch(e) {
          // Fallback to default if Firebase fails
          if (authForm.password !== "admin123") { setAuthErr("Invalid username or password"); return; }
        }
        const adminUser = {
          id: "admin-001", username: "admin", password_hash: authForm.password,
          role: "admin", name: "Admin", active: true, approved: true,
        };
        setCurrentUser(adminUser);
        saveSession(adminUser);
        setAuthErr("");
        setScreen("admin");
        return;
      }
      // Regular users — look up in Firebase
      let u = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        u = await sbGetUser(authForm.username);
        if (u) break;
        await new Promise(r => setTimeout(r, 500));
      }
      setAuthErr("");
      if (!u || u.password_hash !== authForm.password) return setAuthErr("Invalid username or password");
      if (u.approved === false) return setAuthErr("Your account is pending admin approval. Please wait.");
      if (!u.active) return setAuthErr("Account disabled. Contact admin.");
      const deviceInfo = await getDeviceInfo();
      try { await sbUpdateUser(u.id, { device_info: deviceInfo }); } catch(e) {}
      const user = { ...u, profile: u.profile_data, device_info: deviceInfo };
      setCurrentUser(user);
      saveSession(user);
      await loadLogs(u.id);
      loadFoodLogs(u.id);
      if (u.role === "admin") { setScreen("admin"); }
      else if (!u.profile_data) { setOnboardStep(0); setOnboard({}); setScreen("onboard"); }
      else setScreen("dashboard");
    } catch(e) {
      setAuthErr("Login error: " + e.message);
    }
  }

  async function signup() {
    if (!authForm.username || !authForm.password || !authForm.name) return setAuthErr("All fields required");
    if (!authForm.country || !authForm.state) return setAuthErr("Please select your country and state");
    const existing = await sbGetUser(authForm.username?.toLowerCase().trim());
    if (existing) return setAuthErr("Username already taken");
    const { data: nu, error } = await sbCreateUser({
      username: authForm.username?.toLowerCase().trim(), password_hash: authForm.password,
      name: authForm.name, role: "user", active: false, approved: false,
      country: authForm.country, state: authForm.state,
    });
    if (error) return setAuthErr("Could not create account. Try again.");
    const deviceInfo = await getDeviceInfo();
    await sbUpdateUser(nu.id, { device_info: deviceInfo });
    const user = { ...nu, profile: null, device_info: deviceInfo };
    setCurrentUser(user);
    saveSession(user);
    // Create approval request in DB
    try {
      await addDoc(collection(db, "approval_requests"), {
        user_id: nu.id, username: nu.username, name: nu.name,
        country: nu.country, state: nu.state,
        created_at: new Date().toISOString()
      });
    } catch(e) {}
    setScreen("pending"); notify("Account created! Waiting for admin approval.");
  }

  async function saveProfile() {
    const profile = { ...onboard, schedule: scheduleSlots, likedFoods: selectedFoods, country: currentUser.country };
    const error = await sbUpdateUser(currentUser.id, { profile_data: profile });
    if (error) return notify("Could not save profile. Try again.");
    const updated = { ...currentUser, profile };
    setCurrentUser(updated);
    saveSession(updated);
    if (parseFloat(onboard.weight)) {
      await sbAddLog({ user_id: currentUser.id, weight: parseFloat(onboard.weight), note: "Initial log", logged_at: new Date().toISOString() });
      await loadLogs(currentUser.id);
    }
    setScreen("dashboard"); notify("Profile saved! Your personalized plan is ready.");
  }

  async function logWeight() {
    if (!logForm.weight) return;
    const error = await sbAddLog({ user_id: currentUser.id, weight: parseFloat(logForm.weight), note: logForm.note, logged_at: new Date().toISOString() });
    if (error) return notify("Could not log weight. Try again.");
    await loadLogs(currentUser.id);
    setLogForm({ weight: "", note: "" });
    // Streak milestone celebrations
    const newStreak = calcStreak([...userLogs, { date: new Date().toISOString().split("T")[0] }]);
    if (newStreak === 365) notify("🏆 LEGENDARY! 365-day streak — one full year of logging!");
    else if (newStreak === 100) notify("💎 100-day streak! You're unstoppable!");
    else if (newStreak === 30) notify("🔥 30-day streak! One month strong!");
    else if (newStreak === 7) notify("⭐ 7-day streak! One week in a row!");
    else notify("Weight logged successfully!");
  }

  async function savePreferences(updatedProfile) {
    const error = await sbUpdateUser(currentUser.id, { profile_data: updatedProfile });
    if (error) return notify("Could not save. Try again.");
    const updated = { ...currentUser, profile: updatedProfile };
    setCurrentUser(updated);
    saveSession(updated);
    notify("Preferences saved!");
  }

  async function deleteUser(id) {
    const wlSnap = await getDocs(collection(db, "weight_logs"));
    for (const d of wlSnap.docs) { if (d.data().user_id === id) await deleteDoc(doc(db, "weight_logs", d.id)); }
    await deleteDoc(doc(db, "users", String(id)));
    await loadAllUsers(); notify("User permanently deleted.");
  }
  async function enableUser(id) {
    await sbUpdateUser(id, { active: true });
    await loadAllUsers(); notify("User enabled.");
  }
  async function approveUser(id) {
    await sbUpdateUser(id, { active: true, approved: true });
    await loadAllUsers(); notify("User approved! They can now log in.");
  }
  async function rejectUser(id) {
    await sbUpdateUser(id, { active: false, approved: false });
    await loadAllUsers(); notify("User rejected.");
  }
  async function changeUserPassword(id, newPass) {
    if (!newPass || newPass.length < 4) return notify("Password must be at least 4 characters");
    await sbUpdateUser(id, { password_hash: newPass });
    await loadAllUsers(); notify("Password updated successfully!");
  }

  function addSlot() {
    if (!newSlot.time || !newSlot.label) return;
    setScheduleSlots(p => [...p, newSlot].sort((a, b) => a.time.localeCompare(b.time)));
    setNewSlot({ time: "", label: "" });
  }
  function removeSlot(i) { setScheduleSlots(p => p.filter((_, idx) => idx !== i)); }
  function logout() {
    clearSession();
    setCurrentUser(null); setUserLogs([]);
    setScreen("login");
    setAuthForm({ username: "", password: "", name: "", mode: "login", country: "", state: "" });
  }
  function getSteps() {
    const hasConditions = onboard.conditions && onboard.conditions.length > 0;
    return [
      { title: "What's your #1 goal?", key: "goal", type: "choice", options: GOALS },
      { title: "Basic details", type: "form-basic" },
      { title: "Medical conditions", key: "conditions", type: "medical" },
      ...(hasConditions ? [{ title: "Your medications", key: "medications", type: "text-list" }] : []),
      { title: "Foods you enjoy", type: "food-picker" },
      { title: "Your daily schedule", type: "schedule" },
      { title: "Fitness profile", type: "fitness" },
    ];
  }
  // ── LOGIN ──
  if (screen === "pending") return (
    <div style={{ ...S.app, alignItems: "center", justifyContent: "center", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(99,130,191,0.25); border-radius: 2px; }
          input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }
          select option { background: #0e1628; color: #eef2ff; }
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
          .fade-in { animation: fadeIn 0.35s ease forwards; }
        `}</style>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "2.5rem", maxWidth: 400, width: "100%", margin: "1rem", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontFamily: FONTS.head, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Awaiting Approval</div>
        <div style={{ color: COLORS.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          Your account has been created successfully!<br />
          The admin will review and approve your account shortly.<br />
          You will be able to log in once approved.
        </div>
        <div style={{ background: `${COLORS.accent}11`, border: `1px solid ${COLORS.accent}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: COLORS.accent }}>👤 <b>{currentUser?.name}</b> — {currentUser?.username}</div>
        </div>
        <button onClick={logout} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 24px", color: COLORS.muted, cursor: "pointer", fontFamily: FONTS.body, fontSize: 14 }}>
          Back to Login
        </button>
      </div>
    </div>
  );

  if (screen === "loading") return (
    <div style={{...S.app, alignItems:"center", justifyContent:"center"}}>
      <img src={LOGO_SRC} alt="Track Today Live Better" style={{ height: 60, width: "auto", objectFit: "contain" }} />
      <div style={{color:COLORS.muted, fontSize:13, marginTop:8}}>Loading...</div>
    </div>
  );

  if (screen === "login") {
    const COLORS = C;
    const countries = Object.keys(COUNTRY_STATES);
    const states = authForm.country ? COUNTRY_STATES[authForm.country] || [] : [];
    return (
      <div style={{ ...S.app, position: "relative" }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <GlobalStyles isDark={isDark} />
        <MeshBackground C={C} isDark={isDark} />
        <div style={{ ...S.center, zIndex: 1 }}>
          <div style={{ ...S.card, maxWidth: 440 }} className="sf-fade-in">
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <img src={LOGO_SRC} alt="Track Today Live Better" style={{ height: 70, width: "auto", objectFit: "contain", marginBottom: 8 }} />
              <div style={{ color: COLORS.muted, fontSize: 14, marginTop: 4 }}>Your AI-powered health & weight loss coach</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                {["🍽️ AI Meal Plans", "🏋️ Custom Workouts", "📈 Progress Tracking"].map(f => (
                  <div key={f} style={{ fontSize: 11, color: COLORS.muted, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)", padding: "4px 10px", borderRadius: 20, border: `1px solid ${COLORS.border}` }}>{f}</div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
              {["login", "signup"].map(m => (
                <button key={m} onClick={() => setAuthForm(p => ({ ...p, mode: m }))} style={{ ...S.pill(authForm.mode === m), flex: 1, textAlign: "center" }}>
                  {m === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
            {authForm.mode === "signup" && <>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Full Name</label>
                <input style={S.input} placeholder="Your name" value={authForm.name} onChange={e => setAuthForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Country</label>
                  <select style={S.select} value={authForm.country} onChange={e => setAuthForm(p => ({ ...p, country: e.target.value, state: "" }))}>
                    <option value="">Select</option>
                    {countries.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>State / Region</label>
                  <select style={S.select} value={authForm.state} onChange={e => setAuthForm(p => ({ ...p, state: e.target.value }))} disabled={!authForm.country}>
                    <option value="">Select</option>
                    {states.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </>}
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Username</label>
              <input style={S.input} placeholder="username" value={authForm.username} onChange={e => setAuthForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && (authForm.mode === "login" ? login() : signup())} />
            </div>
            {authErr && <div style={{ color: COLORS.warn, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{authErr}</div>}
            <button style={S.btn} onClick={authForm.mode === "login" ? login : signup}>
              {authForm.mode === "login" ? "Sign In →" : "Create Account →"}
            </button>

            {authForm.mode === "login" && (
              <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:COLORS.muted, lineHeight:1.6 }}>
                New user? Switch to <b style={{ color:COLORS.accent, cursor:"pointer" }}
                  onClick={() => setAuthForm(p => ({...p, mode:"signup"}))}>Sign Up</b> to request access.<br/>
                Your account will be activated by the admin.
              </div>
            )}
            {authForm.mode === "signup" && (
              <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:COLORS.muted, lineHeight:1.6 }}>
                After sign up, your admin will review and activate your account.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ONBOARD ──
  if (screen === "onboard") {
    const steps = getSteps();
    const step = steps[onboardStep];
    const progress = (onboardStep / steps.length) * 100;
    const country = currentUser?.country || "India";

    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(99,130,191,0.25); border-radius: 2px; }
          input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }
          select option { background: #0e1628; color: #eef2ff; }
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
          .fade-in { animation: fadeIn 0.35s ease forwards; }
        `}</style>
        <div style={S.center}>
          <div style={{ ...S.card, maxWidth: 520 }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontFamily: FONTS.head, fontSize: 12, color: COLORS.accent, fontWeight: 600 }}>STEP {onboardStep + 1} OF {steps.length}</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{Math.round(progress)}%</div>
              </div>
              <div style={{ height: 4, background: COLORS.card2, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})`, borderRadius: 2, transition: "width 0.4s ease" }} />
              </div>
            </div>
            <div style={{ fontFamily: FONTS.head, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{step.title}</div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: "1.25rem" }}>
              {step.type === "choice" && "Your goal shapes everything — meals, workouts, and timing."}
              {step.type === "form-basic" && "We use this to calculate your personalised calorie and macro targets."}
              {step.type === "medical" && "This helps us make your plan safe and effective for your health."}
              {step.type === "text-list" && "Helps us time your meals around your medication schedule."}
              {step.type === "food-picker" && "Your AI meal plan will be built around foods you actually enjoy."}
              {step.type === "schedule" && "Smart meal timing is calculated from your daily routine."}
              {step.type === "fitness" && "We'll build a workout plan that fits your environment and schedule."}
            </div>

            {/* CHOICE */}
            {step.type === "choice" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {step.options.map(opt => (
                  <button key={opt} onClick={() => { setOnboard(p => ({ ...p, [step.key]: opt })); setOnboardStep(p => p + 1); }}
                    style={{ background: onboard[step.key] === opt ? `linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accent2}22)` : COLORS.card2, border: `1px solid ${onboard[step.key] === opt ? COLORS.accent : COLORS.border}`, borderRadius: 12, padding: "14px 18px", color: COLORS.text, fontSize: 15, cursor: "pointer", textAlign: "left", fontFamily: FONTS.body }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* FORM BASIC */}
            {step.type === "form-basic" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[["weight", "Weight (kg)", "number"], ["height", "Height (cm)", "number"], ["age", "Age", "number"]].map(([k, lbl, t]) => (
                    <div key={k} style={k === "age" ? { gridColumn: "1/-1" } : {}}>
                      <label style={S.label}>{lbl}</label>
                      <input style={S.input} type={t} placeholder={lbl} value={onboard[k] || ""} onChange={e => setOnboard(p => ({ ...p, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={S.label}>Gender</label>
                  <select style={S.select} value={onboard.gender || ""} onChange={e => setOnboard(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">Select gender</option><option>Male</option><option>Female</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Unit system</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["kg/cm", "lbs/inches"].map(u => (
                      <button key={u} onClick={() => setOnboard(p => ({ ...p, units: u }))} style={{ ...S.pill(onboard.units === u), flex: 1 }}>{u}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={S.label}>Target Weight ({onboard.units === "lbs/inches" ? "lbs" : "kg"})</label>
                  <input style={S.input} type="number" placeholder="e.g. 65" value={onboard.targetWeight || ""} onChange={e => setOnboard(p => ({ ...p, targetWeight: e.target.value }))} />
                </div>
                <button style={S.btn} onClick={() => { if (!onboard.weight || !onboard.height || !onboard.age || !onboard.gender) return notify("Please fill all fields"); setOnboardStep(p => p + 1); }}>Continue →</button>
              </div>
            )}

            {/* MEDICAL CONDITIONS (with None option) */}
            {step.type === "medical" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 4 }}>Select all that apply, or skip if none.</div>
                {MEDICAL_CONDITIONS.map(opt => {
                  const sel = (onboard.conditions || []).includes(opt);
                  return (
                    <button key={opt} onClick={() => {
                      setOnboard(p => {
                        const cur = p.conditions || [];
                        return { ...p, conditions: sel ? cur.filter(x => x !== opt) : [...cur, opt] };
                      });
                    }} style={{ background: sel ? `linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accent2}22)` : COLORS.card2, border: `1px solid ${sel ? COLORS.accent : COLORS.border}`, borderRadius: 12, padding: "12px 18px", color: COLORS.text, fontSize: 15, cursor: "pointer", textAlign: "left", fontFamily: FONTS.body }}>
                      {sel ? "✓ " : ""}{opt}
                    </button>
                  );
                })}
                <button style={S.btn} onClick={() => setOnboardStep(p => p + 1)}>
                  {(!onboard.conditions || onboard.conditions.length === 0) ? "Skip — No Conditions →" : "Continue →"}
                </button>
              </div>
            )}

            {/* MEDICATIONS */}
            {step.type === "text-list" && (
              <div>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>List medications with timing (e.g. Metformin 500mg after breakfast).</div>
                <textarea style={{ ...S.input, minHeight: 100, resize: "vertical" }} placeholder="e.g. Metformin 500mg morning, Thyronorm 25mcg empty stomach..." value={onboard.medications || ""} onChange={e => setOnboard(p => ({ ...p, medications: e.target.value }))} />
                <button style={{ ...S.btn, marginTop: 12 }} onClick={() => setOnboardStep(p => p + 1)}>Continue →</button>
              </div>
            )}

            {/* FOOD PICKER — 5 meal tabs + food preference */}
            {step.type === "food-picker" && (
              <div>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>
                  Select foods for <b style={{color:COLORS.accent}}>all 5 sections</b> — the AI uses these to build your personalised meal plan.
                  {country && <span style={{ color: COLORS.accent }}> ({country} foods shown)</span>}
                </div>
                {/* Food preference */}
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Food Preference</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {FOOD_PREFS.map(p => (
                      <button key={p} onClick={() => {
                        setOnboard(prev => ({ ...prev, foodPref: p }));
                        setSelectedFoods(prev => {
                          const meals = ["Breakfast", "Lunch", "Evening Snack", "Dinner", "Munching", "Fruits"];
                          const next = {};
                          meals.forEach(mealKey => {
                            const allowed = new Set(getFoodsByPref(country, p, mealKey));
                            next[mealKey] = (prev[mealKey] || []).filter(f => allowed.has(f));
                          });
                          return next;
                        });
                      }}
                        style={{ ...S.pill(onboard.foodPref === p), padding: "6px 14px", fontSize: 13 }}>{p}</button>
                    ))}
                  </div>
                </div>
                {/* Meal tabs */}
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {["Breakfast", "Lunch", "Evening Snack", "Dinner", "Munching", "Fruits"].map(m => (
                    <button key={m} onClick={() => setActiveMealTab(m)}
                      style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontFamily: FONTS.body, cursor: "pointer", border: activeMealTab === m ? "none" : `1px solid ${COLORS.border}`, background: activeMealTab === m ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})` : COLORS.card2, color: activeMealTab === m ? "#fff" : COLORS.muted, fontWeight: activeMealTab === m ? 600 : 400 }}>
                      {m} {(selectedFoods[m] || []).length > 0 && <span style={{ opacity: 0.8 }}>({(selectedFoods[m] || []).length})</span>}
                    </button>
                  ))}
                </div>
                <FoodMealPicker mealKey={activeMealTab} foods={selectedFoods} selectedFoods={selectedFoods} setSelectedFoods={setSelectedFoods} country={country} foodPref={onboard.foodPref || ""} COLORS={COLORS} S={S} />
                {/* Progress badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, marginBottom: 2 }}>
                  {["Breakfast","Lunch","Evening Snack","Dinner","Munching","Fruits"].map(m => (
                    <span key={m} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: (selectedFoods[m]||[]).length > 0 ? `${COLORS.success}22` : `${COLORS.warn}22`, color: (selectedFoods[m]||[]).length > 0 ? COLORS.success : COLORS.warn }}>
                      {(selectedFoods[m]||[]).length > 0 ? "✓" : "○"} {m}
                    </span>
                  ))}
                </div>
                <button style={{ ...S.btn, marginTop: 14 }} onClick={() => {
                  if (!onboard.foodPref) return notify("Please select a food preference (Vegetarian, Non-Vegetarian, etc.)");
                  const missing = ["Breakfast","Lunch","Dinner"].filter(s => !(selectedFoods[s]||[]).length);
                  if (missing.length > 0) return notify(`Please select foods for: ${missing.join(", ")}`);
                  setOnboardStep(p => p + 1);
                }}>Continue →</button>
              </div>
            )}

            {/* SCHEDULE */}
            {step.type === "schedule" && (
              <div>
                <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 12 }}>Add your daily routine. We'll calculate your optimal meal & water intake times.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                  {scheduleSlots.map((s, i) => (
                    <div key={i} style={{ ...S.row, background: COLORS.card2, borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ color: COLORS.accent, fontWeight: 600, fontSize: 14, minWidth: 50 }}>{s.time}</div>
                      <div style={{ flex: 1, fontSize: 14 }}>{s.label}</div>
                      <button onClick={() => removeSlot(i)} style={{ ...S.btnSm, color: COLORS.warn, border: "none", padding: "2px 8px" }}>✕</button>
                    </div>
                  ))}
                </div>
                <ActivityInput newSlot={newSlot} setNewSlot={setNewSlot} addSlot={addSlot} S={S} COLORS={COLORS} />
                <button style={S.btn} onClick={() => setOnboardStep(p => p + 1)}>Continue →</button>
              </div>
            )}

            {/* FITNESS */}
            {step.type === "fitness" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={S.label}>Fitness Level</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {FITNESS_LEVELS.map(l => <button key={l} onClick={() => setOnboard(p => ({ ...p, fitnessLevel: l }))} style={{ ...S.pill(onboard.fitnessLevel === l), flex: 1 }}>{l}</button>)}
                  </div>
                </div>
                <div>
                  <label style={S.label}>Workout Preference</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {WORKOUT_TYPES.map(l => <button key={l} onClick={() => setOnboard(p => ({ ...p, workoutType: l }))} style={{ ...S.pill(onboard.workoutType === l), flex: 1 }}>{l}</button>)}
                  </div>
                </div>
                <div>
                  <label style={S.label}>Workout Frequency</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {WORKOUT_FREQUENCIES.map(l => <button key={l} onClick={() => setOnboard(p => ({ ...p, workoutFrequency: l }))} style={{ ...S.pill(onboard.workoutFrequency === l), fontSize: 13 }}>{l}</button>)}
                  </div>
                </div>
                <button style={S.btn} onClick={saveProfile}>Complete Setup 🎉</button>
              </div>
            )}

            {onboardStep > 0 && step.type !== "form-basic" && (
              <button onClick={() => setOnboardStep(p => p - 1)} style={{ ...S.btnSm, marginTop: 14, width: "100%", textAlign: "center" }}>← Back</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  if (screen === "dashboard" && currentUser) {
    const COLORS = C;
    const profile = currentUser.profile || {};
    const schedule = profile.schedule || [];
    const smartTimes = calcSmartTimes(schedule);
    const dailyWater = calcDailyWater(parseFloat(profile.weight) || 70, profile.fitnessLevel || "Beginner");
    const score = metrics ? healthScore(metrics) : 0;
    const bmiCat = metrics ? bmiCategory(metrics.bmi) : null;
    const weightChange = firstLog && latestLog ? (latestLog.weight - firstLog.weight).toFixed(1) : 0;
    const bmiChange = metrics && firstMetrics ? (metrics.bmi - firstMetrics.bmi).toFixed(1) : 0;
    const bfChange = metrics && firstMetrics ? (metrics.bodyFat - firstMetrics.bodyFat).toFixed(1) : 0;
    const country = profile.country || currentUser.country || "India";
    const likedFoods = profile.likedFoods || {};
    const swaps = Object.values(likedFoods).flat().filter(f => HEALTHY_SWAPS[f]).map(f => ({ from: f, to: HEALTHY_SWAPS[f] }));

    const metricItems = metrics ? [
      { label: "BMI", value: metrics.bmi, unit: "", color: bmiCat?.color, sub: bmiCat?.label },
      { label: "Body Fat", value: metrics.bodyFat, unit: "%", color: COLORS.accent3 },
      { label: "BMR", value: metrics.bmr, unit: "kcal", color: COLORS.accent2 },
      { label: "Skeletal Muscle", value: metrics.skeletalMuscle, unit: "kg", color: COLORS.success },
      { label: "Muscle Mass", value: metrics.muscleMass, unit: "kg", color: COLORS.success },
      { label: "Muscle Storage", value: metrics.muscleStorage, unit: "kg", color: COLORS.accent },
      { label: "Protein Need", value: metrics.protein, unit: "g/day", color: COLORS.accent2 },
      { label: "Fat-free Weight", value: metrics.fatFree, unit: "kg", color: COLORS.muted },
      { label: "Subcutaneous Fat", value: metrics.subcutaneous, unit: "kg", color: COLORS.accent3 },
      { label: "Visceral Fat", value: metrics.visceral, unit: "/15", color: metrics.visceral > 10 ? COLORS.warn : COLORS.success },
      { label: "Body Water", value: metrics.bodyWater, unit: "L", color: COLORS.accent2 },
      { label: "Bone Mass", value: metrics.boneMass, unit: "kg", color: COLORS.muted },
      { label: "Metabolic Age", value: metrics.metabolicAge, unit: "yrs", color: metrics.metabolicAge > (profile.age || 30) ? COLORS.warn : COLORS.success },
    ] : [];

    // Build today's timeline from schedule + smart suggestions
    const buildTimeline = () => {
      const items = [];
      schedule.forEach(s => {
        const lbl = s.label.toLowerCase();
        let suggestion = "Stay active & hydrated";
        if (lbl.includes("wake")) suggestion = "1 glass warm water + stretch for 5 min";
        else if (lbl.includes("gym") || lbl.includes("workout") || lbl.includes("yoga")) suggestion = "Pre-workout: sip water, light snack 30 min before";
        else if (lbl.includes("office") || lbl.includes("work") || lbl.includes("college")) suggestion = "Carry a 1L water bottle to your desk";
        else if (lbl.includes("sleep") || lbl.includes("bed")) suggestion = "Avoid screens, have warm milk or chamomile tea";
        else if (lbl.includes("prayer") || lbl.includes("meditation")) suggestion = "Hydrate well before and after";
        items.push({ time: s.time, activity: s.label, suggestion, type: "schedule" });
      });
      // Add smart meal times
      const mealMap = [
        { time: smartTimes.breakfast, activity: "Breakfast", suggestion: (likedFoods.Breakfast || []).slice(0, 2).join(" + ") || "Healthy breakfast", type: "meal" },
        { time: smartTimes.lunch, activity: "Lunch", suggestion: (likedFoods.Lunch || []).slice(0, 2).join(" + ") || "Balanced lunch", type: "meal" },
        { time: smartTimes.eveningSnack, activity: "Evening Snack", suggestion: (likedFoods["Evening Snack"] || []).slice(0, 2).join(" + ") || "Light snack", type: "meal" },
        { time: smartTimes.dinner, activity: "Dinner", suggestion: (likedFoods.Dinner || []).slice(0, 2).join(" + ") || "Light dinner", type: "meal" },
        ...(smartTimes.preWorkout ? [{ time: smartTimes.preWorkout, activity: "Pre-Workout Fuel", suggestion: "Banana or black coffee", type: "meal" }] : []),
      ];
      mealMap.forEach(m => { if (!items.find(i => i.time === m.time)) items.push(m); });
      // Add water reminders
      smartTimes.waterTimes.forEach(w => {
        if (!items.find(i => i.time === w.time)) items.push({ time: w.time, activity: "Drink Water", suggestion: w.note, type: "water" });
      });
      return items.sort((a, b) => a.time.localeCompare(b.time));
    };
    const timeline = buildTimeline();

    const genWorkout = () => {
      const level = profile.fitnessLevel || "Beginner";
      const type = profile.workoutType || "Home";
      const freq = profile.workoutFrequency || "3x per week";
      const freqNum = parseInt(freq) || 3;
      const dur = level === "Beginner" ? 45 : level === "Moderate" ? 60 : 75;
      const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

      // ── GYM: Pure weight training splits, no cardio ──────────────────────
      const GYM_SPLITS = {
        1: [
          { split: "Full Body", muscles: "All muscle groups", exercises: [
            "Barbell Squat 4×8", "Bench Press 4×8", "Deadlift 3×6",
            "Pull-ups / Lat Pulldown 3×10", "Overhead Press 3×10",
            "Barbell Row 3×10", "Dumbbell Curl 3×12", "Tricep Pushdown 3×12",
            "Plank 3×45s"
          ]}
        ],
        2: [
          { split: "Upper Body", muscles: "Chest · Back · Shoulders · Arms", exercises: [
            "Bench Press 4×8", "Incline Dumbbell Press 3×10",
            "Barbell Row 4×8", "Lat Pulldown 3×10",
            "Overhead Press 3×10", "Lateral Raises 3×12",
            "Barbell Curl 3×12", "Skullcrushers 3×12"
          ]},
          { split: "Lower Body", muscles: "Quads · Hamstrings · Glutes · Calves", exercises: [
            "Barbell Squat 4×8", "Romanian Deadlift 3×10",
            "Leg Press 4×12", "Walking Lunges 3×12 each leg",
            "Leg Curl 3×12", "Leg Extension 3×12",
            "Standing Calf Raise 4×15", "Hip Thrust 3×12"
          ]}
        ],
        3: [
          { split: "Push (Chest · Shoulders · Triceps)", muscles: "Chest · Shoulders · Triceps", exercises: [
            "Bench Press 4×8", "Incline Dumbbell Press 3×10",
            "Cable Fly 3×12", "Overhead Press 4×8",
            "Lateral Raises 3×12", "Front Raises 3×12",
            "Tricep Pushdown 3×12", "Overhead Tricep Extension 3×12"
          ]},
          { split: "Pull (Back · Biceps)", muscles: "Back · Biceps · Rear Delts", exercises: [
            "Deadlift 4×6", "Barbell Row 4×8",
            "Pull-ups 3×8", "Lat Pulldown 3×10",
            "Cable Row 3×12", "Face Pull 3×15",
            "Barbell Curl 3×12", "Hammer Curl 3×12"
          ]},
          { split: "Legs (Quads · Hamstrings · Glutes)", muscles: "Quads · Hamstrings · Glutes · Calves", exercises: [
            "Barbell Squat 4×8", "Romanian Deadlift 3×10",
            "Leg Press 4×12", "Walking Lunges 3×12 each",
            "Leg Curl 3×12", "Leg Extension 3×12",
            "Hip Thrust 3×12", "Calf Raise 4×15"
          ]}
        ],
        4: [
          { split: "Chest & Triceps", muscles: "Chest · Triceps", exercises: [
            "Bench Press 4×8", "Incline Dumbbell Press 4×10",
            "Decline Press 3×10", "Cable Fly 3×12",
            "Dips 3×12", "Tricep Pushdown 3×12",
            "Overhead Tricep Extension 3×12", "Close-grip Bench 3×10"
          ]},
          { split: "Back & Biceps", muscles: "Back · Biceps", exercises: [
            "Deadlift 4×6", "Barbell Row 4×8",
            "Pull-ups 3×8", "Lat Pulldown 3×10",
            "Cable Row 3×12", "Barbell Curl 3×12",
            "Incline Dumbbell Curl 3×12", "Hammer Curl 3×12"
          ]},
          { split: "Shoulders & Abs", muscles: "Shoulders · Core", exercises: [
            "Overhead Press 4×8", "Lateral Raises 4×12",
            "Front Raises 3×12", "Rear Delt Fly 3×12",
            "Face Pull 3×15", "Arnold Press 3×10",
            "Plank 3×60s", "Cable Crunch 3×15"
          ]},
          { split: "Legs", muscles: "Quads · Hamstrings · Glutes · Calves", exercises: [
            "Barbell Squat 5×5", "Romanian Deadlift 4×8",
            "Leg Press 4×12", "Walking Lunges 3×12 each",
            "Leg Curl 3×12", "Hip Thrust 4×12",
            "Calf Raise 4×15"
          ]}
        ],
        5: [
          { split: "Chest", muscles: "Chest", exercises: [
            "Bench Press 5×5", "Incline Dumbbell Press 4×10",
            "Decline Bench Press 3×10", "Cable Fly 4×12",
            "Dips 3×12", "Push-ups to failure"
          ]},
          { split: "Back", muscles: "Back · Rear Delts", exercises: [
            "Deadlift 5×5", "Barbell Row 4×8",
            "Pull-ups 4×8", "Lat Pulldown 3×10",
            "Cable Row 3×12", "Face Pull 3×15", "Shrugs 3×15"
          ]},
          { split: "Shoulders", muscles: "Shoulders · Traps", exercises: [
            "Overhead Press 5×5", "Lateral Raises 4×12",
            "Front Raises 3×12", "Rear Delt Fly 3×12",
            "Arnold Press 3×10", "Upright Row 3×12", "Shrugs 4×15"
          ]},
          { split: "Arms (Biceps & Triceps)", muscles: "Biceps · Triceps · Forearms", exercises: [
            "Barbell Curl 4×10", "Incline Dumbbell Curl 3×12",
            "Hammer Curl 3×12", "Concentration Curl 3×12",
            "Tricep Pushdown 4×12", "Skullcrushers 3×10",
            "Overhead Extension 3×12", "Close-grip Bench 3×10"
          ]},
          { split: "Legs", muscles: "Quads · Hamstrings · Glutes · Calves", exercises: [
            "Barbell Squat 5×5", "Romanian Deadlift 4×8",
            "Leg Press 4×12", "Walking Lunges 3×12 each",
            "Leg Curl 3×12", "Hip Thrust 4×12",
            "Calf Raise 4×15"
          ]}
        ],
        6: [
          { split: "Chest & Abs", muscles: "Chest · Core", exercises: ["Bench Press 5×5","Incline Press 4×10","Cable Fly 4×12","Dips 3×12","Plank 3×60s","Cable Crunch 3×15"] },
          { split: "Back", muscles: "Back · Rear Delts", exercises: ["Deadlift 5×5","Barbell Row 4×8","Pull-ups 4×8","Lat Pulldown 3×10","Cable Row 3×12","Face Pull 3×15"] },
          { split: "Shoulders", muscles: "Shoulders · Traps", exercises: ["Overhead Press 5×5","Lateral Raises 4×12","Front Raises 3×12","Arnold Press 3×10","Shrugs 4×15"] },
          { split: "Arms", muscles: "Biceps · Triceps", exercises: ["Barbell Curl 4×10","Hammer Curl 3×12","Incline Curl 3×12","Pushdown 4×12","Skullcrushers 3×10","Dips 3×12"] },
          { split: "Legs (Quad focus)", muscles: "Quads · Calves", exercises: ["Squat 5×5","Leg Press 4×12","Lunges 3×12 each","Leg Extension 3×12","Calf Raise 4×15"] },
          { split: "Legs (Posterior)", muscles: "Hamstrings · Glutes", exercises: ["Romanian Deadlift 4×8","Hip Thrust 4×12","Leg Curl 4×12","Sumo Deadlift 3×8","Glute Kickback 3×15"] },
        ]
      };

      // ── HOME: Bodyweight + dumbbell split ───────────────────────────────
      const HOME_SPLITS = {
        1: [{ split: "Full Body", muscles: "All muscle groups", exercises: ["Push-ups 4×15","Bodyweight Squat 4×20","Pull-ups / Chair row 3×10","Pike Push-up 3×12","Reverse Lunge 3×12 each","Plank 3×60s","Glute Bridge 3×15","Dips on chair 3×12"] }],
        2: [
          { split: "Upper Body", muscles: "Chest · Back · Shoulders · Arms", exercises: ["Push-ups 4×15","Wide Push-ups 3×12","Dips on chair 3×12","Pike Push-up 3×12","Renegade Row 3×10","Inverted Row 3×10","Diamond Push-ups 3×12","Plank shoulder tap 3×20"] },
          { split: "Lower Body", muscles: "Quads · Hamstrings · Glutes", exercises: ["Bodyweight Squat 4×20","Jump Squat 3×15","Reverse Lunge 3×15 each","Bulgarian Split Squat 3×12","Glute Bridge 4×20","Hip Thrust 3×15","Wall Sit 3×45s","Calf Raise 4×20"] }
        ],
        3: [
          { split: "Push", muscles: "Chest · Shoulders · Triceps", exercises: ["Push-ups 4×20","Incline Push-ups 3×15","Pike Push-ups 3×12","Dips on chair 3×15","Diamond Push-ups 3×12","Tricep kickback 3×15"] },
          { split: "Pull", muscles: "Back · Biceps", exercises: ["Inverted Row 4×10","Pull-ups 3×8","Renegade Row 3×10 each","Superman holds 3×15","Resistance band curl 3×15","Hammer curl 3×15"] },
          { split: "Legs & Core", muscles: "Legs · Core", exercises: ["Squat 4×20","Lunge 3×15 each","Glute Bridge 4×20","Wall Sit 3×45s","Plank 3×60s","Mountain Climbers 3×20","Crunches 3×20","Leg raises 3×15"] }
        ],
        4: [
          { split: "Chest & Triceps", muscles: "Chest · Triceps", exercises: ["Push-ups 4×20","Wide Push-ups 3×15","Incline Push-ups 3×15","Decline Push-ups 3×12","Dips 3×15","Diamond Push-ups 3×12","Close push-ups 3×12"] },
          { split: "Back & Biceps", muscles: "Back · Biceps", exercises: ["Inverted Row 4×10","Pull-ups 3×8","Renegade Row 3×10","Superman 3×15","Resistance band row 3×15","Dumbbell curl 3×15","Hammer curl 3×15"] },
          { split: "Shoulders & Abs", muscles: "Shoulders · Core", exercises: ["Pike Push-ups 4×12","Lateral raise 3×15","Front raise 3×15","Shoulder tap 3×20","Plank 3×60s","Crunches 3×20","Leg raises 3×15","Russian twist 3×20"] },
          { split: "Legs", muscles: "Quads · Hamstrings · Glutes", exercises: ["Squat 4×20","Jump Squat 3×15","Bulgarian Split Squat 3×12","Lunge 3×15 each","Glute Bridge 4×20","Hip Thrust 3×15","Calf Raise 4×20"] }
        ],
        5: [
          { split: "Chest", muscles: "Chest", exercises: ["Push-ups 5×20","Wide Push-ups 4×15","Incline Push-ups 4×15","Decline Push-ups 3×12","Diamond Push-ups 3×12"] },
          { split: "Back", muscles: "Back", exercises: ["Pull-ups 4×8","Inverted Row 4×12","Renegade Row 3×10","Superman 4×15","Resistance band row 3×15"] },
          { split: "Shoulders & Arms", muscles: "Shoulders · Biceps · Triceps", exercises: ["Pike Push-ups 4×12","Lateral raises 3×15","Dumbbell curl 3×15","Hammer curl 3×15","Dips 3×15","Diamond push-ups 3×12"] },
          { split: "Legs (Quad)", muscles: "Quads · Calves", exercises: ["Squat 5×20","Jump Squat 3×15","Leg extension (band) 3×15","Wall sit 3×45s","Calf Raise 4×25"] },
          { split: "Legs (Posterior) & Core", muscles: "Hamstrings · Glutes · Core", exercises: ["Glute Bridge 4×20","Hip Thrust 4×15","Lunge 3×15 each","Superman 3×15","Plank 3×60s","Crunches 3×25"] }
        ],
        6: [
          { split: "Chest & Abs", muscles: "Chest · Core", exercises: ["Push-ups 5×20","Wide Push-ups 4×15","Decline Push-ups 3×12","Plank 3×60s","Crunches 3×25","Leg raises 3×15"] },
          { split: "Back", muscles: "Back", exercises: ["Pull-ups 4×8","Inverted Row 4×12","Renegade Row 3×10","Superman 4×15","Resistance band row 4×15"] },
          { split: "Shoulders", muscles: "Shoulders", exercises: ["Pike Push-ups 4×12","Lateral raises 4×15","Front raises 3×15","Arnold press 3×12","Shoulder tap 3×20"] },
          { split: "Arms", muscles: "Biceps · Triceps", exercises: ["Dumbbell curl 4×15","Hammer curl 3×15","Concentration curl 3×12","Dips 4×15","Diamond push-ups 3×15","Overhead extension 3×12"] },
          { split: "Legs (Quad focus)", muscles: "Quads · Calves", exercises: ["Squat 5×20","Jump Squat 3×15","Wall sit 3×45s","Leg extension band 3×15","Calf Raise 4×25"] },
          { split: "Legs (Posterior) & Core", muscles: "Glutes · Hamstrings · Core", exercises: ["Hip Thrust 4×20","Glute Bridge 4×20","Lunge 3×15 each","Superman 3×15","Russian twist 3×20","Mountain Climbers 3×20"] }
        ]
      };

      // ── OUTDOOR: Running + bodyweight ───────────────────────────────────
      const OUTDOOR_SPLITS = {
        1: [{ split: "Full Body Outdoor", muscles: "All muscle groups", exercises: ["20 min jog","Push-ups 4×15","Bodyweight squats 4×20","Dips on bench 3×12","Lunges 3×15 each","Plank 3×60s","Pull-ups on bar 3×8"] }],
        2: [
          { split: "Cardio + Upper", muscles: "Chest · Back · Shoulders", exercises: ["20 min run","Push-ups 4×15","Dips on bench 3×12","Pike push-ups 3×12","Pull-ups 3×8","Inverted row 3×10"] },
          { split: "Sprints + Lower", muscles: "Legs · Glutes", exercises: ["10×100m sprints","Squat 4×20","Jump squat 3×15","Lunges 3×15 each","Glute bridge 3×20","Calf raise 4×20"] }
        ],
        3: [
          { split: "Run + Push", muscles: "Chest · Shoulders · Triceps", exercises: ["15 min run","Push-ups 4×15","Pike push-ups 3×12","Dips 3×12","Diamond push-ups 3×12"] },
          { split: "Run + Pull", muscles: "Back · Biceps", exercises: ["15 min run","Pull-ups 4×8","Inverted row 4×10","Renegade row 3×10","Resistance band curl 3×15"] },
          { split: "Sprints + Legs", muscles: "Legs · Core", exercises: ["8×100m sprints","Squat 4×20","Lunge 3×15 each","Glute bridge 4×20","Plank 3×60s","Mountain climbers 3×20"] }
        ],
        4: [
          { split: "Distance Run", muscles: "Cardio · Endurance", exercises: ["30-40 min moderate run","Cool-down stretching 10 min","Foam roll legs"] },
          { split: "Upper Body + Walk", muscles: "Chest · Back · Shoulders", exercises: ["15 min brisk walk","Push-ups 4×20","Pull-ups 3×10","Dips 3×15","Pike push-ups 3×12","Plank 3×60s"] },
          { split: "Sprint Intervals", muscles: "Cardio · Legs", exercises: ["Warm-up jog 5 min","10×200m sprints (1 min rest)","Squat 3×20","Lunge 3×15 each","Cool-down walk 5 min"] },
          { split: "Legs + Core", muscles: "Legs · Core", exercises: ["20 min run","Squat 4×20","Jump squat 3×15","Glute bridge 4×20","Plank 3×60s","Crunches 3×20","Russian twist 3×20"] }
        ],
        5: [
          { split: "Distance Run", muscles: "Cardio", exercises: ["30-40 min run","Stretching 10 min"] },
          { split: "Push + Short Run", muscles: "Chest · Triceps", exercises: ["10 min run","Push-ups 4×20","Dips 3×15","Pike push-ups 3×12","Diamond push-ups 3×12"] },
          { split: "Pull + Short Run", muscles: "Back · Biceps", exercises: ["10 min run","Pull-ups 4×8","Inverted row 4×10","Renegade row 3×10"] },
          { split: "Sprint Day", muscles: "Speed · Power", exercises: ["Warm-up 5 min","10×100m all-out sprints","Box jumps 3×10","Broad jumps 3×8"] },
          { split: "Legs & Core", muscles: "Legs · Core", exercises: ["15 min jog","Squat 4×20","Lunge 3×15 each","Glute bridge 4×20","Plank 3×60s","Crunches 3×20"] }
        ],
        6: [
          { split: "Long Run", muscles: "Endurance", exercises: ["40-50 min easy run","Full body stretch 15 min"] },
          { split: "Push Workout", muscles: "Chest · Triceps", exercises: ["Push-ups 5×20","Dips 4×15","Pike push-ups 3×12","Diamond push-ups 3×12"] },
          { split: "Pull Workout", muscles: "Back · Biceps", exercises: ["Pull-ups 4×8","Inverted row 4×12","Renegade row 3×10","Resistance band curl 3×15"] },
          { split: "Sprint Day", muscles: "Speed", exercises: ["10×100m sprints","Plyometric jumps 3×10","Broad jumps 3×8"] },
          { split: "Legs", muscles: "Quads · Glutes", exercises: ["Squat 4×20","Jump squat 3×15","Lunge 3×15 each","Glute bridge 4×20","Calf raise 4×20"] },
          { split: "Active Recovery Run", muscles: "Light cardio", exercises: ["20 min easy jog","Yoga / Stretching 20 min"] }
        ]
      };

      const splitMap = type === "Gym" ? GYM_SPLITS : type === "Outdoor" ? OUTDOOR_SPLITS : HOME_SPLITS;
      const splits = splitMap[Math.min(freqNum, 6)] || splitMap[3];

      // Map workout days
      const workoutDayIndices = freqNum === 1 ? [0] : freqNum === 2 ? [0,3] : freqNum === 3 ? [0,2,4] : freqNum === 4 ? [0,1,3,4] : freqNum === 5 ? [0,1,2,3,4] : [0,1,2,3,4,5];
      let splitIdx = 0;
      const weeklyPlan = days.map((day, i) => {
        if (workoutDayIndices.includes(i)) {
          const s = splits[splitIdx % splits.length];
          splitIdx++;
          return { day, isWorkout: true, split: s.split, muscles: s.muscles, exercises: s.exercises };
        }
        return { day, isWorkout: false, split: "Rest", muscles: "", exercises: [] };
      });

      const conditions = profile.conditions || [];
      // Apply medical intensity limit
      const medLimit = getMedicalIntensityLimit(conditions);

      // Apply medical exercise filters to all workout days
      const filteredWeeklyPlan = weeklyPlan.map(day => ({
        ...day,
        exercises: filterExercisesForMedical(day.exercises, conditions)
      }));
      const filteredSplits = splits.map(s => ({
        ...s,
        exercises: filterExercisesForMedical(s.exercises, conditions)
      }));

      const primarySplit = filteredSplits[0];
      return {
        duration: dur, intensity: medLimit ? medLimit.toLowerCase() : level.toLowerCase(),
        exercises: primarySplit.exercises,
        split: primarySplit.split, muscles: primarySplit.muscles,
        burn: Math.round(dur * (level === "Beginner" ? 5 : level === "Moderate" ? 7 : 9)),
        freq, weeklyPlan: filteredWeeklyPlan, splits: filteredSplits, type,
        medicalWarnings: getMedicalWorkoutWarnings(conditions),
      };
    };
    const workout = genWorkout();

    return (
      <div style={{ ...S.app, position: "relative" }}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <GlobalStyles isDark={isDark} />
        <MeshBackground C={C} isDark={isDark} />
        {notification && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, maxWidth: 320,
            background: notification.startsWith("⚠") || notification.startsWith("Error") ? COLORS.warn :
                        notification.startsWith("✓") || notification.toLowerCase().includes("saved") || notification.toLowerCase().includes("success") ? COLORS.success :
                        COLORS.accent,
            color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 10,
            animation: "sfSlideIn 0.3s ease",
          }}>
            {notification}
          </div>
        )}
        {/* Broadcast banner from admin */}
        <BroadcastBanner COLORS={COLORS} />

        {/* Translate guide modal */}
        {showTranslate && (() => {
          const ua = navigator.userAgent;
          const isIOS = /iPad|iPhone|iPod/.test(ua);
          const isAndroid = /Android/.test(ua);
          const steps = isIOS
            ? ["Open app in Safari (not Chrome)","Tap AA in the address bar","Tap Translate to… → choose language","App translates instantly ✅"]
            : isAndroid
            ? ["Tap ⋮ menu in Chrome","Tap Translate…","Choose your language","App translates instantly ✅"]
            : ["Right-click anywhere on the page","Click Translate to…","Choose your language","Page translates instantly ✅"];
          return (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:9999,
              display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
              onClick={() => setShowTranslate(false)}>
              <div style={{ ...S.modal, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
                <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:700, marginBottom:4 }}>🌐 Translate This App</div>
                <div style={{ fontSize:12, color:COLORS.muted, marginBottom:14 }}>
                  Free browser translation — Hindi, Marathi, Tamil, Kannada and 100+ languages
                </div>
                {steps.map((step, i) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"10px 12px",
                    background:"rgba(255,255,255,0.04)", borderRadius:8, marginBottom:6,
                    alignItems:"flex-start" }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:`${COLORS.accent}22`,
                      color:COLORS.accent, fontWeight:700, fontSize:12, flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>{i+1}</div>
                    <span style={{ fontSize:13, color:COLORS.text }}>{step}</span>
                  </div>
                ))}
                <button onClick={() => setShowTranslate(false)}
                  style={{ ...S.btn, marginTop:14, padding:"10px" }}>Got it ✓</button>
              </div>
            </div>
          );
        })()}

        <nav style={{ ...S.nav, padding:"10px 14px", position:"sticky", zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            <img src={LOGO_SRC} alt="VitaTrack" style={{ height:32, width:"auto", objectFit:"contain", flexShrink:0 }} />
            {metrics && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                <span style={{ fontSize:10, padding:"3px 8px", borderRadius:20, fontWeight:700,
                  background:`${COLORS.success}18`, color:COLORS.success, border:`1px solid ${COLORS.success}30`, whiteSpace:"nowrap" }}>
                  ✦ {healthScore(metrics)}
                </span>
                {calcStreak(userLogs) > 0 && (
                  <span style={{ fontSize:10, padding:"3px 8px", borderRadius:20, fontWeight:700,
                    background:"rgba(249,115,22,0.12)", color:"#fb923c", border:"1px solid rgba(249,115,22,0.25)", whiteSpace:"nowrap" }}>
                    🔥 {calcStreak(userLogs)}d
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            <div style={{ fontSize:12, color:COLORS.muted, fontWeight:500, whiteSpace:"nowrap" }}>
              Hi, <span style={{ color:COLORS.text, fontWeight:600 }}>{currentUser.name?.split(" ")[0]}</span> 👋
            </div>
            {currentUser.role === "admin" && (
              <button style={{ ...S.btnSm, color:COLORS.accent, borderColor:`${COLORS.accent}44`, padding:"5px 10px", fontSize:12 }}
                onClick={() => setScreen("admin")}>
                🛡
              </button>
            )}
            {/* Translate button */}
            <button onClick={() => setShowTranslate(t => !t)}
              style={{ ...S.btnSm, padding:"5px 10px", fontSize:13 }}
              title="Translate to Hindi, Marathi, Tamil, Kannada...">
              🌐
            </button>
            <button onClick={() => setThemeMode(m => m === "dark" ? "light" : m === "light" ? "system" : "dark")}
              style={{ ...S.btnSm, padding:"5px 10px", fontSize:14 }}
              title={`Theme: ${themeMode} (tap to cycle)`}>
              {themeMode === "light" ? "☀️" : themeMode === "system" ? "💻" : "🌙"}
            </button>
            <button style={{ ...S.btnSm, padding:"5px 10px", fontSize:12 }}
              onClick={() => { if(window.confirm("Sign out?")) logout(); }}>
              Exit
            </button>
          </div>
        </nav>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"12px 12px", width:"100%", position:"relative", zIndex:1 }}>
          {/* Incomplete profile banner */}
          {(!profile.weight || !profile.height || !profile.age) && (
            <div style={{ background: `${COLORS.accent3}18`, border: `1px solid ${COLORS.accent3}44`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.accent3, marginBottom: 3 }}>Complete your profile for accurate metrics</div>
                <div style={{ fontSize: 13, color: COLORS.muted }}>
                  Missing: {[!profile.weight && "Weight", !profile.height && "Height", !profile.age && "Age"].filter(Boolean).join(", ")}.
                  Body metrics, calorie targets and health score need this data.
                </div>
              </div>
              <button onClick={() => setDashTab("settings")}
                style={{ background: COLORS.accent3, border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                Complete →
              </button>
            </div>
          )}
          {/* TODAY */}
          {dashTab === "today" && (
            <div key="tab-today" className="sf-tab-panel">
              {/* Hero Dashboard — Today only */}
              {(() => {
                const streak = calcStreak(userLogs);
                const quote = getTodayQuote();
                const startWeight = firstLog ? firstLog.weight : parseFloat(profile.weight) || 0;
                const curWeight = latestLog ? latestLog.weight : parseFloat(profile.weight) || 0;
                const targetWeight = parseFloat(profile.targetWeight) || 0;
                const toGoal = targetWeight ? Math.abs(curWeight - targetWeight).toFixed(1) : null;
                const bmiCatNow = metrics ? bmiCategory(metrics.bmi) : null;
                const isLosing = profile.goal?.toLowerCase().includes("lose") || profile.goal?.toLowerCase().includes("weight");
                const ringTrack = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
                const dotEmpty = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
                return (
                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ ...S.metricCard, background: `linear-gradient(135deg, ${COLORS.accent}18, ${COLORS.accent2}18)`, border: `1px solid ${COLORS.accent}30`, marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>💬</span>
                      <div>
                        <div style={{ fontSize: 13, color: COLORS.text, fontStyle: "italic", lineHeight: 1.5 }}>"{quote.text}"</div>
                        <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>— {quote.author}</div>
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:10 }}>
                      {(() => {
                        const sc = score > 75 ? COLORS.success : score > 50 ? COLORS.accent3 : COLORS.warn;
                        const circ = 2 * Math.PI * 28;
                        return (
                          <div style={{ ...S.metricCard, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, minHeight:120, padding:"14px 10px" }}>
                            <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, letterSpacing:0.5 }}>HEALTH SCORE</div>
                            <svg width="72" height="72" viewBox="0 0 70 70">
                              <circle cx="35" cy="35" r="28" fill="none" stroke={ringTrack} strokeWidth="7" />
                              <circle cx="35" cy="35" r="28" fill="none" stroke={sc} strokeWidth="7"
                                strokeDasharray={`${(score/100)*circ} ${circ}`}
                                strokeLinecap="round" transform="rotate(-90 35 35)" />
                            </svg>
                            <div style={{ fontWeight:800, fontSize:26, color:sc, lineHeight:1, marginTop:-48 }}>{score}</div>
                            <div style={{ fontSize:11, color:COLORS.muted, marginTop:28 }}>/100</div>
                          </div>
                        );
                      })()}
                      <div style={{ ...S.metricCard, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, minHeight:120, padding:"14px 10px" }}>
                        <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, letterSpacing:0.5 }}>LOG STREAK</div>
                        <div style={{ fontSize:34, lineHeight:1 }}>🔥</div>
                        <div style={{ fontSize:30, fontWeight:800, color: streak > 6 ? "#f97316" : streak > 2 ? COLORS.accent3 : COLORS.text, lineHeight:1 }}>{streak}</div>
                        <div style={{ fontSize:11, color:COLORS.muted }}>{streak === 1 ? "day" : "days"} in a row</div>
                      </div>
                      {targetWeight > 0 && (
                        <div style={{ ...S.metricCard, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, minHeight:120, padding:"14px 10px" }}>
                          <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, letterSpacing:0.5 }}>GOAL PROGRESS</div>
                          <GoalRing current={curWeight} target={targetWeight} start={startWeight} color={COLORS.accent} size={68} />
                          <div style={{ fontSize:12, color:COLORS.accent, fontWeight:700 }}>{toGoal} kg to go</div>
                        </div>
                      )}
                      {metrics && (
                        <div style={{ ...S.metricCard, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, minHeight:120, padding:"14px 10px" }}>
                          <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, letterSpacing:0.5 }}>BMI</div>
                          <BMIGauge bmi={metrics.bmi} color={bmiCatNow?.color || COLORS.success} label={bmiCatNow?.label || ""} />
                        </div>
                      )}
                      <div style={{ ...S.metricCard, display:"flex", flexDirection:"column", justifyContent:"center", gap:6, minHeight:120, padding:"14px 16px" }}>
                        <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, letterSpacing:0.5 }}>CURRENT WEIGHT</div>
                        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                          <span style={{ fontSize:32, fontWeight:800, color:COLORS.text }}>{curWeight}</span>
                          <span style={{ fontSize:15, color:COLORS.muted, fontWeight:500 }}>kg</span>
                        </div>
                        <div style={{ fontSize:13, fontWeight:600,
                          color: parseFloat(weightChange) < 0 && isLosing ? COLORS.success
                               : parseFloat(weightChange) > 0 && isLosing ? COLORS.warn
                               : COLORS.muted }}>
                          {parseFloat(weightChange) !== 0
                            ? `${weightChange > 0 ? "▲" : "▼"} ${Math.abs(weightChange)} kg`
                            : "No change yet"}
                        </div>
                      </div>
                      <div style={{ ...S.metricCard, display:"flex", flexDirection:"column", justifyContent:"center", gap:6, minHeight:120, padding:"14px 16px" }}>
                        <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, letterSpacing:0.5 }}>DAILY WATER</div>
                        <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
                          <span style={{ fontSize:32, fontWeight:800, color:COLORS.accent2 }}>{dailyWater}</span>
                          <span style={{ fontSize:14, color:COLORS.muted, fontWeight:500 }}>L / day</span>
                        </div>
                        <div style={{ display:"flex", gap:4, marginTop:2 }}>
                          {Array.from({ length:8 }).map((_,i) => (
                            <div key={i} style={{ width:9, height:9, borderRadius:"50%",
                              background: i < Math.round(dailyWater) ? COLORS.accent2 : dotEmpty }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Calorie Balance Card ── */}
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const eaten = (foodLogs||[]).filter(l=>l.logged_date===todayStr&&l.meal_type!=="Water").reduce((s,l)=>s+(l.calories||0),0);
                const burned = (calorieBurns||[]).filter(l=>l.logged_date===todayStr).reduce((s,b)=>s+(b.calories_burned||0),0);
                const bmr0 = (profile.weight&&profile.height&&profile.age)?calcBMR(+profile.weight,+profile.height,+profile.age,profile.gender||"Male"):1800;
                const actMult = profile.fitnessLevel==="Active"?1.55:profile.fitnessLevel==="Moderate"?1.375:1.2;
                const target = Math.round(bmr0*actMult) - (profile.goal?.toLowerCase().includes("lose")?500:0);
                const net = eaten - burned;
                const remaining = target - net;
                const netColor = remaining<0?COLORS.warn:remaining<200?COLORS.success:COLORS.accent;
                return (
                  <div style={{ ...S.metricCard, marginBottom:14, background:`${COLORS.accent3}0d`, border:`1px solid ${COLORS.accent3}33` }}>
                    <div style={{ fontFamily:FONTS.head, fontSize:13, fontWeight:700, color:COLORS.accent3, marginBottom:10 }}>🔥 Today's Calorie Balance</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, textAlign:"center" }}>
                      {[
                        { label:"Eaten",  val:eaten,     color:COLORS.warn,    icon:"🍽️" },
                        { label:"Burned", val:burned,    color:COLORS.success, icon:"💪" },
                        { label:"Net",    val:net,       color:netColor,       icon:"⚡" },
                        { label:"Left",   val:remaining, color:netColor,       icon:"🎯" },
                      ].map(({label,val,color,icon})=>(
                        <div key={label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 4px" }}>
                          <div style={{ fontSize:16 }}>{icon}</div>
                          <div style={{ fontSize:16, fontWeight:700, color }}>{val}</div>
                          <div style={{ fontSize:10, color:COLORS.muted, marginTop:2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop:10, height:6, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.min(100,Math.round(net/target*100))}%`, borderRadius:3,
                        background:net>target?COLORS.warn:`linear-gradient(90deg,${COLORS.accent3},${COLORS.accent})`, transition:"width 0.4s" }} />
                    </div>
                    <div style={{ fontSize:11, color:COLORS.muted, marginTop:4, textAlign:"right" }}>{Math.min(100,Math.round(net/target*100))}% of {target} kcal target</div>
                  </div>
                );
              })()}

              {/* ── Weekly Digest ── */}
              {(() => {
                const now = Date.now();
                const weekMs = 7*24*60*60*1000;
                const weekFood = (foodLogs||[]).filter(l=>l.meal_type!=="Water"&&now-new Date(l.logged_at||l.logged_date).getTime()<weekMs);
                const weekBurns = (calorieBurns||[]).filter(l=>now-new Date(l.logged_date).getTime()<weekMs);
                const weekSleep = (sleepLogs||[]).filter(l=>now-new Date(l.date).getTime()<weekMs);
                const weekLogs = (userLogs||[]).filter(l=>now-new Date(l.date).getTime()<weekMs);
                const dayCalMap = {};
                weekFood.forEach(l=>{ dayCalMap[l.logged_date]=(dayCalMap[l.logged_date]||0)+(l.calories||0); });
                const calDays = Object.values(dayCalMap);
                const avgCal = calDays.length ? Math.round(calDays.reduce((a,b)=>a+b,0)/calDays.length) : 0;
                const avgSleep = weekSleep.length ? +(weekSleep.reduce((s,l)=>s+(l.duration_hours||0),0)/weekSleep.length).toFixed(1) : 0;
                const totalBurned = weekBurns.reduce((s,b)=>s+(b.calories_burned||0),0);
                const weightDelta = weekLogs.length>=2 ? +(weekLogs[weekLogs.length-1].weight-weekLogs[0].weight).toFixed(1) : null;
                const bmr0 = (profile.weight&&profile.height&&profile.age)?calcBMR(+profile.weight,+profile.height,+profile.age,profile.gender||"Male"):1800;
                const actMult = profile.fitnessLevel==="Active"?1.55:profile.fitnessLevel==="Moderate"?1.375:1.2;
                const target = Math.round(bmr0*actMult)-(profile.goal?.toLowerCase().includes("lose")?500:0);
                const waterDays = [...new Set((foodLogs||[]).filter(l=>l.meal_type==="Water"&&now-new Date(l.logged_at||l.logged_date).getTime()<weekMs).map(l=>l.logged_date))].length;
                return (
                  <div style={{ ...S.metricCard, marginBottom:14, background:`${COLORS.accent2}0d`, border:`1px solid ${COLORS.accent2}33` }}>
                    <div style={{ fontFamily:FONTS.head, fontSize:13, fontWeight:700, color:COLORS.accent2, marginBottom:10 }}>📅 This Week</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:8 }}>
                      {[
                        { label:"Avg Calories", val:avgCal?`${avgCal} kcal`:"—", sub:avgCal&&target?`vs ${target} target`:"", color:avgCal>target?COLORS.warn:COLORS.success },
                        { label:"Total Burned", val:totalBurned?`${totalBurned} kcal`:"—", color:COLORS.accent3 },
                        { label:"Avg Sleep", val:avgSleep?`${avgSleep}h`:"—", sub:avgSleep>=7?"Good":"Low", color:avgSleep>=7?COLORS.success:COLORS.warn },
                        { label:"Water Days", val:`${waterDays}/7`, color:waterDays>=5?COLORS.success:COLORS.accent2 },
                        ...(weightDelta!==null?[{ label:"Weight Change", val:`${weightDelta>0?"+":""}${weightDelta} kg`, color:weightDelta<0&&profile.goal?.toLowerCase().includes("lose")?COLORS.success:weightDelta>0&&profile.goal?.toLowerCase().includes("lose")?COLORS.warn:COLORS.muted }]:[]),
                      ].map(({label,val,sub,color})=>(
                        <div key={label} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 10px" }}>
                          <div style={{ fontSize:10, color:COLORS.muted, fontWeight:700, marginBottom:4 }}>{label.toUpperCase()}</div>
                          <div style={{ fontSize:15, fontWeight:700, color }}>{val}</div>
                          {sub&&<div style={{ fontSize:10, color:COLORS.muted, marginTop:2 }}>{sub}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Log Weight Bar */}
              <div style={{ ...S.metricCard, marginBottom: "1rem", background: `${COLORS.accent}11`, border: `1px solid ${COLORS.accent}33` }}>
                <div style={{ fontFamily: FONTS.head, fontSize: 13, fontWeight: 700, color: COLORS.accent, marginBottom: 10 }}>
                  ⚖️ Log Today's Weight
                  {latestLog && <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.muted, marginLeft: 10 }}>Last: <b style={{ color: COLORS.text }}>{latestLog.weight} kg</b> · {latestLog.date}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["-0.5", "-0.1", "+0.1", "+0.5"].map(d => (
                      <button key={d} onClick={() => setLogForm(p => {
                        const base = parseFloat(p.weight) || parseFloat(latestLog?.weight) || 70;
                        return { ...p, weight: (base + parseFloat(d)).toFixed(1) };
                      })} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.card2, color: parseFloat(d) < 0 ? COLORS.warn : COLORS.success, fontSize: 12, fontWeight: 700, cursor: "pointer", minWidth: 44, textAlign: "center" }}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <input style={{ ...S.input, flex: 1, minWidth: 90, maxWidth: 130, padding: "8px 12px", textAlign: "center", fontSize: 16, fontWeight: 700 }}
                    type="number" step="0.1" placeholder="kg"
                    value={logForm.weight} onChange={e => setLogForm(p => ({ ...p, weight: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && logWeight()} />
                  <input style={{ ...S.input, flex: 2, minWidth: 120, padding: "8px 12px" }}
                    placeholder="Note (optional) — e.g. after workout"
                    value={logForm.note} onChange={e => setLogForm(p => ({ ...p, note: e.target.value }))} />
                  <button onClick={logWeight} disabled={!logForm.weight}
                    style={{ ...S.btn, width:"auto", padding:"9px 22px", fontSize:13, flexShrink:0,
                      opacity: logForm.weight ? 1 : 0.45, cursor: logForm.weight ? "pointer" : "not-allowed" }}>
                    ✓ Log
                  </button>
                </div>
              </div>

              {/* Greeting header */}
              {(() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
                const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
                return (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: FONTS.head, fontSize: 20, fontWeight: 700 }}>
                      {greeting}, {currentUser.name?.split(" ")[0]} 👋
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{today}</div>
                  </div>
                );
              })()}
              {/* Calorie summary + PDF Export */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                {metrics && (() => {
                  const actMult = profile.fitnessLevel === "Active" ? 1.55 : profile.fitnessLevel === "Moderate" ? 1.375 : 1.2;
                  const tdee = Math.round(metrics.bmr * actMult);
                  const isLose = profile.goal?.toLowerCase().includes("lose");
                  const target = isLose ? tdee - 500 : tdee;
                  return (
                    <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
                      {[
                        { label: "Calorie Target", val: `${target} kcal`, color: COLORS.accent, tip: isLose ? "500 kcal deficit" : "maintenance" },
                        { label: "Protein Goal", val: `${metrics.protein}g`, color: COLORS.accent2, tip: "1.6g per kg" },
                        { label: "Water Goal", val: `${dailyWater}L`, color: COLORS.accent2, tip: "33ml per kg" },
                      ].map(({ label, val, color, tip }) => (
                        <div key={label} style={{ background: `${color}12`, border: `1px solid ${color}30`, borderRadius: 10, padding: "8px 14px", flex: 1, minWidth: 100 }}>
                          <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 600 }}>{label.toUpperCase()}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color }}>{val}</div>
                          <div style={{ fontSize: 10, color: COLORS.muted }}>{tip}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <button onClick={() => exportTodayPDF(timeline, smartTimes, currentUser, dailyWater, profile)} style={{ background: `linear-gradient(135deg, ${COLORS.accent3}, ${COLORS.warn})`, border: "none", borderRadius: 10, padding: "9px 18px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONTS.body, display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
                  ⬇ PDF
                </button>
              </div>
              {/* Smart Meal Times Card */}
              <div style={{ ...S.metricCard, marginBottom: "1rem", background: `${COLORS.accent2}11`, border: `1px solid ${COLORS.accent2}33` }}>
                <div style={{ fontFamily: FONTS.head, fontSize: 15, fontWeight: 700, marginBottom: 12, color: COLORS.accent2 }}>Your Smart Meal Schedule</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                  {[
                    { label: "Breakfast", time: smartTimes.breakfast, icon: "🌅" },
                    { label: "Lunch", time: smartTimes.lunch, icon: "☀️" },
                    { label: "Snack", time: smartTimes.eveningSnack, icon: "🍎" },
                    { label: "Dinner", time: smartTimes.dinner, icon: "🌙" },
                    { label: "Daily Water", time: `${dailyWater} L`, icon: "💧" },
                    ...(smartTimes.preWorkout ? [{ label: "Pre-Workout", time: smartTimes.preWorkout, icon: "💪" }] : []),
                  ].map(({ label, time, icon }) => (
                    <div key={label} style={{ background: COLORS.card, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 2 }}>{label.toUpperCase()}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.accent2 }}>{time}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 10 }}>
                  Times calculated from your schedule · Wake: {smartTimes.wakeTime} · Sleep: {smartTimes.sleepTime}
                </div>
              </div>

              {/* Medical food alert */}
              <MedicalFoodAlert conditions={profile.conditions} COLORS={COLORS} />

              {/* Today's Meals from Meal Plan */}
              {(() => {
                const today = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
                const plan = profile.savedMealPlan;
                const todayPlan = plan && (plan[today] || (plan.meals && plan));
                if (!todayPlan) return (
                  <div style={{ ...S.metricCard, marginBottom:"1rem", textAlign:"center", padding:"1.5rem" }}>
                    <div style={{ fontSize:13, color:COLORS.muted }}>
                      🍽️ No meal plan yet — ask your admin to generate one for you
                    </div>
                  </div>
                );
                const meals = [
                  {key:"breakfast", label:"🌅 Breakfast", time:smartTimes?.breakfast||"8:00 AM"},
                  {key:"lunch",     label:"☀️ Lunch",     time:smartTimes?.lunch||"1:00 PM"},
                  {key:"eveningSnack", label:"🍎 Evening Snack", time:smartTimes?.eveningSnack||"5:00 PM"},
                  {key:"dinner",    label:"🌙 Dinner",    time:smartTimes?.dinner||"8:00 PM"},
                ];
                const now = new Date().getHours();
                const currentMeal = now < 10 ? "breakfast" : now < 14 ? "lunch" : now < 18 ? "eveningSnack" : "dinner";
                return (
                  <div style={{ ...S.metricCard, marginBottom:"1rem" }}>
                    <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:700, marginBottom:12 }}>
                      🍽️ Today&apos;s Meals — {today}
                    </div>
                    {meals.map(({key, label, time}) => {
                      const meal = todayPlan[key];
                      if (!meal) return null;
                      const items = meal.items || [];
                      const isCurrent = key === currentMeal;
                      return (
                        <div key={key} style={{ padding:"10px 12px", borderRadius:10, marginBottom:8,
                          background: isCurrent ? `${COLORS.accent}10` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isCurrent ? COLORS.accent+"44" : COLORS.border}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:isCurrent?COLORS.accent:COLORS.text }}>
                              {label} {isCurrent && <span style={{ fontSize:10, background:COLORS.accent+"22", color:COLORS.accent, padding:"1px 6px", borderRadius:10 }}>Now</span>}
                            </div>
                            <div style={{ fontSize:11, color:COLORS.muted }}>{time} · {meal.totalCal||0} kcal</div>
                          </div>
                          <div style={{ fontSize:12, color:COLORS.muted }}>
                            {items.slice(0,3).map(i=>i.food).filter(Boolean).join(", ")}
                            {items.length > 3 ? ` +${items.length-3} more` : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Full timeline */}
              <div style={{ fontFamily: FONTS.head, fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Hour-by-Hour Timeline</div>
              <TodayTimeline timeline={timeline} userId={currentUser.id} S={S} COLORS={COLORS} FONTS={FONTS} />

              {/* Interactive Water Tracker */}
              <WaterTracker dailyWater={dailyWater} userId={currentUser.id} waterTimes={smartTimes.waterTimes} S={S} COLORS={COLORS} FONTS={FONTS} />



              {/* Daily Wellness Tips */}
              {(() => {
                const tips = [
                  { icon: "🧘", title: "Mindful Eating", tip: "Put your fork down between bites. Eat slowly — it takes 20 mins for your brain to feel full." },
                  { icon: "🌙", title: "Sleep for Weight Loss", tip: "Poor sleep increases hunger hormones. Aim for 7–8 hours. Weight loss happens during deep sleep." },
                  { icon: "🚶", title: "Move After Meals", tip: "A 10-minute walk after eating reduces blood sugar spikes by up to 22% and aids digestion." },
                  { icon: "🍳", title: "Protein First", tip: "Start every meal with protein. It keeps you full longer and preserves muscle while losing fat." },
                  { icon: "💧", title: "Pre-Meal Water", tip: "Drink 500ml of water 30 minutes before meals. Studies show it reduces calorie intake by 13%." },
                  { icon: "📱", title: "Screen-Free Meals", tip: "Eating while watching screens leads to 25% more calories consumed. Focus on your food." },
                  { icon: "🥗", title: "Plate Method", tip: "Fill half your plate with vegetables, a quarter with protein, a quarter with complex carbs." },
                ];
                const dayTip = tips[new Date().getDay() % tips.length];
                return (
                  <div style={{ ...S.metricCard, marginTop: "1rem", background: `${COLORS.accent}0d`, border: `1px solid ${COLORS.accent}25` }}>
                    <div style={{ fontFamily: FONTS.head, fontSize: 14, fontWeight: 700, color: COLORS.accent, marginBottom: 10 }}>💡 Today's Wellness Tip</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{dayTip.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{dayTip.title}</div>
                        <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>{dayTip.tip}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Swaps */}
              {swaps.length > 0 && (
                <div style={{ ...S.metricCard, marginTop: "1rem" }}>
                  <div style={{ fontFamily: FONTS.head, fontSize: 15, fontWeight: 700, marginBottom: 10 }}>🔄 Healthy Swaps For You</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {swaps.slice(0, 6).map(({ from, to }) => (
                      <div key={from} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                        <span style={{ color: COLORS.warn, flex: 1 }}>❌ {from}</span>
                        <span style={{ color: COLORS.muted, fontSize: 18 }}>→</span>
                        <span style={{ color: COLORS.success, flex: 1 }}>✅ {to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* METRICS */}
          {dashTab === "metrics" && (
            <div key="tab-metrics" className="sf-tab-panel">
              <div style={{ fontFamily: FONTS.head, fontSize: 18, fontWeight: 700, marginBottom: "1rem" }}>Your Body Metrics</div>

              {/* BMI Gauge featured */}
              <div style={{ ...S.metricCard, marginBottom: 14, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", background: `${bmiCat?.color || COLORS.accent}0d`, border: `1px solid ${bmiCat?.color || COLORS.accent}33` }}>
                <div style={{ width: 140, flexShrink: 0 }}>
                  <BMIGauge bmi={metrics.bmi} color={bmiCat?.color || COLORS.success} label={bmiCat?.label || ""} />
                </div>
                <div>
                  <div style={{ fontFamily: FONTS.head, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                    BMI: {metrics.bmi} <span style={{ color: bmiCat?.color, fontSize: 14 }}>({bmiCat?.label})</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>
                    {metrics.bmi < 18.5 && "You are underweight. Focus on nutrient-dense foods and strength training to build muscle."}
                    {metrics.bmi >= 18.5 && metrics.bmi < 25 && "Your BMI is in the healthy range. Focus on maintaining this with balanced diet and regular exercise."}
                    {metrics.bmi >= 25 && metrics.bmi < 30 && "You are in the overweight range. Reducing 500 kcal/day and regular exercise can bring you to healthy range."}
                    {metrics.bmi >= 30 && "BMI indicates obesity. Consult your doctor. A structured plan with diet + exercise is recommended."}
                  </div>
                  {profile.targetWeight && (
                    <div style={{ marginTop: 8, fontSize: 12, color: COLORS.accent, background: `${COLORS.accent}15`, borderRadius: 8, padding: "6px 12px", display: "inline-block" }}>
                      🎯 At target weight {profile.targetWeight}kg, your BMI would be {calcBMI(parseFloat(profile.targetWeight), parseFloat(profile.height) || 170).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {metricItems.map(({ label, value, unit, color, sub }) => (
                  <div key={label} style={S.metricCard}>
                    <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}<span style={{ fontSize: 13, fontWeight: 400, color: COLORS.muted }}> {unit}</span></div>
                    {sub && <div style={{ fontSize: 12, color, marginTop: 2 }}>{sub}</div>}
                  </div>
                ))}
              </div>

              {/* Calorie targets */}
              {(() => {
                const bmr = metrics.bmr;
                const actMult = profile.fitnessLevel === "Active" ? 1.55 : profile.fitnessLevel === "Moderate" ? 1.375 : 1.2;
                const tdee = Math.round(bmr * actMult);
                const deficitCal = tdee - 500;
                const isLoseGoal = profile.goal?.toLowerCase().includes("lose");
                return (
                  <div style={{ ...S.metricCard, marginTop: 14, background: `${COLORS.success}09`, border: `1px solid ${COLORS.success}22` }}>
                    <div style={{ fontFamily: FONTS.head, fontSize: 13, fontWeight: 700, color: COLORS.success, marginBottom: 10 }}>🔥 Your Calorie Blueprint</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                      {[
                        { label: "BMR (at rest)", value: `${bmr} kcal`, tip: "Minimum to survive" },
                        { label: "TDEE (maintenance)", value: `${tdee} kcal`, tip: "To maintain weight" },
                        { label: isLoseGoal ? "Weight Loss Target" : "Your Target", value: `${isLoseGoal ? deficitCal : tdee} kcal`, tip: isLoseGoal ? "500 kcal deficit = ~0.5kg/week" : "To maintain current weight" },
                        { label: "Protein Target", value: `${metrics.protein}g/day`, tip: "To preserve muscle" },
                      ].map(({ label, value, tip }) => (
                        <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, marginBottom: 4 }}>{label.toUpperCase()}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.success }}>{value}</div>
                          <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* What the numbers mean */}
              <div style={{ ...S.metricCard, marginTop: 14, background: `${COLORS.accent2}09`, border: `1px solid ${COLORS.accent2}22` }}>
                <div style={{ fontFamily: FONTS.head, fontSize: 13, fontWeight: 700, color: COLORS.accent2, marginBottom: 10 }}>ℹ️ Understanding Your Metrics</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    ["BMR", "Calories your body burns at rest — your minimum daily need"],
                    ["Body Fat %", "Ideal: Men 10–20%, Women 18–28%"],
                    ["Visceral Fat", "Fat around organs. Keep under 9 for optimal health"],
                    ["Metabolic Age", "Lower than your real age = excellent metabolism"],
                    ["Muscle Mass", "Higher = better metabolism & strength"],
                    ["Body Water", "Men 50–65%, Women 45–60% is healthy"],
                  ].map(([term, def]) => (
                    <div key={term} style={{ fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: COLORS.accent2 }}>{term}: </span>
                      <span style={{ color: COLORS.muted }}>{def}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROGRESS */}
          {dashTab === "progress" && (() => {
            const streak = calcStreak(userLogs);
            const startW = firstLog?.weight || parseFloat(profile.weight) || 0;
            const curW = latestLog?.weight || parseFloat(profile.weight) || 0;
            const targetW = parseFloat(profile.targetWeight) || 0;
            const totalLost = +(startW - curW).toFixed(1);
            const daysLogged = userLogs.length;
            // Rate of loss per week
            const firstDate = firstLog ? new Date(firstLog.date) : null;
            const lastDate = latestLog ? new Date(latestLog.date) : null;
            const daysDiff = firstDate && lastDate ? Math.max(1, (lastDate - firstDate) / (1000*60*60*24)) : 1;
            const ratePerWeek = daysLogged > 1 ? +((totalLost / daysDiff) * 7).toFixed(2) : 0;
            // Estimated date to reach goal
            const toGoalKg = targetW ? +(curW - targetW).toFixed(1) : 0;
            const weeksLeft = ratePerWeek > 0 && toGoalKg > 0 ? Math.ceil(toGoalKg / ratePerWeek) : null;
            const estDate = weeksLeft ? new Date(Date.now() + weeksLeft * 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
            // Milestones
            const milestones = [
              { kg: 1, label: "First 1 kg", emoji: "🌱" },
              { kg: 3, label: "3 kg down", emoji: "⭐" },
              { kg: 5, label: "5 kg lost!", emoji: "🎯" },
              { kg: 10, label: "10 kg legend", emoji: "🏆" },
              { kg: 15, label: "15 kg warrior", emoji: "💎" },
            ];
            const achieved = milestones.filter(m => totalLost >= m.kg);
            const next = milestones.find(m => totalLost < m.kg);
            return (
              <div key="tab-progress" className="sf-tab-panel">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily: FONTS.head, fontSize: 18, fontWeight: 700 }}>Your Progress</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button onClick={() => {
                      const rows = [["Date","Weight (kg)","Note"],...userLogs.map(l=>[l.date,l.weight,l.note||""])];
                      const foodRows = [["Date","Meal","Food","Calories","Health"],
                        ...foodLogs.filter(l=>l.meal_type!=="Water").map(l=>[l.logged_date,l.meal_type,l.food_name,l.calories||0,l.health_status||""])];
                      const csv = [...rows.map(r=>r.join(",")),"","Food Log",...foodRows.map(r=>r.join(","))].join("\n");
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
                      a.download = `stayfit_export_${new Date().toISOString().split("T")[0]}.csv`;
                      a.click();
                    }} style={{ ...S.btnSm, background:`${COLORS.accent2}20`, border:`1px solid ${COLORS.accent2}44`, color:COLORS.accent2, borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                      ⬇ Export CSV
                    </button>
                    <PrintReportButton
                      currentUser={currentUser} profile={profile} metrics={metrics}
                      userLogs={userLogs} foodLogs={foodLogs} sleepLogs={sleepLogs}
                      calorieBurns={calorieBurns} COLORS={COLORS} FONTS={FONTS} S={S}
                    />
                  </div>
                </div>

                {/* Share with friend inside app */}
                <div style={{ ...S.metricCard, marginBottom:14, background:`${COLORS.accent2}08`, border:`1px solid ${COLORS.accent2}33` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700 }}>👥 Share with a Friend</div>
                      <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>Share your progress with friends inside the app</div>
                    </div>
                    <button onClick={() => setDashTab("friends")}
                      style={{ ...S.btn, width:"auto", padding:"8px 18px", fontSize:13 }}>
                      Go to Friends →
                    </button>
                  </div>
                </div>

                {/* Key stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Total Lost", value: `${totalLost > 0 ? "-" : ""}${Math.abs(totalLost)} kg`, color: totalLost > 0 ? COLORS.success : COLORS.muted, icon: "⚖️" },
                    { label: "Days Logged", value: daysLogged, color: COLORS.accent2, icon: "📅" },
                    { label: "Log Streak", value: `${streak}🔥`, color: COLORS.accent3, icon: "" },
                    { label: "Per Week", value: `${ratePerWeek > 0 ? "-" : ""}${Math.abs(ratePerWeek)} kg`, color: COLORS.accent, icon: "📉" },
                    ...(estDate ? [{ label: "Est. Goal Date", value: estDate, color: COLORS.success, icon: "🎯" }] : []),
                    ...(toGoalKg > 0 ? [{ label: "To Target", value: `${toGoalKg.toFixed(1)} kg`, color: COLORS.accent, icon: "🏁" }] : []),
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} style={S.metricCard}>
                      <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color }}>{icon} {value}</div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                {userLogs.length < 2 ? (
                  <div style={{ ...S.metricCard, textAlign:"center", padding:"2.5rem" }}>
                    <div style={{ fontSize:36, marginBottom:10 }}>📊</div>
                    <div style={{ fontSize:15, fontWeight:700, color:COLORS.text, marginBottom:6 }}>
                      {userLogs.length === 0 ? "No weight logged yet" : "Log one more day to see your chart"}
                    </div>
                    <div style={{ color:COLORS.muted, fontSize:13, marginBottom:16 }}>
                      {userLogs.length === 0
                        ? "Use the ⚖️ log bar above to record your weight daily. Charts and insights appear as you log."
                        : "Log your weight again tomorrow to unlock the progress chart and trend analysis."}
                    </div>
                  </div>
                ) : (
                  <div style={{ ...S.metricCard, marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontFamily: FONTS.head, fontSize: 14, fontWeight: 700 }}>Weight Chart</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{Math.min(30, userLogs.length)} most recent entries</div>
                    </div>
                    <SimpleLineChart data={userLogs.slice(-30)} color={COLORS.accent} targetWeight={targetW || null} />
                    {targetW > 0 && <div style={{ fontSize: 11, color: COLORS.success, marginTop: 6 }}>— — Target: {targetW} kg &nbsp;·&nbsp; <span style={{ color:"#f5c543" }}>- - Projection</span></div>}
                  </div>
                )}

                {/* Goal milestone celebration */}
                {achieved.length > 0 && (
                  <div style={{ ...S.metricCard, marginBottom:10,
                    background:`${COLORS.gold}0d`, border:`2px solid ${COLORS.gold}55`, textAlign:"center", padding:"20px 16px" }}>
                    <div style={{ fontSize:32, marginBottom:6 }}>🎉🏆🎉</div>
                    <div style={{ fontFamily:FONTS.head, fontSize:16, fontWeight:800, color:COLORS.gold, marginBottom:4 }}>
                      {achieved[achieved.length-1].emoji} {achieved[achieved.length-1].label} — Achieved!
                    </div>
                    <div style={{ fontSize:13, color:COLORS.muted }}>
                      You've lost <b style={{color:COLORS.success}}>{totalLost.toFixed(1)} kg</b> — incredible progress! Keep going! 🚀
                    </div>
                  </div>
                )}

                {/* Milestone celebration banner */}
                {achieved.length > 0 && (
                  <div style={{ ...S.metricCard, marginBottom:12, background:`${COLORS.gold}0d`,
                    border:`2px solid ${COLORS.gold}55`, textAlign:"center", padding:"18px 16px" }}>
                    <div style={{ fontSize:32, marginBottom:6 }}>🎉🏆🎉</div>
                    <div style={{ fontFamily:FONTS.head, fontSize:15, fontWeight:800, color:COLORS.gold, marginBottom:4 }}>
                      {achieved[achieved.length-1].emoji} {achieved[achieved.length-1].label} — Achieved!
                    </div>
                    <div style={{ fontSize:13, color:COLORS.muted }}>
                      You've lost <b style={{color:COLORS.success}}>{totalLost.toFixed(1)} kg</b> — incredible progress! Keep going! 🚀
                    </div>
                  </div>
                )}

                {/* Milestones */}
                <div style={{ ...S.metricCard, marginBottom: 14 }}>
                  <div style={{ fontFamily: FONTS.head, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏅 Milestones</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {milestones.map(m => {
                      const done = totalLost >= m.kg;
                      return (
                        <div key={m.kg} style={{ padding: "8px 14px", borderRadius: 20, background: done ? `${COLORS.success}22` : "rgba(255,255,255,0.05)", border: `1px solid ${done ? COLORS.success + "55" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 16, filter: done ? "none" : "grayscale(1) opacity(0.4)" }}>{m.emoji}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: done ? COLORS.success : COLORS.muted }}>{m.label}</div>
                            {!done && <div style={{ fontSize: 10, color: COLORS.muted }}>{(m.kg - totalLost).toFixed(1)} kg away</div>}
                            {done && <div style={{ fontSize: 10, color: COLORS.success }}>✓ Achieved!</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {next && <div style={{ fontSize: 12, color: COLORS.accent, background: `${COLORS.accent}15`, borderRadius: 8, padding: "8px 12px" }}>
                    🎯 Next milestone: <b>{next.emoji} {next.label}</b> — only {(next.kg - totalLost).toFixed(1)} kg away!
                  </div>}
                </div>

                {/* Calorie Intake Chart */}
                {foodLogs && foodLogs.length > 0 && (() => {
                  const actMult2 = profile.fitnessLevel === "Active" ? 1.55 : profile.fitnessLevel === "Moderate" ? 1.375 : 1.2;
                  const bmrVal = metrics ? metrics.bmr : 1800;
                  const tdee2 = Math.round(bmrVal * actMult2);
                  const isLose2 = profile.goal?.toLowerCase().includes("lose");
                  const targetCal2 = isLose2 ? tdee2 - 500 : tdee2;

                  // Build last 14 days of calorie data
                  const days14 = Array.from({length:14}, (_, i) => {
                    const d = new Date(); d.setDate(d.getDate() - (13 - i));
                    return d.toISOString().split("T")[0];
                  });
                  const calByDay = days14.map(date => {
                    const dayLogs = foodLogs.filter(l => l.logged_date === date);
                    const total = dayLogs.reduce((s,l) => s+(l.calories||0), 0);
                    const d = new Date(date);
                    const label = d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}).replace(" ","<br/>");
                    return { date, total, label: d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) };
                  });

                  const loggedDays = calByDay.filter(d => d.total > 0);
                  if (loggedDays.length === 0) return null;

                  const avgCal = Math.round(loggedDays.reduce((s,d)=>s+d.total,0)/loggedDays.length);
                  const overDays = loggedDays.filter(d => d.total > targetCal2).length;
                  const underDays = loggedDays.filter(d => d.total > 0 && d.total < targetCal2*0.7).length;

                  return (
                    <div style={{ ...S.metricCard, marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                        <div style={{ fontFamily:FONTS.head, fontSize:14, fontWeight:700 }}>🍱 Calorie Intake (Last 14 Days)</div>
                        <div style={{ display:"flex", gap:10, fontSize:12 }}>
                          <span style={{ color:COLORS.muted }}>Avg: <b style={{color:COLORS.accent}}>{avgCal} kcal</b></span>
                          {overDays > 0 && <span style={{ color:COLORS.warn }}>{overDays} day{overDays>1?"s":""} over target</span>}
                          {underDays > 0 && <span style={{ color:COLORS.accent2 }}>{underDays} day{underDays>1?"s":""} under 70%</span>}
                        </div>
                      </div>
                      <CalorieBarChart data={calByDay} targetCal={targetCal2} COLORS={COLORS} FONTS={FONTS} />
                      <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:6, fontSize:11 }}>
                        <span style={{ color:COLORS.success }}>■ On target</span>
                        <span style={{ color:COLORS.warn }}>■ Over target</span>
                        <span style={{ color:COLORS.accent }}>■ Under target</span>
                        <span style={{ color:COLORS.success }}>- - Target line</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Recent logs */}
                <div style={S.metricCard}>
                  <div style={{ fontFamily: FONTS.head, fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Recent Logs</div>
                  {userLogs.slice(-10).reverse().map((l, i, arr) => {
                    const prev = arr[i + 1];
                    const diff = prev ? +(l.weight - prev.weight).toFixed(1) : null;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                        <div style={{ fontSize: 13, color: COLORS.muted, minWidth: 90 }}>{l.date}</div>
                        <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{l.weight} kg</div>
                        {diff !== null && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: diff < 0 ? COLORS.success : diff > 0 ? COLORS.warn : COLORS.muted, minWidth: 60 }}>
                            {diff < 0 ? "▼" : diff > 0 ? "▲" : "—"} {Math.abs(diff)} kg
                          </div>
                        )}
                        {l.note && <div style={{ fontSize: 11, color: COLORS.muted, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.note}</div>}
                        <button onClick={async () => {
                          if (!window.confirm("Delete this log entry?")) return;
                          (async () => {
                              const wlSnap = await getDocs(collection(db, "weight_logs"));
                              const toDelete = wlSnap.docs.find(d => d.data().user_id === currentUser.id &&
                                (d.data().logged_at === (l.ts ? new Date(l.ts).toISOString() : l.date) || d.data().logged_at?.startsWith(l.date || "")));
                              if (toDelete) await deleteDoc(doc(db, "weight_logs", toDelete.id));
                            })();
                          await loadLogs(currentUser.id);
                          notify("Log entry deleted.");
                        }} style={{ background: "transparent", border: "none", color: `${COLORS.warn}88`, cursor: "pointer", fontSize: 14, padding: "2px 4px", flexShrink: 0 }} title="Delete this entry">
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* WORKOUT */}
          {dashTab === "workout" && (
            <div key="tab-workout" className="sf-tab-panel">
              <div style={{ fontFamily: FONTS.head, fontSize: 18, fontWeight: 700, marginBottom: "0.5rem" }}>Your Workout Plan</div>
              <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: "1rem" }}>
                {workout.type === "Gym" ? "Weight training split — no cardio" : workout.type === "Home" ? "Bodyweight training split — no equipment needed" : "Outdoor training plan"} · {workout.freq}
              </div>
              {/* Medical workout warnings */}
              {(workout.medicalWarnings || []).length > 0 && (
                <div style={{ background: "#1a0a1a", border: "1px solid #f7504f55", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#f7504f", marginBottom: 8 }}>⚠️ Workout Adjustments for Your Medical Conditions</div>
                  {workout.medicalWarnings.map(({ condition, warning }) => (
                    <div key={condition} style={{ marginBottom: 6, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: "#f7934f" }}>{condition}: </span>
                      <span style={{ color: "#f0f4ff" }}>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Home environment tip */}
              {workout.type === "Home" && (
                <div style={{ background: "#001a12", border: "1px solid #00d4aa44", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#00d4aa", marginBottom: 6 }}>🏠 Home Workout Tips</div>
                  <div style={{ fontSize: 12, color: "#f0f4ff", lineHeight: 1.7 }}>
                    • No equipment needed — use bodyweight &amp; household items<br/>
                    • Use a yoga mat or carpet for floor exercises<br/>
                    • Chair &amp; wall for support during beginners exercises<br/>
                    • Keep phone nearby for timer &amp; form videos<br/>
                    • Warm up 5 min before and stretch 5 min after every session
                  </div>
                </div>
              )}

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: "1rem" }}>
                {[
                  ["Session Duration", `${workout.duration} min`, COLORS.accent],
                  ["Intensity", workout.intensity, COLORS.accent2],
                  ["Cal Burn/session", `~${workout.burn} kcal`, COLORS.accent3],
                  ["Frequency", workout.freq, COLORS.success],
                  ["Type", workout.type, COLORS.accent],
                ].map(([l, v, c]) => (
                  <div key={l} style={S.metricCard}>
                    <div style={{ fontSize: 10, color: COLORS.muted, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{l.toUpperCase()}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Weekly Schedule — click workout day to expand exercises */}
              <WeeklyScheduleExpand workout={workout} S={S} COLORS={COLORS} FONTS={FONTS} />

              {/* Rest Timer */}
              <RestTimer S={S} COLORS={COLORS} FONTS={FONTS} userId={currentUser.id} onCalorieSaved={() => loadCalorieBurns(currentUser.id)} />

              <div style={{ ...S.metricCard, background: `${COLORS.accent}0d`, border: `1px solid ${COLORS.accent}22` }}>
                <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.8 }}>
                  Based on: <b style={{ color: COLORS.text }}>{profile.weight}kg · Age {profile.age} · {profile.gender} · {profile.fitnessLevel} level</b><br />
                  Best time: <b style={{ color: COLORS.accent }}>{schedule.find(s => s.label.toLowerCase().includes("gym") || s.label.toLowerCase().includes("workout"))?.time || "Set a gym/workout slot in your schedule"}</b>
                  {workout.type === "Gym" && <><br /><span style={{ color: COLORS.accent2 }}>💡 Rest 60–90 seconds between sets for hypertrophy. Stay hydrated.</span></>}
                  {workout.type === "Home" && <><br /><span style={{ color: COLORS.success }}>🏠 Home training: no gym needed. Use chair for dips, wall for support. Consistency beats equipment!</span></>}
                  {workout.type === "Outdoor" && <><br /><span style={{ color: COLORS.accent3 }}>🌿 Outdoor training: warm up with a 5-min walk. Cool down with stretches after each session.</span></>}
                </div>
              </div>
            </div>
          )}

          {/* MEALS */}
          {dashTab === "meals" && (
            <MealPlanTabWrapper
              currentUser={currentUser} profile={profile} metrics={metrics}
              smartTimes={smartTimes} likedFoods={likedFoods} dailyWater={dailyWater}
              COLORS={COLORS} S={S} fetchLatestProfile={fetchLatestProfile}
              setCurrentUser={setCurrentUser}
            />
          )}

          {/* SETTINGS */}

          {/* ════════════════════════════════════════════════════════════
              FOOD SCORE TAB
              ════════════════════════════════════════════════════════════ */}
          {dashTab === "logs" && (
            <LogsWrapper
              userId={currentUser.id} userLogs={userLogs}
              foodLogs={foodLogs} sleepLogs={sleepLogs} calorieBurns={calorieBurns}
              profile={profile}
              onBurnSaved={() => loadCalorieBurns(currentUser.id)}
              onSaved={() => loadSleepLogs(currentUser.id)}
              onFoodSaved={(entry) => {
                mergeFoodLogEntry(entry);
                loadFoodLogs(currentUser.id);
              }}
              COLORS={COLORS} FONTS={FONTS} S={S}
            />
          )}

          {dashTab === "steps" && (
            <div key="tab-steps" className="sf-tab-panel">
              <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>👟 Step Counter</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Auto-tracks your steps using your phone's motion sensor</div>
              <StepCounter userId={currentUser.id} COLORS={COLORS} FONTS={FONTS} S={S} />
            </div>
          )}



          {dashTab === "insights" && (
            <div key="tab-insights" className="sf-tab-panel">
              <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>🤖 AI Insights</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Personalised health analysis powered by AI</div>
              <AIHealthInsights
                currentUser={currentUser} profile={profile} metrics={metrics}
                userLogs={userLogs} foodLogs={foodLogs} sleepLogs={sleepLogs}
                calorieBurns={calorieBurns} COLORS={COLORS} FONTS={FONTS} S={S} />
              <AchievementBadges userLogs={userLogs} foodLogs={foodLogs}
                sleepLogs={sleepLogs} calorieBurns={calorieBurns} COLORS={COLORS} FONTS={FONTS} S={S} />
              <CorrelationGraphs userLogs={userLogs} sleepLogs={sleepLogs}
                calorieBurns={calorieBurns} foodLogs={foodLogs} COLORS={COLORS} FONTS={FONTS} S={S} />
            </div>
          )}

          {dashTab === "friends" && (
            <FriendsTab currentUser={currentUser} userLogs={userLogs} foodLogs={foodLogs}
              sleepLogs={sleepLogs} calorieBurns={calorieBurns} metrics={metrics}
              COLORS={COLORS} FONTS={FONTS} S={S} notify={notify} />
          )}

          {dashTab === "challenges" && (
            <div key="tab-challenges" className="sf-tab-panel">
              <div style={{ fontFamily:FONTS.head, fontSize:20, fontWeight:700, marginBottom:4 }}>🏆 Challenges</div>
              <div style={{ fontSize:13, color:COLORS.muted, marginBottom:16 }}>
                Compete with others in your weight loss journey
              </div>
              <UserCompetitions
                userId={currentUser.id}
                userName={currentUser.name}
                currentWeight={parseFloat(profile.weight) || (latestLog?.weight) || 70}
                userLogs={userLogs}
                COLORS={COLORS} S={S} FONTS={FONTS}
                notify={notify}
              />
            </div>
          )}

          {dashTab === "foodscore" && (
            <FoodScoreWrapper likedFoods={likedFoods}
              conditions={profile.conditions || []}
              S={S} COLORS={COLORS} FONTS={FONTS}
              onGoToSettings={() => setDashTab("settings")} />
          )}

          {dashTab === "settings" && (
            <div key="tab-settings" className="sf-tab-panel">
            <SettingsPanel
              currentUser={currentUser} users={allUsers} setUsers={setAllUsers}
              setCurrentUser={setCurrentUser} scheduleSlots={scheduleSlots}
              setScheduleSlots={setScheduleSlots} selectedFoods={selectedFoods}
              setSelectedFoods={setSelectedFoods} activeMealTab={activeMealTab}
              setActiveMealTab={setActiveMealTab} notify={notify} S={S} COLORS={COLORS}
              themeMode={themeMode} setThemeMode={setThemeMode}
              onSaved={() => setDashTab("today")}
            />
            </div>
          )}

          <div style={{ height:80 }} />

          {/* Bottom nav + More drawer */}
          <div style={S.bottomNav}>
            {[["today","📅","Today"],["metrics","📊","Metrics"],["meals","🍽️","Meals"],["logs","📋","Logs"],["progress","📈","Progress"]].map(([k,ic,lb]) => (
              <button key={k} onClick={() => { setDashTab(k); setShowMoreMenu(false); }}
                style={{ flex:1, background:"none", border:"none", padding:"8px 2px 6px",
                  cursor:"pointer", display:"flex", flexDirection:"column",
                  alignItems:"center", gap:2,
                  color: dashTab===k ? COLORS.accent : COLORS.muted,
                  fontSize:10, fontFamily:FONTS.body }}>
                <span style={{ fontSize:22, lineHeight:1.1 }}>{ic}</span>
                <span>{lb}</span>
              </button>
            ))}
            <button onClick={() => setShowMoreMenu(m=>!m)}
              style={{ flex:1, background:"none", border:"none", padding:"8px 2px 6px",
                cursor:"pointer", display:"flex", flexDirection:"column",
                alignItems:"center", gap:2,
                color: ["steps","insights","workout","challenges","friends","foodscore","settings"].includes(dashTab) ? COLORS.accent : COLORS.muted,
                fontSize:10, fontFamily:FONTS.body }}>
              <span style={{ fontSize:22, lineHeight:1.1 }}>⋯</span>
              <span>More</span>
            </button>
          </div>

          {showMoreMenu && <>
            <div onClick={() => setShowMoreMenu(false)}
              style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1001 }} />
            <div style={S.drawer}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontFamily:FONTS.head, fontWeight:700, fontSize:15, color:COLORS.text }}>More</div>
                <button onClick={() => setShowMoreMenu(false)}
                  style={{ ...S.btnSm, borderRadius:20, padding:"4px 14px" }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                {[["steps","👟","Steps"],["insights","🤖","AI Insights"],["workout","💪","Workout"],
                  ["challenges","🏆","Challenges"],["friends","👥","Friends"],
                  ["foodscore","🥗","Food Score"],["settings","⚙️","Preferences"]].map(([k,ic,lb]) => (
                  <button key={k} onClick={() => { setDashTab(k); setShowMoreMenu(false); }}
                    style={{ background:dashTab===k?`${COLORS.accent}18`:isDark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.5)",
                      border:`1px solid ${dashTab===k?COLORS.accent+"44":COLORS.border}`,
                      borderRadius:12, padding:"12px 4px", cursor:"pointer",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:26 }}>{ic}</span>
                    <span style={{ fontSize:10, color:dashTab===k?COLORS.accent:COLORS.muted,
                      fontWeight:dashTab===k?700:400, textAlign:"center", lineHeight:1.3 }}>{lb}</span>
                  </button>
                ))}
              </div>
            </div>
          </>}

        <FeedbackButton currentUser={currentUser} notify={notify}
          COLORS={COLORS} FONTS={FONTS} S={S} />
      </div>
    </div>
    );
  }

  // ── ADMIN ──
  if (screen === "admin" && currentUser?.role === "admin") {
    const adminUsers = allUsers.filter(u => u.role !== "admin").map(u => ({ ...u, logs: [] }));
    return (
      <div style={S.app}>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(99,130,191,0.25); border-radius: 2px; }
          input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }
          select option { background: #0e1628; color: #eef2ff; }
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
          .fade-in { animation: fadeIn 0.35s ease forwards; }
        `}</style>
        {notification && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, maxWidth: 320,
            background: notification.startsWith("⚠") || notification.startsWith("Error") ? COLORS.warn :
                        notification.startsWith("✓") || notification.toLowerCase().includes("saved") || notification.toLowerCase().includes("success") ? COLORS.success :
                        COLORS.accent,
            color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", gap: 10,
            animation: "slideIn 0.3s ease",
          }}>
            <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
            {notification}
          </div>
        )}
        <nav style={{ ...S.nav }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <img src={LOGO_SRC} alt="VitaTrack" style={{ height:32, width:"auto", objectFit:"contain" }} />
            <div style={{ fontFamily:FONTS.head, fontSize:17, fontWeight:700,
              background:`linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Admin Panel
            </div>
            {adminUsers.filter(u => u.approved === false).length > 0 && (
              <div style={{ background:COLORS.warn, color:"#fff", borderRadius:20,
                padding:"2px 10px", fontSize:11, fontWeight:700,
                animation:"pulse 2s infinite" }}>
                ⏳ {adminUsers.filter(u => u.approved === false).length} pending
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button style={{ ...S.btnSm, color:COLORS.accent2, borderColor:`${COLORS.accent2}44` }}
              onClick={() => setScreen("dashboard")}>
              👤 User View
            </button>
            <button style={S.btnSm} onClick={() => { if(window.confirm("Sign out of VitaTrack?")) logout(); }}>
              Sign Out
            </button>
          </div>
        </nav>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"12px 12px", width:"100%" }}>
          {/* Admin Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
            {[
              { label: "Total Users", value: adminUsers.length, color: COLORS.accent, icon: "👥" },
              { label: "Active", value: adminUsers.filter(u => u.active && u.approved !== false).length, color: COLORS.success, icon: "✅" },
              { label: "With Profile", value: adminUsers.filter(u => u.profile_data?.weight).length, color: COLORS.accent2, icon: "📋" },
              { label: "With Meal Plan", value: adminUsers.filter(u => u.profile_data?.savedMealPlan).length, color: COLORS.accent3, icon: "🍽️" },
              { label: "Pending", value: adminUsers.filter(u => u.approved === false).length, color: COLORS.warn, icon: "⏳" },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ ...S.metricCard, borderLeft: `3px solid ${color}` }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color }}>{icon} {value}</div>
              </div>
            ))}
          </div>

          {/* Users who need attention */}
          {(() => {
            const noProfile = adminUsers.filter(u => u.active && u.approved !== false && !u.profile_data?.weight);
            const noMealPlan = adminUsers.filter(u => u.active && u.approved !== false && u.profile_data?.weight && !u.profile_data?.savedMealPlan);
            if (noProfile.length === 0 && noMealPlan.length === 0) return null;
            return (
              <div style={{ ...S.metricCard, marginBottom: "1.5rem", background: `${COLORS.accent3}0d`, border: `1px solid ${COLORS.accent3}33` }}>
                <div style={{ fontFamily: FONTS.head, fontSize: 14, fontWeight: 700, color: COLORS.accent3, marginBottom: 10 }}>⚡ Action Required</div>
                {noProfile.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 4 }}>No profile yet ({noProfile.length}):</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {noProfile.map(u => <span key={u.id} style={{ fontSize: 11, padding: "2px 8px", background: "rgba(255,255,255,0.08)", borderRadius: 20, color: COLORS.text }}>{u.name}</span>)}
                    </div>
                  </div>
                )}
                {noMealPlan.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 4 }}>No meal plan generated ({noMealPlan.length}):</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {noMealPlan.map(u => <span key={u.id} style={{ fontSize: 11, padding: "2px 8px", background: `${COLORS.accent3}22`, borderRadius: 20, color: COLORS.accent3, fontWeight: 600 }}>{u.name}</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Pending approvals */}
          {adminUsers.filter(u => u.approved === false).length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontFamily: FONTS.head, fontSize: 16, fontWeight: 700, marginBottom: "0.75rem", color: COLORS.warn }}>
                ⏳ Pending Approval ({adminUsers.filter(u => u.approved === false).length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {adminUsers.filter(u => u.approved === false).map(u => (
                  <div key={u.id} style={{ ...S.metricCard, border: `1px solid ${COLORS.warn}44`, background: `${COLORS.warn}08` }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${COLORS.warn}22`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.warn, fontWeight: 700, flexShrink: 0 }}>{(u.name || "U")[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted }}>@{u.username} · {u.country || "—"}{u.state ? `, ${u.state}` : ""} · {u.created_at?.split("T")[0]}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => approveUser(u.id)} style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`, border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONTS.body }}>✓ Approve</button>
                        <button onClick={() => rejectUser(u.id)} style={{ ...S.btnDanger, padding: "8px 16px" }}>✗ Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* All approved users with search */}
          <AdminPanel
            adminUsers={adminUsers} deleteUser={deleteUser} enableUser={enableUser}
            approveUser={approveUser} rejectUser={rejectUser}
            changeUserPassword={changeUserPassword} COLORS={COLORS} S={S} FONTS={FONTS}
            allFoodLogs={allFoodLogs} currentUserId={currentUser.id} notify={notify}
          />
        </div>
      </div>
    );
  }
  return null;
}


// ── FeedbackButton — floating feedback widget ─────────────────────────────────



// ── BroadcastHistory — shows past broadcasts in admin ────────────────────────
// ── HealthReportPrint — full health report for print/PDF ─────────────────────
export default App;
