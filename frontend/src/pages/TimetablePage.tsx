import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Plus, Trash2, X, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, GripVertical,
  BookOpen, Beaker, FlaskConical, ArrowDown, Save, Grid3X3, Layers, RefreshCw, AlertTriangle, Printer,
  Undo2, Copy, Eye, UserCheck, ShieldAlert, Sparkles, Filter, Info, Play, Check,
  Search, SlidersHorizontal, Zap, User, MapPin, Clock, ArrowRight, LayoutGrid,
  Columns2, ListFilter, Coffee, Utensils, FileSpreadsheet, Download
} from "lucide-react";
import { ApiService, TimetablePresetSummary, TimetablePresetDetail } from "@/services/api";
import {
  TimetableSchema,
  PRESET_SCHEMAS,
  SCHEMAS_STORAGE_KEY,
  ACTIVE_SCHEMA_ID_KEY,
} from "./TimetableSchemasPage";
import FacultyAnalysisModal from "@/components/FacultyAnalysisModal";

// ─── Interfaces ───────────────────────────────────────────────

interface Subject {
  id: string;
  name: string;
  code: string;
  subject_type: string;
  theory_hours_per_week: number;
  theory_session_duration: number;
  lab_hours_per_week: number;
  lab_session_duration: number;
  required_room_type?: string;
}

interface Teacher {
  id: string;
  name: string;
  designation?: string;
  employee_id?: string;
  assigned_theory_hours?: number;
  assigned_lab_hours?: number;
  max_weekly_hours?: number;
}

interface Room {
  id: string;
  name: string;
  room_type: string;
  capacity?: number;
  building?: string;
}

interface Division {
  id: string;
  name: string;
  branch?: string;
  student_capacity?: number;
  semester_id?: string;
}

interface CellEntry {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sessionType: "THEORY" | "LAB";
  duration: number;
  color: string;
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  isContinuation?: boolean;
  parentSlotId?: string;
  isPRJ?: boolean;
  isSDA?: boolean;
}

type DivGrid = Record<string, CellEntry | null>;

interface TimetableState {
  [divisionId: string]: DivGrid;
}

interface ConflictDetail {
  type: "teacher" | "room";
  resourceName: string;
  day: string;
  slot: string;
  divA: string;
  divB: string;
}

interface SlotDef {
  id: string;
  label: string;
  short: string;
  isBreak?: boolean;
  title?: string;
  type?: "teaching" | "break" | "lunch";
}

interface QuickCombo {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  roomId?: string;
  roomName?: string;
  sessionType: "THEORY" | "LAB";
  duration: number;
  color: string;
}

interface DragPayload {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sessionType: "THEORY" | "LAB";
  duration: number;
  color: string;
  teacherId?: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  isCombo?: boolean;
  sourceDivId?: string;
  sourceDay?: string;
  sourceSlotId?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_SLOTS: SlotDef[] = [
  { id: "08:00", label: "08:00 – 09:00", short: "08:00" },
  { id: "09:00", label: "09:00 – 10:00", short: "09:00" },
  { id: "10:00", label: "10:00 – 11:00", short: "10:00" },
  { id: "11:00", label: "11:00 – 12:00", short: "11:00" },
  { id: "12:00", label: "12:00 – 13:00", short: "12:00", isBreak: true },
  { id: "13:00", label: "13:00 – 14:00", short: "13:00" },
  { id: "14:00", label: "14:00 – 15:00", short: "14:00" },
  { id: "15:00", label: "15:00 – 16:00", short: "15:00" },
  { id: "16:00", label: "16:00 – 17:00", short: "16:00" },
];

const SUBJECT_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#db2777", "#ea580c", "#0284c7", "#16a34a",
];

const BRANCH_LIST = [
  "Electrical Engineering",
  "Civil Engineering",
  "Computer Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Chemical Engineering",
  "Automobile Engineering",
];

const LOCAL_STORAGE_KEY = "timegrid_timetable_state_v2";
const QUICK_COMBOS_STORAGE_KEY = "timegrid_quick_combos_v1";

// ─── Helper: Match subject to branch ──────────────────────────

function isSubjectInBranch(subject: Subject, branchName?: string, divName?: string): boolean {
  if (!branchName && !divName) return true;
  const b = (branchName || "").toLowerCase().trim();
  const d = (divName || "").toLowerCase().trim();
  const code = (subject.code || "").toUpperCase();

  // General mathematics and basic sciences are universal
  if (code.startsWith("MA")) return true;

  // 1. Electronics & Communication (EC) — strictly exclude "electrical"
  const isEC =
    (b.includes("electronics") && !b.includes("electrical")) ||
    b === "ec" ||
    /\b(ec)\b/i.test(b) ||
    /ec[-_ ]/i.test(d) ||
    /\d+ec/i.test(d);
  if (isEC) {
    return code.startsWith("EC");
  }

  // 2. Electrical Engineering (EE) — strictly exclude "electronics"
  const isEE =
    (b.includes("electrical") && !b.includes("electronics")) ||
    b === "ee" ||
    /\b(ee)\b/i.test(b) ||
    /ee[-_ ]/i.test(d) ||
    /\d+ee/i.test(d);
  if (isEE) {
    return code.startsWith("EE") || code.startsWith("EL");
  }

  // 3. Computer Engineering & Computer Science (CO / CS / CE)
  const isCO =
    b.includes("computer") ||
    b === "co" ||
    b === "cs" ||
    b === "ce" ||
    /co[-_ ]/i.test(d) ||
    /cs[-_ ]/i.test(d) ||
    /\d+co/i.test(d) ||
    /\d+cs/i.test(d) ||
    (/\d+ce/i.test(d) && !b.includes("civil"));
  if (isCO) {
    return code.startsWith("CE") || code.startsWith("CS") || code.startsWith("CO");
  }

  // 4. Information Technology (IT / IN)
  const isIT =
    b.includes("information") ||
    b === "it" ||
    /it[-_ ]/i.test(d) ||
    /\d+it/i.test(d);
  if (isIT) {
    return code.startsWith("IT");
  }

  // 5. Mechanical Engineering (ME)
  const isME =
    b.includes("mechanical") ||
    b.includes("mech") ||
    b === "me" ||
    /me[-_ ]/i.test(d) ||
    /\d+me/i.test(d);
  if (isME) {
    return code.startsWith("ME");
  }

  // 6. Civil Engineering (CI / CV / CL)
  const isCI =
    b.includes("civil") ||
    b === "ci" ||
    b === "cv" ||
    /ci[-_ ]/i.test(d) ||
    /cv[-_ ]/i.test(d) ||
    /\d+ci/i.test(d) ||
    /\d+cv/i.test(d);
  if (isCI) {
    return code.startsWith("CV") || code.startsWith("CI") || code.startsWith("CL");
  }

  // 7. Chemical Engineering (CH)
  const isCH =
    b.includes("chemical") ||
    b === "ch" ||
    /ch[-_ ]/i.test(d) ||
    /\d+ch/i.test(d);
  if (isCH) {
    return code.startsWith("CH");
  }

  // 8. Automobile Engineering (AU / AE)
  const isAU =
    b.includes("automobile") ||
    b.includes("auto") ||
    b === "au" ||
    b === "ae" ||
    /au[-_ ]/i.test(d) ||
    /\d+au/i.test(d);
  if (isAU) {
    return code.startsWith("AU") || code.startsWith("AE");
  }

  return true;
}

// ─── Helper: Get branch-appropriate lab venues ────────────────
function getBranchLabRooms(rooms: Room[], branchName?: string, divName?: string): Room[] {
  const allLabs = rooms.filter((r) => r.room_type === "LAB");
  if (allLabs.length === 0) return rooms;
  const b = (branchName || "").toLowerCase();
  const d = (divName || "").toLowerCase();

  let prefix = "";
  if (b.includes("electronics") || /ec/i.test(d)) prefix = "EL";
  else if (b.includes("electrical") || /ee/i.test(d)) prefix = "EL";
  else if (b.includes("computer") || b.includes("information") || /co|cs|it/i.test(d)) prefix = "CL";
  else if (b.includes("mechanical") || b.includes("auto") || /me|au/i.test(d)) prefix = "ML";
  else if (b.includes("civil") || /ci|cv/i.test(d)) prefix = "CV";
  else if (b.includes("chemical") || /ch/i.test(d)) prefix = "CH";

  if (prefix) {
    const matched = allLabs.filter((r) => r.name.toUpperCase().startsWith(prefix));
    if (matched.length > 0) return matched;
  }
  return allLabs;
}

// ─── Helper: Get branch-appropriate faculty ───────────────────
function getBranchTeachers(allTeachers: Teacher[], branchName?: string, divName?: string): Teacher[] {
  if (allTeachers.length === 0) return [];
  const b = (branchName || "").toLowerCase();
  const d = (divName || "").toLowerCase();

  let prefix = "";
  if (b.includes("electronics") || /ec/i.test(d)) prefix = "EC";
  else if (b.includes("electrical") || /ee/i.test(d)) prefix = "EE";
  else if (b.includes("computer") || /co|cs/i.test(d)) prefix = "CO";
  else if (b.includes("information") || /it/i.test(d)) prefix = "IT";
  else if (b.includes("mechanical") || /me/i.test(d)) prefix = "ME";
  else if (b.includes("civil") || /ci|cv/i.test(d)) prefix = "CI";
  else if (b.includes("chemical") || /ch/i.test(d)) prefix = "CH";
  else if (b.includes("auto") || /au/i.test(d)) prefix = "AU";

  if (prefix) {
    const matched = allTeachers.filter((t) => (t.employee_id || "").toUpperCase().startsWith(prefix));
    if (matched.length > 0) return matched;
  }
  return allTeachers;
}

// ─── Subject Card (Draggable with Live Quota) ─────────────────

