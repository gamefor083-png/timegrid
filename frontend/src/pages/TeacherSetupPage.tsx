import React, { useState, useEffect } from "react";
import {
  Users, Plus, Trash2, Edit3, X, CheckCircle2, Search,
  Clock, BookOpen, Beaker, Save, ChevronDown, ChevronUp,
  AlertTriangle, Calendar, Check, Copy, ArrowUpDown, Filter, ShieldAlert,
  Activity, Sparkles
} from "lucide-react";
import { ApiService } from "@/services/api";
import FacultyAnalysisModal from "@/components/FacultyAnalysisModal";

interface Teacher {
  id: string;
  name: string;
  employee_id: string;
  email?: string;
  designation: string;
  department_id?: string;
  target_weekly_hours: number;
  max_weekly_hours: number;
  assigned_theory_hours: number;
  assigned_lab_hours: number;
  availability?: Record<string, number[]>; // { "Monday": [0, 1, 2], ... }
}

const DESIGNATIONS = [
  "Professor", "Associate Professor", "Assistant Professor",
  "Lecturer", "Visiting Faculty", "Lab Instructor"
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS = ["08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00"];

export default function TeacherSetupPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [designationFilter, setDesignationFilter] = useState("ALL");
  const [loadStatusFilter, setLoadStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"load_desc" | "load_asc" | "name">("load_desc");

  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingLoadId, setSavingLoadId] = useState<string | null>(null);
  const [localLoads, setLocalLoads] = useState<Record<string, { theory: number; lab: number }>>({});
  const [analysisTeacher, setAnalysisTeacher] = useState<Teacher | null>(null);

  // Availability Modal
  const [availTeacher, setAvailTeacher] = useState<Teacher | null>(null);
  const [localAvail, setLocalAvail] = useState<Record<string, number[]>>({});
  const [savingAvail, setSavingAvail] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    employee_id: "",
    email: "",
    designation: "Assistant Professor",
    target_weekly_hours: 15,
    max_weekly_hours: 20,
    assigned_theory_hours: 0,
    assigned_lab_hours: 0,
  });

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getTeachers();
      setTeachers(data || []);
      const loads: Record<string, { theory: number; lab: number }> = {};
      (data || []).forEach((t: Teacher) => {
        loads[t.id] = {
          theory: t.assigned_theory_hours || 0,
          lab: t.assigned_lab_hours || 0,
        };
      });
      setLocalLoads(loads);
    } catch (err) {
      console.error("Failed to fetch teachers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: "",
      employee_id: "",
      email: "",
      designation: "Assistant Professor",
      target_weekly_hours: 15,
      max_weekly_hours: 20,
      assigned_theory_hours: 0,
      assigned_lab_hours: 0
    });
    setShowModal(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      name: t.name,
      employee_id: t.employee_id || "",
      email: t.email || "",
      designation: t.designation || "Assistant Professor",
      target_weekly_hours: t.target_weekly_hours || 15,
      max_weekly_hours: t.max_weekly_hours || 20,
      assigned_theory_hours: t.assigned_theory_hours || 0,
      assigned_lab_hours: t.assigned_lab_hours || 0,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      if (editingTeacher) {
        await ApiService.updateTeacher(editingTeacher.id, formData);
        showToast("Faculty updated successfully");
      } else {
        await ApiService.createTeacher(formData);
        showToast("Faculty added successfully");
      }
      setShowModal(false);
      fetchTeachers();
    } catch (err) {
      console.error(err);
      showToast("Error saving faculty member");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete faculty member "${name}"?`)) return;
    try {
      await ApiService.deleteTeacher(id);
      showToast("Faculty member deleted");
      fetchTeachers();
    } catch (err) {
      showToast("Error deleting faculty");
    }
  };

  const handleSaveLoad = async (teacher: Teacher) => {
    const load = localLoads[teacher.id];
    if (!load) return;
    setSavingLoadId(teacher.id);
    try {
      await ApiService.updateTeacher(teacher.id, {
        assigned_theory_hours: load.theory,
        assigned_lab_hours: load.lab,
      });
      showToast(`Workload saved for ${teacher.name}`);
      fetchTeachers();
    } catch {
      showToast("Error saving workload");
    } finally {
      setSavingLoadId(null);
    }
  };

  // ── Availability Modal Handlers ──
  const handleOpenAvailability = (teacher: Teacher) => {
    setAvailTeacher(teacher);
    // Initialize availability map: if empty, default to all slots open
    const defaultAvail: Record<string, number[]> = {};
    DAYS.forEach(d => {
      defaultAvail[d] = teacher.availability?.[d] ?? [0, 1, 2, 3, 4, 5, 6, 7];
    });
    setLocalAvail(defaultAvail);
  };

  const toggleSlotAvail = (day: string, slotIdx: number) => {
    setLocalAvail(prev => {
      const current = prev[day] || [];
      const updated = current.includes(slotIdx)
        ? current.filter(x => x !== slotIdx)
        : [...current, slotIdx];
      return { ...prev, [day]: updated };
    });
  };

  const handleSaveAvailability = async () => {
    if (!availTeacher) return;
    setSavingAvail(true);
    try {
      await ApiService.updateTeacher(availTeacher.id, {
        availability: localAvail
      });
      showToast(`Availability saved for ${availTeacher.name}`);
      fetchTeachers();
      setAvailTeacher(null);
    } catch {
      showToast("Error saving availability");
    } finally {
      setSavingAvail(false);
    }
  };

  // Filter & Sort Logic
  const filtered = teachers.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.employee_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.designation || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDesignation =
      designationFilter === "ALL" || t.designation === designationFilter;

    const total = (t.assigned_theory_hours || 0) + (t.assigned_lab_hours || 0);
    const max = t.max_weekly_hours || 20;
    const target = t.target_weekly_hours || 15;

    let matchesLoad = true;
    if (loadStatusFilter === "OVERLOADED") matchesLoad = total > max;
    else if (loadStatusFilter === "BALANCED") matchesLoad = total >= target && total <= max;
    else if (loadStatusFilter === "UNDERLOADED") matchesLoad = total < target;

    return matchesSearch && matchesDesignation && matchesLoad;
  });

  const sorted = [...filtered].sort((a, b) => {
    const totalA = (a.assigned_theory_hours || 0) + (a.assigned_lab_hours || 0);
    const totalB = (b.assigned_theory_hours || 0) + (b.assigned_lab_hours || 0);
    if (sortBy === "load_desc") return totalB - totalA;
    if (sortBy === "load_asc") return totalA - totalB;
    return a.name.localeCompare(b.name);
  });

  const totalTheoryHours = teachers.reduce((a, t) => a + (t.assigned_theory_hours || 0), 0);
  const totalLabHours = teachers.reduce((a, t) => a + (t.assigned_lab_hours || 0), 0);
  const overloadedCount = teachers.filter(t => (t.assigned_theory_hours + t.assigned_lab_hours) > (t.max_weekly_hours || 20)).length;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slideUp">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <Users size={16} />
            <span>Academic Resources</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Faculty & Teaching Loads</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage faculty roster, weekly teaching quotas, and availability schedules.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* ── Split Master-Detail View when a Faculty is Selected for Analysis ── */}
      {analysisTeacher && (
        <div className="flex flex-col lg:flex-row gap-4 items-start animate-fadeIn">
          {/* ── LEFT SIDE: Faculty Names List ── */}
          <div className="w-full lg:w-[350px] xl:w-[380px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-140px)] max-h-[860px] overflow-hidden sticky top-20">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/40 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <span className="font-black text-slate-800 text-xs">Faculty Roster</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {sorted.length}
                </span>
              </div>
              <button
                onClick={() => setAnalysisTeacher(null)}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Return to full table view"
              >
                <span>✕ Close Split</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="p-2.5 border-b border-slate-100 bg-white flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter faculty name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Scrollable Faculty Name List */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {sorted.map(t => {
                const isSelected = analysisTeacher.id === t.id;
                const load = localLoads[t.id] || { theory: 0, lab: 0 };
                const totalLoad = load.theory + load.lab;
                const maxHours = t.max_weekly_hours || 20;
                const isOverloaded = totalLoad > maxHours;

                return (
                  <button
                    key={t.id}
                    onClick={() => setAnalysisTeacher(t)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-400/40"
                        : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    }`}>
                      {t.name ? t.name.replace(/^(Dr\.|Prof\.)\s*/i, "").slice(0, 2).toUpperCase() : "FC"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-black truncate ${isSelected ? "text-indigo-950 font-black" : "text-slate-900"}`}>
                          {t.name}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Active View" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                        <span className="truncate max-w-[140px]">{t.designation}</span>
                        <span className={`font-bold ${isOverloaded ? "text-rose-600 font-black" : "text-slate-600"}`}>
                          {totalLoad}/{maxHours}h
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Schedule & Deep Analysis (Embedded) ── */}
          <div className="flex-1 min-w-0 w-full h-[calc(100vh-140px)] max-h-[860px] sticky top-20">
            <FacultyAnalysisModal
              embedded={true}
              isOpen={true}
              onClose={() => setAnalysisTeacher(null)}
              teacherId={analysisTeacher.id}
              teacherName={analysisTeacher.name}
            />
          </div>
        </div>
      )}

      {/* ── Full Roster View (Hidden when Split Analysis is Open) ── */}
      {!analysisTeacher && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Faculty", value: teachers.length, color: "indigo", icon: Users, sub: "Registered Staff" },
          { label: "Theory Contact Hrs", value: `${totalTheoryHours}h/wk`, color: "blue", icon: BookOpen, sub: "Weekly Lectures" },
          { label: "Practical Lab Hrs", value: `${totalLabHours}h/wk`, color: "purple", icon: Beaker, sub: "Weekly Labs" },
          { label: "Overloaded Faculty", value: overloadedCount, color: overloadedCount > 0 ? "rose" : "emerald", icon: overloadedCount > 0 ? AlertTriangle : CheckCircle2, sub: overloadedCount > 0 ? "Exceeding max capacity" : "All within safe limit" },
        ].map((s, i) => {
          const Icon = s.icon;
          const colorMap: any = {
            indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
            blue: "bg-blue-50 text-blue-600 border-blue-200",
            purple: "bg-purple-50 text-purple-700 border-purple-200",
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
            rose: "bg-rose-50 text-rose-600 border-rose-200"
          };
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${colorMap[s.color]}`}>
                <Icon size={18} />
              </div>
              <div className="text-2xl font-black text-slate-900">{s.value}</div>
              <div className="text-xs font-bold text-slate-700 mt-0.5">{s.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, employee ID, or designation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sort & Load Filter Dropdowns */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <Filter size={13} className="text-slate-400" />
              <span>Status:</span>
              <select
                value={loadStatusFilter}
                onChange={e => setLoadStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none"
              >
                <option value="ALL">All Loads</option>
                <option value="BALANCED">Balanced (Optimal)</option>
                <option value="OVERLOADED">Overloaded (&gt; Max)</option>
                <option value="UNDERLOADED">Underloaded (&lt; Target)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <ArrowUpDown size={13} className="text-slate-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none"
              >
                <option value="load_desc">Highest Load First</option>
                <option value="load_asc">Lowest Load First</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Designation Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Designation:</span>
          {["ALL", ...DESIGNATIONS].map(des => (
            <button
              key={des}
              onClick={() => setDesignationFilter(des)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                designationFilter === des
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {des === "ALL" ? "All Faculty" : des}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty Table with Expandable Load Row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-sm text-slate-400 font-bold">Loading faculty roster...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No faculty members found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters or click "Add Faculty Member".</p>
          </div>
        ) : (
          <div>
            {sorted.map(t => {
              const load = localLoads[t.id] || { theory: 0, lab: 0 };
              const totalLoad = load.theory + load.lab;
              const maxHours = t.max_weekly_hours || 20;
              const targetHours = t.target_weekly_hours || 15;
              const isOverloaded = totalLoad > maxHours;
              const isOptimal = totalLoad >= targetHours && totalLoad <= maxHours;
              const isUnderloaded = totalLoad < targetHours;

              const isExpanded = expandedId === t.id;

              return (
                <div key={t.id} className="border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-indigo-50/30 transition-colors group">
                    {/* Avatar Initials - Clickable to open Deep Analysis */}
                    <button
                      onClick={() => setAnalysisTeacher(t)}
                      title={`Open personal schedule & deep analysis for ${t.name}`}
                      className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 group-hover:border-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="text-xs font-black text-indigo-700 group-hover:text-white">{t.name.slice(0, 2).toUpperCase()}</span>
                    </button>

                    {/* Faculty Identity - Clickable */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAnalysisTeacher(t)}
                          className="font-bold text-slate-900 text-sm truncate hover:text-indigo-600 transition-colors text-left cursor-pointer"
                        >
                          {t.name}
                        </button>
                        {isOverloaded && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle size={10} /> Overloaded (+{totalLoad - maxHours}h)
                          </span>
                        )}
                        {isOptimal && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Optimal
                          </span>
                        )}
                        {isUnderloaded && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            Underloaded
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{t.designation}</span>
                        {t.employee_id && <span>· ID: {t.employee_id}</span>}
                        {t.email && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(t.email || "");
                              showToast(`Copied ${t.email}`);
                            }}
                            title="Copy email"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                          >
                            <Copy size={10} /> {t.email}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Load Summary Badges */}
                    <div className="hidden md:flex items-center gap-2">
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold">
                        <BookOpen size={11} />
                        <span>{load.theory}h Theory</span>
                      </span>
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold">
                        <Beaker size={11} />
                        <span>{load.lab}h Lab</span>
                      </span>
                      <span className={`px-2.5 py-1 border rounded-lg text-[11px] font-black ${
                        isOverloaded
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {totalLoad} / {maxHours}h
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Deep Analysis & Personal Timetable Button */}
                      <button
                        onClick={() => setAnalysisTeacher(t)}
                        title="View Live Location, Personal Weekly Timetable & Deep Analysis"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-2xs transition-all cursor-pointer hover:shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Activity size={13} className="text-amber-300" />
                        <span>Schedule & Analysis</span>
                      </button>

                      <button
                        onClick={() => handleOpenAvailability(t)}
                        title="Configure Availability Matrix"
                        className="flex items-center gap-1 px-2.5 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        <Calendar size={13} />
                        <span>Availability</span>
                      </button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isExpanded ? "bg-slate-200 text-slate-800 border-slate-300" : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        <Clock size={13} />
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Load Adjustment Drawer */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-6">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                            Theory Hours / Wk
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={load.theory}
                            onChange={e => setLocalLoads(prev => ({
                              ...prev,
                              [t.id]: { ...load, theory: parseInt(e.target.value) || 0 }
                            }))}
                            className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                            Lab Hours / Wk
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={load.lab}
                            onChange={e => setLocalLoads(prev => ({
                              ...prev,
                              [t.id]: { ...load, lab: parseInt(e.target.value) || 0 }
                            }))}
                            className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Total Load Progress
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-700">{totalLoad}h / {maxHours}h max</span>
                            <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOverloaded ? "bg-rose-500" : isOptimal ? "bg-emerald-500" : "bg-indigo-500"
                                }`}
                                style={{ width: `${Math.min(100, (totalLoad / maxHours) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSaveLoad(t)}
                        disabled={savingLoadId === t.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-60"
                      >
                        {savingLoadId === t.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save size={13} />
                        )}
                        <span>Save Workload</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* Add / Edit Faculty Slide-Over Right Drawer */}
      {showModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex justify-end overflow-hidden animate-fadeIn"
        >
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-slideInRight">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingTeacher ? `Edit Faculty: ${editingTeacher.name}` : "Add New Faculty Member"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Profile credentials and teaching workload targets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Employee ID</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-104"
                      value={formData.employee_id}
                      onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Designation</label>
                    <select
                      value={formData.designation}
                      onChange={e => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    >
                      {DESIGNATIONS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. rajesh.sharma@college.edu"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Hours / Wk</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.target_weekly_hours}
                      onChange={e => setFormData({ ...formData, target_weekly_hours: parseInt(e.target.value) || 15 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Max Ceiling Hours / Wk</label>
                    <input
                      type="number"
                      min="1"
                      max="35"
                      value={formData.max_weekly_hours}
                      onChange={e => setFormData({ ...formData, max_weekly_hours: parseInt(e.target.value) || 20 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {editingTeacher ? "Update Faculty" : "Add Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Faculty Availability Matrix Slide-Over Right Drawer ── */}
      {availTeacher && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setAvailTeacher(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex justify-end overflow-hidden animate-fadeIn"
        >
          <div className="bg-white w-full max-w-2xl lg:max-w-3xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-slideInRight">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                  Weekly Constraint Matrix
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Availability Schedule: {availTeacher.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAvailTeacher(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Click cells to toggle between <strong>Available (Green)</strong> and <strong>Blocked / Off-duty (Gray)</strong>. Blocked slots will prevent this professor from being scheduled.
              </p>

              {/* Matrix Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black text-[10px] uppercase">
                      <th className="py-2 px-3 border-r border-slate-200 w-24">Day</th>
                      {SLOTS.map((s, idx) => (
                        <th key={idx} className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                          {s.split(" - ")[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => {
                      const availableSlots = localAvail[day] || [];
                      return (
                        <tr key={day} className="border-b border-slate-100">
                          <td className="py-2.5 px-3 font-extrabold text-slate-800 bg-slate-50/40 border-r border-slate-200 text-xs">
                            {day}
                          </td>
                          {SLOTS.map((_, sIdx) => {
                            const isAvail = availableSlots.includes(sIdx);
                            return (
                              <td key={sIdx} className="py-1 px-1 border-r border-slate-100 last:border-r-0 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSlotAvail(day, sIdx)}
                                  className={`w-full py-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                                    isAvail
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                                      : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200"
                                  }`}
                                >
                                  {isAvail ? "✓ Free" : "Blocked"}
                                </button>
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

            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allOpen: Record<string, number[]> = {};
                    DAYS.forEach(d => { allOpen[d] = [0, 1, 2, 3, 4, 5, 6, 7]; });
                    setLocalAvail(allOpen);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Mark All Free
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvailTeacher(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvailability}
                  disabled={savingAvail}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  {savingAvail ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  <span>Save Availability</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
