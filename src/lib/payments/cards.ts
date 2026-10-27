// Shapes shared by the payment-methods API routes and the app. Card details never
// leave Stripe; these are display labels only.

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

/** What `/api/payment-methods/setup` returns for PaymentSheet in setup mode. */
export type CardSetup = {
  setupIntentClientSecret: string;
  customerSessionClientSecret: string;
  customerId: string;
};
