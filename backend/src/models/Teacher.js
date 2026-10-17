import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const teacherSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  department_id: { type: String, default: '' },
  name: { type: String, required: true },
  employee_id: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  designation: { type: String, default: 'Faculty' },
  min_weekly_hours: { type: Number, default: 0 },
  target_weekly_hours: { type: Number, default: 15 },
  max_weekly_hours: { type: Number, default: 20 },
  assigned_theory_hours: { type: Number, default: 0 },
  assigned_lab_hours: { type: Number, default: 0 },
  availability: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Teacher = mongoose.model('Teacher', teacherSchema);
