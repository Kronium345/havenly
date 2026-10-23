import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { ComponentRef, useRef, useState } from "react";
import { TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { tw } from "@/theme";

import { AuthLayout } from "./auth-layout";
import { clerkFieldErrors, reportClerkError } from "./clerk-errors";
import { reportInvalid } from "./report-invalid";
import { validateEmail, validatePassword } from "./validate";

type Field = "email" | "password";

// Clerk's param names for the fields on this form.
const fieldForParam: Record<string, Field> = {
  identifier: "email",
  email_address: "email",
  password: "password",
};

// No design exists for sign-in; this follows the sign-up layout (auth.png).
export function SignInScreen() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const { signIn, fetchStatus } = useSignIn();
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const refs = { email: emailRef, password: passwordRef };

  const update = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const next = { email: validateEmail(values.email), password: validatePassword(values.password) };
    setErrors(next);
    if (reportInvalid(next)) {
      const firstInvalid = (Object.keys(next) as Field[]).find((field) => next[field]);
      if (firstInvalid) refs[firstInvalid].current?.focus();
      return;
    }

    const { error } = await signIn.password({ emailAddress: values.email.trim(), password: values.password });
    if (error) {
      const fieldErrors = clerkFieldErrors(error, fieldForParam);
      setErrors(fieldErrors);
      const firstInvalid = (Object.keys(next) as Field[]).find((field) => fieldErrors[field]);
      if (firstInvalid) refs[firstInvalid].current?.focus();
      reportClerkError(error);
      return;
    }

    if (signIn.status === "complete") {
      // Starting the session closes the (auth) group; the index route redirects to /home.
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        reportClerkError(finalizeError);
        return;
      }
      const firstName = signIn.userData.firstName;
      toast.success(firstName ? `Welcome back, ${firstName}.` : "Welcome back.");
      return;
    }

    // A new device (or an account with email-code 2FA): Clerk wants a code first.
    const needsCode = signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor";
    if (needsCode && signIn.supportedSecondFactors.some((factor) => factor.strategy === "email_code")) {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        reportClerkError(sendError);
        return;
      }
      router.push({ pathname: "/verify-email", params: { flow: "sign-in" } });
      return;
    }

    toast.error("This sign-in needs a step Havenly doesn't support yet.", "Contact support for help.");
    await signIn.reset();
  };

  return (
    <AuthLayout
      title={"Welcome\nback"}
      body="Sign in to see your saved stays and trips."
      footer={{ prompt: "New to Havenly?", action: "Create account", onPress: () => router.replace("/sign-up") }}
    >
      <View style={tw`gap-3`}>
        <TextField
          ref={emailRef}
          icon={Mail}
          label="Email address"
          placeholder="you@example.com"
          value={values.email}
          onChangeText={update("email")}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          icon={Lock}
          label="Password"
          placeholder="Your password"
          value={values.password}
          onChangeText={update("password")}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
      <Button
        title="Sign in"
        showArrow
        loading={fetchStatus === "fetching"}
        onPress={submit}
        style={tw`mt-6`}
      />
    </AuthLayout>
  );
}
