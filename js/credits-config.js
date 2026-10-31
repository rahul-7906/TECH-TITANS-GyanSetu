/**
 * credits-config.js — Central Credit Ledger System for GyanSetu
 *
 * Central configuration and helper methods for:
 * - Credit earning & spending rules
 * - Idempotent, abuse-resistant transaction recording
 * - No-negative-balance protection
 * - Level & XP calculations
 */

const CREDIT_CONFIG = {
  REWARDS: {
    WELCOME_BONUS: 100,
    TEACH_LIVE_SESSION: 100,
    UPLOAD_NOTES: 10,
    ANSWER_DOUBT: 5,
    COMPLETE_CHALLENGE: 10,
    WIN_TEAM_CHALLENGE: 20
  },
  COSTS: {
    LIVE_SESSION_COST: 50,
    NOTE_ACCESS_COST: 5
  },
  LEVELS: [
    { level: 1, name: 'Learner',           minXp: 0,    maxXp: 499   },
    { level: 2, name: 'Contributor',       minXp: 500,  maxXp: 1499  },
    { level: 3, name: 'Mentor',            minXp: 1500, maxXp: 2999  },
    { level: 4, name: 'Knowledge Builder', minXp: 3000, maxXp: 5999  },
    { level: 5, name: 'GyanSetu Pro',      minXp: 6000, maxXp: 99999 }
  ]
};

/**
 * Calculates level details from total XP
 */
function calculateLevel(xp) {
  const currentXp = Math.max(0, Number(xp) || 0);
  const levels = CREDIT_CONFIG.LEVELS;
  const current = levels.slice().reverse().find(l => currentXp >= l.minXp) || levels[0];
  const next = levels.find(l => l.level === current.level + 1);
  const pct = next
    ? Math.min(Math.round(((currentXp - current.minXp) / (next.minXp - current.minXp)) * 100), 100)
    : 100;
  return {
    level: current.level,
    name: current.name,
    xp: currentXp,
    nextXp: next ? next.minXp : current.maxXp,
    pct
  };
}

/**
 * Safely executes a credit transaction with balance verification & idempotency guard.
 *
 * @param {object} sb - Supabase client instance
 * @param {object} params
 * @param {string} params.userId - UUID of user in auth.users / profiles
 * @param {number} params.amount - Positive for EARN/BONUS, negative for SPEND
 * @param {string} params.type - 'BONUS' | 'EARN' | 'SPEND' | 'REFUND'
 * @param {string} params.reason - Human-readable reason for ledger
 * @param {string} [params.referenceType] - e.g. 'NOTE', 'SESSION', 'CHALLENGE'
 * @param {string} [params.referenceId] - Unique ID of associated item
 * @param {string} [params.idempotencyKey] - Prevents duplicate runs
 * @returns {Promise<{ success: boolean, newBalance?: number, error?: string, transaction?: object }>}
 */
