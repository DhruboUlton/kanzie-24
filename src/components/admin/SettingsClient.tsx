"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save, CheckCircle2, AlertCircle, Loader2, Bell, Phone, Mail, AppWindow, ShieldCheck, Clock } from "lucide-react";
import { updateSettingsAction } from "@/lib/actions/settings";
import ImageField from "@/components/admin/ImageField";
import {
  DEFAULT_IDLE_MINUTES,
  MAX_IDLE_MINUTES,
  MIN_IDLE_MINUTES,
  SESSION_IDLE_KEY,
  clampIdleMinutes,
} from "@/lib/session-policy-shared";

export default function SettingsClient({
  initialSettings,
}: {
  initialSettings: Record<string, string>;
}) {
  const router = useRouter();
  const [announcementText, setAnnouncementText] = useState(
    initialSettings.announcement_text || "Free shipping across Bangladesh on orders over ৳5,000"
  );
  const [announcementEnabled, setAnnouncementEnabled] = useState(
    initialSettings.announcement_enabled !== "false"
  );
  const [contactPhone, setContactPhone] = useState(
    initialSettings.contact_phone || "+880 1700-000000"
  );
  const [contactEmail, setContactEmail] = useState(
    initialSettings.contact_email || "support@kanzie.com"
  );
  // Browser tab identity. Defaults mirror src/lib/site-identity.ts so an
  // untouched store shows what it has always shown.
  const [tabTitle, setTabTitle] = useState(
    initialSettings.site_tab_title || "KANZIE"
  );
  const [tabTagline, setTabTagline] = useState(
    initialSettings.site_tab_tagline ?? "RC Construction Vehicles"
  );
  const [favicon, setFavicon] = useState(
    initialSettings.site_favicon || "/kanzie-icon.png"
  );
  // Held as a string so the field can be cleared while typing; the server
  // clamps whatever arrives, so a half-typed value can never be stored.
  const [idleMinutes, setIdleMinutes] = useState(
    initialSettings[SESSION_IDLE_KEY] || String(DEFAULT_IDLE_MINUTES)
  );

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await updateSettingsAction({
        announcement_text: announcementText,
        announcement_enabled: announcementEnabled ? "true" : "false",
        contact_phone: contactPhone,
        contact_email: contactEmail,
        site_tab_title: tabTitle,
        site_tab_tagline: tabTagline,
        site_favicon: favicon,
        [SESSION_IDLE_KEY]: idleMinutes,
      });

      if (res.success) {
        // Show what was actually stored: the server pulls this field back
        // into range, and leaving the typed value on screen would claim a
        // limit that isn't in force.
        setIdleMinutes(String(clampIdleMinutes(idleMinutes)));
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(res.error || "Failed to update settings");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Store Settings</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure the browser tab, global announcement strip, and customer support contacts
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Changes</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved successfully! Changes are live on the storefront.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Browser Tab Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <AppWindow className="w-4 h-4 text-accent" />
          <span>Browser Tab</span>
        </h3>

        {/* What the tab will actually look like, assembled the same way
            composeTabTitle() does it on the server. */}
        <div className="flex items-center gap-2 max-w-sm px-3 py-2 rounded-t-lg bg-gray-100 border border-gray-200 border-b-0">
          <span className="w-4 h-4 rounded-sm overflow-hidden bg-white shrink-0 flex items-center justify-center">
            {favicon.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" className="w-4 h-4 object-contain" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-gray-300" />
            )}
          </span>
          <span className="text-xs text-gray-700 truncate">
            {[tabTitle.trim() || "KANZIE", tabTagline.trim()]
              .filter(Boolean)
              .join(" — ")}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 -mt-3">
          Preview of the tab, before truncation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tab Title
            </label>
            <input
              type="text"
              value={tabTitle}
              onChange={(e) => setTabTitle(e.target.value)}
              placeholder="KANZIE"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              The first thing in the tab. Keep it short — tabs truncate fast.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Tagline
            </label>
            <input
              type="text"
              value={tabTagline}
              onChange={(e) => setTabTagline(e.target.value)}
              placeholder="RC Construction Vehicles"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Appears after the title, separated by a dash. Leave empty for
              the title on its own.
            </p>
          </div>
        </div>

        <ImageField
          label="Tab Icon (favicon)"
          value={favicon}
          onChange={setFavicon}
          hint="Square PNG, 512×512 or smaller. Browsers cache favicons hard — a hard refresh, or a new tab, may be needed before you see it change."
          previewClassName="h-20"
        />
      </div>

      {/* Announcement Bar Settings Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <span>Storefront Announcement Strip</span>
          </h3>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={announcementEnabled}
              onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              className="w-4 h-4 text-accent rounded focus:ring-0"
            />
            <span>Enabled</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Announcement Text
          </label>
          <input
            type="text"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="e.g. Free shipping across Bangladesh on orders over ৳5,000"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Displayed across the top bar on every page of the storefront.
          </p>
        </div>
      </div>

      {/* Contact & Support Information */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
          Contact & Support Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span>Customer Helpline Phone</span>
            </label>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+880 1700-000000"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#c0282b]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span>Support Email</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="support@kanzie.com"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
            />
          </div>
        </div>
      </div>

      {/* Admin session security */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <span>Admin Security</span>
        </h3>

        <div>
          <label
            htmlFor="session-idle-minutes"
            className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Sign out after inactivity</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="session-idle-minutes"
              type="number"
              min={MIN_IDLE_MINUTES}
              max={MAX_IDLE_MINUTES}
              step={5}
              value={idleMinutes}
              onChange={(e) => setIdleMinutes(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:border-[#c0282b]"
            />
            <span className="text-sm text-gray-500">minutes</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Counts idle time, not time signed in — you won&rsquo;t be
            interrupted while you&rsquo;re working. A warning appears a minute
            before. Between {MIN_IDLE_MINUTES} minutes and{" "}
            {MAX_IDLE_MINUTES / 60} hours; anything outside that is pulled back
            into range.
          </p>
        </div>
      </div>
    </form>
  );
}
