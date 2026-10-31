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

  if (!sb) {
    return { success: false, error: 'Database client not connected.' };
  }

  try {
    // 1. Idempotency Check (prevent duplicate credits if idempotencyKey or ref provided)
    const effectiveKey = idempotencyKey || (referenceId ? `${referenceType}:${referenceId}:${userId}` : '');
    if (effectiveKey) {
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
    }

    // 2. Read current user profile
    const { data: profile, error: readError } = await sb
      .from('profiles')
      .select('id, credits, xp, total_earned, total_spent')
      .eq('id', userId)
      .maybeSingle();

    if (readError || !profile) {
      return { success: false, error: 'User profile not found in database.' };
    }

    const currentBalance = Number(profile.credits) || 0;
    const newBalance = currentBalance + amount;

    // 3. Balance Protection: Never allow negative credit balance
    if (amount < 0 && newBalance < 0) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${Math.abs(amount)}, Available: ${currentBalance}.`,
        currentBalance
      };
    }

    // 4. Record in credit_ledger
    const ledgerPayload = {
      user_id: userId,
      amount: amount,
      balance_after: newBalance,
      type: type,
      reason: reason,
      reference_type: referenceType,
      reference_id: referenceId || null,
      idempotency_key: effectiveKey || null,
      status: 'COMPLETED'
    };

    const { data: newLedger, error: ledgerError } = await sb
      .from('credit_ledger')
      .insert(ledgerPayload)
      .select()
      .maybeSingle();

    if (ledgerError) {
      console.error('Ledger insert error:', ledgerError);
      return { success: false, error: ledgerError.message };
    }

    // 5. Update user profile totals
    const profileUpdates = {
      credits: newBalance,
      updated_at: new Date().toISOString()
    };

    if (amount > 0) {
      profileUpdates.total_earned = (Number(profile.total_earned) || 0) + amount;
      profileUpdates.xp = (Number(profile.xp) || 0) + Math.round(amount * 1.5); // Earning credits also builds learning XP
    } else {
      profileUpdates.total_spent = (Number(profile.total_spent) || 0) + Math.abs(amount);
    }

    const { error: updateError } = await sb
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId);

    if (updateError) {
      console.warn('Profile balance update warning:', updateError);
    }

    return {
      success: true,
      newBalance,
      transaction: newLedger
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
