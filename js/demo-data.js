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
    streak: 12,
    total_earned: 260,
    total_spent: 105,
    pending_credits: 0,
    welcome_bonus_given: true,
    rr: 1245,
    highest_rr: 1245,
    rank_protection_count: 1,
    challenge_wins: 14,
    country: 'India',
    state: 'Uttarakhand',
    city: 'Haldwani',
    college: 'Graphic Era Hill University',
    badges: ['welcome', 'first_session', 'note_maker', 'fast_solver', 'rank_climber']
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
    rr: 1840,
    highest_rr: 1880,
    rank_protection_count: 1,
    challenge_wins: 22,
    country: 'India',
    state: 'Uttarakhand',
    city: 'Dehradun',
    college: 'Graphic Era University',
    badges: ['welcome', 'first_session', 'first_teaching', 'helpful_mentor', 'streak_7', 'rank_climber']
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
    rr: 1680,
    highest_rr: 1720,
    rank_protection_count: 1,
    challenge_wins: 18,
    country: 'India',
    state: 'Uttarakhand',
    city: 'Haldwani',
    college: 'Graphic Era Hill University',
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
  rr_ledger: [
    {
      id: 'rr-tx-1',
      user_id: currentDemoProfile.id,
      amount: 20,
      previous_rr: 1225,
      new_rr: 1245,
      reason: 'Challenge Won: Rotated Array Binary Search',
      reference_type: 'CHALLENGE',
      reference_id: 'chal_dsa',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rr-tx-2',
      user_id: currentDemoProfile.id,
      amount: 25,
      previous_rr: 1200,
      new_rr: 1225,
      reason: 'Team Race Victory: Team ByteForce',
      reference_type: 'TEAM_CHALLENGE',
      reference_id: 'race_arena_1',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rr-tx-3',
      user_id: currentDemoProfile.id,
      amount: -10,
      previous_rr: 1210,
      new_rr: 1200,
      reason: 'Challenge Lost: Distributed Cache Consistency',
      reference_type: 'CHALLENGE',
      reference_id: 'chal_cache_loss',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rr-tx-4',
      user_id: currentDemoProfile.id,
      amount: 15,
      previous_rr: 1195,
      new_rr: 1210,
      reason: 'Successful Live Learning: Dynamic Programming with Aarav Sharma',
      reference_type: 'SESSION',
      reference_id: 'demo-sess-1',
      status: 'COMPLETED',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  chart: [15, 30, 25, 45, 60, 90, 155],
  leaderboard: [
    {
      id: 'lead-1',
      full_name: 'Arjun Rawat',
      rr: 3120,
      xp: 3850,
      streak: 18,
      challenge_wins: 48,
      weekly_rr: 125,
      monthly_rr: 340,
      country: 'India',
      state: 'Uttarakhand',
      city: 'Haldwani',
      college: 'Graphic Era Hill University'
    },
    {
      id: 'lead-2',
      full_name: 'Devika Sen',
      rr: 2890,
      xp: 3200,
      streak: 21,
      challenge_wins: 41,
      weekly_rr: 95,
      monthly_rr: 280,
      country: 'India',
      state: 'Uttarakhand',
      city: 'Roorkee',
      college: 'IIT Roorkee'
    },
    {
      id: 'lead-3',
      full_name: 'Rohan Gupta',
      rr: 2350,
      xp: 2600,
      streak: 14,
      challenge_wins: 32,
      weekly_rr: 65,
      monthly_rr: 190,
      country: 'India',
      state: 'Uttarakhand',
      city: 'Haldwani',
      college: 'Graphic Era Hill University'
    },
    {
      id: 'lead-4',
      full_name: 'Riya Sharma',
      rr: 1840,
      xp: 1950,
      streak: 8,
      challenge_wins: 24,
      weekly_rr: 80,
      monthly_rr: 210,
      country: 'India',
      state: 'Uttarakhand',
      city: 'Dehradun',
      college: 'Graphic Era University'
    },
    {
      id: 'lead-5',
      full_name: 'Aarav Sharma',
      rr: 1680,
      xp: 1820,
      streak: 9,
      challenge_wins: 20,
      weekly_rr: 45,
      monthly_rr: 150,
      country: 'India',
      state: 'Uttarakhand',
      city: 'Haldwani',
      college: 'Graphic Era Hill University'
    },
    {
      id: 'lead-6',
      full_name: 'Sneha Deshmukh',
      rr: 1540,
      xp: 1420,
      streak: 11,
      challenge_wins: 19,
      weekly_rr: 55,
      monthly_rr: 170,
      country: 'India',
      state: 'Maharashtra',
      city: 'Pune',
      college: 'COEP Tech University'
    },
    {
      id: 'lead-7',
      full_name: 'Kunal Verma',
      rr: 1390,
      xp: 1150,
      streak: 7,
      challenge_wins: 16,
      weekly_rr: 40,
      monthly_rr: 120,
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      college: 'Delhi Technological University'
    },
    {
      id: currentDemoProfile.id,
      full_name: currentDemoProfile.full_name,
      rr: currentDemoProfile.rr || 1245,
      xp: currentDemoProfile.xp || 680,
      streak: currentDemoProfile.streak || 12,
      challenge_wins: currentDemoProfile.challenge_wins || 14,
      weekly_rr: 45,
      monthly_rr: 140,
      country: currentDemoProfile.country || 'India',
      state: currentDemoProfile.state || 'Uttarakhand',
      city: currentDemoProfile.city || 'Haldwani',
      college: currentDemoProfile.college || 'Graphic Era Hill University'
    },
    {
      id: 'lead-9',
      full_name: 'Tanvi Kulkarni',
      rr: 1120,
      xp: 890,
      streak: 5,
      challenge_wins: 11,
      weekly_rr: 30,
      monthly_rr: 95,
      country: 'India',
      state: 'Maharashtra',
      city: 'Mumbai',
      college: 'VJTI Mumbai'
    },
    {
      id: 'lead-10',
      full_name: 'Devansh Roy',
      rr: 960,
      xp: 720,
      streak: 4,
      challenge_wins: 9,
      weekly_rr: 25,
      monthly_rr: 80,
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      college: 'BMS College of Engineering'
    }
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
    streak: 12,
    total_earned: 260,
    total_spent: 105,
    pending_credits: 0,
    welcome_bonus_given: true,
    rr: 1245,
    highest_rr: 1245,
    rank_protection_count: 1,
    challenge_wins: 14,
    country: 'India',
    state: 'Uttarakhand',
    city: 'Haldwani',
    college: 'Graphic Era Hill University',
    badges: ['welcome', 'first_session', 'note_maker', 'fast_solver', 'rank_climber']
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