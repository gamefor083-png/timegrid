import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const organizationScheduleSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  name: { type: String, default: 'Default Schedule' },
  working_days: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  time_slots: {
    type: [mongoose.Schema.Types.Mixed],
    default: [
      { id: '08:00', name: '08:00 – 09:00', type: 'teaching' },
      { id: '09:00', name: '09:00 – 10:00', type: 'teaching' },
      { id: '10:00', name: '10:00 – 11:00', type: 'teaching' },
      { id: '11:00', name: '11:00 – 12:00', type: 'teaching' },
      { id: '12:00', name: '12:00 – 13:00', type: 'break', title: 'Lunch Break' },
      { id: '13:00', name: '13:00 – 14:00', type: 'teaching' },
      { id: '14:00', name: '14:00 – 15:00', type: 'teaching' },
      { id: '15:00', name: '15:00 – 16:00', type: 'teaching' },
      { id: '16:00', name: '16:00 – 17:00', type: 'teaching' },
    ],
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const OrganizationSchedule = mongoose.model('OrganizationSchedule', organizationScheduleSchema);
