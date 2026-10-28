import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, Plus, X } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import { ReactNode, useState } from "react";
import { Pressable, View } from "react-native";

import { StayCardPlaceholders, StayListMessage } from "@/components/stay-list-states";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import { ApiError, useApiFetch, useApiQuery } from "@/lib/api";
import { amenityLabels } from "@/lib/amenity-labels";
import { STAY_EDIT_LIMITS, STAY_TIMES, type HostStayEditable, type StayEdit } from "@/lib/host-shared";
import { amenityKeys, type AmenityKey } from "@/lib/search/vocabulary";
import { reportInvalid } from "@/screens/auth/report-invalid";
import { tw } from "@/theme";

import { HostLayout } from "./host-layout";

/** Owners edit a stay's practical details (prompts/22). Everything else stays in Studio. */
export function HostStayEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useApiQuery<HostStayEditable>(id ? `/api/host/stays/${encodeURIComponent(id)}/edit` : null);

  return (
    <HostLayout title="Edit details" subtitle="Changes show to guests straight away.">
      {result.status === "loading" ? (
        <StayCardPlaceholders count={1} height={420} />
      ) : result.status === "error" ? (
        <StayListMessage title="Couldn't load this stay." message={result.error.message} actionLabel="Try again" onAction={result.retry} />
      ) : (
        // Keyed by revision: a reload after a conflict starts the form from the new values.
        <EditForm key={result.data.rev} stayId={id ?? ""} initial={result.data} onConflict={result.retry} />
      )}
    </HostLayout>
  );
}

const { price, guests, houseRules, highlights } = STAY_EDIT_LIMITS;

