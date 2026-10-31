// demo-data.js — Rich Demo Engine for GyanSetu
// Enables complete 1-click exploration of all platform features:
// - Credit Ledger with real earning/spending history
// - Live Notes Vault (unlocking & contributing notes)
// - Skill Duels & Team Race Arena
// - Mentors & Sessions

const DEMO_PROFILES = [
  {
    id: 'demo-user-1',
    full_name: 'Aditya Verma',
    email: 'aditya.verma@gyansetu.edu.in',
    department: 'Computer Science & Engineering',
    role: 'learner',
    credits: 155,
    xp: 680,
    streak: 5,
    total_earned: 260,
    total_spent: 105,
    pending_credits: 0,
    welcome_bonus_given: true,
    badges: ['welcome', 'first_session', 'note_maker', 'fast_solver']
  },
  {
    id: 'demo-user-2',
    full_name: 'Riya Sharma',
    email: 'riya.sharma@gyansetu.edu.in',
    department: 'Information Technology',
    role: 'mentor',
    credits: 240,
    xp: 1250,
    streak: 8,
    total_earned: 380,
    total_spent: 140,
    pending_credits: 0,
    welcome_bonus_given: true,
    badges: ['welcome', 'first_session', 'first_teaching', 'helpful_mentor', 'streak_7']
  },
  {
    id: 'demo-user-3',
    full_name: 'Kabir Mehta',
    email: 'kabir.mehta@gyansetu.edu.in',
    department: 'AI & Data Science',
    role: 'learner',
    credits: 180,
    xp: 820,
    streak: 6,
    total_earned: 290,
    total_spent: 110,
    pending_credits: 0,
    welcome_bonus_given: true,
    badges: ['welcome', 'first_session', 'note_maker', 'fast_solver']
  }
];

// Pick active demo profile or retrieve from sessionStorage
let activeDemoIdx = 0;
try {
  const savedIdx = sessionStorage.getItem('gyansetu_demo_idx');
  if (savedIdx !== null) activeDemoIdx = parseInt(savedIdx, 10) % DEMO_PROFILES.length;
} catch (e) {}

let currentDemoProfile = { ...DEMO_PROFILES[activeDemoIdx] };
try {
  const customUser = sessionStorage.getItem('gyansetu_demo_custom_user');
  if (customUser) {
    const parsed = JSON.parse(customUser);
    if (parsed && (parsed.email || parsed.full_name)) {
      currentDemoProfile = { ...currentDemoProfile, ...parsed };
    }
  }
} catch (e) {}

