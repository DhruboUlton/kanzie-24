"use client";

import { useMemo, useState } from "react";
import { ScrollText, Search, Filter } from "lucide-react";

export type ActivityEntryView = {
  id: string;
  actorEmail: string;
  actorName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date | string;
};

// Colour by what kind of thing happened, so a scan down the page separates
// routine edits from account changes and deletions.
function toneFor(action: string) {
  if (action.includes("DELETED") || action.includes("CANCELLED")) {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (action.startsWith("STAFF_") || action.startsWith("ROLE_") || action.includes("PASSWORD")) {
    return "bg-[#c0282b]/10 text-[#c0282b] border-[#c0282b]/20";
  }
  if (action.includes("CREATED") || action.includes("RECEIVED")) {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function humanise(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

export default function ActivityLogClient({
  entries,
  actors,
}: {
  entries: ActivityEntryView[];
  actors: { id: string; name: string; email: string }[];
}) {
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("ALL");
  const [entity, setEntity] = useState("ALL");

  const entityTypes = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.entityType).filter(Boolean) as string[]),
      ).sort(),
    [entries],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (actor !== "ALL" && e.actorEmail !== actor) return false;
      if (entity !== "ALL" && e.entityType !== entity) return false;
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        e.actorName.toLowerCase().includes(q) ||
        (e.entityId ?? "").toLowerCase().includes(q)
      );
    });
  }, [entries, query, actor, entity]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-accent" />
          <span>Activity Log</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Who changed what, and when. Entries are never edited or removed.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, people or IDs"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
          />
        </div>
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
        >
          <option value="ALL">Everyone</option>
          {actors.map((a) => (
            <option key={a.id} value={a.email}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
        >
          <option value="ALL">All areas</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
            <Filter className="w-5 h-5 text-gray-300" />
            <span>
              {entries.length === 0
                ? "Nothing recorded yet. Admin actions from now on appear here."
                : "No entries match these filters."}
            </span>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/60 align-top">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 truncate max-w-[10rem]">
                        {e.actorName}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate max-w-[12rem]">
                        {e.actorEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${toneFor(e.action)}`}
                      >
                        {humanise(e.action)}
                      </span>
                      {e.entityId && (
                        <p className="text-[10px] font-mono text-gray-400 mt-1 truncate max-w-[12rem]">
                          {e.entityId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {e.description && (
                        <p className="text-xs text-gray-700">{e.description}</p>
                      )}
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(e.metadata).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-mono text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded"
                            >
                              {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
