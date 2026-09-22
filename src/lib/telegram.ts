import "server-only";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { formatPrice } from "@/lib/format";
import { absoluteUrl } from "@/lib/site-config";

// Instant "you have an order" ping to the shop owner's Telegram.
//
// The bot token is a real secret — it is full control of the bot — so it is
// stored the way the courier passwords are: encrypted in SiteSetting, never
// in git, never logged. The chat id is not secret and is stored as-is.
//
// Deliberately no SDK: Telegram's sendMessage is one POST, and the popular
// wrappers bring a polling loop and a websocket this never uses.
export const TELEGRAM_KEYS = {
  token: "telegram_bot_token",
  chatId: "telegram_chat_id",
} as const;

async function readConfig(): Promise<{ token: string; chatId: string } | null> {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: [TELEGRAM_KEYS.token, TELEGRAM_KEYS.chatId] } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const stored = byKey.get(TELEGRAM_KEYS.token);
    const chatId = byKey.get(TELEGRAM_KEYS.chatId);
    if (!stored || !chatId) return null;
    return { token: decrypt(stored), chatId };
  } catch {
    // Unconfigured, or the key changed and the ciphertext no longer opens.
    // Either way there is nobody to notify; the order still stands.
    return null;
  }
}

/** Escapes the five characters Telegram's HTML parse mode cares about. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type NotifiableOrder = {
  id: string;
  tranId: string | null;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerPostalCode: string | null;
  totalAmountCents: number;
  items: { productName: string; qty: number }[];
};

function buildMessage(order: NotifiableOrder): string {
  const ref = order.tranId || order.id;
  const place = [order.customerCity, order.customerPostalCode]
    .filter(Boolean)
    .join(" ");
  const lines = order.items
    .map((i) => `• ${esc(i.productName)} ×${i.qty}`)
    .join("\n");

  return [
    `🛒 <b>New order</b> ${esc(ref)}`,
    "",
    `${esc(order.customerName)} · ${esc(order.customerPhone)}`,
    `${esc(place)} · Cash on Delivery`,
    "",
    lines,
    "",
    `<b>Total ${formatPrice(order.totalAmountCents)}</b>`,
    absoluteUrl(`/adpnl/orders/${order.id}`),
  ].join("\n");
}

/**
 * Sends one message. Never throws: a dead bot, a revoked token or a network
 * blip must not turn into a failed checkout. Call it with `void`.
 */
export async function sendTelegram(text: string): Promise<boolean> {
  const config = await readConfig();
  if (!config) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          text,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      // Status only. The response body echoes the request, and the URL that
      // produced it carries the token.
      console.warn(`Telegram sendMessage failed: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(
      "Telegram sendMessage error:",
      error instanceof Error ? error.message : "unknown",
    );
    return false;
  }
}

export async function notifyNewOrder(order: NotifiableOrder): Promise<void> {
  await sendTelegram(buildMessage(order));
}

/**
 * Whether this server can read the config, without sending anything and
 * without revealing the token. Distinguishes "no rows" from "rows present
 * but this server's key cannot open them", which is the failure a silent
 * fire-and-forget notifier otherwise hides completely.
 */
export async function telegramStatus(): Promise<{
  configured: boolean;
  tokenRow: boolean;
  chatIdRow: boolean;
  decrypts: boolean;
  chatId: string | null;
}> {
  let tokenRow = false;
  let chatIdRow = false;
  let decrypts = false;
  let chatId: string | null = null;

  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: [TELEGRAM_KEYS.token, TELEGRAM_KEYS.chatId] } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    const stored = byKey.get(TELEGRAM_KEYS.token);
    chatId = byKey.get(TELEGRAM_KEYS.chatId) ?? null;
    tokenRow = Boolean(stored);
    chatIdRow = Boolean(chatId);
    if (stored) {
      try {
        decrypts = decrypt(stored).length > 0;
      } catch {
        decrypts = false;
      }
    }
  } catch {
    // Database unreachable; every flag stays false.
  }

  return { configured: tokenRow && chatIdRow && decrypts, tokenRow, chatIdRow, decrypts, chatId };
}
