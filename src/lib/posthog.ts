import PostHog from "posthog-react-native";
import { Platform } from "react-native";

type LogAttributes = Record<string, boolean | number | string>;

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
const configured = Boolean(projectToken && host);

// PostHog failures never block the app: without its settings the client is created
// disabled, so every capture is a no-op and screens can still call usePostHog().
if (!configured && __DEV__) {
  console.warn(
    "PostHog is off: set EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN and EXPO_PUBLIC_POSTHOG_HOST in .env.local to send analytics.",
  );
}

export const posthog = new PostHog(projectToken || "posthog-disabled", {
  host,
  disabled: !configured,
  // The React Native SDK has no browser storage: on the web it throws while starting and
  // the whole site renders blank. Keep its state in memory there; phones keep using files.
  persistence: Platform.OS === "web" ? "memory" : "file",
  // PostHog rejects a whole batch (400 "missing event name attribute") when one message has
  // no event name, losing every valid event with it. Drop such a message instead, and say
  // what it was in development so its source can be found.
  before_send: (event) => {
    if (event?.event) return event;
    if (__DEV__) {
      console.warn("PostHog: dropped a message with no event name.", {
        propertyKeys: Object.keys(event?.properties ?? {}),
      });
    }
    return null;
  },
  captureAppLifecycleEvents: true,
  logs: {
    serviceName: "havenly-mobile",
    environment: __DEV__ ? "development" : "production",
    serviceVersion: "1.0.0",
  },
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
    },
  },
});

export const posthogAppLogger = {
  info: (message: string, attributes: LogAttributes) => posthog.logger.info(message, attributes),
  error: (message: string, attributes: LogAttributes) => posthog.logger.error(message, attributes),
};
