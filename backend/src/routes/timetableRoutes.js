import express from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  ClassGroup,
  Subject,
  Teacher,
  Room,
  TimetableVersion,
  OrganizationSchedule,
  Activity,
  Constraint,
} from '../models/index.js';
import {
  FALLBACK_CLASS_GROUPS,
  FALLBACK_SUBJECTS,
  FALLBACK_TEACHERS,
  FALLBACK_ROOMS,
} from '../data/inMemoryStore.js';
import { TimetableGeneratorSolver } from '../services/timetableSolver.js';
import { computeQuality } from '../services/qualityScorer.js';

export const timetableRouter = express.Router();

// In-Memory store for fast cell modifications and active session state
const _store = {
  config: null,
  classes: null,
  timetables: {},
  presets: {},
  metadata: {
    collegeName: 'Chhotubhai Gopalbhai Patel Institute of Technology',
    department: 'Department of Computer Engineering & Information Technology',
    title: 'CLASS TIME TABLE (ODD SEMESTER 2026–27)',
    classroom: 'F-001 (Ground Floor)',
    effectiveDate: '15th July 2026',
    coordinator: 'Prof. Nikul Zinzuvadiya',
    groupHead: 'Dr. Bhavesh K. Patel',
    director: 'Dr. Rajkumar Prasad',
    note: '* 100% Attendance is mandatory. Students must report 5 minutes prior to practicals in designated labs.',
  },
};

// ── Helpers ──────────────────────────────────────────────────

function matchSubjectBranch(code = '', branchName = '', divName = '') {
  const c = code.toUpperCase().trim();
  if (c.startsWith('MA')) return true;

  const b = branchName.toLowerCase().trim();
  const d = divName.toLowerCase().trim();

  // Mixed Streams (AI&DS / IT / CS / CE or Div C)
  if (b.includes('ai') || b.includes('mix') || b.includes('aids') || b.includes('ce/it') || d.includes('mix') || d.includes('aids') || d.includes('-c') || d.includes('_c')) {
    return ['AI', 'IT', 'CE', 'CS', 'CM', 'PRJ', 'SDA', 'MA'].some((p) => c.startsWith(p));
  }

  // Electronics & Communication
  if ((b.includes('electronics') && !b.includes('electrical')) || b === 'ec' || d.includes('ec-') || d.includes('ec_') || /\b\d*ec\b/.test(d)) {
    return c.startsWith('EC');
  }

  // Electrical Engineering
  if ((b.includes('electrical') && !b.includes('electronics')) || b === 'ee' || d.includes('ee-') || d.includes('ee_') || /\b\d*ee\b/.test(d)) {
    return c.startsWith('EE') || c.startsWith('EL');
  }

  // Computer Engineering
  if (b.includes('computer') || ['co', 'cs', 'ce'].includes(b) || d.includes('co-') || d.includes('cs-') || d.includes('ce-') || /\b\d*(co|cs|ce)\b/.test(d)) {
    return c.startsWith('CE') || c.startsWith('CS') || c.startsWith('CO') || ['PRJ', 'SDA'].includes(c);
  }

  // Information Technology
  if (b.includes('information') || b === 'it' || d.includes('it-') || /\b\d*it\b/.test(d)) {
    return c.startsWith('IT') || ['PRJ', 'SDA'].includes(c);
  }

  // Mechanical Engineering
  if (b.includes('mechanical') || b.includes('mech') || b === 'me' || d.includes('me-') || /\b\d*me\b/.test(d)) {
    return c.startsWith('ME');
  }

  // Civil Engineering
  if (b.includes('civil') || ['ci', 'cv'].includes(b) || d.includes('ci-') || d.includes('cv-') || /\b\d*(ci|cv)\b/.test(d)) {
    return c.startsWith('CV') || c.startsWith('CI') || c.startsWith('CL');
  }

  // Chemical Engineering
  if (b.includes('chemical') || b === 'ch' || d.includes('ch-') || /\b\d*ch\b/.test(d)) {
    return c.startsWith('CH');
  }

  // Automobile Engineering
  if (b.includes('automobile') || b.includes('auto') || ['au', 'ae'].includes(b) || d.includes('au-') || /\b\d*au\b/.test(d)) {
    return c.startsWith('AU') || c.startsWith('AE');
  }

  return true;
}

function getBranchLabRooms(rooms, branchName = '', divName = '') {
  const allLabs = rooms.filter((r) => r.room_type === 'LAB');
  if (!allLabs.length) return rooms;

  const b = branchName.toLowerCase().trim();
  const d = divName.toLowerCase().trim();
  let prefix = '';

  if (b.includes('electronics') || d.includes('ec') || b.includes('electrical') || d.includes('ee')) prefix = 'EL';
  else if (b.includes('computer') || b.includes('information') || ['co', 'cs', 'it'].some((x) => d.includes(x))) prefix = 'CL';
  else if (b.includes('mech') || ['me', 'au'].some((x) => d.includes(x))) prefix = 'ML';
  else if (b.includes('civil') || ['ci', 'cv'].some((x) => d.includes(x))) prefix = 'CV';
  else if (b.includes('chem') || d.includes('ch')) prefix = 'CH';

  if (prefix) {
    const matched = allLabs.filter((r) => (r.name || '').toUpperCase().startsWith(prefix));
    if (matched.length) return matched;
  }
  return allLabs;
}

