import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const classGroupSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  semester_id: { type: String, index: true },
  name: { type: String, required: true },
  branch: { type: String, default: 'Computer Engineering' },
  student_capacity: { type: Number, default: 60 },
  
  // Weekly Academic Load Constraints
  total_theory_hours: { type: Number, default: 13 },
  total_practical_hours: { type: Number, default: 8 },
  sda_hours: { type: Number, default: 5 }, // Skill Development Activity (Free Lecture without faculty)
  prj_hours: { type: Number, default: 4 }, // Project-2 / Capstone Project (Free Lecture without faculty)
  total_weekly_load: { type: Number, default: 30 },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const ClassGroup = mongoose.model('ClassGroup', classGroupSchema);
