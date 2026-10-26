import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Directions,
  GestureDetector,
  useCompetingGestures,
  useFlingGesture,
} from "react-native-gesture-handler";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { Wordmark } from "@/components/ui/wordmark";
import { unsplashPhoto } from "@/lib/unsplash";
import { motion, tw } from "@/theme";

import { PhotoChip } from "./photo-chip";
import { ProgressDashes } from "./progress-dashes";
import { SheetTop } from "./sheet-top";
import { SkipPill } from "./skip-pill";
import { Slide, slides } from "./slides";

// Title (2 lines of type-display) + gap + body (3 lines of type-body), so the sheet
// keeps its height as the copy changes and the photo chip doesn't jump.
const COPY_MIN_HEIGHT = 2 * 40 + 12 + 3 * 24;

export function OnboardingScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  // Measured from layout. On web the server has no window, so start at 0 on both
  // server and client (matching HTML) and fill in once the screen lays out.
  const [{ width, height }, setSize] = useState(
    Platform.OS === "web" ? { width: 0, height: 0 } : { width: windowSize.width, height: windowSize.height },
  );
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  // Slide a button-driven scroll is heading to; scroll events are ignored until it lands.
  const scrollTargetRef = useRef<number | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    Image.prefetch(slides.map((s) => unsplashPhoto(s.photoId)));
  }, []);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    scrollTargetRef.current = clamped === indexRef.current ? null : clamped;
    listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
    indexRef.current = clamped;
    setIndex(clamped);
  };

  const openSignUp = (event?: "onboarding_completed" | "onboarding_skipped") => {
    if (event) posthog.capture(event);
    router.push("/sign-up");
  };

  // Flinging the sheet changes slide too, so the whole screen feels swipeable.
  const flingLeft = useFlingGesture({
    direction: Directions.LEFT,
    runOnJS: true,
    onActivate: () => goTo(indexRef.current + 1),
  });
  const flingRight = useFlingGesture({
    direction: Directions.RIGHT,
    runOnJS: true,
    onActivate: () => goTo(indexRef.current - 1),
  });
  const sheetFlings = useCompetingGestures(flingLeft, flingRight);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const settled = Math.round(event.nativeEvent.contentOffset.x / width);
    if (scrollTargetRef.current !== null) {
      if (settled === scrollTargetRef.current) scrollTargetRef.current = null;
      return;
    }
    if (settled !== indexRef.current && settled >= 0 && settled < slides.length) {
      indexRef.current = settled;
      setIndex(settled);
    }
  };

  return (
    <View
      style={tw`flex-1 bg-ink`}
      onLayout={(event) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setSize((current) => (current.width === w && current.height === h ? current : { width: w, height: h }));
      }}
    >
      <StatusBar style="dark" />

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <Image
              source={{ uri: unsplashPhoto(item.photoId) }}
              contentFit="cover"
              transition={300}
              accessibilityIgnoresInvertColors
              style={tw`absolute inset-0 bg-ink`}
            />
            <PhotoChip
              place={item.place}
              style={[tw`absolute left-6`, { bottom: sheetHeight + 16 }]}
            />
          </View>
        )}
      />

      <View
        pointerEvents="box-none"
        style={[tw`absolute left-0 right-0 flex-row items-center justify-between px-6`, { top: insets.top + 8 }]}
      >
        <Wordmark height={40} />
        {isLast ? null : <SkipPill onPress={() => openSignUp("onboarding_skipped")} />}
      </View>

      <View
        style={tw`absolute bottom-0 left-0 right-0`}
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
      >
        <SheetTop width={width} />
        <GestureDetector gesture={sheetFlings}>
          <View
            style={[tw`bg-surface px-7`, { paddingBottom: Math.max(insets.bottom, 8) + 12 }]}
          >
            <ProgressDashes count={slides.length} active={index} />
            <Animated.View
              key={slide.id}
              entering={FadeIn.duration(motion.base)}
              style={[tw`mt-5 gap-3`, { minHeight: COPY_MIN_HEIGHT }]}
            >
              <AppText variant="display" accessibilityRole="header">
                {slide.title}
              </AppText>
              <AppText variant="body">{slide.body}</AppText>
            </Animated.View>
            <View style={tw`mt-6 gap-2`}>
              <Button
                title={isLast ? "Get started" : "Next"}
                size="md"
                showArrow
                onPress={isLast ? () => openSignUp("onboarding_completed") : () => goTo(index + 1)}
              />
              <Button
                title="Continue with Google"
                variant="secondary"
                size="md"
                leading={<BrandLogo name="google" />}
                onPress={openSignUp}
              />
            </View>
          </View>
        </GestureDetector>
      </View>
    </View>
  );
}
