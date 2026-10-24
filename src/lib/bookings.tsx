import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { ApiError, useApiFetch, useApiQuery } from "./api";
import type { Booking, NewBooking } from "./bookings-shared";

// The signed-in guest's bookings, loaded once for the (app) screens. Booking and
// cancelling update this list from the server's answer, so Trips is always current.

type Bookings = {
  status: "loading" | "error" | "ready";
  bookings: Booking[];
  error?: ApiError;
  retry: () => void;
  book: (input: NewBooking) => Promise<Booking>;
  cancel: (id: string) => Promise<Booking>;
};

const BookingsContext = createContext<Bookings | null>(null);

export function BookingsProvider({ children }: { children: ReactNode }) {
  const apiFetch = useApiFetch();
  const loaded = useApiQuery<Booking[]>("/api/bookings");
  // Changes made in this session, applied over what was loaded.
  const [changes, setChanges] = useState<Booking[]>([]);

  const bookings = useMemo(() => {
    const byId = new Map((loaded.status === "ready" ? loaded.data : []).map((b) => [b.id, b]));
    for (const change of changes) byId.set(change.id, change);
    return [...byId.values()];
  }, [loaded.status, loaded.data, changes]);

  const remember = useCallback((booking: Booking) => {
    setChanges((current) => [...current.filter((b) => b.id !== booking.id), booking]);
    return booking;
  }, []);

  const book = useCallback(
    async (input: NewBooking) =>
      remember(await apiFetch<Booking>("/api/bookings", { method: "POST", body: JSON.stringify(input) })),
    [apiFetch, remember],
  );
  const cancel = useCallback(
    async (id: string) =>
      remember(await apiFetch<Booking>(`/api/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST" })),
    [apiFetch, remember],
  );

  const value = useMemo<Bookings>(
    () => ({ status: loaded.status, bookings, error: loaded.error, retry: loaded.retry, book, cancel }),
    [loaded.status, bookings, loaded.error, loaded.retry, book, cancel],
  );
  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings() {
  const bookings = useContext(BookingsContext);
  if (!bookings) throw new Error("useBookings must be used inside BookingsProvider");
  return bookings;
}
