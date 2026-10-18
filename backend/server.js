import './src/config/initDns.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

// Models
import {
  Organization,
  Campus,
  Faculty,
  Branch,
  Program,
  Semester,
  Teacher,
  Room,
  Subject,
  Constraint,
  Holiday,
  ClassGroup,
  Batch,
  Activity,
  OrganizationSchedule,
  TimetableVersion,
  GenerationJob,
} from './src/models/index.js';

// Routers
import { createCrudRouter } from './src/routes/crudRoutes.js';
import { timetableRouter } from './src/routes/timetableRoutes.js';
import { analyticsRouter } from './src/routes/analyticsRoutes.js';
import { hierarchyRouter } from './src/routes/hierarchyRoutes.js';
import { semesterRouter } from './src/routes/semesterRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas / Local
await connectDB();

// Middleware
app.use(cors({
  origin: true, // Reflect request origin (supports Vercel domain, localhost, and custom domains)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.options('*', cors());
app.use(express.json({ limit: '15mb' }));

// Health / Status
app.get('/', (req, res) => {
  res.json({
    message: 'TimeGrid MERN API Online',
    database: 'MongoDB Atlas',
    version: '2.0.0',
    status: 'Ready',
  });
});

// Domain Feature Routers
app.use('/api/v1/timetable', timetableRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1', hierarchyRouter);
app.use('/api/v1', semesterRouter);

// Generic CRUD Routers (matching FastAPI endpoints exactly)
app.use('/api/v1/organizations', createCrudRouter(Organization));
app.use('/api/v1/campuses', createCrudRouter(Campus));
app.use('/api/v1/faculties', createCrudRouter(Faculty));
app.use('/api/v1/branches', createCrudRouter(Branch));
app.use('/api/v1/programs', createCrudRouter(Program));
app.use('/api/v1/semesters', createCrudRouter(Semester));
app.use('/api/v1/teachers', createCrudRouter(Teacher));
app.use('/api/v1/rooms', createCrudRouter(Room));
app.use('/api/v1/subjects', createCrudRouter(Subject));
app.use('/api/v1/constraints', createCrudRouter(Constraint));
app.use('/api/v1/holidays', createCrudRouter(Holiday));
app.use('/api/v1/class-groups', createCrudRouter(ClassGroup));
app.use('/api/v1/batches', createCrudRouter(Batch));
app.use('/api/v1/activities', createCrudRouter(Activity));
app.use('/api/v1/organization-schedules', createCrudRouter(OrganizationSchedule));
app.use('/api/v1/timetable-versions', createCrudRouter(TimetableVersion));
app.use('/api/v1/generation-jobs', createCrudRouter(GenerationJob));

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 TimeGrid MERN Backend running on http://localhost:${PORT}`);
    console.log(`📡 API Endpoints mounted at http://localhost:${PORT}/api/v1`);
  });
}

export default app;
