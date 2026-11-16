"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, X, Pencil, Trash2 } from "lucide-react";
import Toast from "@/components/Toast";
import { PageHeader, MacroLine, EmptyState } from "@/components/ui";
import type { FoodDictionaryEntry } from "@/lib/types";

type Tab = "goals" | "dictionary";

const EMPTY_FORM = {
  food_name: "",
  state: "cooked" as "cooked" | "raw",
  calories_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fat_per_100g: "",
};

const ENTRY_MACROS = [
  { key: "calories_per_100g" as const, label: "Calories", unit: "kcal", color: "var(--brand)" },
  { key: "protein_per_100g" as const, label: "Protein", unit: "g", color: "var(--protein)" },
  { key: "carbs_per_100g" as const, label: "Carbs", unit: "g", color: "var(--carbs)" },
  { key: "fat_per_100g" as const, label: "Fat", unit: "g", color: "var(--fat)" },
];

// ─── Number field with a unit suffix ─────────────────────────────────────────

function UnitField({
  id,
  label,
  hint,
  unit,
  color,
  value,
  onChange,
  placeholder,
  step,
}: {
  id: string;
  label: string;
  hint?: string;
  unit: string;
  color?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label flex items-center gap-1.5">
        {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />}
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="field num pr-14 font-semibold"
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-3 pointer-events-none">
          {unit}
        </span>
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

// ─── Dictionary entry form (add and edit) ────────────────────────────────────

function EntryForm({
  idPrefix,
  values,
  onChange,
  onSave,
  onCancel,
  saveLabel,
  isSaving,
}: {
  idPrefix: string;
  values: typeof EMPTY_FORM;
  onChange: (k: keyof typeof EMPTY_FORM, v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  isSaving: boolean;
}) {
  return (
    <form
      className="space-y-4 rise"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-name`} className="field-label">
            Food name
          </label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={values.food_name}
            onChange={(e) => onChange("food_name", e.target.value)}
            placeholder="e.g. boneless chicken thigh"
            className="field"
            autoFocus
          />
        </div>
        <div>
          <span className="field-label">State</span>
          <div className="segmented w-full sm:w-auto" role="group" aria-label="State">
            {(["cooked", "raw"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={values.state === opt}
                onClick={() => onChange("state", opt)}
                className="flex-1 capitalize !min-h-[40px]"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="field-label">Per 100g</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ENTRY_MACROS.map(({ key, label, unit, color }) => (
            <UnitField
              key={key}
              id={`${idPrefix}-${key}`}
              label={label}
              unit={unit}
              color={color}
              value={values[key]}
              onChange={(v) => onChange(key, v)}
              placeholder="0"
              step={key === "calories_per_100g" ? "1" : "0.1"}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 sm:justify-end">
        <button type="button" onClick={onCancel} className="btn btn-secondary flex-1 sm:flex-none">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !values.food_name.trim()}
          className="btn btn-primary flex-[2] sm:flex-none"
        >
          {isSaving ? "Saving…" : saveLabel}
        </button>
      </div>
    </form>
  );
}

// ─── Dictionary row ──────────────────────────────────────────────────────────

function EntryRow({
  entry,
  confirmingDelete,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  entry: FoodDictionaryEntry;
  confirmingDelete: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  return (
    <div className="px-4 sm:px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink capitalize">{entry.food_name}</span>
            <span className="chip capitalize">{entry.state}</span>
          </p>
          <p className="flex items-center gap-3 flex-wrap mt-1.5">
            <span className="num text-xs font-semibold text-ink">
              {entry.calories_per_100g} kcal
              <span className="font-normal text-ink-3">
                {" "}
                {entry.unit_type === "item" ? "per item" : "per 100g"}
              </span>
            </span>
            <MacroLine
              protein={entry.protein_per_100g}
              carbs={entry.carbs_per_100g}
              fat={entry.fat_per_100g}
              digits={1}
            />
          </p>
        </div>

        {!confirmingDelete && (
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit} className="btn btn-ghost btn-sm btn-icon" aria-label={`Edit ${entry.food_name}`}>
              <Pencil size={16} />
            </button>
            <button
              onClick={onDeleteRequest}
              className="btn btn-ghost btn-sm btn-icon"
              aria-label={`Delete ${entry.food_name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-line fade">
          <p className="text-sm text-ink-2">Delete this food?</p>
          <div className="flex gap-2">
            <button onClick={onDeleteCancel} className="btn btn-secondary btn-sm">
              Keep
            </button>
            <button onClick={onDeleteConfirm} className="btn btn-danger btn-sm">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("goals");

  // Goals state
  const [maintenanceCalories, setMaintenanceCalories] = useState("");
  const [targetCalories, setTargetCalories]   = useState("");
  const [targetProtein, setTargetProtein]     = useState("");
  const [targetCarbs, setTargetCarbs]         = useState("");
  const [targetFat, setTargetFat]             = useState("");
  const [isLoadingGoals, setIsLoadingGoals]   = useState(true);
  const [isSaving, setIsSaving]               = useState(false);

  // Dictionary state
  const [dictEntries, setDictEntries]           = useState<FoodDictionaryEntry[]>([]);
  const [dictSearch, setDictSearch]             = useState("");
  const [isDictLoading, setIsDictLoading]       = useState(false);
  const [showAddForm, setShowAddForm]           = useState(false);
  const [addForm, setAddForm]                   = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [editingId, setEditingId]               = useState<number | null>(null);
  const [editForm, setEditForm]                 = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [isSavingEntry, setIsSavingEntry]       = useState(false);
  const dictFetched = useRef(false);

  // Shared toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Load settings ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setMaintenanceCalories(String(d.settings.maintenance_calories));
          setTargetCalories(String(d.settings.target_calories ?? 2000));
          setTargetProtein(String(d.settings.target_protein));
          setTargetCarbs(String(d.settings.target_carbs ?? 250));
          setTargetFat(String(d.settings.target_fat ?? 70));
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingGoals(false));
  }, []);

  // ── Load dictionary on first tab visit ────────────────────────────────────

  const fetchDictionary = useCallback(async (search = dictSearch) => {
    setIsDictLoading(true);
    try {
      const res = await fetch(`/api/dictionary?search=${encodeURIComponent(search)}&limit=50`);
      const data = await res.json();
      if (data.entries) setDictEntries(data.entries);
    } catch {
      setToast({ message: "Failed to load dictionary", type: "error" });
    } finally {
      setIsDictLoading(false);
    }
  }, [dictSearch]);

  useEffect(() => {
    if (activeTab === "dictionary" && !dictFetched.current) {
      dictFetched.current = true;
      fetchDictionary();
    }
  }, [activeTab, fetchDictionary]);

  // ── Goals ─────────────────────────────────────────────────────────────────

  const handleSaveGoals = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenance_calories: Number(maintenanceCalories),
          target_calories:      Number(targetCalories),
          target_protein:       Number(targetProtein),
          target_carbs:         Number(targetCarbs),
          target_fat:           Number(targetFat),
        }),
      });
      const data = await res.json();
      setToast(data.success
        ? { message: "Goals saved!", type: "success" }
        : { message: data.error || "Failed to save", type: "error" }
      );
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Dictionary ────────────────────────────────────────────────────────────

  const handleDictSearch = (v: string) => {
    setDictSearch(v);
    fetchDictionary(v);
  };

  const handleAddEntry = async () => {
    if (isSavingEntry || !addForm.food_name.trim()) return;
    setIsSavingEntry(true);
    try {
      const res = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name:        addForm.food_name.trim().toLowerCase(),
          state:            addForm.state,
          calories_per_100g: Number(addForm.calories_per_100g),
          protein_per_100g:  Number(addForm.protein_per_100g),
          carbs_per_100g:    Number(addForm.carbs_per_100g),
          fat_per_100g:      Number(addForm.fat_per_100g),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `"${addForm.food_name}" added to dictionary`, type: "success" });
        setAddForm({ ...EMPTY_FORM });
        setShowAddForm(false);
        fetchDictionary();
      } else {
        setToast({ message: data.error || "Failed to add entry", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleStartEdit = (entry: FoodDictionaryEntry) => {
    setEditingId(entry.id);
    setConfirmingDeleteId(null);
    setShowAddForm(false);
    setEditForm({
      food_name:         entry.food_name,
      state:             entry.state as "raw" | "cooked",
      calories_per_100g: String(entry.calories_per_100g),
      protein_per_100g:  String(entry.protein_per_100g),
      carbs_per_100g:    String(entry.carbs_per_100g),
      fat_per_100g:      String(entry.fat_per_100g),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || isSavingEntry) return;
    setIsSavingEntry(true);
    try {
      const res = await fetch("/api/dictionary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:               editingId,
          food_name:        editForm.food_name.trim().toLowerCase(),
          state:            editForm.state,
          calories_per_100g: Number(editForm.calories_per_100g),
          protein_per_100g:  Number(editForm.protein_per_100g),
          carbs_per_100g:    Number(editForm.carbs_per_100g),
          fat_per_100g:      Number(editForm.fat_per_100g),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: "Entry updated", type: "success" });
        setEditingId(null);
        fetchDictionary();
      } else {
        setToast({ message: data.error || "Failed to update", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteConfirm = async (id: number, name: string) => {
    try {
      const res = await fetch("/api/dictionary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `"${name}" deleted`, type: "success" });
        setConfirmingDeleteId(null);
        fetchDictionary();
      } else {
        setToast({ message: data.error || "Failed to delete", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const goalsValid = maintenanceCalories && targetCalories && targetProtein && targetCarbs && targetFat;
  const plannedDeficit = Number(maintenanceCalories) - Number(targetCalories);

  return (
    <>
      <PageHeader
        eyebrow="Goals and saved foods"
        title="Settings"
        action={
          <div className="segmented" role="group" aria-label="Settings section">
            {(["goals", "dictionary"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                aria-pressed={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className="capitalize"
              >
                {tab}
              </button>
            ))}
          </div>
        }
      />

      {/* ── Goals ── */}
      {activeTab === "goals" && (
        <div className="max-w-3xl space-y-5">
          {isLoadingGoals ? (
            <>
              <div className="skeleton h-44 !rounded-[20px]" />
              <div className="skeleton h-36 !rounded-[20px]" />
            </>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveGoals();
              }}
            >
              <section className="card p-5 sm:p-6">
                <h2 className="text-base font-semibold text-ink mb-4">Calories</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <UnitField
                    id="goal-maintenance"
                    label="Maintenance"
                    hint="Your TDEE. Used to work out your deficit."
                    unit="kcal"
                    value={maintenanceCalories}
                    onChange={setMaintenanceCalories}
                    placeholder="2500"
                  />
                  <UnitField
                    id="goal-target"
                    label="Daily target"
                    hint="What you aim to eat each day."
                    unit="kcal"
                    value={targetCalories}
                    onChange={setTargetCalories}
                    placeholder="2000"
                  />
                </div>
                {maintenanceCalories && targetCalories && (
                  <p
                    className={`num text-sm font-medium mt-4 rounded-xl px-3.5 py-2.5 ${
                      plannedDeficit > 0 ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger"
                    }`}
                  >
                    {plannedDeficit > 0
                      ? `Planned deficit: ${plannedDeficit.toLocaleString()} kcal a day`
                      : `Target is ${Math.abs(plannedDeficit).toLocaleString()} kcal above maintenance`}
                  </p>
                )}
              </section>

              <section className="card p-5 sm:p-6">
                <h2 className="text-base font-semibold text-ink mb-4">Daily macros</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <UnitField
                    id="goal-protein"
                    label="Protein"
                    unit="g"
                    color="var(--protein)"
                    value={targetProtein}
                    onChange={setTargetProtein}
                    placeholder="180"
                  />
                  <UnitField
                    id="goal-carbs"
                    label="Carbs"
                    unit="g"
                    color="var(--carbs)"
                    value={targetCarbs}
                    onChange={setTargetCarbs}
                    placeholder="250"
                  />
                  <UnitField
                    id="goal-fat"
                    label="Fat"
                    unit="g"
                    color="var(--fat)"
                    value={targetFat}
                    onChange={setTargetFat}
                    placeholder="70"
                  />
                </div>
              </section>

              <div className="flex sm:justify-end">
                <button
                  type="submit"
                  disabled={isSaving || !goalsValid}
                  className="btn btn-primary w-full sm:w-auto sm:min-w-40"
                >
                  {isSaving ? "Saving…" : "Save goals"}
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-ink-3 leading-relaxed pt-2">
            This is a demo build. Everything you enter is stored in this browser only, and can be
            cleared with “Reset sample data” at the top of the page.
          </p>
        </div>
      )}

      {/* ── Dictionary ── */}
      {activeTab === "dictionary" && (
        <div className="max-w-3xl space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
              />
              <input
                type="text"
                value={dictSearch}
                onChange={(e) => handleDictSearch(e.target.value)}
                placeholder="Search saved foods"
                aria-label="Search saved foods"
                className="field pl-11"
              />
            </div>
            <button
              onClick={() => {
                setShowAddForm((v) => !v);
                setEditingId(null);
                setConfirmingDeleteId(null);
                if (!showAddForm) setAddForm({ ...EMPTY_FORM });
              }}
              className={`btn ${showAddForm ? "btn-secondary" : "btn-primary"}`}
            >
              {showAddForm ? <X size={16} /> : <Plus size={16} strokeWidth={2.4} />}
              {showAddForm ? "Cancel" : "Add food"}
            </button>
          </div>

          {showAddForm && (
            <section className="card p-5 sm:p-6" aria-label="Add food">
              <h2 className="text-base font-semibold text-ink mb-4">New saved food</h2>
              <EntryForm
                idPrefix="add"
                values={addForm}
                onChange={(k, v) => setAddForm((p) => ({ ...p, [k]: v }))}
                onSave={handleAddEntry}
                onCancel={() => {
                  setShowAddForm(false);
                  setAddForm({ ...EMPTY_FORM });
                }}
                saveLabel="Add to dictionary"
                isSaving={isSavingEntry}
              />
            </section>
          )}

          {isDictLoading && dictEntries.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-16" />
              ))}
            </div>
          ) : dictEntries.length === 0 ? (
            <EmptyState
              title={dictSearch ? "No foods match your search" : "No saved foods yet"}
              hint={dictSearch ? "Try a different name." : "Add the staples you eat most to log them in one tap."}
            />
          ) : (
            <>
              <p className="eyebrow px-1">
                {dictEntries.length} {dictEntries.length === 1 ? "food" : "foods"}
                {dictSearch && ` matching “${dictSearch}”`}
              </p>
              <ul className="card divide-y divide-line overflow-hidden">
                {dictEntries.map((entry) => (
                  <li key={entry.id}>
                    {editingId === entry.id ? (
                      <div className="p-4 sm:p-5 bg-bg">
                        <EntryForm
                          idPrefix={`edit-${entry.id}`}
                          values={editForm}
                          onChange={(k, v) => setEditForm((p) => ({ ...p, [k]: v }))}
                          onSave={handleSaveEdit}
                          onCancel={() => setEditingId(null)}
                          saveLabel="Save changes"
                          isSaving={isSavingEntry}
                        />
                      </div>
                    ) : (
                      <EntryRow
                        entry={entry}
                        confirmingDelete={confirmingDeleteId === entry.id}
                        onEdit={() => handleStartEdit(entry)}
                        onDeleteRequest={() => {
                          setConfirmingDeleteId(entry.id);
                          setEditingId(null);
                        }}
                        onDeleteConfirm={() => handleDeleteConfirm(entry.id, entry.food_name)}
                        onDeleteCancel={() => setConfirmingDeleteId(null)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
