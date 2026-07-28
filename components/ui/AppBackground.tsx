export default function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#08080a]">
      <div className="orb absolute -left-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-[#FF3EA5]/25 blur-[100px]" />
      <div
        className="orb absolute right-[-9rem] top-1/4 h-[26rem] w-[26rem] rounded-full bg-[#33E8FF]/20 blur-[100px]"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="orb absolute bottom-[-11rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-[#C6FF3D]/15 blur-[100px]"
        style={{ animationDelay: "-14s" }}
      />
      <div className="grain absolute inset-0" />
    </div>
  );
}
