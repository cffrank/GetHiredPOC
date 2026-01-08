import { Confetti } from './effects/Confetti';

interface SuccessCelebrationProps {
  show: boolean;
  message: string;
  xpGained: number;
  onClose: () => void;
}

export function SuccessCelebration({
  show,
  message,
  xpGained,
  onClose
}: SuccessCelebrationProps) {
  if (!show) return null;

  return (
    <>
      <Confetti show={show} onComplete={onClose} />

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 animate-[fadeIn_0.3s]">
        <div className="bg-white rounded-3xl p-12 shadow-3d-lg text-center max-w-md animate-bounce-in">
          <div className="text-7xl mb-6 animate-bounce-gentle">🎉</div>
          <h3 className="text-3xl font-extrabold text-purple-deep mb-4">{message}</h3>
          <p className="text-xl text-violet font-bold">+{xpGained} XP earned</p>
        </div>
      </div>
    </>
  );
}
