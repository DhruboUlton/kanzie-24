// Checkout used to have no email field, so each order was given a made-up
// "<phone>@customer.local" address to fill the required column. Those were
// never real, so they read as "no email" everywhere an email is shown.
export function realCustomerEmail(email: string | null | undefined): string | null {
  const e = email?.trim();
  return e && !e.toLowerCase().endsWith("@customer.local") ? e : null;
}
