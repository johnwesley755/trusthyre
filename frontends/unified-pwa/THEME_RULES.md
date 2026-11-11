# 🎨 TrustHyre Frontend Theme Architecture & Development Rules
> **Mandatory Guidelines for all Present & Future TrustHyre UI Components**

---

## 1. Core Philosophy & Theme Modes

TrustHyre features a tri-state theme system engineered for high-performance blue-collar and recruiter environments:
1. **Light Theme (`light`) — Default**:
   - Clean, high-legibility canvas (`#F8FAFC`).
   - Pure white content cards (`#FFFFFF`).
   - Deep Trust Navy typography (`#0A1931`).
   - Crisp slate borders (`#E2E8F0`).
2. **Pitch Dark Black Theme (`dark`) — True OLED Black**:
   - Canvas background is **pure OLED black (`#000000`)** to minimize battery drain on mobile OLED screens and provide maximum contrast.
   - Cards & surfaces are deep charcoal (`#0a0a0a`).
   - Elevated popovers/modals are `#141414`.
   - Structural borders are subtle zinc (`#27272a` / `#18181b`).
   - Primary text is crisp white (`#FFFFFF`).
   - Accents pop with high vibrancy: Trust Blue (`#0066FF`), Cyan/Sky (`#38BDF8`), Emerald (`#10B981`).
   - **Never use muddy mid-gray backgrounds (like `#334155` or `#1e293b`) for primary app surfaces.**
3. **System Theme (`system`)**:
   - Synchronizes automatically with the operating system's `prefers-color-scheme`.
   - Listens dynamically to real-time OS theme toggle events without requiring a page reload.

---

## 2. Mandatory Rules for New & Modified Components

Whenever you create a new component or edit an existing one in `frontends/unified-pwa`, follow these strict rules:

### Rule 1: Always Pair Light & Dark Color Classes
Every background, text, and border utility that specifies a light-theme color **MUST** provide an accompanying `dark:` variant.

```tsx
// ❌ BAD: Hardcoded light theme (looks broken when dark mode is toggled)
<div className="bg-white text-[#0A1931] border border-slate-200">

// ❌ BAD: Muddy dark gray styling
<div className="bg-white dark:bg-slate-800 text-black dark:text-slate-300">

// ✅ CORRECT: Luxury Pitch Dark Black pairing
<div className="bg-white dark:bg-[#0a0a0a] text-[#0A1931] dark:text-white border border-slate-200/90 dark:border-zinc-800/80">
```

---

### Rule 2: Follow the Surface Depth Scale

In Pitch Dark Black mode, elevation is expressed through **subtle surface steps and crisp border lines**, NOT heavy box-shadows (which are invisible on black).

| Elevation Layer | Light Theme | Pitch Dark Black Theme | Component Types |
| :--- | :--- | :--- | :--- |
| **Layer 0 (Canvas)** | `bg-[#F8FAFC]` | `dark:bg-[#000000]` | AppLayout, full-page backgrounds |
| **Layer 1 (Card/Section)** | `bg-white` | `dark:bg-[#0a0a0a]` | Content cards, form sections, table bodies |
| **Layer 2 (Elevated UI)** | `bg-white` | `dark:bg-[#141414]` | Popovers, dropdown menus, modals, tooltips |
| **Layer 3 (Hover/Active)** | `hover:bg-slate-50` | `dark:hover:bg-[#1f1f1f]` | Clickable rows, item highlights |
| **Subtle Ribbon/Header** | `bg-[#f1f5f9]` | `dark:bg-[#111111]` | Table headers, chip backgrounds |

---

### Rule 3: Typography Contrast Scale

Ensure WCAG AAA/AA readability across both themes:

| Text Level | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | `text-[#0A1931]` or `text-slate-900` | `dark:text-white` | Page titles, job titles, headings |
| **Secondary**| `text-slate-600` | `dark:text-zinc-400` | Body copy, requirements, addresses |
| **Muted**    | `text-slate-400` | `dark:text-zinc-500` | Helper text, timestamps, captions |
| **Accent**   | `text-[#0066FF]` | `dark:text-[#38BDF8]` | Links, trade keywords, verified badges |

---

### Rule 4: Form Controls & Inputs

All input elements (`input`, `textarea`, `select`, `dropdown`) must retain crisp focus rings and readable placeholders:

```tsx
<input 
  className="w-full bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-[#0066FF] dark:focus:border-[#38BDF8] outline-none transition-colors"
/>
```

---

### Rule 5: Accessing the Theme Context

When programmatic access to the theme state is required (e.g. rendering charts, map layers, or custom SVG icons):

```tsx
import { useTheme } from '@/providers/ThemeContext';

export function ExampleComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme} (Active: {resolvedTheme})</p>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

---

### Rule 6: Testing & Quality Checklist

Before submitting any component changes:
- [ ] **Default Light Check**: Does the page render in crisp light theme when `localStorage` has no theme set?
- [ ] **Pitch Dark Check**: Does the page switch cleanly to `#000000` / `#0a0a0a` without any orphaned white boxes or invisible text?
- [ ] **Borders**: Are all dividing lines visible in dark mode (`border-zinc-800` or `border-white/10`)?
- [ ] **Icons**: Are icons given `text-slate-500 dark:text-zinc-400` or explicit theme-aware colors rather than default black?
- [ ] **Modals & Portals**: Do floating modals and dropdowns have `dark:bg-[#0a0a0a]` or `dark:bg-[#141414]`?
- [ ] **Build Validation**: Does `npm run build` pass with 0 TypeScript/CSS compilation errors?

