import React, { useState, useEffect } from "react";
import {
  Clock, Plus, Trash2, CheckCircle2, Copy, Save, AlertTriangle,
  ArrowUp, ArrowDown, Coffee, Utensils, BookOpen, Check, RefreshCw,
  Sparkles, Calendar, Layers, Sliders, ChevronRight
} from "lucide-react";
import { ApiService } from "@/services/api";

// ─── Interfaces ───────────────────────────────────────────────

export interface SchemaSlot {
  id: string;
  label: string;
  short: string;
  type: "teaching" | "break" | "lunch";
  isBreak?: boolean;
  title?: string;
}

export interface TimetableSchema {
  id: string;
  name: string;
  description: string;
  working_days: string[];
  slots: SchemaSlot[];
  is_default?: boolean;
  created_at?: string;
}

export const PRESET_SCHEMAS: TimetableSchema[] = [
  {
    id: "schema-std-8",
    name: "Standard University 8-Slot (Lunch at 12:00)",
    description: "8 hourly teaching slots with a central 12:00–13:00 lunch break. Ideal for standard degree programs.",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    is_default: true,
    slots: [
      { id: "08:00", label: "08:00 – 09:00", short: "08:00", type: "teaching" },
      { id: "09:00", label: "09:00 – 10:00", short: "09:00", type: "teaching" },
      { id: "10:00", label: "10:00 – 11:00", short: "10:00", type: "teaching" },
      { id: "11:00", label: "11:00 – 12:00", short: "11:00", type: "teaching" },
      { id: "12:00", label: "12:00 – 13:00", short: "12:00", type: "lunch", isBreak: true, title: "Lunch Break" },
      { id: "13:00", label: "13:00 – 14:00", short: "13:00", type: "teaching" },
      { id: "14:00", label: "14:00 – 15:00", short: "14:00", type: "teaching" },
      { id: "15:00", label: "15:00 – 16:00", short: "15:00", type: "teaching" },
      { id: "16:00", label: "16:00 – 17:00", short: "16:00", type: "teaching" },
    ],
  },
  {
    id: "schema-auto-7",
    name: "Autonomous 7-Slot with Morning Recess",
    description: "Morning tea break after 2nd lecture + late lunch at 13:00. Balanced for lab-heavy curricula.",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    slots: [
      { id: "09:00", label: "09:00 – 10:00", short: "09:00", type: "teaching" },
      { id: "10:00", label: "10:00 – 11:00", short: "10:00", type: "teaching" },
      { id: "11:00", label: "11:00 – 11:30", short: "11:00", type: "break", isBreak: true, title: "Tea Break" },
      { id: "11:30", label: "11:30 – 12:30", short: "11:30", type: "teaching" },
      { id: "12:30", label: "12:30 – 13:30", short: "12:30", type: "teaching" },
      { id: "13:30", label: "13:30 – 14:30", short: "13:30", type: "lunch", isBreak: true, title: "Lunch Break" },
      { id: "14:30", label: "14:30 – 15:30", short: "14:30", type: "teaching" },
      { id: "15:30", label: "15:30 – 16:30", short: "15:30", type: "teaching" },
    ],
  },
  {
    id: "schema-ext-9",
    name: "Extended 9-Slot Campus (Two Breaks)",
    description: "Extended schedule running 08:00 to 17:30 with morning recess and midday lunch.",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    slots: [
      { id: "08:30", label: "08:30 – 09:30", short: "08:30", type: "teaching" },
      { id: "09:30", label: "09:30 – 10:30", short: "09:30", type: "teaching" },
      { id: "10:30", label: "10:30 – 11:00", short: "10:30", type: "break", isBreak: true, title: "Morning Recess" },
      { id: "11:00", label: "11:00 – 12:00", short: "11:00", type: "teaching" },
      { id: "12:00", label: "12:00 – 13:00", short: "12:00", type: "teaching" },
      { id: "13:00", label: "13:00 – 14:00", short: "13:00", type: "lunch", isBreak: true, title: "Lunch Break" },
      { id: "14:00", label: "14:00 – 15:00", short: "14:00", type: "teaching" },
      { id: "15:00", label: "15:00 – 16:00", short: "15:00", type: "teaching" },
      { id: "16:00", label: "16:00 – 17:00", short: "16:00", type: "teaching" },
    ],
  },
  {
    id: "schema-poly-6d",
    name: "6-Day Polytechnic (Monday–Saturday)",
    description: "6 working days with Saturday half-day slots. Includes designated 12:30 lunch break.",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    slots: [
      { id: "08:30", label: "08:30 – 09:30", short: "08:30", type: "teaching" },
      { id: "09:30", label: "09:30 – 10:30", short: "09:30", type: "teaching" },
      { id: "10:30", label: "10:30 – 11:30", short: "10:30", type: "teaching" },
      { id: "11:30", label: "11:30 – 12:30", short: "11:30", type: "teaching" },
      { id: "12:30", label: "12:30 – 13:30", short: "12:30", type: "lunch", isBreak: true, title: "Lunch Break" },
      { id: "13:30", label: "13:30 – 14:30", short: "13:30", type: "teaching" },
      { id: "14:30", label: "14:30 – 15:30", short: "14:30", type: "teaching" },
    ],
  },
];

