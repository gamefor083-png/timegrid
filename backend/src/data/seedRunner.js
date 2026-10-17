import dns from 'node:dns';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import {
  SEMESTERS_DATA,
  ROOMS_DATA,
  SUBJECTS_BY_BRANCH,
  FACULTY_BY_BRANCH,
} from './seedData.js';

dotenv.config();

try {
  dns.setDefaultResultOrder?.('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const mongooseModule = await import('mongoose');
const mongoose = mongooseModule.default || mongooseModule;

async function runSeed() {
  console.log('='.repeat(60));
  console.log('  TimeGrid MongoDB Atlas Database Seeder');
  console.log('='.repeat(60));

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timegrid';

  let conn;
  try {
    conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    console.error(`\n❌ Could not connect to MongoDB Atlas: ${error.message}`);
    process.exit(1);
  }

  const {
    Semester,
    Room,
    Subject,
    Teacher,
    ClassGroup,
    OrganizationSchedule,
    Branch,
    Organization,
  } = await import('../models/index.js');

  // Clean old sample data
  console.log('\n🧹 Clearing existing collections...');
  await Promise.all([
    Semester.deleteMany({}),
    Room.deleteMany({}),
    Subject.deleteMany({}),
    Teacher.deleteMany({}),
    ClassGroup.deleteMany({}),
    OrganizationSchedule.deleteMany({}),
    Branch.deleteMany({}),
    Organization.deleteMany({}),
  ]);

  // 1. Organization
  console.log('\n🏛️ [1/6] Seeding Organization...');
  await Organization.create({
    id: 'default',
    name: 'Chhotubhai Gopalbhai Patel Institute of Technology',
    subdomain: 'cgpit',
    address: 'Uka Tarsadia University Campus, Bardoli, Gujarat',
  });

  // 2. Semesters
  console.log('📅 [2/6] Seeding Semesters (Sem 4 & Sem 6)...');
  const createdSemesters = await Semester.insertMany(SEMESTERS_DATA);
  const sem4 = createdSemesters.find(s => s.number === 4);
  const sem6 = createdSemesters.find(s => s.number === 6);

  // 3. Branches
  console.log('🏢 [3/6] Seeding Branches (CE, IT, CSE)...');
  const branches = [
    { id: 'branch-ce', name: 'Computer Engineering', code: 'CE', organization_id: 'default' },
    { id: 'branch-it', name: 'Information Technology', code: 'IT', organization_id: 'default' },
    { id: 'branch-cse', name: 'Computer Science & Engineering', code: 'CSE', organization_id: 'default' },
  ];
  await Branch.insertMany(branches);

  // 4. Rooms & Labs
  console.log('🚪 [4/6] Seeding Classrooms & Specialized Labs...');
  await Room.insertMany(ROOMS_DATA);
  console.log(`   -> Created ${ROOMS_DATA.length} physical spaces`);

  // 5. Teachers & Subjects by Branch
  console.log('👨‍🏫 [5/6] Seeding Faculty & Subjects...');
  let totalSubjects = 0;
  let totalTeachers = 0;

  for (const branch of ['CE', 'IT', 'CSE']) {
    const subjects = SUBJECTS_BY_BRANCH[branch] || [];
    const faculty = FACULTY_BY_BRANCH[branch] || [];

    await Subject.insertMany(subjects);
    await Teacher.insertMany(faculty);

    totalSubjects += subjects.length;
    totalTeachers += faculty.length;
  }
  console.log(`   -> Created ${totalSubjects} curricular courses`);
  console.log(`   -> Created ${totalTeachers} academic faculty members`);

  // 6. Class Groups (Divisions)
  console.log('👥 [6/6] Seeding Divisions & Activity Curricula...');
  const divisions = [
    { code: '4CE-A', name: '4th CE Division A', semester_id: sem4?.id, branch_id: 'branch-ce' },
    { code: '4CE-B', name: '4th CE Division B', semester_id: sem4?.id, branch_id: 'branch-ce' },
    { code: '4IT-A', name: '4th IT Division A', semester_id: sem4?.id, branch_id: 'branch-it' },
    { code: '4IT-B', name: '4th IT Division B', semester_id: sem4?.id, branch_id: 'branch-it' },
    { code: '4CSE-A', name: '4th CSE Division A', semester_id: sem4?.id, branch_id: 'branch-cse' },
    { code: '6CE-A', name: '6th CE Division A', semester_id: sem6?.id, branch_id: 'branch-ce' },
    { code: '6IT-A', name: '6th IT Division A', semester_id: sem6?.id, branch_id: 'branch-it' },
    { code: '6CSE-A', name: '6th CSE Division A', semester_id: sem6?.id, branch_id: 'branch-cse' },
  ];

  for (const div of divisions) {
    await ClassGroup.create({
      id: uuidv4(),
      organization_id: 'default',
      semester_id: div.semester_id,
      branch_id: div.branch_id,
      name: div.name,
      code: div.code,
      student_count: 65,
    });
  }
  console.log(`   -> Created ${divisions.length} student cohort divisions`);

  // Default Schedule Template
  console.log('⏰ Seeding Organization Schedule Template...');
  await OrganizationSchedule.create({
    id: 'default',
    organization_id: 'default',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periods_per_day: 6,
    period_duration_minutes: 60,
    start_time: '09:00',
    slots: [
      { slot_index: 0, day: 'Monday', start_time: '09:00', end_time: '10:00', is_break: false, slot_type: 'theory' },
      { slot_index: 1, day: 'Monday', start_time: '10:00', end_time: '11:00', is_break: false, slot_type: 'theory' },
      { slot_index: 2, day: 'Monday', start_time: '11:00', end_time: '12:00', is_break: false, slot_type: 'theory' },
      { slot_index: 3, day: 'Monday', start_time: '12:00', end_time: '13:00', is_break: true, break_name: 'Lunch Break' },
      { slot_index: 4, day: 'Monday', start_time: '13:00', end_time: '14:00', is_break: false, slot_type: 'lab' },
      { slot_index: 5, day: 'Monday', start_time: '14:00', end_time: '15:00', is_break: false, slot_type: 'lab' },
    ],
  });

  console.log('\n============================================================');
  console.log('🎉 Database seeding completed successfully in MongoDB Atlas!');
  console.log('============================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runSeed();
