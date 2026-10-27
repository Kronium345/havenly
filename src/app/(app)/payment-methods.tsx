import { PaymentsProvider } from "@/components/payments-provider";
import { PaymentMethodsScreen } from "@/screens/profile/payment-methods-screen";

export default function PaymentMethodsRoute() {
  return (
    <PaymentsProvider>
      <PaymentMethodsScreen />
    </PaymentsProvider>
  );
}
