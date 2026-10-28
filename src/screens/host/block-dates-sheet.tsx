import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { DateRangeCalendar, type DateRange } from "@/components/ui/date-range-calendar";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { ApiError, useApiFetch } from "@/lib/api";
import { nightsBetween, shortDate, type IsoDate } from "@/lib/dates";
import { MAX_BLOCK_NIGHTS, MAX_BLOCK_NOTE, type HostBlock } from "@/lib/host-shared";
import { reportInvalid } from "@/screens/auth/report-invalid";
import { tw } from "@/theme";

import { isNightIn } from "./booked-nights-calendar";

type Nights = { checkIn: IsoDate; checkOut: IsoDate }[];

/** Owners block nights on a stay (prompts/22). Booked and already-blocked nights can't be picked. */
export function BlockDatesSheet({
  stayId,
  visible,
  onClose,
  onBlocked,
  taken,
}: {
  stayId: string;
  visible: boolean;
  onClose: () => void;
  onBlocked: () => void;
  taken: Nights;
}) {
  const apiFetch = useApiFetch();
  const posthog = usePostHog();
  const [range, setRange] = useState<DateRange>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const nights = range.checkIn && range.checkOut ? nightsBetween(range.checkIn, range.checkOut) : 0;
  // A range can't run through a taken night, even if both ends are free.
  const crossesTaken = !!range.checkIn && !!range.checkOut && taken.some((r) => r.checkIn < range.checkOut! && r.checkOut > range.checkIn!);

  const close = () => {
    setRange({});
    setNote("");
    onClose();
  };

  const save = async () => {
    const invalid = reportInvalid({
      dates: !range.checkIn || !range.checkOut ? "Pick the first night and the day after the last night." : undefined,
      overlap: crossesTaken ? "Those nights include booked or blocked ones." : undefined,
      length: nights > MAX_BLOCK_NIGHTS ? `Block up to ${MAX_BLOCK_NIGHTS} nights at a time.` : undefined,
      note: note.trim().length > MAX_BLOCK_NOTE ? `Keep the note under ${MAX_BLOCK_NOTE} characters.` : undefined,
    });
    if (invalid) return;
    setBusy(true);
    try {
      const block = await apiFetch<HostBlock>(`/api/host/stays/${encodeURIComponent(stayId)}/blocks`, {
        method: "POST",
        body: JSON.stringify({ checkIn: range.checkIn, checkOut: range.checkOut, note: note.trim() }),
      });
      posthog.capture("host_dates_blocked", { stay_id: stayId, nights: block.nights });
      toast.success("Dates blocked.", `${shortDate(block.checkIn)} to ${shortDate(block.checkOut)}`);
      onBlocked();
      close();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't block those dates. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Block dates"
      footer={<Button title={nights ? `Block ${nights} night${nights === 1 ? "" : "s"}` : "Block dates"} loading={busy} onPress={save} />}
    >
      <View style={tw`gap-4`}>
        <AppText variant="body">Guests can&apos;t book blocked nights. Pick the first night, then the day you&apos;re free again.</AppText>
        <DateRangeCalendar value={range} onChange={setRange} isUnavailable={(day) => isNightIn(taken, day)} />
        <TextField
          label="Note (only your team sees it)"
          placeholder="e.g. Repairs"
          value={note}
          onChangeText={setNote}
          maxLength={MAX_BLOCK_NOTE}
          error={note.trim().length > MAX_BLOCK_NOTE ? "Too long" : undefined}
        />
      </View>
    </Sheet>
  );
}
