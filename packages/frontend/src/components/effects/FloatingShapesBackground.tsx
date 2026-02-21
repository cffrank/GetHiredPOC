export function FloatingShapesBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute w-[300px] h-[300px] bg-violet/10 rounded-full top-[10%] left-[5%] animate-float-shape" />
      <div className="absolute w-[200px] h-[200px] bg-teal/10 rounded-full top-[60%] right-[10%] animate-float-shape [animation-delay:2s]" />
      <div className="absolute w-[250px] h-[250px] bg-coral/10 rounded-full bottom-[10%] left-[40%] animate-float-shape [animation-delay:4s]" />
    </div>
  );
}
