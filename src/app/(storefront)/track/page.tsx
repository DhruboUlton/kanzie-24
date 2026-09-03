import type { Metadata } from "next";
import TrackOrderClient from "@/components/TrackOrderClient";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Check where your KANZIE order has got to, using your order ID or the phone number you ordered with.",
};

export default function TrackOrderPage() {
  return <TrackOrderClient />;
}
