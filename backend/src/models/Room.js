import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const roomSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  campus_id: { type: String, default: '' },
  name: { type: String, required: true },
  building: { type: String, default: 'Main Block' },
  floor: { type: String, default: 'Ground Floor' },
  capacity: { type: Number, default: 60 },
  room_type: { type: String, default: 'CLASSROOM' }, // CLASSROOM, LAB, LECTURE_HALL, SEMINAR
  equipment: { type: [String], default: [] },
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

export const Room = mongoose.model('Room', roomSchema);
