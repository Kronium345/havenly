# Havenly

**Describe the stay you want in one sentence, and get stays that actually fit. Ask a question about a stay, and get the stay's own answer, word for word.**

Havenly is a holiday rental app for iOS, Android and the web, built with Expo and React Native.

## Why Havenly instead of Airbnb

Big rental apps are built around filters, maps and long listing pages, and you do the matching yourself. Havenly is built around two ideas.

**1. You search the way you'd ask a friend.**
Type "quiet pet friendly cabin with a hot tub under £300 a night for 4" and Havenly reads all of it:
- **Hard requirements become exact filters:** the price cap, 4 guests, pets allowed, a hot tub.
- **The feel ranks the results:** "quiet", "cozy" and "secluded" are matched against how each stay is described.
- **It understands what you rule out:** "not a villa" or "no pets" excludes those stays, rather than treating the words as things you want.
- **It does the budget maths:** "£900 for 3 nights" becomes a nightly cap.
- **You can see what it understood:** your search appears as chips. Remove one, or add filters, and the results update.

**2. Answers you can trust, because nothing is made up.**
Ask "Can I check in late?" or "What happens if I cancel a week before?" on any stay:
- Havenly answers only with that stay's own details (check-in times, house rules, pets) and Havenly's published policies, **quoted word for word with their source**.
- If nothing answers the question, it says so and points you to support, instead of guessing.
- No AI writes the answers. A small model only picks which existing sentences are relevant; the text you read is always the original.

**Also different:**
- **Clear cancellation tiers.** Each stay shows its policy (Flexible, Moderate or Strict), and refunds are calculated by those exact rules.
- **Hosting in the same app.** A host company's team switches to host mode to see its stays, bookings and booked nights. Owners edit prices, rules and amenities, and block dates, from their phone.
- **Privacy by default.** Hosts see guests as a first name and last initial, never an email or phone number. Analytics never record what you type.

## What you can do

- **Guests:** search in plain English, browse by category, save stays, ask about policies, book and pay by card (with saved cards), manage and cancel trips, get trip reminders, and manage your account and devices.
- **Hosts:** see your stays, upcoming bookings and booked nights; edit stay details; block dates; invite your team.
- **In progress:** paying hosts automatically after check-in (Stripe Connect, `prompts/23-host-payouts.md`).

## How it's built

| Part | Tool |
| --- | --- |
| App (iOS, Android, web) | Expo SDK 58, Expo Router, React Native, twrnc |
| API | Expo Router API routes on EAS Hosting (https://havenly.expo.app) |
| Sign-in | Clerk (email and password with a verification code, Google, Apple; organizations for host companies) |
| Stays and policies | Sanity (content, embeddings for "feel", Context for policy lookup) |
| Search reading and answer picking | Jev (typed choices with confidence, never generated text) |
| Bookings | Neon Postgres (no double bookings, enforced by the database) |
| Payments | Stripe (PaymentSheet, refunds, webhooks) |
| Analytics | PostHog |

`AGENTS.md` holds every current design decision. `prompts/` holds the plan behind each feature.

## Run it locally

1. Install dependencies with `npm install`. Add new packages with `npx expo install <package>`.
2. Copy `.env.example` to `.env.local` and fill in the keys (Clerk, Sanity, Neon `dev` branch, Stripe sandbox, TypeSafe, PostHog). Never commit `.env.local`.
3. Set up the database: `npm run db:migrate`
4. Start the app: `npx expo start`. It needs a development build for native features such as payments and Google/Apple sign-in.

Checks before committing: `npx tsc --noEmit` and `npx expo lint`.

Sanity Studio lives in `studio/` and has its own `npm` setup. Run `cd studio && npm run dev`.