function getBranchTeachers(teachers, branchName = '', divName = '') {
  if (!teachers.length) return [];
  const b = branchName.toLowerCase().trim();
  const d = divName.toLowerCase().trim();
  let prefix = '';

  if (b.includes('electronics') || d.includes('ec')) prefix = 'EC';
  else if (b.includes('electrical') || d.includes('ee')) prefix = 'EE';
  else if (b.includes('computer') || ['co', 'cs'].some((x) => d.includes(x))) prefix = 'CE';
  else if (b.includes('information') || d.includes('it')) prefix = 'IT';
  else if (b.includes('mech') || d.includes('me')) prefix = 'ME';
  else if (b.includes('civil') || ['ci', 'cv'].some((x) => d.includes(x))) prefix = 'CV';
  else if (b.includes('chem') || d.includes('ch')) prefix = 'CH';
  else if (b.includes('auto') || d.includes('au')) prefix = 'AU';

  if (prefix) {
    const matched = teachers.filter((t) => (t.employee_id || '').toUpperCase().startsWith(prefix));
    if (matched.length) return matched;
  }
  return teachers;
}

function detectConflicts(timetables = {}, config = {}) {
  const conflicts = [];
  const classIds = Object.keys(timetables);
  if (!classIds.length) return conflicts;

  const numDays = timetables[classIds[0]]?.length || 0;
  const numSlots = timetables[classIds[0]]?.[0]?.length || 0;

  for (let d = 0; d < numDays; d++) {
    for (let s = 0; s < numSlots; s++) {
      const slotEntries = [];
      for (const cid of classIds) {
        const cell = timetables[cid]?.[d]?.[s];
        if (cell && cell.type !== 'free' && cell.type !== 'break' && cell.teacher) {
          slotEntries.push({ class_id: cid, ...cell });
        }
      }

      // Check teacher conflict (supports multi-faculty e.g. "ZP/BHP")
      const teachersSeen = {};
      for (const entry of slotEntries) {
        const tRaw = entry.teacher || '';
        const individualTeachers = tRaw
          .replace(/\//g, ',')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        for (const t of individualTeachers) {
          if (teachersSeen[t]) {
            conflicts.push({
              class_id: entry.class_id,
              day_index: d,
              slot_index: s,
              type: 'teacher',
              conflicts_with: teachersSeen[t],
              resource_name: t,
            });
          } else {
            teachersSeen[t] = entry.class_id;
          }
        }
      }

      // Check room conflict
      const roomsSeen = {};
      for (const entry of slotEntries) {
        const r = (entry.room || '').trim();
        if (r) {
          if (roomsSeen[r]) {
            conflicts.push({
              class_id: entry.class_id,
              day_index: d,
              slot_index: s,
              type: 'room',
              conflicts_with: roomsSeen[r],
              resource_name: r,
            });
          } else {
            roomsSeen[r] = entry.class_id;
          }
        }
      }
    }
  }

  return conflicts;
}

// ── Endpoints ────────────────────────────────────────────────

/**
 * POST /timetable/auto-generate
 * Automated conflict-free timetable generation using MongoDB Atlas:
 * - Queries divisions, subjects, teachers, and rooms from MongoDB Atlas
 * - Respects division workload limits (Theory: 13h, Labs: 8h, SDA: 5h, PRJ: 4h)
 * - Assigns free lectures without faculty (PRJ & SDA)
 * - Automatically stores and returns a new Timetable Preset
 */
