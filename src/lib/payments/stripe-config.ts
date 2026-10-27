import { Platform } from "react-native";

// Client-side Stripe settings. The publishable key is safe to ship; without it (or on
// web, where PaymentSheet doesn't exist) screens explain that payment needs the app.

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

/** Must match `scheme` in app.json, so 3-D Secure returns to the app. */
export const STRIPE_URL_SCHEME = "havenly";

export const STRIPE_MERCHANT_NAME = "Havenly";

export function isStripeReady() {
  return Platform.OS !== "web" && STRIPE_PUBLISHABLE_KEY.startsWith("pk_");
}
