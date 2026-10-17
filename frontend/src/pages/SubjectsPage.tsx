import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Search, Trash2, Edit3, CheckCircle2, X, Beaker, FileText, Clock, Copy, Sparkles, Filter } from "lucide-react";
import { ApiService } from "@/services/api";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  credit_hours: number;
  subject_type: string;
  theory_hours_per_week: number;
  theory_session_duration: number;
  lab_hours_per_week: number;
  lab_session_duration: number;
  required_room_type?: string;
}

const EMPTY_FORM = {
  name: "",
  code: "",
  credit_hours: 3,
  subject_type: "THEORY",
  theory_hours_per_week: 3,
  theory_session_duration: 1,
  lab_hours_per_week: 0,
  lab_session_duration: 2,
  required_room_type: "CLASSROOM",
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getSubjects();
      setSubjects(data || []);
    } catch (err) {
      console.error("Failed to load subjects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setFormData({ ...EMPTY_FORM });
    setShowAddModal(true);
  };

  const handleOpenEdit = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      credit_hours: sub.credit_hours || 3,
      subject_type: sub.subject_type || "THEORY",
      theory_hours_per_week: sub.theory_hours_per_week ?? 3,
      theory_session_duration: sub.theory_session_duration ?? 1,
      lab_hours_per_week: sub.lab_hours_per_week ?? 0,
      lab_session_duration: sub.lab_session_duration ?? 2,
      required_room_type: sub.required_room_type || "CLASSROOM",
    });
    setShowAddModal(true);
  };

  const handleDuplicate = async (sub: SubjectItem) => {
    try {
      const copyPayload = {
        name: `${sub.name} (Copy)`,
        code: `${sub.code}-B`,
        credit_hours: sub.credit_hours,
        subject_type: sub.subject_type,
        theory_hours_per_week: sub.theory_hours_per_week,
        theory_session_duration: sub.theory_session_duration,
        lab_hours_per_week: sub.lab_hours_per_week,
        lab_session_duration: sub.lab_session_duration,
        required_room_type: sub.required_room_type,
      };
      await ApiService.createSubject(copyPayload);
      showToast(`Duplicated "${sub.name}"`);
      fetchSubjects();
    } catch {
      showToast("Error duplicating subject");
    }
  };

  const handleTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      subject_type: type,
      required_room_type: type === "PRACTICAL" ? "LAB" : "CLASSROOM",
      theory_hours_per_week: type === "PRACTICAL" ? 0 : (prev.theory_hours_per_week || 3),
      lab_hours_per_week: type === "THEORY" ? 0 : (prev.lab_hours_per_week || 2),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;
    const payload = {
      ...formData,
      name: formData.name.trim(),
      code: formData.code.trim(),
    };
    try {
      if (editingSubject) {
        await ApiService.updateSubject(editingSubject.id, payload);
        showToast("Subject updated successfully");
      } else {
        await ApiService.createSubject(payload);
        showToast("Subject created successfully");
      }
      setShowAddModal(false);
      fetchSubjects();
    } catch (err) {
      console.error(err);
      showToast("Error saving subject");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete subject "${name}"?`)) return;
    try {
      await ApiService.deleteSubject(id);
      showToast("Subject deleted");
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch {
      showToast("Error deleting subject");
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "ALL" || s.subject_type === typeFilter;
    return matchSearch && matchType;
  });

  const typeLabel: Record<string, string> = { THEORY: "Theory", PRACTICAL: "Lab", BOTH: "Theory + Lab" };
  const typeColor: Record<string, string> = {
    THEORY: "bg-blue-50 text-blue-700 border-blue-200",
    PRACTICAL: "bg-purple-50 text-purple-700 border-purple-200",
    BOTH: "bg-teal-50 text-teal-700 border-teal-200",
  };

  const totalWeeklyContactHours = subjects.reduce((a, s) => {
    const t = (s.theory_hours_per_week || 0) * (s.theory_session_duration || 1);
    const l = (s.lab_hours_per_week || 0) * (s.lab_session_duration || 2);
    return a + t + l;
  }, 0);

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
            <BookOpen size={16} />
            <span>Academic Curriculum</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Subjects & Course Catalog</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Configure theory lectures, lab sessions, durations, and room requirements.</p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
          <Plus size={16} />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Courses", value: subjects.length, color: "indigo", sub: "Catalog Size" },
          { label: "Theory Courses", value: subjects.filter(s => s.subject_type === "THEORY").length, color: "blue", sub: "Classroom Lectures" },
          { label: "Lab Courses", value: subjects.filter(s => s.subject_type === "PRACTICAL").length, color: "purple", sub: "Practical Sessions" },
          { label: "Contact Hours", value: `${totalWeeklyContactHours}h/wk`, color: "teal", sub: "Total Teaching Time" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-xs font-bold text-slate-700 mt-0.5">{s.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by subject name or code (e.g. CS501)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {[["ALL", "All Types"], ["THEORY", "Theory"], ["PRACTICAL", "Lab"], ["BOTH", "Theory + Lab"]].map(([v, l]) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === v ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Subject Name</th>
                <th className="py-3 px-3">Course Code</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Credits</th>
                <th className="py-3 px-3">Theory Hours</th>
                <th className="py-3 px-3">Lab Hours</th>
                <th className="py-3 px-3">Total Contact</th>
                <th className="py-3 px-3">Venue Type</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading subjects...
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    No subjects match your search.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map(sub => {
                  const theoryTotal = (sub.theory_hours_per_week || 0) * (sub.theory_session_duration || 1);
                  const labTotal = (sub.lab_hours_per_week || 0) * (sub.lab_session_duration || 2);
                  const totalHrs = theoryTotal + labTotal;

                  return (
                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sub.name}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        {sub.code}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${typeColor[sub.subject_type] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {typeLabel[sub.subject_type] || sub.subject_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">
                        {sub.credit_hours || 3}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {sub.theory_hours_per_week > 0 ? (
                          <span>{sub.theory_hours_per_week} sess × {sub.theory_session_duration || 1}h</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {sub.lab_hours_per_week > 0 ? (
                          <span>{sub.lab_hours_per_week} lab × {sub.lab_session_duration || 2}h</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {totalHrs}h / wk
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-bold">
                        {sub.required_room_type || "CLASSROOM"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDuplicate(sub)}
                            title="Duplicate Course"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(sub)}
                            title="Edit Subject"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id, sub.name)}
                            title="Delete Subject"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Slide-Over Right Drawer */}
      {showAddModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-2xs flex justify-end overflow-hidden animate-fadeIn"
        >
          <div className="bg-white w-full max-w-lg lg:max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-slideInRight">
            {/* Pinned Top Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookOpen size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingSubject ? `Edit Course: ${formData.name || editingSubject.name}` : "Add New Course"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Curriculum specifications, lecture & lab breakdown
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

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Subject Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operating Systems"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Course Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AI5012, CE5031"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Subject Format / Delivery</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "THEORY", label: "Theory Only", icon: BookOpen },
                      { id: "PRACTICAL", label: "Lab Only", icon: Beaker },
                      { id: "BOTH", label: "Theory + Lab", icon: Sparkles },
                    ].map(tab => {
                      const Icon = tab.icon;
                      const active = formData.subject_type === tab.id;
                      return (
                        <button
                          type="button"
                          key={tab.id}
                          onClick={() => handleTypeChange(tab.id)}
                          className={`p-2.5 rounded-xl border text-center font-bold transition-all flex flex-col items-center gap-1 ${
                            active
                              ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Icon size={16} />
                          <span className="text-[11px]">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Theory Hours Breakdown */}
                {formData.subject_type !== "PRACTICAL" && (
                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
                    <div className="text-[11px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={13} className="text-blue-600" />
                      <span>Theory Lecture Configuration</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-blue-800 block mb-1">Lectures / Week</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formData.theory_hours_per_week}
                          onChange={e => setFormData({ ...formData, theory_hours_per_week: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-blue-200 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-blue-800 block mb-1">Hours / Lecture</label>
                        <select
                          value={formData.theory_session_duration}
                          onChange={e => setFormData({ ...formData, theory_session_duration: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-blue-200 font-bold text-xs"
                        >
                          <option value={1}>1 hour</option>
                          <option value={2}>2 hours</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lab Hours Breakdown */}
                {formData.subject_type !== "THEORY" && (
                  <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-2">
                    <div className="text-[11px] font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Beaker size={13} className="text-purple-600" />
                      <span>Practical Lab Configuration</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-purple-800 block mb-1">Lab Sessions / Week</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={formData.lab_hours_per_week}
                          onChange={e => setFormData({ ...formData, lab_hours_per_week: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-purple-200 font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-purple-800 block mb-1">Hours / Lab Session</label>
                        <select
                          value={formData.lab_session_duration}
                          onChange={e => setFormData({ ...formData, lab_session_duration: parseInt(e.target.value) || 2 })}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-purple-200 font-bold text-xs"
                        >
                          <option value={2}>2 hours block</option>
                          <option value={3}>3 hours block</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Academic Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.credit_hours}
                      onChange={e => setFormData({ ...formData, credit_hours: parseInt(e.target.value) || 3 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Venue Requirement</label>
                    <select
                      value={formData.required_room_type}
                      onChange={e => setFormData({ ...formData, required_room_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-slate-50 focus:bg-white transition-colors"
                    >
                      <option value="CLASSROOM">Classroom</option>
                      <option value="LAB">Specialized Lab</option>
                      <option value="SEMINAR">Seminar Hall</option>
                    </select>
                  </div>
                </div>

                {/* Total contact hours summary */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Calculated Contact Hours</span>
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    {(formData.theory_hours_per_week || 0) + (formData.lab_hours_per_week || 0)} hrs / week
                  </span>
                </div>
              </div>

              {/* Pinned Bottom Actions */}
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
                  {editingSubject ? "Update Subject" : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
