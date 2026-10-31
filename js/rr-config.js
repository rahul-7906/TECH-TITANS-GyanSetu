/**
 * rr-config.js — Central Competitive Ranking System (RR) for GyanSetu
 *
 * Implements:
 * 1. Strict separation: Credits ≠ XP ≠ RR
 * 2. Rank ladder: Bronze -> Silver -> Gold -> Platinum -> Diamond -> Master -> Grand Master
 * 3. Divisions: III -> II -> I for tiers below Master
 * 4. Original SVG Rank Emblems (clean, competitive, metallic, zero copyright infringement)
 * 5. Atomic RR transaction recording with idempotency and rank protection
 * 6. Promotion & demotion lifecycle events
 */

const RR_CONFIG = {
  REWARDS: {
    COMPLETE_QUIZ: 5,
    CORRECT_QUIZ_ANSWER: 10,
    CHALLENGE_WIN: 20,
    TEAM_CHALLENGE_WIN: 25,
    SUCCESSFUL_LIVE_LEARNING: 15,
    HELPFUL_VERIFIED_CONTRIBUTION: 10,
    WEEKLY_EVENT_PARTICIPATION: 10,
    WEEKLY_EVENT_WIN: 25
  },
  LOSSES: {
    CHALLENGE_LOSS: 10,
    TEAM_CHALLENGE_LOSS: 15
  },
  PROTECTION: {
    DEFAULT_BUFFER: 1 // 1 buffer per major tier promotion
  },
  TIERS: [
    {
      key: 'bronze',
      name: 'Bronze',
      minRR: 0,
      maxRR: 499,
      color: '#CD7F32',
      badgeBg: 'bg-amber-900/10 text-amber-800 border-amber-800/30',
      hasDivisions: true
    },
    {
      key: 'silver',
      name: 'Silver',
      minRR: 500,
      maxRR: 999,
      color: '#94A3B8',
      badgeBg: 'bg-slate-200/60 text-slate-700 border-slate-300',
      hasDivisions: true
    },
    {
      key: 'gold',
      name: 'Gold',
      minRR: 1000,
      maxRR: 1499,
      color: '#F59E0B',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      hasDivisions: true
    },
    {
      key: 'platinum',
      name: 'Platinum',
      minRR: 1500,
      maxRR: 1999,
      color: '#06B6D4',
      badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      hasDivisions: true
    },
    {
      key: 'diamond',
      name: 'Diamond',
      minRR: 2000,
      maxRR: 2499,
      color: '#818CF8',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      hasDivisions: true
    },
    {
      key: 'master',
      name: 'Master',
      minRR: 2500,
      maxRR: 2999,
      color: '#A855F7',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      hasDivisions: false
    },
    {
      key: 'grandmaster',
      name: 'Grand Master',
      minRR: 3000,
      maxRR: 99999,
      color: '#E11D48',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      hasDivisions: false
    }
  ]
};

/**
 * Calculates rank tier, division, next rank, and progress percentage.
 * Divisions within a 500 RR tier:
 * - III: lower 1/3 (0 to 166 RR in tier)
 * - II: middle 1/3 (167 to 333 RR in tier)
 * - I: upper 1/3 (334 to 499 RR in tier)
 */
