/**
 * Gamification Service
 *
 * Handles XP, levels, and achievements for user engagement
 */

interface UserGamificationStats {
  level: number;
  xp: number;
  xpMax: number;
  achievements: Array<{
    emoji: string;
    title: string;
    unlocked: boolean;
  }>;
}

const ACHIEVEMENT_DEFINITIONS = [
  { type: 'first_application', emoji: '🎯', title: 'First Application' },
  { type: 'profile_complete', emoji: '📝', title: 'Profile Complete' },
  { type: 'five_applications', emoji: '⭐', title: '5 Applications' },
  { type: 'first_offer', emoji: '🎊', title: 'First Offer' },
];

/**
 * Get user gamification stats (level, XP, achievements)
 */
export async function getUserStats(db: D1Database, userId: number): Promise<UserGamificationStats> {
  // Get user level and XP
  const user = await db
    .prepare('SELECT level, xp, xp_next_level FROM users WHERE id = ?')
    .bind(userId)
    .first<{ level: number; xp: number; xp_next_level: number }>();

  if (!user) {
    throw new Error('User not found');
  }

  // Get unlocked achievements
  const unlockedAchievements = await db
    .prepare('SELECT achievement_type FROM achievements WHERE user_id = ?')
    .bind(userId)
    .all<{ achievement_type: string }>();

  const unlockedTypes = new Set(unlockedAchievements.results.map(a => a.achievement_type));

  // Build achievements list
  const achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
    emoji: def.emoji,
    title: def.title,
    unlocked: unlockedTypes.has(def.type),
  }));

  return {
    level: user.level,
    xp: user.xp,
    xpMax: user.xp_next_level,
    achievements,
  };
}

/**
 * Award XP to a user and check for level up
 */
export async function awardXP(
  db: D1Database,
  userId: number,
  amount: number,
  reason: string
): Promise<{ leveledUp: boolean; newLevel?: number }> {
  const user = await db
    .prepare('SELECT level, xp, xp_next_level FROM users WHERE id = ?')
    .bind(userId)
    .first<{ level: number; xp: number; xp_next_level: number }>();

  if (!user) {
    throw new Error('User not found');
  }

  let newXP = user.xp + amount;
  let newLevel = user.level;
  let leveledUp = false;

  // Check if leveled up
  if (newXP >= user.xp_next_level) {
    newLevel++;
    newXP = newXP - user.xp_next_level;
    leveledUp = true;
  }

  // Calculate next level XP requirement (increases by 100 per level)
  const xpNextLevel = 1000 + (newLevel - 1) * 100;

  // Update user
  await db
    .prepare('UPDATE users SET level = ?, xp = ?, xp_next_level = ? WHERE id = ?')
    .bind(newLevel, newXP, xpNextLevel, userId)
    .run();

  console.log(`Awarded ${amount} XP to user ${userId} for: ${reason}`);

  return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
}

/**
 * Unlock an achievement if not already unlocked
 */
export async function unlockAchievement(
  db: D1Database,
  userId: number,
  achievementType: string
): Promise<boolean> {
  const definition = ACHIEVEMENT_DEFINITIONS.find(a => a.type === achievementType);
  if (!definition) {
    console.warn(`Unknown achievement type: ${achievementType}`);
    return false;
  }

  // Check if already unlocked
  const existing = await db
    .prepare('SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?')
    .bind(userId, achievementType)
    .first();

  if (existing) {
    return false; // Already unlocked
  }

  // Unlock achievement
  await db
    .prepare(
      'INSERT INTO achievements (user_id, achievement_type, emoji, title) VALUES (?, ?, ?, ?)'
    )
    .bind(userId, achievementType, definition.emoji, definition.title)
    .run();

  console.log(`Achievement unlocked for user ${userId}: ${definition.title}`);
  return true;
}

/**
 * Check for newly earned achievements based on user activity
 */
export async function checkAchievements(db: D1Database, userId: number): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  // Check: First Application
  const applicationCount = await db
    .prepare('SELECT COUNT(*) as count FROM applications WHERE user_id = ?')
    .bind(userId)
    .first<{ count: number }>();

  if (applicationCount && applicationCount.count === 1) {
    const unlocked = await unlockAchievement(db, userId, 'first_application');
    if (unlocked) newlyUnlocked.push('first_application');
  }

  // Check: 5 Applications
  if (applicationCount && applicationCount.count === 5) {
    const unlocked = await unlockAchievement(db, userId, 'five_applications');
    if (unlocked) newlyUnlocked.push('five_applications');
  }

  // Check: Profile Complete
  const user = await db
    .prepare(
      `SELECT full_name, bio, location, skills, linkedin_url
       FROM users WHERE id = ?`
    )
    .bind(userId)
    .first<{ full_name: string; bio: string; location: string; skills: string; linkedin_url: string }>();

  if (user && user.full_name && user.bio && user.location && user.skills && user.linkedin_url) {
    const unlocked = await unlockAchievement(db, userId, 'profile_complete');
    if (unlocked) newlyUnlocked.push('profile_complete');
  }

  return newlyUnlocked;
}
