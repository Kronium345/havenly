# 01 · Design system

Status: done

## Goal
Every screen draws from one twrnc-based design system: Plus Jakarta Sans, the Havenly palette, a spacing scale, radii, shadows, shared text styles, and the shared components from the design sheet (sections 01–15). A `/design-system` preview screen shows all of them so they can be checked against the sheet.

## Decisions
- Source of truth: `tailwind.config.js` at the root. `src/theme/index.ts` builds one twrnc instance with `create(require("../../tailwind.config.js"))` and re-exports it as `tw`, together with the non-Tailwind tokens (`iconSize`, `motion`, `fonts`). Code imports everything from `@/theme`. There is no second token file.
- twrnc details checked in `node_modules/twrnc` v4.16.0: use `plugin` exported from `twrnc` (not `tailwindcss/plugin`). Each plugin keeps only its **last** `addUtilities` call, so put all utilities in one call. Utilities given as style objects pass through unchanged, so `boxShadow` strings work.
- Brand: the wordmark reads **"havenly"** in the designs' heavy lowercase style. The designs say "roam", but the app stays Havenly.
- Light mode only. `app.json` `userInterfaceStyle` changes from `automatic` to `light`. No `dark:` classes and no dark palette.
- Type sizes come from the phone screens, not the sheet's 56–64 Display (user choice). Heading matches both.
- Fonts load with `useFonts` in `src/app/_layout.tsx`, which keeps the splash screen up until they're loaded. This works in Expo Go and on web (user runs Expo Go on their phone). There's no config plugin for now.
- Each weight is its own family, so `font-regular`, `font-medium`, `font-semibold` and `font-bold` set `fontFamily` (twrnc's custom font utils), never `fontWeight`. iOS would otherwise synthesize the weight or fall back to the system font.
- Icons: `lucide-react-native` (plus its peer `react-native-svg`), at stroke width 2, size 24 by default and 20 inside chips and tags. Filled states (active tab, active category chip, rating star) pass `fill={color}`, because lucide only ships outline icons.
- Spacing: Tailwind's default numeric scale (1 = 4pt) is already a 4-point grid, so keep it, following the library's idiom. Add one named step, `screen` = 20, for the screen edge padding measured from the designs.
- Native controls stay native: Toggle wraps RN `Switch` with token colors. The tab bar's glass uses `GlassView` from `expo-glass-effect` (already installed), with a `glass` surface fallback where liquid glass isn't available.
- The tab bar is a presentational component only. Wiring it into navigation is a later plan.
- Verification happens on web in Chrome (I can screenshot that) plus Expo Go on the user's phone. The iOS simulator steps in AGENTS.md can't run on Windows.
- Estimated values (taken from images, not stated on the sheet) are marked `est.` below.

### Colors (`theme.extend` would keep Tailwind's palette, so these **replace** `theme.colors`)
| Token | Value | Use | Source |
|---|---|---|---|
| `primary` | #FFC629 | primary actions, active states, rating star | sheet |
| `primary-tint` | #FFF4D1 | "Guest favorite" tag | est. |
| `lavender` | #C9B4FF | secondary actions, AI search bar, selected filter chip | sheet |
| `lavender-tint` | #F1ECFF | policy cards, explorer badge | est. |
| `lavender-deep` | #5B3FD6 | policy card icons and chevrons, focused input border | est. |
| `ink` | #0B0B1A | headings, primary text, dark segmented control | sheet |
| `muted` | #6B7280 | body and secondary text | sheet |
| `placeholder` | #9CA3AF | input placeholders, "/ night" | est. |
| `surface` | #FFFFFF | cards, sheets, modals | sheet |
| `canvas` | #F4F5F7 | app background, input fields, chips, icon buttons | sheet |
| `border` | #E5E7EB | dividers, borders | sheet |
| `glass` | rgba(255,255,255,0.7) | tab bar, glass surfaces | sheet |
| `success` / `success-tint` | #1F9D55 / #E7F6EC | success alert, "New" tag | est. |
| `danger` / `danger-tint` | #E5484D / #FDECEE | error alert, "20% off" tag | est. |
| `info` / `info-tint` | #3B5BDB / #E8EEFF | "Superhost" tag | est. |
| `transparent`, `white`, `black` | as usual | overlays on photos | — |

### Fonts (`theme.fontFamily`; files copied to `assets/fonts/` with `OFL.txt`)
`regular` → PlusJakartaSans-Regular · `medium` → PlusJakartaSans-Medium · `semibold` → PlusJakartaSans-SemiBold · `bold` → PlusJakartaSans-Bold.

### Type scale (`theme.fontSize` as `[size, { lineHeight, letterSpacing }]`) and text utilities
| Utility (`addUtilities`) | Font | Size / line height | Tracking | Color | Use |
|---|---|---|---|---|---|
| `type-display` | bold | 44 / 44 (est.) | -1.5 | ink | hero titles |
| `type-heading` | bold | 30 / 36 | -0.8 | ink | screen and section titles |
| `type-title` | bold | 20 / 24 (est.) | -0.4 | ink | card titles, profile name |
| `type-headline` | semibold | 16 / 22 (est.) | 0 | ink | row titles, policy titles |
| `type-body` | regular | 16 / 24 | 0 | muted | paragraphs |
| `type-callout` | regular | 16 / 22 (est.) | 0 | ink | input text, row labels |
| `type-caption` | medium | 14 / 20 | 0 | muted | locations, meta |
| `type-label` | medium | 12 / 16 (est.) | 0 | ink | tab labels, small tags |
| `type-button` | semibold | 17 / 22 | -0.2 | ink | buttons |
| `type-price` | bold | 20 / 24 (est.) | -0.4 | ink | "$280" |
| `type-wordmark` | bold | 40 / 40 (est.) | -2 | ink | wordmark |

The sheet says Button is Medium, but every button on the screens renders heavier, so `type-button` uses SemiBold.

### Radii (`theme.borderRadius`, replaces defaults)
`none` 0 · `sm` 8 · `md` 12 · `lg` 16 (inputs, listing photo) · `xl` 20 (policy card, profile group) · `2xl` 24 (hero listing card) · `3xl` 32 (sheet top) · `full` 9999 (buttons, chips, icon buttons, tab bar). Everything except `lg` for inputs and `full` is est.

### Shadows (`addUtilities` style objects, `boxShadow`)
`shadow-card` `0 2px 8px rgba(11,11,26,0.06)` · `shadow-raised` `0 8px 24px rgba(11,11,26,0.10)` (tab bar, floating buttons on photos) · `shadow-focus` `0 0 0 4px rgba(201,180,255,0.35)` (focused input). All est.

### Other tokens (in `src/theme/index.ts`)
`iconSize = { sm: 16, md: 20, lg: 24 }` · `motion = { fast: 150, base: 250, slow: 400 }` · control heights `control = { sm: 36, md: 48, lg: 56 }` (est.: chips 36, inputs and icon buttons 48–56, primary button 56).

## Out of scope
- Dark mode.
- Real screens (home, search, details, auth, profile, onboarding) and tab navigation wiring.
- The custom wordmark artwork, and Google and Apple logos (see Assets).
- Renaming the app or changing the icon or splash.

## Assets
- Plus Jakarta Sans (4 weights + OFL) from `C:\Users\danie\Downloads\fonts\fonts` → `assets/fonts/`.
- `C:\Users\danie\Downloads\images\images` is byte-identical to the default template images (already in the repo or deleted on purpose), so nothing from it is used.
- **Missing, marked placeholders:**
  - Havenly wordmark: rendered as text in `type-wordmark`, not artwork.
  - Google "G" logo: lucide removed brand icons, so it shows a neutral circle placeholder labelled `G`.
  - Apple logo: same kind of placeholder.
- Sample photos and avatars on the preview screen use remote placeholder images through `expo-image`.

## Steps
### 1. Dependencies, fonts, tokens
- `npx expo install lucide-react-native react-native-svg`.
- Copy the fonts to `assets/fonts/`.
- Write `tailwind.config.js` with every table above: colors, fontFamily, fontSize, borderRadius, `spacing.screen`, and one twrnc `plugin` with all `type-*`, `shadow-*` and `glass` utilities.
- Create `src/theme/index.ts` (`tw`, `color()` helper wrapping `tw.color`, `iconSize`, `motion`, `control`, `fonts` map for `useFonts`).
- In `src/app/_layout.tsx`: call `useFonts(fonts)`, keep the splash screen up until fonts load or fail, and call `useDeviceContext(tw)`.
- Set `userInterfaceStyle: "light"` in `app.json`.
- Done when `tw\`type-display\`` resolves to the expected style object (spot-check in a scratch log) and `npx tsc --noEmit` passes.

### 2. Base primitives (`src/components/ui/`)
- `text.tsx`: `AppText`, with `variant` set to one of the `type-*` names (default `body`) and `style` merged last.
- `icon.tsx`: `Icon`, with `as` (a lucide component), `size` (`iconSize` key), `color` (token name, default `ink`) and `filled`.
- `wordmark.tsx`: `Wordmark`, marked as a placeholder.
- `button.tsx`: `Button` (sheet §04).
  - Variants: `primary` (primary background, ink text, optional trailing `ArrowRight`) and `secondary` (surface background with a 1px `border`, optional `leading` node for the Google/Apple placeholder).
  - Sizes: `md` 48 and `lg` 56.
  - States: pressed (opacity 0.85), disabled (0.4), loading (spinner, keeps its `accessibilityLabel`).
  - Shape: `rounded-full`.
- `icon-button.tsx`: `IconButton`, a circle.
  - Variants: `canvas` (gray), `surface` (white with `shadow-raised`, for use over photos) and `glass`.
  - Sizes: 44 and 56. Requires `accessibilityLabel`.

Each primitive exposes `accessibilityRole` and its state.

### 3. Inputs and selection (sheet §05, §06, §12, §13)
- `text-field.tsx`: `TextField` (sheet §05).
  - Shape: canvas background, `rounded-lg`, height 56, leading icon, `type-callout`.
  - Optional `label` above the value, as on the auth screen.
  - Variants: `search` (leading Search, trailing SlidersHorizontal action) and `default`.
  - `secureTextEntry` adds an Eye/EyeOff toggle.
  - Focused state: surface background, 1.5px `lavender-deep` border and `shadow-focus`.
- `chip.tsx`: `Chip` (sheet §06).
  - `filter` variant: no icon. Selected uses lavender background; unselected uses canvas background.
  - `category` variant: optional leading icon. Selected uses primary background with a filled icon; unselected uses canvas background.
  - Uses `accessibilityState.selected`.
- `segmented-control.tsx`: `SegmentedControl` (sheet §12). Options are `{ label, icon }`. Active segment is ink with white text; inactive is transparent with ink text. The track is canvas.
- `toggle.tsx`: `Toggle` (sheet §13), wrapping RN `Switch` with `trackColor` primary and the thumb set to surface.
- `stepper.tsx`: `Stepper` (sheet §13). Minus / value / Plus, `min`/`max` props, `type-title` value. Its buttons are disabled at the bounds.

### 4. Content components (sheet §07, §08, §09, §14, §15)
- `listing-card.tsx`: `ListingCard` (§07). A horizontal row:
  - Photo on the left (`rounded-lg`, with a heart `IconButton` overlay).
  - Title (`type-title`), MapPin + location (`type-caption`), filled star + rating + `(count)`.
  - Amenity `Badge`s, and price (`type-price`) + "/ night" (`type-caption`, placeholder color).

  It takes data props, because it is a domain component.
- `policy-card.tsx`: `PolicyCard` (§08).
  - Layout: lavender-tint background, `rounded-xl`, an icon tile (white at 60% on tint, `lavender-deep` icon), title `type-headline`, description `type-caption`, and a ChevronRight in `lavender-deep`.
  - Pressable, with pressed feedback.
- `profile-row.tsx`: `ProfileRow` + `ProfileRowGroup` (§09).
  - `ProfileRow`: icon tile, `type-callout` label, ChevronRight.
  - `ProfileRowGroup`: a surface group with `rounded-xl` and hairline `border` dividers between rows, not boxed rows.
- `status-banner.tsx`: `StatusBanner` (§14). Variants `success` (CircleCheck) and `error` (CircleAlert), tint background, `rounded-lg`, optional dismiss `X`. It sets `accessibilityRole="alert"`. It's named StatusBanner so it doesn't clash with RN `Alert`.
- `badge.tsx`: `Badge` (§15 + amenity pills). Variants: `neutral` (canvas, used for amenities), `favorite` (primary-tint + filled star), `new` (success-tint/success), `discount` (danger-tint/danger), `superhost` (info-tint/info). Optional icon, `rounded-full`, `type-label` or `type-caption`.

### 5. Tab bar and preview screen (sheet §10, §11)
- `tab-bar.tsx`: `TabBar` (§10).
  - Layout: a `GlassView` pill (fallback: `glass` + `border`) with `shadow-raised` and `rounded-full`. Items are `{ key, label, icon }` with `activeKey` and `onPress`.
  - The active item is a primary circle with a filled icon. Labels use `type-label`.
  - Presentational only.
- `src/app/design-system.tsx`: a scrollable preview with one section per sheet block (01–15). §11 shows the icon set used across the app: House, Search, Heart, Calendar, User, Settings, MapPin, SlidersHorizontal, Share, Bookmark, Lock, Mail, Eye/EyeOff, ChevronLeft/Right, ArrowRight, ArrowUpRight, Sparkles, Star, TreePine, Waves, Building2, TreePalm, Bath, PawPrint, Wifi, Mountain, Flame, MessageSquareMore, FileText, CreditCard, Luggage, Bell, CircleHelp, List, Map, Minus, Plus, CircleCheck, CircleAlert and X.
- `src/app/index.tsx`: keeps its welcome text, now in `AppText`, plus a link to `/design-system`.

## Verification
1. `npx tsc --noEmit` passes.
2. `npx expo lint` passes. There is no ESLint config yet, and the first run installs `eslint` + `eslint-config-expo` (a dev dependency, approved with this plan).
3. Drift grep: no hex or `rgba(` values outside `tailwind.config.js`, and no `fontSize`/`fontWeight` in `src/` except inside the theme.
4. Start `npx expo start --web`, open `http://localhost:8081/design-system` in Chrome, and screenshot each section. Compare with `design.png` section by section, and list and fix every difference (colors, type, spacing, radii, icons, copy).
5. On the user's phone in Expo Go: fonts render as Plus Jakarta Sans (not the system font), there's no flash of the system font (splash holds), Toggle and Stepper respond, TextField focus shows the lavender border, and the password eye toggles.
6. End to end: open the app at `/`, tap the design-system link, and scroll through all 15 sections with no console errors or warnings.

## AGENTS.md updates
- New section **Design system**:
  - Tokens live only in `tailwind.config.js`. Import `tw`, `color`, `iconSize`, `motion` and `control` from `@/theme`.
  - Use the `type-*` utilities or `AppText` for text, never raw sizes. Font weight comes from `font-regular|medium|semibold|bold` (font families).
  - Icons come from `lucide-react-native` through `Icon`.
  - The app is light mode only.
  - Shared UI lives in `src/components/ui/`, and `/design-system` previews it.
  - The wordmark, Google logo and Apple logo are placeholders until assets arrive.
- **Building from designs**: replace the iOS-simulator check with "verify on web in Chrome, then on the user's phone in Expo Go (the dev machine is Windows)". This replaces the `xcrun simctl` steps.
- **Expo**: fonts load with `useFonts` in the root layout, because the app runs in Expo Go. Switch to the `expo-font` config plugin when moving to a dev build.

## Result
Built as planned: tokens in `tailwind.config.js`, `@/theme` entry point, Plus Jakarta Sans loaded with `useFonts`, 15 shared components in `src/components/ui/`, and a `/design-system` preview. `tsc`, `expo lint`, and the drift grep are clean. Each section was checked on web against `design.png`.

Changes made during the build:
- `type-*` utilities are style objects, because twrnc string utilities mapped `font-bold` to `fontWeight`.
- `type-callout` changed from 15/20 to 16/22, to match the input and chip text in the design.
- The focused TextField border uses `lavender`, not `lavender-deep`, to match the sheet. The web focus outline is removed.
- ListingCard: the save button sits beside the card's Pressable, not inside it, because nested buttons broke web hydration. The photo is narrower (128) so the title wraps to two lines.
- The PolicyCard icon tile uses `lavender/40`.
- Toggle passes react-native-web's `activeThumbColor`, because the web thumb was teal.
- Header titles are set in the root layout.

Open:
- The design's display and heading weight is heavier than Plus Jakarta Sans Bold. ExtraBold would close the gap.
- ~~Wordmark, Google, and Apple logos are placeholders.~~ Done in a follow-up: `assets/brand/` holds `havenly-wordmark.svg` (generated), `google-g.svg`, and `apple.svg` (the Apple path is reused from the agile-athletes trainer-landing site), shown through `Wordmark` and `BrandLogo`. The `type-wordmark` text style was removed.
- Not yet checked on a real phone in Expo Go.
