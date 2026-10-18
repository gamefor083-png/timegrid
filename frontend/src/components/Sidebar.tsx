import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Settings, BookOpen, Layers, Activity,
  Building2, Shield, BarChart3, ChevronLeft, ChevronRight,
  Zap, GraduationCap, LogOut, Clock, Grid3X3, AlertTriangle,
  GitBranch, Sparkles, CheckCircle2, FileSpreadsheet, Play, Download
} from 'lucide-react';
import { useTerminology } from '@/context/TerminologyContext';
import BrandLogo from './BrandLogo';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse, onLogout }: SidebarProps) {
  const location = useLocation();
  const { terms, isUniversity } = useTerminology();

  interface NavItem {
    path: string;
    label: string;
    icon: any;
    badge?: string;
  }

  interface NavGroup {
    label: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      label: 'Platform',
      items: [
        { path: '/timetable', label: 'Timetable Builder', icon: Calendar, badge: 'Live' },
        { path: '/schemas', label: 'Slot Schemas & Breaks', icon: Clock },
        { path: '/export', label: 'Official College Sheet', icon: FileSpreadsheet, badge: 'Export' },
      ],
    },

    {
      label: 'Academic Resources',
      items: [
        { path: '/faculty', label: 'Faculty Management', icon: Users },
        { path: '/rooms', label: 'Classrooms & Labs', icon: Building2 },
        { path: '/subjects', label: 'Subjects', icon: BookOpen },
        { path: '/divisions', label: 'Divisions / Classes', icon: GraduationCap },
        { path: '/semesters', label: 'Semesters', icon: Layers },
      ],
    },
    {
      label: 'Insights',
      items: [
        { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col z-40 select-none bg-white"
      style={{
        width: collapsed ? '72px' : '264px',
        borderRight: '1px solid var(--tg-border)',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Brand Header */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: '1px solid var(--tg-border-light)' }}
      >
        {collapsed ? (
          <NavLink to="/timetable" className="mx-auto hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs tracking-tighter bg-slate-900 border border-slate-700 text-white shadow-sm">
              <span>T</span>
              <span className="text-slate-400 font-light ml-[0.5px]">G</span>
              <span className="w-1 h-1 rounded-full bg-white ml-[1px] mb-1 inline-block" />
            </div>
          </NavLink>
        ) : (
          <NavLink to="/timetable" className="hover:opacity-90 transition-opacity">
            <BrandLogo size="md" />
          </NavLink>
        )}
      </div>


      {/* Navigation Links (Scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`flex-shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    {!collapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-tight ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Controls */}
      <div
        className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-2"
      >
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition-colors text-xs font-bold"
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse Menu</span>
            </>
          )}
        </button>

        {onLogout && !collapsed && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        )}

        {!collapsed && (
          <div className="pt-2 px-1 text-center border-t border-slate-200/70">
            <div className="text-[10px] font-semibold text-slate-700">
              Made by Kakadiya Technologies™
            </div>
            <div className="text-[9px] text-slate-500">
              © 2026 Meet Kakadiya
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
