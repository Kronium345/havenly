import { useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Lock, Mail, User } from "lucide-react-native";
import { ComponentRef, useRef, useState } from "react";
import { TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { splitFullName } from "@/lib/display-name";
import { tw } from "@/theme";

import { openPrivacyPolicy } from "@/screens/legal/open-legal";

import { AuthLayout } from "./auth-layout";
import { clerkFieldErrors, reportClerkError } from "./clerk-errors";
import { reportInvalid } from "./report-invalid";
import { MIN_PASSWORD_LENGTH, validateEmail, validateName, validateNewPassword } from "./validate";

type Field = "name" | "email" | "password";

// Clerk's param names for the fields on this form.
const fieldForParam: Record<string, Field> = {
  first_name: "name",
  last_name: "name",
  email_address: "email",
  password: "password",
};

export function SignUpScreen() {
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const refs = { name: nameRef, email: emailRef, password: passwordRef };

  const update = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const next = {
      name: validateName(values.name),
      email: validateEmail(values.email),
      password: validateNewPassword(values.password),
    };
    setErrors(next);
    if (reportInvalid(next)) {
      const firstInvalid = (Object.keys(next) as Field[]).find((field) => next[field]);
      if (firstInvalid) refs[firstInvalid].current?.focus();
      return;
    }

    const { firstName, lastName } = splitFullName(values.name);
    const { error } = await signUp.password({
      emailAddress: values.email.trim(),
      password: values.password,
      firstName,
      lastName,
    });
    if (error) {
      const fieldErrors = clerkFieldErrors(error, fieldForParam);
      setErrors(fieldErrors);
      const firstInvalid = (Object.keys(next) as Field[]).find((field) => fieldErrors[field]);
      if (firstInvalid) refs[firstInvalid].current?.focus();
      reportClerkError(error);
      return;
    }

    if (signUp.status === "complete") {
      // The instance didn't ask for verification: start the session straight away.
      await signUp.finalize();
      toast.success(`Welcome to Havenly, ${firstName}.`);
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) {
      reportClerkError(sendError);
      return;
    }
    // The email stays on Clerk's sign-up, never in the URL.
    router.push("/verify-email");
  };

  return (
    <AuthLayout
      title={"Create\nyour account"}
      body="Join Havenly to save your stays, get personalized recommendations and access them across all your devices."
      footer={{ prompt: "Already have an account?", action: "Sign in", onPress: () => router.replace("/sign-in") }}
    >
      <View style={tw`gap-3`}>
        <TextField
          ref={nameRef}
          icon={User}
          label="Full name"
          placeholder="e.g. Alex Morgan"
          value={values.name}
          onChangeText={update("name")}
          error={errors.name}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
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
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={values.password}
          onChangeText={update("password")}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
      {/* Mount point for Clerk's bot protection challenge. */}
      <View nativeID="clerk-captcha" />
      <Button
        title="Create account"
        showArrow
        loading={fetchStatus === "fetching"}
        onPress={submit}
        style={tw`mt-6`}
      />
      <AppText variant="caption" style={tw`mt-3 text-center`}>
        By signing up you agree to the{" "}
        <AppText variant="caption" accessibilityRole="link" style={tw`font-medium underline`} onPress={() => router.push("/terms")}>
          Terms of Service
        </AppText>{" "}
        and{" "}
        <AppText variant="caption" accessibilityRole="link" style={tw`font-medium underline`} onPress={openPrivacyPolicy}>
          Privacy Policy
        </AppText>
        .
      </AppText>
    </AuthLayout>
  );
}
