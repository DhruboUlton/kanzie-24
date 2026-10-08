import os from "node:os";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { statfs } from "node:fs/promises";
import { promisify } from "node:util";
import Link from "next/link";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAdmin } from "@/lib/admin-guard";
import { isOwner } from "@/lib/permissions";

// One-off diagnostic: can this server compress uploaded videos itself?
// Answers the three things only the server can — is ffmpeg here, may the app
// run programs, how fast is the CPU — and, if ffmpeg is present, times a
// 5-second test encode. Owner only, not linked from the sidebar, and it only
// runs when asked (?run=1), because the encode keeps the CPU busy.
export const dynamic = "force-dynamic";

const run = promisify(execFile);

async function tryRun(cmd: string, args: string[], timeout = 10_000) {
  const started = Date.now();
  try {
    const { stdout, stderr } = await run(cmd, args, { timeout, maxBuffer: 4 << 20 });
    return { ok: true, out: `${stdout}${stderr}`.trim(), ms: Date.now() - started };
  } catch (error) {
    return { ok: false, out: error instanceof Error ? error.message : String(error), ms: Date.now() - started };
  }
}

/** sha256 over a 1 MB buffer for one second; the same figure on a known machine gives a speed ratio. */
function cpuScore(): number {
  const buf = Buffer.alloc(1 << 20, 7);
  const end = Date.now() + 1000;
  let mb = 0;
  while (Date.now() < end) {
    createHash("sha256").update(buf).digest();
    mb++;
  }
  return mb;
}

const GB = 1024 ** 3;

export default async function ServerCheckPage(props: PageProps<"/adpnl/server-check">) {
  const ctx = await requirePageAdmin();
  if (!isOwner(ctx)) return <NoAccess what="the server check" />;

  const { run: shouldRun } = await props.searchParams;
  if (shouldRun !== "1") {
    return (
      <div className="max-w-3xl space-y-3">
        <h2 className="text-xl font-bold text-gray-900">Server Check</h2>
        <p className="text-xs text-gray-500">
          Checks whether this server can compress videos. Takes up to a
          minute and keeps the processor busy while it runs.
        </p>
        <Link
          href="/adpnl/server-check?run=1"
          className="inline-block px-4 py-2 bg-[#c0282b] hover:bg-[#a02225] text-white text-xs font-bold rounded-lg"
        >
          Run check
        </Link>
      </div>
    );
  }

  const cpus = os.cpus();
  const tmp = os.tmpdir();
  const disk = await statfs(tmp).catch(() => null);
  const canSpawn = await tryRun("uname", ["-a"]);
  const ffmpeg = await tryRun("ffmpeg", ["-hide_banner", "-version"]);
  const x264 = ffmpeg.ok ? await tryRun("ffmpeg", ["-hide_banner", "-encoders"]) : null;
  const score = cpuScore();

  // The same settings the videos would be compressed with, on a synthetic
  // 5-second 1080x1920 clip, written nowhere.
  const encode =
    ffmpeg.ok && x264?.out.includes("libx264")
      ? await tryRun(
          "ffmpeg",
          [
            "-hide_banner", "-v", "error",
            "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30",
            "-t", "5",
            "-c:v", "libx264", "-preset", "slow", "-crf", "24",
            "-f", "null", "-",
          ],
          90_000,
        )
      : null;

  const rows: [string, string][] = [
    ["System", `${os.platform()} ${os.arch()} · ${os.release()} · Node ${process.version}`],
    ["Processors", `${cpus.length} × ${cpus[0]?.model ?? "unknown"}`],
    ["Load (1/5/15 min)", os.loadavg().map((n) => n.toFixed(2)).join(" / ")],
    ["Memory", `${(os.freemem() / GB).toFixed(1)} GB free of ${(os.totalmem() / GB).toFixed(1)} GB · app uses ${(process.memoryUsage().rss / GB * 1024).toFixed(0)} MB`],
    ["Temp disk", disk ? `${((disk.bavail * disk.bsize) / GB).toFixed(1)} GB free in ${tmp}` : `unknown (${tmp})`],
    ["May run programs", canSpawn.ok ? `yes · ${canSpawn.out.split("\n")[0]}` : `no · ${canSpawn.out}`],
    ["ffmpeg installed", ffmpeg.ok ? `yes · ${ffmpeg.out.split("\n")[0]}` : "no"],
    ["H.264 encoder", x264 ? (x264.out.includes("libx264") ? "yes (libx264)" : "no") : "—"],
    ["CPU score", `${score} MB/s sha256 (single core)`],
    [
      "5-second test encode",
      encode
        ? encode.ok
          ? `${(encode.ms / 1000).toFixed(1)} s for 5 s of 1080×1920 video`
          : `failed · ${encode.out.slice(0, 200)}`
        : "skipped (no ffmpeg with libx264)",
    ],
  ];

  return (
    <div className="max-w-3xl space-y-3">
      <h2 className="text-xl font-bold text-gray-900">Server Check</h2>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <table className="w-full text-xs">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-gray-100 align-top">
                <td className="py-2 pr-4 font-semibold text-gray-700 whitespace-nowrap">{k}</td>
                <td className="py-2 font-mono text-gray-800 break-all">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">
        Send a screenshot of this table back to Claude.
      </p>
    </div>
  );
}
