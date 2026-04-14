export function LogoGenerator() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.2)] border border-cyan-500/40 w-48 h-48 sm:w-64 sm:h-64 mx-auto bg-transparent mix-blend-screen">
        <img src="/logo.png" alt="Maple Infinity Logo" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}
