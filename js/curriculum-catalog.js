/**
 * GyanSetu shared curriculum catalog.
 * Keep track, subject, topic, and content IDs stable so pages can share
 * filters and future content imports can be de-duplicated.
 */
(function (window) {
  'use strict';

  var TRACKS = {
    'btech-cse': {
      name: 'B.Tech CSE',
      icon: '💻',
      subjects: [
        ['Programming Fundamentals', 'C, C++, Java, Python, OOP', 'lang-cpp'],
        ['Data Structures & Algorithms', 'Arrays, trees, graphs, DP, competitive programming', 'dsa'],
        ['Computer Organization', 'Digital logic, processors, memory, assembly', 'cs-general'],
        ['Operating Systems', 'Processes, threads, scheduling, memory, file systems', 'cs-general'],
        ['DBMS & SQL', 'Relational design, SQL, transactions, indexing', 'cs-general'],
        ['Computer Networks', 'TCP/IP, routing, HTTP, security basics', 'cs-general'],
        ['Web & Backend Engineering', 'JavaScript, APIs, databases, deployment', 'web-backend'],
        ['AI & Machine Learning', 'Statistics, models, evaluation, neural networks', 'aiml'],
        ['Cybersecurity', 'Secure coding, cryptography, threats and defense', 'cybersecurity']
      ]
    },
    'bjmc': {
      name: 'BJMC / Mass Communication',
      icon: '🎙️',
      subjects: [
        ['Communication Theory', 'Models, media effects, culture and society', 'communication-theory'],
        ['Journalism & Reporting', 'News values, reporting, interviewing, ethics', 'journalism'],
        ['Writing & Editing', 'Copy editing, headlines, scripts and storytelling', 'writing-editing'],
        ['Digital & Social Media', 'Content strategy, platforms, analytics and SEO', 'digital-media'],
        ['Advertising & PR', 'Campaigns, branding, public relations and persuasion', 'advertising-pr'],
        ['Media Law & Ethics', 'Press law, copyright, privacy and professional ethics', 'media-law'],
        ['Film, TV & Production', 'Production planning, visual language and broadcast', 'media-production']
      ]
    },
    'management': {
      name: 'Management / BBA / MBA',
      icon: '📊',
      subjects: [
        ['Principles of Management', 'Planning, organizing, leadership and control', 'management'],
        ['Marketing', 'Consumer behavior, branding, research and digital marketing', 'marketing'],
        ['Finance & Accounting', 'Statements, ratios, budgeting and corporate finance', 'finance'],
        ['Business Economics', 'Demand, markets, pricing and macroeconomic basics', 'economics'],
        ['Human Resources', 'Recruitment, performance, compensation and culture', 'human-resources'],
        ['Operations & Supply Chain', 'Process design, quality, inventory and logistics', 'operations'],
        ['Business Analytics', 'Excel, statistics, dashboards and decisions', 'business-analytics'],
        ['Entrepreneurship', 'Validation, business models, funding and pitching', 'entrepreneurship']
      ]
    },
    'jee': {
      name: 'JEE Preparation',
      icon: '🎯',
      subjects: [
        ['Physics', 'Mechanics, electricity, magnetism, optics and modern physics', 'physics'],
        ['Chemistry', 'Physical, organic and inorganic chemistry', 'science'],
        ['Mathematics', 'Algebra, calculus, coordinate geometry and vectors', 'math'],
        ['JEE Problem Solving', 'Timed mixed practice, accuracy and exam strategy', 'aptitude']
      ]
    },
    'gate': {
      name: 'GATE Preparation',
      icon: '🏛️',
      subjects: [
        ['GATE Engineering Mathematics', 'Linear algebra, calculus, probability and discrete math', 'math'],
        ['GATE Aptitude', 'Verbal, quantitative and analytical reasoning', 'aptitude'],
        ['GATE CSE Core', 'DSA, OS, DBMS, networks, COA and TOC', 'cs-general'],
        ['Theory of Computation', 'Automata, grammars, computability and complexity', 'cs-general'],
        ['Compiler Design', 'Lexing, parsing, semantic analysis and optimization', 'cs-general'],
        ['GATE Mock Practice', 'Mixed timed tests, error logs and revision', 'aptitude']
      ]
    }
  };

  var TRACK_ALIASES = {
    'btech': 'btech-cse',
    'cse': 'btech-cse',
    'btech-cse': 'btech-cse',
    'bjmc': 'bjmc',
    'mass-communication': 'bjmc',
    'management': 'management',
    'bba': 'management',
    'mba': 'management',
    'jee': 'jee',
    'gate': 'gate'
  };

  function normalizeTrack(value) {
    var key = String(value || '').trim().toLowerCase();
    return TRACK_ALIASES[key] || (TRACKS[key] ? key : 'btech-cse');
  }

  function getTrack(value) {
    return TRACKS[normalizeTrack(value)];
  }

  function getSubjects(value) {
    return getTrack(value).subjects.map(function (subject) {
      return { name: subject[0], topics: subject[1], arenaTopic: subject[2] };
    });
  }

  function inferTrack(value) {
    var text = String(value || '').toLowerCase();
    if (text.includes('bjmc') || text.includes('mass communication') || text.includes('journalism')) return 'bjmc';
    if (text.includes('management') || text.includes('bba') || text.includes('mba')) return 'management';
    if (text.includes('jee')) return 'jee';
    if (text.includes('gate')) return 'gate';
    return normalizeTrack(value);
  }

  window.GyanSetuCurriculum = {
    tracks: TRACKS,
    normalizeTrack: normalizeTrack,
    inferTrack: inferTrack,
    getTrack: getTrack,
    getSubjects: getSubjects
  };
})(window);
