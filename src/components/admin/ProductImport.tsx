"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  MinusCircle,
  ArrowLeft,
  Download,
} from "lucide-react";
import {
  previewProductCsvAction,
  commitProductCsvAction,
  type ImportPlan,
  type ImportResult,
  type ImportOptions,
} from "@/lib/actions/product-import";

export type ImportCategoryOption = { id: string; name: string };

const SAMPLE_CSV = [
  "Product Title,URL Slug,SKU Identifier,Brand,Scale,Category,Price,Compare At Price,Stock Qty,Short Description,Full Description,Key Feature 1,Key Feature 2,Spec - Scale,Spec - Control,Images,Product Video,Popup Video",
  '"RC Example Loader",rc-example-loader,EX-001,YIGONG,1:16,Excavators,4990,5990,12,"One line shown on the card and above More Details.","Opening paragraph.',
  "",
  "SECTION HEADING",
  "",
  "Another paragraph.",
  "",
  '• First bullet',
  '• Second bullet",2.4GHz remote control,Rechargeable battery,1:16,2.4 GHz remote,/api/uploads/photo.jpg,,',
].join("\n");

function ActionBadge({ action }: { action: "create" | "update" | "skip" }) {
  if (action === "create") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
        <PlusCircle className="w-2.5 h-2.5" />
        New
      </span>
    );
  }
  if (action === "update") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        <RefreshCw className="w-2.5 h-2.5" />
        Update
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
      <MinusCircle className="w-2.5 h-2.5" />
      Skipped
    </span>
  );
}

