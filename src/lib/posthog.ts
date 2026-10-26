import PostHog from "posthog-react-native";

type LogAttributes = Record<string, boolean | number | string>;

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;

if (!projectToken || !host) {
  if (__DEV__) {
    const missingVariable = projectToken
      ? "EXPO_PUBLIC_POSTHOG_HOST"
      : "EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN";

    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
}

export const posthog = projectToken && host
  ? new PostHog(projectToken, {
      host,
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
    })
  : undefined;

export const posthogAppLogger = {
  info: (message: string, attributes: LogAttributes) => posthog?.logger.info(message, attributes),
  error: (message: string, attributes: LogAttributes) => posthog?.logger.error(message, attributes),
};
