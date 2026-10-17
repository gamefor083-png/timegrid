import React, { useState, useEffect } from 'react';
import { Layers, Plus, Calendar, Trash2, Edit3, CheckCircle2, X, Clock, ArrowRight } from 'lucide-react';
import { ApiService } from '@/services/api';

interface SemesterItem {
  id: string;
  name: string;
  number: number;
  term: string; // 'Odd' | 'Even' | 'Fall' | 'Spring'
  academic_year: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export default function SemestersPage() {
  const [semesters, setSemesters] = useState<SemesterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState<SemesterItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: 'Semester 1',
    number: 1,
    term: 'Odd',
    academic_year: '2026-2027',
    is_active: true
  });

  const fetchSemesters = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getSemesters();
      setSemesters(data || []);
    } catch (err) {
      console.error('Failed to load semesters', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenAdd = () => {
    setEditingSemester(null);
    const nextNum = (semesters.length > 0 ? Math.max(...semesters.map(s => s.number || 0)) + 1 : 1);
    setFormData({
      name: `Semester ${nextNum}`,
      number: nextNum,
      term: nextNum % 2 === 1 ? 'Odd' : 'Even',
      academic_year: '2026-2027',
      is_active: true
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (sem: SemesterItem) => {
    setEditingSemester(sem);
    setFormData({
      name: sem.name,
      number: sem.number || 1,
      term: sem.term || 'Odd',
      academic_year: sem.academic_year || '2026-2027',
      is_active: sem.is_active ?? true
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingSemester) {
        await ApiService.updateSemester(editingSemester.id, formData);
        showToast('Semester updated successfully');
      } else {
        await ApiService.createSemester(formData);
        showToast('Semester created successfully');
      }
      setShowAddModal(false);
      fetchSemesters();
    } catch (err) {
      console.error('Failed to save semester', err);
      showToast('Error saving semester');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this semester?')) return;
    try {
      await ApiService.deleteSemester(id);
      showToast('Semester deleted successfully');
      setSemesters(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete semester', err);
      showToast('Error deleting semester');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ── Toast ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-slideUp">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <Layers size={16} />
            <span>Academic Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Semesters & Terms
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure academic periods, semesters, and active instructional terms.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Plus size={16} />
          <span>Add Semester</span>
        </button>
      </div>

      {/* ── Semesters Grid ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Loading semesters...</span>
        </div>
      ) : semesters.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Layers size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-bold text-sm text-slate-700">No semesters added yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Semester" to create terms (e.g. Semester 1 to 8).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {semesters.map(sem => (
            <div
              key={sem.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-black text-sm flex items-center justify-center">
                    S{sem.number}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(sem)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Semester"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(sem.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Semester"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-900">{sem.name}</h3>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Academic Year: <strong className="text-slate-800">{sem.academic_year}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    <span>Term: <strong className="text-slate-800">{sem.term} Term</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                  sem.is_active ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${sem.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {sem.is_active ? 'Active Term' : 'Inactive'}
                </span>
                <span className="text-slate-400 text-[10px]">ID: {sem.id.substring(0, 6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Slide-Over Right Drawer Add / Edit ── */}
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
                  <Layers size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingSemester ? 'Edit Semester' : 'Add New Semester'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Configure academic session and term parameters
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

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Semester Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Semester 5"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Semester Number</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.number}
                      onChange={e => setFormData({
                        ...formData,
                        number: parseInt(e.target.value) || 1,
                        name: `Semester ${e.target.value}`
                      })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Term</label>
                    <select
                      value={formData.term}
                      onChange={e => setFormData({ ...formData, term: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                    >
                      <option value="Odd">Odd Semester</option>
                      <option value="Even">Even Semester</option>
                      <option value="Fall">Fall Term</option>
                      <option value="Spring">Spring Term</option>
                      <option value="Summer">Summer Term</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-2027"
                    value={formData.academic_year}
                    onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active_cb"
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                    />
                    <label htmlFor="is_active_cb" className="text-xs font-bold text-slate-800 select-none cursor-pointer">
                      Active in Current Timetable Scheduling
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                    When active, divisions and timetable generation algorithms will include this semester in current solver batches.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  {editingSemester ? 'Save Changes' : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