export default function ProductImport({
  categories,
}: {
  categories: ImportCategoryOption[];
}) {
  const router = useRouter();

  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [defaultCategoryId, setDefaultCategoryId] = useState(categories[0]?.id ?? "");
  const [defaultPriceTaka, setDefaultPriceTaka] = useState<string>("");
  const [updateSlugs, setUpdateSlugs] = useState(false);

  const currentOptions = (): ImportOptions => ({
    defaultCategoryId: defaultCategoryId || null,
    defaultPriceTaka: defaultPriceTaka ? Number(defaultPriceTaka) : null,
    updateSlugs,
  });

  async function runPreview(text: string, options: ImportOptions) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const next = await previewProductCsvAction(text, options);
      setPlan(next);
      if (!next.ok) setError(next.error ?? "Could not read that file.");
    } catch {
      setError("Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const text = await file.text();
    setFileName(file.name);
    setCsvText(text);
    await runPreview(text, currentOptions());
  }

  async function handleOptionChange(next: Partial<ImportOptions>) {
    const options = { ...currentOptions(), ...next };
    if (csvText) await runPreview(csvText, options);
  }

  async function handleImport() {
    if (!csvText) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await commitProductCsvAction(csvText, currentOptions());
      setResult(outcome);
      if (!outcome.ok) setError(outcome.error ?? "Import failed.");
      else router.refresh();
    } catch {
      setError("Import failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kanzie-product-import-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const importable = plan?.ok ? plan.createCount + plan.updateCount : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to catalog
          </Link>
          <h2 className="text-xl font-bold text-gray-900">Import Products from CSV</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Rows are matched to products by SKU — a known SKU updates that
            product, a new one adds it.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Sample CSV
        </button>
      </div>

      {/* File picker */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#c0282b] bg-gray-50/70 hover:bg-gray-50 rounded-xl p-6 cursor-pointer transition-colors">
          {busy && !result ? (
            <Loader2 className="w-6 h-6 text-accent animate-spin mb-1.5" />
          ) : (
            <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
          )}
          <span className="text-sm font-semibold text-gray-700">
            {fileName || "Click to choose a CSV file"}
          </span>
          <span className="text-[11px] text-gray-400 mt-0.5">
            .csv, up to 2MB and 300 rows
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            disabled={busy}
            className="hidden"
          />
        </label>

        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer font-semibold text-gray-700">
            Which columns are read?
          </summary>
          <div className="mt-2 space-y-1.5 leading-relaxed">
            <p>
              <strong>Required:</strong> SKU Identifier. Product Title too, for
              rows that create a new product.
            </p>
            <p>
              <strong>Optional:</strong> URL Slug, Brand, Scale, Category,
              Price, Compare At Price, Stock Qty, Short Description, Full
              Description, Images, Product Video, Popup Video, Featured, New
              Arrival, In Stock.
            </p>
            <p>
              <strong>Repeating:</strong> any <code>Key Feature 1…N</code>{" "}
              column becomes a bullet, and any <code>Spec - Label</code> column
              becomes a spec row with that label.
            </p>
            <p>
              Full Description is plain text: blank lines separate paragraphs,
              an ALL-CAPS line becomes a heading, and lines starting with •
              become a list.
            </p>
            <p>
              An empty cell never erases existing content — leave a column out
              entirely, or blank, and that field is left alone.
            </p>
          </div>
        </details>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result?.ok && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Imported — {result.created} added, {result.updated} updated
          </div>
          {result.failed.length > 0 && (
            <div className="text-xs text-red-700 space-y-1">
              {result.failed.map((f) => (
                <div key={f.sku}>
                  {f.sku}: {f.message}
                </div>
              ))}
            </div>
          )}
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Back to catalog
          </Link>
        </div>
      )}

      {/* Plan */}
      {plan?.ok && !result?.ok && (
        <>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-semibold text-gray-900">
                {plan.createCount} to add
              </span>
              <span className="font-semibold text-gray-900">
                {plan.updateCount} to update
              </span>
              {plan.skipCount > 0 && (
                <span className="text-gray-500">{plan.skipCount} skipped</span>
              )}
            </div>

            {plan.unknownColumns.length > 0 && (
              <p className="text-xs text-amber-700">
                Ignored columns: {plan.unknownColumns.join(", ")}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {plan.needsCategory && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Category for new products *
                  </label>
                  <select
                    value={defaultCategoryId}
                    onChange={(e) => {
                      setDefaultCategoryId(e.target.value);
                      handleOptionChange({ defaultCategoryId: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {plan.needsPrice && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Price for new products (৳) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={defaultPriceTaka}
                    onChange={(e) => setDefaultPriceTaka(e.target.value)}
                    onBlur={() =>
                      handleOptionChange({
                        defaultPriceTaka: defaultPriceTaka ? Number(defaultPriceTaka) : null,
                      })
                    }
                    placeholder="e.g. 3990"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateSlugs}
                onChange={(e) => {
                  setUpdateSlugs(e.target.checked);
                  handleOptionChange({ updateSlugs: e.target.checked });
                }}
                className="w-4 h-4 text-accent rounded focus:ring-0"
              />
              <span className="text-xs text-gray-700">
                Also rewrite existing products&rsquo; URLs from the file
                <span className="text-gray-400">
                  {" "}
                  — changes live links, off by default
                </span>
              </span>
            </label>

            <button
              type="button"
              disabled={busy || importable === 0}
              onClick={handleImport}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#c0282b] hover:bg-[#8f1e20] disabled:bg-black/20 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              {busy ? "Importing..." : `Import ${importable} product${importable === 1 ? "" : "s"}`}
            </button>
          </div>

          {/* Row-by-row plan */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plan.rows.map((row) => (
                    <tr key={`${row.lineNumber}-${row.sku}`} className="align-top">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {row.lineNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 text-xs truncate max-w-xs">
                          {row.name || "—"}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {row.sku || "no SKU"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={row.action} />
                        {row.draft && (
                          <div className="text-[10px] text-amber-700 mt-1">draft</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs space-y-1">
                        {row.changedFields.length > 0 && (
                          <div className="text-gray-600">
                            Changes: {row.changedFields.join(", ")}
                          </div>
                        )}
                        {row.slugTo && row.slugFrom && row.slugTo !== row.slugFrom && (
                          <div className="text-blue-700">
                            URL: {row.slugFrom} → {row.slugTo}
                          </div>
                        )}
                        {row.warnings.map((warning) => (
                          <div key={warning} className="text-amber-700">
                            {warning}
                          </div>
                        ))}
                        {row.errors.map((rowError) => (
                          <div key={rowError} className="text-red-700">
                            {rowError}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