function calculateRank(rrValue) {
  const rr = Math.max(0, Number(rrValue) || 0);
  const tiers = RR_CONFIG.TIERS;
  const currentTier = tiers.slice().reverse().find(t => rr >= t.minRR) || tiers[0];
  const tierIndex = tiers.findIndex(t => t.key === currentTier.key);
  const nextTier = tiers[tierIndex + 1] || null;

  let division = '';
  let divisionLabel = currentTier.name;
  let tierProgress = 0;
  let rrToNextTier = 0;
  let nextRankName = '';

  if (currentTier.hasDivisions) {
    const tierSpan = currentTier.maxRR - currentTier.minRR + 1; // 500
    const offset = rr - currentTier.minRR;
    const subSpan = tierSpan / 3; // 166.67

    if (offset < subSpan) {
      division = 'III';
      divisionLabel = `${currentTier.name} III`;
      nextRankName = `${currentTier.name} II`;
      rrToNextTier = Math.ceil(subSpan - offset);
      tierProgress = Math.min(100, Math.round((offset / subSpan) * 100));
    } else if (offset < subSpan * 2) {
      division = 'II';
      divisionLabel = `${currentTier.name} II`;
      nextRankName = `${currentTier.name} I`;
      rrToNextTier = Math.ceil(subSpan * 2 - offset);
      tierProgress = Math.min(100, Math.round(((offset - subSpan) / subSpan) * 100));
    } else {
      division = 'I';
      divisionLabel = `${currentTier.name} I`;
      nextRankName = nextTier ? (nextTier.hasDivisions ? `${nextTier.name} III` : nextTier.name) : 'Grand Master';
      rrToNextTier = Math.ceil(tierSpan - offset);
      tierProgress = Math.min(100, Math.round(((offset - subSpan * 2) / subSpan) * 100));
    }
  } else if (currentTier.key === 'master') {
    divisionLabel = 'Master';
    nextRankName = 'Grand Master';
    rrToNextTier = Math.max(0, 3000 - rr);
    tierProgress = Math.min(100, Math.round(((rr - 2500) / 500) * 100));
  } else {
    divisionLabel = 'Grand Master';
    nextRankName = 'Apex Legend';
    rrToNextTier = 0;
    tierProgress = 100;
  }

  return {
    rr,
    tierKey: currentTier.key,
    tierName: currentTier.name,
    minRR: currentTier.minRR,
    maxRR: currentTier.maxRR,
    division,
    fullName: divisionLabel,
    nextRankName,
    rrToNext: rrToNextTier,
    progressPct: tierProgress,
    color: currentTier.color,
    badgeBg: currentTier.badgeBg
  };
}

/**
 * ORIGINAL GYANSETU RANK EMBLEMS
 * Renders original, crisp metallic vector artwork for each rank tier.
 * Completely free of copyrighted game assets.
 */
