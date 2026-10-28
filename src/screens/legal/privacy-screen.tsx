import { SUPPORT_EMAIL } from "@/screens/profile/help-screen";

import { LegalPage, type LegalSection } from "./legal-page";

// Draft wording (prompts/20) for the owner to review before release; not legal advice.
// It describes only what the app does today (AGENTS.md "Who owns what"). Update it when
// a new service or kind of data is added.
const sections: LegalSection[] = [
  {
    title: "Your account",
    paragraphs: [
      "When you sign up we keep your name, email address and, if you add one, your profile photo. Sign-in, passwords and sessions are handled by Clerk, our account provider. If you sign in with Google or Apple, we receive your name and email address from them.",
    ],
  },
  {
    title: "Bookings and payments",
    paragraphs: [
      "For each trip we store the stay, your dates, the number of guests and the amounts paid and refunded. Bookings are kept in our database, hosted by Neon in London.",
      "Payments are processed by Stripe. Your card details go straight to Stripe and never reach Havenly. If you save a card, Stripe keeps it for your next booking; you can remove it under Profile → Payment methods.",
      "If a stay's host uses Havenly hosting, they see your first name and last initial, your dates, the number of guests and the booking's status. They don't see your email address or phone number.",
    ],
  },
  {
    title: "Searching and questions",
    paragraphs: [
      "What you type in search, and questions you ask about a stay, are sent to our server to find matching stays and answers. To understand your wording we use TypeSafe's Jev model, which receives that text. We don't store it with your account.",
      "Stays you save with the heart are kept with your account so they appear on your other devices.",
    ],
  },
  {
    title: "Analytics and crash reports",
    paragraphs: [
      "We use PostHog to see which screens and features are used and to catch crashes. Events are linked to your account ID only, never to your name or email address, and never include what you type.",
    ],
  },
  {
    title: "Notifications",
    paragraphs: [
      "Trip and check-out reminders are scheduled on your device. No push service receives your trips.",
    ],
  },
  {
    title: "Deleting your data",
    paragraphs: [
      "You can delete your account at any time in Profile → Account → Delete account, once any upcoming trips are cancelled. This removes your account, bookings, saved stays, saved cards and analytics profile. Stripe may keep records of past payments where the law requires it.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [`Questions about your data? Email ${SUPPORT_EMAIL} and we'll reply.`],
  },
];

export function PrivacyScreen() {
  return (
    <LegalPage
      title="Privacy"
      updated="28 October 2026"
      intro="This explains what Havenly collects when you use the app, why, and who helps us run it."
      sections={sections}
    />
  );
}
