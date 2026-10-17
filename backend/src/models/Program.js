import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const programSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  branch_id: { type: String, default: '' },
  name: { type: String, required: true },
  code: { type: String, default: '' },
  duration_years: { type: Number, default: 4 },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Program = mongoose.model('Program', programSchema);
