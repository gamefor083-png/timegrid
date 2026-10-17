import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const constraintSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  constraint_type: { type: String, default: 'SOFT' }, // HARD, SOFT, TEACHER_UNAVAILABLE_SLOTS
  weight: { type: String, default: 'MEDIUM' }, // LOW, MEDIUM, HIGH, CRITICAL
  code: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Constraint = mongoose.model('Constraint', constraintSchema);

const holidaySchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  name: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  holiday_type: { type: String, default: 'PUBLIC' },
  department_id: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Holiday = mongoose.model('Holiday', holidaySchema);
