import { useAuth } from "@clerk/expo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useCallback, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { ApiError, useApiFetch, useApiQuery } from "@/lib/api";
import { shortDate } from "@/lib/dates";
import { formatPlace, formatPrice } from "@/lib/format";
import type { HostBlock, HostStayDetails } from "@/lib/host-shared";
import { tw } from "@/theme";

import { BlockDatesSheet } from "./block-dates-sheet";
import { BookedNightsCalendar } from "./booked-nights-calendar";
import { HostBookingRow } from "./host-booking-row";
import { HostLayout } from "./host-layout";

export function HostStayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { orgRole } = useAuth();
  const isOwner = orgRole === "org:admin";
  const result = useApiQuery<HostStayDetails>(id ? `/api/host/stays/${encodeURIComponent(id)}` : null);
  const stay = result.status === "ready" ? result.data.stay : null;
  const [blocking, setBlocking] = useState(false);

  // Reload when coming back from Edit details, so a new price shows in the header.
  const { retry } = result;
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      retry();
    }, [retry]),
  );

  return (
    <HostLayout
      title={stay?.title ?? "Stay"}
      subtitle={stay ? `${formatPlace(stay.place)} · ${formatPrice(stay.pricePerNight)} a night` : undefined}
    >
      {result.status === "loading" ? (
        <StayCardPlaceholders count={1} height={360} />
      ) : result.status === "error" ? (
        <StayListMessage title="Couldn't load this stay." message={result.error.message} actionLabel="Try again" onAction={result.retry} />
      ) : (
        <View style={tw`gap-8`}>
          {isOwner && id ? (
            <View style={tw`flex-row gap-3`}>
              <Button
                title="Edit details"
                variant="secondary"
                onPress={() => router.push({ pathname: "/host/stays/[id]/edit", params: { id } })}
                style={tw`flex-1`}
              />
              <Button title="Block dates" variant="secondary" onPress={() => setBlocking(true)} style={tw`flex-1`} />
            </View>
          ) : null}

          <View style={tw`gap-3`}>
            <AppText variant="title" accessibilityRole="header">
              Booked nights
            </AppText>
            <BookedNightsCalendar booked={result.data.booked} blocked={result.data.blocks} />
          </View>

          {result.data.blocks.length > 0 ? (
            <View style={tw`gap-3`}>
              <AppText variant="title" accessibilityRole="header">
                Blocked
              </AppText>
              {result.data.blocks.map((block) => (
                <BlockRow key={block.id} stayId={id ?? ""} block={block} canRemove={isOwner} onRemoved={result.retry} />
              ))}
            </View>
          ) : null}

          <View style={tw`gap-3`}>
            <AppText variant="title" accessibilityRole="header">
              Upcoming bookings
            </AppText>
            {result.data.bookings.length === 0 ? (
              <AppText variant="body">No upcoming bookings for this stay.</AppText>
            ) : (
              result.data.bookings.map((booking) => <HostBookingRow key={booking.id} booking={booking} showStay={false} />)
            )}
          </View>

          {isOwner && id ? (
            <BlockDatesSheet
              stayId={id}
              visible={blocking}
              onClose={() => setBlocking(false)}
              onBlocked={result.retry}
              taken={[...result.data.booked, ...result.data.blocks]}
            />
          ) : null}
        </View>
      )}
    </HostLayout>
  );
}

function BlockRow({ stayId, block, canRemove, onRemoved }: { stayId: string; block: HostBlock; canRemove: boolean; onRemoved: () => void }) {
  const apiFetch = useApiFetch();
  const posthog = usePostHog();
  const [busy, setBusy] = useState(false);
  const dates = `${shortDate(block.checkIn)} to ${shortDate(block.checkOut)} · ${block.nights} night${block.nights === 1 ? "" : "s"}`;

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/host/stays/${encodeURIComponent(stayId)}/blocks/${encodeURIComponent(block.id)}`, { method: "DELETE" });
      posthog.capture("host_block_removed", { stay_id: stayId, nights: block.nights });
      toast.success("Block removed.", "Those nights can be booked again.");
      onRemoved();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't remove the block. Try again.");
      setBusy(false);
    }
  };

  return (
    <View style={tw`flex-row items-center gap-3 rounded-xl bg-canvas p-4`}>
      <View style={tw`h-3 w-3 rounded-full bg-accent-deep`} />
      <View style={tw`flex-1 gap-0.5`}>
        <AppText variant="callout" style={tw`font-medium`}>
          {dates}
        </AppText>
        {block.note ? <AppText variant="caption">{block.note}</AppText> : null}
      </View>
      {canRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove block, ${dates}`} hitSlop={8} disabled={busy} onPress={remove}>
          <AppText variant="callout" style={tw.style("font-semibold text-danger", busy && "opacity-50")}>
            Remove
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