window.GYANSETU_DEMO = {
  profile: currentDemoProfile,
  mentors: [
    {
      id: 'demo-mentor-1',
      full_name: 'Aarav Sharma',
      name: 'Aarav Sharma',
      avatar: 'AS',
      department: 'Computer Science',
      year: '3rd Year',
      rating: 4.9,
      sessions: 142,
      topics: ['DSA', 'Graph Algorithms', 'Dynamic Programming'],
      languages: ['C++', 'Python'],
      availability: 'online',
      bio: 'Competitive programmer (Codeforces Candidate Master). Passionate about teaching graph algorithms & problem solving.'
    },
    {
      id: 'demo-mentor-2',
      full_name: 'Priya Mehta',
      name: 'Priya Mehta',
      avatar: 'PM',
      department: 'Information Technology',
      year: '2nd Year',
      rating: 4.8,
      sessions: 97,
      topics: ['Web Engineering', 'React', 'Fullstack Systems'],
      languages: ['JavaScript', 'TypeScript', 'Node.js'],
      availability: 'online',
      bio: 'Frontend architect and open-source enthusiast. Happy to help debug tricky React or state sync bugs.'
    },
    {
      id: 'demo-mentor-3',
      full_name: 'Rohan Gupta',
      name: 'Rohan Gupta',
      avatar: 'RG',
      department: 'AI & Machine Learning',
      year: '4th Year',
      rating: 4.7,
      sessions: 210,
      topics: ['Machine Learning', 'PyTorch', 'Data Pipelines'],
      languages: ['Python', 'SQL'],
      availability: 'busy',
      bio: 'Published ML researcher. Specializes in deep neural networks and fast model inference optimization.'
    }
  ],
  sessions: [
    {
      id: 'demo-sess-1',
      topic: 'Binary Trees & Dynamic Programming',
      mentor_name: 'Aarav Sharma',
      learner_name: currentDemoProfile.full_name,
      credits_offered: 15,
      status: 'complete',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-sess-2',
      topic: 'React 19 Server Components & Hooks',
      mentor_name: 'Priya Mehta',
      learner_name: currentDemoProfile.full_name,
      credits_offered: 10,
      status: 'active',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    }
  ],
  ledger: [
    {
      id: 'demo-tx-1',
      user_id: currentDemoProfile.id,
      amount: 100,
      balance_after: 100,
      type: 'WELCOME_BONUS',
      reason: 'Welcome Bonus on signup',
      reference_type: 'SYSTEM',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-tx-2',
      user_id: currentDemoProfile.id,
      amount: 10,
      balance_after: 110,
      type: 'EARN',
      reason: 'Notes Contribution: Graph Algorithms Cheat Sheet',
      reference_type: 'NOTE_CONTRIBUTION',
      reference_id: 'note-1',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-tx-3',
      user_id: currentDemoProfile.id,
      amount: 100,
      balance_after: 210,
      type: 'EARN',
      reason: 'Live Session Teaching Reward: Trees in DSA',
      reference_type: 'SESSION',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-tx-4',
      user_id: currentDemoProfile.id,
      amount: -50,
      balance_after: 160,
      type: 'SPEND',
      reason: 'Live Learning Session with Priya Mehta',
      reference_type: 'SESSION',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-tx-5',
      user_id: currentDemoProfile.id,
      amount: -5,
      balance_after: 155,
      type: 'SPEND',
      reason: 'Notes Access: OS Concurrency & Memory Paging',
      reference_type: 'NOTE',
      reference_id: 'note-2',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  chart: [15, 30, 25, 45, 60, 90, 155],
  leaderboard: [
    { id: 'lead-1', full_name: 'Aarav Sharma', xp: 1420 },
    { id: 'lead-2', full_name: 'Priya Mehta', xp: 980 },
    { id: currentDemoProfile.id, full_name: currentDemoProfile.full_name, xp: currentDemoProfile.xp },
    { id: 'lead-4', full_name: 'Rohan Gupta', xp: 310 },
    { id: 'lead-5', full_name: 'Sneha Patil', xp: 240 }
  ]
};

// Global helper to switch to a random demo identity
window.switchRandomDemoProfile = function() {
  const nextIdx = (activeDemoIdx + 1) % DEMO_PROFILES.length;
  sessionStorage.removeItem('gyansetu_demo_custom_user');
  sessionStorage.setItem('gyansetu_demo_idx', String(nextIdx));
  sessionStorage.setItem('gyansetu_demo_mode', 'true');
  window.GYANSETU_DEMO.profile = { ...DEMO_PROFILES[nextIdx] };
  return DEMO_PROFILES[nextIdx];
};

window.setDemoCustomUser = function(email, fullName, dept) {
  const name = fullName || (email ? email.split('@')[0].replace(/[._]/g, ' ') : 'Campus Scholar');
  const capName = name.replace(/\b\w/g, c => c.toUpperCase());
  const custom = {
    id: 'demo-' + Math.random().toString(36).substring(2, 9),
    full_name: capName,
    email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@gyansetu.edu.in`,
    department: dept || 'Computer Science & Engineering',
    role: 'learner',
    credits: 155,
    xp: 750,
    streak: 4,
    total_earned: 260,
    total_spent: 105,
    pending_credits: 0,
    welcome_bonus_given: true,
    badges: ['welcome', 'first_session', 'note_maker', 'fast_solver']
  };
  sessionStorage.setItem('gyansetu_demo_custom_user', JSON.stringify(custom));
  sessionStorage.setItem('gyansetu_demo_mode', 'true');
  window.GYANSETU_DEMO.profile = custom;
  return custom;
};

window.generateRandomCampusIdentity = function() {
  const names = [
    { name: 'Aditya Verma', dept: 'Computer Science & Engineering', roll: 'cs24' },
    { name: 'Riya Sharma', dept: 'Information Technology', roll: 'it23' },
    { name: 'Kabir Mehta', dept: 'AI & Data Science', roll: 'ai25' },
    { name: 'Ananya Iyer', dept: 'Electronics & Communication', roll: 'ece24' },
    { name: 'Devansh Roy', dept: 'Software Engineering', roll: 'se23' },
    { name: 'Tanvi Kulkarni', dept: 'Data Science & Analytics', roll: 'ds24' }
  ];
  const pick = names[Math.floor(Math.random() * names.length)];
  const email = `${pick.name.toLowerCase().replace(/\s+/g, '.')}.${pick.roll}@campus.edu.in`;
  return window.setDemoCustomUser(email, pick.name, pick.dept);
};

window.getDemoProfile = function() {
  return window.GYANSETU_DEMO.profile;
};