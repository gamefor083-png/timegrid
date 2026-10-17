import React, { useState, useEffect } from "react";
import {
  GraduationCap, Plus, Search, Trash2, Edit3, CheckCircle2, X,
  Users, Layers, Building2, Calendar, ArrowRight, Sparkles, Filter, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ApiService } from "@/services/api";

interface DivisionItem {
  id: string;
  name: string;
  branch?: string;
  student_capacity: number;
  semester_id?: string;
  total_theory_hours?: number;
  total_practical_hours?: number;
  sda_hours?: number;
  prj_hours?: number;
  total_weekly_load?: number;
  organization_id?: string;
  created_at?: string;
}

const BRANCHES = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Chemical Engineering",
  "Automobile Engineering",
  "Other",
];

const EMPTY_FORM = {
  name: "",
  branch: "Computer Engineering",
  student_capacity: 60,
  semester_id: "",
  total_theory_hours: 13,
  total_practical_hours: 8,
  sda_hours: 5,
  prj_hours: 4,
};

export default function DivisionsPage() {
  const navigate = useNavigate();
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingDivision, setEditingDivision] = useState<DivisionItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // Batch create form
  const [batchData, setBatchData] = useState({
    semester_id: "",
    branch: "Computer Engineering",
    count: 3,
    capacity: 60,
    total_theory_hours: 13,
    total_practical_hours: 8,
    sda_hours: 5,
    prj_hours: 4,
  });
  const [creatingBatch, setCreatingBatch] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [divData, semData] = await Promise.all([
        ApiService.getClassGroups(),
        ApiService.getSemesters(),
      ]);
      setDivisions(divData || []);
      setSemesters(semData || []);
    } catch (err) {
      console.error("Failed to load divisions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenAdd = () => {
    setEditingDivision(null);
    setFormData({ ...EMPTY_FORM, semester_id: "" });
    setShowAddModal(true);
  };

  const handleOpenEdit = (div: DivisionItem) => {
    setEditingDivision(div);
    setFormData({
      name: div.name,
      branch: div.branch || "Computer Engineering",
      student_capacity: div.student_capacity || 60,
      semester_id: div.semester_id || "",
      total_theory_hours: div.total_theory_hours ?? 13,
      total_practical_hours: div.total_practical_hours ?? 8,
      sda_hours: div.sda_hours ?? 5,
      prj_hours: div.prj_hours ?? 4,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    try {
      const totalLoad = (formData.total_theory_hours || 0) + (formData.total_practical_hours || 0) + (formData.sda_hours || 0) + (formData.prj_hours || 0);
      const payload = {
        ...formData,
        total_weekly_load: totalLoad,
      };
      if (editingDivision) {
        await ApiService.updateClassGroup(editingDivision.id, payload);
        showToast("Division updated successfully");
      } else {
        await ApiService.createClassGroup(payload);
        showToast("Division created successfully");
      }
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Error saving division");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete division "${name}"?`)) return;
    try {
      await ApiService.deleteClassGroup(id);
      showToast(`Division "${name}" deleted`);
      setDivisions(prev => prev.filter(d => d.id !== id));
    } catch {
      showToast("Error deleting division");
    }
  };

  // Batch Generation Wizard
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingBatch(true);
    try {
      const semObj = semesters.find(s => s.id === batchData.semester_id) || semesters[0];
      const semNum = semObj?.number || 5;

      // Abbreviate branch
      const branchAbbrMap: Record<string, string> = {
        "Computer Engineering": "CO",
        "Information Technology": "IT",
        "Electronics & Communication": "EC",
        "Mechanical Engineering": "ME",
        "Civil Engineering": "CI",
        "Electrical Engineering": "EE",
        "Chemical Engineering": "CH",
        "Automobile Engineering": "AU",
      };
      const abbr = branchAbbrMap[batchData.branch] || "ENG";
      const divLetters = ["A", "B", "C", "D", "E", "F"];

      const batchTotalLoad = (batchData.total_theory_hours || 0) + (batchData.total_practical_hours || 0) + (batchData.sda_hours || 0) + (batchData.prj_hours || 0);

      for (let i = 0; i < Math.min(batchData.count, 6); i++) {
        const divName = `${semNum}${abbr}-${divLetters[i]}`;
        await ApiService.createClassGroup({
          name: divName,
          branch: batchData.branch,
          student_capacity: batchData.capacity,
          semester_id: batchData.semester_id || semesters[0]?.id || "",
          total_theory_hours: batchData.total_theory_hours,
          total_practical_hours: batchData.total_practical_hours,
          sda_hours: batchData.sda_hours,
          prj_hours: batchData.prj_hours,
          total_weekly_load: batchTotalLoad,
        });
      }
      showToast(`Successfully created ${batchData.count} divisions`);
      setShowBatchModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Error creating batch divisions");
    } finally {
      setCreatingBatch(false);
    }
  };

  // Filtered Divisions
  const filtered = divisions.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.branch || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBranch =
      branchFilter === "ALL" || (d.branch || "Other") === branchFilter;

    const matchesSemester =
      semesterFilter === "ALL" || d.semester_id === semesterFilter;

    return matchesSearch && matchesBranch && matchesSemester;
  });

  // Group by branch
  const byBranch: Record<string, DivisionItem[]> = {};
  filtered.forEach(d => {
    const key = d.branch || "Other";
    if (!byBranch[key]) byBranch[key] = [];
    byBranch[key].push(d);
  });

  const branchColors = [
    "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#ea580c",
  ];
  const branchColorMap: Record<string, string> = {};
  Object.keys(byBranch).forEach((b, i) => { branchColorMap[b] = branchColors[i % branchColors.length]; });

  const semesterMap: Record<string, string> = {};
  semesters.forEach(s => { semesterMap[s.id] = s.name; });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
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
            <GraduationCap size={16} />
            <span>Academic Structure</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Divisions & Class Groups</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage student class divisions grouped by engineering disciplines.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setBatchData({
                semester_id: semesters[0]?.id || "",
                branch: "Computer Engineering",
                count: 3,
                capacity: 60,
              });
              setShowBatchModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Sparkles size={14} className="text-indigo-600" />
            <span>Batch Create (A, B, C)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Single Division</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search divisions (e.g. 5CO-A, IT, Mech)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Semester:</span>
            <select
              value={semesterFilter}
              onChange={e => setSemesterFilter(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Semesters</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.academic_year || "2026-27"})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Branch Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Discipline:</span>
          {["ALL", ...BRANCHES].map(b => (
            <button
              key={b}
              onClick={() => setBranchFilter(b)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                branchFilter === b
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {b === "ALL" ? "All Disciplines" : b.replace(" Engineering", "")}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Grouped by Branch */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-sm text-slate-400 font-bold">Loading divisions...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <GraduationCap size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-bold text-slate-700 text-sm">No divisions found</p>
          <p className="text-xs text-slate-400 mt-1">Add divisions manually or use "Batch Create" to generate divisions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byBranch).map(([branch, divs]) => {
            const color = branchColorMap[branch] || "#4f46e5";
            return (
              <div key={branch} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Branch Header */}
                <div
                  className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100"
                  style={{ background: `${color}08` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="font-black text-slate-900 text-sm">{branch}</span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: `${color}18`, color }}
                    >
                      {divs.length} {divs.length === 1 ? "Division" : "Divisions"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400">
                    Total Strength: {divs.reduce((a, d) => a + (d.student_capacity || 60), 0)} students
                  </div>
                </div>

                {/* Division Cards Grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {divs.map(div => {
                    const semName = div.semester_id ? semesterMap[div.semester_id] : null;
                    return (
                      <div
                        key={div.id}
                        className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all group relative bg-white flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span
                              className="font-black text-base tracking-tight"
                              style={{ color }}
                            >
                              {div.name}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEdit(div)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(div.id, div.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-slate-500 font-medium">
                            {semName && (
                              <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                                <Layers size={11} className="text-slate-400" />
                                <span>{semName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Users size={11} className="text-slate-400" />
                              <span>{div.student_capacity || 60} Students Capacity</span>
                            </div>

                            {/* Academic Workload Target */}
                            <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-slate-600">
                              <Clock size={11} className="text-indigo-500" />
                              <span>{(div.total_theory_hours ?? 13) + (div.total_practical_hours ?? 8) + (div.sda_hours ?? 5) + (div.prj_hours ?? 4)}h/wk</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({div.total_theory_hours ?? 13}Th · {div.total_practical_hours ?? 8}Pr · {(div.sda_hours ?? 5) + (div.prj_hours ?? 4)}Act)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action link */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">Class Group</span>
                          <button
                            onClick={() => navigate(`/timetable?division=${encodeURIComponent(div.id)}`)}
                            className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <span>Open Canvas</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Division Slide-Over Right Drawer */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex justify-end overflow-hidden animate-fadeIn"
        >
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-slideInRight">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <GraduationCap size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingDivision ? `Edit Division: ${editingDivision.name}` : "Create New Division"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Class cohort definition and department assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Division Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5CO-A or 3IT-B"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Branch / Department</label>
                  <select
                    value={formData.branch}
                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                  >
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Academic Semester</label>
                    <select
                      value={formData.semester_id}
                      onChange={e => setFormData({ ...formData, semester_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-medium bg-slate-50 focus:bg-white transition-colors"
                    >
                      <option value="">-- No Semester --</option>
                      {semesters.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Student Capacity</label>
                    <input
                      type="number"
                      min="10"
                      max="150"
                      value={formData.student_capacity}
                      onChange={e => setFormData({ ...formData, student_capacity: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* ── Academic Workload Constraints (Theory, Practical, SDA, PRJ) ── */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      Academic Workload Constraints
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Total: {(formData.total_theory_hours || 0) + (formData.total_practical_hours || 0) + (formData.sda_hours || 0) + (formData.prj_hours || 0)} hrs/wk
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    Configure weekly hours quota for balanced syllabus coverage and timetable generation.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Theory Hours *</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={formData.total_theory_hours}
                        onChange={e => setFormData({ ...formData, total_theory_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 13 hrs (3-4 core theory)</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Practical Hours *</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={formData.total_practical_hours}
                        onChange={e => setFormData({ ...formData, total_practical_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 8 hrs (4 lab blocks x 2h)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        SDA Hours (Skill Development)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={formData.sda_hours}
                        onChange={e => setFormData({ ...formData, sda_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Skill Dev Activities (e.g. 5 hrs)</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        PRJ Hours (Project Work)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={formData.prj_hours}
                        onChange={e => setFormData({ ...formData, prj_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Project-2 Work (e.g. 4 hrs)</span>
                    </div>
                  </div>

                  {/* Formula Breakdown Card matching college sheet note */}
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 font-semibold flex items-center justify-between">
                    <span>Target Weekly Load:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      (Theory) {formData.total_theory_hours || 0}h + (Practical) {formData.total_practical_hours || 0}h + (SDA/PRJ) {(formData.sda_hours || 0) + (formData.prj_hours || 0)}h = {(formData.total_theory_hours || 0) + (formData.total_practical_hours || 0) + (formData.sda_hours || 0) + (formData.prj_hours || 0)}h
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-900/80 leading-relaxed">
                  💡 <strong>Tip:</strong> Theory, practical, SDA, and PRJ hours will be automatically respected by the auto-generation engine when creating timetable schedules.
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {editingDivision ? "Update Division" : "Create Division"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Create Wizard Slide-Over Right Drawer */}
      {showBatchModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBatchModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex justify-end overflow-hidden animate-fadeIn"
        >
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-slideInRight">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Batch Division Generator
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Generate parallel divisions in one step
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 leading-relaxed">
                  Quickly create multiple parallel divisions (e.g. <strong>5CO-A, 5CO-B, 5CO-C</strong>) with uniform capacity.
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Semester *</label>
                  <select
                    value={batchData.semester_id}
                    onChange={e => setBatchData({ ...batchData, semester_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                  >
                    {semesters.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.academic_year || "2026-27"})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Engineering Discipline</label>
                  <select
                    value={batchData.branch}
                    onChange={e => setBatchData({ ...batchData, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                  >
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Number of Divs</label>
                    <select
                      value={batchData.count}
                      onChange={e => setBatchData({ ...batchData, count: parseInt(e.target.value) || 3 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    >
                      <option value={2}>2 Divs (A, B)</option>
                      <option value={3}>3 Divs (A, B, C)</option>
                      <option value={4}>4 Divs (A, B, C, D)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Capacity / Div</label>
                    <input
                      type="number"
                      min="20"
                      max="120"
                      value={batchData.capacity}
                      onChange={e => setBatchData({ ...batchData, capacity: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* ── Academic Workload Constraints (Batch) ── */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      Uniform Workload Targets
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Total: {(batchData.total_theory_hours || 0) + (batchData.total_practical_hours || 0) + (batchData.sda_hours || 0) + (batchData.prj_hours || 0)} hrs/wk
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Theory Hours *</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={batchData.total_theory_hours}
                        onChange={e => setBatchData({ ...batchData, total_theory_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Practical Hours *</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={batchData.total_practical_hours}
                        onChange={e => setBatchData({ ...batchData, total_practical_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">SDA Hours</label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={batchData.sda_hours}
                        onChange={e => setBatchData({ ...batchData, sda_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">PRJ Hours</label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={batchData.prj_hours}
                        onChange={e => setBatchData({ ...batchData, prj_hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 font-semibold flex items-center justify-between">
                    <span>Target Weekly Load:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      (Theory) {batchData.total_theory_hours || 0}h + (Practical) {batchData.total_practical_hours || 0}h + (SDA/PRJ) {(batchData.sda_hours || 0) + (batchData.prj_hours || 0)}h = {(batchData.total_theory_hours || 0) + (batchData.total_practical_hours || 0) + (batchData.sda_hours || 0) + (batchData.prj_hours || 0)}h
                    </span>
                  </div>
                </div>

                {/* Preview pill */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-slate-400">Preview Generated Divisions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: batchData.count }).map((_, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const sem = semesters.find(s => s.id === batchData.semester_id);
                      const prefix = sem ? `${sem.name.replace(/[^0-9]/g, '') || '5'}` : '5';
                      const branchCode = batchData.branch.split(' ').map(w => w[0]).join('').slice(0, 2);
                      return (
                        <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono font-bold text-[11px] text-indigo-700">
                          {prefix}{branchCode}-{letter}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBatch}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60 transition-colors"
                >
                  {creatingBatch ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>Generate Divs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
