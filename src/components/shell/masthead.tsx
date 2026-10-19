// Site name and tagline. Scrolls away; the nav below it sticks.
export function Masthead() {
  return (
    <header className="grid grid-cols-1 items-end gap-6 border-b border-border px-(--pad) pt-[22px] pb-[18px]">
      <div>
        <div className="text-[clamp(28px,3.4vw,44px)] leading-none font-semibold tracking-[-0.035em]">
          The Águia Ledger<span className="font-light text-mute"> - a fan&apos;s audit</span>
        </div>
        <div className="mt-2 font-mono text-[11px] tracking-[0.12em] text-mute uppercase">
          Independent · unaffiliated · transfer &amp; performance analytics
        </div>
      </div>
    </header>
  );
}
