import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const branchSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  faculty_id: { type: String, default: '' },
  name: { type: String, required: true },
  code: { type: String, default: '' },
  head_of_department_id: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Branch = mongoose.model('Branch', branchSchema);
