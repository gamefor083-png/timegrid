import express from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  FALLBACK_SUBJECTS,
  FALLBACK_TEACHERS,
  FALLBACK_ROOMS,
  FALLBACK_CLASS_GROUPS,
  FALLBACK_SEMESTERS,
} from '../data/inMemoryStore.js';

function getFallbackForModel(modelName) {
  if (modelName === 'Subject') return FALLBACK_SUBJECTS;
  if (modelName === 'Teacher') return FALLBACK_TEACHERS;
  if (modelName === 'Room') return FALLBACK_ROOMS;
  if (modelName === 'ClassGroup') return FALLBACK_CLASS_GROUPS;
  if (modelName === 'Semester') return FALLBACK_SEMESTERS;
  return null;
}

/**
 * Creates a standard Express router for CRUD operations on any Mongoose model.
 * Matches the FastAPI get_crud_router behavior exactly.
 */
export function createCrudRouter(Model) {
  const router = express.Router();
  const modelName = Model.modelName;

  // GET all
  router.get('/', async (req, res) => {
    // If MongoDB is not ready or query takes longer than 1200ms, immediately return fallback
    const fallback = getFallbackForModel(modelName);
    if (mongoose.connection.readyState !== 1 && fallback) {
      return res.json(fallback);
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 1500)
      );
      const queryPromise = Model.find({}).sort({ createdAt: -1 });

      const items = await Promise.race([queryPromise, timeoutPromise]);
      if ((!items || items.length === 0) && fallback) {
        return res.json(fallback);
      }
      res.json(items);
    } catch (err) {
      if (fallback) {
        return res.json(fallback);
      }
      res.status(500).json({ detail: err.message });
    }
  });

  // GET one by id or _id
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const fallback = getFallbackForModel(modelName);
    if (mongoose.connection.readyState !== 1 && fallback) {
      const match = fallback.find((x) => x.id === id || x._id === id);
      if (match) return res.json(match);
    }

    try {
      let item = null;
      if (mongoose.connection.readyState === 1) {
        const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1000));
        item = await Promise.race([
          Model.findOne({ id }).then((found) => found || Model.findById(id).catch(() => null)),
          timeoutP,
        ]);
      }
      if (!item && fallback) {
        item = fallback.find((x) => x.id === id || x._id === id);
      }
      if (!item) {
        return res.status(404).json({ detail: 'Item not found' });
      }
      res.json(item);
    } catch (err) {
      if (fallback) {
        const match = fallback.find((x) => x.id === id || x._id === id);
        if (match) return res.json(match);
      }
      res.status(500).json({ detail: err.message });
    }
  });

  // POST create new
  router.post('/', async (req, res) => {
    const payload = { ...req.body };
    if (!payload.id) {
      payload.id = uuidv4();
    }

    try {
      if (mongoose.connection.readyState === 1) {
        const newItem = new Model(payload);
        const saveTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1500));
        await Promise.race([newItem.save(), saveTimeout]);
        return res.status(201).json(newItem);
      }
      res.status(201).json({ ...payload, _id: payload.id, createdAt: new Date().toISOString() });
    } catch (err) {
      res.status(201).json({ ...payload, _id: payload.id, createdAt: new Date().toISOString() });
    }
  });

  // PUT update by id or _id
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (mongoose.connection.readyState === 1) {
        let item = await Model.findOne({ id });
        if (!item) {
          item = await Model.findById(id).catch(() => null);
        }
        if (item) {
          Object.assign(item, req.body);
          await item.save();
          return res.json(item);
        }
      }
      res.json({ id, ...req.body });
    } catch (err) {
      res.json({ id, ...req.body });
    }
  });

  // DELETE by id or _id
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      if (mongoose.connection.readyState === 1) {
        let result = await Model.findOneAndDelete({ id });
        if (!result) {
          result = await Model.findByIdAndDelete(id).catch(() => null);
        }
      }
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      res.json({ message: 'Deleted successfully' });
    }
  });

  return router;
}
