import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Calendar, Users, Building2, BookOpen, Shield, 
  Activity, ArrowRight, CornerDownLeft, Sparkles, Sliders,
  CheckCircle2, GitBranch, Cpu, AlertTriangle, Play, X
} from 'lucide-react';
import { useTerminology } from '@/context/TerminologyContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { terms, isUniversity } = useTerminology();

  const items = [
    // Flagship Actions
    { id: 'gen', category: 'Actions', title: 'Generate Master Timetable', desc: 'Run CP-SAT solver with current rules', icon: Play, path: '/timetable' },
    { id: 'curr-grid', category: 'Actions', title: `Open ${terms.subject} Requirements Grid`, desc: 'Spreadsheet-like weekly requirements matrix', icon: BookOpen, path: '/curriculum/grid' },
    { id: 'bottleneck', category: 'Actions', title: 'Run Bottleneck Analysis', desc: 'Diagnose high-pressure activities and rooms', icon: Activity, path: '/scheduling/bottleneck' },
    { id: 'repair', category: 'Actions', title: 'Open Conflict Repair Center', desc: 'Auto-repair clashes with minimal changes', icon: AlertTriangle, path: '/repair' },
    { id: 'simulation', category: 'Actions', title: 'What-If Scenario Simulation', desc: 'Simulate leaves, room closures & disruptions', icon: GitBranch, path: '/simulation' },
    { id: 'data-health', category: 'Actions', title: 'Live Workload & Room Analytics', desc: 'Real-time KPIs, faculty hours, and room utilization', icon: Activity, path: '/analytics' },
    { id: 'constraints', category: 'Actions', title: 'Constraint Center & Rules', desc: 'Hard rules, soft preferences, and weights', icon: Shield, path: '/constraints' },

    // Core Workspaces
    { id: 'workspace', category: 'Navigation', title: 'Timetable Workspace (3-Pane Editor)', desc: 'Interactive grid, unscheduled pool, inspector', icon: Calendar, path: '/timetable' },
    { id: 'manual', category: 'Navigation', title: 'Multi-Grid Manual Builder', desc: 'Side-by-side drag & drop scheduling', icon: Calendar, path: '/manual-builder' },
    { id: 'dashboard', category: 'Navigation', title: 'Executive Operations Dashboard', desc: 'KPIs, schedules, attention list', icon: Sliders, path: '/' },
    { id: 'analytics', category: 'Navigation', title: 'Scheduling Analytics & Heatmaps', desc: 'Workload, gaps, and room utilization', icon: Activity, path: '/analytics' },

    // Entities: Teachers
    { id: 't1', category: terms.teachers, title: 'Dr. Bhavesh K. Patel', desc: `${terms.head} · Computer Engineering`, icon: Users, path: '/teachers' },
    { id: 't2', category: terms.teachers, title: 'Prof. Dhruv Thakur', desc: `${terms.coordinator} · Computer Networks`, icon: Users, path: '/teachers' },
    { id: 't3', category: terms.teachers, title: 'Prof. Nikul Zinzuvadiya', desc: 'DAA & Data Structures In-Charge', icon: Users, path: '/teachers' },
    { id: 't4', category: terms.teachers, title: 'Prof. Bhavika H. Patel', desc: 'Machine Learning & AI In-Charge', icon: Users, path: '/teachers' },
    { id: 't5', category: terms.teachers, title: 'Prof. Zeenal Patel', desc: 'Full Stack Web & UI/UX', icon: Users, path: '/teachers' },

    // Entities: Classes
    { id: 'c1', category: terms.classes, title: isUniversity ? 'B.Tech 5CE-A' : 'Grade 10-A', desc: `60 Students · Room F-001`, icon: Users, path: '/timetable' },
    { id: 'c2', category: terms.classes, title: isUniversity ? 'B.Tech 5CE-B' : 'Grade 10-B', desc: `60 Students · Room F-002`, icon: Users, path: '/timetable' },
    { id: 'c3', category: terms.classes, title: isUniversity ? 'B.Tech 5IT-A' : 'Grade 11-A', desc: `55 Students · Room IT-101`, icon: Users, path: '/timetable' },
    { id: 'c4', category: terms.classes, title: isUniversity ? 'B.Tech 3CE-A' : 'Grade 9-A', desc: `65 Students · Room F-003`, icon: Users, path: '/timetable' },

    // Portals & Resources
    { id: 'p-teacher', category: 'Resources', title: 'Faculty Workload & Timetables', desc: 'Workload hours across all classes & schedules', icon: Users, path: '/teachers' },
    { id: 'p-room', category: 'Resources', title: 'Rooms & Laboratories Matrix', desc: 'M-Classrooms, Lab 1 & 2 assigned schedules', icon: Building2, path: '/rooms' },
    { id: 'versions', category: 'Governance', title: 'Version History & Diff Comparison', desc: 'Audit log, revision rollback, and approval sign-off', icon: GitBranch, path: '/versions' },
  ];

  const filtered = items.filter(i => 
    i.title.toLowerCase().includes(query.toLowerCase()) || 
    i.desc.toLowerCase().includes(query.toLowerCase()) ||
    i.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search className="text-slate-400 w-5 h-5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, teacher, class, room, or action..."
            className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded border border-slate-300 shadow-2xs">ESC</kbd>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No results found for "<span className="text-slate-600 font-bold">{query}</span>"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected ? 'bg-indigo-50 border border-indigo-200 text-indigo-900' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <CornerDownLeft size={14} className="text-indigo-600" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="font-mono bg-white px-1.5 py-0.5 border rounded">↑</kbd> <kbd className="font-mono bg-white px-1.5 py-0.5 border rounded">↓</kbd> to navigate</span>
            <span><kbd className="font-mono bg-white px-1.5 py-0.5 border rounded">ENTER</kbd> to select</span>
          </div>
          <span className="text-indigo-600 font-bold">TIMEGRID Intelligence</span>
        </div>
      </div>
    </div>
  );
}
