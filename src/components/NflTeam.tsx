import { canonicalTeam, teamStyle } from '@/lib/nflTeams';

/**
 * An NFL team abbreviation as a colour-coded badge. Unknown codes (or a free
 * agent) render as plain muted text so nothing disappears.
 */
export function NflTeam({ code }: { code: string | null | undefined }) {
  const label = canonicalTeam(code);
  if (!label) return null;
  const style = teamStyle(label);
  if (!style) return <span className="nfl-team nfl-team-plain">{label}</span>;
  return (
    <span
      className="nfl-team"
      style={{ background: style.bg, color: style.fg, borderColor: style.border }}
    >
      {label}
    </span>
  );
}