timetableRouter.post('/auto-generate', async (req, res) => {
  try {
    const {
      division_ids,
      preset_name,
      seed,
      working_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      time_slots = [
        { id: '08:00', name: '08:00 – 09:00', type: 'teaching' },
        { id: '09:00', name: '09:00 – 10:00', type: 'teaching' },
        { id: '10:00', name: '10:00 – 11:00', type: 'teaching' },
        { id: '11:00', name: '11:00 – 12:00', type: 'teaching' },
        { id: '12:00', name: '12:00 – 13:00', type: 'break', title: 'Lunch Break' },
        { id: '13:00', name: '13:00 – 14:00', type: 'teaching' },
        { id: '14:00', name: '14:00 – 15:00', type: 'teaching' },
        { id: '15:00', name: '15:00 – 16:00', type: 'teaching' },
        { id: '16:00', name: '16:00 – 17:00', type: 'teaching' },
      ],
      max_consecutive = 3,
      min_free_per_day = 0,
    } = req.body;

    const config = {
      working_days,
      time_slots,
      max_consecutive,
      min_free_per_day,
      random_seed: seed || Math.floor(Math.random() * 100000),
    };

    // 1. Fetch Classes from MongoDB Atlas or fallback
    let classesDb = [];
    if (mongoose.connection.readyState === 1) {
      try {
        if (division_ids && division_ids.length > 0) {
          const validObjectIds = division_ids.filter(
            (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && id.length === 24
          );
          const orConditions = [{ id: { $in: division_ids } }];
          if (validObjectIds.length > 0) {
            orConditions.push({ _id: { $in: validObjectIds } });
          }
          classesDb = await ClassGroup.find({ $or: orConditions });
        } else {
          classesDb = await ClassGroup.find({});
        }
      } catch {}
    }

    if (!classesDb || !classesDb.length) {
      if (division_ids && division_ids.length > 0) {
        classesDb = FALLBACK_CLASS_GROUPS.filter((c) => division_ids.includes(c.id) || division_ids.includes(c.name));
      }
      if (!classesDb.length) {
        classesDb = FALLBACK_CLASS_GROUPS;
      }
    }

    // 2. Fetch academic resources from MongoDB Atlas or fallback
    let allSubjects = [];
    let allTeachers = [];
    let allRooms = [];
    if (mongoose.connection.readyState === 1) {
      try {
        allSubjects = await Subject.find({});
        allTeachers = await Teacher.find({});
        allRooms = await Room.find({});
      } catch {}
    }

    if (!allSubjects.length) allSubjects = FALLBACK_SUBJECTS;
    if (!allTeachers.length) allTeachers = FALLBACK_TEACHERS;
    if (!allRooms.length) allRooms = FALLBACK_ROOMS;

    // 3. Version count & preset name
    let versionNum = Object.keys(_store.presets).length + 1;
    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        const count = await Promise.race([TimetableVersion.countDocuments({}), timeoutP]);
        versionNum = count + 1;
      } catch {}
    }
    const finalPresetName = preset_name || `Preset ${versionNum}`;

    // 4. Faculty workload tracking & balancing
    const facultyWorkloadHours = {};
    allTeachers.forEach((t) => {
      facultyWorkloadHours[t.name] = 0;
    });

    const pickBalancedTeacher = (candidateTeachers, usedInDiv, hours) => {
      if (!candidateTeachers.length) return 'Prof. Faculty';

      const unused = candidateTeachers.filter((t) => !usedInDiv.has(t.name));
      const pool = unused.length ? unused : candidateTeachers;

      const withinCap = pool.filter(
        (t) => (facultyWorkloadHours[t.name] || 0) + hours <= (t.max_weekly_hours || 20)
      );
      const selectionPool = withinCap.length ? withinCap : pool;

      selectionPool.sort(
        (a, b) => (facultyWorkloadHours[a.name] || 0) - (facultyWorkloadHours[b.name] || 0)
      );
      const chosen = selectionPool[0];

      facultyWorkloadHours[chosen.name] = (facultyWorkloadHours[chosen.name] || 0) + hours;
      usedInDiv.add(chosen.name);
      return chosen.name;
    };

    // 5. Build classes payload
    const classesPayload = [];

    classesDb.forEach((div, divIdx) => {
      const branch = div.branch || 'General';
      const divName = div.name || `Div-${divIdx + 1}`;

      const semMatch = divName.match(/\b(\d+)/);
      const semNum = semMatch ? semMatch[1] : null;

      let branchSubs = allSubjects.filter((s) => matchSubjectBranch(s.code, branch, divName));
      if (semNum) {
        const semFiltered = branchSubs.filter(
          (s) => (s.code || '').includes(semNum) || (s.code || '').includes('PRJ') || (s.code || '').includes('SDA')
        );
        if (semFiltered.length >= 3) branchSubs = semFiltered;
      }

      const theoryCand = branchSubs.filter((s) => ['THEORY', 'BOTH'].includes(s.subject_type));
      const labCand = branchSubs.filter((s) => ['PRACTICAL', 'BOTH'].includes(s.subject_type));

      const targetTheoryHrs = div.total_theory_hours || 13;
      const targetLabHrs = div.total_practical_hours || 8;
      const targetSdaHrs = div.sda_hours ?? 5;
      const targetPrjHrs = div.prj_hours ?? 4;

      const usedTeacherNames = new Set();
      const classrooms = allRooms.filter((r) => r.room_type === 'CLASSROOM');
      const divClassroom = classrooms.length
        ? classrooms[divIdx % classrooms.length].name
        : 'CR-101';
      const branchLabs = getBranchLabRooms(allRooms, branch, divName);
      const branchTeachers = getBranchTeachers(allTeachers, branch, divName);

      // Theory courses
      const numTheory = targetTheoryHrs >= 13 ? 5 : 4;
      const selectedTheory = theoryCand.slice(0, numTheory);
      const theoryCount = Math.max(1, selectedTheory.length);
      const theoryDist = new Array(theoryCount).fill(Math.floor(targetTheoryHrs / theoryCount));
      for (let i = 0; i < targetTheoryHrs % theoryCount; i++) {
        theoryDist[i]++;
      }

      const mappedTheory = selectedTheory.map((sub, sIdx) => {
        const hrs = theoryDist[sIdx];
        const teacherName = pickBalancedTeacher(branchTeachers, usedTeacherNames, hrs);
        return {
          id: String(sub.id || sub._id),
          name: sub.name,
          code: sub.code,
          teacher: teacherName,
          room: divClassroom,
          lectures_per_week: hrs,
          labs_per_week: 0,
          tutorials_per_week: 0,
          is_lab_block_2hrs: false,
          activity_type: 'lecture',
        };
      });

      // Practical Labs (2-hr blocks)
      const mappedLabs = [];
      const numLabBlocks = targetLabHrs > 0 ? Math.floor(targetLabHrs / 2) : 0;
      for (let sIdx = 0; sIdx < numLabBlocks; sIdx++) {
        const sub = labCand[sIdx % (labCand.length || 1)] || branchSubs[0] || allSubjects[0];
        const teacherName = pickBalancedTeacher(branchTeachers, usedTeacherNames, 2);
        const labRoom = branchLabs.length
          ? branchLabs[(divIdx + sIdx) % branchLabs.length].name
          : 'CL-101';
        const labName = (sub.name || '').toLowerCase().includes('lab')
          ? sub.name
          : `${sub.name} (Lab)`;

        mappedLabs.push({
          id: `${sub.id || sub._id}_lab_${sIdx + 1}`,
          name: labName,
          code: sub.code,
          teacher: teacherName,
          room: labRoom,
          lectures_per_week: 0,
          labs_per_week: 1,
          tutorials_per_week: 0,
          is_lab_block_2hrs: true,
          activity_type: 'lab',
        });
      }

      // PRJ: Project Work (2 blocks of 2 hours, free session without faculty)
      const mappedPrj = [];
      if (targetPrjHrs >= 2) {
        const prjBlocks = Math.floor(targetPrjHrs / 2);
        const prjRoom = branchLabs.length
          ? branchLabs[(divIdx + mappedLabs.length) % branchLabs.length].name
          : divClassroom;
        mappedPrj.push({
          id: `${div.id || div._id}_PRJ`,
          name: 'PRJ (Project Work)',
          code: 'PRJ',
          teacher: '', // Free lecture without faculty
          room: prjRoom,
          lectures_per_week: 0,
          labs_per_week: prjBlocks,
          tutorials_per_week: 0,
          is_lab_block_2hrs: true,
          activity_type: 'PRJ',
        });
      }

      // SDA: Skill Development Activity (1-hour sessions, free session without faculty)
      const mappedSda = [];
      if (targetSdaHrs > 0) {
        mappedSda.push({
          id: `${div.id || div._id}_SDA`,
          name: 'SDA (Skill Development Activity)',
          code: 'SDA',
          teacher: '', // Free lecture without faculty
          room: divClassroom,
          lectures_per_week: targetSdaHrs,
          labs_per_week: 0,
          tutorials_per_week: 0,
          is_lab_block_2hrs: false,
          activity_type: 'SDA',
        });
      }

      classesPayload.push({
        class_id: String(div.id || div._id),
        class_name: div.name,
        branch,
        semester: 5,
        subjects: [...mappedTheory, ...mappedLabs, ...mappedPrj, ...mappedSda],
      });
    });

    // 6. Execute Timetable Engine
    const solver = new TimetableGeneratorSolver(config, classesPayload);
    const result = solver.solve();

    if (result.status !== 'SUCCESS') {
      return res.status(422).json({ detail: 'Failed to generate feasible schedule' });
    }

    // 7. Save newly generated Preset in MongoDB Atlas (if connected)
    const presetId = uuidv4();
    if (mongoose.connection.readyState === 1) {
      try {
        const versionDoc = new TimetableVersion({
          id: presetId,
          organization_id: 'default',
          version_number: versionNum,
          name: finalPresetName,
          status: 'DRAFT',
          timetables: result.timetables,
          stats: result.stats,
          quality: result.quality,
          config_used: config,
          classes_used: classesPayload.map((c) => ({ id: c.class_id, name: c.class_name })),
          solver_type: 'MERN Timetable Engine (MongoDB Atlas)',
        });
        const saveTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1500));
        await Promise.race([versionDoc.save(), saveTimeout]);
      } catch (saveErr) {
        console.warn('Could not persist version to MongoDB Atlas, stored in-memory:', saveErr.message);
      }
    }

    // Update in-memory state
    _store.timetables = result.timetables;
    _store.config = config;
    _store.classes = classesPayload.map((c) => ({
      id: c.class_id,
      name: c.class_name,
      classId: c.class_id,
      className: c.class_name,
    }));
    _store.presets[presetId] = {
      id: presetId,
      name: finalPresetName,
      version_number: versionNum,
      timetables: result.timetables,
      quality: result.quality,
      stats: result.stats,
      created_at: new Date().toISOString(),
    };

    res.json({
      status: 'SUCCESS',
      preset_id: presetId,
      preset_name: finalPresetName,
      version_number: versionNum,
      timetables: result.timetables,
      quality: result.quality,
      stats: result.stats,
      config,
      classes: classesPayload.map((c) => ({ id: c.class_id, name: c.class_name })),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error in auto-generate:', err);
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /timetable/presets
 * Return all generated presets from MongoDB Atlas
 */
timetableRouter.get('/presets', async (req, res) => {
  // If not connected to MongoDB or memory store has presets, return fast
  const inMemoryList = Object.values(_store.presets || {}).map((v) => ({
    id: v.id,
    name: v.name || `Preset ${v.version_number}`,
    version_number: v.version_number || 1,
    quality: v.quality || {},
    stats: v.stats || {},
    division_count: Object.keys(v.timetables || {}).length,
    created_at: v.created_at || new Date().toISOString(),
    status: 'ACTIVE',
  }));

  if (mongoose.connection.readyState !== 1) {
    return res.json(inMemoryList);
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 1500)
    );
    const queryPromise = TimetableVersion.find({}).sort({ version_number: -1 });
    const versions = await Promise.race([queryPromise, timeoutPromise]);

    const presets = versions.map((v) => ({
      id: v.id || v._id,
      name: v.name || `Preset ${v.version_number}`,
      version_number: v.version_number || 1,
      quality: v.quality || {},
      stats: v.stats || {},
      division_count: Object.keys(v.timetables || {}).length,
      created_at: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
      status: v.status || 'DRAFT',
    }));
    res.json(presets.length > 0 ? presets : inMemoryList);
  } catch (err) {
    res.json(inMemoryList);
  }
});

