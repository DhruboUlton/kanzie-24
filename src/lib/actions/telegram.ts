"use server";

import { revalidatePath } from "next/cache";
import { requireOwner, authErrorResult } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { saveTelegramConfig, sendTelegram, telegramStatus } from "@/lib/telegram";

type Result = { success: boolean; error?: string };

// Owner-only, matching the courier merchant logins rather than the rest of
// the settings screen. The token is full control of the bot, and the chat it
// points at receives every customer's name, phone and address — so who may
// redirect that is not a checkbox on a custom role.
export async function getTelegramStatusAction() {
  await requireOwner();
  return telegramStatus();
}

export async function updateTelegramAction(input: {
  token?: string;
  chatId: string;
}): Promise<Result> {
  let ctx;
  try {
    ctx = await requireOwner();
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const chatId = input.chatId.trim();
  if (!chatId) return { success: false, error: "Chat ID is required." };
  // Telegram ids are integers; groups are negative. Catching it here beats
  // storing a pasted @username that would silently never deliver.
  if (!/^-?\d+$/.test(chatId)) {
    return { success: false, error: "Chat ID must be a number, e.g. 5228633561 or -5495405248." };
  }

  try {
    await saveTelegramConfig({ token: input.token, chatId });
    await logActivity({
      actor: ctx,
      action: "TELEGRAM_SETTINGS_UPDATED",
      entityType: "SETTINGS",
      description: input.token
        ? "Updated Telegram bot token and notification chat"
        : `Updated Telegram notification chat to ${chatId}`,
    });
    revalidatePath("/adpnl/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to save Telegram settings." };
  }
}

export async function sendTelegramTestAction(): Promise<Result> {
  try {
    await requireOwner();
  } catch (error) {
    return authErrorResult(error) ?? { success: false, error: "Not allowed." };
  }

  const sent = await sendTelegram(
    "🔧 <b>Test message</b>\nOrder notifications will arrive in this chat.",
  );
  return sent
    ? { success: true }
    : {
        success: false,
        error:
          "Telegram did not accept the message. Check the token, and that the bot is a member of the chat.",
      };
}