function EditForm({ stayId, initial, onConflict }: { stayId: string; initial: HostStayEditable; onConflict: () => void }) {
  const router = useRouter();
  const apiFetch = useApiFetch();
  const posthog = usePostHog();
  const [priceText, setPriceText] = useState(String(initial.pricePerNight));
  const [maxGuests, setMaxGuests] = useState(initial.maxGuests);
  const [rules, setRules] = useState(initial.houseRules);
  const [checkInTime, setCheckInTime] = useState(initial.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(initial.checkOutTime);
  const [petsAllowed, setPetsAllowed] = useState(initial.petsAllowed);
  const [amenities, setAmenities] = useState<AmenityKey[]>(initial.amenities);
  const [facts, setFacts] = useState(initial.highlights);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const pricePerNight = Number(priceText.trim());
    const found = {
      price:
        !/^\d+$/.test(priceText.trim()) || pricePerNight < price.min || pricePerNight > price.max
          ? `Price must be a whole number of pounds from ${price.min} to ${price.max.toLocaleString("en-GB")}.`
          : undefined,
      checkIn: STAY_TIMES.includes(checkInTime) ? undefined : "Pick a check-in time.",
      checkOut: STAY_TIMES.includes(checkOutTime) ? undefined : "Pick a check-out time.",
      rules: rules.some((rule) => rule.trim().length > houseRules.length) ? `Keep each house rule under ${houseRules.length} characters.` : undefined,
      facts: facts.some((fact) => fact.trim().length > highlights.length) ? `Keep each highlight under ${highlights.length} characters.` : undefined,
    };
    setErrors(found);
    if (reportInvalid(found)) return;

    const edit: StayEdit = {
      pricePerNight,
      maxGuests,
      houseRules: rules.map((rule) => rule.trim()).filter(Boolean),
      checkInTime,
      checkOutTime,
      petsAllowed,
      amenities,
      highlights: facts.map((fact) => fact.trim()).filter(Boolean),
    };
    const changed = (Object.keys(edit) as (keyof StayEdit)[]).filter((key) => JSON.stringify(edit[key]) !== JSON.stringify(initial[key]));
    if (changed.length === 0) {
      router.back();
      return;
    }
    setBusy(true);
    try {
      await apiFetch<HostStayEditable>(`/api/host/stays/${encodeURIComponent(stayId)}/edit`, {
        method: "PATCH",
        body: JSON.stringify({ ...edit, rev: initial.rev }),
      });
      posthog.capture("host_stay_updated", { stay_id: stayId, fields_changed: changed.length });
      toast.success("Stay updated.", changed.includes("highlights") ? "The description updates within a day." : undefined);
      router.back();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error("Someone else changed this stay.", "We've loaded their changes. Make yours again.");
        onConflict();
      } else {
        toast.error(error instanceof ApiError ? error.message : "Couldn't save. Try again.");
      }
      setBusy(false);
    }
  };

  return (
    <View style={tw`gap-8`}>
      <Section title="Price and guests">
        <TextField
          label="Price per night (£)"
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="number-pad"
          error={errors.price}
          accessibilityLabel="Price per night in pounds"
        />
        <Stepper label="Guests" value={maxGuests} min={guests.min} max={guests.max} onChange={setMaxGuests} />
      </Section>

      <Section title="Check-in and check-out">
        <TimeRow label="Check-in from" value={checkInTime} onChange={setCheckInTime} />
        <TimeRow label="Check-out by" value={checkOutTime} onChange={setCheckOutTime} />
      </Section>

      <Section title="Pets and amenities">
        <View style={tw`flex-row items-center justify-between`}>
          <AppText variant="headline">Pets allowed</AppText>
          <Toggle value={petsAllowed} onValueChange={setPetsAllowed} accessibilityLabel="Pets allowed" />
        </View>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {amenityKeys.map((key) => (
            <Chip
              key={key}
              label={amenityLabels[key]}
              selected={amenities.includes(key)}
              onPress={() => setAmenities((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]))}
            />
          ))}
        </View>
      </Section>

      <Section title="House rules">
        <LinesEditor lines={rules} onChange={setRules} max={houseRules.count} itemLabel="house rule" placeholder="e.g. No parties or events" error={errors.rules} />
      </Section>

      <Section title="Highlights" hint="Short facts about the stay's surroundings and feel. The description is written from these.">
        <LinesEditor lines={facts} onChange={setFacts} max={highlights.count} itemLabel="highlight" placeholder="e.g. Five minutes' walk to the beach" error={errors.facts} />
      </Section>

      <Button title="Save changes" loading={busy} onPress={save} />
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={tw`gap-3`}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
      {children}
    </View>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value || "not set"}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [tw`flex-row items-center justify-between rounded-xl bg-canvas p-4`, { opacity: pressed ? 0.6 : 1 }]}
      >
        <AppText variant="callout" style={tw`font-medium`}>
          {label}
        </AppText>
        <View style={tw`flex-row items-center gap-1`}>
          <AppText variant="callout">{value || "Choose"}</AppText>
          <Icon as={ChevronRight} />
        </View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {STAY_TIMES.map((time) => (
            <Chip
              key={time}
              label={time}
              selected={time === value}
              onPress={() => {
                onChange(time);
                setOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}

function LinesEditor({
  lines,
  onChange,
  max,
  itemLabel,
  placeholder,
  error,
}: {
  lines: string[];
  onChange: (lines: string[]) => void;
  max: number;
  itemLabel: string;
  placeholder: string;
  error?: string;
}) {
  return (
    <View style={tw`gap-3`}>
      {lines.map((line, index) => (
        <View key={index} style={tw`flex-row items-center gap-2`}>
          <TextField
            value={line}
            placeholder={placeholder}
            // Wraps long lines (a single-line field on Android shows only the end), but each
            // entry stays one paragraph: Return closes the keyboard, pasted line breaks become spaces.
            multiline
            submitBehavior="blurAndSubmit"
            onChangeText={(text) => onChange(lines.map((l, i) => (i === index ? text.replace(/\s*\n\s*/g, " ") : l)))}
            accessibilityLabel={`${itemLabel} ${index + 1}`}
            error={error}
            style={tw`flex-1`}
          />
          <IconButton
            icon={X}
            variant="outline"
            size="md"
            accessibilityLabel={`Remove ${itemLabel} ${index + 1}`}
            onPress={() => onChange(lines.filter((_, i) => i !== index))}
          />
        </View>
      ))}
      {lines.length < max ? (
        <Button title={`Add ${itemLabel}`} variant="secondary" leading={<Icon as={Plus} />} onPress={() => onChange([...lines, ""])} />
      ) : (
        <AppText variant="caption">{`Up to ${max} ${itemLabel}s.`}</AppText>
      )}
    </View>
  );
}
