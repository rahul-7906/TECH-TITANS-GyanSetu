// Demo-only content for the public Explore GyanSetu path.
// Production users never load this file; their dashboard reads Supabase data.
window.GYANSETU_DEMO = {
  profile: { full_name: 'Demo Learner', department: 'Explore mode', role: 'learner', credits: 120, xp: 640, streak: 4, total_earned: 180, total_spent: 60, pending_credits: 10, badges: ['first_session', 'note_maker'] },
  mentors: [
    { id: 'demo-1', name: 'Aarav Sharma', avatar: 'AS', department: 'CSE', year: '3rd Year', rating: 4.9, sessions: 142, topics: ['DSA', 'Algorithms'], languages: ['C++', 'Python'], availability: 'online', bio: 'Graph algorithms and problem solving.' },
    { id: 'demo-2', name: 'Priya Mehta', avatar: 'PM', department: 'IT', year: '2nd Year', rating: 4.8, sessions: 97, topics: ['Web Dev', 'React'], languages: ['JavaScript', 'TypeScript'], availability: 'online', bio: 'Frontend and full-stack development.' },
    { id: 'demo-3', name: 'Rohan Gupta', avatar: 'RG', department: 'AIML', year: '4th Year', rating: 4.7, sessions: 210, topics: ['Machine Learning', 'Python'], languages: ['Python', 'R'], availability: 'busy', bio: 'Machine learning and data science.' }
  ],
  sessions: [],
  ledger: [],
  chart: [2, 5, 3, 8, 6, 9, 12],
  leaderboard: [
    { rank: 1, name: 'Demo Learner', score: 640 },
    { rank: 2, name: 'Campus Mentor', score: 520 },
    { rank: 3, name: 'Skill Builder', score: 410 }
  ]
};