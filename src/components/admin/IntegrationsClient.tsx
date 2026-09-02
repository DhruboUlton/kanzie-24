"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plug,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Save,
} from "lucide-react";
import { saveIntegrationsAction } from "@/lib/actions/integrations";
import {
  Integration,
  IntegrationPlacement,
  MAX_CODE_LENGTH,
  MAX_INTEGRATIONS,
  PLACEMENTS,
  PLACEMENT_HINTS,
  PLACEMENT_LABELS,
} from "@/lib/integrations-shared";

// Ready-made starting points. These are the snippet shapes, not real ids —
// the admin pastes their own container/pixel id in.
const PRESETS: { label: string; placement: IntegrationPlacement; code: string }[] = [
  {
    label: "Google Tag Manager",
    placement: "head",
    code: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`,
  },
  {
    label: "Meta (Facebook) Pixel",
    placement: "head",
    code: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
<!-- End Meta Pixel Code -->`,
  },
  {
    label: "TikTok Pixel",
    placement: "head",
    code: `<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};

  ttq.load('YOUR_PIXEL_ID');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`,
  },
  {
    label: "Google Tag Manager — noscript",
    placement: "body_start",
    code: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`,
  },
];

function blank(): Integration {
  return {
    id: crypto.randomUUID(),
    name: "",
    placement: "head",
    code: "",
    enabled: true,
  };
}

export default function IntegrationsClient({
  initial,
  canManage,
  lockedReason,
}: {
  initial: Integration[];
  canManage: boolean;
  lockedReason: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Integration[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(initial),
    [rows, initial],
  );
  const liveCount = rows.filter((r) => r.enabled && r.code.trim()).length;

  function patch(id: string, changes: Partial<Integration>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  }

  function add(preset?: (typeof PRESETS)[number]) {
    if (rows.length >= MAX_INTEGRATIONS) {
      setError(`That's the limit of ${MAX_INTEGRATIONS} integrations.`);
      return;
    }
    setError(null);
    setRows((rs) => [
      ...rs,
      preset
        ? { ...blank(), name: preset.label, placement: preset.placement, code: preset.code }
        : blank(),
    ]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await saveIntegrationsAction({ integrations: rows });
      if (res.success) {
        setFlash("Saved. The storefront picks it up on the next page load.");
        setTimeout(() => setFlash(null), 5000);
        router.refresh();
      } else {
        setError(res.error || "That didn't work.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b] disabled:bg-gray-100 disabled:text-gray-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Plug className="w-5 h-5 text-accent" />
            <span>Integrations</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tracking and marketing code for the storefront — Google Tag Manager,
            Meta Pixel, TikTok Pixel, anything else.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{dirty ? "Save changes" : "Saved"}</span>
          </button>
        )}
      </div>

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
        <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Your own visits are never counted.</p>
          <p className="text-blue-700">
            None of this code runs inside the admin panel, and it is skipped
            entirely while you&apos;re signed in as staff — so your page views
            and clicks stay out of the numbers. Sign out (or use a private
            window) if you want to test a tag against yourself.
          </p>
        </div>
      </div>

      {lockedReason && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{lockedReason}</span>
        </div>
      )}

      {flash && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{flash}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Plug className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">
            No tracking code yet
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Add one below, then paste your container or pixel id into it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-[11px] font-mono text-gray-400 shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <input
                  value={row.name}
                  onChange={(e) => patch(row.id, { name: e.target.value })}
                  placeholder="Name, e.g. Meta Pixel"
                  disabled={!canManage}
                  className={`${inputClass} sm:max-w-xs`}
                />
                <select
                  value={row.placement}
                  onChange={(e) =>
                    patch(row.id, { placement: e.target.value as IntegrationPlacement })
                  }
                  disabled={!canManage}
                  className={`${inputClass} sm:max-w-[12rem]`}
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p} value={p}>
                      {PLACEMENT_LABELS[p]}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-3 sm:ml-auto shrink-0">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => patch(row.id, { enabled: e.target.checked })}
                      disabled={!canManage}
                      className="accent-[#c0282b]"
                    />
                    <span>{row.enabled ? "Live" : "Off"}</span>
                  </label>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
                      title="Remove"
                      aria-label={`Remove ${row.name || "integration"}`}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <textarea
                  value={row.code}
                  onChange={(e) => patch(row.id, { code: e.target.value })}
                  disabled={!canManage}
                  rows={8}
                  spellCheck={false}
                  placeholder="Paste the full <script> block from the provider."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[11px] font-mono leading-relaxed focus:outline-none focus:border-[#c0282b] disabled:bg-gray-100 disabled:text-gray-500"
                />
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-gray-400">
                    {PLACEMENT_HINTS[row.placement]}
                  </span>
                  <span
                    className={
                      row.code.length > MAX_CODE_LENGTH
                        ? "text-red-600 font-semibold shrink-0"
                        : "text-gray-400 shrink-0"
                    }
                  >
                    {row.code.length.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Add integration
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => add(preset)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:border-[#c0282b] hover:text-[#c0282b] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => add()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:border-[#c0282b] hover:text-[#c0282b] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Blank
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Presets are the standard snippet with a placeholder id — swap in
            your own container or pixel id before saving. {liveCount} of{" "}
            {rows.length} currently live.
          </p>
        </div>
      )}
    </div>
  );
}
