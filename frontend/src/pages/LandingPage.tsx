import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Building2,
  Users,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Sliders,
  ChevronDown,
  RefreshCw,
  Check,
  X,
  TrendingUp,
  Printer,
  Sparkles,
  Layers,
  Award,
  ChevronRight,
  Maximize2,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

export default function LandingPage() {
  const navigate = useNavigate();

  // Interactive Live Matrix State
  const [activeDivision, setActiveDivision] = useState<'4CE-A' | '4IT-A' | '6CE-A' | '6CSE-A'>('4CE-A');
  const [isClashSimulated, setIsClashSimulated] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [activePeriodHover, setActivePeriodHover] = useState<number | null>(null);

  // Active Feature Tab State
  const [activeFeatureTab, setActiveFeatureTab] = useState<'solver' | 'workload' | 'labs' | 'export' | 'nep'>('solver');

  // ROI Calculator State
  const [calcFaculty, setCalcFaculty] = useState<number>(36);
  const [calcDivisions, setCalcDivisions] = useState<number>(14);
  const [calcLabHours, setCalcLabHours] = useState<number>(32);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Timetable Sandbox Data (Curated Academic Curriculum)
  const scheduleData = {
    '4CE-A': [
      { day: 'Mon', p1: { code: 'CE301', title: 'Data Structures', room: 'LH-101', faculty: 'Dr. R. Sharma', type: 'theory' }, p2: { code: 'CE302', title: 'Database Systems', room: 'LH-101', faculty: 'Prof. K. Patel', type: 'theory' }, p3: { code: 'PRJ', title: 'Self-Study Project', room: 'Lib-2', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-101', title: 'Data Structures Lab', room: 'Lab-A', faculty: 'Dr. R. Sharma', type: 'lab' }, p5: { code: 'CL-101', title: 'Data Structures Lab', room: 'Lab-A', faculty: 'Dr. R. Sharma', type: 'lab' } },
      { day: 'Tue', p1: { code: 'CE401', title: 'Computer Networks', room: 'LH-101', faculty: 'Prof. S. Joshi', type: 'theory' }, p2: { code: 'MA201', title: 'Discrete Mathematics', room: 'LH-101', faculty: 'Dr. M. Dave', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-102', title: 'DBMS Practical Lab', room: 'Lab-B', faculty: 'Prof. K. Patel', type: 'lab' }, p5: { code: 'CL-102', title: 'DBMS Practical Lab', room: 'Lab-B', faculty: 'Prof. K. Patel', type: 'lab' } },
      { day: 'Wed', p1: { code: 'CE303', title: 'Operating Systems', room: 'LH-101', faculty: 'Prof. V. Mehta', type: 'theory' }, p2: { code: 'CE402', title: 'Software Engineering', room: 'LH-101', faculty: 'Prof. A. Shah', type: 'theory' }, p3: { code: 'CE301', title: 'Data Structures', room: 'LH-101', faculty: 'Dr. R. Sharma', type: 'theory' }, p4: { code: 'PRJ', title: 'Capstone Project', room: 'Project Lab', faculty: 'Independent', type: 'study' }, p5: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' } },
      { day: 'Thu', p1: { code: 'CE302', title: 'Database Systems', room: 'LH-101', faculty: 'Prof. K. Patel', type: 'theory' }, p2: { code: 'CE401', title: 'Computer Networks', room: 'LH-101', faculty: 'Prof. S. Joshi', type: 'theory' }, p3: { code: 'CE303', title: 'Operating Systems', room: 'LH-101', faculty: 'Prof. V. Mehta', type: 'theory' }, p4: { code: 'CL-103', title: 'OS Practical Lab', room: 'Lab-C', faculty: 'Prof. V. Mehta', type: 'lab' }, p5: { code: 'CL-103', title: 'OS Practical Lab', room: 'Lab-C', faculty: 'Prof. V. Mehta', type: 'lab' } },
      { day: 'Fri', p1: { code: 'MA201', title: 'Discrete Mathematics', room: 'LH-101', faculty: 'Dr. M. Dave', type: 'theory' }, p2: { code: 'CE402', title: 'Software Engineering', room: 'LH-101', faculty: 'Prof. A. Shah', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-101', title: 'Networks Lab', room: 'Lab-A', faculty: 'Prof. S. Joshi', type: 'lab' }, p5: { code: 'CL-101', title: 'Networks Lab', room: 'Lab-A', faculty: 'Prof. S. Joshi', type: 'lab' } },
    ],
    '4IT-A': [
      { day: 'Mon', p1: { code: 'IT301', title: 'Web Technologies', room: 'LH-102', faculty: 'Prof. N. Desai', type: 'theory' }, p2: { code: 'IT302', title: 'Relational Databases', room: 'LH-102', faculty: 'Prof. D. Vyas', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-103', title: 'Fullstack Web Lab', room: 'Lab-C', faculty: 'Prof. N. Desai', type: 'lab' }, p5: { code: 'CL-103', title: 'Fullstack Web Lab', room: 'Lab-C', faculty: 'Prof. N. Desai', type: 'lab' } },
      { day: 'Tue', p1: { code: 'IT401', title: 'Data Science Intro', room: 'LH-102', faculty: 'Dr. H. Solanki', type: 'theory' }, p2: { code: 'IT202', title: 'Java OOP', room: 'LH-102', faculty: 'Prof. B. Naik', type: 'theory' }, p3: { code: 'PRJ', title: 'Project Track', room: 'Lib-2', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-104', title: 'Advanced Java Lab', room: 'Lab-D', faculty: 'Prof. B. Naik', type: 'lab' }, p5: { code: 'CL-104', title: 'Advanced Java Lab', room: 'Lab-D', faculty: 'Prof. B. Naik', type: 'lab' } },
      { day: 'Wed', p1: { code: 'IT501', title: 'Network Security', room: 'LH-102', faculty: 'Prof. T. Panchal', type: 'theory' }, p2: { code: 'IT301', title: 'Web Technologies', room: 'LH-102', faculty: 'Prof. N. Desai', type: 'theory' }, p3: { code: 'IT302', title: 'Relational Databases', room: 'LH-102', faculty: 'Prof. D. Vyas', type: 'theory' }, p4: { code: 'PRJ', title: 'Project Track', room: 'Lib-2', faculty: 'Independent', type: 'study' }, p5: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' } },
      { day: 'Thu', p1: { code: 'IT402', title: 'Mobile Computing', room: 'LH-102', faculty: 'Prof. P. Parekh', type: 'theory' }, p2: { code: 'IT401', title: 'Data Science Intro', room: 'LH-102', faculty: 'Dr. H. Solanki', type: 'theory' }, p3: { code: 'IT202', title: 'Java OOP', room: 'LH-102', faculty: 'Prof. B. Naik', type: 'theory' }, p4: { code: 'CL-103', title: 'Database Admin Lab', room: 'Lab-C', faculty: 'Prof. D. Vyas', type: 'lab' }, p5: { code: 'CL-103', title: 'Database Admin Lab', room: 'Lab-C', faculty: 'Prof. D. Vyas', type: 'lab' } },
      { day: 'Fri', p1: { code: 'IT501', title: 'Network Security', room: 'LH-102', faculty: 'Prof. T. Panchal', type: 'theory' }, p2: { code: 'IT402', title: 'Mobile Computing', room: 'LH-102', faculty: 'Prof. P. Parekh', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-104', title: 'Data Science Lab', room: 'Lab-D', faculty: 'Dr. H. Solanki', type: 'lab' }, p5: { code: 'CL-104', title: 'Data Science Lab', room: 'Lab-D', faculty: 'Dr. H. Solanki', type: 'lab' } },
    ],
    '6CE-A': [
      { day: 'Mon', p1: { code: 'CE601', title: 'Cloud Computing', room: 'LH-201', faculty: 'Prof. S. Joshi', type: 'theory' }, p2: { code: 'CE602', title: 'Information Security', room: 'LH-201', faculty: 'Dr. R. Sharma', type: 'theory' }, p3: { code: 'PRJ', title: 'Industry Project', room: 'Project Lab', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-102', title: 'Cloud Infrastructure Lab', room: 'Lab-B', faculty: 'Prof. S. Joshi', type: 'lab' }, p5: { code: 'CL-102', title: 'Cloud Infrastructure Lab', room: 'Lab-B', faculty: 'Prof. S. Joshi', type: 'lab' } },
      { day: 'Tue', p1: { code: 'CE501', title: 'Machine Learning', room: 'LH-201', faculty: 'Dr. A. Shah', type: 'theory' }, p2: { code: 'CE502', title: 'Distributed Systems', room: 'LH-201', faculty: 'Prof. V. Mehta', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-101', title: 'ML & AI Lab', room: 'Lab-A', faculty: 'Dr. A. Shah', type: 'lab' }, p5: { code: 'CL-101', title: 'ML & AI Lab', room: 'Lab-A', faculty: 'Dr. A. Shah', type: 'lab' } },
      { day: 'Wed', p1: { code: 'CE601', title: 'Cloud Computing', room: 'LH-201', faculty: 'Prof. S. Joshi', type: 'theory' }, p2: { code: 'CE501', title: 'Machine Learning', room: 'LH-201', faculty: 'Dr. A. Shah', type: 'theory' }, p3: { code: 'CE602', title: 'Information Security', room: 'LH-201', faculty: 'Dr. R. Sharma', type: 'theory' }, p4: { code: 'PRJ', title: 'Industry Project', room: 'Project Lab', faculty: 'Independent', type: 'study' }, p5: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' } },
      { day: 'Thu', p1: { code: 'CE502', title: 'Distributed Systems', room: 'LH-201', faculty: 'Prof. V. Mehta', type: 'theory' }, p2: { code: 'CE601', title: 'Cloud Computing', room: 'LH-201', faculty: 'Prof. S. Joshi', type: 'theory' }, p3: { code: 'PRJ', title: 'Industry Project', room: 'Project Lab', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-104', title: 'Cyber Security Lab', room: 'Lab-D', faculty: 'Dr. R. Sharma', type: 'lab' }, p5: { code: 'CL-104', title: 'Cyber Security Lab', room: 'Lab-D', faculty: 'Dr. R. Sharma', type: 'lab' } },
      { day: 'Fri', p1: { code: 'CE501', title: 'Machine Learning', room: 'LH-201', faculty: 'Dr. A. Shah', type: 'theory' }, p2: { code: 'CE602', title: 'Information Security', room: 'LH-201', faculty: 'Dr. R. Sharma', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-102', title: 'Distributed Systems Lab', room: 'Lab-B', faculty: 'Prof. V. Mehta', type: 'lab' }, p5: { code: 'CL-102', title: 'Distributed Systems Lab', room: 'Lab-B', faculty: 'Prof. V. Mehta', type: 'lab' } },
    ],
    '6CSE-A': [
      { day: 'Mon', p1: { code: 'CS601', title: 'Big Data Analytics', room: 'LH-203', faculty: 'Dr. M. Dave', type: 'theory' }, p2: { code: 'CS602', title: 'DevOps & CI/CD', room: 'LH-203', faculty: 'Prof. K. Patel', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-105', title: 'Big Data Cluster Lab', room: 'Lab-E', faculty: 'Dr. M. Dave', type: 'lab' }, p5: { code: 'CL-105', title: 'Big Data Cluster Lab', room: 'Lab-E', faculty: 'Dr. M. Dave', type: 'lab' } },
      { day: 'Tue', p1: { code: 'CS503', title: 'Compiler Design', room: 'LH-203', faculty: 'Prof. B. Naik', type: 'theory' }, p2: { code: 'CS601', title: 'Big Data Analytics', room: 'LH-203', faculty: 'Dr. M. Dave', type: 'theory' }, p3: { code: 'PRJ', title: 'Capstone R&D', room: 'Project Lab', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-106', title: 'DevOps Automation Lab', room: 'Lab-F', faculty: 'Prof. K. Patel', type: 'lab' }, p5: { code: 'CL-106', title: 'DevOps Automation Lab', room: 'Lab-F', faculty: 'Prof. K. Patel', type: 'lab' } },
      { day: 'Wed', p1: { code: 'CS602', title: 'DevOps & CI/CD', room: 'LH-203', faculty: 'Prof. K. Patel', type: 'theory' }, p2: { code: 'CS503', title: 'Compiler Design', room: 'LH-203', faculty: 'Prof. B. Naik', type: 'theory' }, p3: { code: 'CS601', title: 'Big Data Analytics', room: 'LH-203', faculty: 'Dr. M. Dave', type: 'theory' }, p4: { code: 'PRJ', title: 'Capstone R&D', room: 'Project Lab', faculty: 'Independent', type: 'study' }, p5: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' } },
      { day: 'Thu', p1: { code: 'CS503', title: 'Compiler Design', room: 'LH-203', faculty: 'Prof. B. Naik', type: 'theory' }, p2: { code: 'CS602', title: 'DevOps & CI/CD', room: 'LH-203', faculty: 'Prof. K. Patel', type: 'theory' }, p3: { code: 'PRJ', title: 'Capstone R&D', room: 'Project Lab', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-105', title: 'Compiler Construction Lab', room: 'Lab-E', faculty: 'Prof. B. Naik', type: 'lab' }, p5: { code: 'CL-105', title: 'Compiler Construction Lab', room: 'Lab-E', faculty: 'Prof. B. Naik', type: 'lab' } },
      { day: 'Fri', p1: { code: 'CS601', title: 'Big Data Analytics', room: 'LH-203', faculty: 'Dr. M. Dave', type: 'theory' }, p2: { code: 'CS503', title: 'Compiler Design', room: 'LH-203', faculty: 'Prof. B. Naik', type: 'theory' }, p3: { code: 'SDA', title: 'Skill Development', room: 'Hall-B', faculty: 'Independent', type: 'study' }, p4: { code: 'CL-106', title: 'Advanced Research Lab', room: 'Lab-F', faculty: 'Prof. K. Patel', type: 'lab' }, p5: { code: 'CL-106', title: 'Advanced Research Lab', room: 'Lab-F', faculty: 'Prof. K. Patel', type: 'lab' } },
    ],
  };

  // Sample faculty workload telemetry for live animated bar demo
  const sampleFacultyWorkloads = [
    { name: 'Dr. R. Sharma', department: 'Comp. Eng', hours: 16, target: 16, labs: 4, theory: 12, status: 'Optimal' },
    { name: 'Prof. K. Patel', department: 'Comp. Eng', hours: 17, target: 16, labs: 6, theory: 11, status: 'Balanced' },
    { name: 'Prof. S. Joshi', department: 'Comp. Eng', hours: 15, target: 16, labs: 4, theory: 11, status: 'Optimal' },
    { name: 'Dr. M. Dave', department: 'Comp. Eng', hours: 16, target: 16, labs: 4, theory: 12, status: 'Optimal' },
    { name: 'Prof. V. Mehta', department: 'Comp. Eng', hours: 16, target: 16, labs: 4, theory: 12, status: 'Optimal' },
    { name: 'Prof. N. Desai', department: 'Info. Tech', hours: 15, target: 16, labs: 4, theory: 11, status: 'Optimal' },
    { name: 'Dr. H. Solanki', department: 'Info. Tech', hours: 16, target: 16, labs: 4, theory: 12, status: 'Optimal' },
  ];

  const handleLaunch = (targetPath: any = '/timetable') => {
    const finalPath = typeof targetPath === 'string' && targetPath.startsWith('/') ? targetPath : '/timetable';
    localStorage.setItem('tg_user', JSON.stringify({ email: 'admin@institution.edu', name: 'Academic Administrator' }));
    const newWindow = window.open(finalPath, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      navigate(finalPath);
    }
  };

  const handleSimulateConflict = () => {
    setIsClashSimulated(true);
  };

  const handleAutoResolve = () => {
    setIsResolving(true);
    setTimeout(() => {
      setIsClashSimulated(false);
      setIsResolving(false);
    }, 700);
  };

  // ROI Math
  const calculatedHoursSaved = Math.round(calcFaculty * 15 + calcDivisions * 18 + calcLabHours * 5);
  const calculatedDollarSavings = (calculatedHoursSaved * 45).toLocaleString();
  const turnaroundDays = Math.max(1, Math.round(calcDivisions * 1.4));

  const faqs = [
    {
      q: 'How does the constraint engine guarantee zero cross-department collisions?',
      a: 'The engine models the entire institution as a unified mathematical constraint matrix. Faculty members who teach across multiple departments are locked in the global state, making overlapping allocations mathematically impossible.',
    },
    {
      q: 'Why are 2-hour laboratory sessions strictly protected from splitting?',
      a: 'Engineering laboratory curriculum requires continuous time for setup, experiment execution, and compilation. TimeGrid treats every laboratory module as an indivisible 2-period atomic block inside designated lab facilities.',
    },
    {
      q: 'How does TimeGrid handle NEP 2020 Skill Development and Project slots?',
      a: 'The platform schedules non-faculty independent slots for Project (PRJ) and Skill Development (SDA) evenly across the academic week, giving students structured independent study without inflating instructor workload.',
    },
    {
      q: 'Can we publish official printable sheets directly for campus noticeboards?',
      a: 'Yes. The Export Portal formats complete division cohort timetables, individual faculty workload slips, and classroom occupancy charts with official institutional headers, ready for print and high-resolution PDF download.',
    },
    {
      q: 'What is the implementation timeline for a college campus?',
      a: 'A typical department or engineering college can import faculty, rooms, and curricular schemas in under an hour and generate verified semester master schedules immediately.',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black">
      {/* ── Subtle Pure Monochrome Top Glow ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-white/10 via-white/[0.02] to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-white/[0.02] blur-3xl rounded-full" />
      </div>

      {/* ── Top Institutional Marquee Bar ── */}
      <div className="relative z-50 bg-black border-b border-zinc-900 py-2 overflow-hidden select-none">
        <div className="animate-marquee whitespace-nowrap text-[11px] font-mono tracking-widest text-zinc-500 flex items-center gap-12 uppercase">
          <span>• AUTONOMOUS ACADEMIC SCHEDULING SYSTEM</span>
          <span>• 100% MATHEMATICAL ZERO-COLLISION GUARANTEE</span>
          <span>• NEP 2020 CURRICULUM COMPLIANT</span>
          <span>• CONTINUOUS 2-HOUR LABORATORY ATOMIC BLOCKS</span>
          <span>• BALANCED 16-HOUR FACULTY LOAD EQUILIBRIUM</span>
          <span>• INSTANT NOTICEBOARD & FACULTY SLIP EXPORT</span>
          <span>• AUTONOMOUS ACADEMIC SCHEDULING SYSTEM</span>
          <span>• 100% MATHEMATICAL ZERO-COLLISION GUARANTEE</span>
          <span>• NEP 2020 CURRICULUM COMPLIANT</span>
          <span>• CONTINUOUS 2-HOUR LABORATORY ATOMIC BLOCKS</span>
        </div>
      </div>

      {/* ── Pure Monochrome Minimalist Navigation Bar ── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/80 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <BrandLogo size="md" light={true} />
            <nav className="hidden lg:flex items-center gap-8 text-xs font-medium tracking-wide text-zinc-400">
              <a href="#demo" className="hover:text-white transition-colors">Interactive Matrix</a>
              <a href="#features" className="hover:text-white transition-colors">Core Capabilities</a>
              <a href="#calculator" className="hover:text-white transition-colors">Campus Savings</a>
              <a href="#comparison" className="hover:text-white transition-colors">Comparison</a>
              <a href="#pricing" className="hover:text-white transition-colors">Institutional Tiers</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleLaunch('/login')}
              className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleLaunch}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-tight bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <span>Launch Platform</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Pure Black & White with Micro-Animations) ── */}
      <section className="relative z-10 pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Minimal Monochrome Product Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-[11px] font-mono tracking-wide text-zinc-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>AUTONOMOUS ACADEMIC TIMETABLE OPERATING SYSTEM</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-[1.05] text-white">
          University Scheduling.{' '}
          <span className="text-zinc-500 font-normal">
            Solved Mathematically.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
          The intelligent operating system engineered for engineering colleges and university faculties.
          Coordinate 50+ faculty workloads, 25+ specialized laboratories, and student cohorts with zero conflicts and one-click noticeboard publishing.
        </p>

        {/* Hero Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleLaunch}
            className="px-7 py-3.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg shadow-white/5"
          >
            <span>Launch Timetable Platform</span>
            <ArrowRight size={14} />
          </button>

          <a
            href="#demo"
            className="px-6 py-3.5 rounded-full text-xs font-medium bg-zinc-950 hover:bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700 transition-colors flex items-center gap-2"
          >
            <Maximize2 size={13} className="text-zinc-400" />
            <span>Test Interactive Matrix</span>
          </a>

          <button
            onClick={() => handleLaunch('/export')}
            className="px-6 py-3.5 rounded-full text-xs font-medium bg-transparent hover:bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 transition-colors flex items-center gap-2"
          >
            <Printer size={13} />
            <span>Noticeboard Sheets</span>
          </button>
        </div>

        {/* Live Key Metrics Bar */}
        <div className="mt-16 pt-10 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 transition-colors">
            <div className="text-3xl font-mono font-bold text-white">0</div>
            <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider">Teacher & Room Clashes</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 transition-colors">
            <div className="text-3xl font-mono font-bold text-white">2-Hour</div>
            <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider">Continuous Lab Sessions</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 transition-colors">
            <div className="text-3xl font-mono font-bold text-white">16h / Wk</div>
            <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider">Target Faculty Balance</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 transition-colors">
            <div className="text-3xl font-mono font-bold text-white">&lt; 10s</div>
            <div className="text-[11px] text-zinc-400 mt-1 uppercase tracking-wider">Full Semester Solve Time</div>
          </div>
        </div>
      </section>

      {/* ── Interactive Live Timetable Matrix & Clash Simulator ── */}
      <section id="demo" className="relative z-10 py-20 bg-zinc-950 border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-2">Live Interactive Canvas</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Academic Division Timetable Sandbox
              </h2>
              <p className="text-xs text-zinc-400 mt-2 max-w-xl leading-relaxed">
                Experience real-time constraint enforcement. Switch between engineering cohorts or intentionally inject a faculty collision to see the autonomous solver resolve it instantly.
              </p>
            </div>

            {/* Division Selector & Collision Simulator Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-black border border-zinc-800">
                {(['4CE-A', '4IT-A', '6CE-A', '6CSE-A'] as const).map((div) => (
                  <button
                    key={div}
                    onClick={() => setActiveDivision(div)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeDivision === div
                        ? 'bg-white text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {div}
                  </button>
                ))}
              </div>

              {!isClashSimulated ? (
                <button
                  onClick={handleSimulateConflict}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-mono bg-black hover:bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-1.5"
                >
                  <Zap size={12} className="text-white" />
                  <span>Simulate Room Collision</span>
                </button>
              ) : (
                <button
                  onClick={handleAutoResolve}
                  disabled={isResolving}
                  className="px-4 py-1.5 rounded-xl text-xs font-mono bg-white hover:bg-zinc-200 text-black font-bold transition-all flex items-center gap-1.5 shadow-md"
                >
                  <RefreshCw size={12} className={isResolving ? 'animate-spin' : ''} />
                  <span>{isResolving ? 'Resolving Constraints...' : 'Auto-Solve Conflict'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Conflict Alert Banner if simulated */}
          {isClashSimulated && (
            <div className="mb-4 p-4 rounded-xl bg-black border border-white text-xs text-white flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span className="font-mono font-bold uppercase">Conflict Detected:</span>
                <span className="text-zinc-300">Room CL-101 double-booked with Prof. Sharma (CE301) and Prof. Patel (CE401) on Monday 09:00.</span>
              </div>
              <button
                onClick={handleAutoResolve}
                className="px-3 py-1 bg-white text-black rounded font-mono font-bold text-[11px] hover:bg-zinc-200 transition-colors"
              >
                Auto-Resolve
              </button>
            </div>
          )}

          {/* Interactive Timetable Board */}
          <div className="rounded-2xl border border-zinc-800 bg-black overflow-hidden shadow-2xl relative">
            {/* Top Board Bar */}
            <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between text-xs text-zinc-400 bg-zinc-950/60">
              <div className="flex items-center gap-2 font-mono text-white">
                <Building2 size={14} className="text-zinc-400" />
                <span>Department of Computer Engineering & IT — Cohort {activeDivision}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className={`w-2 h-2 rounded-full ${isClashSimulated ? 'bg-white animate-ping' : 'bg-emerald-400'}`} />
                <span className="text-zinc-300">
                  {isClashSimulated ? 'STATUS: 1 CONFLICT DETECTED' : 'STATUS: ZERO CONFLICTS VERIFIED'}
                </span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950/90 border-b border-zinc-900 text-zinc-400 font-mono text-[11px]">
                    <th className="py-3.5 px-4 w-20">DAY</th>
                    <th className="py-3.5 px-4">PERIOD 1 (09:00 - 10:00)</th>
                    <th className="py-3.5 px-4">PERIOD 2 (10:00 - 11:00)</th>
                    <th className="py-3.5 px-4">PERIOD 3 (11:00 - 12:00)</th>
                    <th className="py-3.5 px-4 text-center bg-zinc-950 text-zinc-500 w-28">12:00 - 13:00</th>
                    <th className="py-3.5 px-4">PERIOD 4 (13:00 - 14:00)</th>
                    <th className="py-3.5 px-4">PERIOD 5 (14:00 - 15:00)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-medium">
                  {scheduleData[activeDivision].map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-950/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-300 bg-zinc-950/40">{row.day}</td>
                      
                      {/* Period 1 */}
                      <td className="py-3 px-4">
                        {isClashSimulated && idx === 0 ? (
                          <div className="p-2 rounded-lg bg-zinc-900 border border-white text-white font-mono animate-pulse">
                            <div className="font-bold text-[11px] flex items-center justify-between">
                              <span>CLASH: CL-101</span>
                              <span className="text-[9px] bg-white text-black px-1 rounded">2 BOOKINGS</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">Prof. Sharma / Prof. Patel</div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                            <div className="font-mono font-bold text-white text-[11px] flex justify-between">
                              <span>{row.p1.code}</span>
                              <span className="text-[9px] text-zinc-400 font-normal">{row.p1.room}</span>
                            </div>
                            <div className="text-[10px] text-zinc-300 truncate mt-0.5">{row.p1.title}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">{row.p1.faculty}</div>
                          </div>
                        )}
                      </td>

                      {/* Period 2 */}
                      <td className="py-3 px-4">
                        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                          <div className="font-mono font-bold text-white text-[11px] flex justify-between">
                            <span>{row.p2.code}</span>
                            <span className="text-[9px] text-zinc-400 font-normal">{row.p2.room}</span>
                          </div>
                          <div className="text-[10px] text-zinc-300 truncate mt-0.5">{row.p2.title}</div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">{row.p2.faculty}</div>
                        </div>
                      </td>

                      {/* Period 3 */}
                      <td className="py-3 px-4">
                        <div className={`p-2 rounded-lg border transition-colors ${
                          row.p3.type === 'study'
                            ? 'bg-zinc-900/40 border-zinc-800'
                            : 'bg-zinc-950 border-zinc-800/80'
                        }`}>
                          <div className="font-mono font-bold text-white text-[11px] flex justify-between">
                            <span>{row.p3.code}</span>
                            <span className="text-[9px] text-zinc-400 font-normal">{row.p3.room}</span>
                          </div>
                          <div className="text-[10px] text-zinc-300 truncate mt-0.5">{row.p3.title}</div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">{row.p3.faculty}</div>
                        </div>
                      </td>

                      {/* Lunch Separator */}
                      <td className="py-3 px-4 text-center bg-zinc-950/60 text-zinc-600 font-mono text-[10px] uppercase">
                        Lunch
                      </td>

                      {/* Period 4 */}
                      <td className="py-3 px-4">
                        <div className={`p-2 rounded-lg border transition-colors ${
                          row.p4.type === 'lab'
                            ? 'bg-zinc-900/80 border-zinc-700'
                            : 'bg-zinc-950 border-zinc-800/80'
                        }`}>
                          <div className="font-mono font-bold text-white text-[11px] flex justify-between">
                            <span>{row.p4.code}</span>
                            <span className="text-[9px] text-zinc-300 font-mono">{row.p4.room}</span>
                          </div>
                          <div className="text-[10px] text-zinc-200 truncate mt-0.5">{row.p4.title}</div>
                          <div className="text-[9px] text-zinc-400 mt-0.5 flex justify-between">
                            <span>{row.p4.faculty}</span>
                            {row.p4.type === 'lab' && <span className="font-mono text-[8px] bg-white/10 px-1 rounded">2H LAB</span>}
                          </div>
                        </div>
                      </td>

                      {/* Period 5 */}
                      <td className="py-3 px-4">
                        <div className={`p-2 rounded-lg border transition-colors ${
                          row.p5.type === 'lab'
                            ? 'bg-zinc-900/80 border-zinc-700'
                            : 'bg-zinc-950 border-zinc-800/80'
                        }`}>
                          <div className="font-mono font-bold text-white text-[11px] flex justify-between">
                            <span>{row.p5.code}</span>
                            <span className="text-[9px] text-zinc-300 font-mono">{row.p5.room}</span>
                          </div>
                          <div className="text-[10px] text-zinc-200 truncate mt-0.5">{row.p5.title}</div>
                          <div className="text-[9px] text-zinc-400 mt-0.5 flex justify-between">
                            <span>{row.p5.faculty}</span>
                            {row.p5.type === 'lab' && <span className="font-mono text-[8px] bg-white/10 px-1 rounded">2H LAB</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Footer Bar */}
            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 flex flex-wrap items-center justify-between text-xs text-zinc-400 gap-4">
              <div className="flex items-center gap-6 text-[11px] font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded border border-zinc-700 bg-zinc-950 inline-block" />
                  <span>Theory Lecture (1h)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded border border-zinc-500 bg-zinc-800 inline-block" />
                  <span>Continuous Lab (2h Atomic)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded border border-zinc-800 bg-zinc-900 inline-block" />
                  <span>NEP 2020 Study (PRJ/SDA)</span>
                </span>
              </div>
              <button
                onClick={handleLaunch}
                className="text-white hover:text-zinc-300 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>Open Full Interactive Canvas</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Product Capabilities Showcase (Pure Code Animated UI) ── */}
      <section id="features" className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Platform Capabilities</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered for Academic Reality
          </h2>
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            Eliminate the weeks of guesswork and departmental politics. TimeGrid guarantees mathematical precision across all constraints.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {[
            { id: 'solver', label: 'Collision Solver', icon: ShieldCheck },
            { id: 'workload', label: 'Faculty Load Balance', icon: Users },
            { id: 'labs', label: '2-Hour Lab Protection', icon: Clock },
            { id: 'export', label: 'Official Print Sheets', icon: FileSpreadsheet },
            { id: 'nep', label: 'NEP 2020 Alignment', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFeatureTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFeatureTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Functional UI Demonstrator Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-2xl">
          {activeFeatureTab === 'solver' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black border border-zinc-800 text-[10px] font-mono text-zinc-400 mb-4">
                  <span>DETERMINISTIC CONSTRAINT SAT</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">Cross-Department Conflict Prevention</h3>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  When a professor teaches across Computer Engineering and Information Technology, traditional tools frequently cause scheduling overlap.
                  TimeGrid manages a unified global matrix where an instructor is instantaneously locked across all institutional entities.
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Real-time cross-branch teacher verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Physical room double-booking prevention</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Max 3 consecutive lecture constraint to avoid faculty burnout</span>
                  </div>
                </div>
              </div>

              {/* Functional Mini Solver Animation Container */}
              <div className="p-6 rounded-xl bg-black border border-zinc-800 font-mono text-xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 text-zinc-400 text-[11px]">
                  <span>GLOBAL MATRIX VERIFICATION</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    PASSING ALL CONSTRAINTS
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between items-center">
                    <span className="text-zinc-300">Faculty Overlap Check</span>
                    <span className="text-white font-bold">0 Violations</span>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between items-center">
                    <span className="text-zinc-300">Classroom Occupancy Rate</span>
                    <span className="text-white font-bold">92.4% Optimal</span>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between items-center">
                    <span className="text-zinc-300">Continuous 2h Lab Blocks</span>
                    <span className="text-white font-bold">100% Satisfied</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'workload' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black border border-zinc-800 text-[10px] font-mono text-zinc-400 mb-4">
                  <span>EQUILIBRIUM ENGINE</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">Equitable 16-Hour Faculty Workload</h3>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  Eliminates departmental disputes by mathematically balancing weekly teaching allocations.
                  Enforces an institutional 16-hour weekly baseline target with a strict 20-hour maximum weekly ceiling.
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Transparent workload telemetry for academic audits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Balanced ratio between practical labs and theory lectures</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Customizable minimum free period buffers per day</span>
                  </div>
                </div>
              </div>

              {/* Functional Live Workload Bar Visualizer */}
              <div className="p-6 rounded-xl bg-black border border-zinc-800 font-mono text-xs space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-3 text-[11px] text-zinc-400">
                  <span>FACULTY ALLOCATION AUDIT</span>
                  <span className="text-zinc-300 font-bold">TARGET: 16H / WK</span>
                </div>
                <div className="space-y-2.5 pt-1">
                  {sampleFacultyWorkloads.slice(0, 5).map((fac, i) => (
                    <div key={i} className="text-[11px]">
                      <div className="flex justify-between text-zinc-300 mb-1">
                        <span>{fac.name}</span>
                        <span className="text-white font-bold">{fac.hours}h / wk</span>
                      </div>
                      <div className="w-full h-2 rounded bg-zinc-900 overflow-hidden relative">
                        <div
                          className="h-full bg-white transition-all duration-500"
                          style={{ width: `${(fac.hours / 20) * 100}%` }}
                        />
                        {/* 16h Target Marker Line */}
                        <div className="absolute top-0 bottom-0 left-[80%] w-[1px] bg-zinc-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'labs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black border border-zinc-800 text-[10px] font-mono text-zinc-400 mb-4">
                  <span>PRACTICAL CONTINUITY</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">2-Hour Continuous Lab Sequences</h3>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  Engineering practical sessions require uninterrupted flow for hardware setups, coding builds, and demonstrations.
                  TimeGrid treats laboratory curricula as atomic 2-period contiguous blocks inside designated specialized facilities.
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Specialized lab facility mapping (Cloud, AI/ML, Hardware)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Guaranteed 8 hours weekly practical work per cohort</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Prevention of fragmented single-period practicals</span>
                  </div>
                </div>
              </div>

              {/* Functional Lab Block Representation */}
              <div className="p-6 rounded-xl bg-black border border-zinc-800 font-mono text-xs space-y-4">
                <div className="border-b border-zinc-900 pb-3 flex justify-between text-[11px] text-zinc-400">
                  <span>LABORATORY SEQUENCE COMPARISON</span>
                  <span className="text-white">ATOMIC CONSTRAINT</span>
                </div>
                <div className="space-y-3 text-[11px]">
                  <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                    <div className="text-zinc-400 text-[10px] uppercase">Traditional Manual Schedulers (Fragmented)</div>
                    <div className="flex gap-2 mt-2">
                      <span className="p-1.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 text-center flex-1">1h Lab</span>
                      <span className="p-1.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 text-center flex-1">Theory</span>
                      <span className="p-1.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 text-center flex-1">1h Lab (Split)</span>
                    </div>
                  </div>
                  <div className="p-3 rounded bg-zinc-950 border border-white">
                    <div className="text-white text-[10px] font-bold uppercase flex items-center justify-between">
                      <span>TimeGrid Protected Sequence</span>
                      <span className="bg-white text-black px-1.5 py-0.5 rounded text-[9px]">ENFORCED</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <span className="p-2 rounded bg-zinc-900 text-white font-bold border border-zinc-700 text-center">Period 4 (Lab Part 1)</span>
                      <span className="p-2 rounded bg-zinc-900 text-white font-bold border border-zinc-700 text-center">Period 5 (Lab Part 2)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'export' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black border border-zinc-800 text-[10px] font-mono text-zinc-400 mb-4">
                  <span>OFFICIAL PUBLISHING</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">One-Click Noticeboard & Slip Publishing</h3>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  Eliminate days of reformatting Excel files. Generate institutional noticeboard charts, individual faculty workload slips, and room occupancy schedules ready for high-resolution print.
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Institutional header with college crest & sign-off fields</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Print-optimized landscape styles with zero margin clipping</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>High-resolution PDF & Excel spreadsheet exports</span>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => handleLaunch('/export')}
                    className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-mono font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2"
                  >
                    <span>Open Export Portal</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Functional Print Sheet Replica */}
              <div className="p-6 rounded-xl bg-black border border-zinc-800 font-mono text-[10px] space-y-3">
                <div className="text-center border-b border-zinc-900 pb-3">
                  <div className="font-bold text-white uppercase text-[11px]">COLLEGE OF ENGINEERING & TECHNOLOGY</div>
                  <div className="text-zinc-500">ACADEMIC YEAR 2026-2027 • SEMESTER IV</div>
                </div>
                <div className="border border-zinc-800 rounded p-2 text-zinc-300 space-y-1">
                  <div className="flex justify-between border-b border-zinc-900 pb-1">
                    <span className="font-bold text-white">COHORT: 4CE-A</span>
                    <span>ROOM: LH-101</span>
                    <span>COUNSELOR: DR. SHARMA</span>
                  </div>
                  <div className="text-zinc-400 pt-1">
                    [ Mon–Fri Schedule Matrix Verified 0 Clashes ]
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-600 pt-2 border-t border-zinc-900">
                  <span>HOD SIGNATURE: ________________</span>
                  <span>DEAN APPROVAL: ________________</span>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'nep' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black border border-zinc-800 text-[10px] font-mono text-zinc-400 mb-4">
                  <span>NATIONAL EDUCATION POLICY</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">NEP 2020 Multi-Track Distribution</h3>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  NEP 2020 mandates flexible self-study, research projects, and skill development activities.
                  TimeGrid distributes 4 hours PRJ and 5 hours SDA across weekdays without overloading faculty teaching workloads.
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Non-faculty bound independent student study slots</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>Even weekday distribution preventing student idle clumps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-white" />
                    <span>AICTE & UGC curricular framework compliance</span>
                  </div>
                </div>
              </div>

              {/* Functional NEP Structure Card */}
              <div className="p-6 rounded-xl bg-black border border-zinc-800 font-mono text-xs space-y-3">
                <div className="border-b border-zinc-900 pb-3 flex justify-between text-[11px] text-zinc-400">
                  <span>WEEKLY CREDIT RATIO AUDIT</span>
                  <span className="text-white">NEP 2020 COMPLIANT</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between">
                    <span className="text-zinc-400">Core Theory Lectures</span>
                    <span className="text-white font-bold">13 Hours / Wk</span>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between">
                    <span className="text-zinc-400">Continuous Practical Labs</span>
                    <span className="text-white font-bold">8 Hours / Wk</span>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between">
                    <span className="text-zinc-400">Skill Development (SDA)</span>
                    <span className="text-white font-bold">5 Hours / Wk</span>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-950 border border-zinc-900 flex justify-between">
                    <span className="text-zinc-400">Capstone Project (PRJ)</span>
                    <span className="text-white font-bold">4 Hours / Wk</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Interactive Campus ROI & Hours Calculator ── */}
      <section id="calculator" className="relative z-10 py-20 bg-zinc-950 border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Campus ROI Calculator</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Quantify Administrative Time & Financial Savings
            </h2>
            <p className="text-xs text-zinc-400 mt-2">
              Adjust the sliders below to calculate the hours saved across your academic departments.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-black border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
            {/* Sliders Area */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs font-mono text-zinc-300 mb-2">
                  <span>FACULTY COUNT</span>
                  <span className="text-white font-bold">{calcFaculty} Professors</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={calcFaculty}
                  onChange={(e) => setCalcFaculty(Number(e.target.value))}
                  className="w-full accent-white bg-zinc-900 h-2 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-mono text-zinc-300 mb-2">
                  <span>STUDENT COHORTS / DIVISIONS</span>
                  <span className="text-white font-bold">{calcDivisions} Cohorts</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="40"
                  value={calcDivisions}
                  onChange={(e) => setCalcDivisions(Number(e.target.value))}
                  className="w-full accent-white bg-zinc-900 h-2 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-mono text-zinc-300 mb-2">
                  <span>WEEKLY LAB HOURS TO COORDINATE</span>
                  <span className="text-white font-bold">{calcLabHours} Hours</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={calcLabHours}
                  onChange={(e) => setCalcLabHours(Number(e.target.value))}
                  className="w-full accent-white bg-zinc-900 h-2 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="border-b border-zinc-900 pb-5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Faculty Hours Saved / Semester</div>
                <div className="text-4xl font-mono font-bold text-white mt-1">
                  {calculatedHoursSaved} Hours
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Reclaims ~{Math.round(calculatedHoursSaved / 8)} full committee working days.
                </div>
              </div>

              <div className="border-b border-zinc-900 pb-5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Institutional Cost Reduction</div>
                <div className="text-3xl font-mono font-bold text-white mt-1">
                  ${calculatedDollarSavings}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Based on standard academic coordinator compensation.
                </div>
              </div>

              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Turnaround Speedup</div>
                <div className="text-xl font-mono text-zinc-300 mt-1 flex items-center gap-2">
                  <span className="line-through text-zinc-600">{turnaroundDays} Days</span>
                  <ArrowRight size={14} className="text-white" />
                  <span className="text-white font-bold">Under 15 Seconds</span>
                </div>
              </div>

              <button
                onClick={handleLaunch}
                className="w-full py-3 rounded-full bg-white text-black font-mono font-bold text-xs hover:bg-zinc-200 transition-colors"
              >
                Launch Workspace
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Head-to-Head Comparison Table ── */}
      <section id="comparison" className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Industry Comparison</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Manual Spreadsheets vs. TimeGrid
          </h2>
          <p className="text-sm text-zinc-400 mt-3">
            Why leading engineering faculties retire legacy spreadsheet methods for TimeGrid.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black border-b border-zinc-800 font-mono text-zinc-300">
                  <th className="py-4 px-6 font-bold w-1/3">CAPABILITY</th>
                  <th className="py-4 px-6 text-center text-zinc-500">MANUAL EXCEL SPREADSHEETS</th>
                  <th className="py-4 px-6 text-center text-zinc-500">LEGACY DESKTOP SOFTWARE</th>
                  <th className="py-4 px-6 text-center text-white bg-zinc-900 font-bold border-x border-zinc-800">
                    TIMEGRID ENTERPRISE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-mono text-zinc-300">
                <tr className="hover:bg-zinc-900/30">
                  <td className="py-4 px-6 font-bold text-white font-sans">
                    Cross-Department Collision Solver
                    <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">Locks shared faculty across branches</span>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-600"><X size={15} className="inline mr-1" /> Frequent Clashes</td>
                  <td className="py-4 px-6 text-center text-zinc-500">Manual Verification</td>
                  <td className="py-4 px-6 text-center text-white bg-zinc-900 border-x border-zinc-800 font-bold">
                    <Check size={15} className="inline mr-1 text-white" /> 100% Conflict-Free
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="py-4 px-6 font-bold text-white font-sans">
                    Continuous 2-Hour Practical Lab Sequences
                    <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">Indivisible 2-period atomic blocks</span>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-600"><X size={15} className="inline mr-1" /> Arbitrary Splits</td>
                  <td className="py-4 px-6 text-center text-zinc-500">Often Fragmented</td>
                  <td className="py-4 px-6 text-center text-white bg-zinc-900 border-x border-zinc-800 font-bold">
                    <Check size={15} className="inline mr-1 text-white" /> Guaranteed Contiguous
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="py-4 px-6 font-bold text-white font-sans">
                    16-Hour Faculty Load Balancing
                    <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">Fair distribution with 20h cap</span>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-600"><X size={15} className="inline mr-1" /> Departmental Disputes</td>
                  <td className="py-4 px-6 text-center text-zinc-500">Basic Counting Only</td>
                  <td className="py-4 px-6 text-center text-white bg-zinc-900 border-x border-zinc-800 font-bold">
                    <Check size={15} className="inline mr-1 text-white" /> Equilibrium Algorithm
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="py-4 px-6 font-bold text-white font-sans">
                    NEP 2020 Study Distribution
                    <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">Skill (SDA) & Project (PRJ) slots</span>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-600"><X size={15} className="inline mr-1" /> Not Supported</td>
                  <td className="py-4 px-6 text-center text-zinc-600"><X size={15} className="inline mr-1" /> Not Supported</td>
                  <td className="py-4 px-6 text-center text-white bg-zinc-900 border-x border-zinc-800 font-bold">
                    <Check size={15} className="inline mr-1 text-white" /> Native NEP 2020 Engine
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="py-4 px-6 font-bold text-white font-sans">
                    Semester Solve Speed
                    <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">Time to draft conflict-free schedules</span>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-500">2 to 3 Weeks</td>
                  <td className="py-4 px-6 text-center text-zinc-500">3 to 5 Days</td>
                  <td className="py-4 px-6 text-center text-white bg-zinc-900 border-x border-zinc-800 font-bold">
                    Under 15 Seconds
                  </td>
                </tr>
                <tr className="hover:bg-zinc-900/30">
                  <td className="py-4 px-6 font-bold text-white font-sans">
                    Printable Noticeboard Sheets
                    <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">Official faculty slips & classroom charts</span>
                  </td>
                  <td className="py-4 px-6 text-center text-zinc-500">Hours of Reformatting</td>
                  <td className="py-4 px-6 text-center text-zinc-500">Basic Text Tables</td>
                  <td className="py-4 px-6 text-center text-white bg-zinc-900 border-x border-zinc-800 font-bold">
                    <Check size={15} className="inline mr-1 text-white" /> High-Resolution PDF
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Institutional Pricing / Deployment Tiers ── */}
      <section id="pricing" className="relative z-10 py-24 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Institutional Licensing</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Transparent Deployment Tiers
            </h2>
            <p className="text-sm text-zinc-400 mt-3">
              Deploy on your campus intranet or private institutional cloud.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Department Tier */}
            <div className="p-8 rounded-2xl bg-black border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">COMMUNITY ACADEMIC</div>
                <h3 className="text-xl font-bold text-white mt-1">Single Department</h3>
                <div className="text-3xl font-mono font-bold text-white mt-4">$0 <span className="text-xs font-normal text-zinc-500">/ Open License</span></div>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  Ideal for a single engineering department managing up to 10 student divisions.
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Up to 25 Faculty Members</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> 10 Student Cohorts</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Conflict Resolution Solver</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> PDF Noticeboard Export</div>
                </div>
              </div>
              <button
                onClick={handleLaunch}
                className="mt-8 w-full py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold transition-colors border border-zinc-800"
              >
                Launch Department Free
              </button>
            </div>

            {/* Campus Tier - Highlighted */}
            <div className="p-8 rounded-2xl bg-zinc-900 border-2 border-white relative flex flex-col justify-between shadow-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-black text-[9px] font-mono font-bold uppercase tracking-wider">
                RECOMMENDED FOR COLLEGES
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">COLLEGE LICENSE</div>
                <h3 className="text-xl font-bold text-white mt-1">Full Engineering Campus</h3>
                <div className="text-3xl font-mono font-bold text-white mt-4">$490 <span className="text-xs font-normal text-zinc-400">/ semester</span></div>
                <p className="text-xs text-zinc-300 mt-3 leading-relaxed">
                  Complete institutional management across all engineering branches (CE, IT, CSE, Mech, Civil).
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-white">
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Unlimited Faculty & Rooms</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> All Engineering Cohorts</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> NEP 2020 SDA & PRJ Distribution</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Official Noticeboard & Slip Suite</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Multi-User Role-Based Access</div>
                </div>
              </div>
              <button
                onClick={handleLaunch}
                className="mt-8 w-full py-3 rounded-full bg-white text-black font-mono font-bold text-xs hover:bg-zinc-200 transition-all shadow-md"
              >
                Deploy Campus Platform
              </button>
            </div>

            {/* University System Tier */}
            <div className="p-8 rounded-2xl bg-black border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">MULTI-CAMPUS SYSTEM</div>
                <h3 className="text-xl font-bold text-white mt-1">University System</h3>
                <div className="text-3xl font-mono font-bold text-white mt-4">Custom <span className="text-xs font-normal text-zinc-500">/ SLA</span></div>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  For university systems with multiple constituent colleges, dedicated VPC, and SIS/ERP integration.
                </p>
                <div className="mt-6 space-y-3 font-mono text-xs text-zinc-300">
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Multi-Campus Federated Database</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Campus ERP & SIS Synchronizer</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Custom Institutional SAT Constraints</div>
                  <div className="flex items-center gap-2"><Check size={14} className="text-white" /> Dedicated Systems Engineer</div>
                </div>
              </div>
              <button
                onClick={handleLaunch}
                className="mt-8 w-full py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-xs font-bold transition-colors border border-zinc-800"
              >
                Contact Academic Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Accordion ── */}
      <section id="faq" className="relative z-10 py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Answers for Administrators</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-xs font-bold text-zinc-200 hover:text-white transition-colors"
                >
                  <span className="text-sm font-sans">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900 pt-3 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── High-Impact Bottom Call to Action ── */}
      <section className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto">
            Ready to Eliminate Academic Scheduling Collisions?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 max-w-xl mx-auto leading-relaxed font-normal">
            Automate your semester timetable with continuous constraint satisfaction and instant noticeboard publishing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleLaunch}
              className="px-8 py-3.5 rounded-full text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/5 flex items-center gap-2"
            >
              <span>Launch Timetable Platform</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => handleLaunch('/export')}
              className="px-6 py-3.5 rounded-full text-xs font-medium bg-black text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            >
              <span>Official Noticeboard Portal</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Pure Monochrome Minimalist Footer ── */}
      <footer className="relative z-10 bg-black border-t border-zinc-900 pt-16 pb-12 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <BrandLogo size="md" light={true} />
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed font-sans">
                Autonomous academic timetable operating system engineered for engineering faculties, colleges, and polytechnic institutes.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>SOLVER ENGINE ONLINE</span>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">Core Modules</div>
              <ul className="space-y-2 text-zinc-400 font-sans">
                <li><a href="#demo" className="hover:text-white transition-colors">Interactive Division Sandbox</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Continuous 2-Hour Labs</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Faculty Load Balancing</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">NEP 2020 Study Slots</a></li>
                <li><a href="#export" className="hover:text-white transition-colors">Noticeboard Export Portal</a></li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">Compliance & Standards</div>
              <ul className="space-y-2 text-zinc-400 font-sans">
                <li>NEP 2020 Curricular Framework</li>
                <li>AICTE Faculty Workload Guidelines</li>
                <li>NAAC Accreditation Telemetry</li>
                <li>Atomic Laboratory Sequences</li>
                <li>Zero-Collision Saturation SAT</li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-white mb-3">Institutional Reference</div>
              <p className="text-zinc-400 text-xs leading-relaxed font-sans">
                Chhotubhai Gopalbhai Patel Institute of Technology<br />
                Department of Computer Engineering & IT<br />
                Uka Tarsadia University
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-600">
            <div>
              © 2026 TIMEGRID PLATFORM INC. ALL RIGHTS RESERVED.
            </div>
            <div className="flex items-center gap-6">
              <span className="hover:text-zinc-400 cursor-pointer">PRIVACY</span>
              <span className="hover:text-zinc-400 cursor-pointer">TERMS</span>
              <span className="hover:text-zinc-400 cursor-pointer">SECURITY</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
