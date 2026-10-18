import {
  SEMESTERS_DATA,
  ROOMS_DATA,
  SUBJECTS_BY_BRANCH,
  FACULTY_BY_BRANCH,
} from './seedData.js';

// Pre-constructed robust fallback records with consistent IDs
export const FALLBACK_ROOMS = ROOMS_DATA.map((r, i) => ({
  id: `room-${i + 1}`,
  _id: `room-${i + 1}`,
  name: r.name,
  room_type: r.room_type,
  capacity: r.capacity,
  building: r.building,
}));

export const FALLBACK_SEMESTERS = SEMESTERS_DATA.map((s, i) => ({
  id: `sem-${s.number}`,
  _id: `sem-${s.number}`,
  number: s.number,
  name: s.name,
  term: s.term,
  academic_year: s.academic_year,
}));

export const FALLBACK_SUBJECTS = [];
Object.entries(SUBJECTS_BY_BRANCH).forEach(([branch, subjects]) => {
  subjects.forEach((s, idx) => {
    FALLBACK_SUBJECTS.push({
      id: `sub-${s.code}`,
      _id: `sub-${s.code}`,
      name: s.name,
      code: s.code,
      branch,
      subject_type: s.subject_type,
      credit_hours: s.credit_hours,
      theory_hours_per_week: s.theory_hours_per_week,
      theory_session_duration: 1,
      lab_hours_per_week: s.lab_hours_per_week,
      lab_session_duration: 2,
      required_room_type: s.subject_type === 'PRACTICAL' || s.lab_hours_per_week > 0 ? 'LAB' : 'CLASSROOM',
    });
  });
});

export const FALLBACK_TEACHERS = [];
Object.entries(FACULTY_BY_BRANCH).forEach(([branch, teachers]) => {
  teachers.forEach((t, idx) => {
    const code = t.employee_id || t.code || `${branch.slice(0, 2).toUpperCase()}${String(idx + 1).padStart(3, '0')}`;
    const uniqueId = `teacher-${code.toLowerCase()}`;
    FALLBACK_TEACHERS.push({
      id: uniqueId,
      _id: uniqueId,
      name: t.name,
      employee_id: code,
      branch,
      designation: t.designation || 'Assistant Professor',
      max_weekly_hours: t.max_weekly_hours || 20,
      target_weekly_hours: t.target_weekly_hours || 16,
      assigned_theory_hours: 12,
      assigned_lab_hours: 4,
    });
  });
});

export const FALLBACK_CLASS_GROUPS = [
  { id: 'div-4ce-a', _id: 'div-4ce-a', name: '4CE-A', branch: 'Computer Engineering', semester: 4, student_capacity: 60 },
  { id: 'div-4ce-b', _id: 'div-4ce-b', name: '4CE-B', branch: 'Computer Engineering', semester: 4, student_capacity: 60 },
  { id: 'div-4it-a', _id: 'div-4it-a', name: '4IT-A', branch: 'Information Technology', semester: 4, student_capacity: 60 },
  { id: 'div-4it-b', _id: 'div-4it-b', name: '4IT-B', branch: 'Information Technology', semester: 4, student_capacity: 60 },
  { id: 'div-4cse-a', _id: 'div-4cse-a', name: '4CSE-A', branch: 'Computer Science', semester: 4, student_capacity: 60 },
  { id: 'div-6ce-a', _id: 'div-6ce-a', name: '6CE-A', branch: 'Computer Engineering', semester: 6, student_capacity: 60 },
  { id: 'div-6it-a', _id: 'div-6it-a', name: '6IT-A', branch: 'Information Technology', semester: 6, student_capacity: 60 },
  { id: 'div-6cse-a', _id: 'div-6cse-a', name: '6CSE-A', branch: 'Computer Science', semester: 6, student_capacity: 60 },
];
