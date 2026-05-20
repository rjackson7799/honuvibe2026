import Image from 'next/image';

export function DashboardBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none hidden sm:block absolute -top-7 sm:-left-7 sm:-right-7 md:-left-8 md:-right-8 h-[520px] -z-10 overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)',
      }}
    >
      <Image
        src="/images/dashboard/welcome-backdrop.webp"
        alt=""
        fill
        priority={false}
        sizes="100vw"
        className="object-cover object-right-top"
      />
    </div>
  );
}
