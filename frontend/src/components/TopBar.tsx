import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, Bell, ChevronRight, School, GraduationCap, 
  Calendar, MapPin, CheckCircle2, User, ChevronDown, Sparkles
} from 'lucide-react';
import { useTerminology } from '@/context/TerminologyContext';

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

export default function TopBar({ onOpenCommandPalette }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleMode, terms, isUniversity } = useTerminology();
  const [academicYear, setAcademicYear] = useState('2026-27 (Odd Sem)');
  const [campus, setCampus] = useState('Main Campus');
  const [showNotifications, setShowNotifications] = useState(false);

  // Generate breadcrumb items
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.length > 0 
    ? pathParts.map((part, i) => {
        const title = part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return { label: title, path: '/' + pathParts.slice(0, i + 1).join('/') };
      })
    : [{ label: 'Dashboard', path: '/' }];

  const notifications = [
    { id: 1, title: 'Schedule Generated', desc: 'Semester 5 (Odd 2026-27) solved with 0 conflicts', time: '10m ago', unread: true },
    { id: 2, title: 'Teacher Availability Update', desc: 'Dr. Bhavesh Patel requested leave on Thursday Period 3', time: '1h ago', unread: true },
    { id: 3, title: 'Room Maintenance Notice', desc: 'Comp Lab-4 booked for networking audit tomorrow', time: '3h ago', unread: false },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 select-none">
      {/* ── Left: Breadcrumb Navigation ── */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span 
          onClick={() => navigate('/timetable')} 
          className="hover:text-black transition-colors cursor-pointer text-slate-900 font-black tracking-wider"
          title="TimeGrid Timetable Platform"
        >
          TIMEGRID
        </span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.path}>
            <ChevronRight size={13} className="text-slate-400" />
            <span 
              onClick={() => navigate(crumb.path)}
              className={`cursor-pointer transition-colors ${
                idx === breadcrumbs.length - 1 ? 'text-slate-900 font-extrabold' : 'hover:text-slate-700'
              }`}
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}

      </div>

      {/* ── Center: Command Palette Trigger ── */}
      <div className="flex-1 max-w-md mx-6">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300 text-slate-400 text-xs transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="font-medium text-slate-500">Search teachers, classes, rooms, actions...</span>
          </div>
          <kbd className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-600 shadow-2xs font-mono">
            ⌘K / Ctrl+K
          </kbd>
        </button>
      </div>

      {/* ── Right Controls: Mode Toggle, Term, Campus, Notifications, Profile ── */}
      <div className="flex items-center gap-3">
        {/* Adaptive Mode Toggle (School vs University) */}
        <button
          onClick={toggleMode}
          title={`Switch to ${isUniversity ? 'School Mode' : 'University Mode'}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs cursor-pointer bg-indigo-50/70 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
        >
          {isUniversity ? (
            <>
              <GraduationCap size={15} />
              <span>University Mode</span>
            </>
          ) : (
            <>
              <School size={15} />
              <span>School Mode</span>
            </>
          )}
        </button>

        {/* Academic Year Switcher */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold">
          <Calendar size={13} className="text-slate-500" />
          <select 
            value={academicYear} 
            onChange={(e) => setAcademicYear(e.target.value)}
            className="bg-transparent focus:outline-hidden cursor-pointer"
          >
            <option value="2026-27 (Odd Sem)">2026–27 (Odd Sem)</option>
            <option value="2026-27 (Even Sem)">2026–27 (Even Sem)</option>
            <option value="2025-26">2025–26 (Archive)</option>
          </select>
        </div>

        {/* Campus Switcher */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold">
          <MapPin size={13} className="text-slate-500" />
          <select 
            value={campus} 
            onChange={(e) => setCampus(e.target.value)}
            className="bg-transparent focus:outline-hidden cursor-pointer"
          >
            <option value="Main Campus">Main Campus</option>
            <option value="South Campus">South Campus</option>
            <option value="Tech Park Wing">Tech Park Wing</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors relative"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-900 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 animate-fadeIn space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Operational Alerts</span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">2 New</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`p-2 rounded-lg text-xs transition-colors ${n.unread ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 leading-tight">{n.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-extrabold text-slate-800 leading-none">Admin</div>
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight mt-0.5">COORDINATOR</div>
          </div>
        </div>
      </div>
    </header>
  );
}
