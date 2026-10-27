import { PaymentsProvider } from "@/components/payments-provider";
import { BookScreen } from "@/screens/stay/book-screen";

export default function BookRoute() {
  return (
    <PaymentsProvider>
      <BookScreen />
    </PaymentsProvider>
  );
}
