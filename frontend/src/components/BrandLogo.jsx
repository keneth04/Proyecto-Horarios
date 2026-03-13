export function BrandMark({ className = '' }) {
  return (
    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#e12d2d] text-2xl font-bold leading-none text-white shadow-sm shadow-[#e12d2d]/25 ${className}`}>
      ñ
    </div>
  );
}

export default function BrandLogo({ compact = false, className = '' }) {
  if (compact) return <BrandMark className={className} />;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <BrandMark />
      <div className="text-3xl font-extrabold leading-none tracking-tight">
        <span className="text-[#e12d2d]">hispa</span>
        <span className="text-[#765492]">contact</span>
      </div>
    </div>
  );
}