/**
 * CollabSphere — Development Seed Script
 *
 * Creates reproducible development data:
 *  - 10 student accounts (password: "Dev@1234" for all)
 *  - 1 admin account
 *  - Skills catalog
 *  - 3 teams
 *  - 3 projects
 *  - Sample connections
 *
 * IMPORTANT: Never run this against a production database.
 * Environment guard: exits if API_ENV !== 'development'.
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.API_ENV === 'production') {
  console.error('[seed] ❌  REFUSING to seed production database. API_ENV=production detected.');
  process.exit(1);
}

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction, closePool, getPool } from '../src/lib/db';

const BCRYPT_ROUNDS = 12;
const DEV_PASSWORD = 'Dev@1234';

// ---------------------------------------------------------------------------
// Skills catalog
// ---------------------------------------------------------------------------
const SKILLS = [
  // Programming Languages
  { name: 'Python', slug: 'python', category: 'Programming Languages' },
  { name: 'JavaScript', slug: 'javascript', category: 'Programming Languages' },
  { name: 'TypeScript', slug: 'typescript', category: 'Programming Languages' },
  { name: 'Java', slug: 'java', category: 'Programming Languages' },
  { name: 'Go', slug: 'go', category: 'Programming Languages' },
  { name: 'Rust', slug: 'rust', category: 'Programming Languages' },
  { name: 'C++', slug: 'cpp', category: 'Programming Languages' },
  { name: 'Kotlin', slug: 'kotlin', category: 'Programming Languages' },
  { name: 'Swift', slug: 'swift', category: 'Programming Languages' },
  { name: 'Ruby', slug: 'ruby', category: 'Programming Languages' },

  // Frontend
  { name: 'React', slug: 'react', category: 'Frontend' },
  { name: 'SvelteKit', slug: 'sveltekit', category: 'Frontend' },
  { name: 'Vue.js', slug: 'vue-js', category: 'Frontend' },
  { name: 'Next.js', slug: 'next-js', category: 'Frontend' },
  { name: 'Tailwind CSS', slug: 'tailwind-css', category: 'Frontend' },
  { name: 'HTML/CSS', slug: 'html-css', category: 'Frontend' },
  { name: 'Three.js', slug: 'three-js', category: 'Frontend' },

  // Backend
  { name: 'Node.js', slug: 'node-js', category: 'Backend' },
  { name: 'Express.js', slug: 'express-js', category: 'Backend' },
  { name: 'FastAPI', slug: 'fastapi', category: 'Backend' },
  { name: 'Django', slug: 'django', category: 'Backend' },
  { name: 'PostgreSQL', slug: 'postgresql', category: 'Backend' },
  { name: 'MongoDB', slug: 'mongodb', category: 'Backend' },
  { name: 'Redis', slug: 'redis', category: 'Backend' },
  { name: 'GraphQL', slug: 'graphql', category: 'Backend' },

  // ML / AI
  { name: 'Machine Learning', slug: 'machine-learning', category: 'AI/ML' },
  { name: 'Deep Learning', slug: 'deep-learning', category: 'AI/ML' },
  { name: 'PyTorch', slug: 'pytorch', category: 'AI/ML' },
  { name: 'TensorFlow', slug: 'tensorflow', category: 'AI/ML' },
  { name: 'Scikit-learn', slug: 'scikit-learn', category: 'AI/ML' },
  { name: 'NLP', slug: 'nlp', category: 'AI/ML' },
  { name: 'Computer Vision', slug: 'computer-vision', category: 'AI/ML' },
  { name: 'LLMs', slug: 'llms', category: 'AI/ML' },

  // Mobile
  { name: 'React Native', slug: 'react-native', category: 'Mobile' },
  { name: 'Flutter', slug: 'flutter', category: 'Mobile' },
  { name: 'Android Development', slug: 'android', category: 'Mobile' },
  { name: 'iOS Development', slug: 'ios', category: 'Mobile' },

  // DevOps / Cloud
  { name: 'Docker', slug: 'docker', category: 'DevOps' },
  { name: 'Kubernetes', slug: 'kubernetes', category: 'DevOps' },
  { name: 'AWS', slug: 'aws', category: 'DevOps' },
  { name: 'GCP', slug: 'gcp', category: 'DevOps' },
  { name: 'CI/CD', slug: 'ci-cd', category: 'DevOps' },
  { name: 'Linux', slug: 'linux', category: 'DevOps' },

  // Design
  { name: 'UI/UX Design', slug: 'ui-ux-design', category: 'Design' },
  { name: 'Figma', slug: 'figma', category: 'Design' },
  { name: 'Graphic Design', slug: 'graphic-design', category: 'Design' },

  // Other
  { name: 'Data Analysis', slug: 'data-analysis', category: 'Data' },
  { name: 'Data Visualization', slug: 'data-visualization', category: 'Data' },
  { name: 'Blockchain', slug: 'blockchain', category: 'Web3' },
  { name: 'Cybersecurity', slug: 'cybersecurity', category: 'Security' },
  { name: 'Game Development', slug: 'game-development', category: 'Other' },
  { name: 'AR/VR', slug: 'ar-vr', category: 'Other' },
];

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
const STUDENTS = [
  {
    email: 'admin@collabsphere.dev',
    role: 'admin' as const,
    fullName: 'Alex Admin',
    username: 'alexadmin',
    headline: 'CollabSphere Platform Administrator',
    bio: 'Managing the CollabSphere platform.',
    institution: 'MIT',
    department: 'Computer Science',
    degree: 'B.S.',
    yearOfStudy: 4,
    githubUrl: 'https://github.com/alexadmin',
    skills: ['typescript', 'node-js', 'postgresql', 'docker'],
  },
  {
    email: 'aisha.patel@student.mit.edu',
    role: 'student' as const,
    fullName: 'Aisha Patel',
    username: 'aishapatel',
    headline: 'Full-Stack Dev | ML Enthusiast | CS @ MIT',
    bio: 'Passionate about building tools that empower students. Love working at the intersection of AI and web technologies. Looking for collaborators on my EdTech startup idea.',
    institution: 'MIT',
    department: 'Electrical Engineering & CS',
    degree: 'B.S.',
    yearOfStudy: 3,
    graduationYear: 2026,
    city: 'Cambridge',
    country: 'USA',
    githubUrl: 'https://github.com/aishapatel',
    linkedinUrl: 'https://linkedin.com/in/aishapatel',
    skills: ['python', 'react', 'machine-learning', 'postgresql', 'docker'],
  },
  {
    email: 'marcus.johnson@student.stanford.edu',
    role: 'student' as const,
    fullName: 'Marcus Johnson',
    username: 'marcusjohnson',
    headline: 'Backend Engineer | Distributed Systems | Stanford CS',
    bio: 'Building scalable systems. I\'m particularly interested in distributed computing, consensus algorithms, and database internals.',
    institution: 'Stanford University',
    department: 'Computer Science',
    degree: 'M.S.',
    yearOfStudy: 2,
    graduationYear: 2026,
    city: 'Palo Alto',
    country: 'USA',
    githubUrl: 'https://github.com/marcusjohnson',
    skills: ['go', 'rust', 'postgresql', 'kubernetes', 'redis'],
  },
  {
    email: 'priya.kumar@student.iit.ac.in',
    role: 'student' as const,
    fullName: 'Priya Kumar',
    username: 'priyakumar',
    headline: 'AI/ML Researcher | NLP | IIT Delhi',
    bio: 'Researching large language models and their applications in education. Published 2 papers on educational NLP. Open to research collaborations.',
    institution: 'IIT Delhi',
    department: 'Computer Science',
    degree: 'M.Tech',
    yearOfStudy: 2,
    graduationYear: 2026,
    city: 'New Delhi',
    country: 'India',
    githubUrl: 'https://github.com/priyakumar',
    skills: ['python', 'pytorch', 'nlp', 'deep-learning', 'tensorflow'],
  },
  {
    email: 'luca.rossi@student.polimi.it',
    role: 'student' as const,
    fullName: 'Luca Rossi',
    username: 'lucarossi',
    headline: 'Mobile Dev | Flutter | Politecnico di Milano',
    bio: 'Building cross-platform mobile apps. I\'ve shipped 3 apps with 10k+ downloads. Looking to collaborate on impactful mobile projects.',
    institution: 'Politecnico di Milano',
    department: 'Computer Engineering',
    degree: 'B.Eng',
    yearOfStudy: 4,
    graduationYear: 2025,
    city: 'Milan',
    country: 'Italy',
    githubUrl: 'https://github.com/lucarossi',
    skills: ['flutter', 'react-native', 'dart', 'ios', 'android'],
  },
  {
    email: 'zoe.chen@student.waterloo.ca',
    role: 'student' as const,
    fullName: 'Zoe Chen',
    username: 'zoechen',
    headline: 'UI/UX Designer & Frontend Dev | Waterloo',
    bio: 'Passionate about creating beautiful, accessible interfaces. 3 co-op terms at top tech companies. Figma power user.',
    institution: 'University of Waterloo',
    department: 'Systems Design Engineering',
    degree: 'B.Eng',
    yearOfStudy: 3,
    graduationYear: 2026,
    city: 'Waterloo',
    country: 'Canada',
    githubUrl: 'https://github.com/zoechen',
    skills: ['react', 'figma', 'ui-ux-design', 'typescript', 'tailwind-css'],
  },
  {
    email: 'omar.ali@student.cairo.edu',
    role: 'student' as const,
    fullName: 'Omar Ali',
    username: 'omarali',
    headline: 'Data Engineer | Cloud Native | Cairo University',
    bio: 'Building data pipelines and analytics platforms. Interested in real-time data processing and ML in production.',
    institution: 'Cairo University',
    department: 'Computer Science',
    degree: 'B.Sc',
    yearOfStudy: 4,
    graduationYear: 2025,
    city: 'Cairo',
    country: 'Egypt',
    githubUrl: 'https://github.com/omarali',
    skills: ['python', 'postgresql', 'aws', 'docker', 'data-analysis'],
  },
  {
    email: 'sofia.martinez@student.upm.es',
    role: 'student' as const,
    fullName: 'Sofia Martinez',
    username: 'sofiamartinez',
    headline: 'Full-Stack Dev | Blockchain | UPM Madrid',
    bio: 'Building decentralized applications and smart contracts. Interested in the intersection of web3 and real-world utility.',
    institution: 'UPM Madrid',
    department: 'Informatics Engineering',
    degree: 'M.Sc',
    yearOfStudy: 2,
    graduationYear: 2026,
    city: 'Madrid',
    country: 'Spain',
    githubUrl: 'https://github.com/sofiamartinez',
    skills: ['javascript', 'typescript', 'react', 'blockchain', 'node-js'],
  },
  {
    email: 'kwame.asante@student.ghana.edu',
    role: 'student' as const,
    fullName: 'Kwame Asante',
    username: 'kwameasante',
    headline: 'Backend Dev | Fintech | University of Ghana',
    bio: 'Building financial technology for emerging markets. Interested in payment systems, mobile banking, and financial inclusion.',
    institution: 'University of Ghana',
    department: 'Computer Science',
    degree: 'B.Sc',
    yearOfStudy: 3,
    graduationYear: 2026,
    city: 'Accra',
    country: 'Ghana',
    githubUrl: 'https://github.com/kwameasante',
    skills: ['java', 'spring-boot', 'postgresql', 'react', 'docker'],
  },
  {
    email: 'yuki.tanaka@student.todai.ac.jp',
    role: 'student' as const,
    fullName: 'Yuki Tanaka',
    username: 'yukitanaka',
    headline: 'Computer Vision Researcher | Robotics | UTokyo',
    bio: 'Researching real-time computer vision for autonomous robots. Love combining hardware and software.',
    institution: 'University of Tokyo',
    department: 'Information Science and Technology',
    degree: 'M.S.',
    yearOfStudy: 1,
    graduationYear: 2027,
    city: 'Tokyo',
    country: 'Japan',
    githubUrl: 'https://github.com/yukitanaka',
    skills: ['python', 'pytorch', 'computer-vision', 'cpp', 'ros'],
  },
];

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------
const TEAMS_DATA = [
  {
    name: 'NeuralNest',
    slug: 'neuralnest',
    description: 'A team building AI-powered educational tools. We specialize in NLP, recommendation systems, and learning analytics.',
    domain: 'EdTech / AI',
    tags: ['ai', 'education', 'nlp', 'machine-learning'],
    isRecruiting: true,
    leaderUsername: 'priyakumar',
    members: ['aishapatel', 'omarali'],
  },
  {
    name: 'ByteBuilders',
    slug: 'bytebuilders',
    description: 'Full-stack team working on developer productivity tools. We care about clean APIs, beautiful UIs, and great DX.',
    domain: 'Developer Tools',
    tags: ['fullstack', 'developer-tools', 'open-source'],
    isRecruiting: true,
    leaderUsername: 'marcusjohnson',
    members: ['zoechen', 'sofiamartinez'],
  },
  {
    name: 'MobileMinds',
    slug: 'mobileminds',
    description: 'Building mobile-first solutions for emerging markets, focusing on fintech and healthcare accessibility.',
    domain: 'Mobile / FinTech',
    tags: ['mobile', 'fintech', 'flutter', 'react-native'],
    isRecruiting: true,
    leaderUsername: 'lucarossi',
    members: ['kwameasante', 'yukitanaka'],
  },
];

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
const PROJECTS_DATA = [
  {
    teamSlug: 'neuralnest',
    name: 'StudyMate AI',
    slug: 'studymate-ai',
    tagline: 'Personalized learning paths powered by AI',
    description: 'An AI-powered platform that analyzes your learning style, identifies knowledge gaps, and creates personalized study plans. Uses NLP to generate practice questions from your course materials.',
    status: 'active' as const,
    domain: 'EdTech',
    tags: ['ai', 'nlp', 'education', 'python', 'react'],
    githubUrl: 'https://github.com/neuralnest/studymate-ai',
    isPublic: true,
    requiredSkills: ['python', 'nlp', 'react', 'postgresql'],
    createdByUsername: 'priyakumar',
  },
  {
    teamSlug: 'bytebuilders',
    name: 'DevLink',
    slug: 'devlink',
    tagline: 'GitHub-integrated project management for student teams',
    description: 'A lightweight project management tool that integrates directly with GitHub. Automatically tracks contributions, creates smart task suggestions from issues, and generates progress reports.',
    status: 'active' as const,
    domain: 'Developer Tools',
    tags: ['developer-tools', 'github', 'typescript', 'postgresql'],
    githubUrl: 'https://github.com/bytebuilders/devlink',
    isPublic: true,
    requiredSkills: ['typescript', 'react', 'node-js', 'postgresql'],
    createdByUsername: 'marcusjohnson',
  },
  {
    teamSlug: 'mobileminds',
    name: 'PocketPay',
    slug: 'pocketpay',
    tagline: 'Mobile payments for the unbanked',
    description: 'A mobile payment solution targeting underserved communities in emerging markets. Supports offline transactions, QR code payments, and integrates with local mobile money providers.',
    status: 'planning' as const,
    domain: 'FinTech',
    tags: ['fintech', 'mobile', 'flutter', 'blockchain'],
    isPublic: true,
    requiredSkills: ['flutter', 'java', 'blockchain', 'react-native'],
    createdByUsername: 'lucarossi',
  },
];

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------
const OPPORTUNITIES_DATA = [
  {
    type: 'hackathon' as const,
    title: 'HackMIT 2025',
    organization: 'MIT',
    description: 'One of the biggest student hackathons in the world. 1000+ students, 24 hours, $50k in prizes.',
    applicationUrl: 'https://hackmit.org',
    deadline: '2025-09-01',
    startDate: '2025-09-13',
    endDate: '2025-09-14',
    isRemote: false,
    location: 'Cambridge, MA, USA',
    tags: ['hackathon', 'mit', 'ai', 'web', 'mobile'],
    isVerified: true,
  },
  {
    type: 'internship' as const,
    title: 'Google Summer of Code 2025',
    organization: 'Google',
    description: 'A global program focused on bringing more student developers into open source software development.',
    applicationUrl: 'https://summerofcode.withgoogle.com',
    deadline: '2025-04-02',
    startDate: '2025-05-20',
    endDate: '2025-08-25',
    isRemote: true,
    tags: ['open-source', 'google', 'paid', 'remote'],
    isVerified: true,
  },
  {
    type: 'workshop' as const,
    title: 'AWS Student Builder Workshop',
    organization: 'Amazon Web Services',
    description: 'Free hands-on workshop covering serverless architecture, container deployment, and cloud-native development.',
    applicationUrl: 'https://aws.amazon.com/students',
    deadline: '2025-03-15',
    startDate: '2025-03-22',
    endDate: '2025-03-22',
    isRemote: true,
    tags: ['cloud', 'aws', 'workshop', 'serverless', 'free'],
    isVerified: true,
  },
];

// ---------------------------------------------------------------------------
// Seed execution
// ---------------------------------------------------------------------------
async function seed(): Promise<void> {
  const pool = getPool();
  console.log('\n🌱 CollabSphere Development Seed Script');
  console.log('='.repeat(50));
  console.log('⚠️  This creates DEVELOPMENT data only. Do NOT run on production.\n');

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_ROUNDS);
  console.log(`✓ Password hash generated (all users: "${DEV_PASSWORD}")`);

  await withTransaction(async (client) => {
    // -------------------------------------------------------------------------
    // Clear existing data (in dependency order)
    // -------------------------------------------------------------------------
    console.log('\n→ Clearing existing seed data...');
    await client.query('TRUNCATE TABLE audit_logs, refresh_tokens, skill_endorsements, follows, connections, user_skills, student_profiles, users, skills, teams, team_members, open_positions, position_applications, collaboration_requests, projects, project_skills, project_members, milestones, tasks, task_assignments, project_activity, project_bookmarks, posts, post_reactions, comments, comment_reactions, notifications, learning_resources, opportunities, opportunity_bookmarks, project_documents, discussion_threads, thread_replies, github_accounts, project_github_repos, verification_requests, reports CASCADE');
    console.log('✓ Existing data cleared');

    // -------------------------------------------------------------------------
    // Skills
    // -------------------------------------------------------------------------
    console.log('\n→ Seeding skills catalog...');
    const skillIds: Record<string, string> = {};
    for (const skill of SKILLS) {
      const result = await client.query(
        'INSERT INTO skills (name, slug, category) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        [skill.name, skill.slug, skill.category]
      );
      skillIds[skill.slug] = result.rows[0].id;
    }
    console.log(`✓ ${SKILLS.length} skills seeded`);

    // -------------------------------------------------------------------------
    // Users and profiles
    // -------------------------------------------------------------------------
    console.log('\n→ Seeding users and profiles...');
    const userIds: Record<string, string> = {};

    for (const student of STUDENTS) {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, email_verified, verification_status)
         VALUES ($1, $2, $3, TRUE, 'verified')
         RETURNING id`,
        [student.email, passwordHash, student.role]
      );
      const userId = userResult.rows[0].id;
      userIds[student.username] = userId;

      await client.query(
        `INSERT INTO student_profiles
           (user_id, full_name, username, headline, bio, institution, department, degree,
            year_of_study, graduation_year, city, country, github_url, linkedin_url,
            open_to_collaborate)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE)`,
        [
          userId, student.fullName, student.username,
          student.headline ?? null, student.bio ?? null,
          student.institution ?? null, student.department ?? null, student.degree ?? null,
          student.yearOfStudy ?? null, (student as { graduationYear?: number }).graduationYear ?? null,
          (student as { city?: string }).city ?? null, (student as { country?: string }).country ?? null,
          student.githubUrl ?? null, (student as { linkedinUrl?: string }).linkedinUrl ?? null,
        ]
      );

      // Add skills
      for (const skillSlug of student.skills) {
        const sid = skillIds[skillSlug];
        if (sid) {
          await client.query(
            'INSERT INTO user_skills (user_id, skill_id, level) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [userId, sid, 'intermediate']
          );
        }
      }

      console.log(`  ✓ ${student.fullName} (${student.email})`);
    }

    // -------------------------------------------------------------------------
    // Connections
    // -------------------------------------------------------------------------
    console.log('\n→ Seeding connections...');
    const connectionPairs = [
      ['aishapatel', 'marcusjohnson'],
      ['aishapatel', 'priyakumar'],
      ['marcusjohnson', 'zoechen'],
      ['priyakumar', 'omarali'],
      ['lucarossi', 'kwameasante'],
      ['zoechen', 'sofiamartinez'],
    ];
    for (const [u1, u2] of connectionPairs) {
      await client.query(
        `INSERT INTO connections (requester_id, addressee_id, status) VALUES ($1, $2, 'accepted')`,
        [userIds[u1], userIds[u2]]
      );
    }
    console.log(`✓ ${connectionPairs.length} connections created`);

    // -------------------------------------------------------------------------
    // Teams
    // -------------------------------------------------------------------------
    console.log('\n→ Seeding teams...');
    const teamIds: Record<string, string> = {};

    for (const team of TEAMS_DATA) {
      const leaderId = userIds[team.leaderUsername];
      const teamResult = await client.query(
        `INSERT INTO teams (name, slug, description, domain, tags, is_recruiting, is_public, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
         RETURNING id`,
        [team.name, team.slug, team.description, team.domain, team.tags, team.isRecruiting, leaderId]
      );
      const teamId = teamResult.rows[0].id;
      teamIds[team.slug] = teamId;

      // Leader
      await client.query(
        'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
        [teamId, leaderId, 'leader']
      );

      // Members
      for (const memberUsername of team.members) {
        const memberId = userIds[memberUsername];
        if (memberId) {
          await client.query(
            'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
            [teamId, memberId, 'member']
          );
        }
      }
      console.log(`  ✓ ${team.name}`);
    }

    // -------------------------------------------------------------------------
    // Projects
    // -------------------------------------------------------------------------
    console.log('\n→ Seeding projects...');
    for (const proj of PROJECTS_DATA) {
      const teamId = teamIds[proj.teamSlug];
      const createdById = userIds[proj.createdByUsername];

      const projResult = await client.query(
        `INSERT INTO projects (team_id, name, slug, tagline, description, status, domain, tags, github_url, is_public, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING id`,
        [teamId, proj.name, proj.slug, proj.tagline, proj.description,
         proj.status, proj.domain, proj.tags, proj.githubUrl ?? null, proj.isPublic, createdById]
      );
      const projectId = projResult.rows[0].id;

      // Required skills
      for (const skillSlug of proj.requiredSkills) {
        const sid = skillIds[skillSlug];
        if (sid) {
          await client.query(
            'INSERT INTO project_skills (project_id, skill_id, is_required) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING',
            [projectId, sid]
          );
        }
      }

      // Add team members as project members
      const teamMembersResult = await client.query(
        'SELECT user_id FROM team_members WHERE team_id = $1',
        [teamId]
      );
      for (const tm of teamMembersResult.rows) {
        await client.query(
          'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [projectId, tm.user_id]
        );
      }

      console.log(`  ✓ ${proj.name}`);
    }

    // -------------------------------------------------------------------------
    // Opportunities
    // -------------------------------------------------------------------------
    console.log('\n→ Seeding opportunities...');
    const adminId = userIds['alexadmin'];
    for (const opp of OPPORTUNITIES_DATA) {
      await client.query(
        `INSERT INTO opportunities
           (created_by, type, title, organization, description, application_url,
            deadline, start_date, end_date, is_remote, location, tags, is_verified, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE)`,
        [
          adminId, opp.type, opp.title, opp.organization, opp.description,
          opp.applicationUrl, opp.deadline, opp.startDate, opp.endDate,
          opp.isRemote, (opp as { location?: string }).location ?? null,
          opp.tags, opp.isVerified,
        ]
      );
      console.log(`  ✓ ${opp.title}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed complete!\n');
  console.log('Development accounts (password: "Dev@1234" for all):');
  for (const s of STUDENTS) {
    console.log(`  ${s.role === 'admin' ? '👑' : '👤'} ${s.email} (${s.username})`);
  }
  console.log('\n🚀 Start the backend: npm run dev');
  console.log('🌐 Start the frontend: cd ../frontend && npm run dev\n');
}

seed()
  .catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await closePool();
  });
