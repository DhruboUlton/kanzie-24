import "server-only";

const SANDBOX_BASE = "https://sandbox.sslcommerz.com";
const LIVE_BASE = "https://securepay.sslcommerz.com";

function credentials() {
  const store_id = process.env.SSLCOMMERZ_STORE_ID;
  const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
  if (!store_id || !store_passwd) {
    throw new Error(
      "SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD are not set. Add them to .env.local (and your host's env vars) to enable checkout.",
    );
  }
  return { store_id, store_passwd };
}

function baseUrl() {
  return process.env.SSLCOMMERZ_IS_LIVE === "true" ? LIVE_BASE : SANDBOX_BASE;
}

export type SSLCommerzCustomer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

export type SSLCommerzSessionParams = {
  tran_id: string;
  totalAmountTaka: number;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  ipn_url: string;
  productName: string;
  numOfItem: number;
  customer: SSLCommerzCustomer;
};

// Session API — opens a hosted checkout (cards, bKash, Nagad, Rocket, bank
// transfer) and returns the URL to redirect the browser to.
// https://developer.sslcommerz.com/doc/v4/#initiate-the-payment
export async function createSSLCommerzSession(
  params: SSLCommerzSessionParams,
): Promise<{ GatewayPageURL: string; sessionkey: string }> {
  const { store_id, store_passwd } = credentials();

  const body = new URLSearchParams({
    store_id,
    store_passwd,
    total_amount: params.totalAmountTaka.toFixed(2),
    currency: "BDT",
    tran_id: params.tran_id,
    success_url: params.success_url,
    fail_url: params.fail_url,
    cancel_url: params.cancel_url,
    ipn_url: params.ipn_url,
    shipping_method: "YES",
    product_name: params.productName,
    product_category: "Toys",
    product_profile: "physical-goods",
    num_of_item: String(params.numOfItem),
    cus_name: params.customer.name,
    cus_email: params.customer.email,
    cus_phone: params.customer.phone,
    cus_add1: params.customer.address,
    cus_city: params.customer.city,
    cus_country: "Bangladesh",
    ship_name: params.customer.name,
    ship_add1: params.customer.address,
    ship_city: params.customer.city,
    ship_country: "Bangladesh",
  });

  const res = await fetch(`${baseUrl()}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new Error(data.failedreason || "SSLCommerz session init failed.");
  }

  return data;
}

export type SSLCommerzValidation = {
  status: string; // "VALID" | "VALIDATED" | "FAILED" | "EXPIRED" | ...
  tran_id: string;
  amount: string;
  currency: string;
};

// Server-to-server confirmation that a transaction really happened — the
// success_url redirect alone is user-controlled and not sufficient proof.
// https://developer.sslcommerz.com/doc/v4/#validation
export async function validateSSLCommerzPayment(
  val_id: string,
): Promise<SSLCommerzValidation> {
  const { store_id, store_passwd } = credentials();
  const url = new URL(`${baseUrl()}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", val_id);
  url.searchParams.set("store_id", store_id);
  url.searchParams.set("store_passwd", store_passwd);
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  return res.json();
}
