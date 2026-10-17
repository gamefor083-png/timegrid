import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const activitySchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  semester_id: { type: String, default: '' },
  subject_id: { type: String, index: true },
  teacher_id: { type: String, index: true },
  class_group_id: { type: String, index: true },
  batch_id: { type: String, default: '' },
  activity_type: { type: String, default: 'LECTURE' }, // LECTURE, LAB, TUTORIAL, PRJ, SDA
  duration_slots: { type: Number, default: 1 },
  occurrences_per_week: { type: Number, default: 1 },
  room_id: { type: String, default: '' },
  room_name: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Activity = mongoose.model('Activity', activitySchema);
