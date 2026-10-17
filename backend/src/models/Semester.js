import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const semesterSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  program_id: { type: String, default: '' },
  name: { type: String, required: true },
  number: { type: Number, required: true },
  term: { type: String, default: 'Odd' }, // Odd, Even
  academic_year: { type: String, default: '2024-2025' },
  is_active: { type: Boolean, default: true },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Semester = mongoose.model('Semester', semesterSchema);
