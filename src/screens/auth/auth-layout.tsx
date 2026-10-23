import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { Wordmark } from "@/components/ui/wordmark";
import { tw } from "@/theme";

import { OrDivider } from "./or-divider";
import { useSocialSignIn } from "./use-social-sign-in";

/** Shared frame for the auth screens: header, title, form, then optional providers and footer link. */
export function AuthLayout({
  title,
  body,
  children,
  showProviders = true,
  footer,
}: {
  title: string;
  body: ReactNode;
  /** Fields and the primary button. */
  children: ReactNode;
  showProviders?: boolean;
  footer?: { prompt: string; action: string; onPress: () => void };
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const social = useSocialSignIn();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/onboarding"));

  return (
    <ScrollView
      style={tw`flex-1 bg-surface`}
      contentContainerStyle={[
        tw`grow px-screen`,
        { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 8) + 16 },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <StatusBar style="dark" />
      <View style={tw`flex-row items-center justify-between`}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
        <Wordmark height={24} />
      </View>

      <AppText variant="hero" accessibilityRole="header" style={tw`mt-7`}>
        {title}
      </AppText>
      <AppText variant="body" style={tw`mt-3`}>
        {body}
      </AppText>

      <View style={tw`mt-7`}>{children}</View>

      {showProviders ? (
        <>
          <OrDivider />
          <View style={tw`gap-3`}>
            <Button
              title="Continue with Google"
              variant="secondary"
              size="md"
              leading={<BrandLogo name="google" />}
              loading={social.pending === "google"}
              disabled={social.pending === "apple"}
              onPress={() => social.start("google")}
            />
            <Button
              title="Continue with Apple"
              variant="secondary"
              size="md"
              leading={<BrandLogo name="apple" />}
              loading={social.pending === "apple"}
              disabled={social.pending === "google"}
              onPress={() => social.start("apple")}
            />
          </View>
        </>
      ) : null}

      {footer ? (
        <View style={tw`mt-auto flex-row items-center justify-center gap-2 pt-6`}>
          <AppText variant="caption" style={tw`font-regular`}>
            {footer.prompt}
          </AppText>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={footer.onPress}>
            <AppText variant="callout" style={tw`font-medium underline`}>
              {footer.action}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
