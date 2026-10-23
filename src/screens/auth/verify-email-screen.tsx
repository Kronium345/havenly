import { useSignIn, useSignUp } from "@clerk/expo";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { tw } from "@/theme";

import { AuthLayout } from "./auth-layout";
import { reportClerkError } from "./clerk-errors";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

type Flow = "sign-up" | "sign-in";

/**
 * Collects the 6-digit code Clerk emails. `flow=sign-up` (default) verifies a new
 * account's email; `flow=sign-in` is Clerk's new-device check after a password sign-in.
 */
export function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const flow: Flow = params.flow === "sign-in" ? "sign-in" : "sign-up";
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const busy = (flow === "sign-up" ? signUpStatus : signInStatus) === "fetching";

  // Read once: the email comes from Clerk's pending attempt, never the URL (which lands
  // in browser history). Once the code is accepted the attempt completes, so a live read
  // would bounce the guest back to the form before the session guard moves them home.
  const [email] = useState(() => {
    if (flow === "sign-up") {
      const waiting = signUp.status === "missing_requirements" && signUp.unverifiedFields.includes("email_address");
      return waiting ? signUp.emailAddress : null;
    }
    const waiting = signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor";
    const factor = signIn.supportedSecondFactors.find((item) => item.strategy === "email_code");
    return waiting && factor && "safeIdentifier" in factor ? factor.safeIdentifier : null;
  });
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!email) {
    // Nothing to verify, e.g. after a reload: start again.
    return <Redirect href={flow === "sign-up" ? "/sign-up" : "/sign-in"} />;
  }

  const reject = (message?: Parameters<typeof reportClerkError>[0]) => {
    setInvalid(true);
    setCode("");
    reportClerkError(message);
  };

  const verify = async (value: string) => {
    if (busy) return;
    if (value.length < CODE_LENGTH) {
      setInvalid(true);
      toast.error(`Enter the ${CODE_LENGTH}-digit code.`);
      return;
    }

    // Finalizing starts the session: the (auth) group closes and the index route
    // redirects to /home.
    if (flow === "sign-up") {
      const { error } = await signUp.verifications.verifyEmailCode({ code: value });
      if (error) return reject(error);
      if (signUp.status !== "complete") return reject();
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) return reject(finalizeError);
      toast.success(signUp.firstName ? `Welcome to Havenly, ${signUp.firstName}.` : "Welcome to Havenly.");
      return;
    }

    const { error } = await signIn.mfa.verifyEmailCode({ code: value });
    if (error) return reject(error);
    if (signIn.status !== "complete") return reject();
    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) return reject(finalizeError);
    const firstName = signIn.userData.firstName;
    toast.success(firstName ? `Welcome back, ${firstName}.` : "Welcome back.");
  };

  const resend = async () => {
    const { error } =
      flow === "sign-up" ? await signUp.verifications.sendEmailCode() : await signIn.mfa.sendEmailCode();
    if (error) {
      reportClerkError(error);
      return;
    }
    setCooldown(RESEND_SECONDS);
    setCode("");
    setInvalid(false);
    toast.info(`Code sent to ${email}.`);
  };

  return (
    <AuthLayout
      title={"Check your\nemail"}
      body={
        <>
          We sent a {CODE_LENGTH}-digit code to{" "}
          <AppText variant="body" style={tw`font-medium text-ink`}>
            {email}
          </AppText>
          {flow === "sign-up"
            ? ". Enter it below to verify your account."
            : ". Enter it below to confirm it's you on this device."}
        </>
      }
      showProviders={false}
    >
      <CodeInput
        value={code}
        onChange={(next) => {
          setCode(next);
          setInvalid(false);
        }}
        onComplete={verify}
        invalid={invalid}
        autoFocus
      />
      <Button
        title={flow === "sign-up" ? "Verify email" : "Verify and sign in"}
        showArrow
        loading={busy}
        onPress={() => verify(code)}
        style={tw`mt-8`}
      />
      <View style={tw`mt-6 flex-row items-center justify-center gap-2`}>
        <AppText variant="caption" style={tw`font-regular`}>
          Didn&apos;t get it?
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: cooldown > 0 || busy }}
          disabled={cooldown > 0 || busy}
          hitSlop={8}
          onPress={resend}
        >
          <AppText variant="callout" style={tw.style("font-medium", cooldown > 0 ? "text-muted" : "underline")}>
            {cooldown > 0 ? `Resend in 0:${String(cooldown).padStart(2, "0")}` : "Resend code"}
          </AppText>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