function renderRankEmblem(tierKey, size = 64, className = '') {
  const key = String(tierKey || 'bronze').toLowerCase().replace(/\s+/g, '');

  switch (key) {
    case 'bronze':
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" class="rank-emblem inline-block drop-shadow-md ${className}" aria-label="Bronze Rank Emblem">
          <defs>
            <linearGradient id="brz-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#E29050"/>
              <stop offset="50%" stop-color="#B86226"/>
              <stop offset="100%" stop-color="#7C3B12"/>
            </linearGradient>
            <linearGradient id="brz-rim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FED7AA"/>
              <stop offset="100%" stop-color="#9A3412"/>
            </linearGradient>
          </defs>
          <!-- Outer Shield Base -->
          <polygon points="50,6 88,24 76,78 50,94 24,78 12,24" fill="url(#brz-body)" stroke="url(#brz-rim)" stroke-width="3" stroke-linejoin="round"/>
          <!-- Inner Facets -->
          <polygon points="50,14 80,29 70,72 50,86 30,72 20,29" fill="#9A3412" opacity="0.6"/>
          <polygon points="50,14 50,86 30,72 20,29" fill="#7C2D12" opacity="0.5"/>
          <!-- Center Emblem: Student Torch / Chevron -->
          <path d="M50 30 L60 48 L53 48 L55 64 L45 64 L47 48 L40 48 Z" fill="#FED7AA"/>
          <!-- Wing rivets -->
          <circle cx="28" cy="38" r="2.5" fill="#FED7AA"/>
          <circle cx="72" cy="38" r="2.5" fill="#FED7AA"/>
          <circle cx="50" cy="74" r="3" fill="#FED7AA"/>
        </svg>`;

    case 'silver':
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" class="rank-emblem inline-block drop-shadow-md ${className}" aria-label="Silver Rank Emblem">
          <defs>
            <linearGradient id="slv-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="45%" stop-color="#CBD5E1"/>
              <stop offset="100%" stop-color="#475569"/>
            </linearGradient>
            <linearGradient id="slv-core" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#F8FAFC"/>
              <stop offset="100%" stop-color="#64748B"/>
            </linearGradient>
          </defs>
          <!-- Stepped Silver Crest -->
          <polygon points="50,5 92,26 80,80 50,95 20,80 8,26" fill="url(#slv-body)" stroke="#E2E8F0" stroke-width="2.5" stroke-linejoin="round"/>
          <!-- Inset wings -->
          <polygon points="50,14 82,30 72,73 50,86 28,73 18,30" fill="#334155" opacity="0.4"/>
          <!-- Dual Chevron Blades -->
          <path d="M50 24 L70 42 L64 47 L50 35 L36 47 L30 42 Z" fill="url(#slv-core)"/>
          <path d="M50 40 L68 56 L62 61 L50 51 L38 61 L32 56 Z" fill="url(#slv-core)"/>
          <!-- Silver Core Star Gem -->
          <polygon points="50,58 54,66 63,67 56,73 58,81 50,76 42,81 44,73 37,67 46,66" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.5"/>
        </svg>`;

    case 'gold':
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" class="rank-emblem inline-block drop-shadow-lg ${className}" aria-label="Gold Rank Emblem">
          <defs>
            <linearGradient id="gld-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FEF08A"/>
              <stop offset="40%" stop-color="#F59E0B"/>
              <stop offset="100%" stop-color="#B45309"/>
            </linearGradient>
            <linearGradient id="gld-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6EE7B7"/>
              <stop offset="100%" stop-color="#047857"/>
            </linearGradient>
          </defs>
          <!-- Radiating Gold Points -->
          <polygon points="50,2 62,20 84,10 80,32 98,38 84,54 94,74 74,74 68,96 50,82 32,96 26,74 6,74 16,54 2,38 20,32 16,10 38,20" fill="url(#gld-gold)" opacity="0.3"/>
          <!-- Primary Knight Crest -->
          <polygon points="50,6 90,26 78,82 50,96 22,82 10,26" fill="url(#gld-gold)" stroke="#FEF08A" stroke-width="3" stroke-linejoin="round"/>
          <polygon points="50,14 80,30 70,74 50,86 30,74 20,30" fill="#78350F" opacity="0.5"/>
          <!-- Dual Gold Wings -->
          <path d="M50 22 L72 38 L65 44 L50 32 L35 44 L28 38 Z" fill="#FEF08A"/>
          <!-- Central Emerald Gyan-Setu Jewel -->
          <polygon points="50,42 66,54 50,78 34,54" fill="url(#gld-emerald)" stroke="#FEF08A" stroke-width="2"/>
          <polygon points="50,42 50,78 34,54" fill="#065F46" opacity="0.4"/>
        </svg>`;

    case 'platinum':
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" class="rank-emblem inline-block drop-shadow-lg ${className}" aria-label="Platinum Rank Emblem">
          <defs>
            <linearGradient id="plt-core" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#A5F3FC"/>
              <stop offset="50%" stop-color="#0891B2"/>
              <stop offset="100%" stop-color="#155E75"/>
            </linearGradient>
            <linearGradient id="plt-blade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="100%" stop-color="#67E8F9"/>
            </linearGradient>
          </defs>
          <!-- Hexagonal Prismatic Base -->
          <polygon points="50,4 92,25 92,75 50,96 8,75 8,25" fill="#083344" stroke="#67E8F9" stroke-width="2.5" stroke-linejoin="round"/>
          <!-- Twin Crystalline Wings -->
          <path d="M14 28 L40 46 L34 68 L14 52 Z" fill="url(#plt-blade)" opacity="0.85"/>
          <path d="M86 28 L60 46 L66 68 L86 52 Z" fill="url(#plt-blade)" opacity="0.85"/>
          <!-- Central Platinum Hex Prism -->
          <polygon points="50,18 76,32 76,68 50,82 24,68 24,32" fill="url(#plt-core)" stroke="#CFFAFE" stroke-width="2.5"/>
          <polygon points="50,18 50,82 24,68 24,32" fill="#083344" opacity="0.35"/>
          <!-- Energy Core -->
          <circle cx="50" cy="50" r="10" fill="#E0F2FE" stroke="#38BDF8" stroke-width="2"/>
        </svg>`;

    case 'diamond':
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" class="rank-emblem inline-block drop-shadow-xl ${className}" aria-label="Diamond Rank Emblem">
          <defs>
            <linearGradient id="dia-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#E0E7FF"/>
              <stop offset="30%" stop-color="#818CF8"/>
              <stop offset="70%" stop-color="#4F46E5"/>
              <stop offset="100%" stop-color="#312E81"/>
            </linearGradient>
            <linearGradient id="dia-spark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF"/>
              <stop offset="100%" stop-color="#C7D2FE"/>
            </linearGradient>
          </defs>
          <!-- Outer Crown of Diamond Spikes -->
          <polygon points="50,2 60,20 82,14 74,34 96,44 76,56 86,78 64,74 50,98 36,74 14,78 24,56 4,44 26,34 18,14 40,20" fill="url(#dia-glow)" opacity="0.4"/>
          <!-- Brilliant Cut Diamond -->
          <polygon points="50,8 88,34 50,92 12,34" fill="url(#dia-glow)" stroke="#EEF2FF" stroke-width="3" stroke-linejoin="round"/>
          <!-- Diamond Facets -->
          <polygon points="50,8 32,34 12,34" fill="#6366F1" opacity="0.6"/>
          <polygon points="50,8 68,34 88,34" fill="#A5B4FC" opacity="0.8"/>
          <polygon points="50,8 32,34 68,34" fill="#EEF2FF" opacity="0.9"/>
          <polygon points="32,34 50,92 12,34" fill="#312E81" opacity="0.5"/>
          <polygon points="68,34 50,92 88,34" fill="#4338CA" opacity="0.6"/>
          <polygon points="32,34 68,34 50,92" fill="url(#dia-spark)"/>
          <!-- Center Starlight Refraction -->
          <polygon points="50,42 54,49 61,50 56,55 57,62 50,58 43,62 44,55 39,50 46,49" fill="#FFFFFF"/>
        </svg>`;

    case 'master':
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" class="rank-emblem inline-block drop-shadow-xl ${className}" aria-label="Master Rank Emblem">
          <defs>
            <linearGradient id="mst-core" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#F3E8FF"/>
              <stop offset="35%" stop-color="#C084FC"/>
              <stop offset="70%" stop-color="#7E22CE"/>
              <stop offset="100%" stop-color="#3B0764"/>
            </linearGradient>
            <linearGradient id="mst-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FEF08A"/>
              <stop offset="100%" stop-color="#CA8A04"/>
            </linearGradient>
          </defs>
          <!-- Outer Heraldic Halo -->
          <circle cx="50" cy="50" r="44" stroke="#A855F7" stroke-width="2" stroke-dasharray="4 4" opacity="0.5"/>
          <!-- Imperial Crest Blades -->
          <polygon points="50,6 94,28 78,84 50,96 22,84 6,28" fill="url(#mst-core)" stroke="url(#mst-gold)" stroke-width="3" stroke-linejoin="round"/>
          <polygon points="50,14 82,32 70,76 50,86 30,76 18,32" fill="#2E1065" opacity="0.6"/>
          <!-- Master Imperial Crown -->
          <path d="M26 36 L34 52 L50 40 L66 52 L74 36 L70 60 L30 60 Z" fill="url(#mst-gold)" stroke="#FEF08A" stroke-width="2"/>
          <circle cx="26" cy="34" r="3" fill="#FDE047"/>
          <circle cx="50" cy="38" r="4" fill="#FDE047"/>
          <circle cx="74" cy="34" r="3" fill="#FDE047"/>
          <!-- Royal Amethyst Core -->
          <polygon points="50,56 64,68 50,84 36,68" fill="#E9D5FF" stroke="url(#mst-gold)" stroke-width="2"/>
        </svg>`;

    case 'grandmaster':
    case 'grand_master':
    default:
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" class="rank-emblem inline-block drop-shadow-2xl ${className}" aria-label="Grand Master Rank Emblem">
          <defs>
            <linearGradient id="gm-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFE4E6"/>
              <stop offset="30%" stop-color="#FB7185"/>
              <stop offset="70%" stop-color="#BE123C"/>
              <stop offset="100%" stop-color="#4C0519"/>
            </linearGradient>
            <linearGradient id="gm-wings" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FEF08A"/>
              <stop offset="50%" stop-color="#E11D48"/>
              <stop offset="100%" stop-color="#881337"/>
            </linearGradient>
            <linearGradient id="gm-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#B9F044"/>
              <stop offset="100%" stop-color="#15803D"/>
            </linearGradient>
          </defs>
          <!-- Radiating Solar Crown Blades -->
          <polygon points="50,0 56,16 68,6 68,22 84,16 78,32 96,32 86,46 100,52 86,62 94,76 78,76 80,94 64,86 58,100 50,88 42,100 36,86 20,94 22,76 6,76 14,62 0,52 14,46 4,32 22,32 16,16 32,22 32,6 44,16" fill="url(#gm-wings)" opacity="0.45"/>
          <!-- Apex Shield -->
          <polygon points="50,6 92,26 80,82 50,96 20,82 8,26" fill="url(#gm-body)" stroke="#FEF08A" stroke-width="3" stroke-linejoin="round"/>
          <!-- Wings Mantle -->
          <path d="M12 30 Q30 45 50 26 Q70 45 88 30 L80 62 Q65 72 50 82 Q35 72 20 62 Z" fill="#4C0519" opacity="0.6"/>
          <!-- Apex Crown with Star -->
          <polygon points="26,38 36,54 50,42 64,54 74,38 68,64 32,64" fill="#FEF08A" stroke="#FFFFFF" stroke-width="1.5"/>
          <!-- Center GyanSetu Apex Core Crystal (Emerald + Lime) -->
          <polygon points="50,48 68,62 50,86 32,62" fill="url(#gm-emerald)" stroke="#FEF08A" stroke-width="2.5"/>
          <polygon points="50,48 50,86 32,62" fill="#14532D" opacity="0.35"/>
          <!-- Radiant Star Jewel -->
          <polygon points="50,30 53,36 60,37 55,42 56,48 50,44 44,48 45,42 40,37 47,36" fill="#FFFFFF"/>
        </svg>`;
  }
}

/**
 * Safely executes an RR change transaction with idempotency and rank protection.
 *
 * @param {object} sb - Supabase client instance
 * @param {object} params
 * @param {string} params.userId - UUID of user
 * @param {number} params.amount - Positive for gain, negative for loss
 * @param {string} params.reason - Human-readable reason
 * @param {string} [params.referenceType] - e.g. 'CHALLENGE', 'QUIZ', 'TEAM_CHALLENGE'
 * @param {string} [params.referenceId] - Associated record ID
 * @param {string} [params.idempotencyKey] - Unique key to prevent double execution
 */
async function recordRRTransaction(sb, params) {
  const {
    userId,
    amount,
    reason,
    referenceType = 'SYSTEM',
    referenceId = '',
    idempotencyKey = ''
  } = params;

  if (!userId || typeof amount !== 'number' || amount === 0 || !reason) {
    return { success: false, error: 'Invalid RR transaction parameters.' };
  }

  // ── Demo Mode Simulation Guard ──────────────────────────────────────
  const isDemo = String(userId).startsWith('demo') || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gyansetu_demo_mode') === 'true');
  if (isDemo) {
    const demo = (typeof window !== 'undefined' && window.GYANSETU_DEMO) ? window.GYANSETU_DEMO : null;
    const currentRR = Number(demo?.profile?.rr ?? 1245);
    let protectionCount = Number(demo?.profile?.rank_protection_count ?? 1);
    let effectiveAmount = amount;
    let protectionUsed = false;

    // Check idempotency in demo ledger
    const effectiveKey = idempotencyKey || (referenceId ? `${referenceType}:${referenceId}:${userId}` : '');
    if (effectiveKey && demo?.rr_ledger?.some(l => l.idempotency_key === effectiveKey || (l.reference_id === referenceId && l.reference_type === referenceType))) {
      return {
        success: false,
        error: 'Transaction already processed (duplicate prevented).',
        isDuplicate: true,
        currentRR
      };
    }

    const previousRank = calculateRank(currentRR);
    let tentativeNewRR = Math.max(0, currentRR + amount);

    // Rank Protection Guard: If loss would cross below current major rank threshold
    if (amount < 0 && tentativeNewRR < previousRank.rr) {
      const tentativeRank = calculateRank(tentativeNewRR);
      if (tentativeRank.tierKey !== previousRank.tierKey && protectionCount > 0) {
        // Absorb the demoting portion using protection!
        protectionCount -= 1;
        protectionUsed = true;
        // Keep user at current major tier floor instead of demoting
        tentativeNewRR = Math.max(previousRank.minRR || 0, currentRR + amount);
        effectiveAmount = tentativeNewRR - currentRR;
      }
    }

    const newRR = tentativeNewRR;
    const newRank = calculateRank(newRR);

    if (demo?.profile) {
      demo.profile.rr = newRR;
      demo.profile.highest_rr = Math.max(demo.profile.highest_rr || currentRR, newRR);
      demo.profile.rank_protection_count = protectionCount;
      if (amount > 0 && (referenceType === 'CHALLENGE' || referenceType === 'TEAM_CHALLENGE')) {
        demo.profile.challenge_wins = (demo.profile.challenge_wins || 0) + 1;
      }
    }

    if (!demo.rr_ledger) demo.rr_ledger = [];
    const demoTx = {
      id: 'rr-tx-' + Date.now(),
      user_id: userId,
      amount: effectiveAmount,
      previous_rr: currentRR,
      new_rr: newRR,
      reason,
      reference_type: referenceType,
      reference_id: referenceId,
      idempotency_key: effectiveKey,
      status: 'COMPLETED',
      created_at: new Date().toISOString()
    };
    demo.rr_ledger.unshift(demoTx);

    const isPromotion = newRank.tierKey !== previousRank.tierKey && newRR > currentRR;
    const isDemotion = newRank.tierKey !== previousRank.tierKey && newRR < currentRR;

    if (isPromotion && typeof window !== 'undefined' && typeof window.showRankPromotionModal === 'function') {
      window.showRankPromotionModal(newRank, newRR, previousRank);
    } else if (isDemotion && typeof window !== 'undefined' && typeof window.showRankDemotionToast === 'function') {
      window.showRankDemotionToast(newRank, newRR);
    }

    return {
      success: true,
      previousRR: currentRR,
      newRR,
      previousRank,
      newRank,
      isPromotion,
      isDemotion,
      protectionUsed,
      transaction: demoTx
    };
  }

  // ── Real Supabase Production Execution ──────────────────────────────
  try {
    // 1. Idempotency Check
    const effectiveKey = idempotencyKey || (referenceId ? `${referenceType}:${referenceId}:${userId}` : '');
    if (effectiveKey) {
      const { data: existing } = await sb
        .from('rr_ledger')
        .select('id, new_rr')
        .eq('idempotency_key', effectiveKey)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: 'Transaction already processed (duplicate prevented).',
          isDuplicate: true,
          currentRR: existing.new_rr
        };
      }
    }

    // 2. Fetch current profile stats
    const { data: profile, error: profErr } = await sb
      .from('profiles')
      .select('rr, highest_rr, rank_protection_count, challenge_wins')
      .eq('id', userId)
      .single();

    if (profErr || !profile) {
      return { success: false, error: profErr?.message || 'User profile not found.' };
    }

    const currentRR = Number(profile.rr ?? 1245);
    let protectionCount = Number(profile.rank_protection_count ?? 1);
    let effectiveAmount = amount;
    let protectionUsed = false;

    const previousRank = calculateRank(currentRR);
    let tentativeNewRR = Math.max(0, currentRR + amount);

    // Rank Protection Guard
    if (amount < 0) {
      const tentativeRank = calculateRank(tentativeNewRR);
      if (tentativeRank.tierKey !== previousRank.tierKey && protectionCount > 0) {
        protectionCount -= 1;
        protectionUsed = true;
        // User stays at the boundary rather than crossing down
        const tierFloor = RR_CONFIG.TIERS.find(t => t.key === previousRank.tierKey)?.minRR || 0;
        tentativeNewRR = Math.max(tierFloor, currentRR + amount);
        effectiveAmount = tentativeNewRR - currentRR;
      }
    }

    const newRR = tentativeNewRR;
    const newRank = calculateRank(newRR);
    const newHighest = Math.max(Number(profile.highest_rr) || currentRR, newRR);

    // 3. Insert RR Ledger entry
    const ledgerRow = {
      user_id: userId,
      amount: effectiveAmount,
      previous_rr: currentRR,
      new_rr: newRR,
      reason,
      reference_type: referenceType,
      reference_id: referenceId,
      idempotency_key: effectiveKey,
      status: 'COMPLETED'
    };

    const { data: txData, error: txErr } = await sb
      .from('rr_ledger')
      .insert(ledgerRow)
      .select()
      .single();

    if (txErr) {
      if (txErr.code === '23505') {
        return { success: false, error: 'Transaction already recorded (duplicate prevented).', isDuplicate: true };
      }
      return { success: false, error: txErr.message };
    }

    // 4. Update Profile RR atomically
    const profileUpdates = {
      rr: newRR,
      highest_rr: newHighest,
      rank_protection_count: protectionCount
    };
    if (amount > 0 && (referenceType === 'CHALLENGE' || referenceType === 'TEAM_CHALLENGE')) {
      profileUpdates.challenge_wins = (profile.challenge_wins || 0) + 1;
    }

    await sb.from('profiles').update(profileUpdates).eq('id', userId);

    const isPromotion = newRank.tierKey !== previousRank.tierKey && newRR > currentRR;
    const isDemotion = newRank.tierKey !== previousRank.tierKey && newRR < currentRR;

    if (isPromotion && typeof window !== 'undefined' && typeof window.showRankPromotionModal === 'function') {
      window.showRankPromotionModal(newRank, newRR, previousRank);
    } else if (isDemotion && typeof window !== 'undefined' && typeof window.showRankDemotionToast === 'function') {
      window.showRankDemotionToast(newRank, newRR);
    }

    return {
      success: true,
      previousRR: currentRR,
      newRR,
      previousRank,
      newRank,
      isPromotion,
      isDemotion,
      protectionUsed,
      transaction: txData
    };
  } catch (err) {
    console.error('RR Transaction Exception:', err);
    return { success: false, error: err.message || 'Server error recording RR.' };
  }
}

/**
 * Visual Promotion Modal
 */
function showRankPromotionModal(newRank, newRR, prevRank) {
  if (typeof document === 'undefined') return;
  let modal = document.getElementById('rank-promotion-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'rank-promotion-modal';
    modal.className = 'fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 transition-opacity duration-300';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#B9F044]/40 bg-gradient-to-b from-[#0B2A1E] via-[#0B1F17] to-[#06130E] p-7 text-center shadow-2xl animate-scaleUp">
      <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#B9F044]/20 blur-3xl pointer-events-none"></div>

      <div class="relative z-10">
        <span class="inline-block rounded-full bg-[#B9F044]/20 border border-[#B9F044]/40 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#B9F044] mb-3">
          RANK UP &bull; PROMOTION
        </span>

        <h2 class="text-2xl font-black text-white tracking-tight">Congratulations! 🏆</h2>
        <p class="text-xs text-emerald-200/80 mt-1">Your competitive learning performance has earned you a new rank.</p>

        <div class="my-6 flex justify-center items-center">
          <div class="relative flex items-center justify-center p-4 rounded-3xl bg-white/5 border border-white/10 shadow-inner">
            ${renderRankEmblem(newRank.tierKey, 96)}
          </div>
        </div>

        <p class="text-xl font-extrabold text-[#B9F044] tracking-wide uppercase">${newRank.fullName}</p>
        <p class="text-xs font-mono font-bold text-white mt-1">${newRR} RR</p>

        <div class="mt-4 rounded-2xl bg-white/5 p-3.5 border border-white/5 text-left text-xs">
          <div class="flex items-center justify-between text-slate-300 text-[11px] mb-1.5">
            <span>Next Target: <strong class="text-white">${newRank.nextRankName}</strong></span>
            <span>${newRank.rrToNext} RR Needed</span>
          </div>
          <div class="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-[#B9F044] to-[#8FD420]" style="width: ${newRank.progressPct}%"></div>
          </div>
        </div>

        <button onclick="closeRankPromotionModal()" class="mt-6 w-full rounded-xl bg-gradient-to-r from-[#B9F044] to-[#8FD420] py-3 text-sm font-extrabold text-[#0B1F17] shadow-glow hover:brightness-110 transition">
          Continue Learning &rarr;
        </button>
      </div>
    </div>`;

  modal.classList.remove('hidden');

  if (typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
  }
}

function closeRankPromotionModal() {
  const modal = document.getElementById('rank-promotion-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Demotion notification toast (respectful, non-shaming)
 */
function showRankDemotionToast(newRank, newRR) {
  if (typeof showToast === 'function') {
    showToast(`Rank Update: Your competitive rating is now ${newRank.fullName} (${newRR} RR).`, 'info');
  }
}

// Export for browser & node test
if (typeof window !== 'undefined') {
  window.RR_CONFIG = RR_CONFIG;
  window.calculateRank = calculateRank;
  window.renderRankEmblem = renderRankEmblem;
  window.recordRRTransaction = recordRRTransaction;
  window.showRankPromotionModal = showRankPromotionModal;
  window.closeRankPromotionModal = closeRankPromotionModal;
  window.showRankDemotionToast = showRankDemotionToast;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RR_CONFIG,
    calculateRank,
    renderRankEmblem,
    recordRRTransaction
  };
}
