# Deployment notes

## Providers and cost

| Capability | Provider | Plan | Billing behavior used here |
|---|---|---|---|
| Source control and CI | GitHub public repository | Free | Standard hosted runners are free for public repositories |
| Web hosting and CDN | Vercel Hobby | Free personal/non-commercial | No billing cycle; included-resource caps pause service rather than create a bill |
| Data source | AGMARKNET 2.0 | Public government service | Keyless read access |

No database, object store, Python host, paid domain, AI API, paid model registry, trial credit, card,
or auto-scaling billable resource exists.

The Hobby plan is appropriate only because this is a personal, non-commercial portfolio project.
If that purpose changes, the deployment plan must be reassessed before traffic or ownership changes.

## Vercel configuration

- Project: `mandilens`
- Production URL: <https://mandilens.vercel.app>
- Framework: Next.js
- Root directory: `apps/web`
- Node.js: 24.x from `package.json`
- Build command: `npm run build`
- Output: Next.js-managed static and metadata routes
- Environment variables: none required

The production application reads `/data/mandilens.json` from the same origin. There is no external
runtime data fetch and no browser credential.

## Manual deployment

From the repository root:

```bash
npm ci --prefix apps/web
npm run build --prefix apps/web
cd apps/web
npx --yes vercel@56.3.2 --prod
```

The repository is linked to the existing Vercel project through ignored `.vercel` metadata. Never
commit that local directory or `.env.local`.

## Git deployment

The public GitHub repository is connected to Vercel with `apps/web` as its root. A passing data
refresh commits versioned artifacts to `main`; the Git integration then builds and deploys the new
static snapshot.

## Production verification checklist

- `/`, `/data-quality`, `/model-performance`, `/methodology`, `/sources`, and `/limitations` return
  successful public responses after a fresh load.
- `/data/mandilens.json` returns the production artifact with no secret or local path.
- Commodity, district, market, horizon, and history controls update the view.
- Both observed and forecast series render, including the interval area.
- Quantity conversion and per-market costs produce the independently checked net result.
- Changing a cost can change market order.
- CSV download is local and contains the current comparison.
- Desktop and mobile layouts have no viewport-level horizontal overflow.
- Navigation and source links are keyboard reachable.
- Console contains no unexpected errors; network requests remain same-origin except deliberate source
  link navigation.
- Response security headers are present.

## Cold start and quota behavior

The deployed routes and artifact are static, so there is no sleeping backend or model cold start.
The first uncached data request downloads roughly 390 KB compressed. If Vercel Hobby limits are
exceeded, the project can pause; it is not configured to charge for overage.
