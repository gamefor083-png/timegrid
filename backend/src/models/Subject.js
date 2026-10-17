import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const subjectSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  department_id: { type: String, default: '' },
  name: { type: String, required: true },
  code: { type: String, required: true },
  credit_hours: { type: Number, default: 3 },
  subject_type: { type: String, default: 'THEORY' }, // THEORY, PRACTICAL, BOTH
  theory_hours_per_week: { type: Number, default: 3 },
  theory_session_duration: { type: Number, default: 1 },
  lab_hours_per_week: { type: Number, default: 0 },
  lab_session_duration: { type: Number, default: 2 },
  required_room_type: { type: String, default: 'CLASSROOM' },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Subject = mongoose.model('Subject', subjectSchema);
