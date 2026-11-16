"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search, Camera, ScanBarcode, Plus, X, ArrowRight, LoaderCircle } from "lucide-react";
import type { FoodLogEntry, UserSettings, PendingLog, FoodDictionaryEntry } from "@/lib/types";
import { todayStr, shiftDate, formatDate, sumLogs } from "@/lib/dates";
import Toast from "@/components/Toast";
import LogDrawer from "@/components/LogDrawer";
import Sheet from "@/components/Sheet";
import { PageHeader, CalorieRing, MacroBar, MacroLine, EmptyState } from "@/components/ui";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });

interface BarcodeProduct {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

export default function HomePage() {
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    id: 1,
    maintenance_calories: 2500,
    target_calories: 2000,
    target_protein: 180,
    target_carbs: 250,
    target_fat: 70,
  });

  // Scan label modal
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanWeight, setScanWeight] = useState("");
  const [scanFoodName, setScanFoodName] = useState("");
  const [scanImage, setScanImage] = useState<File | null>(null);
  const [isScanLoading, setIsScanLoading] = useState(false);

  // Barcode
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);
  const [barcodeWeight, setBarcodeWeight] = useState("");

  // Verify drawer
  const [pendingLog, setPendingLog] = useState<PendingLog | null>(null);
  const [drawerExiting, setDrawerExiting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Ring animation
  const [pillsReady, setPillsReady] = useState(false);
  const [today, setToday] = useState(todayStr);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const tomorrow = shiftDate(today, 1);

  // Autocomplete
  const [acResults, setAcResults] = useState<FoodDictionaryEntry[]>([]);
  const [showAc, setShowAc] = useState(false);
  const [selectedDictItem, setSelectedDictItem] = useState<FoodDictionaryEntry | null>(null);
  const [quickLogWeight, setQuickLogWeight] = useState("");
  const quickLogWeightRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto day-roll
  useEffect(() => {
    const checkDate = () => {
      const current = todayStr();
      setToday((prev) => {
        if (current !== prev) {
          setLogs([]);
          setPillsReady(false);
          setSelectedDate(current);
        }
        return current;
      });
    };
    document.addEventListener("visibilitychange", checkDate);
    return () => document.removeEventListener("visibilitychange", checkDate);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogs([]);
    setPillsReady(false);
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/logs?date=${selectedDate}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch {
      console.error("Failed to fetch logs");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isLoadingLogs) {
      const t = setTimeout(() => setPillsReady(true), 80);
      return () => clearTimeout(t);
    }
  }, [isLoadingLogs]);

  // Autocomplete debounce
  useEffect(() => {
    if (inputText.trim().length < 2) {
      setAcResults([]);
      setShowAc(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/dictionary?search=${encodeURIComponent(inputText.trim())}&limit=6`
        );
        const data = await res.json();
        setAcResults(data.entries ?? []);
        setShowAc(true);
      } catch {
        // silent fail
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputText]);

  // Click-outside to close autocomplete
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowAc(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totals = sumLogs(logs);

  // Preview URL for the label photo, released when the photo changes
  const scanPreviewUrl = useMemo(() => (scanImage ? URL.createObjectURL(scanImage) : null), [scanImage]);
  useEffect(() => {
    return () => {
      if (scanPreviewUrl) URL.revokeObjectURL(scanPreviewUrl);
    };
  }, [scanPreviewUrl]);

  // ── Drawer helpers ──

  const closeDrawer = (andThen?: () => void) => {
    setDrawerExiting(true);
    setTimeout(() => {
      setPendingLog(null);
      setDrawerExiting(false);
      andThen?.();
    }, 260);
  };

  const handleConfirmLog = async (log: PendingLog) => {
    setIsConfirming(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      const data = await res.json();
      if (data.success) {
        closeDrawer(() => {
          setToast({ message: `${log.food_name} — ${log.calories} kcal`, type: "success" });
          fetchLogs();
        });
      } else {
        setToast({ message: data.error || "Failed to log", type: "error" });
      }
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Text log ──

  const submitText = async (text: string) => {
    if (!text.trim() || isLogging) return;
    setShowAc(false);
    setIsLogging(true);
    try {
      const res = await fetch("/api/log-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, date: selectedDate }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setToast({ message: data.error || "Rate limit hit. Please wait.", type: "error" });
        return;
      }
      if (data.success && data.pending) {
        setInputText("");
        setPendingLog(data.pending);
      } else {
        setToast({ message: data.error || "Failed to parse food", type: "error" });
      }
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setIsLogging(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitText(inputText);
  };

  // ── Autocomplete quick-log ──

  const handleDictSelect = (entry: FoodDictionaryEntry) => {
    setSelectedDictItem(entry);
    setShowAc(false);
    setInputText("");
    setQuickLogWeight("");
    setTimeout(() => quickLogWeightRef.current?.focus(), 50);
  };

  const handleQuickLog = () => {
    if (!selectedDictItem || !quickLogWeight) return;
    const w = Number(quickLogWeight);
    if (!w || w <= 0) return;
    const isItem = selectedDictItem.unit_type === "item";
    const multiplier = isItem ? w : w / 100;
    setPendingLog({
      food_name: isItem
        ? `${w}× ${selectedDictItem.state} ${selectedDictItem.food_name}`
        : `${w}g ${selectedDictItem.state} ${selectedDictItem.food_name}`,
      date: selectedDate,
      weight_g: w,
      calories: Math.round(selectedDictItem.calories_per_100g * multiplier),
      protein: Math.round(selectedDictItem.protein_per_100g * multiplier * 100) / 100,
      carbs: Math.round(selectedDictItem.carbs_per_100g * multiplier * 100) / 100,
      fat: Math.round(selectedDictItem.fat_per_100g * multiplier * 100) / 100,
      logged_via: "dictionary",
    });
    setSelectedDictItem(null);
    setQuickLogWeight("");
  };

  // ── Label scan ──

  const handleScanSubmit = async () => {
    if (!scanImage || !scanWeight || isScanLoading) return;
    setIsScanLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", scanImage);
      formData.append("weight", scanWeight);
      formData.append("date", selectedDate);
      if (scanFoodName) formData.append("foodName", scanFoodName);

      const res = await fetch("/api/scan-label", { method: "POST", body: formData });
      if (res.status === 429) {
        setToast({ message: "Take a breather! API cooling down for 60 seconds.", type: "error" });
        return;
      }
      const data = await res.json();

      if (data.success && data.pending) {
        setShowScanModal(false);
        setScanWeight("");
        setScanFoodName("");
        setScanImage(null);
        setPendingLog(data.pending);
      } else {
        setToast({ message: data.error || "Scan failed", type: "error" });
      }
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setIsScanLoading(false);
    }
  };

  // ── Barcode ──

  const handleBarcodeDetected = async (barcode: string) => {
    setShowBarcodeScanner(false);
    setToast({ message: "Looking up product…", type: "success" });
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const n = p.nutriments ?? {};
        setBarcodeProduct({
          name: p.product_name || p.product_name_en || "Scanned product",
          calories_per_100g: n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0,
          protein_per_100g: n.proteins_100g ?? 0,
          carbs_per_100g: n.carbohydrates_100g ?? 0,
          fat_per_100g: n.fat_100g ?? 0,
        });
      } else {
        setToast({ message: "Product not found in database", type: "error" });
        setTimeout(() => fileInputRef.current?.click(), 400);
      }
    } catch {
      setToast({ message: "Failed to look up barcode", type: "error" });
    }
  };

  const handleBarcodeWeightConfirm = () => {
    if (!barcodeProduct || !barcodeWeight) return;
    const w = Number(barcodeWeight);
    if (!w) return;
    const m = w / 100;
    setPendingLog({
      food_name: barcodeProduct.name,
      date: selectedDate,
      weight_g: w,
      calories: Math.round(barcodeProduct.calories_per_100g * m),
      protein: Math.round(barcodeProduct.protein_per_100g * m * 100) / 100,
      carbs: Math.round(barcodeProduct.carbs_per_100g * m * 100) / 100,
      fat: Math.round(barcodeProduct.fat_per_100g * m * 100) / 100,
      logged_via: "barcode",
    });
    setBarcodeProduct(null);
    setBarcodeWeight("");
  };

  const target = settings.target_calories ?? 2000;

  const remaining = target - totals.calories;
  const isOver = remaining < 0;
  const busy = isLogging || isScanLoading;

  return (
    <>
      <PageHeader
        eyebrow={formatDate(selectedDate)}
        title={selectedDate === tomorrow ? "Tomorrow" : "Today"}
        action={
          <div className="segmented" role="group" aria-label="Day to log">
            {[
              { label: "Today", value: today },
              { label: "Tomorrow", value: tomorrow },
            ].map(({ label, value }) => (
              <button
                key={label}
                type="button"
                aria-pressed={selectedDate === value}
                onClick={() => setSelectedDate(value)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* ── Day summary ── */}
        <section className="card p-5 sm:p-6" aria-label="Day summary">
          <div className="flex items-center gap-5 sm:gap-8">
            <CalorieRing calories={totals.calories} target={target} ready={pillsReady} />
            <div className="min-w-0">
              <p className="eyebrow">{isOver ? "Over target" : "Remaining"}</p>
              <p className={`display num text-5xl mt-2 ${isOver ? "text-danger" : "text-ink"}`}>
                {Math.abs(remaining).toLocaleString()}
              </p>
              <p className="num text-sm text-ink-3 mt-2">
                kcal · target {target.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-line space-y-4">
            <MacroBar
              label="Protein"
              value={totals.protein}
              target={settings.target_protein}
              color="var(--protein)"
              ready={pillsReady}
            />
            <MacroBar
              label="Carbs"
              value={totals.carbs}
              target={settings.target_carbs}
              color="var(--carbs)"
              ready={pillsReady}
            />
            <MacroBar
              label="Fat"
              value={totals.fat}
              target={settings.target_fat}
              color="var(--fat)"
              ready={pillsReady}
            />
          </div>
        </section>

        <div className="space-y-5 min-w-0">
          {/* ── Log food ── */}
          <section className="card p-5 sm:p-6" aria-label="Log food">
            <h2 className="text-base font-semibold text-ink">Log food</h2>
            <p className="text-sm text-ink-3 mt-0.5 mb-4">
              Pick a saved food, or describe a meal like “2 eggs and toast”.
            </p>

            <div className="relative" ref={searchContainerRef}>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
                    {isLogging ? (
                      <LoaderCircle size={18} className="animate-spin text-brand" />
                    ) : (
                      <Search size={18} />
                    )}
                  </span>
                  <input
                    ref={textInputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => acResults.length > 0 && setShowAc(true)}
                    placeholder="2 eggs on toast"
                    aria-label="Food to log"
                    className="field pl-11"
                    disabled={busy}
                    autoComplete="off"
                    enterKeyHint="send"
                  />
                </div>
                <button type="submit" disabled={busy || !inputText.trim()} className="btn btn-primary">
                  <Plus size={16} strokeWidth={2.4} />
                  {isLogging ? "Working…" : "Log"}
                </button>
              </form>

              {/* Autocomplete */}
              {showAc && (
                <div className="absolute inset-x-0 top-full mt-2 z-30 card shadow-pop overflow-hidden rise">
                  {acResults.length > 0 ? (
                    <>
                      <p className="eyebrow px-4 pt-3 pb-1">Saved foods</p>
                      <ul>
                        {acResults.map((entry) => (
                          <li key={entry.id} className="border-t border-line first:border-t-0">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleDictSelect(entry);
                              }}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
                            >
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-ink capitalize truncate">
                                  {entry.food_name}
                                </span>
                                <span className="block text-xs text-ink-3 mt-0.5 truncate">
                                  {entry.state} · {entry.calories_per_100g} kcal{" "}
                                  {entry.unit_type === "item" ? "per item" : "per 100g"}
                                </span>
                              </span>
                              <Plus size={16} className="text-ink-3 flex-shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <p className="text-sm text-ink-2 min-w-0">
                        Not in your saved foods. Press Enter to estimate it.
                      </p>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          submitText(inputText);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        Estimate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick-log: amount for a saved food */}
            {selectedDictItem && (
              <div className="mt-3 rounded-2xl border border-line bg-bg p-3 rise">
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink capitalize truncate">
                      {selectedDictItem.food_name} · {selectedDictItem.state}
                    </p>
                    <p className="num text-xs text-ink-3 mt-0.5">
                      {selectedDictItem.calories_per_100g} kcal{" "}
                      {selectedDictItem.unit_type === "item" ? "per item" : "per 100g"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDictItem(null);
                      setQuickLogWeight("");
                    }}
                    className="btn btn-ghost btn-sm btn-icon -mr-1 -mt-1"
                    aria-label="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={quickLogWeightRef}
                    type="number"
                    inputMode="decimal"
                    value={quickLogWeight}
                    onChange={(e) => setQuickLogWeight(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuickLog()}
                    placeholder={selectedDictItem.unit_type === "item" ? "How many?" : "Grams"}
                    aria-label={selectedDictItem.unit_type === "item" ? "Quantity" : "Weight in grams"}
                    className="field num flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleQuickLog}
                    disabled={!quickLogWeight}
                    className="btn btn-primary"
                  >
                    Log
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="btn btn-secondary"
              >
                <Camera size={16} />
                Scan label
              </button>
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                disabled={busy}
                className="btn btn-secondary"
              >
                <ScanBarcode size={16} />
                Barcode
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setScanImage(file);
                  setShowScanModal(true);
                }
                e.target.value = "";
              }}
            />
          </section>

          {/* ── Entries for the selected day ── */}
          <section aria-label="Logged entries">
            <div className="flex items-baseline justify-between gap-3 mb-3 px-1">
              <h2 className="text-base font-semibold text-ink">
                {selectedDate === tomorrow ? "Planned" : "Logged"}
                {logs.length > 0 && <span className="num text-ink-3 font-medium"> · {logs.length}</span>}
              </h2>
              <Link
                href={`/ledger?date=${selectedDate}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
              >
                Open ledger <ArrowRight size={14} />
              </Link>
            </div>

            {isLoadingLogs ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-14" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <EmptyState
                title={selectedDate === tomorrow ? "Nothing planned yet" : "Nothing logged yet"}
                hint="Your entries for the day show up here."
              />
            ) : (
              <ul className="card divide-y divide-line overflow-hidden">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{log.food_name}</p>
                      <div className="mt-1">
                        <MacroLine protein={log.protein} carbs={log.carbs} fat={log.fat} />
                      </div>
                    </div>
                    <p className="num text-sm font-semibold text-ink flex-shrink-0">
                      {log.calories.toLocaleString()}
                      <span className="text-xs font-medium text-ink-3"> kcal</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ── Scan label ── */}
      {showScanModal && (
        <Sheet title="Scan nutrition label" onClose={() => setShowScanModal(false)}>
          {scanPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scanPreviewUrl}
              alt="Label preview"
              className="w-full max-h-48 object-cover rounded-2xl border border-line mb-4"
            />
          )}
          <div className="space-y-3 mb-5">
            <div>
              <label className="field-label" htmlFor="scan-name">
                Food name <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <input
                id="scan-name"
                type="text"
                value={scanFoodName}
                onChange={(e) => setScanFoodName(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="scan-weight">
                Amount eaten, in grams
              </label>
              <input
                id="scan-weight"
                type="number"
                inputMode="decimal"
                value={scanWeight}
                onChange={(e) => setScanWeight(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanSubmit()}
                className="field num"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary flex-1">
              {scanImage ? "Retake" : "Choose photo"}
            </button>
            <button
              onClick={handleScanSubmit}
              disabled={!scanImage || !scanWeight || isScanLoading}
              className="btn btn-primary flex-[2]"
            >
              {isScanLoading ? "Scanning…" : "Scan & review"}
            </button>
          </div>
        </Sheet>
      )}

      {/* ── Barcode camera ── */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* ── Barcode: amount eaten ── */}
      {barcodeProduct && (
        <Sheet
          eyebrow="Product found"
          title={barcodeProduct.name}
          onClose={() => {
            setBarcodeProduct(null);
            setBarcodeWeight("");
          }}
        >
          <div className="rounded-2xl border border-line bg-bg px-4 py-3 mb-4">
            <p className="num text-sm font-semibold text-ink">
              {barcodeProduct.calories_per_100g} kcal{" "}
              <span className="font-normal text-ink-3">per 100g</span>
            </p>
            <div className="mt-1">
              <MacroLine
                protein={barcodeProduct.protein_per_100g}
                carbs={barcodeProduct.carbs_per_100g}
                fat={barcodeProduct.fat_per_100g}
                digits={1}
              />
            </div>
          </div>
          <label className="field-label" htmlFor="barcode-weight">
            Amount eaten, in grams
          </label>
          <input
            id="barcode-weight"
            type="number"
            inputMode="decimal"
            value={barcodeWeight}
            onChange={(e) => setBarcodeWeight(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBarcodeWeightConfirm()}
            className="field num mb-5"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setBarcodeProduct(null);
                setBarcodeWeight("");
              }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleBarcodeWeightConfirm}
              disabled={!barcodeWeight}
              className="btn btn-primary flex-[2]"
            >
              Continue
            </button>
          </div>
        </Sheet>
      )}

      {/* ── Verify before saving ── */}
      {pendingLog && (
        <LogDrawer
          pending={pendingLog}
          isExiting={drawerExiting}
          isSubmitting={isConfirming}
          onConfirm={handleConfirmLog}
          onDiscard={() => closeDrawer()}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
