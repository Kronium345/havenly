# 12 · Search timing

Status: done

## Goal
Every `/api/search` response says how long each server step took, so we can see where a search's time goes and decide whether caching is worth doing. On the phone, `/api/search` took 3.49 s, but the search work measured from a script is only 0.5–0.7 s. This plan finds the missing 1.5–2 s. It changes no behaviour.

## Decisions
- **Header everywhere, log in dev** (user's choice). Every `/api/search` response carries a standard `Server-Timing` header: step names and whole milliseconds only, never text the guest typed, filters or ids. In development the server also logs one line per search, `search timing: session=… cities=… read=… query=… total=…`.
- **Steps timed:**
  - `session`: `requireSession`, including Clerk's token check.
  - `cities`: `knownCities`.
  - `read`: `readQuery`, which covers Jev and the code parser.
  - `query`: `searchStays`. Its description says `context` or `direct`, so a fallback shows.
  - `total`: the whole handler.
- **Cache checks:**
  - `cities` gets the description `hit` or `miss`.
  - `instance` reports how many ms ago the route's server module was loaded. Small numbers on every request would prove the dev server reloads the route each time, which throws away the in-memory caches (the city list, Clerk's signing keys, the Knowledge Base sentences).
- One small helper, `src/lib/server/timing.ts` (`createTimer()` → `time(name, fn, desc?)`, `mark(name, ms, desc?)`, `header()`), used only by `search+api.ts` for now. The steps it calls stay unchanged, except that `knownCities` and `searchStays` also report whether the cache was used and which path answered.
- The header is written on every response: 200, 400, 401 and 502. A 401 carries `session` and `total` only.
- No new dependency. The header is a plain string, readable in Argent's network details and in browser devtools.

## Out of scope
- Any caching or speed fix. A follow-up plan picks those based on these numbers.
- Timing other API routes. The Ask route, which takes 3–4.6 s on the phone, can reuse the helper later.
- Timing in the app. If the server's `total` comes out much smaller than what the phone sees, the gap is the phone, the network or the dev server, and the follow-up looks there.

## Steps
### 1. Timer helper
Add `src/lib/server/timing.ts`:
- `createTimer()` returns:
  - `time<T>(name, fn: () => Promise<T>, desc?)`;
  - `mark(name, ms, desc?)`;
  - `header()`, which builds `name;dur=12;desc="hit", …` per the Server-Timing format, keeping names to `[a-z]` and descriptions to known words.
- A module-level `const loadedAt = Date.now()` gives the `instance` value.

Done when tsc passes.

### 2. Time the search route
- `search+api.ts` wraps each step with `time()` and adds `Server-Timing` to every response.
- `knownCities` returns `{ cities, cached }` and `searchStays` returns `via: "context" | "direct"`. Every caller is updated.
- In development (`process.env.NODE_ENV !== "production"`), the route logs one line per search.

Done when lint and tsc pass and a `curl` request without a session shows the header.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- `curl -i` the route without a session: the response is a 401 with `Server-Timing: session;dur=…, total;dur=…`.
- On the phone (Argent, dev build on 8081), search the test sentence ("I am looking for a quiet cabin in the woods…"), then the same sentence with "3 people":
  - read `/api/search`'s response headers with `view-network-request-details`;
  - compare its duration with the header's `total`.
- Report a table per search: phone duration, `total`, and each step with its cache flag and `instance`.
- Conclusion: say which part explains the delay (session, cities, Jev, Context, dev-server reloads, or time outside the server), and which fix that points to.

## AGENTS.md updates
- **Search parsing:** one line saying `/api/search` sends a `Server-Timing` header (step names and ms only) and logs one timing line in dev, and that timings never include what guests type.

## Result
- **Built:**
  - `src/lib/server/timing.ts` (`createTimer`);
  - a `Server-Timing` header on every `/api/search` response (200, 400, 401, 502);
  - one `search timing:` log line in dev;
  - `knownCities` → `{ cities, cached }` and `searchStays` → `via`.
  - tsc and lint pass. A `curl` without a session returns 401 with `session;dur=2, instance;dur=1, total;dur=2`.
- **Phone measurement** (SM-S942B, dev build on Metro 8081, 2026-10-27), test sentence with "4 people":

| What | ms |
|---|---|
| Phone sees `/api/search` take | 4,480 |
| Server handler `total` | 1,826 |
| `session` (Clerk `verifyToken`) | 555 |
| `cities` | 108 (miss) |
| `read` (Jev) | 266 |
| `query` (Context) | 406 |
| Handler time outside the steps (body parsing, response) | ~490 |
| `instance` | 2 |
| Outside the handler (Metro dev server + LAN) | ~2,650 |

- **Conclusion:**
  1. `instance` 1–2 ms on every request proves the dev server loads the route module fresh each time. Every in-memory cache is thrown away in dev: the city list (a miss every time), Clerk's signing keys (so `session` is 555 ms instead of a few ms) and the Knowledge Base sentences. Caching in module memory can't help in dev. It should work on EAS Hosting, where workers stay warm. Re-measure there before adding a shared cache.
  2. About 60% of the wait is outside the handler, in the dev server itself. A release build pointed at EAS Hosting is the real benchmark.
  3. Genuine wins, whatever the environment:
     - `verifyToken` with `jwtKey` (the instance's PEM public key) instead of fetching the keys over the network. That's 555 → ~5 ms.
     - Context's extra ~0.3 s versus direct Sanity.
- Not measured: a second sample (the phone disconnected).
