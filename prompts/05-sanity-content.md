# 05 · Sanity content: project, Studio, schema, seeded stays, embeddings

Status: done

## Goal
Havenly's stays live in Sanity: a new project with a `production` dataset, a standalone Studio in `studio/` (deployed), a property/host/policy schema shaped by `search.png` and `property-details.png`, about 20 seeded stays with photos, and Dataset Embeddings switched on so plan 06 can rank stays by meaning. The app itself doesn't change in this plan; plan 06 builds Search and the AI bar on top.

## Decisions
- **Order (user choice):** Sanity first (this plan), then Search + AI bar (plan 06, `search.png`, GROQ filters + embedding ranking through an API route). Jev is added in a later plan once `TYPESAFE_AI_API_KEY` exists (user has none yet). Trips waits for Property details + booking (user choice); its tab keeps the "coming next" toast.
- **New Sanity project (user choice):** created with the Sanity CLI. You log in once (`npx sanity login`, browser). Project name "Havenly", dataset `production`, **public** read (published stay data only; drafts are never public). Organization: your personal one.
- **Studio:** standalone Sanity Studio in `studio/` (its own `package.json`, TypeScript, clean template, `npm create sanity@latest`), with Studio's own `npm` (not `npx expo install`, which is for the app). Deployed with `npx sanity deploy` as `havenly.sanity.studio` (or the nearest free hostname) — required later by Sanity Context.
- **Agent tooling:** add the Sanity MCP (`claude mcp add Sanity -t http https://mcp.sanity.io --scope user`, OAuth on next start) and Sanity's agent skills (`npx skills add sanity-io/agent-toolkit`, reviewed before use). Schema deploys and content go through the MCP, per AGENTS.md. If the MCP can't upload images, a local seed script in `studio/scripts/` uses a write token from `studio/.env` (gitignored), never the app.
- **Schema (from the designs; Sanity generates IDs; relationships are references):**
  - `property`: `title`, `slug`, `propertyType` (list: `cabin`, `villa`, `house`, `apartment`, `a-frame`, `cottage`), `category` (list matching home chips: `cabins`, `beach`, `city`, `villas`), `place` (object: `city`, `region` e.g. "CA", `country`), `location` (geopoint), `pricePerNight` (number, USD, whole dollars), `maxGuests`, `bedrooms`, `beds`, `bathrooms`, `petsAllowed` (boolean), `amenities` (array of strings from a fixed list: `hotTub`, `pool`, `wifi`, `fireplace`, `oceanView`, `forestViews`, `mountainViews`, `kitchen`, `parking`, `airConditioning`, `washer`, `workspace`, `evCharger`, `beachAccess`), `rating` (0–5, one decimal), `reviewCount`, `images` (array of `image` with required `alt`, hotspot on), `summary` (one sentence for cards), `description` (2–4 sentences of vibe: quiet, cozy, views — this is what embeddings match "soft intent" against), `houseRules` (array of strings), `checkInTime`, `checkOutTime`, `host` (reference → `host`), `cancellationPolicy` (reference → `policy`).
  - `host`: `name`, `superhost` (boolean), `joinedYear`, `bio`. No photos of real people: the app shows an initial.
  - `policy` (Havenly's own policies): `title`, `topic` (list: `cancellation`, `pets`, `checkIn`, `payments`, `damage`, `houseRules`, `safety`), `summary` (one line, e.g. "Full refund up to 7 days before check-in."), `body` (plain text, the exact words policy answers will quote).
- **Seed content:** ~20 invented stays (names, hosts, places and copy are fictional; places are real towns), spread over the four categories, price $95–$650, 2–12 guests, about half pet friendly, mostly California plus a few elsewhere so "Cabins in California" and "under $300" give non-trivial results. Includes the design's stays (Modern Cabin with Hot Tub — Lake Arrowhead, $289; Oceanview Villa with Private Pool — Malibu, $412; A-Frame in the Redwoods — Monte Rio, $236; Designer Home in Wine Country — Healdsburg). 6 hosts, 3 cancellation policies (Flexible / Moderate / Strict) and one policy per other topic, written in plain words. Photos: Unsplash images (each checked to return 200), uploaded as Sanity image assets with alt text, 1–3 per stay.
- **Embeddings:** enabled on `production` with a projection limited to stay text: `_type == "property" => { title, propertyType, category, summary, description, amenities, place }`. Policies and hosts aren't embedded (search ranks stays; policy answers use Sanity Context later). Status must reach `ready`.
- **Environment:** app side gets `EXPO_PUBLIC_SANITY_PROJECT_ID` and `EXPO_PUBLIC_SANITY_DATASET` (public values, safe in the bundle). No token in the app. `.env.example` gains the names. Studio's `studio/.env` (gitignored) holds `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`, and the seed write token only if the seed script is needed; delete that token after seeding.
- **CORS:** add `http://localhost:8081` and `http://127.0.0.1:8081` (credentials off) so the web build can read published content.

## Out of scope
- Any app screen changes (Search, AI bar, property details, home on Sanity data: plan 06+).
- Jev, API routes, Sanity Context endpoint, Agent Actions copy generation, bookings and Trips.

## Steps
### 1. Tools and login
You: run `! npx sanity login` and approve in the browser. Me: add the Sanity MCP (you restart Claude Code and finish OAuth via `/mcp`), install Sanity's agent skills after reading them. Done: `npx sanity projects list` works.

### 2. Project, dataset, Studio
`npm create sanity@latest -- --project-name Havenly --dataset production --visibility public --template clean --typescript --output-path studio` (flags checked against `--help` first). Add `studio/.env` and gitignore entries, app env names, CORS origins. Done: `cd studio && npm run dev` opens an empty Studio at localhost:3333.

### 3. Schema
Write `studio/schemaTypes/{property,host,policy}.ts` per Decisions, with validation (required title, price > 0, guests ≥ 1, rating 0–5, alt required), previews (title, place, price, first image). Deploy the schema (MCP `deploy_schema` or `npx sanity schema deploy`) and the Studio (`npx sanity deploy`). Done: Studio shows the three types; schema listed by MCP `list_workspace_schemas`.

### 4. Seed
Create policies, hosts, then stays (with uploaded images) through the MCP, and publish them. Done: GROQ `count(*[_type=="property"])` ≈ 20, every stay has ≥1 image, a host and a cancellation policy.

### 5. Embeddings
`npx sanity datasets embeddings enable production --projection='…' --wait`, then `status` = `ready`. Done: a test query `*[_type=="property"] | score(text::semanticSimilarity("quiet cabin in the forest")) | order(_score desc)[0...3]{title, _score}` returns forest cabins first.

### 6. Close out
Verification, AGENTS.md updates, `## Result`.

## Verification
- `npx tsc --noEmit` and `npx expo lint` (app unchanged, still pass); `studio/` builds (`npm run build`) with no type errors.
- Studio runs locally and is deployed; the three types are editable; validation rejects a stay with no price.
- GROQ checks (via MCP `query_documents`), with params:
  - `*[_type=="property" && pricePerNight < $max]` with `max: 300` returns only stays under $300.
  - `*[_type=="property" && petsAllowed && "hotTub" in amenities]` returns the pet-friendly hot-tub stays (≥2).
  - `*[_type=="property" && place.region == $region && propertyType in ["cabin","a-frame"]]` with `region: "CA"` returns the California cabins.
  - Semantic: "quiet secluded cabin" ranks forest cabins above city apartments; "beachfront with pool" ranks Malibu villa first.
- Public read: `https://<projectId>.apicdn.sanity.io/v2025-02-19/data/query/production?query=count(*[_type=="property"])` returns the count without a token.
- `git status` shows no `.env` or token files.

## AGENTS.md updates
- **Commands:** Studio commands (`cd studio && npm run dev`, `npx sanity deploy`, `npx sanity schema deploy`, embeddings status).
- **Who owns what → Content:** project/dataset names, public dataset, the schema's types and the fixed amenity/type/category lists (code filters depend on them), embeddings projection fields.
- **Rules:** app reads Sanity with public env values only; write tokens live in `studio/.env` and are deleted after seeding.

## Result
Sanity holds Havenly's content: project `wutkash1` ("Havenly", org Kronium345), public `production` dataset, standalone Studio in `studio/` deployed (app id `bgp957hcym3xulab6fayrrs5`, opened from sanity.io/manage), schema deployed, and embeddings `ready` for stays only.

Seeded through the Sanity MCP (no write token was created): 9 policies (Flexible / Moderate / Strict cancellation, pets, check-in, payments, damage, house rules, safety), 6 hosts, 24 stays (10 cabins, 5 beach, 4 city, 5 villas; 21 in CA, 2 in HI, 1 each in MT and OR; $95–$650), each with one Unsplash photo uploaded as a Sanity image with alt text.

Changes from the plan:
- The project and dataset already existed (created when you signed up), so they were reused instead of created.
- Studio reads project/dataset from `sanity.config.ts` / `sanity.cli.ts` (the template's defaults; public values), so no `studio/.env` was needed. `studio/.gitignore` ignores `.env*` in case a token is ever added.
- The app's `tsconfig.json` excludes `studio`, and `eslint.config.js` ignores `studio/*`, so the app's checks don't crawl the Studio.
- 24 stays instead of ~20; one photo each.

Verified: GROQ with params (`max: 300` → 14 stays, all under $300; pets + hot tub → 2; CA cabins/A-frames → 6); semantic ranking ("quiet secluded cabin in the forest" → Log Cabin in the Woods first, then forest cabins; "beachfront with a pool" → Oceanview Villa first); public CDN read without a token returns 24; all 24 stays pass schema validation and a stay with no price fails it (temporary draft discarded).
