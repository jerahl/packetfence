# pfappserver-v2 — PacketFence admin UI redesign (Phase 2 strangler)

A sibling Vue 3 + Vite app that ports the design from
[Claude Design: PacketFence Redesign](https://api.anthropic.com/v1/design/h/7Tm5he3xisUqPYgw5k0T-w?open_file=PacketFence+Redesign.html).
Runs alongside the existing Vue 2 app (`html/pfappserver/root/`) — does **not**
touch it — and is served under `/admin/v2/*`. The existing admin remains at
`/admin/` until each section here reaches parity.

## What's in this first cut

- **Foundation**: Vite, Vue 3, Vue Router 4, Pinia, Vue I18n 9. No CSS framework
  — the design's `styles.css` is ported directly as four token/component files
  in `src/assets/styles/`. IBM Plex Sans + Mono via Google Fonts.
- **App shell**: collapsible sidebar with three-group IA (Operate · Govern ·
  System / 8 items), breadcrumb top bar, ⌘K command palette (Cmd/Ctrl+K),
  inspector drawer (slides in from the right inside `<main>`).
- **Pages**:
  - `/overview` — KPI grid with sparklines, 24h auth area chart, posture donut,
    open security events feed, switch health, recent endpoints table.
  - `/endpoints` — search/filter/bulk-action table, row click opens the
    inspector drawer with Overview/Timeline/Events/Raw tabs.
  - All other routes (`identities`, `network`, `policies`, `security`,
    `reports`, `settings`) render a Placeholder pointing back at `/admin/`.
- **Mock data** in `src/data/mock.js` ported verbatim from the design.

Theme (dark/light), density (tight/balanced/spacious), accent hue (5 presets),
and sidebar-collapse state are stored in Pinia and persisted to localStorage.
Theme + accent toggles are wired into the top bar; density and accent pickers
will land in the Settings view in a follow-up.

## What it isn't yet

- **No real API wiring.** Views read `src/data/mock.js`. Wiring to the
  PacketFence API + Netdata `/api/v1/data` is the next step; `vite.config.js`
  already proxies `/api` and `/netdata` to the dev pfappserver.
- **No auth.** Will share the existing session cookie once routed behind the
  same reverse proxy.
- **No focus-trap / ARIA polish** on the modal/drawer. The picked stack
  includes `reka-ui` as the planned upgrade path for those primitives; it's
  not added as a dep until we adopt it.
- **Only 2 of 8 pages.** The remaining six (Identities, Network, Policies,
  Security, Reports, Settings) plus their inspectors/forms come in follow-ups.

## Build & run (dev)

```bash
cd html/pfappserver-v2
npm install
npm run dev                       # http://localhost:8082/admin/v2/
# point at a remote PF dev box:
VITE_API_HOST=https://pfdev:1443 npm run dev
```

Production build:
```bash
npm run build                     # writes dist/
```

## Wiring into the reverse proxy (strangler)

The app is built with `base: '/admin/v2/'` so all asset URLs and the
Vue-Router history line up. To slot it in, route `/admin/v2/*` at PF's
reverse proxy (Caddy / HAProxy) to the build output:

**Caddy example** (sketch — actual file is `conf/caddy-services/*`):
```caddyfile
handle_path /admin/v2/* {
    root * /usr/local/pf/html/pfappserver-v2/dist
    try_files {path} /index.html
    file_server
}
```

`try_files {path} /index.html` is required so Vue Router 4 history mode resolves
deep links like `/admin/v2/endpoints` to `index.html`.

Auth and `/api/*` and `/netdata/*` already work through the existing proxy —
no change needed; this app simply lives at a parallel path.

## Repo layout

```
src/
  main.js                # entry: Pinia, Router, I18n, global CSS
  App.vue                # applies theme/density/accent to <html>, owns ⌘K key handler
  router/index.js        # 8 routes; base /admin/v2/
  stores/
    tweaks.js            # theme / density / accent / collapsed (persisted)
    ui.js                # cmdkOpen, inspectorNode (transient)
  data/mock.js           # design's mock NAC data (swap for API later)
  assets/styles/
    tokens.css           # design tokens (light/dark/density)
    base.css             # html/body/scrollbar
    shell.css            # sidebar, top bar, inspector drawer
    components.css       # cards, buttons, chips, tables, KPI/charts, cmdk
  components/
    Icon.vue             # ~45 inline 16px SVG icons
    shell/{AppShell,Sidebar,TopBar}.vue
    inspector/InspectorDrawer.vue
    cmdk/CommandPalette.vue
    ui/{StatusChip,SparkArea,AreaChart,Donut}.vue
  views/
    Overview.vue
    Endpoints.vue
    Placeholder.vue      # used by the 6 unimplemented routes
```

## Notes on the port

- The design's React `app.jsx` keeps section state in a single `useState`; here
  each section is a real Vue Router route so deep-linking and the browser back
  button work naturally.
- The inspector drawer in the design is positioned absolutely inside `<main>`
  (so the sidebar/top bar stay visible while it's open). Kept that pattern in
  `AppShell.vue` rather than promoting it to a global modal — preserves the
  "inspect-in-context" feel.
- `AreaChart` uses `useId()` to namespace its SVG gradient ids; multiple
  instances on the same page won't collide.
- All five accent presets share the same lightness curve via `oklch()`; the
  hue is the only thing that swaps. Done imperatively in `App.vue:watchEffect`.
