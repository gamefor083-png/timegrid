import React, { createContext, useContext, useState, useEffect } from 'react';

export type InstitutionMode = 'university' | 'school';

interface TerminologyTerms {
  institution: string;
  department: string;
  departments: string;
  program: string;
  programs: string;
  semester: string;
  semesters: string;
  class: string;
  classes: string;
  batch: string;
  batches: string;
  teacher: string;
  teachers: string;
  subject: string;
  subjects: string;
  slot: string;
  slots: string;
  head: string;
  director: string;
  coordinator: string;
}

const UNIVERSITY_TERMS: TerminologyTerms = {
  institution: 'University / College',
  department: 'Department',
  departments: 'Departments',
  program: 'Degree Program',
  programs: 'Programs',
  semester: 'Semester',
  semesters: 'Semesters',
  class: 'Class / Division',
  classes: 'Classes',
  batch: 'Batch / Practical Group',
  batches: 'Batches',
  teacher: 'Faculty / Professor',
  teachers: 'Faculty Members',
  subject: 'Course / Subject',
  subjects: 'Courses',
  slot: 'Period / Slot',
  slots: 'Time Slots',
  head: 'Head of Department (HOD)',
  director: 'Director / Dean',
  coordinator: 'Timetable Coordinator',
};

const SCHOOL_TERMS: TerminologyTerms = {
  institution: 'School',
  department: 'Academic Wing',
  departments: 'Wings',
  program: 'Curriculum Board',
  programs: 'Boards',
  semester: 'Term / Grade',
  semesters: 'Terms',
  class: 'Grade & Section',
  classes: 'Grades / Sections',
  batch: 'Section / House',
  batches: 'Sections',
  teacher: 'Teacher',
  teachers: 'Teachers',
  subject: 'Subject',
  subjects: 'Subjects',
  slot: 'Period',
  slots: 'Periods',
  head: 'Head Teacher / Wing Head',
  director: 'Principal',
  coordinator: 'Class Teacher',
};

interface TerminologyContextType {
  mode: InstitutionMode;
  setMode: (mode: InstitutionMode) => void;
  toggleMode: () => void;
  terms: TerminologyTerms;
  isUniversity: boolean;
}

const TerminologyContext = createContext<TerminologyContextType | undefined>(undefined);

export function TerminologyProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<InstitutionMode>(() => {
    const saved = localStorage.getItem('tg_mode');
    return (saved === 'school' ? 'school' : 'university') as InstitutionMode;
  });

  const setMode = (newMode: InstitutionMode) => {
    setModeState(newMode);
    localStorage.setItem('tg_mode', newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'university' ? 'school' : 'university');
  };

  const terms = mode === 'university' ? UNIVERSITY_TERMS : SCHOOL_TERMS;

  return (
    <TerminologyContext.Provider value={{
      mode,
      setMode,
      toggleMode,
      terms,
      isUniversity: mode === 'university'
    }}>
      {children}
    </TerminologyContext.Provider>
  );
}

export function useTerminology() {
  const context = useContext(TerminologyContext);
  if (!context) {
    throw new Error('useTerminology must be used within a TerminologyProvider');
  }
  return context;
}
