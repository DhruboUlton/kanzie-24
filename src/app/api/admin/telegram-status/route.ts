import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/auth";
import { telegramStatus, sendTelegram } from "@/lib/telegram";

// Order notifications are fire-and-forget by design, so a broken bot is
// invisible: the sale still completes and nothing is logged loudly enough to
// find. This says, on demand, whether the config is readable and whether a
// message actually leaves the server.
//
// GET  reports configuration only, and sends nothing.
// POST sends one test message and reports the outcome.
export const dynamic = "force-dynamic";

async function guard() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.permissions.includes("SETTINGS_VIEW")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json(await telegramStatus());
}

export async function POST() {
  const denied = await guard();
  if (denied) return denied;

  const status = await telegramStatus();
  if (!status.configured) {
    return NextResponse.json({ ...status, sent: false });
  }
  const sent = await sendTelegram(
    "🔧 <b>Test message</b>\nSent from the server, on request.",
  );
  return NextResponse.json({ ...status, sent });
}
