// Keeps EAS Android builds inside the build machine's memory. With Skia, Reanimated and
// Expo's native modules, Gradle ran several C++ (CMake) compiles at once and the machine
// killed it ("Gradle build daemon disappeared unexpectedly"). Fewer parallel workers and
// compiling Kotlin inside the Gradle process (no second JVM) keep the peak down.
const { withGradleProperties } = require('expo/config-plugins');

const LIMITS = {
  'org.gradle.workers.max': '2',
  'kotlin.compiler.execution.strategy': 'in-process',
};

module.exports = function withGradleMemoryLimits(config) {
  return withGradleProperties(config, (gradle) => {
    for (const [key, value] of Object.entries(LIMITS)) {
      const existing = gradle.modResults.find((item) => item.type === 'property' && item.key === key);
      if (existing) existing.value = value;
      else gradle.modResults.push({ type: 'property', key, value });
    }
    return gradle;
  });
};
