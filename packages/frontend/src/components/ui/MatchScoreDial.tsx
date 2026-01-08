interface MatchScoreDialProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
}

export function MatchScoreDial({ score, size = 'md' }: MatchScoreDialProps) {
  const sizes = { sm: 60, md: 100, lg: 140 };
  const dimension = sizes[size];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: dimension, height: dimension }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#FF6B6B" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth="8"
        />

        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#rainbow-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="animate-dial-fill"
        />
      </svg>

      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-extrabold text-violet">{score}%</div>
        <div className="text-xs uppercase tracking-wider text-gray-500">Match</div>
      </div>

      {/* Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <span className="absolute top-0 right-0 text-xl animate-sparkle-float">✨</span>
        <span className="absolute bottom-0 left-0 text-xl animate-sparkle-float [animation-delay:1s]">⭐</span>
        <span className="absolute top-1/2 -left-2 text-xl animate-sparkle-float [animation-delay:2s]">💫</span>
      </div>
    </div>
  );
}
