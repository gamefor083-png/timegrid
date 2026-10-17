import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const generationJobSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  status: { type: String, default: 'QUEUED' }, // QUEUED, RUNNING, COMPLETED, FAILED
  progress: { type: Number, default: 0 },
  current_step: { type: String, default: 'Initializing' },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  classes: { type: [mongoose.Schema.Types.Mixed], default: [] },
  result_version_id: { type: String, default: null },
  error_message: { type: String, default: null },
  started_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const GenerationJob = mongoose.model('GenerationJob', generationJobSchema);
