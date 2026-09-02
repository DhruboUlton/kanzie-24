import { ShieldAlert } from "lucide-react";

export default function NoAccess({ what }: { what?: string }) {
  return (
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl border border-gray-200 shadow-xs p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-[#c0282b] mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-gray-900">
        You don&apos;t have access to this
      </h2>
      <p className="text-sm text-gray-500 mt-2">
        {what
          ? `Your role doesn't include ${what}.`
          : "Your role doesn't include this section."}{" "}
        Ask an owner if you need it.
      </p>
    </div>
  );
}
