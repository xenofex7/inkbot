# Design System - inkbot

> Design system for inkbot, the browser app for the VigoTec VG-X4 pen plotter. Started from the Petrol baseline in `claude-stuff` (`/design`): structure and token names come from there, colours, examples and components are rewritten for inkbot.
>
> **For codegen and audits:** the machine-readable token layer is the JSONC block under `## Tokens (machine-readable)`. Codegen prompts and `/audit-design` read that block (deterministic), not the prose. The living styleguide `design.html` is derived from it.

## Overview

inkbot is a tool, not a marketing site: connect the plotter, set text or load an SVG, check the preview, draw. The interface is warm and analog - a paper canvas (`{colors.canvas}` = #faf8f0) with ink-coloured primary actions (`{colors.primary}` = #363d52) and the platform's **system typeface**. The palette comes from the brand illustration (`assets/logo.png`): paper, ink, the robot's steel, sealing-wax red and the wooden desk.

The accent voice is **Steel** - a 7-step scale from the robot's tin body, carrying links, focus rings, scrollbars and the dark surfaces. Steel never appears on primary actions (those stay ink) - it lives at the accent layer. Red (`{colors.seal}`) is reserved for two meanings only: something is wrong, or ink is flowing (pen down, job running).

The sheet of paper is the centre of the app. Previews show the drawing on a paper-coloured sheet in the real format (A4, A5, A6, envelopes), so what you see is what the pen will draw.

**Key Characteristics:**
- Paper canvas with ink primary action (`{colors.primary}` = #363d52). Buttons are `{rounded.md}` (8px) with weight-600 labels.
- **System typeface** in two roles: Display (600, negative letter-spacing) for headlines, Body for everything else. No webfont yet (see `Known Gaps`).
- Paper-tinted surfaces (`{colors.surface-card}` - #f3f0da) only where a container has a reason: the sheet preview, a saved job, a settings group.
- Machine state is always visible: connection, pen up/down and job progress use `{component.badge-pill}` and never rely on colour alone.
- Nav-pill-group (`{component.nav-pill-group}`) switches the source: Text, SVG, Image.
- The dark surface (`{colors.surface-dark}` - #23283a, night ink) closes the start page as footer and carries the optional dark theme.
- Border radius is hierarchical: `{rounded.md}` (8px) for buttons + inputs, `{rounded.lg}` (12px) for cards, `{rounded.xl}` (16px) for the job card, `{rounded.pill}` for nav-pill-group + badges, `{rounded.full}` for icon buttons.

## Design Principles

Every decision further down traces back to one of these. Where the project needs to break one, it rewrites the principle instead of quietly bypassing it.

1. **The action layer is ink, the accent layer is Steel.** Primary actions and headlines carry `{colors.primary}`; Steel is never the resting colour of an action. It carries links, focus rings and dark surfaces.
2. **Red means ink or trouble.** `{colors.seal}` marks errors, machine alarms and the running job (pen down). It is never decoration, so it always earns attention.
3. **The sheet is the truth.** Every source (text, SVG, image, AI) ends as lines on a sheet in its real format. Previews show that sheet, not an abstract canvas.
4. **The machine state is never hidden.** Connected or not, pen up or down, running, paused or stopped: visible at all times, in words plus icon, not only colour.
5. **Tokens are mandatory where they exist.** Colour, type, spacing, radius and motion come from the token block, and code references the name - never an inline hex.
6. **Default and Active lead.** Every component spec carries the default and the pressed state. Hover is documented only where it carries a function the component would otherwise lose.
7. **A container needs a reason.** A card frames something that belongs together: the sheet, a job, a settings group, a link target. Text that is only text runs on the canvas, divided by hairlines. No eyebrows above headings.

## Tokens (machine-readable)

> This JSONC block is the **machine-readable mirror** of the token tables below. The prose sections (`Colors`, `Typography`, `Layout`, `Shapes`) give the reasons; this block is the checkable truth. **Codegen prompts and `/audit-design` read this block, not the prose**, which turns "interpret the description" into a deterministic token lookup. When refining via `/design`, update values here **and** in the matching prose table (both stay in sync, this block wins when in doubt).

```jsonc
{
  "$id": "design-tokens/inkbot",
  "meta": {
    "accent": "steel",
    "themeStrategy": "system-default + data-theme override",
    "fontStrategy": "system stack, Display = 600 with negative tracking, no webfont (brand face open)"
  },
  // Hard requirements every generated UI code MUST meet.
  // /audit-design and /verify-ui check exactly these three flags.
  "requirements": {
    "darkMode": true,        // dark mode is required, not optional polish
    "responsive": true,      // every breakpoint must be served
    "tokensOnly": true       // no hardcodes - token references only (no raw hex/px)
  },
  "colors": {
    "canvas": "#faf8f0",
    "primary": "#363d52",
    "primary-active": "#23283a",
    "on-primary": "#faf8f0",
    "surface": "#faf8f0",
    "surface-card": "#f3f0da",
    "surface-soft": "#eae5ca",
    "surface-strong": "#dfd8b8",
    "hairline": "rgb(54 61 82 / 0.14)",
    "hairline-soft": "rgb(54 61 82 / 0.08)",
    "ink": "#363d52",
    "ink-soft": "#474d63",
    "ink-mute": "#5e6478",
    // dark surface set (footer, dark mode): night ink
    "surface-dark": "#23283a",
    "surface-dark-elevated": "#2c3246",
    "surface-dark-soft": "#272c3f",
    "hairline-dark": "rgb(250 248 240 / 0.10)",
    "on-dark": "#faf8f0",
    "on-dark-soft": "rgb(250 248 240 / 0.82)",
    "on-dark-mute": "rgb(250 248 240 / 0.68)",
    // interaction (steel lives here, never on primary CTAs)
    "link": "#3f6b8d",
    "link-dark": "#8db6c9",
    "focus-ring": "#3f6b8d",
    "focus-ring-dark": "#659eb4",
    "selection-bg": "#e3ecf1",
    "selection-text": "#23283a",
    "scrollbar-thumb": "#659eb4",
    "scrollbar-hover": "#3f6b8d",
    "emphasis-hover-dark": "#b9d0dc",
    // semantic (semantic role only, no second accent)
    "success": "#10b981",
    "warning": "#f59e0b",
    "danger": "#ac503a",
    "danger-dark": "#e59a86",
    // brand colours from the illustration
    "seal": "#ac503a",   // sealing-wax red: errors and the "pen down" state
    "wood": "#d69b68",   // wood: illustration only, never UI
    // Stahlblau-Skala - 7 Stops, Mid-Stops 300/500/700 bewusst undefiniert
    "steel": {
      "50": "#e3ecf1",
      "100": "#b9d0dc",
      "200": "#8db6c9",
      "400": "#659eb4",
      "600": "#3f6b8d",
      "800": "#2f5573",
      "900": "#23283a"
    }
  },
  "typography": {
    "fontFamily": {
      "display": "-apple-system, BlinkMacSystemFont, \"SF Pro Display\", \"SF Pro Text\", \"Segoe UI\", Roboto, sans-serif",
      "body": "-apple-system, BlinkMacSystemFont, \"SF Pro Display\", \"SF Pro Text\", \"Segoe UI\", Roboto, sans-serif",
      "mono": "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    },
    // size in px, tracking in px, face -> fontFamily-Rolle
    "scale": {
      "display-xl": { "size": 64, "weight": 600, "lineHeight": 1.05, "tracking": -2,   "face": "display" },
      "display-lg": { "size": 48, "weight": 600, "lineHeight": 1.1,  "tracking": -1.5, "face": "display" },
      "display-md": { "size": 36, "weight": 600, "lineHeight": 1.15, "tracking": -1,   "face": "display" },
      "display-sm": { "size": 28, "weight": 600, "lineHeight": 1.2,  "tracking": -0.5, "face": "display" },
      "title-lg":   { "size": 22, "weight": 600, "lineHeight": 1.3,  "tracking": -0.3, "face": "body" },
      "title-md":   { "size": 18, "weight": 600, "lineHeight": 1.4,  "tracking": 0,    "face": "body" },
      "title-sm":   { "size": 16, "weight": 600, "lineHeight": 1.4,  "tracking": 0,    "face": "body" },
      "body-md":    { "size": 16, "weight": 400, "lineHeight": 1.5,  "tracking": 0,    "face": "body" },
      "body-sm":    { "size": 14, "weight": 400, "lineHeight": 1.5,  "tracking": 0,    "face": "body" },
      "caption":    { "size": 13, "weight": 500, "lineHeight": 1.4,  "tracking": 0,    "face": "body" },
      "code":       { "size": 14, "weight": 400, "lineHeight": 1.5,  "tracking": 0,    "face": "mono" },
      "button":     { "size": 14, "weight": 600, "lineHeight": 1.0,  "tracking": 0,    "face": "body" },
      "nav-link":   { "size": 14, "weight": 500, "lineHeight": 1.4,  "tracking": 0,    "face": "body" }
    }
  },
  "motion": {
    "duration": { "instant": 100, "fast": 150, "base": 250 },
    "easing":   { "standard": "cubic-bezier(0.4, 0, 0.2, 1)" }
  },
  // Spacing/Radius in px, base unit 4
  "spacing": { "base": 4, "xxs": 4, "xs": 8, "sm": 12, "md": 16, "lg": 24, "xl": 32, "xxl": 48, "section": 96 },
  "radius":  { "xs": 4, "sm": 6, "md": 8, "lg": 12, "xl": 16, "pill": 9999, "full": 9999 },
  "shadow":  {
    "sm": "0 1px 2px rgba(0,0,0,0.05)",
    "md": "0 4px 12px rgba(0,0,0,0.08)"
  },
  // min-width Breakpoints in px. Mobile = Default (< 768).
  "breakpoints": { "tablet": 768, "desktop": 1024, "wide": 1440 },
  "container": { "maxWidth": 1200 }
}
```

## Colors

The palette comes from the brand illustration (`assets/logo.png`): paper, ink, tin, sealing wax, wood. Warm and analog instead of cool SaaS white.

### Brand Scale (Steel)

Steel blue from the robot's tin body. Each step has a defined role - don't reach for a Steel shade unless its role matches.

| Token | Value | Role |
|---|---|---|
| `{colors.steel-50}` | #e3ecf1 | Selection highlight background |
| `{colors.steel-100}` | #b9d0dc | Dark-theme emphasis hover |
| `{colors.steel-200}` | #8db6c9 | Inline links on dark surfaces |
| `{colors.steel-400}` | #659eb4 | Tin: decorative accent, scrollbar thumb, focus ring on dark (4.95:1 on surface-dark). Not for text on light (2.78:1) |
| `{colors.steel-600}` | #3f6b8d | **Primary accent** - inline links and focus ring on light (5.34:1 on canvas, 4.94:1 on surface-card) |
| `{colors.steel-800}` | #2f5573 | Link hover / pressed, deep accent (7.40:1 on canvas) |
| `{colors.steel-900}` | #23283a | Night ink: dark-theme canvas, footer background |

### Brand Accents

- **Seal** (`{colors.seal}` - #ac503a): Sealing-wax red from the ink bottle and the antenna ball. Carries errors (`{colors.danger}`) and the machine state "pen down" / plotting in progress. Never decorative in UI, so red always means "attention" or "ink is flowing". 4.98:1 on canvas.
- **Wood** (`{colors.wood}` - #d69b68): Wood from the desk. Illustrations only, never UI (2.26:1 on canvas).

### Action Layer (Ink, not Steel)

The primary CTA color is **ink**, not Steel. Steel is the accent, never the action.

- **Primary** (`{colors.primary}` - #363d52): All primary CTAs. Identical to `{colors.ink}`.
- **Primary Active** (`{colors.primary-active}` - #23283a): Press state for primary buttons.
- **On Primary** (`{colors.on-primary}` - #faf8f0): Text on primary buttons (10.15:1).

**On dark surfaces** the action layer inverts: primary renders with `{colors.canvas}` background and `{colors.surface-dark}` text; press/active shifts to `{colors.emphasis-hover-dark}` (Steel-100). Steel does **not** become the action color in dark.

### Surface (Light)

- **Canvas** (`{colors.canvas}` - #faf8f0): Light paper, the default page floor.
- **Surface** (`{colors.surface}` - #faf8f0): Standard surface. Same hex as canvas, separated so dark theme can flip it independently.
- **Surface Card** (`{colors.surface-card}` - #f3f0da): Paper from the illustration. Containers with a reason: the drawing sheet preview, quotes, settings groups.
- **Surface Soft** (`{colors.surface-soft}` - #eae5ca): Nav-pill-group background, table headers, ghost-control hover. One step stronger than surface-card.
- **Surface Strong** (`{colors.surface-strong}` - #dfd8b8): Disabled button background, progress-bar track (ink on it 7.53:1).
- **Hairline** (`{colors.hairline}` - `rgb(54 61 82 / 0.14)`): 1px border on light surfaces, tinted with ink instead of black.
- **Hairline Soft** (`{colors.hairline-soft}` - `rgb(54 61 82 / 0.08)`): Barely-visible divider.

### Surface (Dark)

- **Canvas Dark** (`{colors.surface-dark}` - #23283a): Night ink. Dark theme canvas, footer background.
- **Surface Dark** (`{colors.surface-dark-elevated}` - #2c3246): Card surfaces inside the dark canvas.
- **Surface Dark Soft** (`{colors.surface-dark-soft}` - #272c3f): Secondary surfaces inside the dark canvas.
- **Hairline Dark** (`{colors.hairline-dark}` - `rgb(250 248 240 / 0.10)`): Border tone on dark surfaces.

### Theme Activation

System preference is the default, `data-theme="light"` / `data-theme="dark"` on `<html>` is the explicit override, persisted in `localStorage` (`theme`: `light` | `dark` | `system`). The attribute is set by an inline script in `<head>` before first paint to avoid a flash.

### Text (Light)

- **Ink** (`{colors.ink}` - #363d52): Ink. Headlines and emphasis text (10.15:1 on canvas).
- **Ink Soft** (`{colors.ink-soft}` - #474d63): Default running text (7.87:1 on canvas, 7.29:1 on surface-card).
- **Ink Mute** (`{colors.ink-mute}` - #5e6478): Secondary text, captions, meta (5.53:1 on canvas, 5.12:1 on surface-card).

### Text (Dark)

- **Ink Dark** (`{colors.on-dark}` - #faf8f0): Headlines on dark surfaces (13.75:1).
- **Ink Dark Soft** (`{colors.on-dark-soft}` - `rgb(250 248 240 / 0.82)`): Body text on dark surfaces.
- **Ink Dark Mute** (`{colors.on-dark-mute}` - `rgb(250 248 240 / 0.68)`): Secondary text on dark surfaces.

### Interaction Tokens

- **Link** (`{colors.link}` - #3f6b8d = Steel-600): Inline links on light surfaces.
- **Link Dark** (`{colors.link-dark}` - #8db6c9 = Steel-200): Inline links on dark surfaces (6.73:1 on surface-dark, 5.85:1 on surface-dark-elevated).
- **Focus Ring** (`{colors.focus-ring}` - #3f6b8d = Steel-600): Focus-visible outline on light.
- **Focus Ring Dark** (`{colors.focus-ring-dark}` - #659eb4 = Steel-400): Focus-visible outline on dark (4.95:1 on surface-dark).
- **Selection BG / Text** (`{colors.selection-bg}` #e3ecf1 / `{colors.selection-text}` #23283a).
- **Scrollbar Thumb / Hover** (`{colors.scrollbar-thumb}` Steel-400 / `{colors.scrollbar-hover}` Steel-600).
- **Emphasis Hover (dark)** (`{colors.emphasis-hover-dark}` - #b9d0dc = Steel-100).

### Semantic
- **Success** (`{colors.success}` - #10b981): Confirmation states. Baseline value, not yet tuned to the brand.
- **Warning** (`{colors.warning}` - #f59e0b): Warning callouts. Baseline value, not yet tuned to the brand.
- **Danger** (`{colors.danger}` - #ac503a = Seal): Validation errors, destructive actions, alarms from the machine (4.98:1 on canvas, 4.61:1 on surface-card).
- **Danger Dark** (`{colors.danger-dark}` - #e59a86): Danger on dark surfaces (5.63:1 on surface-dark-elevated).

## Typography

### Font Family
The system runs the platform's **system typeface** in two roles. Stack: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif` - SF Pro on Apple devices, Segoe UI on Windows, Roboto on Android. No webfont request, no font swap on load. Code blocks use the system monospace stack (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`).

The split is functional:
- Display (600 weight, -0.5 to -2px tracking) - h1, h2, h3
- Body (400-600 weight, 0 letter-spacing) - paragraphs, labels, buttons, nav

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 600 | 1.05 | -2px | Start page h1 ("Handwriting from the browser") - Display |
| `{typography.display-lg}` | 48px | 600 | 1.1 | -1.5px | Section heads ("Write text") - Display |
| `{typography.display-md}` | 36px | 600 | 1.15 | -1px | Sub-section heads, card titles - Display |
| `{typography.display-sm}` | 28px | 600 | 1.2 | -0.5px | Job card title ("Greeting card · A6 landscape") - Display |
| `{typography.title-lg}` | 22px | 600 | 1.3 | -0.3px | Panel titles ("Paper format") - Body |
| `{typography.title-md}` | 18px | 600 | 1.4 | 0 | Feature titles, intro paragraphs |
| `{typography.title-sm}` | 16px | 600 | 1.4 | 0 | Small card titles, list labels |
| `{typography.body-md}` | 16px | 400 | 1.5 | 0 | Default running-text |
| `{typography.body-sm}` | 14px | 400 | 1.5 | 0 | Footer body, fine-print |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Badge labels, captions |
| `{typography.code}` | 14px | 400 | 1.5 | 0 | G-code, console output - system mono |
| `{typography.button}` | 14px | 600 | 1.0 | 0 | Standard button labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | Top-nav menu items |

### Principles
Display is the brand voice - every display headline uses it. Body handles the supporting type. The boundary is strict: never put body copy in Display, never set a display headline in body weight and tracking. Display without negative letter-spacing reads as off-brand - the -0.5 to -2px tracking is part of the voice.

Display weight stays at 600 across all sizes - never 700, never 500. The middle weight is what makes Display feel modern and confident without becoming bombastic.

### Note on the Display Face
Display currently runs on the system stack at weight 600 and negative tracking. A brand face is still open: a handwriting or single-line face for headlines would echo what the plotter does. Whatever face is chosen is self-hosted (the app works offline as a PWA), keeps weight 600 and the negative letter-spacing scale.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** `{spacing.section}` (96px) between bands on the start page. Inside the app, panels use `{spacing.lg}` (24px).
- **Card internal padding:** `{spacing.xl}` (32px) for source cards; `{spacing.lg}` (24px) for the job card, preview cards and settings groups.
- **Gutters:** `{spacing.lg}` (24px) between columns in 3-up grids; `{spacing.md}` (16px) inside footer columns.

### Grid & Container
- **Max content width:** ~1200px centered on the start page. The app view uses the full width: tool panel left, sheet preview right.
- **Start page:** Single 12-column grid; the hero band uses a 7/5 split (h1 left, job card right).
- **Feature lists:** 3-up columns at desktop, 2-up at tablet, 1-up at mobile, divided by hairlines, no card per item.
- **Source cards:** 3-up at desktop, 1-up at mobile.
- **Footer:** 3-column link list at desktop, 1-up at mobile.

### Whitespace Philosophy
The start page breathes (96px between bands, one heading and one visual per band). The app view is denser but calm: the sheet preview gets the space, controls stay compact in the tool panel.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body sections, top nav, hero band |
| Soft hairline | 1px `{colors.hairline}` border | Inputs, table dividers, occasionally on cards |
| Card surface | `{colors.surface-card}` background - no shadow | Sheet preview, preview cards, settings groups |
| Subtle drop shadow | Faint shadow at low alpha | Job card, source cards, toasts, dialogs (`{shadow.sm}`, `{shadow.md}`) |
| Featured source | `{colors.surface-dark}` background, no shadow needed | The featured source card inverts to dark surface - colour contrast does the elevation work |

The elevation philosophy is **soft and modern** - small drop shadows on elevated cards, color-block contrast for emphasis. No heavy shadows, no neumorphism, no glassmorphism.

### Decorative Depth
- The sheet preview may carry a faint `{shadow.sm}` so the paper lifts off the canvas, like a real sheet on a desk.
- The brand illustration is the only place with painted depth (shading, texture). UI surfaces stay flat.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Almost no use - reserved for badge accents |
| `{rounded.sm}` | 6px | Small inline buttons, dropdown items |
| `{rounded.md}` | 8px | Standard CTA buttons, text inputs, category tabs |
| `{rounded.lg}` | 12px | Cards (feature cards, preview cards, source cards, settings groups) |
| `{rounded.xl}` | 16px | Job card (the marquee component) |
| `{rounded.pill}` | 9999px | Nav-pill-group, badge pills |
| `{rounded.full}` | 9999px / 50% | Icon buttons, status dots |

### Image Geometry
The brand illustration (`assets/logo.png`) is square with `{rounded.xl}` corners. The sheet preview keeps the real paper ratio (A4, A5, A6, C6, DL) and uses square corners - paper has no radius.

## Motion

The system is deliberately quiet: no entrance choreographies, no parallax, no scroll-triggered reveals. Motion confirms that an interaction happened - it does not decorate.

### Duration Tokens
| Token | Value | Use |
|---|---|---|
| `{motion.duration.instant}` | 100ms | Press feedback on buttons and cards |
| `{motion.duration.fast}` | 150ms | Focus ring, text selection, small tint changes |
| `{motion.duration.base}` | 250ms | Modal and panel open/close, surface swaps |

### Easing
| Token | Value | Use |
|---|---|---|
| `{motion.easing.standard}` | `cubic-bezier(0.4, 0, 0.2, 1)` | Every transition in the system |

A single easing curve is intentional. A second one needs a reason this document does not currently have.

### Motion Principles
- **Press:** `{component.button-primary}` shifts to `{colors.primary-active}` over `{motion.duration.instant}`. Nothing scales, nothing lifts.
- **Hover:** only the functional hovers from Design Principle 6 (inline-link underline, scrollbar, inverted primary on dark, toast timer pause). Anything more gets documented here first.
- **Focus:** the `{colors.focus-ring}` outline appears over `{motion.duration.fast}`, 2px, offset 2px, and is never animated away.
- **`prefers-reduced-motion`:** mandatory. Everything longer than `{motion.duration.instant}` collapses to 0ms. The press colour shift stays - a colour change is not motion in the sense of the spec.

## Voice & Tone

### Voice Principles
- **Plain over clever.** Name the function, not the brand.
- **Active verbs, no nominal style.** "Saves your changes", not "Saving is performed".
- **Marketing language stops at the app boundary.** The landing page may sell; a settings panel states facts.
- **No trailing period on single-line UI strings.** Button labels, headlines and empty-state titles end without one. Sentences in body copy keep theirs.
- **The empty state carries the value promise**, not an apology.

### Microcopy Patterns
| Context | Pattern | Example |
|---|---|---|
| Primary CTA | Verb + object, max 3 words | "Start drawing" |
| Error message | What happened + next step | "Plotter does not respond. Check the USB cable." |
| Empty state | What is missing + what it is worth | "No text yet. Type something, the preview shows it right away." |
| Success toast | Past tense, short | "Saved" |
| Loading | Active, optimistic | "Connecting to the plotter …" |

### Language & Localisation
- **Language:** English interface, informal and direct. A German translation is planned (Swiss orthography, `ss` instead of the sharp s, informal "Du").
- **Dates:** `DD.MM.YYYY`, times `14:30`.
- **Numbers and currency:** apostrophe as thousands separator, point as decimal separator - `1'234.55`, `CHF 1'234.55`.
- **Quotes:** straight `"…"` only. No guillemets, no typographic quotes.
- **Dashes:** plain hyphens. No em-dashes, no en-dashes.
- **URLs are English:** `/text`, `/image`, `/settings`.


## Components

### Top Navigation

**`top-nav`** - App bar pinned to the top. 64px tall, `{colors.canvas}` background, hairline bottom border. Left: logo + wordmark "inkbot". Right: the connection `{component.badge-pill}` ("Disconnected" / "Connected") and `{component.button-primary}` "Connect plotter" (becomes `{component.button-secondary}` "Disconnect" once connected). Language switch DE / EN as `{component.button-text-link}`.

**`nav-pill-group`** - Pill-radius wrapper around the source switcher "Text" / "SVG" / "Image". Background `{colors.surface-soft}` with internal padding 6px, rounded `{rounded.pill}`. The active segment renders as a `{colors.canvas}` pill with a subtle drop shadow inside the wrapper.

### Buttons

**`button-primary`** - The primary action. Background `{colors.primary}` (#363d52), text `{colors.on-primary}`, type `{typography.button}` (Body 14px / 600), padding 12px × 20px, height 40px, rounded `{rounded.md}` (8px). Active state shifts to `{colors.primary-active}` (#23283a). On dark surfaces the primary inverts to `{colors.canvas}` background with `{colors.surface-dark}` text; hover shifts to `{colors.emphasis-hover-dark}`.

**`button-secondary`** - Canvas button with hairline outline. Background `{colors.canvas}`, text `{colors.ink}`, 1px hairline border, same padding + height + radius as primary.

**`button-stop`** - Stops a running job (soft reset). Background `{colors.danger}`, text `{colors.on-primary}`, same size as primary. Visible for the whole job, never hidden in a menu. Pause sits next to it as `{component.button-secondary}`.

**`button-icon-circular`** - 36 × 36px circular icon button. Background `{colors.canvas}`, hairline border, ink-colour icon. Used for jog arrows, share, "more".

**`button-text-link`** - Inline text button, no background. Used for "Help" and the language switch in the top nav.

**`text-link`** - Inline body links in `{colors.link}`, or `{colors.link-dark}` on dark surfaces. Underlined on hover - one of the functional hovers named in Design Principle 6. Not on `{colors.surface-soft}` (4.48:1).

### Cards & Containers

**`hero-band`** - Start page hero with a 7-5 grid: h1 + sub-headline + button row on the left ("Connect plotter", "Try without a plotter"), `{component.job-card}` on the right. Vertical padding `{spacing.section}` (96px).

**`job-card`** - Summary of the current job: format, content, origin, estimated run time, and the start button. Background `{colors.canvas}`, 1px hairline border, rounded `{rounded.xl}` (16px), `{shadow.md}`. Rows are 40px with label left and value right; the active row uses `{colors.primary}` with `{colors.on-primary}` text. While a job runs, the start button turns into `{component.button-stop}` plus pause.

**`sheet-preview`** - The drawing on a sheet in its real format. Sheet in `{colors.surface-card}`, square corners, `{shadow.sm}`, centred on the canvas with at least `{spacing.lg}` margin. Drawn lines in `{colors.ink}`, pen-up travel (optional) in `{colors.steel-400}` dashed, the current pen position as a `{colors.seal}` dot while a job runs.

**`feature-list`** - The default for feature claims on the start page. Items sit directly on the canvas in 2-3 columns, each with a `{typography.title-md}` title and a `{typography.body-md}` description, separated by a `{colors.hairline-soft}` top border. No container, no background, no icon by default.

**`feature-card`** - Only when the item has a reason to be a container: the whole card is a link or carries an image. Background `{colors.surface-card}`, rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px).

**`preview-card`** - A saved job or template ("Greeting card, A6 landscape, Hershey Script") with a short text sample. Background `{colors.surface-card}`, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). Top row: format badge + title + meta in `{typography.caption}`; below the sample in `{typography.body-md}`.

**`source-card`** - Start page card per source (Text, SVG, Image and AI) with version, three facts and one button. Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.xl}` (32px). Name in `{typography.title-lg}`, version in `{typography.display-sm}`, facts in `{typography.body-md}`.

**`source-card-featured`** - The recommended source flips to `{colors.surface-dark}` (#23283a), text inverts to `{colors.on-dark}`. The dark surface IS the signal - no badge, no accent border.

### Inputs & Forms

**`text-input`** - Standard text input. Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}` (8px), padding 10px × 14px, height 40px. 1px hairline border in `{colors.hairline}`. Multi-line text for the plotter uses the same treatment as a textarea.

**`text-input-focused`** - Focus state. Border shifts to `{colors.ink}` for emphasis.

**`field-error`** - Inline validation message below a field. Every form carries `novalidate`; the browser's native validity bubbles never appear. The invalid input gets `aria-invalid="true"` and a `{colors.danger}` border, the message sits directly under it in `{typography.caption}` in `{colors.danger}` and is linked via `aria-describedby`. The first invalid field receives focus; the message clears on the next input.

**`file-picker`** - Replacement for the native file control, used for SVG and image import. The real `<input type="file">` stays hidden; visible is a `{component.button-secondary}` ("Choose file") plus the chosen file name, or a "No file chosen" placeholder, in `{typography.caption}` / `{colors.ink-mute}`, truncated with an ellipsis. Dropping a file on the sheet preview works as well.

### Feedback

**`toast`** - Transient notification in response to a user action (saved, copied, error). Background `{colors.canvas}`, 1px hairline border, rounded `{rounded.md}` (8px), padding 12px × 16px, `{shadow.md}`. Carries a leading 16px status icon, a single-line message in `{typography.body-sm}` (`{colors.ink}`), and an optional close button (`{component.button-icon-circular}` at 24px). Width caps at 420px.

Variants flag status via the icon colour and a thin 3px left border:
- **`toast-success`** - Icon and left border in `{colors.success}`.
- **`toast-warning`** - Icon and left border in `{colors.warning}`.
- **`toast-danger`** - Icon and left border in `{colors.danger}` (#ac503a).
- **`toast-neutral`** - No left border, icon in `{colors.ink-mute}`.

**Stack behavior:** Toasts stack bottom-right on desktop (anchored `{spacing.lg}` from the viewport edges). Maximum 3 visible at once; further toasts queue.

**Auto-dismiss:** 4s for `toast-success` and `toast-neutral`, 6s for `toast-warning`, **never** for `toast-danger`. Hovering pauses the timer.

**Don't:** use toasts for machine alarms (GRBL `ALARM`, `error:N`) - those stop the job and open a `{component.dialog}` with the cause and the next step.

**`tooltip`** - Short hint for a control, declared with `data-tooltip="..."`, never with the native `title` attribute. Background `{colors.ink}`, text `{colors.canvas}`, 12px / 500, padding 4px × 8px, rounded `{rounded.sm}`, `{shadow.md}`, max-width 280px. Shows on hover and keyboard focus; hides on pointer down, click, scroll or Escape. Icon-only controls carry an `aria-label` in addition.

**`dialog`** - Modal that replaces native `confirm()` / `alert()` and hosts short forms. Backdrop `{colors.ink}` at 50%; panel `{colors.surface}`, 1px hairline border, rounded `{rounded.lg}`, `{shadow.md}`, max-height 90vh. Sizes: small (420px), large (680px). Header carries the title in `{typography.title-md}`; footer right-aligns cancel (`{component.button-secondary}`) and the action (`{component.button-primary}` or `{component.button-stop}`). A destructive question names the object ("Cancel job "Greeting card"?"). Escape and backdrop click cancel, Tab is trapped, focus returns to the trigger.

### Tags / Badges

**`badge-pill`** - Small pill label for machine and job state: "Disconnected" (default), "Connected" (brand), "Done" (success), "Paused" (warning), "Alarm" (danger), "Pen down" (seal). Background `{colors.surface-card}` (default) or a tint of the state colour, text `{colors.ink}`, type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px. A state badge always carries the word, never only a coloured dot.

### Tab / Filter

**`category-tab`** + **`category-tab-active`** - Used inside the nav-pill-group. Inactive: transparent background, `{colors.ink-mute}` text. Active: `{colors.canvas}` background, `{colors.ink}` text, subtle drop shadow inside the wrapper. Padding 8px × 14px, rounded `{rounded.pill}` so the segment follows the pill wrapper.

### Footer

**`footer`** - Closes the start page. Background `{colors.surface-dark}` (#23283a, night ink), text `{colors.on-dark-soft}`. Wordmark "inkbot" top-left in `{colors.on-dark}` with the line "Not affiliated with VigoTec." 3-column link list: App, Help, Project. Vertical padding 64px. The app view itself has no footer.

## Do's and Don'ts

### Do
- Reserve `{colors.primary}` (#363d52 = ink) for primary actions and h1/h2 type. The button is ink, not Steel.
- Use Display for every display headline. Pair with Body type. Never blur the boundary.
- Apply negative letter-spacing on display sizes (-0.5 to -2px).
- Show the drawing on `{component.sheet-preview}` in the real paper format.
- Keep the connection and job state visible at all times, in words.
- Keep `{component.button-stop}` reachable during the whole job.
- Use `{component.nav-pill-group}` for the source switcher.
- Use the brand illustration on the start page and in the README; UI surfaces stay flat.

### Don't
- Don't use Steel on primary actions. The action layer is **ink**; Steel lives at the accent layer (links, focus rings, dark surfaces).
- Don't use `{colors.seal}` as decoration. Red means error, alarm or pen down.
- Don't use `{colors.wood}` in the UI. It belongs to the illustration.
- Don't put eyebrows (small uppercase labels) above headings.
- Don't box text that is only text. No card grid for plain feature claims.
- Don't load a webfont from a third-party CDN. A brand face is self-hosted so the PWA works offline.
- Don't introduce a further accent palette. Semantic colours (`success`, `warning`, `danger`) only appear in their semantic role.
- Don't bold display weight beyond 600.
- Don't use a radius beyond `{rounded.xl}` (16px) on cards, and none on the sheet itself.
- Don't put dark surface cards anywhere except the footer and the featured source card.
- Don't use hover to communicate affordance.
- Don't use native browser dialogs or hints: no `confirm()`, `alert()`, `prompt()`, no `title` attribute for hover text, no validity bubbles, no visible native file control. Use `{component.dialog}`, `{component.tooltip}`, `{component.field-error}` and `{component.file-picker}`.

## Responsive Behavior

Web Serial only exists in desktop Chrome and Edge, so plotting happens on a desktop. Smaller viewports still work for preparing text and checking the preview.

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hamburger nav; hero h1 64→32px; job card stacks below content; tool panel above the sheet preview; source cards 1-up; footer 3 cols → 1 |
| Tablet | 768-1024px | Top nav stays horizontal; tool panel and sheet preview stack; feature lists 2-up |
| Desktop | 1024-1440px | Tool panel left, sheet preview right; 3-up feature lists and source cards |
| Wide | > 1440px | Same as desktop; the sheet preview gets the extra width |

### Touch Targets
- `{component.button-primary}` and `{component.button-stop}` at minimum 40 × 40px.
- `{component.button-icon-circular}` at exactly 36 × 36 - slightly under WCAG's 44 × 44, compensated by spacing between jog buttons.
- `{component.text-input}` height is 40px.
- The toast close button renders at 24px; the whole toast surface takes the tap.

### Collapsing Strategy
- Top nav collapses to hamburger at < 768px; the connection badge stays visible.
- The hero 7-5 grid collapses to single-column - h1 + sub-head + buttons first, then the job card.
- The app view stacks: tool panel, then sheet preview, then job controls.
- Feature lists and source cards reduce columns rather than shrinking type.

### Image Behavior
- The sheet preview scales to the available width and keeps the paper ratio.
- The brand illustration scales proportionally and never crops.

## Accessibility

### Measured Contrast
Every text pair in the system, computed from the token values (WCAG relative luminance; alpha tokens composited over their surface). AA needs 4.5:1 for body text and 3:1 for large text and UI boundaries.

| Pair | Ratio | Verdict |
|---|---|---|
| `{colors.ink}` on `{colors.canvas}` | 10.15:1 | AAA |
| `{colors.ink-soft}` on `{colors.canvas}` | 7.87:1 | AAA |
| `{colors.ink-soft}` on `{colors.surface-card}` | 7.29:1 | AAA |
| `{colors.ink-mute}` on `{colors.canvas}` | 5.53:1 | AA |
| `{colors.ink-mute}` on `{colors.surface-card}` | 5.12:1 | AA |
| `{colors.ink-mute}` on `{colors.surface-soft}` | 4.64:1 | AA |
| `{colors.link}` on `{colors.canvas}` | 5.34:1 | AA |
| `{colors.link}` on `{colors.surface-card}` | 4.94:1 | AA |
| `{colors.link}` on `{colors.surface-soft}` | 4.48:1 | Fails AA for body text - no links on surface-soft |
| `{colors.on-primary}` on `{colors.primary}` | 10.15:1 | AAA |
| `{colors.on-dark}` on `{colors.surface-dark}` | 13.75:1 | AAA |
| `{colors.on-dark-soft}` on `{colors.surface-dark}` | 9.74:1 | AAA |
| `{colors.on-dark-mute}` on `{colors.surface-dark}` | 7.14:1 | AAA |
| `{colors.link-dark}` on `{colors.surface-dark}` | 6.73:1 | AA |
| `{colors.link-dark}` on `{colors.surface-dark-elevated}` | 5.85:1 | AA |
| `{colors.danger}` on `{colors.canvas}` | 4.98:1 | AA |
| `{colors.danger}` on `{colors.surface-card}` | 4.61:1 | AA |
| `{colors.danger-dark}` on `{colors.surface-dark}` | 6.47:1 | AA |
| `{colors.danger-dark}` on `{colors.surface-dark-elevated}` | 5.63:1 | AA |
| `{colors.focus-ring}` on `{colors.canvas}` | 5.34:1 | AA (UI, 3:1) |
| `{colors.focus-ring}` on `{colors.surface-card}` | 4.94:1 | AA (UI, 3:1) |
| `{colors.focus-ring-dark}` on `{colors.surface-dark}` | 4.95:1 | AA (UI, 3:1) |

Two token groups do **not** reach a text threshold, and that is a constraint, not an oversight:

- `{colors.success}` (2.39:1) and `{colors.warning}` (2.02:1) on canvas are below 3:1. They may tint an icon or a border **next to** a text label carrying the same information. Never set either as the colour of the message text itself.
- `{colors.hairline}` (1.27:1) is a decorative divider tone. On an input border it sits below the 3:1 UI threshold, so the visible label stays mandatory, and `{component.text-input-focused}` plus an error state carry the rest.

### Minimum Requirements
- **Focus ring:** always visible, never `outline: none` without a replacement. `outline: 2px solid {colors.focus-ring}; outline-offset: 2px;`
- **Touch target:** 44 x 44px is the target for anything new. `Responsive Behavior` under `Touch Targets` lists the existing components that sit below it and why; a new component either meets 44 or earns an entry there.
- **Keyboard:** tab order follows the visual hierarchy, skip link to main content.
- **`prefers-reduced-motion`:** see `Motion`.
- **`prefers-color-scheme`:** supported - `requirements.darkMode` is true. Activation is system preference plus a `data-theme` override.
- **Screen readers:** semantic HTML before ARIA. Buttons are `<button>`, links are `<a>`, icon-only buttons carry `aria-label`.
- **Forms:** every field has a label wired with `for`/`id`; error messages reference it via `aria-describedby`.
- **Language:** `<html lang="en">`; a German version would switch to `de-CH`.

### Don't
- No `outline: none` without a visible replacement.
- No colour as the sole carrier of information - an error is not only red, it also has an icon and words.
- No `tabindex` greater than 0.
- No looping animation beyond 5s without a pause affordance.

## Code Snippets (Copy-Paste-Ready)

> Generated from the token block above. Where a value here disagrees with `## Tokens (machine-readable)`, the token block wins and this section is stale.

### CSS Variables
```css
:root {
	/* Steel scale */
	--steel-50: #e3ecf1;
	--steel-100: #b9d0dc;
	--steel-200: #8db6c9;
	--steel-400: #659eb4;
	--steel-600: #3f6b8d;
	--steel-800: #2f5573;
	--steel-900: #23283a;

	/* Brand accents */
	--seal: #ac503a;
	--wood: #d69b68;

	/* Action layer */
	--primary: #363d52;
	--primary-active: #23283a;
	--on-primary: #faf8f0;

	/* Surface light */
	--canvas: #faf8f0;
	--surface: #faf8f0;
	--surface-card: #f3f0da;
	--surface-soft: #eae5ca;
	--surface-strong: #dfd8b8;
	--hairline: rgb(54 61 82 / 0.14);
	--hairline-soft: rgb(54 61 82 / 0.08);

	/* Surface dark */
	--surface-dark: var(--steel-900);
	--surface-dark-elevated: #2c3246;
	--surface-dark-soft: #272c3f;
	--hairline-dark: rgb(250 248 240 / 0.10);

	/* Text light */
	--ink: #363d52;
	--ink-soft: #474d63;
	--ink-mute: #5e6478;

	/* Text dark */
	--on-dark: #faf8f0;
	--on-dark-soft: rgb(250 248 240 / 0.82);
	--on-dark-mute: rgb(250 248 240 / 0.68);

	/* Interaction */
	--link: var(--steel-600);
	--link-dark: var(--steel-200);
	--focus-ring: var(--steel-600);
	--focus-ring-dark: var(--steel-400);
	--selection-bg: var(--steel-50);
	--selection-text: var(--steel-900);
	--scrollbar-thumb: var(--steel-400);
	--scrollbar-hover: var(--steel-600);
	--emphasis-hover-dark: var(--steel-100);

	/* Semantic */
	--success: #10b981;
	--warning: #f59e0b;
	--danger: var(--seal);
	--danger-dark: #e59a86;

	/* Spacing */
	--space-base: 4px;
	--space-xxs: 4px;
	--space-xs: 8px;
	--space-sm: 12px;
	--space-md: 16px;
	--space-lg: 24px;
	--space-xl: 32px;
	--space-xxl: 48px;
	--space-section: 96px;

	/* Radius */
	--radius-xs: 4px;
	--radius-sm: 6px;
	--radius-md: 8px;
	--radius-lg: 12px;
	--radius-xl: 16px;
	--radius-pill: 9999px;
	--radius-full: 9999px;

	/* Typography */
	--font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
	--font-body: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
	--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

	/* Motion */
	--duration-instant: 100ms;
	--duration-fast: 150ms;
	--duration-base: 250ms;
	--easing-standard: cubic-bezier(0.4, 0, 0.2, 1);

	/* Elevation */
	--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
	--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
}
```

### Tailwind Config (Auszug)
```js
// tailwind.config.js
export default {
	theme: {
		extend: {
			colors: {
				primary: 'var(--primary)',
				canvas: 'var(--canvas)',
				surface: 'var(--surface)',
				'surface-card': 'var(--surface-card)',
				'surface-dark': 'var(--surface-dark)',
				ink: 'var(--ink)',
				'ink-soft': 'var(--ink-soft)',
				'ink-mute': 'var(--ink-mute)',
				link: 'var(--link)',
				seal: 'var(--seal)',
				steel: {
					50: 'var(--steel-50)',
					100: 'var(--steel-100)',
					200: 'var(--steel-200)',
					400: 'var(--steel-400)',
					600: 'var(--steel-600)',
					800: 'var(--steel-800)',
					900: 'var(--steel-900)'
				}
			},
			borderRadius: {
				sm: 'var(--radius-sm)',
				md: 'var(--radius-md)',
				lg: 'var(--radius-lg)',
				xl: 'var(--radius-xl)',
				pill: 'var(--radius-pill)'
			},
			spacing: {
				section: 'var(--space-section)'
			},
			fontFamily: {
				display: 'var(--font-display)',
				sans: 'var(--font-body)',
				mono: 'var(--font-mono)'
			},
			screens: {
				tablet: '768px',
				desktop: '1024px',
				wide: '1440px'
			},
			maxWidth: {
				container: '1200px'
			},
			transitionTimingFunction: {
				standard: 'var(--easing-standard)'
			}
		}
	}
};
```

### Focus Ring (universal)
```css
:focus-visible {
	outline: 2px solid var(--focus-ring);
	outline-offset: 2px;
}

[data-theme="dark"] :focus-visible,
.surface-dark :focus-visible {
	outline-color: var(--focus-ring-dark);
}

@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) :focus-visible {
		outline-color: var(--focus-ring-dark);
	}
}
```

### Press State (primary button)
```css
.button-primary:active {
	background: var(--primary-active);
	transition: background var(--duration-instant) var(--easing-standard);
}

@media (prefers-reduced-motion: reduce) {
	* {
		transition-duration: 0ms !important;
		animation-duration: 0ms !important;
	}

	.button-primary:active {
		transition-duration: var(--duration-instant) !important;
	}
}
```

### Selection and Scrollbar
```css
::selection {
	background: var(--selection-bg);
	color: var(--selection-text);
}

::-webkit-scrollbar-thumb {
	background: var(--scrollbar-thumb);
}

::-webkit-scrollbar-thumb:hover {
	background: var(--scrollbar-hover);
}
```


## Iteration Guide

1. Focus on ONE component at a time. Reference its key directly (`{component.sheet-preview}`, `{component.job-card}`).
2. Variants of an existing component (`-active`, `-disabled`, `-focused`) live as separate entries.
3. Use `{token.refs}` everywhere - never inline hex.
4. Document Default and Active/Pressed. Hover only where Design Principle 6 names a function.
5. Display headlines stay Display 600 with negative letter-spacing. Body stays 400.
6. The dark surface stays scarce: footer and featured source card.
7. When in doubt about emphasis: bigger Display before bolder Display.

## Known Gaps

- **Brand face open.** Display runs on the system stack. A handwriting or single-line face for headlines is a candidate; it must be self-hosted and work offline.
- **Success and warning** still use the baseline values (#10b981, #f59e0b) and are not tuned to the warm palette.
- **Not yet specified:** console (GRBL output), jog controls with step sizes, the tool panel layout, sliders for size and spacing, the progress bar during a job, the AI key settings.
- **Focus ring needs two tokens** (`focus-ring`, `focus-ring-dark`) because Steel-600 has only 2.58:1 on the dark canvas.
- The Steel scale covers 7 stops (50/100/200/400/600/800/900). Mid-stops 300/500/700 are intentionally not defined.
- Motion covers durations, one easing curve and the press/focus states. The pen animation in the preview is not specified yet.
- Typography sizes, spacing, radius and motion are the baseline values and have not been reviewed for inkbot yet.
