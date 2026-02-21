interface Achievement {
  emoji: string;
  title: string;
  unlocked: boolean;
}

interface ProgressGamificationProps {
  level: number;
  xp: number;
  xpMax: number;
  achievements: Achievement[];
}

export function ProgressGamification({ level, xp, xpMax, achievements }: ProgressGamificationProps) {
  const xpPercentage = Math.min((xp / xpMax) * 100, 100);

  return (
    <div className="bg-white rounded-3xl p-8 shadow-card-soft mb-10 flex gap-8 items-center flex-wrap">
      {/* Level Badge */}
      <div className="relative w-24 h-24">
        <div className="w-full h-full bg-gradient-to-br from-violet to-teal rounded-2xl flex flex-col items-center justify-center shadow-3d-md hover:shadow-3d-lg transition-all hover:-translate-y-1 cursor-pointer">
          <div className="text-4xl font-extrabold text-white">{level}</div>
          <div className="text-xs uppercase tracking-wider text-white/90">Job Hunter</div>
        </div>
      </div>

      {/* XP Bar */}
      <div className="flex-1 min-w-[200px]">
        <div className="h-10 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-violet via-teal to-coral rounded-full shadow-md relative overflow-hidden flex items-center justify-end pr-5 transition-all duration-1000 ease-out"
            style={{ width: `${xpPercentage}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            <span className="relative z-10 text-white font-semibold text-sm drop-shadow-md">
              {xp} / {xpMax} XP
            </span>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="flex gap-4 flex-wrap">
        {achievements.map((achievement, idx) => (
          <div
            key={idx}
            className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-3d-sm transition-transform hover:-translate-y-1 animate-bounce-in ${
              achievement.unlocked ? 'cursor-pointer' : 'opacity-50 grayscale'
            }`}
            style={{ animationDelay: `${idx * 0.1}s` }}
            title={achievement.title}
          >
            {achievement.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { Achievement };
