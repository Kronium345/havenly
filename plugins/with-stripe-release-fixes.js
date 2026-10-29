// Android release builds and Stripe's optional push provisioning (adding cards to Google
// Wallet), which Havenly doesn't use. Stripe's React Native SDK compiles against
// stripe-android-issuing-push-provisioning but leaves it out of the app, so:
// 1. Release lint ("lint vital") tried to resolve it and its dependency
//    play-services-tapandpay, which isn't on any public Maven repository, and failed.
//    Release builds skip that lint check (debug builds never ran it).
// 2. R8 then stopped on the missing com.stripe.android.pushProvisioning classes.
//    Stripe's recommended rule tells R8 they're absent on purpose.
const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

const MARKER = '// with-stripe-release-fixes';
const PROGUARD_MARKER = '# with-stripe-release-fixes';
const PROGUARD_RULES = `${PROGUARD_MARKER}: Stripe push provisioning isn't included in the app.
-dontwarn com.stripe.android.pushProvisioning.**
`;

function withReleaseLintOff(config) {
  return withAppBuildGradle(config, (gradle) => {
    if (gradle.modResults.contents.includes(MARKER)) return gradle;
    const anchor = /^android\s*\{\s*$/m;
    if (!anchor.test(gradle.modResults.contents)) {
      throw new Error('with-stripe-release-fixes: no top-level "android {" block in app/build.gradle');
    }
    gradle.modResults.contents = gradle.modResults.contents.replace(
      anchor,
      (line) => `${line}\n    ${MARKER}\n    lint {\n        checkReleaseBuilds = false\n    }`,
    );
    return gradle;
  });
}

function withPushProvisioningDontWarn(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const contents = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!contents.includes(PROGUARD_MARKER)) {
        fs.writeFileSync(file, `${contents.replace(/\s*$/, '')}\n\n${PROGUARD_RULES}`);
      }
      return config;
    },
  ]);
}

module.exports = function withStripeReleaseFixes(config) {
  return withPushProvisioningDontWarn(withReleaseLintOff(config));
};