async function recordCreditTransaction(sb, params) {
  const {
    userId,
    amount,
    type = amount > 0 ? 'EARN' : 'SPEND',
    reason,
    referenceType = 'SYSTEM',
    referenceId = '',
    idempotencyKey = ''
  } = params;

  if (!userId || typeof amount !== 'number' || amount === 0 || !reason) {
    return { success: false, error: 'Invalid transaction parameters.' };
  }

  // ── Demo Mode Simulation Guard ──────────────────────────────────────
  const isDemo = String(userId).startsWith('demo') || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gyansetu_demo_mode') === 'true');
  if (isDemo) {
    const demo = (typeof window !== 'undefined' && window.GYANSETU_DEMO) ? window.GYANSETU_DEMO : null;
    const currentBalance = demo?.profile?.credits ?? 155;
    const newBalance = currentBalance + amount;

    if (amount < 0 && newBalance < 0) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${Math.abs(amount)}, Available: ${currentBalance}.`,
        currentBalance
      };
    }

    const effectiveKey = idempotencyKey || (referenceId ? `${referenceType}:${referenceId}:${userId}` : '');
    if (effectiveKey && demo?.ledger?.some(l => l.idempotency_key === effectiveKey || (l.reference_id === referenceId && l.reference_type === referenceType))) {
      return {
        success: false,
        error: 'Transaction already processed (duplicate prevented).',
        isDuplicate: true
      };
    }

    if (demo?.profile) {
      demo.profile.credits = newBalance;
      if (amount > 0) {
        demo.profile.total_earned = (demo.profile.total_earned || 0) + amount;
        demo.profile.xp = (demo.profile.xp || 0) + Math.round(amount * 1.5);
      } else {
        demo.profile.total_spent = (demo.profile.total_spent || 0) + Math.abs(amount);
      }
    }

    const demoTx = {
      id: 'demo-tx-' + Date.now(),
      user_id: userId,
      amount: amount,
      balance_after: newBalance,
      type: type,
      reason: reason,
      reference_type: referenceType,
      reference_id: referenceId || null,
      idempotency_key: effectiveKey || null,
      status: 'COMPLETED',
      created_at: new Date().toISOString()
    };

    if (demo?.ledger) {
      demo.ledger.unshift(demoTx);
    }

    return {
      success: true,
      newBalance,
      transaction: demoTx
    };
  }

  try {
    const effectiveKey = idempotencyKey || (referenceId ? `${referenceType}:${referenceId}:${userId}` : '');

    // 1. Idempotency Check in Supabase if online
    if (sb && effectiveKey) {
      try {
        const { data: existing } = await sb
          .from('credit_ledger')
          .select('id, amount, status, created_at')
          .eq('user_id', userId)
          .eq('idempotency_key', effectiveKey)
          .maybeSingle();

        if (existing) {
          return {
            success: false,
            error: 'Transaction already processed (duplicate prevented).',
            isDuplicate: true,
            transaction: existing
          };
        }
      } catch (e) {}
    }

    // 2. Fetch current user profile (try Supabase first, fallback to local storage)
    let userProfile = null;
    if (sb) {
      try {
        const { data: profile, error: readError } = await sb
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!readError && profile) {
          userProfile = profile;
        }
      } catch (e) {}
    }

    if (!userProfile && typeof localStorage !== 'undefined') {
      try {
        const rawActive = localStorage.getItem('gyansetu_active_profile');
        if (rawActive) {
          const p = JSON.parse(rawActive);
          if (p.id === userId) userProfile = p;
        }
        if (!userProfile) {
          const accounts = JSON.parse(localStorage.getItem('gyansetu_local_accounts') || '{}');
          Object.keys(accounts).forEach(k => {
            if (accounts[k]?.profile?.id === userId) userProfile = accounts[k].profile;
          });
        }
      } catch (e) {}
    }

    // Default template if brand new user
    if (!userProfile) {
      userProfile = {
        id: userId,
        credits: 100,
        xp: 50,
        full_name: 'Student',
        department: 'CSE',
        role: 'learner',
        streak: 1
      };
    }

    const currentBalance = Number(userProfile.credits) || 0;
    const newBalance = currentBalance + amount;

    // 3. Balance Protection: Never allow negative credit balance
    if (amount < 0 && newBalance < 0) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${Math.abs(amount)}, Available: ${currentBalance}.`,
        currentBalance
      };
    }

    // Calculate XP increase: +25 XP on winning challenges/races, +10 XP on study actions
    const xpDelta = amount > 0 ? Math.round(amount * 2.5) : 10;
    const newXp = (Number(userProfile.xp) || 50) + xpDelta;

    const profileUpdates = {
      ...userProfile,
      credits: newBalance,
      xp: newXp,
      total_earned: (Number(userProfile.total_earned) || 0) + (amount > 0 ? amount : 0),
      total_spent: (Number(userProfile.total_spent) || 0) + (amount < 0 ? Math.abs(amount) : 0),
      updated_at: new Date().toISOString()
    };

    // 4. Update or Upsert in Supabase
    if (sb) {
      try {
        await sb.from('profiles').upsert(profileUpdates, { onConflict: 'id' });
      } catch (e) {
        console.warn('Supabase profile balance upsert warning:', e);
      }

      try {
        await sb.from('credit_ledger').insert({
          user_id: userId,
          amount: amount,
          balance_after: newBalance,
          type: type,
          reason: reason,
          reference_type: referenceType,
          reference_id: referenceId || null,
          idempotency_key: effectiveKey || null,
          status: 'COMPLETED'
        });
      } catch (e) {
        console.warn('Supabase credit_ledger insert warning:', e);
      }
    }

    // 5. Update local storage caches (ensures instant sync across tabs & components)
    if (typeof localStorage !== 'undefined') {
      try {
        const rawActive = localStorage.getItem('gyansetu_active_profile');
        if (rawActive) {
          const ap = JSON.parse(rawActive);
          if (ap.id === userId || (userProfile.email && ap.email === userProfile.email)) {
            ap.credits = newBalance;
            ap.xp = newXp;
            localStorage.setItem('gyansetu_active_profile', JSON.stringify(ap));
          }
        }

        const rawAccs = localStorage.getItem('gyansetu_local_accounts');
        if (rawAccs) {
          const accs = JSON.parse(rawAccs);
          Object.keys(accs).forEach(k => {
            if (accs[k]?.profile && (accs[k].profile.id === userId || (userProfile.email && accs[k].email === userProfile.email))) {
              accs[k].profile.credits = newBalance;
              accs[k].profile.xp = newXp;
            }
          });
          localStorage.setItem('gyansetu_local_accounts', JSON.stringify(accs));
        }

        // Save into local ledger cache
        const ledgerKey = 'gyansetu_ledger_' + userId;
        const localLedger = JSON.parse(localStorage.getItem(ledgerKey) || '[]');
        localLedger.unshift({
          id: 'tx_' + Date.now(),
          user_id: userId,
          amount: amount,
          balance_after: newBalance,
          type: type,
          reason: reason,
          reference_type: referenceType,
          reference_id: referenceId,
          idempotency_key: effectiveKey,
          created_at: new Date().toISOString()
        });
        localStorage.setItem(ledgerKey, JSON.stringify(localLedger.slice(0, 50)));
      } catch (e) {}
    }

    // 6. Dispatch live reactive update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gyansetu:credits-updated', {
        detail: { userId, newBalance, newXp, amount, reason }
      }));
    }

    return {
      success: true,
      newBalance,
      newXp,
      transaction: {
        user_id: userId,
        amount,
        balance_after: newBalance,
        reason,
        created_at: new Date().toISOString()
      }
    };
  } catch (err) {
    console.error('recordCreditTransaction exception:', err);
    return { success: false, error: err.message || 'Transaction failed.' };
  }
}

// Make accessible to all browser scripts
if (typeof window !== 'undefined') {
  window.CREDIT_CONFIG = CREDIT_CONFIG;
  window.calculateLevel = calculateLevel;
  window.recordCreditTransaction = recordCreditTransaction;
}
