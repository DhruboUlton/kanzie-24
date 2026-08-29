"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save, CheckCircle2, AlertCircle, Loader2, Bell, Phone, Mail } from "lucide-react";
import { updateSettingsAction } from "@/lib/actions/settings";

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
      });

      if (res.success) {
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
            Configure global announcement strip, customer support contacts, and store policies
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
    </form>
  );
}
