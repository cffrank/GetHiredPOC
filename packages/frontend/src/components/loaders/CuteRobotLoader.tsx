interface CuteRobotLoaderProps {
  message?: string;
}

export function CuteRobotLoader({ message = "Finding your perfect matches..." }: CuteRobotLoaderProps) {
  return (
    <div className="text-center py-16">
      {/* Robot face */}
      <div className="w-36 h-36 mx-auto mb-8 relative">
        <div className="w-full h-full bg-gradient-to-br from-violet to-teal rounded-3xl shadow-3d-md flex flex-col items-center justify-center gap-5 animate-[robotThink_2s_ease-in-out_infinite]">
          {/* Eyes */}
          <div className="flex gap-8">
            <div className="w-5 h-5 bg-white rounded-full relative animate-[blink_4s_infinite]">
              <div className="absolute w-2.5 h-2.5 bg-purple-deep rounded-full top-1.5 left-1.5 animate-[eyeMove_3s_ease-in-out_infinite]" />
            </div>
            <div className="w-5 h-5 bg-white rounded-full relative animate-[blink_4s_infinite]">
              <div className="absolute w-2.5 h-2.5 bg-purple-deep rounded-full top-1.5 left-1.5 animate-[eyeMove_3s_ease-in-out_infinite]" />
            </div>
          </div>

          {/* Mouth */}
          <div className="w-10 h-5 border-4 border-white border-t-0 rounded-b-3xl animate-[mouthMove_1s_ease-in-out_infinite]" />
        </div>

        {/* Thought bubbles */}
        <div className="absolute -top-10 -right-10">
          <div className="text-3xl animate-[bubbleBounce_1.5s_ease-in-out_infinite] drop-shadow-lg">💼</div>
        </div>
        <div className="absolute -top-5 right-5">
          <div className="text-3xl animate-[bubbleBounce_1.5s_ease-in-out_infinite] [animation-delay:0.5s] drop-shadow-lg">📊</div>
        </div>
        <div className="absolute top-2 -right-12">
          <div className="text-3xl animate-[bubbleBounce_1.5s_ease-in-out_infinite] [animation-delay:1s] drop-shadow-lg">✨</div>
        </div>
      </div>

      {/* Message */}
      <p className="text-2xl font-semibold text-violet mb-8">{message}</p>

      {/* Progress wave */}
      <div className="max-w-md mx-auto h-5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-to-r from-violet via-teal via-coral to-sunny rounded-full bg-[length:200%_100%] animate-[waveMove_2s_linear_infinite]" />
      </div>
    </div>
  );
}
