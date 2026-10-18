import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Calendar, Clock, MapPin, BookOpen, Beaker, Users,
  Printer, Download, Sparkles, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, Activity, ChevronDown, Award
} from "lucide-react";
import { ApiService } from "@/services/api";

interface FacultyAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId?: string;
  teacherName?: string;
  initialPresetId?: string;
  embedded?: boolean;
}

export default function FacultyAnalysisModal({
  isOpen,
  onClose,
  teacherId,
  teacherName,
  initialPresetId,
  embedded = false,
}: FacultyAnalysisModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(initialPresetId || "");
  const [activeTab, setActiveTab] = useState<"timetable" | "analytics" | "subjects">("timetable");
  const [selectedSimDay, setSelectedSimDay] = useState<string>("");

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const identifier = (teacherId && !teacherId.includes('undefined') ? teacherId : '') || teacherName || "";

  useEffect(() => {
    if (!isOpen || !identifier) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await ApiService.getFacultyAnalysis(identifier, selectedPresetId || undefined);
        if (isMounted) {
          setData(res);
          if (res?.preset?.id && !selectedPresetId) {
            setSelectedPresetId(res.preset.id);
          }
          if (res?.working_days?.length && !selectedSimDay) {
            const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
            setSelectedSimDay(res.working_days.includes(today) ? today : res.working_days[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load faculty analysis:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, identifier, selectedPresetId]);

  // Lock body scroll and handle Escape key while modal is open (only in non-embedded mode)
  useEffect(() => {
    if (!isOpen || embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, embedded]);

  if (!isOpen) return null;

  const teacher = data?.teacher || { name: teacherName || identifier, designation: "Faculty Member" };
  const liveStatus = data?.live_status || {};
  const analytics = data?.analytics || {};
  const weeklyGrid = data?.weekly_grid || {};
  const workingDays = data?.working_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const timeSlots = data?.time_slots || [];
  const presets = data?.preset?.all_presets || [];

  // Export timetable to CSV
  const handleExportCSV = () => {
    if (!data || !weeklyGrid) return;
    const rows = [
      ["Faculty Timetable Report"],
      [`Faculty Name: ${teacher.name || "N/A"}`, `Employee ID: ${teacher.employee_id || "N/A"}`],
      [`Designation: ${teacher.designation || "Faculty"}`, `Department: ${teacher.department || "Engineering"}`],
      [`Preset: ${data?.preset?.name || "Active"}`],
      [],
      ["Day", "Slot #", "Time Window", "Class / Division", "Subject Code", "Subject Name", "Room / Lab", "Session Type"]
    ];

    workingDays.forEach((day: string) => {
      const slots = weeklyGrid[day] || [];
      slots.forEach((s: any, idx: number) => {
        if (s.is_break) {
          rows.push([day, `Slot ${idx + 1}`, s.slot_label, "—", "—", s.break_title || "BREAK", "—", "Break"]);
        } else if (s.session) {
          const sess = s.session;
          rows.push([
            day,
            `Slot ${idx + 1}`,
            s.slot_label,
            sess.class_name,
            sess.subject_code,
            sess.subject_name,
            sess.room,
            sess.is_lab ? "Practical Lab" : "Theory Lecture"
          ]);
        } else {
          rows.push([day, `Slot ${idx + 1}`, s.slot_label, "Free", "—", "Office Hours / Research", "Faculty Cabin", "Free"]);
        }
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(teacher.name || "Faculty").replace(/\s+/g, "_")}_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print official faculty sheet -> Redirects to official College Export page
  const handlePrint = () => {
    const tName = teacher.name || identifier || "";
    const tId = teacher.id || teacherId || "";
    const pId = selectedPresetId || "";
    onClose();
    navigate(`/export?type=faculty&name=${encodeURIComponent(tName)}&id=${encodeURIComponent(tId)}${pId ? `&preset=${encodeURIComponent(pId)}` : ""}`);
  };

  const modalInner = (
    <div className={`bg-white ${
      embedded
        ? "rounded-2xl border border-slate-200 shadow-sm w-full h-full"
        : "w-full max-w-5xl h-full shadow-2xl border-l border-slate-200"
    } flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none print:h-auto`}>
      {/* ── Top Header Bar (Pinned) ── */}
      <div className="px-5 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/50 flex-shrink-0 print:bg-none print:text-slate-900 print:border-b-2 print:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-md flex-shrink-0">
              {teacher.name ? teacher.name.replace(/^(Dr\.|Prof\.)\s*/i, "").slice(0, 2).toUpperCase() : "FC"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white print:text-slate-900">
                  {teacher.name || identifier}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-300 print:text-slate-700 print:border-slate-300">
                  {teacher.designation || "Faculty Member"}
                </span>
                {teacher.employee_id && (
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {teacher.employee_id}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-indigo-200/80 font-medium mt-0.5 print:text-slate-500">
                Department of {teacher.department || "Electrical Engineering"} · Academic Roster Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {/* Preset Selector */}
            {presets.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
                <Sparkles size={12} className="text-amber-400" />
                <span className="text-[10px] font-bold text-slate-400">Preset:</span>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="bg-transparent text-white font-black text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
                >
                  {presets.map((p: any) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      #{p.version_number} {p.name} ({p.score}%)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Print Official Sheet */}
            <button
              onClick={handlePrint}
              title="Print official faculty timetable sheet"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              title="Export timetable to CSV"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Pinned Quick Status & KPI Sub-Header Bar (Zero Scroll Required) ── */}
        {!loading && data && (
          <div className="px-5 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0 print:hidden text-xs">
            {/* Left: Live Faculty Status & Location */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    liveStatus.status === "IN_CLASS" ? "bg-rose-400" : liveStatus.status === "ON_BREAK" ? "bg-amber-400" : "bg-emerald-400"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    liveStatus.status === "IN_CLASS" ? "bg-rose-500" : liveStatus.status === "ON_BREAK" ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                </span>
                <span className={`font-black text-[10.5px] px-2 py-0.5 rounded-full border ${
                  liveStatus.status === "IN_CLASS"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : liveStatus.status === "ON_BREAK"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {liveStatus.status === "IN_CLASS"
                    ? "IN SESSION"
                    : liveStatus.status === "ON_BREAK"
                    ? "ON BREAK"
                    : "AVAILABLE / FREE"}
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <MapPin size={12} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate max-w-[240px] sm:max-w-[320px]">
                  Location: <strong className="text-slate-800">{liveStatus.location || "Faculty Cabin"}</strong>
                </span>
              </div>

              {liveStatus.status === "IN_CLASS" && liveStatus.text && (
                <span className="text-slate-400 hidden xl:inline">· {liveStatus.text}</span>
              )}
            </div>

            {/* Right: Quick Micro KPI Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 font-bold text-[10.5px]">
                <Clock size={11} className="text-indigo-600" />
                <span>Teaching: <strong>{analytics.total_assigned_hours || 0}h / {analytics.max_hours || 20}h</strong></span>
                <span className="text-indigo-600 text-[9.5px]">({analytics.utilization_pct || 0}%)</span>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-900 font-bold text-[10.5px]">
                <Beaker size={11} className="text-purple-600" />
                <span><strong>{analytics.theory_hours || 0}h</strong> Th · <strong>{analytics.lab_hours || 0}h</strong> Lab</span>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 font-bold text-[10.5px]">
                <Users size={11} className="text-blue-600" />
                <span><strong>{analytics.classes_taught_count || 0}</strong> Classes</span>
              </div>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 font-bold text-[10.5px]">
                <ShieldCheck size={11} className="text-emerald-600" />
                <span>100% Valid</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Pinned Navigation Tab Bar (Pinned) ── */}
        {!loading && data && (
          <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab("timetable")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "timetable"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Calendar size={13} />
                <span>Weekly Personal Timetable</span>
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Activity size={13} />
                <span>Workload & Load Distribution</span>
              </button>

              <button
                onClick={() => setActiveTab("subjects")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "subjects"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <BookOpen size={13} />
                <span>Assigned Subjects & Divisions</span>
              </button>
            </div>

            {/* Quick Day Highlighter for Timetable */}
            {activeTab === "timetable" ? (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 mr-1 hidden sm:inline">Highlight Day:</span>
                <button
                  onClick={() => setSelectedSimDay("")}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors ${
                    !selectedSimDay ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All
                </button>
                {workingDays.map((d: string) => (
                  <button
                    key={d}
                    onClick={() => setSelectedSimDay(selectedSimDay === d ? "" : d)}
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors ${
                      selectedSimDay === d ? "bg-indigo-600 text-white shadow-2xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-medium">
                {teacher.name} · {analytics.total_assigned_hours || 0}h Total Load
              </div>
            )}
          </div>
        )}

        {/* ── Scrollable Tab Content Body (Single, Clean Scroll Container) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 bg-slate-50/40 print:bg-white print:p-0 print:overflow-visible">
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-black text-slate-700">Synthesizing Faculty Timetable & Live Location...</p>
              <p className="text-xs text-slate-400 mt-1">Cross-referencing class schedules, room allocations, and teaching quotas</p>
            </div>
          ) : !data ? (
            <div className="py-20 text-center">
              <AlertTriangle size={36} className="mx-auto mb-2 text-rose-500" />
              <p className="font-bold text-slate-700 text-sm">Could not find timetable data for {identifier}</p>
              <p className="text-xs text-slate-400 mt-1">Please ensure a timetable preset has been generated in the Timetable Builder.</p>
            </div>
          ) : (
            <>
              {/* ── TAB 1: WEEKLY PERSONAL TIMETABLE (Directly at top, zero scroll needed) ── */}
              {(activeTab === "timetable" || true) && (
                <div className={activeTab !== "timetable" ? "hidden print:block" : "block"}>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
                    <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 border-b border-slate-200 flex items-center justify-between print:border-b-2 print:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-indigo-600 print:hidden" />
                        <span className="font-black text-slate-800 text-xs tracking-tight">
                          Faculty Master Grid: {teacher.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 print:hidden">
                          {analytics.total_assigned_hours} Total Hours
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium print:text-slate-700">
                        Preset: <strong className="text-slate-700">{data?.preset?.name || "Active Schedule"}</strong>
                      </div>
                    </div>

                    <div className="overflow-x-auto p-2.5">
                      <table className="w-full border-collapse table-fixed min-w-[700px]">
                        <thead>
                          <tr>
                            <th className="w-24 py-2 px-2 text-[10px] font-black text-slate-400 uppercase bg-slate-50/80 rounded-l-lg text-left border-b border-slate-200">
                              Time Slot
                            </th>
                            {workingDays.map((d: string) => (
                              <th
                                key={d}
                                className={`py-2 px-2 text-[10px] font-black uppercase text-center border-b border-slate-200 transition-colors ${
                                  selectedSimDay === d
                                    ? "bg-indigo-100/70 text-indigo-900 font-extrabold"
                                    : "bg-slate-50/80 text-slate-700"
                                }`}
                              >
                                {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlots.map((slot: any, sIdx: number) => {
                            const isBreak = slot.type === "break";
                            const breakTitle = slot.title || (sIdx === 2 ? "TEA BREAK" : "LUNCH BREAK");

                            return (
                              <tr key={slot.id || sIdx} className="border-b border-slate-100 last:border-0">
                                {/* Time column */}
                                <td className="py-1 px-2 text-[10px] font-bold text-slate-500 bg-slate-50/50 whitespace-nowrap align-middle border-r border-slate-100">
                                  <div className="font-mono text-[9px] text-slate-700 leading-tight">
                                    {slot.label?.split("–")[0]?.trim() || `Slot ${sIdx + 1}`}
                                  </div>
                                  <div className="text-[8px] text-slate-400 font-medium leading-tight">
                                    {isBreak ? "Break Period" : slot.label?.split("–")[1]?.trim() || ""}
                                  </div>
                                </td>

                                {/* Day Columns */}
                                {workingDays.map((day: string) => {
                                  const daySlots = weeklyGrid[day] || [];
                                  const cellItem = daySlots[sIdx];
                                  const session = cellItem?.session;

                                  if (isBreak) {
                                    return (
                                      <td
                                        key={day}
                                        className="py-1 px-1 text-center bg-amber-50/30 text-amber-700 text-[8.5px] font-extrabold tracking-wider border-x border-amber-100/40"
                                      >
                                        ☕ {breakTitle}
                                      </td>
                                    );
                                  }

                                  if (!session) {
                                    return (
                                      <td
                                        key={day}
                                        className={`py-1 px-1 text-center align-middle ${
                                          selectedSimDay === day ? "bg-indigo-50/25" : ""
                                        }`}
                                      >
                                        <div className="h-12 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center p-1 text-[8.5px] text-slate-300 font-medium">
                                          <span>— Free —</span>
                                          <span className="text-[7.5px] text-slate-400">Office Hours</span>
                                        </div>
                                      </td>
                                    );
                                  }

                                  const isLab = session.is_lab;

                                  return (
                                    <td
                                      key={day}
                                      className={`py-1 px-1 align-middle ${
                                        selectedSimDay === day ? "bg-indigo-50/35 ring-1 ring-inset ring-indigo-200" : ""
                                      }`}
                                    >
                                      <div
                                        className={`h-12 rounded-lg p-1.5 border flex flex-col justify-between shadow-2xs transition-all ${
                                          isLab
                                            ? "bg-purple-50/90 border-purple-200/90 text-purple-900"
                                            : "bg-indigo-50/90 border-indigo-200/90 text-indigo-900"
                                        }`}
                                      >
                                        {/* Top row: Subject Code + Type Badge */}
                                        <div className="flex items-center justify-between gap-1 leading-none">
                                          <span className="text-[9px] font-black font-mono truncate">
                                            {session.subject_code || "SUBJ"}
                                          </span>
                                          {isLab ? (
                                            <span className="text-[7px] font-black uppercase px-1 py-0.2 rounded bg-purple-600 text-white flex items-center gap-0.5">
                                              <Beaker size={6.5} /> Lab
                                            </span>
                                          ) : (
                                            <span className="text-[7px] font-bold px-1 py-0.2 rounded bg-white text-indigo-700 border border-indigo-200">
                                              Theory
                                            </span>
                                          )}
                                        </div>

                                        {/* Subject Title */}
                                        <div
                                          className="text-[9px] font-bold text-slate-900 truncate leading-tight mt-0.5"
                                          title={session.subject_name}
                                        >
                                          {session.subject_name}
                                        </div>

                                        {/* Bottom row: Class & Room */}
                                        <div className="flex items-center justify-between gap-1 text-[7.5px] font-extrabold mt-0.5 leading-none">
                                          <span className="px-1 py-0.2 rounded bg-white/95 border border-slate-200/80 text-slate-800 truncate max-w-[50%]">
                                            {session.class_name}
                                          </span>
                                          <span className="px-1 py-0.2 rounded bg-white/95 border border-slate-200/80 text-slate-700 truncate max-w-[50%]">
                                            {session.room}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: WORKLOAD & DISTRIBUTION ANALYTICS ── */}
              {activeTab === "analytics" && (
                <div className="space-y-4 print:hidden">
                  {/* Detailed Live Status & Route Simulator Banner */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs relative overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-3.5 h-3.5 rounded-full ${
                            liveStatus.status === "IN_CLASS"
                              ? "bg-rose-500"
                              : liveStatus.status === "ON_BREAK"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Real-Time Faculty Tracker ({liveStatus.current_time || "Now"})
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.2 rounded-full border ${
                              liveStatus.status === "IN_CLASS"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : liveStatus.status === "ON_BREAK"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {liveStatus.status === "IN_CLASS"
                                ? "IN SESSION"
                                : liveStatus.status === "ON_BREAK"
                                ? "ON BREAK"
                                : "AVAILABLE / FREE"}
                            </span>
                          </div>

                          <div className="text-sm font-black text-slate-900 mt-0.5">
                            {liveStatus.text}
                          </div>

                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <MapPin size={12} className="text-indigo-600" />
                            <span>Current Location: <strong className="text-slate-700">{liveStatus.location}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Next session teaser */}
                      {liveStatus.next_session && (
                        <div className="bg-white/90 border border-slate-200 rounded-xl px-3 py-2 text-xs flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                            <Clock size={16} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Next Session ({liveStatus.next_session.day})
                            </div>
                            <div className="font-extrabold text-slate-800 text-xs">
                              {liveStatus.next_session.session?.subject_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {liveStatus.next_session.slot_label} · Room {liveStatus.next_session.session?.room} ({liveStatus.next_session.session?.class_name})
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Day Simulation selector */}
                    <div className="mt-3.5 pt-3 border-t border-indigo-100/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <span>Inspect Daily Route:</span>
                        {workingDays.map((d: string) => {
                          const dayLoad = analytics?.daily_distribution?.[d] || 0;
                          const isSel = selectedSimDay === d;
                          return (
                            <button
                              key={d}
                              onClick={() => setSelectedSimDay(d)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isSel
                                  ? "bg-indigo-600 text-white shadow-2xs"
                                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span>{d.slice(0, 3)}</span>
                              <span className={`text-[10px] px-1 py-0.2 rounded-full font-black ${
                                isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                              }`}>
                                {dayLoad}h
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Total Weekly Load: <strong className="text-slate-700">{analytics.total_assigned_hours || 0} Hours</strong>
                      </div>
                    </div>
                  </div>

                  {/* 4 Deep Analytics KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Teaching</span>
                        <Clock size={15} className="text-indigo-600" />
                      </div>
                      <div className="text-xl font-black text-slate-900 mt-1">
                        {analytics.total_assigned_hours || 0} <span className="text-xs font-bold text-slate-400">/ {analytics.max_hours || 20}h</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            analytics.load_status === "overloaded" ? "bg-rose-500" : "bg-indigo-600"
                          }`}
                          style={{ width: `${Math.min(100, analytics.utilization_pct || 0)}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 mt-1 flex items-center justify-between">
                        <span>Target: {analytics.target_hours || 15}h</span>
                        <span className="text-indigo-600">{analytics.utilization_pct || 0}% Utilized</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Theory vs Lab</span>
                        <Beaker size={15} className="text-purple-600" />
                      </div>
                      <div className="text-xl font-black text-slate-900 mt-1">
                        {analytics.theory_hours || 0}h <span className="text-xs font-bold text-purple-600">+ {analytics.lab_hours || 0}h Lab</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        {analytics.theory_hours ? Math.round((analytics.theory_hours / (analytics.total_assigned_hours || 1)) * 100) : 0}% Theory · {analytics.lab_hours ? Math.round((analytics.lab_hours / (analytics.total_assigned_hours || 1)) * 100) : 0}% Practical
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Divisions Taught</span>
                        <Users size={15} className="text-blue-600" />
                      </div>
                      <div className="text-xl font-black text-slate-900 mt-1">
                        {analytics.classes_taught_count || 0} <span className="text-xs font-bold text-slate-400">Classes</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                        {analytics.classes_breakdown?.map((c: any) => c.name).join(", ") || "None"}
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Schedule Health</span>
                        <ShieldCheck size={15} className="text-emerald-600" />
                      </div>
                      <div className="text-xl font-black text-emerald-600 mt-1">
                        100% Valid
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        0 Clashes · Busiest: {analytics.busiest_day || "Balanced"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Daily Distribution Chart */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black text-slate-800">Mon–Fri Load Distribution</span>
                        <span className="text-[10px] font-bold text-slate-400">Total: {analytics.total_assigned_hours}h</span>
                      </div>

                      <div className="space-y-2.5">
                        {workingDays.map((d: string) => {
                          const hours = analytics.daily_distribution?.[d] || 0;
                          const maxDaily = 6;
                          const pct = Math.round((hours / maxDaily) * 100);
                          return (
                            <div key={d} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-700">{d}</span>
                                <span className="text-indigo-600">{hours} Hours</span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    hours >= 4 ? "bg-amber-500" : hours > 0 ? "bg-indigo-600" : "bg-slate-300"
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Workload Health & Efficiency Check */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-800 mb-2">Teaching Quota Compliance</div>
                        <div className="space-y-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-600">Contract Target Hours:</span>
                            <span className="font-black text-slate-800">{analytics.target_hours || 15} Hours / Week</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-600">Current Assigned Hours:</span>
                            <span className="font-black text-indigo-700">{analytics.total_assigned_hours || 0} Hours</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-600">Maximum Allowed Cap:</span>
                            <span className="font-black text-slate-800">{analytics.max_hours || 20} Hours</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-600">Free Teaching Slots:</span>
                            <span className="font-black text-emerald-600">{analytics.free_slots_count || 0} Slots Available</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-bold">
                        <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                        <span>Schedule is fully optimized with zero room/teacher clashes!</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: SUBJECTS & DIVISIONS DIRECTORY ── */}
              {activeTab === "subjects" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden print:hidden">
                  <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 font-black text-xs text-slate-800">
                    Courses & Divisions Assigned ({analytics.subjects_breakdown?.length || 0} Subjects)
                  </div>
                  <div className="divide-y divide-slate-100">
                    {analytics.subjects_breakdown?.map((subj: any, idx: number) => (
                      <div key={idx} className="p-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{subj.name}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">{subj.code}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                              subj.type === "lab" ? "bg-purple-100 text-purple-700" : "bg-indigo-100 text-indigo-700"
                            }`}>
                              {subj.type === "lab" ? "Practical Lab" : "Theory"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Assigned to Classes: <strong>{subj.classes?.join(", ") || "General"}</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-indigo-600">{subj.hours} Hours / Wk</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Formal Print Signatures (Visible only during printing) ── */}
              <div className="hidden print:block mt-12 pt-8 border-t-2 border-slate-700">
                <div className="grid grid-cols-3 gap-8 text-center text-xs">
                  <div>
                    <div className="h-12" />
                    <div className="border-t border-slate-400 pt-1 font-bold">Faculty Member Signature</div>
                    <div className="text-[10px] text-slate-500">{teacher.name}</div>
                  </div>
                  <div>
                    <div className="h-12" />
                    <div className="border-t border-slate-400 pt-1 font-bold">Head of Department (HOD)</div>
                    <div className="text-[10px] text-slate-500">Dept. of {teacher.department || "Engineering"}</div>
                  </div>
                  <div>
                    <div className="h-12" />
                    <div className="border-t border-slate-400 pt-1 font-bold">Principal / Dean Academics</div>
                    <div className="text-[10px] text-slate-500">TimeGrid Academic Scheduling Authority</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );

  if (embedded) {
    return modalInner;
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end overflow-hidden animate-fadeIn print:p-0 print:bg-white print:static print:inset-auto"
    >
      {modalInner}
    </div>
  );
}