export const SCHEMAS_STORAGE_KEY = "timegrid_timetable_schemas_v1";
export const ACTIVE_SCHEMA_ID_KEY = "timegrid_active_schema_id";

export default function TimetableSchemasPage() {
  const [schemas, setSchemas] = useState<TimetableSchema[]>(() => {
    try {
      const saved = localStorage.getItem(SCHEMAS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return PRESET_SCHEMAS;
  });

  const [activeSchemaId, setActiveSchemaId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_SCHEMA_ID_KEY) || PRESET_SCHEMAS[0].id;
  });

  const [selectedSchema, setSelectedSchema] = useState<TimetableSchema>(() => {
    const found = schemas.find((s) => s.id === activeSchemaId);
    return found || schemas[0] || PRESET_SCHEMAS[0];
  });

  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New slot form
  const [newSlotTime, setNewSlotTime] = useState("17:00");
  const [newSlotLabel, setNewSlotLabel] = useState("17:00 – 18:00");
  const [newSlotType, setNewSlotType] = useState<"teaching" | "break" | "lunch">("teaching");
  const [newSlotTitle, setNewSlotTitle] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // Persist schemas
  useEffect(() => {
    try {
      localStorage.setItem(SCHEMAS_STORAGE_KEY, JSON.stringify(schemas));
    } catch {}
  }, [schemas]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_SCHEMA_ID_KEY, activeSchemaId);
    } catch {}
  }, [activeSchemaId]);

  // Keep selectedSchema in sync if schemas change
  useEffect(() => {
    const current = schemas.find((s) => s.id === selectedSchema.id);
    if (current) setSelectedSchema(current);
  }, [schemas]);

  // ── Actions ──────────────────────────────────────────────────

  const handleSetActive = (schemaId: string) => {
    setActiveSchemaId(schemaId);
    showToast(`✓ Active template updated in Timetable Builder!`);
  };

  const handleSaveSchema = async () => {
    setSaving(true);
    try {
      // Save locally
      const updated = schemas.map((s) => (s.id === selectedSchema.id ? selectedSchema : s));
      setSchemas(updated);

      // Attempt backend sync
      try {
        await ApiService.createOrganizationSchedule({
          name: selectedSchema.name,
          working_days: selectedSchema.working_days,
          time_slots: selectedSchema.slots.map((s) => ({
            id: s.id,
            name: s.label,
            type: s.type === "teaching" ? "teaching" : "break",
            title: s.title || (s.type === "lunch" ? "Lunch Break" : "Recess"),
          })),
        });
      } catch {}

      showToast(`Saved "${selectedSchema.name}" successfully!`);
    } catch {
      showToast("Error saving schema");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewSchema = () => {
    const newSchema: TimetableSchema = {
      id: "schema-custom-" + Date.now(),
      name: "Custom Schedule Template " + (schemas.length + 1),
      description: "Custom academic slots definition with break configuration.",
      working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      slots: [
        { id: "08:00", label: "08:00 – 09:00", short: "08:00", type: "teaching" },
        { id: "09:00", label: "09:00 – 10:00", short: "09:00", type: "teaching" },
        { id: "10:00", label: "10:00 – 11:00", short: "10:00", type: "teaching" },
        { id: "11:00", label: "11:00 – 12:00", short: "11:00", type: "teaching" },
        { id: "12:00", label: "12:00 – 13:00", short: "12:00", type: "lunch", isBreak: true, title: "Lunch Break" },
        { id: "13:00", label: "13:00 – 14:00", short: "13:00", type: "teaching" },
        { id: "14:00", label: "14:00 – 15:00", short: "14:00", type: "teaching" },
      ],
    };

    setSchemas((prev) => [...prev, newSchema]);
    setSelectedSchema(newSchema);
    showToast(`Created new template: ${newSchema.name}`);
  };

  const handleDuplicateSchema = (s: TimetableSchema) => {
    const copy: TimetableSchema = {
      ...s,
      id: "schema-copy-" + Date.now(),
      name: s.name + " (Copy)",
      is_default: false,
    };
    setSchemas((prev) => [...prev, copy]);
    setSelectedSchema(copy);
    showToast(`Duplicated ${s.name}`);
  };

  const handleDeleteSchema = (id: string) => {
    if (schemas.length <= 1) {
      alert("At least one schedule template must remain.");
      return;
    }
    if (!window.confirm("Delete this timetable schema?")) return;

    const remaining = schemas.filter((s) => s.id !== id);
    setSchemas(remaining);
    if (selectedSchema.id === id) {
      setSelectedSchema(remaining[0]);
    }
    if (activeSchemaId === id) {
      setActiveSchemaId(remaining[0].id);
    }
    showToast("Template deleted");
  };

  const handleResetDefaults = () => {
    if (!window.confirm("Reset all templates back to default system presets?")) return;
    setSchemas(PRESET_SCHEMAS);
    setActiveSchemaId(PRESET_SCHEMAS[0].id);
    setSelectedSchema(PRESET_SCHEMAS[0]);
    showToast("Reset to default system presets");
  };

  // ── Slot Manipulation ────────────────────────────────────────

  const handleAddSlot = () => {
    if (!newSlotTime.trim() || !newSlotLabel.trim()) return;

    const newSlot: SchemaSlot = {
      id: newSlotTime.trim(),
      label: newSlotLabel.trim(),
      short: newSlotTime.trim(),
      type: newSlotType,
      isBreak: newSlotType !== "teaching",
      title: newSlotTitle.trim() || (newSlotType === "lunch" ? "Lunch Break" : newSlotType === "break" ? "Recess" : undefined),
    };

    setSelectedSchema((prev) => ({
      ...prev,
      slots: [...prev.slots, newSlot],
    }));

    setNewSlotTime("");
    setNewSlotLabel("");
    setNewSlotTitle("");
    showToast("Slot added");
  };

  const handleRemoveSlot = (index: number) => {
    setSelectedSchema((prev) => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index),
    }));
  };

  const handleMoveSlot = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedSchema.slots.length) return;

    const newSlots = [...selectedSchema.slots];
    const temp = newSlots[index];
    newSlots[index] = newSlots[targetIdx];
    newSlots[targetIdx] = temp;

    setSelectedSchema((prev) => ({ ...prev, slots: newSlots }));
  };

  const handleUpdateSlotType = (index: number, newType: "teaching" | "break" | "lunch") => {
    const newSlots = [...selectedSchema.slots];
    newSlots[index] = {
      ...newSlots[index],
      type: newType,
      isBreak: newType !== "teaching",
      title: newType === "lunch" ? "Lunch Break" : newType === "break" ? "Short Break" : undefined,
    };
    setSelectedSchema((prev) => ({ ...prev, slots: newSlots }));
  };

  const handleUpdateSlotTitle = (index: number, title: string) => {
    const newSlots = [...selectedSchema.slots];
    newSlots[index] = { ...newSlots[index], title };
    setSelectedSchema((prev) => ({ ...prev, slots: newSlots }));
  };

  const teachingSlotCount = selectedSchema.slots.filter((s) => s.type === "teaching").length;
  const breakSlotCount = selectedSchema.slots.filter((s) => s.type !== "teaching").length;

  return (
    <div className="flex flex-col h-[calc(100vh-5.25rem)] overflow-hidden animate-fadeIn">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slideUp">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <Sliders size={14} />
            <span>Academic Template Configuration</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Timetable Slot Schemas & Breaks
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Design daily period intervals, tea breaks, and lunch hours. Apply templates directly into the Timetable Builder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Reset Presets</span>
          </button>

          <button
            onClick={handleCreateNewSchema}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-2xs transition-all cursor-pointer hover:shadow-xs"
          >
            <Plus size={14} />
            <span>Create New Schema</span>
          </button>
        </div>
      </div>

      {/* Two-Column Editor Layout */}
      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden mt-3">
        {/* ── LEFT: Schema Cards Roster ── */}
        <div className="w-88 flex-shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-600" />
              <span>Available Schemas ({schemas.length})</span>
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
            {schemas.map((s) => {
              const isSelected = s.id === selectedSchema.id;
              const isActiveDefault = s.id === activeSchemaId;
              const teachCount = s.slots.filter((x) => x.type === "teaching").length;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSchema(s)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {s.name}
                        </span>
                        {isActiveDefault && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 font-medium leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>

                  {/* Badges footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-600">
                        {teachCount} Teaching Slots
                      </span>
                      <span>·</span>
                      <span className="font-bold text-indigo-700">
                        {s.working_days.length}d/week
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!isActiveDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetActive(s.id)}
                          className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[9px] transition-all cursor-pointer"
                        >
                          Use in Builder
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDuplicateSchema(s)}
                        title="Duplicate"
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                      >
                        <Copy size={12} />
                      </button>
                      {schemas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSchema(s.id)}
                          title="Delete"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Interactive Visual Slot Builder ── */}
        <div className="flex-1 min-h-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900">{selectedSchema.name}</h2>
                {selectedSchema.id === activeSchemaId ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Active Builder Schema
                  </span>
                ) : (
                  <button
                    onClick={() => handleSetActive(selectedSchema.id)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all cursor-pointer"
                  >
                    Set as Active Default
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {teachingSlotCount} Teaching Periods + {breakSlotCount} Breaks · {selectedSchema.working_days.length} Days / Week
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveSchema}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Save Schema</span>
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
            {/* Meta Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Schema Template Name
                </label>
                <input
                  type="text"
                  value={selectedSchema.name}
                  onChange={(e) => setSelectedSchema((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  Working Days
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSchema((prev) => ({
                        ...prev,
                        working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedSchema.working_days.length === 5
                        ? "bg-indigo-600 text-white border-indigo-600 font-black shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    5 Days (Mon–Fri)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSchema((prev) => ({
                        ...prev,
                        working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      selectedSchema.working_days.length === 6
                        ? "bg-indigo-600 text-white border-indigo-600 font-black shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    6 Days (Mon–Sat)
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Timeline Strip */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                Visual Day Sequence Timeline Preview
              </label>
              <div className="flex items-center gap-1.5 p-2 bg-slate-100/80 rounded-2xl border border-slate-200 overflow-x-auto">
                {selectedSchema.slots.map((s, idx) => {
                  const isLunch = s.type === "lunch";
                  const isBreak = s.type === "break";

                  return (
                    <div
                      key={s.id + idx}
                      className={`flex-1 min-w-[90px] p-2 rounded-xl border text-center transition-all ${
                        isLunch
                          ? "bg-amber-100/70 border-amber-300 text-amber-900 shadow-2xs"
                          : isBreak
                          ? "bg-teal-50 border-teal-200 text-teal-800"
                          : "bg-white border-slate-200 text-slate-800 shadow-2xs"
                      }`}
                    >
                      <div className="text-[9px] font-black font-mono">
                        {s.short}
                      </div>
                      <div className="text-[10px] font-extrabold truncate mt-0.5">
                        {isLunch ? "Lunch" : isBreak ? "Recess" : `Period ${idx + 1}`}
                      </div>
                      <div className="text-[8px] text-slate-500 truncate mt-0.5">
                        {s.label.split("–")[1]?.trim() || s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slots Configuration Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Configured Daily Slots ({selectedSchema.slots.length})
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Use arrows to reorder slots or designate recess/lunch bands
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3 text-left w-12">#</th>
                      <th className="py-2 px-3 text-left w-24">Slot ID</th>
                      <th className="py-2 px-3 text-left">Time Interval Label</th>
                      <th className="py-2 px-3 text-left w-36">Period Type</th>
                      <th className="py-2 px-3 text-left">Break Title / Notes</th>
                      <th className="py-2 px-3 text-right w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSchema.slots.map((slot, idx) => {
                      const isLunch = slot.type === "lunch";
                      const isBreak = slot.type === "break";

                      return (
                        <tr
                          key={slot.id + idx}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isLunch ? "bg-amber-50/30" : isBreak ? "bg-teal-50/20" : ""
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">
                            {slot.short}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {slot.label}
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={slot.type}
                              onChange={(e) =>
                                handleUpdateSlotType(idx, e.target.value as any)
                              }
                              className="w-full text-xs font-bold py-1 px-2 rounded-lg border border-slate-200 bg-white cursor-pointer"
                            >
                              <option value="teaching">Teaching Slot</option>
                              <option value="break">Short Break / Recess</option>
                              <option value="lunch">Lunch Break</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={slot.title || ""}
                              placeholder={isLunch ? "Lunch Break" : isBreak ? "Morning Tea" : "Regular Class"}
                              onChange={(e) => handleUpdateSlotTitle(idx, e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleMoveSlot(idx, "up")}
                                disabled={idx === 0}
                                title="Move Up"
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                onClick={() => handleMoveSlot(idx, "down")}
                                disabled={idx === selectedSchema.slots.length - 1}
                                title="Move Down"
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                onClick={() => handleRemoveSlot(idx)}
                                title="Remove Slot"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Add Slot Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                + Append New Slot to Sequence
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Slot ID (e.g. 17:00)"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Time Range (17:00 – 18:00)"
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <select
                    value={newSlotType}
                    onChange={(e) => setNewSlotType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="teaching">Teaching Slot</option>
                    <option value="break">Short Break</option>
                    <option value="lunch">Lunch Break</option>
                  </select>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Slot</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
