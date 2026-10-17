import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const timetableVersionSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  semester_id: { type: String, default: null },
  version_number: { type: Number, default: 1 },
  name: { type: String, default: 'Preset 1' },
  status: { type: String, default: 'DRAFT' }, // DRAFT, PUBLISHED, ARCHIVED
  
  // { class_id: grid[day][slot] }
  timetables: { type: mongoose.Schema.Types.Mixed, default: {} },
  stats: { type: mongoose.Schema.Types.Mixed, default: {} },
  quality: { type: mongoose.Schema.Types.Mixed, default: {} },
  config_used: { type: mongoose.Schema.Types.Mixed, default: {} },
  classes_used: { type: [mongoose.Schema.Types.Mixed], default: [] },
  conflicts: { type: [mongoose.Schema.Types.Mixed], default: [] },
  
  solver_type: { type: String, default: 'MERN Timetable Engine' },
  generation_time_seconds: { type: Number, default: 0 },
  published_at: { type: Date, default: null },
  created_by: { type: String, default: 'System' },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const TimetableVersion = mongoose.model('TimetableVersion', timetableVersionSchema);
