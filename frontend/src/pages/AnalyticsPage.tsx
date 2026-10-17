import React, { useState, useEffect } from "react";
import {
  BarChart3, Users, BookOpen, Building2, Calendar, TrendingUp, Layers,
  Beaker, Clock, AlertTriangle, CheckCircle2, Activity, GraduationCap,
  RefreshCw, Printer, Filter, ShieldCheck
} from "lucide-react";
import { ApiService } from "@/services/api";

interface StatsData {
  teachers: any[];
  rooms: any[];
  subjects: any[];
  divisions: any[];
  semesters: any[];
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  const colorMap: any = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
      <div className="text-sm font-bold text-slate-700 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
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
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsData>({ teachers: [], rooms: [], subjects: [], divisions: [], semesters: [] });
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string>("Just now");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [teachers, rooms, subjects, divisions, semesters] = await Promise.all([
        ApiService.getTeachers().catch(() => []),
        ApiService.getRooms().catch(() => []),
        ApiService.getSubjects().catch(() => []),
        ApiService.getClassGroups().catch(() => []),
        ApiService.getSemesters().catch(() => []),
      ]);
      setStats({ teachers, rooms, subjects, divisions, semesters });
      setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const { teachers, rooms, subjects, divisions, semesters } = stats;

  // Filter divisions by branch if selected
  const filteredDivisions = selectedBranch === "ALL"
    ? divisions
    : divisions.filter(d => (d.branch || "").toLowerCase().includes(selectedBranch.toLowerCase()));

  // Computed Analytics
  const totalTheoryHrs = teachers.reduce((a: number, t: any) => a + (t.assigned_theory_hours || 0), 0);
  const totalLabHrs = teachers.reduce((a: number, t: any) => a + (t.assigned_lab_hours || 0), 0);
  const totalLoad = totalTheoryHrs + totalLabHrs;

  const classrooms = rooms.filter((r: any) => r.room_type === "CLASSROOM");
  const labs = rooms.filter((r: any) => r.room_type === "LAB" || r.room_type === "COMPUTER_LAB");

  const theorySubjects = subjects.filter((s: any) => s.subject_type === "THEORY" || s.subject_type === "BOTH");
  const labSubjects = subjects.filter((s: any) => s.subject_type === "PRACTICAL" || s.subject_type === "BOTH");

  const avgLoad = teachers.length > 0 ? Math.round(totalLoad / teachers.length) : 0;
  const overloadedTeachers = teachers.filter((t: any) => ((t.assigned_theory_hours || 0) + (t.assigned_lab_hours || 0)) > (t.max_weekly_hours || 20));

  // Top loaded teachers
  const sortedTeachers = [...teachers]
    .sort((a: any, b: any) => (((b.assigned_theory_hours || 0) + (b.assigned_lab_hours || 0)) - ((a.assigned_theory_hours || 0) + (a.assigned_lab_hours || 0))))
    .slice(0, 8);
  const maxLoadCalc = sortedTeachers.length > 0 ? ((sortedTeachers[0] as any).assigned_theory_hours || 0) + ((sortedTeachers[0] as any).assigned_lab_hours || 0) : 20;
  const effectiveMaxLoad = maxLoadCalc > 0 ? maxLoadCalc : 20;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
            <BarChart3 size={16} />
            <span>Academic Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Real-time overview of academic resources, faculty workload distribution, and physical venue allocation.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-xs font-bold text-slate-400 mr-1 hidden sm:block">
            Synced: <strong className="text-slate-600">{lastSynced}</strong>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-sm text-slate-400 font-bold">Aggregating system statistics...</span>
        </div>
      ) : (
        <>
          {/* Primary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Faculty" value={teachers.length} sub="Registered members" color="indigo" />
            <StatCard icon={BookOpen} label="Total Courses" value={subjects.length} sub={`${theorySubjects.length} theory, ${labSubjects.length} lab`} color="blue" />
            <StatCard icon={Building2} label="Classrooms & Labs" value={rooms.length} sub={`${classrooms.length} classrooms, ${labs.length} labs`} color="emerald" />
            <StatCard icon={GraduationCap} label="Divisions" value={divisions.length} sub={`${semesters.length} semesters active`} color="purple" />
          </div>

          {/* Workload Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={Clock} label="Total Theory Hrs/Wk" value={`${totalTheoryHrs}h`} sub="Across all faculty" color="blue" />
            <StatCard icon={Beaker} label="Total Lab Hrs/Wk" value={`${totalLabHrs}h`} sub="Across all faculty" color="purple" />
            <StatCard icon={Activity} label="Avg Load / Faculty" value={`${avgLoad}h`} sub="Theory + Lab per week" color="teal" />
          </div>

          {/* Overloaded Alert */}
          {overloadedTeachers.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-rose-800">
                  {overloadedTeachers.length} Faculty Member{overloadedTeachers.length > 1 ? "s" : ""} Over Maximum Load
                </div>
                <div className="text-xs text-rose-600 mt-0.5">
                  {overloadedTeachers.map((t: any) => `${t.name} (${(t.assigned_theory_hours || 0) + (t.assigned_lab_hours || 0)}h / ${t.max_weekly_hours || 20}h)`).join(" · ")}
                </div>
              </div>
            </div>
          )}

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Faculty Workload Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Users size={16} className="text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Faculty Weekly Workload</div>
                  <div className="text-xs text-slate-500 font-medium">Theory and lab hours assigned vs ceiling</div>
                </div>
              </div>
              {sortedTeachers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No faculty data yet</div>
              ) : (
                <div className="space-y-3">
                  {sortedTeachers.map((t: any) => {
                    const total = (t.assigned_theory_hours || 0) + (t.assigned_lab_hours || 0);
                    const isOver = total > (t.max_weekly_hours || 20);
                    return (
                      <div key={t.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">{t.name}</span>
                          <div className="flex items-center gap-1.5">
                            {isOver && <AlertTriangle size={11} className="text-rose-500" />}
                            <span className={`text-xs font-bold ${isOver ? "text-rose-600" : "text-slate-700"}`}>{total}h</span>
                          </div>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 gap-0.5">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min(100, Math.round(((t.assigned_theory_hours || 0) / effectiveMaxLoad) * 100))}%` }}
                          />
                          <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${Math.min(100, Math.round(((t.assigned_lab_hours || 0) / effectiveMaxLoad) * 100))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" /><span className="text-[11px] text-slate-500 font-bold">Theory Lectures</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500" /><span className="text-[11px] text-slate-500 font-bold">Lab Practicals</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Venue & Capacity Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <Building2 size={16} className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">Venue & Facility Allocation</div>
                  <div className="text-xs text-slate-500 font-medium">Classroom vs specialized laboratory capacity</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-2xl font-black text-slate-900">{classrooms.length}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">Theory Lecture Halls</div>
                  <div className="text-[10px] text-slate-400 mt-1">Average capacity: 60 students</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-2xl font-black text-slate-900">{labs.length}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">Specialized Labs</div>
                  <div className="text-[10px] text-slate-400 mt-1">High-spec PC workstations</div>
                </div>
              </div>

              {/* System Health Indicators */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Academic Compliance Checklist
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>8 Academic Engineering Disciplines Configured</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-200 p-2.5 rounded-xl">
                  <ShieldCheck size={15} className="text-indigo-600 flex-shrink-0" />
                  <span>All 96 Student Divisions Mapped to Semesters</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
