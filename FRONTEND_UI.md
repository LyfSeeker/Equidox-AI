# Equidox Frontend — Components, Elements & Colors

**Last updated:** 2026-07-14  
**Stack:** Next.js (App Router) · Tailwind CSS v4 · Lucide icons · Framer Motion  
**Aesthetic:** “Crucible” — dark industrial UI with monospaced labels and high-contrast accents  

> **Premium polish (2026-07):** Shared `.btn` / `.panel-static` / `.field-input` / `.badge` / skeleton shimmer / page transitions. New primitives under `components/ui/` (`Badge`, `ScoreRing`, `EmptyState`, `PageHeader`, `Skeleton`). Collapse sidebar, topbar search + profile menu, dashboard KPI grid, circular AI score rings, verification workflow stepper. **Colors unchanged.**

---

## 1. Design tokens (colors)

Defined in `frontend/src/app/globals.css` under `@theme` / `:root`.

### Core surfaces

| Token | Hex / value | Typical use |
|-------|-------------|-------------|
| `--color-crucible-bg` / `--background` | `#0f0f11` | App background, topbar, footer |
| `--color-crucible-surface` | `#17171a` | Panels (`.panel-border`) |
| `--color-crucible-surface-light` | `#212124` | Slightly lighter surfaces |
| `--color-crucible-border` | `#2a2a2d` | Borders, panel outlines, dividers |
| `--foreground` | `#9ca3af` | Default body text (zinc-like gray) |

### Brand accents

| Token | Hex / value | Typical use |
|-------|-------------|-------------|
| `--color-crucible-gold` | `#DEFF3B` | Primary CTA, active nav, admin badges, headings |
| `--color-crucible-gold-dim` | `rgba(222, 255, 59, 0.2)` | Soft gold fills / hover washes |
| `--color-crucible-gold-glow` | `rgba(222, 255, 59, 0.4)` | Text glow (`.text-gold-glow`) |
| `--color-crucible-cyan` | `#00E5FF` | Secondary accent, status “online”, user role, AI |
| `--color-crucible-cyan-dim` | `rgba(0, 229, 255, 0.2)` | Soft cyan fills / glow |
| `--color-crucible-red` | `#f87171` | Errors, reject, destructive actions |
| `--color-crucible-red-dim` | `rgba(248, 113, 113, 0.2)` | Soft red washes |

### Tailwind zinc scale (used heavily)

| Class | Role |
|-------|------|
| `text-white` | Primary headings / emphasis |
| `text-zinc-200` / `text-zinc-300` | Secondary readable text |
| `text-zinc-400` | Default muted body (`text-zinc-400` on pages) |
| `text-zinc-500` | Labels, hints, placeholders |
| `text-zinc-600` | Disabled / lowest-priority text |
| `bg-black` / `bg-black/40` | Input fields, chips |
| `bg-white/5` | Hover backgrounds |
| `lime-400` | Overall AI “Score” bar accent (report panel) |

### Semantic color map

| Meaning | Color |
|---------|--------|
| Primary action / brand | Gold `#DEFF3B` |
| Success / network live / AI secondary | Cyan `#00E5FF` |
| Danger / reject / risk | Red `#f87171` |
| Neutral UI chrome | Zinc grays + `#2a2a2d` borders |
| Score positive (bars) | Lime / cyan / gold depending on metric |

---

## 2. Typography

Configured in `frontend/src/app/layout.tsx` via `next/font/google`:

| CSS variable | Font | Role |
|--------------|------|------|
| `--font-space-mono` → `font-mono` | **Space Mono** | Default UI body, labels, buttons |
| `--font-inter` → `font-sans` | **Inter** | Longer descriptions / helper copy |
| `--font-outfit` → `font-logo` | **Outfit** | Logo wordmark (“equidox ai”) |

### Label style conventions

Most UI chrome uses:

- `text-[10px]` or `text-xs`
- `uppercase`
- `tracking-widest` / `tracking-wider`
- `font-bold`

Page titles typically: `text-2xl` / `text-3xl`, `font-bold`, `text-white`, `uppercase`, `tracking-widest`.

---

## 3. Shared CSS utilities

| Class | What it does |
|-------|----------------|
| `.bg-grid-pattern` | Faint 40×40px white grid overlay on dark bg |
| `.panel-border` | `1px` border `#2a2a2d`, bg `#17171a`, radius `6px` |
| `.text-gold-glow` | Gold text + glow shadow |
| `.text-cyan-glow` | Cyan text + glow shadow |

Custom scrollbar: track = crucible bg, thumb = border gray (`#2a2a2d` → `#3f3f46` on hover).

---

## 4. Layout shell

```
RootLayout
  AuthProvider → WalletProvider → ToastProvider
    AppChrome
      Sidebar (unless /login|/admin)
      Topbar
      <main>{AuthGate → page}</main>
      Footer strip
```

