// Release builds (bundleRelease) run Android's "lint vital" check over every library.
// Stripe's React Native SDK declares push provisioning compile-only, and that pulls in
// Google's play-services-tapandpay, which isn't on any public Maven repository. Lint is
// the only task that tries to resolve it, so the build failed with "Could not find
// com.google.android.gms:play-services-tapandpay". Havenly doesn't use push provisioning,
// so release builds skip the lint check (debug builds never ran it).
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// with-release-lint-off';

module.exports = function withReleaseLintOff(config) {
  return withAppBuildGradle(config, (gradle) => {
    if (gradle.modResults.contents.includes(MARKER)) return gradle;
    const anchor = /^android\s*\{\s*$/m;
    if (!anchor.test(gradle.modResults.contents)) {
      throw new Error('with-release-lint-off: no top-level "android {" block in app/build.gradle');
    }
    gradle.modResults.contents = gradle.modResults.contents.replace(
      anchor,
      (line) => `${line}\n    ${MARKER}\n    lint {\n        checkReleaseBuilds = false\n    }`,
    );
    return gradle;
  });
};
