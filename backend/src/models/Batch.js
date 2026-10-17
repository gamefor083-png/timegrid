import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const batchSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  class_group_id: { type: String, index: true },
  name: { type: String, required: true },
  student_capacity: { type: Number, default: 20 },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Batch = mongoose.model('Batch', batchSchema);
