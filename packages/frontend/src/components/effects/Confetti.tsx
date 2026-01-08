import { useEffect } from 'react';

interface ConfettiProps {
  show: boolean;
  onComplete: () => void;
}

export function Confetti({ show, onComplete }: ConfettiProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-[confettiFall_3s_ease-out_forwards]"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            backgroundColor: ['#7C3AED', '#14B8A6', '#FF6B6B', '#FCD34D'][Math.floor(Math.random() * 4)],
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}
