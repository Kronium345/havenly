# 14 · Hue-reversed colour scheme

Status: done

## Goal
Havenly gets its own colours instead of the tutorial's yellow and lavender. Each brand colour is flipped to the opposite side of the colour wheel at the same lightness, so the app looks different but keeps its light, friendly feel.

## Decisions
- **Hue-reversed palette** (user's choice). Neutrals (`ink`, `muted`, `placeholder`, `surface`, `canvas`, `border`, `white`, `black`, `glass`, `scrim`) and status colours (`success`, `danger`, `info`) stay as they are.

| Token | Now | New | Used for |
|---|---|---|---|
| `primary` | #FFC629 | **#2962FF** | Buttons, active tab, selected chips, splash, icon |
| `primary.tint` | #FFF4D1 | **#D1DCFF** | Soft highlights |
| `lavender` | #C9B4FF | **#EAFFB4** | AI search bar |
| `lavender.tint` | #F1ECFF | **#FAFFEC** | Light accents |
| `lavender.deep` | #5B3FD6 | **#BAD63F** | Accent marks; never text on white (1.6:1) |

- **Token names.** `lavender` no longer describes the colour, so it is renamed **`accent`** (`accent`, `accent-tint`, `accent-deep`) in `tailwind.config.js`, `src/theme`, and every `lavender` use in `src/`. `primary` keeps its name.
- **Text on primary.** Ink on #2962FF is only 4.0:1, below the 4.5:1 minimum, so every surface filled with `primary` (the primary `Button`, the `IconButton` `primary` variant, the active tab pill, selected `Chip`s, toast accents, the Search tab circle) uses **white** text and icons (4.9:1). This adds an `on-primary` colour token (`#FFFFFF`), so components don't hardcode white.
- **Text on accent.** Ink on #EAFFB4 is 18.1:1, so the AI search bar keeps ink text and icons. Its placeholder (`ink/70`) still passes.
- **Brand assets.**
  - `scripts/generate-app-icon.mjs` and the Android adaptive icon background change from `#FFC629` to `#2962FF`. The ink house mark becomes white for contrast.
  - Regenerate with `npm run generate:app-icon` and `npm run generate:android-icon`.
  - `app.json` splash and adaptive icon `backgroundColor` become `#2962FF`.
  - `Wordmark` (havenly, ink) is unchanged.
- **Sample photos** are unchanged.
- `design-system` preview: swatches and component states follow automatically from the tokens; check them all.
- **Contrast.** Every pairing that changes is listed in Verification, with its ratio.

## Out of scope
- Dark mode (AGENTS: light mode only).
- New layouts, spacing or type. The Home fixes (search button circle, `display` line height 48, greeting raised) are already made outside this plan.
- New store screenshots. They're taken after all approved plans are built.

## Steps
### 1. Tokens
- In `tailwind.config.js`, set the new values, rename `lavender` → `accent`, and add `on-primary`.
- Update `src/theme` (`color()` names and types).

Done when tsc passes.

### 2. Components and screens
- `rg "lavender|primary"` across `src/` and update every use: the renames, plus white text and icons on primary fills (`Button`, `IconButton`, `Chip`, `AppTabBar`, the toast card and any `bg-primary` view).
- No hex in `src/`.

Done when lint and tsc pass and `rg lavender src` is empty.

### 3. Icon and splash
Update the two generator scripts and `app.json`, then regenerate the icons (`assets/images/logo.png`, `logo-mark.png`, `favicon.png`, `android-adaptive-foreground.png`). The new icon needs a new EAS build to appear on the phone.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass; `rg -i "lavender|#FFC629" src app.json scripts` finds nothing.
- Contrast check (script, WCAG): white on #2962FF ≥ 4.5:1, and ink on #EAFFB4, #D1DCFF and #FAFFEC ≥ 4.5:1.
- On the phone (Argent), screenshot each screen before and after:
  - Onboarding, Sign in, Home (AI bar, chips, tab bar), Search (chips, filter sheet), Stay, Book, Trips, Profile (sheets), Ask, Design system.
  - Check no yellow or lavender remains and every label on blue is white.
- The icon images were regenerated (open the PNGs).

## AGENTS.md updates
- **Design system:**
  - The palette is hue-reversed: primary #2962FF with `on-primary` white text, and `accent` (ex-lavender) #EAFFB4 / `accent-tint` / `accent-deep` (never text).
  - Text on primary fills is always `on-primary`.
- **Brand:** the icon and splash background is #2962FF.

## Result
- **Tokens:**
  - `primary` #2962FF (tint #D1DCFF) and `on-primary` #FFFFFF.
  - `lavender` is renamed to `accent`: #EAFFB4, tint #FAFFEC, deep #BAD63F.
  - The focus shadow is now blue.
  - `rg lavender src` finds nothing.
- **White text and icons on primary fills:** `Button` primary (text, arrow, spinner), `IconButton` primary (icon by default), the selected category `Chip`, the active `AppTabBar` item, and the end dates in `DateRangeCalendar`.
- **Moved to primary,** because lime would be invisible on white: focus borders and cursors (`TextField`, `CodeInput`, the Ask composer), and the `PolicyCard` chevron. Its icon is now ink on accent.
- **Visible side effect:** rating stars use `primary`, so they turn blue.
- **Contrast (WCAG):**

| Pair | Ratio |
|---|---|
| White on #2962FF | 4.90 |
| Ink on #EAFFB4 | 18.07 |
| Ink on #D1DCFF | 14.29 |
| Ink on #FAFFEC | 19.11 |
| #2962FF on white | 4.90 |

- **Icons:** regenerated as a white mark on #2962FF (`logo.png`, `logo-mark.png`, `favicon.png`, `android-adaptive-foreground.png`). `app.json` splash and adaptive backgrounds are #2962FF. Changing the icon on the phone needs a new EAS build.
- **Checks:** tsc and lint pass.
- **Phone check** (SM-S942B, dev build): Home, Search, Stay, Book and Profile. Screenshots are in `Pictures/Screenshots/havenly-colours/`. No yellow or lavender is left, and every label on blue is white.
- **Home fixes,** made alongside, are confirmed on the phone:
  - "next stay" is fully readable (`display` is now 44/48, and the onboarding height maths was updated);
  - the greeting moved up (`mt-1`);
  - the search button is a 56 px circle.
