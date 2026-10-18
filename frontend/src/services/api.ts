import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://backend-eight-woad-9ybl4p5nji.vercel.app/api/v1'
    : 'http://localhost:5000/api/v1');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
});

export interface AutoGeneratePresetPayload {
  division_ids?: string[];
  preset_name?: string;
  seed?: number;
  working_days?: string[];
  time_slots?: any[];
  max_consecutive?: number;
  min_free_per_day?: number;
}

export interface TimetablePresetSummary {
  id: string;
  name: string;
  version_number: number;
  quality: {
    overall_score?: number;
    grade?: string;
    subscores?: Record<string, number>;
  };
  stats?: any;
  division_count: number;
  created_at: string;
  status: string;
}

export interface TimetablePresetDetail {
  id: string;
  name: string;
  version_number: number;
  timetables: Record<string, any[][]>;
  quality: any;
  stats: any;
  config?: any;
  created_at: string;
}

export const ApiService = {
  // ── Auto-Generate Presets (Python Backend) ──
  autoGeneratePreset: async (payload: AutoGeneratePresetPayload = {}) => {
    const res = await api.post('/timetable/auto-generate', payload);
    return res.data;
  },

  getTimetablePresets: async (): Promise<TimetablePresetSummary[]> => {
    const res = await api.get('/timetable/presets');
    return res.data;
  },

  getTimetablePreset: async (presetId: string): Promise<TimetablePresetDetail> => {
    const res = await api.get(`/timetable/presets/${presetId}`);
    return res.data;
  },

  deleteTimetablePreset: async (presetId: string) => {
    const res = await api.delete(`/timetable/presets/${presetId}`);
    return res.data;
  },

  // ── Timetable Engine ──
  generateTimetable: async (config: any, classes: any[]) => {
    const res = await api.post('/timetable/generate', { config, classes });
    return res.data;
  },
  generateTimetableFromDb: async (orgId = 'default', classIds?: string[]) => {
    const res = await api.post(`/timetable/generate-from-db?org_id=${orgId}`, {
      class_ids: classIds
    });
    return res.data;
  },

  getCurrentTimetable: async () => {
    const res = await api.get('/timetable/current');
    return res.data;
  },

  updateCell: async (data: {
    class_id: string;
    day_index: number;
    slot_index: number;
    subject_id?: string | null;
    subject_name?: string;
    type?: string;
    teacher?: string;
    room?: string;
    is_continuation?: boolean;
    is_locked?: boolean;
  }) => {
    const res = await api.post('/timetable/update-cell', data);
    return res.data;
  },

  getMetadata: async () => {
    const res = await api.get('/timetable/metadata');
    return res.data;
  },

  updateMetadata: async (metadata: any) => {
    const res = await api.post('/timetable/metadata', metadata);
    return res.data;
  },

  getConflicts: async () => {
    const res = await api.get('/timetable/conflicts');
    return res.data.conflicts;
  },

  getTeacherConstraints: async (teacherId: string) => {
    const res = await api.get(`/timetable/constraints/teacher/${teacherId}`);
    return res.data;
  },

  setTeacherConstraints: async (teacherId: string, blockedSlots: {day: number, slot: number}[]) => {
    const res = await api.post(`/timetable/constraints/teacher/${teacherId}`, { blocked_slots: blockedSlots });
    return res.data;
  },

  getUnassignedActivities: async (classId: string) => {
    const res = await api.get(`/timetable/unassigned/${classId}`);
    return res.data;
  },

  manualPlaceActivity: async (classId: string, activityId: string, dayIndex: number, slotIndex: number) => {
    const res = await api.post('/timetable/manual-place', { class_id: classId, activity_id: activityId, day_index: dayIndex, slot_index: slotIndex });
    return res.data;
  },
  
  getPlacementSuggestions: async (classId: string, activityId: string) => {
    const res = await api.get(`/timetable/suggestions/${classId}/${activityId}`);
    return res.data.suggestions;
  },
  
  swapSlots: async (classId: string, fromDay: number, fromSlot: number, toDay: number, toSlot: number) => {
    const res = await api.post('/timetable/swap', {
      class_id: classId,
      from_day: fromDay,
      from_slot: fromSlot,
      to_day: toDay,
      to_slot: toSlot
    });
    return res.data;
  },

  validatePlacement: async (data: {
    class_id: string;
    day_index: number;
    slot_index: number;
    teacher?: string;
    room?: string;
    duration?: number;
  }) => {
    const res = await api.post('/timetable/validate-placement', data);
    return res.data;
  },

  smartSuggest: async (data: {
    class_id: string;
    teacher?: string;
    room?: string;
    duration?: number;
  }) => {
    const res = await api.post('/timetable/smart-suggest', data);
    return res.data.suggestions;
  },

  autoFillRemaining: async (classId: string) => {
    const res = await api.post('/timetable/auto-fill-remaining', { class_id: classId });
    return res.data;
  },

  toggleLockSlot: async (classId: string, dayIndex: number, slotIndex: number, isLocked: boolean) => {
    const res = await api.post('/timetable/lock-slot', {
      class_id: classId,
      day_index: dayIndex,
      slot_index: slotIndex,
      is_locked: isLocked
    });
    return res.data;
  },

  clearGrid: async (classId: string, mode: 'all' | 'unlocked' | 'day' = 'unlocked', dayIndex?: number) => {
    const res = await api.post('/timetable/clear-grid', {
      class_id: classId,
      mode,
      day_index: dayIndex
    });
    return res.data;
  },

  getFacultyWorkload: async () => {
    const res = await api.get('/timetable/faculty-workload');
    return res.data.faculty_workload;
  },

  getFacultyAnalysis: async (teacherIdentifier: string, presetId?: string) => {
    const url = presetId
      ? `/timetable/faculty-analysis/${encodeURIComponent(teacherIdentifier)}?preset_id=${encodeURIComponent(presetId)}`
      : `/timetable/faculty-analysis/${encodeURIComponent(teacherIdentifier)}`;
    const res = await api.get(url);
    return res.data;
  },

  getRoomAvailabilityMatrix: async () => {
    const res = await api.get('/timetable/room-availability');
    return res.data;
  },

  // ── Teachers ──
  getTeachers: async () => {
    const res = await api.get('/teachers');
    return res.data;
  },
  createTeacher: async (data: any) => {
    const res = await api.post('/teachers', data);
    return res.data;
  },
  updateTeacher: async (id: string, data: any) => {
    const res = await api.put(`/teachers/${id}`, data);
    return res.data;
  },
  deleteTeacher: async (id: string) => {
    const res = await api.delete(`/teachers/${id}`);
    return res.data;
  },

  // ── Subjects ──
  getSubjects: async () => {
    const res = await api.get('/subjects');
    return res.data;
  },
  createSubject: async (data: any) => {
    const res = await api.post('/subjects', data);
    return res.data;
  },
  updateSubject: async (id: string, data: any) => {
    const res = await api.put(`/subjects/${id}`, data);
    return res.data;
  },
  deleteSubject: async (id: string) => {
    const res = await api.delete(`/subjects/${id}`);
    return res.data;
  },

  // ── Rooms ──
  getRooms: async () => {
    const res = await api.get('/rooms');
    return res.data;
  },
  createRoom: async (data: any) => {
    const res = await api.post('/rooms', data);
    return res.data;
  },
  updateRoom: async (id: string, data: any) => {
    const res = await api.put(`/rooms/${id}`, data);
    return res.data;
  },
  deleteRoom: async (id: string) => {
    const res = await api.delete(`/rooms/${id}`);
    return res.data;
  },

  // ── Class Groups / Divisions ──
  getClassGroups: async () => {
    const res = await api.get('/class-groups');
    return res.data;
  },
  createClassGroup: async (data: any) => {
    const res = await api.post('/class-groups', data);
    return res.data;
  },
  updateClassGroup: async (id: string, data: any) => {
    const res = await api.put(`/class-groups/${id}`, data);
    return res.data;
  },
  deleteClassGroup: async (id: string) => {
    const res = await api.delete(`/class-groups/${id}`);
    return res.data;
  },

  // ── Semesters ──
  getSemesters: async () => {
    const res = await api.get('/semesters');
    return res.data;
  },
  createSemester: async (data: any) => {
    const res = await api.post('/semesters', data);
    return res.data;
  },
  updateSemester: async (id: string, data: any) => {
    const res = await api.put(`/semesters/${id}`, data);
    return res.data;
  },
  deleteSemester: async (id: string) => {
    const res = await api.delete(`/semesters/${id}`);
    return res.data;
  },

  // ── Branches / Departments ──
  getBranches: async () => {
    const res = await api.get('/branches');
    return res.data;
  },
  createBranch: async (data: any) => {
    const res = await api.post('/branches', data);
    return res.data;
  },
  deleteBranch: async (id: string) => {
    const res = await api.delete(`/branches/${id}`);
    return res.data;
  },

  // ── Activities (Teaching Assignments) ──
  getActivities: async () => {
    const res = await api.get('/activities');
    return res.data;
  },
  createActivity: async (data: any) => {
    const res = await api.post('/activities', data);
    return res.data;
  },
  deleteActivity: async (id: string) => {
    const res = await api.delete(`/activities/${id}`);
    return res.data;
  },

  // ── Organization Schedules ──
  getOrganizationSchedules: async () => {
    const res = await api.get('/organization-schedules');
    return res.data;
  },
  createOrganizationSchedule: async (data: any) => {
    const res = await api.post('/organization-schedules', data);
    return res.data;
  },
  updateOrganizationSchedule: async (id: string, data: any) => {
    const res = await api.put(`/organization-schedules/${id}`, data);
    return res.data;
  },
  deleteOrganizationSchedule: async (id: string) => {
    const res = await api.delete(`/organization-schedules/${id}`);
    return res.data;
  },

  // ── Timetable Versions Persistence ──
  getTimetableVersions: async () => {
    const res = await api.get('/timetable-versions');
    return res.data;
  },
  saveTimetableVersion: async (data: any) => {
    const res = await api.post('/timetable-versions', data);
    return res.data;
  },
  updateTimetableVersion: async (id: string, data: any) => {
    const res = await api.put(`/timetable-versions/${id}`, data);
    return res.data;
  },
  deleteTimetableVersion: async (id: string) => {
    const res = await api.delete(`/timetable-versions/${id}`);
    return res.data;
  },

  // ── Analytics ──
  getDashboardStats: async (orgId = 'default') => {
    const res = await api.get(`/analytics/dashboard/${orgId}`);
    return res.data;
  },
  getRoomUtilization: async (orgId = 'default') => {
    const res = await api.get(`/analytics/room-utilization/${orgId}`);
    return res.data;
  },

  // ── Hierarchy ──
  getHierarchy: async (orgId = 'default') => {
    const res = await api.get(`/hierarchy/${orgId}`);
    return res.data;
  },

  // ── Quality & Constraint Optimization ──
  optimizeTimetable: async (maxSteps: number = 100, classId?: string) => {
    const res = await api.post('/timetable/optimize', {
      max_steps: maxSteps,
      class_id: classId || null,
    });
    return res.data;
  },

  getQualityScore: async (classId?: string) => {
    const url = classId ? `/timetable/quality/${classId}` : '/timetable/quality';
    const res = await api.get(url);
    return res.data;
  },
};