/**
 * GET /timetable/presets/:presetId
 * Retrieve full timetable data for a specific preset
 */
timetableRouter.get('/presets/:presetId', async (req, res) => {
  try {
    const { presetId } = req.params;
    let v = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        v = await Promise.race([TimetableVersion.findOne({ id: presetId }), timeoutP]);
        if (!v) {
          v = await Promise.race([TimetableVersion.findById(presetId).catch(() => null), timeoutP]);
        }
      } catch {}
    }

    if (!v) {
      if (_store.presets[presetId]) {
        return res.json(_store.presets[presetId]);
      }
      return res.status(404).json({ detail: 'Preset not found' });
    }

    res.json({
      id: v.id || v._id,
      name: v.name,
      version_number: v.version_number,
      timetables: v.timetables,
      quality: v.quality,
      stats: v.stats,
      config: v.config_used,
      created_at: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
    });
  } catch (err) {
    if (_store.presets[req.params.presetId]) {
      return res.json(_store.presets[req.params.presetId]);
    }
    res.status(500).json({ detail: err.message });
  }
});

/**
 * DELETE /timetable/presets/:presetId
 */
timetableRouter.delete('/presets/:presetId', async (req, res) => {
  try {
    const { presetId } = req.params;
    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        await Promise.race([TimetableVersion.findOneAndDelete({ id: presetId }), timeoutP]);
      } catch {}
    }
    delete _store.presets[presetId];
    res.json({ status: 'SUCCESS', deleted_id: presetId });
  } catch (err) {
    delete _store.presets[req.params.presetId];
    res.json({ status: 'SUCCESS', deleted_id: req.params.presetId });
  }
});

