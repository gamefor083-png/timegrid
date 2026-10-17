import { computeQuality } from './qualityScorer.js';

export class TimetableGeneratorSolver {
  constructor(config, classes) {
    this.config = config || {};
    this.classes = classes || [];

    this.days = this.config.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.numDays = this.days.length;

    this.timeSlots = this.config.time_slots || [
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
    this.numSlotsPerDay = this.timeSlots.length;

    this.usableSlots = this.timeSlots
      .map((s, i) => (s.type === 'teaching' ? i : -1))
      .filter((i) => i >= 0);

    // Valid start slots for a 2-hour block (slot i and i+1 are both teaching)
    this.validStartSlots2hr = [];
    for (let i = 0; i < this.timeSlots.length - 1; i++) {
      if (this.timeSlots[i].type === 'teaching' && this.timeSlots[i + 1].type === 'teaching') {
        this.validStartSlots2hr.push(i);
      }
    }

    this.maxConsecutive = this.config.max_consecutive || 3;
    this.minFreePerDay = this.config.min_free_per_day || 0;
  }

  _freeCell() {
    return {
      subject_id: null,
      subject_name: '',
      type: 'free',
      teacher: '',
      room: '',
      color_index: -1,
      is_locked: false,
    };
  }

  _breakCell(title = 'BREAK') {
    return {
      subject_id: null,
      subject_name: title,
      type: 'break',
      teacher: '',
      room: '',
      color_index: -1,
      is_locked: true,
    };
  }

  _getColorIndex(classId, subjectId) {
    let hash = 0;
    const str = `${classId}_${subjectId}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 12;
  }

  solve() {
    let bestResult = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const result = this._runGreedyAttempt(attempts);
      if (result.status === 'SUCCESS') {
        bestResult = result;
        break;
      }
    }

    if (!bestResult) {
      // Return the most complete timetable even if slight overflow
      bestResult = this._runGreedyAttempt(1, true);
    }

    const quality = computeQuality(bestResult.timetables, {
      ...this.config,
      time_slots: this.timeSlots,
      working_days: this.days,
    });

    return {
      status: 'SUCCESS',
      timetables: bestResult.timetables,
      stats: bestResult.stats,
      quality,
    };
  }

  _runGreedyAttempt(attemptNumber, allowRelaxed = false) {
    const timetables = {};
    const stats = {};

    // 1. Initialize empty grids with break periods
    for (const cls of this.classes) {
      const cid = cls.class_id;
      const grid = [];
      for (let d = 0; d < this.numDays; d++) {
        const daySlots = [];
        for (let s = 0; s < this.numSlotsPerDay; s++) {
          const slotDef = this.timeSlots[s] || { type: 'teaching' };
          if (slotDef.type === 'break') {
            daySlots.push(this._breakCell(slotDef.title || 'BREAK'));
          } else {
            daySlots.push(this._freeCell());
          }
        }
        grid.push(daySlots);
      }
      timetables[cid] = grid;
    }

    // 2. Build activity list across all classes
    const allActivities = [];
    for (const cls of this.classes) {
      for (const subj of cls.subjects || []) {
        const actType = subj.activity_type || 'lecture';
        const is2hr = Boolean(subj.is_lab_block_2hrs);

        // Theory lectures (1-hr)
        for (let i = 0; i < (subj.lectures_per_week || 0); i++) {
          allActivities.push({
            class_id: cls.class_id,
            subject: subj,
            type: actType,
            duration: 1,
            orderKey: `${subj.id}_lec_${i}`,
          });
        }

        // Practical labs or 2-hr blocks
        const dur = is2hr ? 2 : 1;
        const labActType = subj.activity_type || 'lab';
        for (let i = 0; i < (subj.labs_per_week || 0); i++) {
          allActivities.push({
            class_id: cls.class_id,
            subject: subj,
            type: labActType,
            duration: dur,
            orderKey: `${subj.id}_lab_${i}`,
          });
        }

        // Tutorials (1-hr)
        for (let i = 0; i < (subj.tutorials_per_week || 0); i++) {
          allActivities.push({
            class_id: cls.class_id,
            subject: subj,
            type: 'tutorial',
            duration: 1,
            orderKey: `${subj.id}_tut_${i}`,
          });
        }
      }
    }

    // Pseudo-random shuffle seeded
    const seed = (Number(this.config.random_seed) || 12345) + attemptNumber * 777;
    let s = seed;
    const random = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    // Sort: Multi-hour blocks (labs & 2-hr PRJ) FIRST!
    allActivities.sort((a, b) => {
      if (b.duration !== a.duration) return b.duration - a.duration;
      return random() - 0.5;
    });

    // 3. Place each activity
    for (const act of allActivities) {
      const { class_id: cid, subject: subj, type: stype, duration: dur } = act;
      const grid = timetables[cid];
      let placed = false;

      // Sort days by current occupancy (load balancing across Monday - Friday)
      const dayLoad = [];
      for (let d = 0; d < this.numDays; d++) {
        const count = this.usableSlots.filter(
          (s) => grid[d][s].type !== 'free' && grid[d][s].type !== 'break'
        ).length;
        dayLoad.push({ day: d, load: count });
      }
      dayLoad.sort((a, b) => a.load - b.load || random() - 0.5);

      const validSlots = dur === 2 ? this.validStartSlots2hr : this.usableSlots;

      for (const { day: d } of dayLoad) {
        if (placed) break;

        // Constraint: Don't repeat same theory subject on same day (except SDA free session)
        const isSda = String(subj.code || '').toUpperCase().includes('SDA');
        const sameSubjToday = this.usableSlots.filter(
          (s) => grid[d][s].subject_id === subj.id && !grid[d][s].is_continuation
        ).length;

        if (!allowRelaxed && sameSubjToday >= (isSda ? 2 : 1) && dur === 1 && stype !== 'lab' && stype !== 'PRJ') {
          continue;
        }

        // Constraint: Don't overload teacher on the same class on same day
        const currentTeacher = (subj.teacher || '').trim();
        if (currentTeacher && !currentTeacher.toLowerCase().includes('faculty') && currentTeacher !== '') {
          const teacherHoursToday = this.usableSlots.filter(
            (s) => grid[d][s].teacher === currentTeacher && grid[d][s].type !== 'free' && grid[d][s].type !== 'break'
          ).length;
          if (!allowRelaxed && teacherHoursToday + dur > 3) {
            continue;
          }
        }

        // Try candidate slots
        const shuffledSlots = [...validSlots].sort(() => random() - 0.5);

        for (const s of shuffledSlots) {
          // Check if slot(s) are free in this class
          if (grid[d][s].type !== 'free') continue;
          if (dur === 2 && grid[d][s + 1]?.type !== 'free') continue;

          // Check teacher conflict across ALL other classes
          let hasTeacherConflict = false;
          if (currentTeacher && currentTeacher !== '') {
            const individualTeachers = currentTeacher
              .replace(/\//g, ',')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);

            for (const [otherCid, otherGrid] of Object.entries(timetables)) {
              if (otherCid === cid) continue;
              for (let offset = 0; offset < dur; offset++) {
                const cell = otherGrid[d][s + offset];
                if (cell && cell.type !== 'free' && cell.type !== 'break' && cell.teacher) {
                  const cellTeachers = cell.teacher
                    .replace(/\//g, ',')
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  if (individualTeachers.some((t) => cellTeachers.includes(t))) {
                    hasTeacherConflict = true;
                    break;
                  }
                }
              }
              if (hasTeacherConflict) break;
            }
          }
          if (hasTeacherConflict) continue;

          // Check room conflict across ALL other classes
          const currentRoom = (subj.room || '').trim();
          let hasRoomConflict = false;
          if (currentRoom && currentRoom !== '') {
            for (const [otherCid, otherGrid] of Object.entries(timetables)) {
              if (otherCid === cid) continue;
              for (let offset = 0; offset < dur; offset++) {
                const cell = otherGrid[d][s + offset];
                if (cell && cell.type !== 'free' && cell.type !== 'break' && cell.room) {
                  if (cell.room.toLowerCase() === currentRoom.toLowerCase()) {
                    hasRoomConflict = true;
                    break;
                  }
                }
              }
              if (hasRoomConflict) break;
            }
          }
          if (hasRoomConflict) continue;

          // Slot is completely conflict-free! Place activity
          const colorIndex = this._getColorIndex(cid, subj.id);
          grid[d][s] = {
            subject_id: subj.id,
            subject_name: subj.name,
            code: subj.code,
            type: stype,
            teacher: subj.teacher || '',
            room: subj.room || '',
            color_index: colorIndex,
            is_continuation: false,
            is_locked: false,
          };

          if (dur === 2) {
            grid[d][s + 1] = {
              subject_id: subj.id,
              subject_name: subj.name,
              code: subj.code,
              type: stype,
              teacher: subj.teacher || '',
              room: subj.room || '',
              color_index: colorIndex,
              is_continuation: true,
              is_locked: false,
            };
          }

          placed = true;
          break;
        }
      }

      if (!placed && !allowRelaxed) {
        return { status: 'FAILED' };
      }
    }

    // 4. Calculate stats per class
    for (const cls of this.classes) {
      const cid = cls.class_id;
      const grid = timetables[cid];
      let totalAssigned = 0;
      let totalFree = 0;
      let theoryHours = 0;
      let labHours = 0;
      let sdaHours = 0;
      let prjHours = 0;

      for (let d = 0; d < this.numDays; d++) {
        for (const s of this.usableSlots) {
          const cell = grid[d][s];
          if (cell.type === 'free') {
            totalFree++;
          } else if (cell.type !== 'break' && cell.subject_id) {
            totalAssigned++;
            if (cell.type === 'lecture') theoryHours++;
            else if (cell.type === 'lab') labHours++;
            else if (cell.type === 'SDA') sdaHours++;
            else if (cell.type === 'PRJ') prjHours++;
          }
        }
      }

      stats[cid] = {
        total_assigned_hours: totalAssigned,
        total_free_hours: totalFree,
        theory_hours: theoryHours,
        lab_hours: labHours,
        sda_hours: sdaHours,
        prj_hours: prjHours,
      };
    }

    return { status: 'SUCCESS', timetables, stats };
  }
}
