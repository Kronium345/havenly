import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  CalendarX,
  ChevronLeft,
  CircleHelp,
  Clock,
  CreditCard,
  Hammer,
  type LucideIcon,
  PawPrint,
  ScrollText,
  ShieldCheck,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { ComponentRef, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StayListMessage } from "@/components/stay-list-states";
import { AnswerCard } from "@/components/ui/answer-card";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { useApiFetch, useApiQuery } from "@/lib/api";
import { answerQuestion, type Answer, type AnswerSource, type AskResponse } from "@/lib/ask/answer";
import type { AskTopic, TopicDefinition } from "@/lib/ask/topics";
import type { StayDetails } from "@/lib/search/types";
import { tw } from "@/theme";

import { Composer } from "./ask/composer";
import { MessageBubble } from "./ask/message-bubble";
import { TypingIndicator } from "./ask/typing-indicator";

const TOPIC_ICONS: Record<AskTopic, LucideIcon> = {
  cancellation: CalendarX,
  checkIn: Clock,
  houseRules: ScrollText,
  pets: PawPrint,
  payments: CreditCard,
  damage: Hammer,
  safety: ShieldCheck,
};

type Message = { id: number; from: "guest"; text: string } | { id: number; from: "havenly"; answer: Answer };

// Questions go to /api/stays/<slug>/ask, where Jev picks which policy sentences and stay
// facts answer them. If the route can't be reached, the keyword matcher answers here.
// Every card quotes the stay's data or a Havenly policy word for word.
export function AskScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const apiFetch = useApiFetch();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const stay = useApiQuery<StayDetails>(slug ? `/api/stays/${encodeURIComponent(slug)}` : null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const nextId = useRef(0);
  const pending = useRef(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  // KeyboardAvoidingView doesn't resize edge-to-edge Android, so the composer is lifted by
  // the keyboard's height instead (iOS gets the "will" events for a smoother move).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    // Measured from the keyboard's top edge: on edge-to-edge Android `height` leaves out the
    // navigation bar below it, which the composer must also clear.
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (event) =>
      setKeyboardHeight(
        Math.max(event.endCoordinates.height, Dimensions.get("window").height - event.endCoordinates.screenY),
      ),
    );
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/home"));
  const ready = stay.status === "ready";

  const ask = async (question: string, source: "chip" | "typed") => {
    // A ref, not `replying`: Android can fire submit twice in one tick, before state updates.
    if (stay.status !== "ready" || pending.current) return;
    const text = question.trim();
    if (!text) return;
    pending.current = true;
    setMessages((current) => [...current, { id: nextId.current++, from: "guest", text }]);
    setDraft("");
    setReplying(true);

    let reply: AskResponse;
    try {
      reply = await apiFetch<AskResponse>(`/api/stays/${encodeURIComponent(stay.data.slug)}/ask`, {
        method: "POST",
        body: JSON.stringify({ question: text }),
      });
    } catch {
      reply = { answer: answerQuestion(text, stay.data), answeredBy: "keywords" };
    }
    posthog.capture("stay_question_asked", {
      stay_id: stay.data._id,
      source,
      topic_count: reply.answer.kind === "cards" ? reply.answer.cards.length : 0,
      answered_by: reply.answeredBy,
    });
    setMessages((current) => [...current, { id: nextId.current++, from: "havenly", answer: reply.answer }]);
    setReplying(false);
    pending.current = false;
  };

  const openSource = (opens: AnswerSource) => {
    if (opens === "stay") return goBack();
    router.push({
      pathname: "/stay/[slug]/policies",
      params: opens === "policies:cancellation" ? { slug: slug ?? "", section: "cancellation" } : { slug: slug ?? "" },
    });
  };

  const header = (
    <View style={[tw`flex-row items-center gap-3 px-screen pb-3`, { paddingTop: insets.top + 8 }]}>
      <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
      <View style={tw`flex-1`}>
        <AppText variant="title" accessibilityRole="header">
          Ask about this stay
        </AppText>
        {ready ? (
          <AppText variant="caption" numberOfLines={1}>
            {stay.data.title}
          </AppText>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={tw`flex-1 bg-surface`}>
      <StatusBar style="dark" />
      {header}

      {stay.status === "loading" ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={tw`flex-1 gap-3 px-screen pt-3`}>
          <View style={tw`h-16 w-4/5 rounded-2xl bg-canvas`} />
          <View style={tw`h-12 w-3/5 self-end rounded-2xl bg-canvas`} />
          <View style={tw`h-32 rounded-xl bg-canvas`} />
        </View>
      ) : stay.status === "error" ? (
        <View style={tw`flex-1 px-screen`}>
          <StayListMessage
            title="Couldn't load this stay."
            message={stay.error.message}
            actionLabel="Try again"
            onAction={stay.retry}
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={tw`flex-1`}
          contentContainerStyle={tw`gap-3 px-screen pb-4 pt-2`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <MessageBubble from="havenly">
            {`Ask anything about ${stay.data.title}. Answers quote this stay's details and Havenly's policies word for word.`}
          </MessageBubble>

          {messages.map((message) =>
            message.from === "guest" ? (
              <MessageBubble key={message.id} from="guest">
                {message.text}
              </MessageBubble>
            ) : message.answer.kind === "cards" ? (
              <View key={message.id} style={tw`gap-2`}>
                {message.answer.cards.map((card) => (
                  <AnswerCard
                    key={`${card.topic}:${card.source}`}
                    icon={TOPIC_ICONS[card.topic]}
                    title={card.title}
                    body={card.body}
                    lines={card.lines}
                    source={card.source}
                    onSourcePress={() => openSource(card.opens)}
                  />
                ))}
              </View>
            ) : (
              <AnswerCard
                key={message.id}
                icon={CircleHelp}
                title="No answer found"
                body="I couldn't find that in this stay's details or Havenly's policies."
                footer="Try a topic below, or contact Havenly support."
              />
            ),
          )}

          {replying ? <TypingIndicator /> : null}
        </ScrollView>
      )}

      <Composer
        value={draft}
        onChangeText={setDraft}
        onSend={() => ask(draft, "typed")}
        onTopic={(topic: TopicDefinition) => ask(topic.question, "chip")}
        disabled={!ready || replying}
        bottomInset={keyboardHeight > 0 ? keyboardHeight : insets.bottom}
      />
    </View>
  );
}
