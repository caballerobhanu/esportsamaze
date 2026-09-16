import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlayerTotalsPaste, parseTeamTotalsPaste } from '../lib/tournament-totals-import';

describe('parseTeamTotalsPaste', () => {
  it('maps the headers a totals sheet actually uses', () => {
    const raw = [
      'Team\tMatches\tWWCD\tPlace Points\tElims Points\tBonus\tTotal Points\tElims',
      'Nebula Esports\t18\t2\t96\t74\t0\t170\t74',
    ].join('\n');

    const parsed = parseTeamTotalsPaste(raw);
    assert.equal(parsed.error, null);
    assert.deepEqual(parsed.unrecognisedHeaders, []);
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].team, 'Nebula Esports');
    assert.deepEqual(parsed.rows[0].metrics, {
      matches: 18,
      wwcd: 2,
      placePoints: 96,
      elimsPoints: 74,
      bonusPoints: 0,
      totalPoints: 170,
      finishes: 74,
    });
  });

  it('accepts alias headers', () => {
    const parsed = parseTeamTotalsPaste(['Rank\tTeam\tGames\tWins\tKills', '1\tGodLike\t20\t3\t88'].join('\n'));
    assert.equal(parsed.rows[0].metrics.placement, 1);
    assert.equal(parsed.rows[0].metrics.matches, 20);
    assert.equal(parsed.rows[0].metrics.wwcd, 3);
    assert.equal(parsed.rows[0].metrics.finishes, 88);
  });

  it('reads a blank cell as not reported, never as zero', () => {
    const parsed = parseTeamTotalsPaste(['Team\tTotal Points\tBonus', 'Autobotz\t120\t'].join('\n'));
    assert.equal(parsed.rows[0].metrics.totalPoints, 120);
    assert.equal(parsed.rows[0].metrics.bonusPoints, null);
  });

  it('keeps a genuine zero as zero', () => {
    const parsed = parseTeamTotalsPaste(['Team\tBonus', 'Autobotz\t0'].join('\n'));
    assert.equal(parsed.rows[0].metrics.bonusPoints, 0);
  });

  it('tolerates thousands separators and dashes', () => {
    const parsed = parseTeamTotalsPaste(['Team\tTotal Points\tBonus', 'Autobotz\t12,450\t-'].join('\n'));
    assert.equal(parsed.rows[0].metrics.totalPoints, 12450);
    assert.equal(parsed.rows[0].metrics.bonusPoints, null);
  });

  it('names headers it did not understand instead of dropping them silently', () => {
    const parsed = parseTeamTotalsPaste(['Team\tTotal Points\tVibes', 'Autobotz\t120\thigh'].join('\n'));
    assert.deepEqual(parsed.unrecognisedHeaders, ['Vibes']);
    assert.equal(parsed.rows[0].metrics.totalPoints, 120);
  });

  it('refuses a paste with no team column', () => {
    const parsed = parseTeamTotalsPaste(['Score\tPoints', '1\t120'].join('\n'));
    assert.match(parsed.error ?? '', /team column/i);
    assert.deepEqual(parsed.rows, []);
  });

  it('refuses a paste with no data rows', () => {
    const parsed = parseTeamTotalsPaste('Team\tTotal Points');
    assert.match(parsed.error ?? '', /at least one data row/i);
  });

  it('skips rows whose team cell is blank', () => {
    const parsed = parseTeamTotalsPaste(['Team\tTotal Points', 'Autobotz\t120', '\t90'].join('\n'));
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.skipped, 1);
  });
});

describe('parsePlayerTotalsPaste', () => {
  it('captures the player, their team and their totals', () => {
    const raw = [
      'Player\tTeam\tMatches\tElims\tDamage\tHeadshots\tSurvival Time',
      'Beast\tVasista Esports\t18\t42\t5,900\t21\t21,600',
    ].join('\n');

    const parsed = parsePlayerTotalsPaste(raw);
    assert.equal(parsed.error, null);
    assert.deepEqual(parsed.rows[0], {
      player: 'Beast',
      team: 'Vasista Esports',
      metrics: {
        matches: 18,
        playerElims: 42,
        damage: 5900,
        headshots: 21,
        survivalTime: 21600,
      },
    });
  });

  it('accepts IGN as the player column and leaves team null when absent', () => {
    const parsed = parsePlayerTotalsPaste(['IGN\tKills\tDMG', 'Beastog\t31\t3,200'].join('\n'));
    assert.equal(parsed.rows[0].player, 'Beastog');
    assert.equal(parsed.rows[0].team, null);
    assert.equal(parsed.rows[0].metrics.playerElims, 31);
    assert.equal(parsed.rows[0].metrics.damage, 3200);
  });

  it('reads blank telemetry as not reported', () => {
    const parsed = parsePlayerTotalsPaste(['Player\tElims\tDamage', 'Beast\t42\t'].join('\n'));
    assert.equal(parsed.rows[0].metrics.playerElims, 42);
    assert.equal(parsed.rows[0].metrics.damage, null);
  });

  it('refuses a paste with no player column', () => {
    const parsed = parsePlayerTotalsPaste(['Team\tElims', 'Nebula\t42'].join('\n'));
    assert.match(parsed.error ?? '', /player column/i);
  });
});