/**
 * GET /timetable/current
 */
timetableRouter.get('/current', async (req, res) => {
  try {
    let timetables = _store.timetables;
    let config = _store.config;
    let classes = _store.classes || [];

    // If not generated in _store yet, pull latest from MongoDB Atlas if connected
    if (!timetables || Object.keys(timetables).length === 0) {
      if (mongoose.connection.readyState === 1) {
        try {
          const timeoutPromise = new Promise((_, r) => setTimeout(r, 1500));
          const latest = await Promise.race([
            TimetableVersion.findOne({}).sort({ version_number: -1 }),
            timeoutPromise,
          ]);
          if (latest && latest.timetables) {
            timetables = latest.timetables;
            config = latest.config_used;
            _store.timetables = timetables;
            _store.config = config;
          }
        } catch {}
      }
    }

    if (!classes.length) {
      if (mongoose.connection.readyState === 1) {
        try {
          const dbClasses = await ClassGroup.find({});
          if (dbClasses && dbClasses.length) {
            classes = dbClasses.map((c) => ({
              id: c.id || c._id,
              name: c.name,
              classId: c.id || c._id,
              className: c.name,
            }));
            _store.classes = classes;
          }
        } catch {}
      }
      if (!classes.length) {
        classes = FALLBACK_CLASS_GROUPS.map((c) => ({
          id: c.id,
          name: c.name,
          classId: c.id,
          className: c.name,
        }));
        _store.classes = classes;
      }
    }

    const conflicts = detectConflicts(timetables || {}, config || {});

    res.json({
      status: 'SUCCESS',
      timetables: timetables || {},
      config: config || {
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        time_slots: [
          { id: '08:00', name: '08:00 – 09:00', type: 'teaching' },
          { id: '09:00', name: '09:00 – 10:00', type: 'teaching' },
          { id: '10:00', name: '10:00 – 11:00', type: 'teaching' },
          { id: '11:00', name: '11:00 – 12:00', type: 'teaching' },
          { id: '12:00', name: '12:00 – 13:00', type: 'break', title: 'Lunch Break' },
          { id: '13:00', name: '13:00 – 14:00', type: 'teaching' },
          { id: '14:00', name: '14:00 – 15:00', type: 'teaching' },
          { id: '15:00', name: '15:00 – 16:00', type: 'teaching' },
          { id: '16:00', name: '16:00 – 17:00', type: 'teaching' },
        ],
      },
      classes,
      conflicts,
      metadata: _store.metadata,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * POST /timetable/update-cell
 */
timetableRouter.post('/update-cell', (req, res) => {
  const {
    class_id,
    day_index,
    slot_index,
    subject_id,
    subject_name,
    type = 'lecture',
    teacher = '',
    room = '',
    is_continuation = false,
    is_locked = false,
  } = req.body;

  const grid = _store.timetables?.[class_id];
  if (!grid) {
    return res.status(404).json({ detail: 'Class grid not found' });
  }

  if (day_index >= grid.length || slot_index >= grid[0].length) {
    return res.status(400).json({ detail: 'Invalid coordinates' });
  }

  if (type === 'free' || !subject_name) {
    grid[day_index][slot_index] = {
      subject_id: null,
      subject_name: '',
      type: 'free',
      teacher: '',
      room: '',
      color_index: -1,
      is_locked: false,
    };
  } else {
    let hash = 0;
    const str = `${class_id}_${subject_id || subject_name}`;
    for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
    const colorIndex = Math.abs(hash) % 12;

    grid[day_index][slot_index] = {
      subject_id: subject_id || 'custom',
      subject_name,
      type,
      teacher,
      room,
      color_index: colorIndex,
      is_continuation: Boolean(is_continuation),
      is_locked: Boolean(is_locked),
    };
  }

  const conflicts = detectConflicts(_store.timetables, _store.config || {});
  res.json({
    status: 'SUCCESS',
    timetables: _store.timetables,
    conflicts,
  });
});

/**
 * GET /timetable/metadata
 */
timetableRouter.get('/metadata', (req, res) => {
  res.json(_store.metadata);
});

/**
 * POST /timetable/metadata
 */
timetableRouter.post('/metadata', (req, res) => {
  _store.metadata = { ..._store.metadata, ...req.body };
  res.json({ status: 'SUCCESS', metadata: _store.metadata });
});

/**
 * GET /timetable/conflicts
 */
timetableRouter.get('/conflicts', (req, res) => {
  const conflicts = detectConflicts(_store.timetables || {}, _store.config || {});
  res.json({ conflicts });
});

/**
 * POST /timetable/swap
 */
timetableRouter.post('/swap', (req, res) => {
  const { class_id, from_day, from_slot, to_day, to_slot } = req.body;
  const grid = _store.timetables?.[class_id];
  if (!grid) {
    return res.status(404).json({ detail: 'Timetable not found for this class' });
  }

  if (from_day >= grid.length || to_day >= grid.length || from_slot >= grid[0].length || to_slot >= grid[0].length) {
    return res.status(400).json({ detail: 'Index out of range' });
  }

  const fromCell = grid[from_day][from_slot];
  const toCell = grid[to_day][to_slot];

  if (fromCell.type === 'break' || toCell.type === 'break') {
    return res.status(400).json({ detail: 'Cannot swap break slots' });
  }
  if (fromCell.is_locked || toCell.is_locked) {
    return res.status(400).json({ detail: 'Cannot swap a locked slot' });
  }

  // Swap cells
  const temp = { ...fromCell };
  grid[from_day][from_slot] = { ...toCell };
  grid[to_day][to_slot] = temp;

  const conflicts = detectConflicts(_store.timetables, _store.config || {});
  res.json({
    status: 'OK',
    timetables: _store.timetables,
    conflicts,
  });
});

/**
 * POST /timetable/validate-placement
 */
timetableRouter.post('/validate-placement', (req, res) => {
  const { class_id, day_index, slot_index, teacher = '', room = '', duration = 1 } = req.body;
  const grid = _store.timetables?.[class_id];
  if (!grid) return res.json({ valid: true, conflicts: [] });

  const numDays = grid.length;
  const numSlots = grid[0]?.length || 0;

  if (day_index >= numDays || slot_index >= numSlots) {
    return res.json({ valid: false, conflicts: ['Target slot is out of bounds.'] });
  }

  const conflicts = [];
  const dur = Math.max(1, duration);

  for (let offset = 0; offset < dur; offset++) {
    const curSlot = slot_index + offset;
    if (curSlot >= numSlots) {
      conflicts.push('Duration exceeds remaining slots in the day.');
      break;
    }

    const cell = grid[day_index][curSlot];
    if (cell.type === 'break') conflicts.push(`Slot ${curSlot + 1} is a break slot.`);
    if (cell.is_locked) conflicts.push(`Slot ${curSlot + 1} is locked.`);

    // Check teacher clashes across all classes
    if (teacher) {
      const reqTeachers = teacher.replace(/\//g, ',').split(',').map((t) => t.trim()).filter(Boolean);
      for (const [otherCid, otherGrid] of Object.entries(_store.timetables)) {
        const oc = otherGrid[day_index]?.[curSlot];
        if (oc && oc.type !== 'free' && oc.type !== 'break' && oc.teacher) {
          const ocTeachers = oc.teacher.replace(/\//g, ',').split(',').map((t) => t.trim()).filter(Boolean);
          for (const t of reqTeachers) {
            if (ocTeachers.includes(t)) {
              conflicts.push(`Faculty '${t}' is already booked in class '${otherCid}'.`);
            }
          }
        }
      }
    }

    // Check room clashes across all classes
    if (room) {
      for (const [otherCid, otherGrid] of Object.entries(_store.timetables)) {
        if (otherCid !== class_id) {
          const oc = otherGrid[day_index]?.[curSlot];
          if (oc && oc.room && oc.room.toLowerCase() === room.trim().toLowerCase()) {
            conflicts.push(`Room '${room}' is already booked by class '${otherCid}'.`);
          }
        }
      }
    }
  }

  res.json({
    valid: conflicts.length === 0,
    conflicts,
  });
});

/**
 * POST /timetable/smart-suggest
 */
timetableRouter.post('/smart-suggest', (req, res) => {
  const { class_id, teacher = '', room = '', duration = 1 } = req.body;
  const grid = _store.timetables?.[class_id];
  if (!grid) return res.json({ suggestions: [] });

  const numDays = grid.length;
  const numSlots = grid[0]?.length || 0;
  const dur = Math.max(1, duration);
  const suggestions = [];
  const daysList = _store.config?.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const reqTeachers = teacher.replace(/\//g, ',').split(',').map((t) => t.trim()).filter(Boolean);

  for (let d = 0; d < numDays; d++) {
    for (let s = 0; s <= numSlots - dur; s++) {
      let isValid = true;
      for (let offset = 0; offset < dur; offset++) {
        const cell = grid[d][s + offset];
        if (cell.type === 'break' || cell.is_locked || cell.subject_id) {
          isValid = false;
          break;
        }

        if (reqTeachers.length) {
          for (const otherGrid of Object.values(_store.timetables)) {
            const oc = otherGrid[d]?.[s + offset];
            if (oc && oc.type !== 'free' && oc.type !== 'break' && oc.teacher) {
              const ocTeachers = oc.teacher.replace(/\//g, ',').split(',').map((t) => t.trim()).filter(Boolean);
              if (reqTeachers.some((t) => ocTeachers.includes(t))) {
                isValid = false;
                break;
              }
            }
          }
          if (!isValid) break;
        }
      }

      if (isValid) {
        const dayName = daysList[d] || `Day ${d + 1}`;
        suggestions.push({
          day: d,
          slot: s,
          day_name: dayName,
          label: `${dayName} Period ${s + 1}`,
          score: 100 - s * 5,
        });
      }
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  res.json({ suggestions });
});

/**
 * POST /timetable/lock-slot
 */
timetableRouter.post('/lock-slot', (req, res) => {
  const { class_id, day_index, slot_index, is_locked = true } = req.body;
  const grid = _store.timetables?.[class_id];
  if (!grid) return res.status(404).json({ detail: 'Class timetable not found' });

  if (day_index >= grid.length || slot_index >= grid[0].length) {
    return res.status(400).json({ detail: 'Coordinates out of range' });
  }

  grid[day_index][slot_index].is_locked = is_locked;
  res.json({ status: 'SUCCESS', is_locked, timetables: _store.timetables });
});

/**
 * POST /timetable/clear-grid
 */
timetableRouter.post('/clear-grid', (req, res) => {
  const { class_id, mode = 'unlocked', day_index } = req.body;
  const grid = _store.timetables?.[class_id];
  if (!grid) return res.status(404).json({ detail: 'Class timetable not found' });

  for (let d = 0; d < grid.length; d++) {
    if (mode === 'day' && day_index !== undefined && d !== day_index) continue;
    for (let s = 0; s < grid[d].length; s++) {
      const cell = grid[d][s];
      if (cell.type === 'break') continue;
      if (mode === 'unlocked' && cell.is_locked) continue;

      grid[d][s] = {
        subject_id: null,
        subject_name: '',
        type: 'free',
        teacher: '',
        room: '',
        color_index: -1,
        is_locked: false,
      };
    }
  }

  const conflicts = detectConflicts(_store.timetables, _store.config || {});
  res.json({ status: 'SUCCESS', timetables: _store.timetables, conflicts });
});

/**
 * GET /timetable/faculty-workload
 */
timetableRouter.get('/faculty-workload', async (req, res) => {
  try {
    let teachers = [];
    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        teachers = await Promise.race([Teacher.find({}), timeoutP]);
      } catch {}
    }
    if (!teachers || !teachers.length) teachers = FALLBACK_TEACHERS;

    const workloadMap = {};

    teachers.forEach((t) => {
      workloadMap[t.name] = {
        teacher_id: t.id || t._id,
        teacher_name: t.name,
        designation: t.designation || 'Faculty',
        department_id: t.department_id,
        target_hours: t.target_weekly_hours || 16,
        max_hours: t.max_weekly_hours || 20,
        assigned_hours: 0,
        classes: [],
      };
    });

    for (const [classId, grid] of Object.entries(_store.timetables || {})) {
      for (const day of grid) {
        for (const cell of day) {
          if (cell.type !== 'free' && cell.type !== 'break' && cell.teacher) {
            const individual = cell.teacher.replace(/\//g, ',').split(',').map((t) => t.trim()).filter(Boolean);
            for (const tName of individual) {
              if (!workloadMap[tName]) {
                workloadMap[tName] = {
                  teacher_id: tName,
                  teacher_name: tName,
                  designation: 'Faculty',
                  target_hours: 16,
                  max_hours: 20,
                  assigned_hours: 0,
                  classes: [],
                };
              }
              workloadMap[tName].assigned_hours++;
              if (!workloadMap[tName].classes.includes(classId)) {
                workloadMap[tName].classes.push(classId);
              }
            }
          }
        }
      }
    }

    const result = Object.values(workloadMap);
    result.forEach((item) => {
      if (item.assigned_hours > item.max_hours) item.status = 'overloaded';
      else if (item.assigned_hours < item.target_hours - 3) item.status = 'underloaded';
      else item.status = 'optimal';
    });

    result.sort((a, b) => b.assigned_hours - a.assigned_hours);
    res.json({ faculty_workload: result });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /timetable/room-availability
 */
timetableRouter.get('/room-availability', async (req, res) => {
  try {
    let rooms = [];
    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        rooms = await Promise.race([Room.find({}), timeoutP]);
      } catch {}
    }
    if (!rooms || !rooms.length) rooms = FALLBACK_ROOMS;

    const days = _store.config?.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const slots = _store.config?.time_slots || [];

    const roomsData = rooms.map((r) => ({
      id: r.id || r._id,
      name: r.name,
      building: r.building || 'Main Block',
      capacity: r.capacity || 60,
      room_type: r.room_type || 'CLASSROOM',
      occupied_slots: [],
      total_occupied_hours: 0,
    }));

    const occupancyMap = {};
    roomsData.forEach((r) => {
      occupancyMap[r.name] = [];
    });

    for (const [classId, grid] of Object.entries(_store.timetables || {})) {
      grid.forEach((dayArr, dIdx) => {
        dayArr.forEach((cell, sIdx) => {
          const rName = cell.room;
          if (rName && occupancyMap[rName]) {
            occupancyMap[rName].push({
              day_index: dIdx,
              slot_index: sIdx,
              class_id: classId,
              subject: cell.subject_name || '',
              teacher: cell.teacher || '',
            });
          }
        });
      });
    }

    roomsData.forEach((r) => {
      r.occupied_slots = occupancyMap[r.name] || [];
      r.total_occupied_hours = r.occupied_slots.length;
    });

    res.json({
      rooms: roomsData,
      days,
      num_slots: slots.length || 6,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

/**
 * GET /timetable/faculty-analysis/:teacherIdentifier
 */
timetableRouter.get('/faculty-analysis/:teacherIdentifier', async (req, res) => {
  try {
    const { teacherIdentifier } = req.params;
    const { preset_id } = req.query;

    let teacher = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        teacher = await Promise.race([
          Teacher.findOne({ id: teacherIdentifier }) ||
            Teacher.findOne({ name: teacherIdentifier }) ||
            Teacher.findOne({ name: new RegExp(teacherIdentifier, 'i') }),
          timeoutP,
        ]);
      } catch {}
    }
    if (!teacher) {
      teacher = FALLBACK_TEACHERS.find(
        (t) => t.id === teacherIdentifier || t.name.toLowerCase().includes(teacherIdentifier.toLowerCase())
      );
    }

    const teacherName = teacher?.name || teacherIdentifier;
    const designation = teacher?.designation || 'Faculty';

    let timetables = _store.timetables || {};
    let configUsed = _store.config || {};
    let presetName = 'Current Working Schedule';

    if (preset_id) {
      if (_store.presets[preset_id]) {
        timetables = _store.presets[preset_id].timetables || {};
        presetName = _store.presets[preset_id].name;
      } else if (mongoose.connection.readyState === 1) {
        try {
          const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
          const v = await Promise.race([TimetableVersion.findOne({ id: preset_id }), timeoutP]);
          if (v) {
            timetables = v.timetables || {};
            configUsed = v.config_used || {};
            presetName = v.name;
          }
        } catch {}
      }
    }

    const workingDays = configUsed.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = configUsed.time_slots || [
      { id: '08:00', name: '08:00 – 09:00', type: 'teaching' },
      { id: '09:00', name: '09:00 – 10:00', type: 'teaching' },
      { id: '10:00', name: '10:00 – 11:00', type: 'teaching' },
      { id: '11:00', name: '11:00 – 12:00', type: 'teaching' },
      { id: '12:00', name: '12:00 – 13:00', type: 'break', title: 'Lunch Break' },
      { id: '13:00', name: '13:00 – 14:00', type: 'teaching' },
      { id: '14:00', name: '14:00 – 15:00', type: 'teaching' },
      { id: '15:00', name: '15:00 – 16:00', type: 'teaching' },
      { id: '16:00', name: '16:00 – 17:00', type: 'teaching' },
    ];

    // Build faculty's personal weekly grid across all classes
    const weeklySchedule = workingDays.map(() => timeSlots.map(() => null));
    let totalTeachingHours = 0;
    let theoryHours = 0;
    let labHours = 0;
    const subjectStats = {};
    const classesTaught = new Set();

    for (const [classId, grid] of Object.entries(timetables)) {
      grid.forEach((dayArr, dIdx) => {
        dayArr.forEach((cell, sIdx) => {
          if (cell && cell.type !== 'free' && cell.type !== 'break' && cell.teacher) {
            const cellTeachers = cell.teacher.replace(/\//g, ',').split(',').map((t) => t.trim());
            if (cellTeachers.some((t) => t.toLowerCase() === teacherName.toLowerCase())) {
              totalTeachingHours++;
              classesTaught.add(classId);

              if (cell.type === 'lab') labHours++;
              else theoryHours++;

              const sName = cell.subject_name || 'Subject';
              subjectStats[sName] = (subjectStats[sName] || 0) + 1;

              weeklySchedule[dIdx][sIdx] = {
                subject_name: cell.subject_name,
                class_id: classId,
                room: cell.room,
                type: cell.type,
                is_continuation: cell.is_continuation,
              };
            }
          }
        });
      });
    }

    res.json({
      teacher: {
        id: teacher?.id || teacherIdentifier,
        name: teacherName,
        designation,
        employee_id: teacher?.employee_id || '',
        email: teacher?.email || '',
        target_weekly_hours: teacher?.target_weekly_hours || 16,
        max_weekly_hours: teacher?.max_weekly_hours || 20,
      },
      preset_name: presetName,
      stats: {
        total_hours: totalTeachingHours,
        theory_hours: theoryHours,
        lab_hours: labHours,
        classes_count: classesTaught.size,
        subjects: subjectStats,
      },
      weekly_schedule: weeklySchedule,
      days: workingDays,
      time_slots: timeSlots,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});
