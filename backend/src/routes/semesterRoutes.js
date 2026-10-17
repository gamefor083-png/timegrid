import express from 'express';
import mongoose from 'mongoose';
import {
  Semester,
  ClassGroup,
  Subject,
  Teacher,
  Room,
  Activity,
} from '../models/index.js';
import {
  FALLBACK_SEMESTERS,
  FALLBACK_CLASS_GROUPS,
  FALLBACK_SUBJECTS,
  FALLBACK_TEACHERS,
  FALLBACK_ROOMS,
} from '../data/inMemoryStore.js';

export const semesterRouter = express.Router();

/**
 * GET /semester-readiness/:organizationId/:semesterId
 */
semesterRouter.get('/semester-readiness/:organizationId/:semesterId', async (req, res) => {
  try {
    const { organizationId, semesterId } = req.params;

    let semester = FALLBACK_SEMESTERS[0];
    let classes = FALLBACK_CLASS_GROUPS;
    let subjects = FALLBACK_SUBJECTS;
    let teachers = FALLBACK_TEACHERS;
    let rooms = FALLBACK_ROOMS;
    let activities = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1200));
        const resArr = await Promise.race([
          Promise.all([
            Semester.findOne({ $or: [{ id: semesterId }, { _id: semesterId }] }),
            ClassGroup.find({ semester_id: semesterId }),
            Subject.find({ organization_id: organizationId }),
            Teacher.find({ organization_id: organizationId }),
            Room.find({ organization_id: organizationId }),
            Activity.find({ semester_id: semesterId }),
          ]),
          timeoutP,
        ]);
        if (resArr[0]) semester = resArr[0];
        if (resArr[1]?.length) classes = resArr[1];
        if (resArr[2]?.length) subjects = resArr[2];
        if (resArr[3]?.length) teachers = resArr[3];
        if (resArr[4]?.length) rooms = resArr[4];
        activities = resArr[5] || [];
      } catch {}
    }

    const classesCount = classes.length;
    const subjectsCount = subjects.length;
    const facultyCount = teachers.length;
    const roomsCount = rooms.length;
    const labsCount = rooms.filter((r) => r.room_type === 'LAB').length;
    const assignmentsCount = activities.length;

    const availabilityPending = teachers.filter((t) => !t.availability || Object.keys(t.availability).length === 0).length;
    const facultyIncomplete = teachers.filter((t) => t.min_weekly_hours === 0 && t.max_weekly_hours === 0).length;
    const pendingAssignments = activities.filter((a) => !a.teacher_id).length;

    let score = 100;
    if (availabilityPending > 0) {
      score -= (availabilityPending / Math.max(facultyCount, 1)) * 20;
    }
    if (facultyIncomplete > 0) {
      score -= (facultyIncomplete / Math.max(facultyCount, 1)) * 10;
    }
    if (pendingAssignments > 0) {
      score -= (pendingAssignments / Math.max(assignmentsCount, 1)) * 40;
    }
    if (classesCount === 0 || subjectsCount === 0 || facultyCount === 0) {
      score = 0;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    res.json({
      metrics: {
        classes: { count: classesCount, status: classesCount > 0 ? 'complete' : 'pending' },
        subjects: { count: subjectsCount, status: subjectsCount > 0 ? 'complete' : 'pending' },
        faculty: { count: facultyCount, incomplete: facultyIncomplete, status: facultyIncomplete > 0 ? 'warning' : 'complete' },
        rooms: { count: roomsCount, status: roomsCount > 0 ? 'complete' : 'pending' },
        labs: { count: labsCount, status: labsCount > 0 ? 'complete' : 'pending' },
        assignments: { count: assignmentsCount, pending: pendingAssignments, status: pendingAssignments > 0 ? 'warning' : 'complete' },
        availability: { pending: availabilityPending, status: availabilityPending > 0 ? 'warning' : 'complete' },
      },
      readiness_score: score,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});