---

## 5. Shared components (`frontend/src/components/`)

### `AppChrome.tsx`

**Role:** App shell — sidebar + topbar + scrollable main + status footer.

| Element | Details |
|---------|---------|
| Conditional shell | Bare children on `/login`, `/admin` |
| Sidebar + Topbar | Authenticated app chrome |
| `<main>` | `p-4 md:p-8`, scrollable |
| Footer | `h-8`, `bg-crucible-bg`, border-top; shows network/protocol + cyan “OPERATIONAL” dot |

**Colors:** `border-crucible-border`, `bg-crucible-bg`, `text-zinc-500`, `bg-crucible-cyan` status pip.

---

### `Sidebar.tsx`

**Role:** Left navigation.

| Element | Details |
|---------|---------|
| Logo row | `/logo.png` + Outfit “equidox” (white) + “ai” (gold) |
| Nav links | HOME, DASHBOARD, GRANTS, BUILDERS, REVIEW (admin) / SUBMIT (user) |
| Icons | Lucide: `Home`, `Terminal`, `Database`, `Users`, `ShieldCheck`, `HelpCircle`, `Code` |
| Active state | `text-crucible-gold`, `border-l-2 border-crucible-gold`, `bg-white/5` |
| Inactive | `text-zinc-500`, hover `text-zinc-300` |
| Footer | Role badge (gold), SUPPORT / SYSTEM LOG (muted, non-links) |

**Colors:** `bg-crucible-surface`, `border-crucible-border`, gold active accent.

---

### `Topbar.tsx`

**Role:** Network + auth + wallet controls.

| Element | Details |
|---------|---------|
| Network chip | Pill with cyan dot + “Stellar Testnet” |
| Fund wallet | Gold outline button + `Droplets` (Friendbot) |
| User chip | `User` icon (gold), display name, ADMIN (gold) / USER (cyan) |
| Connect / wallet | Freighter address + funded state |
| Sign out | `LogOut` icon button |

**Colors:** `bg-crucible-bg/80`, backdrop blur, gold CTAs, cyan network pip, red for wallet errors.

---

### `AuthGate.tsx`

**Role:** Gate pages behind Keycloak + Freighter.

| Element | Details |
|---------|---------|
| Public routes | `/`, `/login`, `/admin` pass through |
| Loading / redirect | Centered zinc uppercase status text |
| No wallet | `Wallet` icon (gold) + connect instructions |

---

### `LoginPanel.tsx`

**Role:** Reusable Keycloak username/password form.

| Element | Details |
|---------|---------|
| Atmosphere | Grid bg + gold/cyan blurred glows |
| Card | `.panel-border` form card |
| Brand | `ShieldCheck` + “Equidox” |
| Inputs | Username / password — `bg-black/40`, focus gold border |
| Submit | Primary gold fill, black text |
| Error | Red text |

**Motion:** Framer Motion fade/slide-in.

---

### `LifecycleTimeline.tsx`

**Role:** Vertical lifecycle steps (grant or per-milestone).

| Element | Details |
|---------|---------|
| Steps | Created → Deposited → Milestone → Submitted → AI Verified → Approved → Released → Passport |
| Done | Gold `CheckCircle2` |
| Active | Cyan ring / emphasis |
| Pending | Zinc `Circle` |
| Helpers | `buildGrantTimeline`, `buildMilestoneTimeline` |

**Colors:** Gold (done), cyan (active), zinc (pending), panel border container.

---

### `AiReportPanel.tsx`

**Role:** Full AI verification report card.

| Element | Details |
|---------|---------|
| Header | “AI Verification Report” + meta chips (milestone, status, model, time) |
| Score cards | Grid of labeled scores with animated bars |
| Recommendation chip | Gold border; approve vs warn icons |
| Lists | Strengths (cyan), weaknesses/fraud (red), missing (gold), suggestions (zinc) |
| Reasoning | Collapsible section |

**Score accents:** lime (overall Score), cyan (feature completion / tests), gold (quality / architecture), red (security / risk).

---

### `AiCopilot.tsx`

**Role:** Chat over the current AI report.

| Element | Details |
|---------|---------|
| Header | `Bot` icon (cyan) + title |
| Suggestion chips | Outline buttons for canned questions |
| Message list | User / assistant bubbles in panel |
| Input + send | Text field + `Send` button |

**Colors:** Panel surface, cyan icon, zinc muted copy, gold/cyan interactive chips.

---

### Context UI (not layout pages, but visible)

| File | UI behavior |
|------|-------------|
| `ToastContext.tsx` | Fixed bottom-right toasts: success=cyan border, error=red, info=gold; Framer Motion enter/exit |
| `AuthContext.tsx` | No visual — session state |
| `WalletContext.tsx` | No visual — Freighter connect/sign |

---

## 6. Pages (`frontend/src/app/`)

