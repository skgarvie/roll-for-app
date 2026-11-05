# RollFor

D&D 2024 character sheets and Apple Pencil session notes, as an offline-first PWA for iPad.
See [PLAN.md](PLAN.md) for the full implementation plan.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm

## Scripts

| Command                 | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Dev server on http://localhost:5173 (no service worker)     |
| `npm run dev:https`     | Dev server over trusted HTTPS on your LAN, for iPad testing |
| `npm run build`         | Type-check and build to `dist/` (generates icons + SW)      |
| `npm run preview`       | Serve the production build on http://localhost:4173         |
| `npm run preview:https` | Serve the production build over HTTPS on your LAN           |
| `npm test`              | Unit tests (Vitest)                                         |
| `npm run test:e2e`      | End-to-end tests in WebKit at iPad sizes (Playwright)       |
| `npm run lint`          | ESLint                                                      |
| `npm run format`        | Prettier                                                    |

First-time e2e setup: `npx playwright install webkit`.

Icons, the apple-touch-icon and iPad splash screens are generated from
[public/logo.svg](public/logo.svg) at build time (see [pwa-assets.config.ts](pwa-assets.config.ts)).

## Testing on an iPad

Service workers need HTTPS, and iOS must trust the certificate.

1. Run `npm run dev:https` once on the Mac. The first run downloads mkcert and
   installs a local certificate authority (macOS asks for your password).
2. AirDrop `~/.vite-plugin-mkcert/rootCA.pem` to the iPad.
3. On the iPad: **Settings → General → VPN & Device Management** → install the
   profile, then **Settings → General → About → Certificate Trust Settings** →
   turn on full trust for the mkcert root.
4. To test offline/install behaviour, run `npm run build && npm run preview:https`,
   open the printed `Network:` URL (e.g. `https://192.168.1.20:4173`) in Safari,
   then **Share → Add to Home Screen**.
5. Launch from the Home Screen, turn on Airplane Mode, and relaunch. The app
   should still load.

Notes:

- Home Screen apps and Safari tabs have **separate** storage on iOS.
- The service worker is only active in builds (`preview`), not in `npm run dev`.
- Debug with Safari on the Mac: **Develop → [iPad name] → RollFor** (enable Web
  Inspector on the iPad under Settings → Apps → Safari → Advanced).

## Deploying to GitHub Pages

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs lint, format check, unit tests
and WebKit e2e tests on every push and pull request. Pushes to `main` (or a manual
**Run workflow**) then build and deploy to GitHub Pages.

One-time setup in the GitHub repo: **Settings → Pages → Build and deployment → Source:
GitHub Actions**.

The site is served from `https://<user>.github.io/<repo>/`. The workflow reads the
base path from GitHub Pages and passes it to the build as `BASE_PATH`, so a custom
domain or a `<user>.github.io` repo also works. To try a subpath build locally:

```sh
BASE_PATH=/RollFor/ npm run build && BASE_PATH=/RollFor/ npm run preview
# open http://localhost:4173/RollFor/
```

On the iPad, open the Pages URL in Safari and **Share → Add to Home Screen**. No
local certificate is needed, because GitHub Pages is served over HTTPS.
