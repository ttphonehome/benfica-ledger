// Holds a tab's place in the nav until its screen is built.
export function NotBuilt({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <div className="kicker">{kicker}</div>
      <h1 className="section-h">{title}</h1>
      <p className="dek">This screen is next in the build. The Roster tab is ready to review.</p>
    </div>
  );
}
