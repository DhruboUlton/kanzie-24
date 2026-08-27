import { Truck, ShieldCheck, BatteryCharging, Award } from "lucide-react";

const ITEMS = [
  { icon: Truck, label: "Free shipping over $75" },
  { icon: BatteryCharging, label: "Rechargeable batteries included" },
  { icon: ShieldCheck, label: "1-year warranty" },
  { icon: Award, label: "Trusted by 10,000+ families" },
];

export default function UspStrip() {
  return (
    <div className="border-y border-black/10 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
        {ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 justify-center sm:justify-start">
            <Icon className="text-accent shrink-0" size={22} />
            <span className="text-sm font-semibold text-black/70">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
