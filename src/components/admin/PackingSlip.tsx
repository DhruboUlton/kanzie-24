"use client";

import { Printer } from "lucide-react";
import { formatPrice } from "@/lib/format";

export default function PackingSlip({ order }: { order: any }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <button
        onClick={handlePrint}
        type="button"
        className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-colors print:hidden"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Print Packing Slip</span>
      </button>

      {/* Hidden container that only shows on print */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-wider">KANZIE</h1>
            <p className="text-xs uppercase tracking-widest text-gray-600">
              RC Construction Toys &middot; Packing Slip
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold text-sm">ORDER #{order.tranId}</p>
            <p>
              Date:{" "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p>Status: {order.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
          <div>
            <h3 className="font-bold uppercase text-gray-500 mb-1">
              Ship To Customer:
            </h3>
            <p className="font-bold text-sm text-black">{order.customerName}</p>
            <p className="text-gray-700">{order.customerAddress}</p>
            <p className="text-gray-700">
              {order.customerCity}, Bangladesh
            </p>
            <p className="font-mono mt-1">Phone: {order.customerPhone}</p>
            <p className="text-gray-600">Email: {order.customerEmail}</p>
          </div>

          <div>
            <h3 className="font-bold uppercase text-gray-500 mb-1">
              Shipping & Order Details:
            </h3>
            <p>
              <span className="font-semibold">Tracking Number:</span>{" "}
              {order.trackingNumber || "N/A"}
            </p>
            <p>
              <span className="font-semibold">Payment Method:</span> Cash on
              Delivery
            </p>
            <p>
              <span className="font-semibold">Confirmed by Call:</span>{" "}
              {order.status === "PENDING" ? "No" : "Yes"}
            </p>
          </div>
        </div>

        <table className="w-full text-xs text-left mb-8 border border-black/20">
          <thead className="bg-gray-100 uppercase font-bold border-b border-black/20">
            <tr>
              <th className="p-2">Item Description</th>
              <th className="p-2">SKU</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {order.items?.map((item: any, i: number) => (
              <tr key={i}>
                <td className="p-2 font-medium">{item.productName}</td>
                <td className="p-2 font-mono text-gray-600">{item.productSku}</td>
                <td className="p-2 text-center font-bold">{item.qty}</td>
                <td className="p-2 text-right">
                  {formatPrice(item.unitPriceCents)}
                </td>
                <td className="p-2 text-right font-bold">
                  {formatPrice(item.totalPriceCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-start pt-4 border-t border-black">
          <div className="text-xs text-gray-500 max-w-sm">
            <p className="font-bold text-gray-800">Thank you for choosing KANZIE!</p>
            <p>For questions or support, contact support@kanzie.com</p>
          </div>
          <div className="text-right text-sm">
            <span className="font-bold text-gray-600 mr-4">Grand Total:</span>
            <span className="font-black text-lg">
              {formatPrice(order.totalAmountCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
