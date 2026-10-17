import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const organizationSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  name: { type: String, required: true },
  subdomain: { type: String, default: 'default' },
  domain: { type: String, default: '' },
  logo_url: { type: String, default: '' },
  contact_email: { type: String, default: '' },
  address: { type: String, default: '' },
  timezone: { type: String, default: 'UTC' },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Organization = mongoose.model('Organization', organizationSchema);

const campusSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  organization_id: { type: String, default: 'default', index: true },
  name: { type: String, required: true },
  code: { type: String, default: '' },
  address: { type: String, default: '' },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret.id || ret._id?.toString();
      return ret;
    }
  }
});

export const Campus = mongoose.model('Campus', campusSchema);