### `/` — Landing (`page.tsx`)

Marketing hero: brand-first layout, grid atmosphere, gold/cyan accents, CTA into login/dashboard.

### `/login` · `/admin`

Auth shells using `LoginPanel` (user vs admin defaults). No sidebar/topbar (`AppChrome` auth mode).

### `/dashboard`

| Blocks | Elements |
|--------|----------|
| Stat cards | Active grants, escrow, backend online, passport score |
| Incoming submissions (admin) | Links into `/verification/[id]` |
| Live grants list | Escrow progress bars (cyan), cancel (red outline) |
| Event log | Gold timestamps, cyan tx links |
| Top builders | Activity icons |

### `/grants`

| Blocks | Elements |
|--------|----------|
| Create grant form (admin) | Title, description, builder, reviewer, budget inputs |
| Registered grants list | Status chips, Manage Escrow, Open Review / Submit |
| Modals | Escrow deposit, add milestone |

**Form inputs:** `bg-black`, `border-crucible-border`, `text-white`, 10px uppercase labels.

### `/review` (admin)

Incoming submissions queue + all-grants list with “Open review” (cyan outline).

### `/submit` (user)

Available grants list with “View & submit” (gold outline).

### `/verification/[id]`

| Blocks | Elements |
|--------|----------|
| Milestone picker | Select milestone to hydrate |
| Evidence form (user) | Repo / demo / docs / commit / notes |
| Admin actions | Analyze & Anchor, Approve & Release (cyan), Reject (red) |
| AI report | `AiReportPanel` |
| Sidebar scores | Score bars for architecture categories |
| Copilot | `AiCopilot` |
| Timeline | `LifecycleTimeline` |
| Premium (x402) | Report-type select + unlock |

### `/builder/[id]`

Builder Passport: reputation score, completed milestones, funds received, verification history, Stellar Expert links.

---

## 7. Common UI element patterns

| Pattern | Classes / look |
|---------|----------------|
| **Primary button** | `bg-crucible-gold text-black text-xs font-bold uppercase tracking-widest` |
| **Secondary / info button** | `border border-crucible-cyan text-crucible-cyan hover:bg-crucible-cyan/10` |
| **Danger button** | `border border-crucible-red text-crucible-red hover:bg-crucible-red/10` |
| **Neutral button** | `border border-crucible-border text-zinc-400 hover:bg-white/5` |
| **Panel card** | `panel-border p-4` / `p-5` |
| **Text input** | `bg-black border border-crucible-border px-3 py-2 text-xs text-white` |
| **Section label** | `text-[10px] font-bold uppercase tracking-widest text-zinc-500` |
| **Status pill** | Border + tinted text (cyan/gold/red) + optional `/10` bg |
| **Progress bar track** | `h-1.5 bg-black border border-crucible-border` |
| **Progress bar fill** | `bg-crucible-cyan` / gold / lime / red by metric |

---

## 8. Icon library

**Lucide React** throughout. Frequent icons:

`Home`, `Terminal`, `Database`, `Users`, `ShieldCheck`, `Wallet`, `User`, `LogOut`, `Droplets`, `Bot`, `Send`, `CheckCircle2`, `AlertTriangle`, `FileText`, `ShieldAlert`, `ArrowRight`, `Upload`, `Sparkles`, `Filter`, `Plus`, `Activity`, `GitMerge`, `Trash2`, `Circle`, `Lock`, `HelpCircle`, `Code`, `ExternalLink`, `Globe`, `DollarSign`

---

## 9. Motion

**Framer Motion** used for:

- Login panel entrance
- Dashboard / report score cards
- Toast enter/exit
- Timeline step highlights
- Score bar width animations in `AiReportPanel`

---

## 10. File map (quick reference)

```
frontend/src/
├── app/
│   ├── globals.css          ← colors, panel, grid, scrollbar
│   ├── layout.tsx           ← fonts + providers + chrome
│   ├── page.tsx             ← landing
│   ├── dashboard/
│   ├── grants/
│   ├── review/
│   ├── submit/
│   ├── verification/[id]/
│   ├── builder/[id]/
│   ├── login/
│   └── admin/
├── components/
│   ├── AppChrome.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   ├── AuthGate.tsx
│   ├── LoginPanel.tsx
│   ├── LifecycleTimeline.tsx
│   ├── AiReportPanel.tsx
│   └── AiCopilot.tsx
└── context/
    ├── AuthContext.tsx
    ├── WalletContext.tsx
    └── ToastContext.tsx     ← toast UI
```

---

## 11. Color cheat sheet (copy-paste)

```
Background:  #0f0f11
Surface:     #17171a
Border:      #2a2a2d
Gold:        #DEFF3B
Cyan:        #00E5FF
Red:         #f87171
Body text:   #9ca3af (foreground) / zinc-400 in pages
Headings:    #FFFFFF
```