function SubjectCard({
  subject,
  sessionType,
  color,
  scheduledCount,
  targetCount,
}: {
  subject: Subject;
  sessionType: "THEORY" | "LAB";
  color: string;
  scheduledCount: number;
  targetCount: number;
}) {
  const isLab = sessionType === "LAB";
  const duration = isLab
    ? (subject.lab_session_duration || 2)
    : (subject.theory_session_duration || 1);

  const isSatisfied = targetCount > 0 && scheduledCount >= targetCount;

  const handleDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      sessionType,
      duration,
      color,
    };
    const jsonStr = JSON.stringify(payload);
    try {
      e.dataTransfer.setData("application/json", jsonStr);
      e.dataTransfer.setData("text/plain", jsonStr);
      e.dataTransfer.effectAllowed = "copyMove";
    } catch {}
    (window as any).__timegrid_drag_payload = payload;
  };

  const handleDragEnd = () => {
    (window as any).__timegrid_drag_payload = null;
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-grab active:cursor-grabbing select-none transition-all hover:shadow-xs hover:-translate-y-0.5 ${
        isSatisfied ? "opacity-80" : ""
      }`}
      style={{ borderColor: color + "35", background: color + "09" }}
    >
      <GripVertical size={12} className="text-slate-400 flex-shrink-0" />
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-bold text-slate-800 truncate">{subject.name}</span>
          {targetCount > 0 && (
            <span
              className={`text-[9px] font-black px-1.5 py-0.2 rounded-full whitespace-nowrap flex-shrink-0 ${
                isSatisfied
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {scheduledCount}/{targetCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-0.5">
          {isLab ? <Beaker size={9} className="text-purple-600 flex-shrink-0" /> : <BookOpen size={9} className="text-blue-600 flex-shrink-0" />}
          <span className="font-mono font-bold">{subject.code}</span>
          <span>·</span>
          <span>{duration}h {isLab ? "lab" : "lecture"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Combo Card (Draggable with Pre-Bound Faculty & Room) ──

function QuickComboCard({
  combo,
  onDelete,
}: {
  combo: QuickCombo;
  onDelete: (id: string) => void;
}) {
  const isLab = combo.sessionType === "LAB";

  const handleDragStart = (e: React.DragEvent) => {
    const payload: DragPayload = {
      subjectId: combo.subjectId,
      subjectName: combo.subjectName,
      subjectCode: combo.subjectCode,
      sessionType: combo.sessionType,
      duration: combo.duration,
      color: combo.color,
      teacherId: combo.teacherId,
      teacherName: combo.teacherName,
      roomId: combo.roomId,
      roomName: combo.roomName,
      isCombo: true,
    };
    const jsonStr = JSON.stringify(payload);
    try {
      e.dataTransfer.setData("application/json", jsonStr);
      e.dataTransfer.setData("text/plain", jsonStr);
      e.dataTransfer.effectAllowed = "copyMove";
    } catch {}
    (window as any).__timegrid_drag_payload = payload;
  };

  const handleDragEnd = () => {
    (window as any).__timegrid_drag_payload = null;
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="group relative flex items-start gap-2 p-2.5 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white shadow-2xs hover:shadow-sm hover:border-indigo-300 cursor-grab active:cursor-grabbing select-none transition-all"
    >
      <GripVertical size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-[10px] font-black text-indigo-700 bg-indigo-100/70 px-1 rounded">
              {combo.subjectCode}
            </span>
            <span className="text-xs font-bold text-slate-800 truncate">
              {combo.subjectName}
            </span>
          </div>
          <span
            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full whitespace-nowrap ${
              isLab ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {combo.duration}h {isLab ? "Lab" : "Lecture"}
          </span>
        </div>

        {/* Bound Faculty & Room */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-bold text-slate-700 truncate max-w-[130px]">
            <User size={10} className="text-indigo-600 flex-shrink-0" />
            <span className="truncate">{combo.teacherName}</span>
          </span>
          {combo.roomName && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-bold text-purple-700 truncate max-w-[100px]">
              <MapPin size={10} className="text-purple-600 flex-shrink-0" />
              <span className="truncate">{combo.roomName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Delete Combo */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(combo.id);
        }}
        title="Remove combo"
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all flex-shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Grid Cell (Schedule Slot) ────────────────────────────────

interface GridCellProps {
  divisionId: string;
  day: string;
  slot: SlotDef;
  entry: CellEntry | null;
  conflict: ConflictDetail | null;
  onDrop: (divId: string, day: string, slotId: string, payload: DragPayload) => void;
  onClear: (divId: string, day: string, slotId: string) => void;
  onEditCell: (divId: string, day: string, slotId: string, entry: CellEntry) => void;
  onInspectTeacher?: (teacherName: string) => void;
}

function GridCell({
  divisionId,
  day,
  slot,
  entry,
  conflict,
  onDrop,
  onClear,
  onEditCell,
  onInspectTeacher,
}: GridCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  if (slot.isBreak) {
    const title = slot.title || (slot.type === "lunch" ? "Lunch Break" : "Break / Recess");
    const isLunch = slot.type === "lunch" || title.toLowerCase().includes("lunch") || slot.label.includes("12:00") || slot.label.includes("13:00");

    return (
      <div
        className={`h-full min-h-[50px] rounded-lg border border-dashed flex flex-col items-center justify-center select-none text-[9px] font-extrabold px-1 text-center transition-all ${
          isLunch
            ? "border-amber-200 bg-amber-50/50 text-amber-700/90"
            : "border-teal-200 bg-teal-50/50 text-teal-700/90"
        }`}
      >
        <div className="flex items-center gap-1">
          {isLunch ? <Utensils size={10} className="text-amber-600" /> : <Coffee size={10} className="text-teal-600" />}
          <span>{title.toUpperCase()}</span>
        </div>
      </div>
    );
  }

  const isPRJ = !!entry && (entry.isPRJ || entry.subjectCode === "PRJ" || (entry.subjectName || "").toUpperCase().includes("PRJ"));
  const isSDA = !!entry && (entry.isSDA || entry.subjectCode === "SDA" || entry.subjectCode === "SVD" || (entry.subjectName || "").toUpperCase().includes("SDA") || (entry.subjectName || "").toUpperCase().includes("SVD"));
  const isLabStart = !!entry && !isPRJ && (entry.sessionType === "LAB" || entry.duration >= 2) && !entry.isContinuation;
  const isPrjStart = !!entry && isPRJ && !entry.isContinuation;
  const isLabContinuation = !!entry && !!entry.isContinuation;
  const isLab = isLabStart || (isLabContinuation && !isPRJ);

  const handleCellDragStart = (e: React.DragEvent) => {
    if (!entry) return;
    const effectiveSlotId = isLabContinuation && entry.parentSlotId ? entry.parentSlotId : slot.id;
    const payload: DragPayload = {
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      subjectCode: entry.subjectCode,
      sessionType: entry.sessionType,
      duration: entry.duration || (entry.sessionType === "LAB" ? 2 : 1),
      color: entry.color,
      teacherId: entry.teacherId,
      teacherName: entry.teacherName,
      roomId: entry.roomId,
      roomName: entry.roomName,
      sourceDivId: divisionId,
      sourceDay: day,
      sourceSlotId: effectiveSlotId,
    };
    const jsonStr = JSON.stringify(payload);
    try {
      e.dataTransfer.setData("application/json", jsonStr);
      e.dataTransfer.setData("text/plain", jsonStr);
      e.dataTransfer.effectAllowed = "copyMove";
    } catch {}
    (window as any).__timegrid_drag_payload = payload;
  };

  const handleDragEnd = () => {
    (window as any).__timegrid_drag_payload = null;
  };

  return (
    <div
      draggable={!slot.isBreak && !!entry}
      onDragStart={handleCellDragStart}
      onDragEnd={handleDragEnd}
      onDragEnter={(e) => {
        if (!slot.isBreak) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragOver={(e) => {
        if (!slot.isBreak) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        if (slot.isBreak) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        try {
          const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
          let payload: DragPayload | null = null;
          if (raw) {
            try { payload = JSON.parse(raw); } catch {}
          }
          if (!payload && (window as any).__timegrid_drag_payload) {
            payload = (window as any).__timegrid_drag_payload;
          }
          if (payload) {
            onDrop(divisionId, day, slot.id, payload);
          }
        } catch (err) {
          console.error("Drop parsing error:", err);
        } finally {
          (window as any).__timegrid_drag_payload = null;
        }
      }}
      onClick={() => {
        if (entry) {
          const effectiveSlotId = isLabContinuation && entry.parentSlotId ? entry.parentSlotId : slot.id;
          onEditCell(divisionId, day, effectiveSlotId, entry);
        }
      }}
      className={`min-h-[50px] transition-all relative group cursor-pointer ${
        entry
          ? conflict
            ? "rounded-xl border-2 border-rose-500 bg-rose-50/70 shadow-2xs"
            : isPrjStart
            ? "rounded-t-xl rounded-b-none border border-b-2 border-b-dashed border-amber-300 border-b-amber-400 bg-gradient-to-b from-amber-50/95 via-amber-50/30 to-amber-50/50 shadow-2xs hover:shadow-xs border-l-[5px] border-l-amber-600"
            : isLabContinuation && isPRJ
            ? "rounded-t-none rounded-b-xl border border-t-0 border-amber-300 -mt-1 bg-gradient-to-b from-amber-50/50 to-amber-100/30 shadow-2xs hover:shadow-xs border-l-[5px] border-l-amber-600"
            : isSDA
            ? "rounded-xl border border-emerald-300 bg-gradient-to-b from-emerald-50/90 to-teal-50/50 shadow-2xs hover:shadow-xs border-l-[5px] border-l-emerald-600"
            : isLabStart
            ? "rounded-t-xl rounded-b-none border border-b-2 border-b-dashed border-purple-300 border-b-purple-400 bg-gradient-to-b from-purple-50/95 via-indigo-50/30 to-purple-50/50 shadow-2xs hover:shadow-xs border-l-[5px] border-l-purple-600"
            : isLabContinuation
            ? "rounded-t-none rounded-b-xl border border-t-0 border-purple-300 -mt-1 bg-gradient-to-b from-purple-50/50 to-purple-100/30 shadow-2xs hover:shadow-xs border-l-[5px] border-l-purple-600"
            : "rounded-xl border shadow-2xs hover:shadow-xs"
          : isDragOver
          ? "rounded-xl border-2 border-dashed border-indigo-500 bg-indigo-50"
          : "rounded-xl border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
      }`}
      style={
        entry && !conflict && !isLab && !isPRJ && !isSDA
          ? {
              background: entry.color + "15",
              borderColor: entry.color + "45",
            }
          : {}
      }
    >
      {entry ? (
        <div className="p-1.5 h-full flex flex-col justify-between">
          {/* Top Row: Code, Badges, Remove Button */}
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span
                  className="text-[10.5px] font-black truncate font-mono"
                  style={{ color: isPRJ ? "#d97706" : isSDA ? "#059669" : isLab ? "#7c3aed" : entry.color }}
                >
                  {entry.subjectCode}
                </span>

                {isLabStart && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-purple-600 text-white flex items-center gap-0.5 shadow-2xs">
                    <FlaskConical size={8} /> 2H LAB
                  </span>
                )}

                {isPrjStart && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-amber-600 text-white flex items-center gap-0.5 shadow-2xs">
                    📁 2H PRJ
                  </span>
                )}

                {isSDA && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-600 text-white flex items-center gap-0.5 shadow-2xs">
                    SDA
                  </span>
                )}

                {isLabContinuation && (
                  <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                    isPRJ
                      ? "bg-amber-200/90 text-amber-900 border-amber-300"
                      : "bg-purple-200/90 text-purple-900 border-purple-300"
                  }`}>
                    <ArrowDown size={8} /> Slot 2/2
                  </span>
                )}

                {conflict && (
                  <span className="text-[8px] font-black px-1 rounded bg-rose-600 text-white flex items-center gap-0.5">
                    <ShieldAlert size={8} /> Clash
                  </span>
                )}
              </div>

              {/* Subject Title */}
              <div className="text-[10px] font-bold text-slate-800 truncate leading-tight mt-0.5">
                {entry.subjectName}
              </div>
            </div>

            {/* Clear Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const effectiveSlotId = isLabContinuation && entry.parentSlotId ? entry.parentSlotId : slot.id;
                onClear(divisionId, day, effectiveSlotId);
              }}
              title="Remove session"
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer flex-shrink-0"
            >
              <X size={10} />
            </button>
          </div>

          {/* Teacher and Room metadata footer */}
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[8.5px]">
            {entry.teacherName ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onInspectTeacher?.(entry.teacherName);
                }}
                title={`Inspect ${entry.teacherName}'s personal schedule, live location & deep analysis`}
                className="px-1.5 py-0.2 rounded bg-white/90 hover:bg-slate-900 hover:text-white border border-slate-200 hover:border-slate-900 font-bold text-slate-700 truncate max-w-[105px] transition-all cursor-pointer shadow-2xs"
              >
                {entry.teacherName}
              </button>
            ) : isPRJ || isSDA ? null : (
              <span className="text-[8px] text-slate-400 italic">No faculty</span>
            )}
            {entry.roomName && (
              <span
                className={`px-1.5 py-0.2 rounded border font-bold truncate max-w-[85px] ${
                  isPRJ
                    ? "bg-amber-100/90 border-amber-300 text-amber-900"
                    : isSDA
                    ? "bg-emerald-100/90 border-emerald-300 text-emerald-900"
                    : isLab
                    ? "bg-purple-100/90 border-purple-300 text-purple-800"
                    : "bg-white/90 border-slate-200 text-slate-800"
                }`}
              >
                {entry.roomName}
              </span>
            )}
            {(isLabStart || isPrjStart) && (
              <span className={`ml-auto text-[7.5px] font-extrabold px-1 py-0.2 rounded ${
                isPrjStart ? "text-amber-700 bg-amber-100/70" : "text-purple-600 bg-purple-100/60"
              }`}>
                Slot 1/2 ▾
              </span>
            )}
            {isLabContinuation && (
              <span className={`ml-auto text-[7.5px] font-extrabold px-1 py-0.2 rounded ${
                isPRJ ? "text-amber-700 bg-amber-100/70" : "text-purple-600 bg-purple-100/60"
              }`}>
                Continuous
              </span>
            )}
          </div>

          {conflict && (
            <div className="mt-0.5 text-[8px] font-bold text-rose-700 bg-rose-100 px-1 py-0.5 rounded truncate">
              Clash with {conflict.divA === divisionId ? conflict.divB : conflict.divA}
            </div>
          )}
        </div>
      ) : isDragOver ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] font-black text-indigo-600 bg-white/90 px-2 py-0.5 rounded shadow-2xs">
            Drop Here
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ─── Division Panel (Compact, responsive table) ───────────────

interface DivisionPanelProps {
  division: Division;
  grid: DivGrid;
  conflicts: ConflictDetail[];
  activeDays: number;
  activeSlots: number;
  daysList?: string[];
  slotsList?: SlotDef[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDrop: (divId: string, day: string, slotId: string, payload: DragPayload) => void;
  onClear: (divId: string, day: string, slotId: string) => void;
  onClearGrid: () => void;
  onDuplicate: () => void;
  onAutoFill: () => void;
  onRemove: () => void;
  onEditCell: (divId: string, day: string, slotId: string, entry: CellEntry) => void;
  onInspectTeacher?: (teacherName: string) => void;
}

function DivisionPanel({
  division,
  grid,
  conflicts,
  activeDays,
  activeSlots,
  daysList,
  slotsList,
  collapsed,
  onToggleCollapse,
  onDrop,
  onClear,
  onClearGrid,
  onDuplicate,
  onAutoFill,
  onRemove,
  onEditCell,
  onInspectTeacher,
}: DivisionPanelProps) {
  const visibleDays = daysList && daysList.length > 0 ? daysList : DAYS.slice(0, activeDays);
  const visibleSlots = slotsList && slotsList.length > 0 ? slotsList : DEFAULT_SLOTS.slice(0, activeSlots);

  // Compute filled percentage
  const teachingSlots = visibleSlots.filter((s) => !s.isBreak);
  const totalSlots = visibleDays.length * teachingSlots.length;
  let filledCount = 0;
  visibleDays.forEach((d) => {
    teachingSlots.forEach((s) => {
      if (grid[`${d}-${s.id}`]) filledCount++;
    });
  });
  const pct = totalSlots > 0 ? Math.round((filledCount / totalSlots) * 100) : 0;

  // Filter division conflicts
  const divConflicts = conflicts.filter(
    (c) => c.divA === division.name || c.divB === division.name
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all flex flex-col h-full min-w-0 w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200 flex-shrink-0 min-w-0 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer flex-shrink-0"
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-slate-900 text-sm tracking-tight truncate">
                {division.name}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap">
                {division.branch || "Division"}
              </span>
              {divConflicts.length > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 whitespace-nowrap">
                  <AlertTriangle size={10} /> {divConflicts.length} Clashes
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-medium truncate">
              Standard Class Group · {division.student_capacity || 60} students
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Progress bar */}
          <div className="text-right mr-1">
            <div className="text-[11px] font-black text-slate-700">{pct}% filled</div>
            <div className="w-20 h-1 bg-slate-200 rounded-full mt-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 100 ? "bg-emerald-500" : "bg-indigo-600"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Quick Auto-Fill for this division */}
          <button
            onClick={onAutoFill}
            title="Auto-fill schedule using OR-Tools CP-SAT solver"
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles size={12} className="text-amber-500" />
            <span>Auto-Fill</span>
          </button>

          {/* Duplicate */}
          <button
            onClick={onDuplicate}
            title="Duplicate layout to another division"
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          >
            <Copy size={14} />
          </button>

          {/* Clear Grid */}
          <button
            onClick={onClearGrid}
            title="Clear this division's grid"
            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
          </button>

          {/* Remove Division View */}
          <button
            onClick={onRemove}
            title="Close this division tab"
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Grid Content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-2.5">
          <table
            className="w-full border-collapse table-fixed"
            style={{ minWidth: `${visibleDays.length * 105 + 60}px` }}
          >
            <thead>
              <tr>
                <th className="w-14 sm:w-16 py-1.5 px-1 text-[10px] font-black text-slate-400 uppercase bg-slate-50/80 rounded-l-lg text-left">
                  Slot
                </th>
                {visibleDays.map((d) => (
                  <th
                    key={d}
                    className="py-1.5 px-1 text-[10px] font-black text-slate-700 uppercase bg-slate-50/80 text-center"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSlots.map((slot) => (
                <tr key={slot.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-1 px-1 text-[9px] font-bold text-slate-500 bg-slate-50/40 whitespace-nowrap">
                    <div className="font-extrabold text-slate-700">{slot.short}</div>
                    <div className="text-[7.5px] text-slate-400 font-medium truncate">
                      {slot.isBreak ? "Break" : slot.label.split("–")[1]?.trim() || slot.label}
                    </div>
                  </td>
                  {visibleDays.map((day) => {
                    const key = `${day}-${slot.id}`;
                    const entry = grid[key] || null;

                    const cellConflict =
                      conflicts.find(
                        (c) =>
                          c.day === day &&
                          c.slot === slot.label &&
                          (c.divA === division.name || c.divB === division.name)
                      ) || null;

                    const isCont = !!entry?.isContinuation;
                    const nextSlotIndex = visibleSlots.findIndex((s) => s.id === slot.id) + 1;
                    const nextSlot = nextSlotIndex < visibleSlots.length ? visibleSlots[nextSlotIndex] : null;
                    const nextEntry = nextSlot ? grid[`${day}-${nextSlot.id}`] : null;
                    const isStart = !!entry && (entry.sessionType === "LAB" || entry.duration >= 2) && nextEntry?.parentSlotId === slot.id;

                    return (
                      <td
                        key={key}
                        className={`px-1 ${
                          isStart ? "pt-0.5 pb-0" : isCont ? "pt-0 pb-0.5" : "py-0.5"
                        }`}
                      >
                        <GridCell
                          divisionId={division.id}
                          day={day}
                          slot={slot}
                          entry={entry}
                          conflict={cellConflict}
                          onDrop={onDrop}
                          onClear={onClear}
                          onEditCell={onEditCell}
                          onInspectTeacher={onInspectTeacher}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Timetable Page ──────────────────────────────────────

export default function TimetablePage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allDivisions, setAllDivisions] = useState<Division[]>([]);
  const [activeDivisions, setActiveDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings
  const [activeDays, setActiveDays] = useState(5);
  const [activeSlots, setActiveSlots] = useState(8);
  const [timetable, setTimetable] = useState<TimetableState>({});
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [collapsedDivs, setCollapsedDivs] = useState<Record<string, boolean>>({});

  // UI state
  const [toast, setToast] = useState<string | null>(null);
  const [showDivPicker, setShowDivPicker] = useState(false);
  const [classFilterQuery, setClassFilterQuery] = useState("");
  const [classBranchFilter, setClassBranchFilter] = useState("ALL");
  const divPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (divPickerRef.current && !divPickerRef.current.contains(e.target as Node)) {
        setShowDivPicker(false);
      }
    };
    if (showDivPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDivPicker]);

  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<TimetableState[]>([]);

  // Selected Division for palette quota tracking & view focus
  const [focusedDivId, setFocusedDivId] = useState<string>("");
  const [inspectTeacherName, setInspectTeacherName] = useState<string | null>(null);

  // Canvas View Mode: Focus (single div), Split (side-by-side), Stack (all vertically)
  const [viewMode, setViewMode] = useState<"focus" | "split" | "stack">("focus");

  // Left Sidebar Mode: "courses" | "combo" | "settings"
  const [sidebarTab, setSidebarTab] = useState<"courses" | "combo" | "settings">("courses");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // Filter & Search in Left Panel
  const [branchFilter, setBranchFilter] = useState<string>("AUTO");
  const [subjectSearch, setSubjectSearch] = useState<string>("" );
  // 1-Click Course Type Filter: "ALL" | "THEORY" | "LAB" (Eliminates scrolling down to find practicals!)
  const [courseTypeFilter, setCourseTypeFilter] = useState<"ALL" | "THEORY" | "LAB">("ALL");

  // Timetable Slot & Break Schemas
  const [availableSchemas, setAvailableSchemas] = useState<TimetableSchema[]>(() => {
    try {
      const saved = localStorage.getItem(SCHEMAS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return PRESET_SCHEMAS;
  });

  const [activeSchemaId, setActiveSchemaId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_SCHEMA_ID_KEY) || PRESET_SCHEMAS[0].id;
  });

  const activeSchema = useMemo(() => {
    return availableSchemas.find((s) => s.id === activeSchemaId) || availableSchemas[0] || PRESET_SCHEMAS[0];
  }, [availableSchemas, activeSchemaId]);

  const schemaDays = useMemo(() => {
    if (activeSchema?.working_days && activeSchema.working_days.length > 0) {
      return activeSchema.working_days;
    }
    return DAYS.slice(0, activeDays);
  }, [activeSchema, activeDays]);

  const schemaSlots = useMemo<SlotDef[]>(() => {
    if (activeSchema?.slots && activeSchema.slots.length > 0) {
      return activeSchema.slots.map((s) => ({
        id: s.id,
        label: s.label,
        short: s.short,
        type: s.type,
        isBreak: s.type === "break" || s.type === "lunch" || !!s.isBreak,
        title: s.title || (s.type === "lunch" ? "Lunch Break" : s.type === "break" ? "Recess Break" : undefined),
      }));
    }
    return DEFAULT_SLOTS.slice(0, activeSlots);
  }, [activeSchema, activeSlots]);

  const handleSelectSchema = (schemaId: string) => {
    setActiveSchemaId(schemaId);
    try {
      localStorage.setItem(ACTIVE_SCHEMA_ID_KEY, schemaId);
    } catch {}
    const found = availableSchemas.find((s) => s.id === schemaId);
    if (found) {
      setActiveDays(found.working_days.length);
      setActiveSlots(found.slots.length);
      showToast(`Applied schema: ${found.name}`);
    }
  };

  // Quick Combos State
  const [quickCombos, setQuickCombos] = useState<QuickCombo[]>(() => {
    try {
      const saved = localStorage.getItem(QUICK_COMBOS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Combo Creator Form State
  const [comboSubjectId, setComboSubjectId] = useState<string>("");
  const [comboTeacherId, setComboTeacherId] = useState<string>("");
  const [comboRoomId, setComboRoomId] = useState<string>("");
  const [comboSessionType, setComboSessionType] = useState<"THEORY" | "LAB">("THEORY");

  // Auto-Generation Modal State
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [selectedGenDivIds, setSelectedGenDivIds] = useState<string[]>([]);
  const [solverStats, setSolverStats] = useState<any | null>(null);

  // Timetable Presets State (Python Backend Driven)
  const [presets, setPresets] = useState<TimetablePresetSummary[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [loadingPreset, setLoadingPreset] = useState<boolean>(false);

  // Edit / Drop Popover Modal
  const [editingCell, setEditingCell] = useState<{
    divId: string;
    day: string;
    slotId: string;
    entry: CellEntry;
  } | null>(null);

  const [editTeacherId, setEditTeacherId] = useState<string>("");
  const [editRoomId, setEditRoomId] = useState<string>("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  // Persist quick combos
  useEffect(() => {
    try {
      localStorage.setItem(QUICK_COMBOS_STORAGE_KEY, JSON.stringify(quickCombos));
    } catch {}
  }, [quickCombos]);

  // ── 1. Initial Load ──────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [subs, divs, tchrs, rms] = await Promise.all([
          ApiService.getSubjects().catch(() => []),
          ApiService.getClassGroups().catch(() => []),
          ApiService.getTeachers().catch(() => []),
          ApiService.getRooms().catch(() => []),
        ]);

        setSubjects(subs || []);
        setAllDivisions(divs || []);
        setTeachers(tchrs || []);
        setRooms(rms || []);

        // Color mapping
        const map: Record<string, string> = {};
        (subs || []).forEach((s: Subject, i: number) => {
          map[s.id] = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
        });
        setColorMap(map);

        // Try load persisted state from localStorage
        let loadedFromStorage = false;
        const savedRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedRaw) {
          try {
            const parsed = JSON.parse(savedRaw);
            if (parsed.timetable) {
              setTimetable(parsed.timetable);
              loadedFromStorage = true;
            }
            if (parsed.activeDivIds && divs) {
              const matched = divs.filter((d: Division) => parsed.activeDivIds.includes(d.id));
              if (matched.length > 0) {
                setActiveDivisions(matched);
                setFocusedDivId(matched[0].id);
                setSelectedGenDivIds(matched.map((m: Division) => m.id));
              }
            }
          } catch {}
        }

        // Load saved presets from Python backend
        try {
          const presetsRes = await ApiService.getTimetablePresets();
          if (presetsRes && Array.isArray(presetsRes) && presetsRes.length > 0) {
            setPresets(presetsRes);
            const latestPreset = presetsRes[0];
            setActivePresetId(latestPreset.id);

            if (!loadedFromStorage) {
              const detail = await ApiService.getTimetablePreset(latestPreset.id);
              if (detail && detail.timetables) {
                const targetDivs = divs ? divs.slice(0, 4) : [];
                if (targetDivs.length > 0) {
                  setActiveDivisions(targetDivs);
                  setFocusedDivId(targetDivs[0].id);
                  setSelectedGenDivIds(targetDivs.map((d: any) => d.id));
                }
                const converted = convertRawTimetablesToState(detail.timetables, targetDivs, {});
                setTimetable(converted);
                if (detail.stats) setSolverStats(detail.stats);
                loadedFromStorage = true;
              }
            }
          }
        } catch (presetErr) {
          console.warn("Could not load presets from Python backend:", presetErr);
        }

        // Check if a specific division was requested via URL query (e.g. from DivisionsPage "Open Canvas")
        const urlParams = new URLSearchParams(window.location.search);
        const requestedDivId = urlParams.get("division");
        if (requestedDivId && divs) {
          const reqDiv = divs.find((d: Division) => d.id === requestedDivId);
          if (reqDiv) {
            setActiveDivisions((prev) => {
              const exists = prev.some((p) => p.id === reqDiv.id);
              return exists ? prev : [reqDiv, ...prev];
            });
            setFocusedDivId(reqDiv.id);
            setSelectedGenDivIds([reqDiv.id]);
            return;
          }
        }

        // Default if activeDivisions still empty: pick first 2 divisions
        if (divs && divs.length > 0) {
          const initial = divs.slice(0, 2);
          setActiveDivisions(initial);
          setFocusedDivId(initial[0].id);
          setSelectedGenDivIds(initial.map((m: Division) => m.id));
        }
      } catch (err) {
        console.error("Failed to load timetable data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Set default focused division
  useEffect(() => {
    if (!focusedDivId && activeDivisions.length > 0) {
      setFocusedDivId(activeDivisions[0].id);
    }
  }, [activeDivisions, focusedDivId]);

  // Focused division object
  const focusedDivision = activeDivisions.find((d) => d.id === focusedDivId) || activeDivisions[0];

  // Set initial combo builder subject & teacher when loaded
  useEffect(() => {
    if (!comboSubjectId && subjects.length > 0) {
      // Find matching branch subject or first
      const branchMatch = subjects.find((s) => isSubjectInBranch(s, focusedDivision?.branch, focusedDivision?.name));
      const chosen = branchMatch || subjects[0];
      setComboSubjectId(chosen.id);
      setComboSessionType(chosen.subject_type === "PRACTICAL" ? "LAB" : "THEORY");
    }
    if (!comboTeacherId && teachers.length > 0) {
      setComboTeacherId(teachers[0].id);
    }
    if (!comboRoomId && rooms.length > 0) {
      const defaultRoom = comboSessionType === "LAB"
        ? rooms.find((r) => r.room_type === "LAB") || rooms[0]
        : rooms.find((r) => r.room_type === "CLASSROOM") || rooms[0];
      setComboRoomId(defaultRoom?.id || "");
    }
  }, [subjects, teachers, rooms, focusedDivision]);

  // When combo subject changes, adapt session type and recommended room
  const handleComboSubjectChange = (newSubId: string) => {
    setComboSubjectId(newSubId);
    const sub = subjects.find((s) => s.id === newSubId);
    if (!sub) return;

    const newType = sub.subject_type === "PRACTICAL" ? "LAB" : "THEORY";
    setComboSessionType(newType);

    const recommendedRoom = newType === "LAB"
      ? rooms.find((r) => r.room_type === "LAB") || rooms[0]
      : rooms.find((r) => r.room_type === "CLASSROOM") || rooms[0];
    if (recommendedRoom) setComboRoomId(recommendedRoom.id);
  };

  // ── 2. Division Name Map ────────────────────────────────────
  const divisionMap = useMemo(() => {
    const m: Record<string, string> = {};
    allDivisions.forEach((d) => {
      m[d.id] = d.name;
    });
    return m;
  }, [allDivisions]);

  // ── 3. Real-Time Conflict Detection ──────────────────────────
  const conflicts = useMemo(() => {
    const detected: ConflictDetail[] = [];
    const visibleDays = schemaDays;
    const visibleSlots = schemaSlots;

    for (const day of visibleDays) {
      for (const slotDef of visibleSlots) {
        if (slotDef.isBreak) continue;
        const key = `${day}-${slotDef.id}`;

        const teachersSeen: Record<string, string> = {};
        const roomsSeen: Record<string, string> = {};

        for (const div of activeDivisions) {
          const grid = timetable[div.id] || {};
          const cell = grid[key];
          if (!cell) continue;

          // Check Teacher Conflict
          if (cell.teacherName && cell.teacherName.trim()) {
            const tName = cell.teacherName.trim();
            if (teachersSeen[tName]) {
              detected.push({
                type: "teacher",
                resourceName: tName,
                day,
                slot: slotDef.label,
                divA: teachersSeen[tName],
                divB: divisionMap[div.id] || div.name,
              });
            } else {
              teachersSeen[tName] = divisionMap[div.id] || div.name;
            }
          }

          // Check Room Conflict
          if (cell.roomName && cell.roomName.trim()) {
            const rName = cell.roomName.trim();
            if (roomsSeen[rName]) {
              detected.push({
                type: "room",
                resourceName: rName,
                day,
                slot: slotDef.label,
                divA: roomsSeen[rName],
                divB: divisionMap[div.id] || div.name,
              });
            } else {
              roomsSeen[rName] = divisionMap[div.id] || div.name;
            }
          }
        }
      }
    }
    return detected;
  }, [timetable, activeDivisions, schemaDays, schemaSlots, divisionMap]);

  // ── 4. Quota Calculations for Left Palette ──────────────────
  const scheduledQuotas = useMemo(() => {
    if (!focusedDivision) return { theory: {}, lab: {} };
    const grid = timetable[focusedDivision.id] || {};
    const theory: Record<string, number> = {};
    const lab: Record<string, number> = {};

    Object.values(grid).forEach((entry) => {
      if (!entry) return;
      if (entry.isContinuation) return; // Don't double count continuation blocks
      if (entry.sessionType === "LAB") {
        lab[entry.subjectId] = (lab[entry.subjectId] || 0) + 1;
      } else {
        theory[entry.subjectId] = (theory[entry.subjectId] || 0) + 1;
      }
    });
    return { theory, lab };
  }, [timetable, focusedDivision]);

  // ── 5. Filtered Subjects (Branch + Search) ───────────────────
  const activeBranchName = useMemo(() => {
    if (branchFilter === "AUTO") {
      return focusedDivision?.branch || "Electrical Engineering";
    }
    if (branchFilter === "ALL") return "";
    return branchFilter;
  }, [branchFilter, focusedDivision]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      // 1. Search Query
      if (subjectSearch.trim()) {
        const q = subjectSearch.toLowerCase();
        const matchesQuery =
          s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Branch Filter
      if (branchFilter === "ALL") return true;
      return isSubjectInBranch(s, activeBranchName, focusedDivision?.name);
    });
  }, [subjects, subjectSearch, branchFilter, activeBranchName, focusedDivision]);

  const theorySubjects = useMemo(
    () => filteredSubjects.filter((s) => s.subject_type === "THEORY" || s.subject_type === "BOTH"),
    [filteredSubjects]
  );
  const labSubjects = useMemo(
    () => filteredSubjects.filter((s) => s.subject_type === "PRACTICAL" || s.subject_type === "BOTH"),
    [filteredSubjects]
  );

  // ── 6. State Modification & Undo Buffer ─────────────────────
  const recordHistory = () => {
    setHistory((prev) => [...prev.slice(-15), JSON.parse(JSON.stringify(timetable))]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setTimetable(last);
    setHistory((prev) => prev.slice(0, -1));
    showToast("Action undone");
  };

  // ── 7. Drop Handling (Supports Regular Card, Quick Combo & Grid Move) ───
  const handleDropInitiated = (
    divId: string,
    day: string,
    slotId: string,
    payload: DragPayload
  ) => {
    const slotIdx = schemaSlots.findIndex((s) => s.id === slotId);

    // Guard against multi-slot block dropping into boundary or break
    if (payload.duration > 1) {
      if (slotIdx === -1 || slotIdx + 1 >= schemaSlots.length || schemaSlots[slotIdx + 1].isBreak) {
        showToast("⚠️ Cannot place a 2-hour session here: next slot is a break or end of day.");
        return;
      }
    }

    recordHistory();

    // If payload has pre-bound teacher / room (from Quick Combo or moved GridCell), use those!
    const chosenTeacher = payload.teacherId
      ? teachers.find((t) => t.id === payload.teacherId) || { id: payload.teacherId, name: payload.teacherName }
      : payload.teacherName
      ? { id: payload.teacherId || "custom", name: payload.teacherName }
      : (teachers.length > 0 ? teachers[0] : null);

    const chosenRoom = payload.roomId
      ? rooms.find((r) => r.id === payload.roomId) || { id: payload.roomId, name: payload.roomName }
      : payload.roomName
      ? { id: payload.roomId || "custom", name: payload.roomName }
      : (payload.sessionType === "LAB"
          ? rooms.find((r) => r.room_type === "LAB") || rooms[0]
          : rooms.find((r) => r.room_type === "CLASSROOM") || rooms[0]);

    setTimetable((prev) => {
      const next = { ...prev };
      const isMovingExisting = !!(payload.sourceDivId && payload.sourceDay && payload.sourceSlotId);

      const destGrid = { ...(next[divId] || {}) };
      const currentTarget = destGrid[`${day}-${slotId}`];

      // Smart swap if both are standalone 1-hour sessions
      const canSwap = isMovingExisting &&
        payload.duration === 1 &&
        currentTarget &&
        currentTarget.duration === 1 &&
        !currentTarget.isContinuation;

      // 1. If moving from an existing slot, clear or swap old source slot(s)
      if (isMovingExisting) {
        const srcDivId = payload.sourceDivId!;
        const srcDay = payload.sourceDay!;
        const srcSlotId = payload.sourceSlotId!;
        const srcGrid = { ...(next[srcDivId] || {}) };
        const oldSrc = srcGrid[`${srcDay}-${srcSlotId}`];

        if (canSwap && currentTarget) {
          srcGrid[`${srcDay}-${srcSlotId}`] = currentTarget;
        } else {
          srcGrid[`${srcDay}-${srcSlotId}`] = null;
          if (oldSrc?.parentSlotId) {
            srcGrid[`${srcDay}-${oldSrc.parentSlotId}`] = null;
          }
          Object.keys(srcGrid).forEach((k) => {
            if (k.startsWith(`${srcDay}-`) && srcGrid[k]?.parentSlotId === srcSlotId) {
              srcGrid[k] = null;
            }
          });
        }
        next[srcDivId] = srcGrid;
      }

      // 2. Prepare destination division grid
      const divGrid = { ...(next[divId] || {}) };

      // 3. Clean up any existing target slot & its linked continuation/parent if not swapping
      if (!canSwap) {
        if (currentTarget?.parentSlotId) {
          divGrid[`${day}-${currentTarget.parentSlotId}`] = null;
        }
        Object.keys(divGrid).forEach((k) => {
          if (k.startsWith(`${day}-`) && divGrid[k]?.parentSlotId === slotId) {
            divGrid[k] = null;
          }
        });

        // 4. If 2-hour session, clean up next slot & its linked continuation/parent too
        if (payload.duration > 1 && slotIdx + 1 < schemaSlots.length) {
          const nextSlot = schemaSlots[slotIdx + 1];
          const nextTarget = divGrid[`${day}-${nextSlot.id}`];
          if (nextTarget?.parentSlotId) {
            divGrid[`${day}-${nextTarget.parentSlotId}`] = null;
          }
          Object.keys(divGrid).forEach((k) => {
            if (k.startsWith(`${day}-`) && divGrid[k]?.parentSlotId === nextSlot.id) {
              divGrid[k] = null;
            }
          });
        }
      }

      // 5. Place the main session entry
      const mainEntry: CellEntry = {
        subjectId: payload.subjectId,
        subjectName: payload.subjectName,
        subjectCode: payload.subjectCode,
        sessionType: payload.sessionType,
        duration: payload.duration,
        color: payload.color || colorMap[payload.subjectId] || "#4f46e5",
        teacherId: chosenTeacher?.id,
        teacherName: chosenTeacher?.name,
        roomId: chosenRoom?.id,
        roomName: chosenRoom?.name,
      };

      divGrid[`${day}-${slotId}`] = mainEntry;

      // 6. Multi-slot lab continuation (2h lab fills next slot)
      if (payload.duration > 1 && slotIdx + 1 < schemaSlots.length) {
        const nextSlot = schemaSlots[slotIdx + 1];
        if (!nextSlot.isBreak) {
          divGrid[`${day}-${nextSlot.id}`] = {
            ...mainEntry,
            isContinuation: true,
            parentSlotId: slotId,
          };
        }
      }

      next[divId] = divGrid;
      return next;
    });

    const actionWord = payload.sourceSlotId ? "Moved" : "Placed";
    const teacherMsg = chosenTeacher?.name ? ` with ${chosenTeacher.name}` : "";
    showToast(`${actionWord} ${payload.subjectCode} (${payload.sessionType.toLowerCase()})${teacherMsg}`);
  };

  // Clear slot
  const handleClear = (divId: string, day: string, slotId: string) => {
    recordHistory();
    setTimetable((prev) => {
      const divGrid = { ...(prev[divId] || {}) };
      const current = divGrid[`${day}-${slotId}`];

      divGrid[`${day}-${slotId}`] = null;

      if (current?.parentSlotId) {
        divGrid[`${day}-${current.parentSlotId}`] = null;
      }

      // Clear any cell that points to this slot as parent
      Object.keys(divGrid).forEach((k) => {
        if (k.startsWith(`${day}-`) && divGrid[k]?.parentSlotId === slotId) {
          divGrid[k] = null;
        }
      });

      const slotIdx = schemaSlots.findIndex((s) => s.id === slotId);
      if (slotIdx + 1 < schemaSlots.length) {
        const nextSlotId = schemaSlots[slotIdx + 1].id;
        const nextCell = divGrid[`${day}-${nextSlotId}`];
        if (nextCell?.parentSlotId === slotId) {
          divGrid[`${day}-${nextSlotId}`] = null;
        }
      }

      return { ...prev, [divId]: divGrid };
    });
  };

  const handleClearGrid = (divId: string) => {
    const divName = divisionMap[divId] || "Division";
    if (!window.confirm(`Clear all timetable entries for ${divName}?`)) return;
    recordHistory();
    setTimetable((prev) => ({ ...prev, [divId]: {} }));
    showToast(`Cleared schedule for ${divName}`);
  };

  const handleDuplicate = (sourceDivId: string) => {
    const sourceName = divisionMap[sourceDivId] || "Division";
    const candidates = activeDivisions.filter((d) => d.id !== sourceDivId);
    if (candidates.length === 0) {
      alert("Add at least one more division to duplicate layout.");
      return;
    }

    const targetDiv = candidates[0];
    if (
      !window.confirm(
        `Duplicate entire layout from ${sourceName} into ${targetDiv.name}? This will overwrite ${targetDiv.name}'s schedule.`
      )
    )
      return;

    recordHistory();
    setTimetable((prev) => ({
      ...prev,
      [targetDiv.id]: JSON.parse(JSON.stringify(prev[sourceDivId] || {})),
    }));
    showToast(`Copied layout to ${targetDiv.name}`);
  };

  // ── 8. Quick Combo Creation Handlers ─────────────────────────
  const handleCreateQuickCombo = () => {
    const sub = subjects.find((s) => s.id === comboSubjectId);
    const teacher = teachers.find((t) => t.id === comboTeacherId);
    const room = rooms.find((r) => r.id === comboRoomId);

    if (!sub || !teacher) {
      showToast("Please choose both a subject and a faculty member.");
      return;
    }

    const isLab = comboSessionType === "LAB";
    const newCombo: QuickCombo = {
      id: "combo-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      teacherId: teacher.id,
      teacherName: teacher.name,
      roomId: room?.id,
      roomName: room?.name,
      sessionType: comboSessionType,
      duration: isLab ? (sub.lab_session_duration || 2) : (sub.theory_session_duration || 1),
      color: colorMap[sub.id] || "#4f46e5",
    };

    setQuickCombos((prev) => [newCombo, ...prev]);
    showToast(`Created Combo: ${sub.code} + ${teacher.name}`);
  };

  const handleDeleteQuickCombo = (comboId: string) => {
    setQuickCombos((prev) => prev.filter((c) => c.id !== comboId));
    showToast("Removed combo");
  };

  const handleAutoSuggestCombosForClass = () => {
    if (!focusedDivision) return;
    const branchSubs = subjects.filter((s) =>
      isSubjectInBranch(s, focusedDivision.branch, focusedDivision.name)
    );

    if (branchSubs.length === 0) {
      showToast("No subjects matched for this class branch.");
      return;
    }

    const defaultClassroom = rooms.find((r) => r.room_type === "CLASSROOM") || rooms[0];
    const defaultLab = rooms.find((r) => r.room_type === "LAB") || rooms[0];

    const generated: QuickCombo[] = branchSubs.map((sub, idx) => {
      const assignedTeacher = teachers[idx % Math.max(1, teachers.length)] || teachers[0];
      const isLab = sub.subject_type === "PRACTICAL";
      const room = isLab ? defaultLab : defaultClassroom;

      return {
        id: "combo-auto-" + sub.id + "-" + Date.now(),
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        teacherId: assignedTeacher?.id || "",
        teacherName: assignedTeacher?.name || "Prof. Faculty",
        roomId: room?.id,
        roomName: room?.name,
        sessionType: isLab ? "LAB" : "THEORY",
        duration: isLab ? (sub.lab_session_duration || 2) : 1,
        color: colorMap[sub.id] || "#4f46e5",
      };
    });

    setQuickCombos((prev) => [...generated, ...prev]);
    showToast(`Generated ${generated.length} ready combos for ${focusedDivision.name}!`);
  };

  // ── 9. Edit Slot Detail Modal ────────────────────────────────
  const handleOpenEditCell = (divId: string, day: string, slotId: string, entry: CellEntry) => {
    setEditingCell({ divId, day, slotId, entry });
    setEditTeacherId(entry.teacherId || (teachers[0]?.id ?? ""));
    setEditRoomId(entry.roomId || (rooms[0]?.id ?? ""));
  };

  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    const { divId, day, slotId, entry } = editingCell;
    const teacher = teachers.find((t) => t.id === editTeacherId);
    const room = rooms.find((r) => r.id === editRoomId);

    recordHistory();
    setTimetable((prev) => {
      const divGrid = { ...(prev[divId] || {}) };
      const updated: CellEntry = {
        ...entry,
        teacherId: teacher?.id,
        teacherName: teacher?.name,
        roomId: room?.id,
        roomName: room?.name,
      };

      divGrid[`${day}-${slotId}`] = updated;

      // Update continuation block if exists
      const slotIdx = schemaSlots.findIndex((s) => s.id === slotId);
      if (slotIdx + 1 < schemaSlots.length) {
        const nextSlotId = schemaSlots[slotIdx + 1].id;
        const nextCell = divGrid[`${day}-${nextSlotId}`];
        if (nextCell?.parentSlotId === slotId) {
          divGrid[`${day}-${nextSlotId}`] = {
            ...nextCell,
            teacherId: teacher?.id,
            teacherName: teacher?.name,
            roomId: room?.id,
            roomName: room?.name,
          };
        }
      }

      return { ...prev, [divId]: divGrid };
    });

    setEditingCell(null);
    showToast("Slot details updated");
  };

  // ── 10. Division Navigation ──────────────────────────────────
  const addDivision = (div: Division) => {
    if (activeDivisions.find((d) => d.id === div.id)) {
      setFocusedDivId(div.id);
      setShowDivPicker(false);
      return;
    }
    const updated = [...activeDivisions, div];
    setActiveDivisions(updated);
    setFocusedDivId(div.id);
    setSelectedGenDivIds(updated.map((m) => m.id));
    setTimetable((prev) => ({ ...prev, [div.id]: prev[div.id] || {} }));
    setShowDivPicker(false);
  };

  const removeDivision = (divId: string) => {
    const updated = activeDivisions.filter((d) => d.id !== divId);
    setActiveDivisions(updated);
    if (focusedDivId === divId && updated.length > 0) {
      setFocusedDivId(updated[0].id);
    }
    setSelectedGenDivIds(updated.map((m) => m.id));
    setTimetable((prev) => {
      const next = { ...prev };
      delete next[divId];
      return next;
    });
  };

  // ── Helper: Convert raw backend solver grid into frontend DivGrid state ──
  const convertRawTimetablesToState = useCallback((
    rawTimetables: Record<string, any[][]>,
    targetDivs: Division[],
    currentTimetable: Record<string, DivGrid>
  ): Record<string, DivGrid> => {
    const next = { ...currentTimetable };
    const workingDays = schemaDays;
    const slotsList = schemaSlots;

    targetDivs.forEach((div) => {
      const rawGrid = rawTimetables[div.id] || rawTimetables[div.name];
      if (!rawGrid) return;

      const divGrid: DivGrid = {};

      if (Array.isArray(rawGrid)) {
        rawGrid.forEach((dayRow: any[], dayIdx: number) => {
          if (!Array.isArray(dayRow) || dayIdx >= workingDays.length) return;
          const dayName = workingDays[dayIdx];

          dayRow.forEach((cell: any, slotIdx: number) => {
            if (!cell || slotIdx >= slotsList.length) return;
            const slotDef = slotsList[slotIdx];

            if (
              slotDef.isBreak ||
              cell.type === "break" ||
              cell.type === "free" ||
              !cell.subject_id
            ) {
              divGrid[`${dayName}-${slotDef.id}`] = null;
              return;
            }

            // Strip _lab suffix if present
            const cleanSubId = String(cell.subject_id || "").replace(/_lab$/, "");
            const matchedSub = subjects.find(
              (s) =>
                s.id === cleanSubId ||
                s.id === cell.subject_id ||
                s.name.toLowerCase() === String(cell.subject_name || "").toLowerCase()
            );

            const isPRJ =
              cell.code === "PRJ" ||
              (cell.type || "").toUpperCase() === "PRJ" ||
              String(cell.subject_name || "").toUpperCase().includes("PRJ");

            const isSDA =
              cell.code === "SDA" ||
              (cell.type || "").toUpperCase() === "SDA" ||
              String(cell.subject_name || "").toUpperCase().includes("SDA");

            const isLab =
              !isPRJ &&
              !isSDA &&
              ((cell.type || "").toLowerCase().includes("lab") ||
              String(cell.subject_id || "").endsWith("_lab") ||
              String(cell.subject_name || "").toLowerCase().includes("lab"));

            const sessionType: "THEORY" | "LAB" = (isLab || isPRJ) ? "LAB" : "THEORY";
            const subCode =
              cell.code ||
              matchedSub?.code ||
              (isPRJ ? "PRJ" : isSDA ? "SDA" : cell.subject_id ? cleanSubId.slice(0, 6).toUpperCase() : "SUB");
            const color =
              isPRJ
                ? "#d97706"
                : isSDA
                ? "#059669"
                : (matchedSub && colorMap[matchedSub.id]) ||
                  SUBJECT_COLORS[(cell.color_index || 0) % SUBJECT_COLORS.length] ||
                  (isLab ? "#7c3aed" : "#4f46e5");

            divGrid[`${dayName}-${slotDef.id}`] = {
              subjectId: matchedSub?.id || cleanSubId || cell.subject_id,
              subjectName: cell.subject_name || matchedSub?.name || (isPRJ ? "PRJ (Project Work)" : isSDA ? "SDA (Skill Development)" : "Subject"),
              subjectCode: subCode,
              sessionType: sessionType,
              duration: (isLab || isPRJ) ? 2 : 1,
              color: color,
              teacherName: cell.teacher || "",
              roomName: cell.room || "",
              isContinuation: !!cell.is_continuation,
              parentSlotId:
                cell.is_continuation && slotIdx > 0 ? slotsList[slotIdx - 1].id : undefined,
              isPRJ,
              isSDA,
            };
          });
        });
      } else if (typeof rawGrid === "object") {
        Object.entries(rawGrid).forEach(([key, val]: [string, any]) => {
          if (val && typeof val === "object" && val.subjectId) {
            divGrid[key] = val;
          } else if (Array.isArray(val)) {
            const dayName = key;
            val.forEach((cell: any, slotIdx: number) => {
              if (!cell || slotIdx >= slotsList.length) return;
              const slotDef = slotsList[slotIdx];
              if (
                slotDef.isBreak ||
                cell.type === "break" ||
                cell.type === "free" ||
                !cell.subject_id
              ) {
                divGrid[`${dayName}-${slotDef.id}`] = null;
                return;
              }
              const cleanSubId = String(cell.subject_id || "").replace(/_lab$/, "");
              const matchedSub = subjects.find(
                (s) =>
                  s.id === cleanSubId ||
                  s.id === cell.subject_id ||
                  s.name.toLowerCase() === String(cell.subject_name || "").toLowerCase()
              );
              const isPRJ =
                cell.code === "PRJ" ||
                (cell.type || "").toUpperCase() === "PRJ" ||
                String(cell.subject_name || "").toUpperCase().includes("PRJ");

              const isSDA =
                cell.code === "SDA" ||
                (cell.type || "").toUpperCase() === "SDA" ||
                String(cell.subject_name || "").toUpperCase().includes("SDA");

              const isLab =
                !isPRJ &&
                !isSDA &&
                ((cell.type || "").toLowerCase().includes("lab") ||
                String(cell.subject_id || "").endsWith("_lab") ||
                String(cell.subject_name || "").toLowerCase().includes("lab"));

              divGrid[`${dayName}-${slotDef.id}`] = {
                subjectId: matchedSub?.id || cleanSubId || cell.subject_id,
                subjectName: cell.subject_name || matchedSub?.name || (isPRJ ? "PRJ (Project Work)" : isSDA ? "SDA (Skill Development)" : "Subject"),
                subjectCode: cell.code || matchedSub?.code || (isPRJ ? "PRJ" : isSDA ? "SDA" : cleanSubId.slice(0, 6).toUpperCase()),
                sessionType: (isLab || isPRJ) ? "LAB" : "THEORY",
                duration: (isLab || isPRJ) ? 2 : 1,
                color: isPRJ
                  ? "#d97706"
                  : isSDA
                  ? "#059669"
                  : (matchedSub && colorMap[matchedSub.id]) || (isLab ? "#7c3aed" : "#4f46e5"),
                teacherName: cell.teacher || "",
                roomName: cell.room || "",
                isContinuation: !!cell.is_continuation,
                isPRJ,
                isSDA,
              };
            });
          }
        });
      }

      next[div.id] = divGrid;
    });

    return next;
  }, [schemaDays, schemaSlots, subjects, colorMap]);

  // ── 11. Backend Python Auto-Generation & Preset Creation ────
  const runAutoGeneration = async (targetDivs: Division[]) => {
    if (targetDivs.length === 0) {
      showToast("Please select at least one division to auto-generate.");
      return;
    }

    setAutoGenerating(true);
    try {
      const workingDays = schemaDays;
      const slotsList = schemaSlots;

      // Call Python backend auto-generation API directly
      const payload = {
        division_ids: targetDivs.map((d) => d.id),
        working_days: workingDays,
        time_slots: slotsList.map((s) => ({
          id: s.id,
          name: s.label,
          type: s.isBreak ? "break" : "teaching",
          title: s.title || (s.isBreak ? "Lunch Break" : undefined),
        })),
        max_consecutive: 3,
        min_free_per_day: 0,
      };

      const res = await ApiService.autoGeneratePreset(payload);

      if (res && res.status === "SUCCESS" && res.timetables) {
        recordHistory();

        // Convert raw backend solver grid to frontend DivGrid structure
        const updated = convertRawTimetablesToState(res.timetables, targetDivs, timetable);
        setTimetable(updated);

        // Persist to local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          timetable: updated,
          activeDivIds: activeDivisions.map((d) => d.id),
          savedAt: new Date().toISOString(),
        }));

        // Add newly created preset to presets list and activate it
        const newPreset: TimetablePresetSummary = {
          id: res.preset_id,
          name: res.preset_name,
          version_number: res.version_number,
          quality: res.quality || {},
          stats: res.stats || {},
          division_count: Object.keys(res.timetables).length,
          created_at: res.created_at || new Date().toISOString(),
          status: "DRAFT",
        };

        setPresets((prev) => [newPreset, ...prev.filter((p) => p.id !== res.preset_id)]);
        setActivePresetId(res.preset_id);
        setSolverStats(res.stats || null);
        setShowAutoGenerateModal(false);

        const score = res.quality?.overall_score ? `${Math.round(res.quality.overall_score)}%` : "High";
        showToast(`Generated ${res.preset_name}! (Quality: ${score})`);
      } else {
        showToast("Solver found no feasible schedule. Please check constraints.");
      }
    } catch (err: any) {
      console.error("Auto-generate preset error:", err);
      showToast(err?.response?.data?.detail || "Auto-generation failed");
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    setLoadingPreset(true);
    try {
      const detail = await ApiService.getTimetablePreset(presetId);
      if (detail && detail.timetables) {
        recordHistory();
        setActivePresetId(presetId);
        const updated = convertRawTimetablesToState(detail.timetables, activeDivisions, timetable);
        setTimetable(updated);
        if (detail.stats) setSolverStats(detail.stats);
        const score = detail.quality?.overall_score ? `${Math.round(detail.quality.overall_score)}%` : "";
        showToast(`Switched to ${detail.name} ${score ? `(Quality: ${score})` : ""}`);
      }
    } catch (err: any) {
      console.error("Failed to load preset:", err);
      showToast("Failed to switch preset");
    } finally {
      setLoadingPreset(false);
    }
  };

  const handleDeletePreset = async (presetId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const presetToDelete = presets.find((p) => p.id === presetId);
    const presetName = presetToDelete?.name || "Preset";
    const remaining = presets.filter((p) => p.id !== presetId);

    // Optimistically update presets list immediately
    setPresets(remaining);

    // If active preset was deleted, switch to the first remaining preset or clear
    if (activePresetId === presetId) {
      if (remaining.length > 0) {
        handleSelectPreset(remaining[0].id);
      } else {
        setActivePresetId(null);
      }
    }

    try {
      await ApiService.deleteTimetablePreset(presetId);
      showToast(`${presetName} deleted`);
    } catch (err: any) {
      console.error("Failed to delete preset from backend:", err);
      // Rollback if failed
      if (presetToDelete) {
        setPresets((prev) => [...prev, presetToDelete]);
      }
      showToast("Failed to delete preset from server");
    }
  };

  const handleAutoFillSingleDivision = (divId: string) => {
    const target = activeDivisions.find((d) => d.id === divId);
    if (!target) return;
    runAutoGeneration([target]);
  };

  // ── 12. Save All ─────────────────────────────────────────────
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payload = {
        timetable,
        activeDivIds: activeDivisions.map((d) => d.id),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));

      // Persist version to MySQL database
      try {
        await ApiService.saveTimetableVersion({
          name: `Schedule Snapshot - ${new Date().toLocaleDateString()}`,
          timetables: timetable,
          status: "PUBLISHED",
          classes_used: activeDivisions.map((d) => d.id),
          conflicts: conflicts,
          stats: {
            conflictsCount: conflicts.length,
            divisionsCount: activeDivisions.length,
            activeSchema: activeSchema?.name || "Standard",
          },
        });
      } catch (dbErr) {
        console.warn("Could not sync timetable version to DB, saved to local cache:", dbErr);
      }

      await new Promise((r) => setTimeout(r, 400));

      const conflictMsg =
        conflicts.length === 0
          ? "All clean! 0 conflicts."
          : `⚠️ Note: ${conflicts.length} conflict(s) detected.`;
      showToast(`Timetable saved! ${conflictMsg}`);
    } catch {
      showToast("Error saving timetable");
    } finally {
      setSaving(false);
    }
  };

  const availDivisions = allDivisions.filter(
    (d) => !activeDivisions.find((a) => a.id === d.id)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5.25rem)] overflow-hidden animate-fadeIn min-w-0 w-full max-w-full">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slideUp">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Timetable Builder
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Slot Schema Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/60 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors">
            <Clock size={13} className="text-slate-600 flex-shrink-0" />
            <span className="text-[11px] font-bold text-slate-500">Schema:</span>
            <select
              value={activeSchemaId}
              onChange={(e) => handleSelectSchema(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[190px] truncate"
            >
              {availableSchemas.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.name}
                </option>
              ))}
            </select>
            <a
              href="/schemas"
              title="Configure slot schemas, recess breaks & lunch periods"
              className="p-1 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
            >
              <SlidersHorizontal size={12} />
            </a>
          </div>

          {/* Auto-Generate Master Button */}
          <button
            onClick={() => {
              setSelectedGenDivIds(activeDivisions.map((d) => d.id));
              setShowAutoGenerateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Play size={12} fill="currentColor" />
            <span>Auto-Generate Schedule</span>
          </button>

          {history.length > 0 && (
            <button
              onClick={handleUndo}
              title="Undo last action"
              className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Undo2 size={13} />
              <span>Undo</span>
            </button>
          )}

          {/* Official College Sheet Export */}
          <button
            onClick={() => navigate(`/export?preset=${encodeURIComponent(activePresetId || "")}&division=${encodeURIComponent(focusedDivId || activeDivisions[0]?.id || "")}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Open official college classroom timetable sheet for export and printing"
          >
            <FileSpreadsheet size={13} className="text-emerald-700" />
            <span>Export Sheet</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs disabled:opacity-60 transition-all cursor-pointer"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Live Conflict Banner (compact) */}
      {conflicts.length > 0 ? (
        <div className="my-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 animate-fadeIn flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <ShieldAlert size={15} className="text-rose-600 flex-shrink-0" />
            <span className="font-black text-rose-900">
              {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""} Detected!
            </span>
            <span className="text-[11px] text-rose-700 hidden sm:inline">
              Double-bookings highlighted in red below.
            </span>
          </div>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-200/80 text-rose-800">
            Action Required
          </span>
        </div>
      ) : activeDivisions.length > 0 ? (
        <div className="my-1.5 bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-1 flex items-center gap-2 text-[11px] font-bold text-emerald-800 flex-shrink-0">
          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
          <span>No Conflicts Detected — All active divisions and faculty schedules synchronized.</span>
        </div>
      ) : null}

      {/* ── Main Two-Column Viewport ── */}
      <div className="flex-1 min-h-0 min-w-0 flex gap-2.5 overflow-hidden mt-1 w-full">
        {/* ── LEFT PANEL: Tabs for [Courses] [⚡ Quick Combo] [Settings] ── */}
        <div
          className={`${
            leftPanelCollapsed ? "w-12" : "w-72 lg:w-80"
          } flex-shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all duration-200 relative`}
        >
          {leftPanelCollapsed ? (
            <div className="flex flex-col items-center py-3 gap-3 h-full bg-slate-50/70 select-none">
              <button
                type="button"
                onClick={() => setLeftPanelCollapsed(false)}
                title="Expand Courses & Palette Panel"
                className="p-2 rounded-xl bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
              <div className="w-6 h-px bg-slate-200" />
              <button
                type="button"
                onClick={() => {
                  setSidebarTab("courses");
                  setLeftPanelCollapsed(false);
                }}
                title="Courses (Click to expand)"
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  sidebarTab === "courses"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <BookOpen size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSidebarTab("combo");
                  setLeftPanelCollapsed(false);
                }}
                title="Quick Combo (Click to expand)"
                className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                  sidebarTab === "combo"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <Zap size={15} className={sidebarTab === "combo" ? "text-amber-300" : "text-amber-500"} />
                {quickCombos.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center">
                    {quickCombos.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSidebarTab("settings");
                  setLeftPanelCollapsed(false);
                }}
                title="Settings (Click to expand)"
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  sidebarTab === "settings"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          ) : (
            <>
              {/* Left Panel Tab Header */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/60 flex-shrink-0 flex items-center gap-1.5">
                <div className="flex bg-slate-200/70 p-0.5 rounded-xl text-xs font-bold flex-1 min-w-0">
                  <button
                    onClick={() => setSidebarTab("courses")}
                    className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] ${
                      sidebarTab === "courses"
                        ? "bg-white text-indigo-700 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen size={11} />
                    <span>Courses</span>
                  </button>

                  <button
                    onClick={() => setSidebarTab("combo")}
                    className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer relative text-[11px] ${
                      sidebarTab === "combo"
                        ? "bg-white text-indigo-700 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Zap size={11} className="text-amber-500" />
                    <span className="truncate">Combo</span>
                    {quickCombos.length > 0 && (
                      <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center ml-0.5">
                        {quickCombos.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setSidebarTab("settings")}
                    className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] ${
                      sidebarTab === "settings"
                        ? "bg-white text-indigo-700 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <SlidersHorizontal size={11} />
                    <span>Settings</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setLeftPanelCollapsed(true)}
                  title="Collapse panel to give timetable grid full width"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-all cursor-pointer flex-shrink-0"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              {/* Left Panel Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {/* ── TAB 1: CURRICULUM COURSES ── */}
            {sidebarTab === "courses" && (
              <>
                {/* Tracking Division Indicator */}
                {activeDivisions.length > 0 && (
                  <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-2.5">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-900 mb-1">
                      Tracking Quota For:
                    </label>
                    <select
                      value={focusedDivId}
                      onChange={(e) => setFocusedDivId(e.target.value)}
                      className="w-full text-xs font-bold px-2 py-1 rounded-lg border border-indigo-200 bg-white text-indigo-900 focus:outline-none cursor-pointer"
                    >
                      {activeDivisions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.branch || "General"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Branch Filter & Search Bar */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search courses or codes..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter size={11} className="text-slate-400 flex-shrink-0" />
                    <select
                      value={branchFilter}
                      onChange={(e) => setBranchFilter(e.target.value)}
                      className="flex-1 text-[11px] font-bold py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer truncate"
                    >
                      <option value="AUTO">
                        Auto: {focusedDivision?.branch || "Current Class"} ({filteredSubjects.length})
                      </option>
                      <option value="ALL">All Disciplines ({subjects.length} courses)</option>
                      {BRANCH_LIST.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 1-Click Course Type Segment: Eliminates scrolling down to find practical labs */}
                  <div className="flex bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCourseTypeFilter("ALL")}
                      className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        courseTypeFilter === "ALL"
                          ? "bg-white text-indigo-700 shadow-2xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>All</span>
                      <span className="text-[9px] px-1 py-0.2 rounded-full bg-slate-200 text-slate-700">
                        {theorySubjects.length + labSubjects.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCourseTypeFilter("THEORY")}
                      className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        courseTypeFilter === "THEORY"
                          ? "bg-white text-blue-700 shadow-2xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <BookOpen size={11} className="text-blue-600" />
                      <span>Theory</span>
                      <span className="text-[9px] px-1 py-0.2 rounded-full bg-blue-100 text-blue-700">
                        {theorySubjects.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCourseTypeFilter("LAB")}
                      className={`flex-1 py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        courseTypeFilter === "LAB"
                          ? "bg-white text-purple-700 shadow-2xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Beaker size={11} className="text-purple-600" />
                      <span>Labs</span>
                      <span className="text-[9px] px-1 py-0.2 rounded-full bg-purple-100 text-purple-700">
                        {labSubjects.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Courses List */}
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-slate-400 font-bold">Loading curriculum...</span>
                  </div>
                ) : filteredSubjects.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
                    <BookOpen size={24} className="mx-auto mb-1 text-slate-300" />
                    <p className="text-xs text-slate-500 font-bold">No courses matched filter.</p>
                    <button
                      onClick={() => {
                        setBranchFilter("ALL");
                        setSubjectSearch("");
                        setCourseTypeFilter("ALL");
                      }}
                      className="mt-2 text-[10px] text-indigo-600 font-black hover:underline cursor-pointer"
                    >
                      Show All {subjects.length} Courses
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Practical Labs First when "LAB" selected — ZERO SCROLLING NEEDED */}
                    {courseTypeFilter === "LAB" && labSubjects.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-purple-700 font-black text-[11px] uppercase tracking-wider px-0.5">
                          <span className="flex items-center gap-1">
                            <Beaker size={12} /> Practical Labs
                          </span>
                          <span className="text-[9px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.5 rounded-full">
                            {labSubjects.length} Available
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {labSubjects.map((s) => (
                            <SubjectCard
                              key={s.id + "-L"}
                              subject={s}
                              sessionType="LAB"
                              color={colorMap[s.id] || "#7c3aed"}
                              scheduledCount={scheduledQuotas.lab[s.id] || 0}
                              targetCount={s.lab_hours_per_week || 1}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Theory Lectures when "THEORY" or "ALL" */}
                    {(courseTypeFilter === "ALL" || courseTypeFilter === "THEORY") &&
                      theorySubjects.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-blue-700 font-black text-[11px] uppercase tracking-wider px-0.5">
                            <span className="flex items-center gap-1">
                              <BookOpen size={12} /> Theory Lectures
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {theorySubjects.length}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {theorySubjects.map((s) => (
                              <SubjectCard
                                key={s.id + "-T"}
                                subject={s}
                                sessionType="THEORY"
                                color={colorMap[s.id] || "#4f46e5"}
                                scheduledCount={scheduledQuotas.theory[s.id] || 0}
                                targetCount={s.theory_hours_per_week || 3}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Practical Labs when "ALL" */}
                    {courseTypeFilter === "ALL" && labSubjects.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-purple-700 font-black text-[11px] uppercase tracking-wider px-0.5">
                          <span className="flex items-center gap-1">
                            <Beaker size={12} /> Practical Labs
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            {labSubjects.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {labSubjects.map((s) => (
                            <SubjectCard
                              key={s.id + "-L"}
                              subject={s}
                              sessionType="LAB"
                              color={colorMap[s.id] || "#7c3aed"}
                              scheduledCount={scheduledQuotas.lab[s.id] || 0}
                              targetCount={s.lab_hours_per_week || 1}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── TAB 2: ⚡ QUICK COMBO CREATOR ── */}
            {sidebarTab === "combo" && (
              <div className="space-y-3">
                {/* Form Card */}
                <div className="bg-gradient-to-b from-indigo-50/70 to-slate-50 border border-indigo-200/80 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs font-black text-indigo-900">
                      <Zap size={14} className="text-amber-500 fill-amber-500" />
                      <span>Quick Combo Builder</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Pre-Pair</span>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight">
                    Pair subject, faculty, and room into a single 1-drag card. Dropping places everything at once.
                  </p>

                  {/* 1. Subject */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      1. Choose Subject
                    </label>
                    <select
                      value={comboSubjectId}
                      onChange={(e) => handleComboSubjectChange(e.target.value)}
                      className="w-full text-xs font-bold px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      {filteredSubjects.length > 0 ? (
                        filteredSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} – {s.name} ({s.subject_type})
                          </option>
                        ))
                      ) : (
                        subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} – {s.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* 2. Faculty */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      2. Choose Faculty
                    </label>
                    <select
                      value={comboTeacherId}
                      onChange={(e) => setComboTeacherId(e.target.value)}
                      className="w-full text-xs font-bold px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.designation || "Faculty"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Venue / Room */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                      3. Choose Room (Optional)
                    </label>
                    <select
                      value={comboRoomId}
                      onChange={(e) => setComboRoomId(e.target.value)}
                      className="w-full text-xs font-bold px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="">-- Auto / Home Room --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.room_type} · Cap {r.capacity})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Type (1h Theory vs 2h Lab) */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setComboSessionType("THEORY")}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        comboSessionType === "THEORY"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-black"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      1h Theory
                    </button>
                    <button
                      type="button"
                      onClick={() => setComboSessionType("LAB")}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        comboSessionType === "LAB"
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-black"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      2h Lab Block
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleCreateQuickCombo}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-2xs cursor-pointer transition-all"
                  >
                    <Plus size={14} />
                    <span>Add Combo to Palette</span>
                  </button>
                </div>

                {/* Auto-suggest button */}
                {focusedDivision && (
                  <button
                    type="button"
                    onClick={handleAutoSuggestCombosForClass}
                    className="w-full py-1.5 px-2 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Auto-Suggest Combos for {focusedDivision.name}</span>
                  </button>
                )}

                {/* Ready Combos List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-black text-slate-700 px-0.5">
                    <span>Ready Combos ({quickCombos.length})</span>
                    {quickCombos.length > 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm("Clear all quick combos?")) setQuickCombos([]);
                        }}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {quickCombos.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                      No combos created yet. Pair a subject with faculty above!
                    </div>
                  ) : (
                    quickCombos.map((combo) => (
                      <QuickComboCard
                        key={combo.id}
                        combo={combo}
                        onDelete={handleDeleteQuickCombo}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: CANVAS SETTINGS ── */}
            {sidebarTab === "settings" && (
              <div className="space-y-3 text-xs">
                {/* Active Schema Preset Card */}
                <div className="p-3 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 border border-indigo-200/80 rounded-xl space-y-2">
                  <div className="font-black text-indigo-950 uppercase tracking-wider text-[10px] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      <span>Slot & Break Schema</span>
                    </span>
                    <a
                      href="/schemas"
                      className="text-[10px] text-indigo-600 font-black hover:underline"
                    >
                      Open Editor →
                    </a>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-900 mb-1">
                      Active Template:
                    </label>
                    <select
                      value={activeSchemaId}
                      onChange={(e) => handleSelectSchema(e.target.value)}
                      className="w-full text-xs font-bold px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      {availableSchemas.map((sch) => (
                        <option key={sch.id} value={sch.id}>
                          {sch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium leading-tight">
                    Defines hourly teaching intervals, morning tea breaks, and central lunch bands.
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="font-black text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Grid3X3 size={13} />
                    <span>Canvas Dimensions</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Working Days / Week
                    </label>
                    <div className="flex gap-1.5">
                      {[5, 6].map((n) => (
                        <button
                          key={n}
                          onClick={() => setActiveDays(n)}
                          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            activeDays === n
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {n} Days (Mon–{n === 5 ? "Fri" : "Sat"})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Daily Slots (1 hour intervals)
                    </label>
                    <div className="flex gap-1.5">
                      {[7, 8, 9].map((n) => (
                        <button
                          key={n}
                          onClick={() => setActiveSlots(n)}
                          className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            activeSlots === n
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {n} Slots
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1.5 text-[11px] text-indigo-900">
                  <div className="font-black flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-600" />
                    <span>Auto-Generation CP-SAT Solver:</span>
                  </div>
                  <p className="text-[10px] text-indigo-800 leading-relaxed font-medium">
                    Google OR-Tools solver runs deterministic constraint programming ensuring:
                    <br />• 0 Faculty double-bookings
                    <br />• 0 Room double-bookings
                    <br />• 2-hour practical blocks preserved
                    <br />• 12:00 lunch break protected
                  </p>
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* ── RIGHT CANVAS: Tabbed Division Views (No infinite vertical scrolling!) ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full bg-slate-50/60 rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* ── Timetable Presets Switcher Bar ── */}
          <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between gap-2 border-b border-slate-800 flex-shrink-0 min-w-0 w-full">
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-xs font-bold tracking-wide flex-shrink-0">
                <Layers size={13} className="text-slate-400" />
                <span className="hidden sm:inline">Presets</span>
              </div>

              {/* Scrollable list of preset tabs */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto py-0.5 flex-1 min-w-0 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {presets.length === 0 ? (
                  <span className="text-xs text-slate-400 italic px-2">
                    No presets yet. Click "+ Auto-Generate New Preset" to run backend solver.
                  </span>
                ) : (
                  presets.map((p) => {
                    const isActive = activePresetId === p.id;
                    const score = p.quality?.overall_score ? Math.round(p.quality.overall_score) : null;
                    return (
                      <div
                        key={p.id}
                        className={`group relative flex items-center rounded-xl text-xs font-bold transition-all select-none whitespace-nowrap flex-shrink-0 ${
                          isActive
                            ? "bg-slate-700 text-white shadow-sm ring-1 ring-slate-500"
                            : "bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/10"
                        }`}
                      >
                        {/* Preset Select Button */}
                        <button
                          type="button"
                          onClick={() => handleSelectPreset(p.id)}
                          disabled={loadingPreset}
                          className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer focus:outline-none"
                        >
                          <span className="flex items-center gap-1">
                            <span className="font-mono text-[10px] opacity-75">#{p.version_number}</span>
                            <span className="font-bold">{p.name}</span>
                          </span>

                          {score !== null && (
                            <span
                              className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-full ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : score >= 90
                                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/30"
                                  : "bg-amber-500/30 text-amber-300 border border-amber-400/30"
                              }`}
                            >
                              {score}%
                            </span>
                          )}
                        </button>

                        {/* Separate, Non-nested Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeletePreset(p.id, e)}
                          title={`Delete ${p.name}`}
                          className={`p-1.5 pr-2.5 transition-all cursor-pointer rounded-r-xl ${
                            isActive
                              ? "text-indigo-200 hover:text-rose-200 hover:bg-rose-500/40"
                              : "text-slate-400 hover:text-rose-300 hover:bg-rose-500/30"
                          }`}
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* + Generate New Preset Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {loadingPreset && (
                <div className="flex items-center gap-1 text-[11px] text-indigo-300 font-bold">
                  <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="hidden md:inline">Loading...</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  const target = activeDivisions.length > 0 ? activeDivisions : allDivisions.slice(0, 4);
                  runAutoGeneration(target);
                }}
                disabled={autoGenerating}
                title="Run Python OR-Tools backend to create a new timetable preset variant with fresh seed"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex-shrink-0 whitespace-nowrap"
              >
                {autoGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Generating Preset...</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} strokeWidth={3} />
                    <span className="hidden sm:inline">Auto-Generate New Preset</span>
                    <span className="sm:hidden">New Preset</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Canvas Top Bar: Division Tabs + View Mode */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0 relative z-20 min-w-0 w-full">
            {/* Division Tabs & Add View */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Division Tabs (No scrollbar, scrollable if many) */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto py-1 flex-shrink min-w-0 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {activeDivisions.map((div) => {
                  const isFocused = div.id === focusedDivId;
                  const divConflicts = conflicts.filter(
                    (c) => c.divA === div.name || c.divB === div.name
                  );

                  return (
                    <button
                      key={div.id}
                      type="button"
                      onClick={() => setFocusedDivId(div.id)}
                      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex-shrink-0 ${
                        isFocused
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70"
                      }`}
                    >
                      <span>{div.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          isFocused ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200"
                        }`}
                      >
                        {div.branch?.slice(0, 10) || "General"}
                      </span>
                      {divConflicts.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                          !
                        </span>
                      )}
                      {activeDivisions.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDivision(div.id);
                          }}
                          title="Close division tab"
                          className={`p-0.5 rounded transition-colors ml-0.5 ${
                            isFocused
                              ? "text-white/70 hover:text-white hover:bg-white/20"
                              : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          <X size={11} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add Division Dropdown (OUTSIDE the scrollable tabs container) */}
              <div className="relative flex-shrink-0" ref={divPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowDivPicker((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus size={13} className="text-indigo-600" />
                  <span>Add View</span>
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${showDivPicker ? "rotate-180" : ""}`}
                  />
                </button>

                {showDivPicker && (() => {
                  const filteredAvail = availDivisions.filter((d) => {
                    const q = classFilterQuery.trim().toLowerCase();
                    const matchesSearch =
                      !q ||
                      d.name.toLowerCase().includes(q) ||
                      (d.branch || "").toLowerCase().includes(q);
                    const matchesBranch =
                      classBranchFilter === "ALL" ||
                      (d.branch && d.branch.toLowerCase().includes(classBranchFilter.toLowerCase()));
                    return matchesSearch && matchesBranch;
                  });

                  const branchesInAvail = Array.from(
                    new Set(availDivisions.map((d) => d.branch).filter(Boolean))
                  ) as string[];

                  return (
                    <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 w-80 max-h-[420px] flex flex-col overflow-hidden animate-scaleIn">
                      {/* Search & Filter Header */}
                      <div className="pb-2 border-b border-slate-100 flex-shrink-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Available Classes ({filteredAvail.length}{filteredAvail.length !== availDivisions.length ? ` / ${availDivisions.length}` : ""})
                          </span>
                          {(classFilterQuery || classBranchFilter !== "ALL") && (
                            <button
                              type="button"
                              onClick={() => { setClassFilterQuery(""); setClassBranchFilter("ALL"); }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Search Input Box */}
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Filter classes, branches..."
                            value={classFilterQuery}
                            onChange={(e) => setClassFilterQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                          />
                          {classFilterQuery && (
                            <button
                              type="button"
                              onClick={() => setClassFilterQuery("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        {/* Quick Branch Filter Chips */}
                        {branchesInAvail.length > 1 && (
                          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
                            <button
                              type="button"
                              onClick={() => setClassBranchFilter("ALL")}
                              className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer ${
                                classBranchFilter === "ALL"
                                  ? "bg-indigo-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              All
                            </button>
                            {branchesInAvail.map((br) => {
                              const shortName = br.replace(" Engineering", "").replace(" & Communication", "");
                              const active = classBranchFilter === br;
                              return (
                                <button
                                  key={br}
                                  type="button"
                                  onClick={() => setClassBranchFilter(active ? "ALL" : br)}
                                  className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer ${
                                    active
                                      ? "bg-indigo-600 text-white shadow-2xs"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {shortName}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Scrollable Classes List */}
                      <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pt-1.5">
                        {availDivisions.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 font-medium">
                            All divisions are already open on the canvas.
                          </div>
                        ) : filteredAvail.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 font-medium space-y-1">
                            <p>No classes match "{classFilterQuery}"</p>
                            <button
                              type="button"
                              onClick={() => { setClassFilterQuery(""); setClassBranchFilter("ALL"); }}
                              className="text-indigo-600 font-bold text-[11px] underline"
                            >
                              Clear filter
                            </button>
                          </div>
                        ) : (
                          filteredAvail.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                addDivision(d);
                                setClassFilterQuery("");
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-indigo-50 transition-colors text-left cursor-pointer group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-[10px] font-black text-indigo-700 transition-colors flex-shrink-0">
                                {d.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 truncate">
                                  {d.name}
                                </div>
                                <div className="text-[10px] text-slate-500 group-hover:text-indigo-700 truncate">
                                  {d.branch || "General Engineering"}
                                </div>
                              </div>
                              <Plus size={12} className="text-slate-400 group-hover:text-indigo-600 flex-shrink-0" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* View Mode Switcher (Focus vs Split vs Stack) */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 flex-shrink-0">
              <button
                onClick={() => setViewMode("focus")}
                title="Single Division Focus View (Fits screen with zero scroll)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "focus"
                    ? "bg-white text-indigo-700 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid size={12} />
                <span className="hidden sm:inline">Focus</span>
              </button>

              <button
                onClick={() => setViewMode("split")}
                title="Side-by-side split view"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "split"
                    ? "bg-white text-indigo-700 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns2 size={12} />
                <span className="hidden sm:inline">Split</span>
              </button>

              <button
                onClick={() => setViewMode("stack")}
                title="Stack all divisions vertically"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "stack"
                    ? "bg-white text-indigo-700 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ListFilter size={12} />
                <span className="hidden sm:inline">Stack</span>
              </button>
            </div>
          </div>

          {/* Canvas Content Area */}
          <div className="flex-1 min-h-0 overflow-auto p-3">
            {activeDivisions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                <Layers size={36} className="text-slate-300 mb-2" />
                <div className="font-black text-slate-700 text-sm">No Divisions Selected</div>
                <div className="text-xs text-slate-400 mt-1">
                  Click "+ Add View" above to open a division timetable canvas.
                </div>
              </div>
            ) : viewMode === "focus" ? (
              // ── 1. Single Focus View (Fits viewport, switch tabs at top) ──
              focusedDivision ? (
                <DivisionPanel
                  key={focusedDivision.id}
                  division={focusedDivision}
                  grid={timetable[focusedDivision.id] || {}}
                  conflicts={conflicts}
                  activeDays={activeDays}
                  activeSlots={activeSlots}
                  daysList={schemaDays}
                  slotsList={schemaSlots}
                  collapsed={!!collapsedDivs[focusedDivision.id]}
                  onToggleCollapse={() =>
                    setCollapsedDivs((prev) => ({
                      ...prev,
                      [focusedDivision.id]: !prev[focusedDivision.id],
                    }))
                  }
                  onDrop={handleDropInitiated}
                  onClear={handleClear}
                  onClearGrid={() => handleClearGrid(focusedDivision.id)}
                  onDuplicate={() => handleDuplicate(focusedDivision.id)}
                  onAutoFill={() => handleAutoFillSingleDivision(focusedDivision.id)}
                  onRemove={() => removeDivision(focusedDivision.id)}
                  onEditCell={handleOpenEditCell}
                  onInspectTeacher={(name) => setInspectTeacherName(name)}
                />
              ) : null
            ) : viewMode === "split" ? (
              // ── 2. Side-by-Side Split View ──
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 h-full">
                {activeDivisions.slice(0, 2).map((div) => (
                  <DivisionPanel
                    key={div.id}
                    division={div}
                    grid={timetable[div.id] || {}}
                    conflicts={conflicts}
                    activeDays={activeDays}
                    activeSlots={activeSlots}
                    daysList={schemaDays}
                    slotsList={schemaSlots}
                    collapsed={!!collapsedDivs[div.id]}
                    onToggleCollapse={() =>
                      setCollapsedDivs((prev) => ({ ...prev, [div.id]: !prev[div.id] }))
                    }
                    onDrop={handleDropInitiated}
                    onClear={handleClear}
                    onClearGrid={() => handleClearGrid(div.id)}
                    onDuplicate={() => handleDuplicate(div.id)}
                    onAutoFill={() => handleAutoFillSingleDivision(div.id)}
                    onRemove={() => removeDivision(div.id)}
                    onEditCell={handleOpenEditCell}
                    onInspectTeacher={(name) => setInspectTeacherName(name)}
                  />
                ))}
              </div>
            ) : (
              // ── 3. Stack View ──
              <div className="space-y-3">
                {activeDivisions.map((div) => (
                  <DivisionPanel
                    key={div.id}
                    division={div}
                    grid={timetable[div.id] || {}}
                    conflicts={conflicts}
                    activeDays={activeDays}
                    activeSlots={activeSlots}
                    daysList={schemaDays}
                    slotsList={schemaSlots}
                    collapsed={!!collapsedDivs[div.id]}
                    onToggleCollapse={() =>
                      setCollapsedDivs((prev) => ({ ...prev, [div.id]: !prev[div.id] }))
                    }
                    onDrop={handleDropInitiated}
                    onClear={handleClear}
                    onClearGrid={() => handleClearGrid(div.id)}
                    onDuplicate={() => handleDuplicate(div.id)}
                    onAutoFill={() => handleAutoFillSingleDivision(div.id)}
                    onRemove={() => removeDivision(div.id)}
                    onEditCell={handleOpenEditCell}
                    onInspectTeacher={(name) => setInspectTeacherName(name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Auto-Generate Modal (OR-Tools Solver) ── */}
      {showAutoGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-xs">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    OR-Tools Auto-Generate Engine
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Google OR-Tools CP-SAT Constraint Satisfaction Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAutoGenerateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-500 font-medium">
                The constraint satisfaction solver will place lectures and 2-hour lab blocks automatically while ensuring <strong>zero teacher clashes</strong>, proper room allocation, and a balanced weekly spread.
              </p>

              {/* Target Divisions Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700">
                    Target Class Groups ({selectedGenDivIds.length} selected):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGenDivIds.length === activeDivisions.length) {
                        setSelectedGenDivIds([]);
                      } else {
                        setSelectedGenDivIds(activeDivisions.map((d) => d.id));
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {selectedGenDivIds.length === activeDivisions.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                  {activeDivisions.map((div) => {
                    const isChecked = selectedGenDivIds.includes(div.id);
                    return (
                      <button
                        type="button"
                        key={div.id}
                        onClick={() => {
                          setSelectedGenDivIds((prev) =>
                            prev.includes(div.id)
                              ? prev.filter((x) => x !== div.id)
                              : [...prev, div.id]
                          );
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left font-bold transition-all cursor-pointer ${
                          isChecked
                            ? "bg-white border-indigo-400 text-indigo-900 shadow-2xs"
                            : "border-transparent text-slate-500 hover:bg-slate-200/50"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black ${
                            isChecked ? "bg-indigo-600 text-white" : "border border-slate-300"
                          }`}
                        >
                          {isChecked ? "✓" : ""}
                        </span>
                        <div className="truncate">
                          <div className="text-xs truncate">{div.name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{div.branch || "General"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Schema Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Schedule Slot & Break Schema Format:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={activeSchemaId}
                    onChange={(e) => handleSelectSchema(e.target.value)}
                    className="flex-1 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-2xs"
                  >
                    {availableSchemas.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} ({sch.working_days.length} Days · {sch.slots.length} Slots)
                      </option>
                    ))}
                  </select>
                  <a
                    href="/schemas"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>Manage</span>
                    <SlidersHorizontal size={11} />
                  </a>
                </div>
              </div>

              {/* Solver Rules Checklist */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                <div className="font-black text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Enforced Mathematical Constraints:</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div>✓ Max 1 session/subject/day</div>
                  <div>✓ No concurrent teacher double-booking</div>
                  <div>✓ 2-hour continuous lab blocks</div>
                  <div>✓ 12:00 Lunch Break Protected</div>
                  <div>✓ Max 3 consecutive lectures</div>
                  <div>✓ Rooms assigned by class capacity</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAutoGenerateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={autoGenerating || selectedGenDivIds.length === 0}
                  onClick={() => {
                    const targetDivs = activeDivisions.filter((d) =>
                      selectedGenDivIds.includes(d.id)
                    );
                    runAutoGeneration(targetDivs);
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {autoGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Running OR-Tools Solver...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} className="fill-white" />
                      <span>Run Solver ({selectedGenDivIds.length} Classes)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cell Detail / Reassignment Modal ── */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  {editingCell.day} · {editingCell.slotId}
                </div>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">
                  {editingCell.entry.subjectName} ({editingCell.entry.subjectCode})
                </h3>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Assigned Faculty Member
                </label>
                <select
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                >
                  <option value="">-- No Faculty Assigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.designation || "Faculty"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Allocated Room / Laboratory
                </label>
                <select
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                >
                  <option value="">-- No Room Allocated --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.room_type} · Cap: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleClear(editingCell.divId, editingCell.day, editingCell.slotId);
                    setEditingCell(null);
                  }}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs cursor-pointer"
                >
                  Clear Slot
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCellEdit}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Update Slot
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Faculty Deep Analysis & Personal Timetable Modal */}
      <FacultyAnalysisModal
        isOpen={!!inspectTeacherName}
        onClose={() => setInspectTeacherName(null)}
        teacherName={inspectTeacherName || undefined}
        initialPresetId={activePresetId || undefined}
      />
    </div>
  );
}
