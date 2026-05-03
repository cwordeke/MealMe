/** Served from /public/logos — order matches prior text marquee. */
const MARQUEE_LOGOS = [
  { src: '/logos/IowaStateLogo.png', label: 'Iowa State' },
  { src: '/logos/PurdueLogo.png', label: 'Purdue' },
  { src: '/logos/IllinoisLogo.png', label: 'Illinois' },
  { src: '/logos/WisconsinLogo.png', label: 'Wisconsin' },
  { src: '/logos/MichiganLogo.png', label: 'Michigan' },
  { src: '/logos/KansasLogo.png', label: 'Kansas' },
] as const;

function MarqueeStrip({ duplicate }: { duplicate?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center gap-x-12 pr-12 sm:gap-x-16 sm:pr-16"
      aria-hidden={duplicate}
    >
      {MARQUEE_LOGOS.map(({ src }) => (
        <img
          key={`${duplicate ? 'b' : 'a'}-${src}`}
          src={src}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          className="h-8 max-h-8 w-auto max-w-[8.5rem] select-none object-contain object-center opacity-[0.5] grayscale contrast-[0.92] brightness-[1.03] sm:h-9 sm:max-h-9 sm:max-w-[9.5rem]"
        />
      ))}
    </div>
  );
}

export function LandingSchoolMarquee() {
  return (
    <div className="mt-10 w-full shrink-0 border-t border-gray-100/80 pt-8 lg:mt-12 lg:max-w-2xl lg:pt-10">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400/75">
        Currently supporting students at:
      </p>
      <p className="sr-only">
        Partner universities: {MARQUEE_LOGOS.map((l) => l.label).join(', ')}.
      </p>
      <div className="landing-marquee-outer relative w-full overflow-hidden py-2">
        <div className="landing-marquee-track flex w-max">
          <MarqueeStrip />
          <MarqueeStrip duplicate />
        </div>
      </div>
    </div>
  );
}
