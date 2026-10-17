import express from 'express';
import mongoose from 'mongoose';
import { Branch, Program, Semester, ClassGroup } from '../models/index.js';
import { FALLBACK_CLASS_GROUPS, FALLBACK_SEMESTERS } from '../data/inMemoryStore.js';

export const hierarchyRouter = express.Router();

/**
 * GET /hierarchy/:organizationId
 */
hierarchyRouter.get('/hierarchy/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    let branches = [
      { id: 'b1', name: 'Computer Engineering', code: 'CE' },
      { id: 'b2', name: 'Information Technology', code: 'IT' },
    ];
    let programs = [
      { id: 'p1', branch_id: 'b1', name: 'B.Tech CE', code: 'BTECH-CE' },
      { id: 'p2', branch_id: 'b2', name: 'B.Tech IT', code: 'BTECH-IT' },
    ];
    let semesters = FALLBACK_SEMESTERS;
    let classes = FALLBACK_CLASS_GROUPS;

    if (mongoose.connection.readyState === 1) {
      try {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        const resArr = await Promise.race([
          Promise.all([
            Branch.find({ organization_id: organizationId }),
            Program.find({ organization_id: organizationId }),
            Semester.find({ organization_id: organizationId }),
            ClassGroup.find({ organization_id: organizationId }),
          ]),
          timeoutP,
        ]);
        if (resArr[0]?.length) branches = resArr[0];
        if (resArr[1]?.length) programs = resArr[1];
        if (resArr[2]?.length) semesters = resArr[2];
        if (resArr[3]?.length) classes = resArr[3];
      } catch {}
    }

    const hierarchy = branches.map((branch) => {
      const branchPrograms = programs.filter(
        (p) => String(p.branch_id) === String(branch.id || branch._id)
      );

      return {
        id: branch.id || branch._id,
        name: branch.name,
        code: branch.code,
        programs: branchPrograms.map((program) => {
          const programSemesters = semesters
            .filter((s) => String(s.program_id) === String(program.id || program._id))
            .sort((a, b) => a.number - b.number);

          return {
            id: program.id || program._id,
            name: program.name,
            code: program.code,
            semesters: programSemesters.map((semester) => {
              const semesterClasses = classes.filter(
                (c) => String(c.semester_id) === String(semester.id || semester._id)
              );

              return {
                id: semester.id || semester._id,
                name: semester.name,
                number: semester.number,
                sections: semesterClasses.map((cls) => ({
                  id: cls.id || cls._id,
                  name: cls.name,
                  capacity: cls.student_capacity,
                })),
              };
            }),
          };
        }),
      };
    });

    res.json({ hierarchy });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});
