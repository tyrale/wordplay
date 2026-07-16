/**
 * Alert Copy — Single Source of Truth
 *
 * Centralized copy for every full-screen alert/notification/overlay in the app
 * (win/lose/quit screens, unlocks, challenge outcomes, generic alerts).
 *
 * Rendered by `AlertOverlay` (see `src/components/ui/AlertOverlay.tsx`).
 * Each entry's `lines` array is rendered as stacked, centered words —
 * one line per array item. Lines may contain `{param}` placeholders that
 * get substituted at call time via `resolveAlertLines()`.
 *
 * Entries may also include an optional `meta` — a short explanatory phrase
 * rendered in smaller text below the main lines (e.g. "Now available in the
 * menu"). It also supports `{param}` placeholders, resolved via
 * `resolveAlertMeta()`. Entries that need per-item variation (e.g. a
 * different phrase per bot) can add `metaByItem`, keyed by the raw
 * item/bot/mechanic id — looked up before falling back to `meta`.
 *
 * `win`/`lose`/`quit` each hold a pool of `variants` — one is picked at
 * random via `pickAlertVariant()` every time that screen is shown, so the
 * player doesn't see the exact same phrase every game.
 *
 * To add a new alert: add an entry under the relevant category below.
 * No component code changes are needed to add/edit copy.
 */

export interface AlertCopyEntry {
  lines: readonly string[];
  /** Optional short explanatory phrase shown below the main lines. */
  meta?: string;
  /** Optional per-item override for `meta`, keyed by raw item id (e.g. bot id, mechanic id). */
  metaByItem?: Record<string, string>;
}

export interface AlertVariantSet {
  variants: readonly AlertCopyEntry[];
}

export const alertCopy = {
  /** Bot-game win/lose/quit screens — one phrase picked at random per screen view */
  win: {
    variants: [
      { lines: ['WELL', 'DONE', 'NERD'] },
      { lines: ['YOU', 'WON', 'NICE'] },
      { lines: ['VICTORY', 'IS', 'YOURS'] },
      { lines: ['CRUSHED', 'IT'] },
      { lines: ['GG', 'YOU', 'WIN'] }
    ]
  },
  lose: {
    variants: [
      { lines: ['NICE', 'TRY', 'LOSER'] },
      { lines: ['SO', 'CLOSE', 'YET', 'SO', 'FAR'] },
      { lines: ['BETTER', 'LUCK', 'NEXT', 'TIME'] },
      { lines: ['THE', 'BOT', 'WINS'] },
      { lines: ['OUTSMARTED'] }
    ]
  },
  quit: {
    variants: [
      { lines: ['ALWAYS', 'THE', 'QUITTER'] },
      { lines: ['YOU', 'GAVE', 'UP'] },
      { lines: ['RAGE', 'QUIT?'] },
      { lines: ['COWARD'] },
      { lines: ['RUNNING', 'AWAY?'] }
    ]
  },

  /** Daily challenge outcome screens */
  challenge: {
    win: { lines: ['WELL', 'DONE'] },
    lose: { lines: ['HAHA', 'QUITTER'] }
  },

  /** Unlock notifications (theme/bot/mechanic/vanity filter/etc.) */
  unlocks: {
    /** Theme copy stays generic — no per-theme variation needed. */
    theme: { lines: ['NEW', 'THEME', '{item}'], meta: 'Now available in the menu' },
    bot: {
      lines: ['UNLOCKED', '{item}', 'NICE!'],
      meta: 'Challenge them anytime',
      metaByItem: {
        'easy-bot': 'A worthy first rival',
        'medium-bot': 'Getting tougher',
        'hard-bot': 'Bring your best moves',
        'expert-bot': 'The ultimate challenge',
        'pirate-bot': 'Arrr, ready to play',
        'chaos-bot': 'Expect the unexpected',
        'puzzle-bot': 'Loves a good brain-teaser',
        'speed-bot': 'Fast and furious moves',
        'creative-bot': 'Plays outside the box',
        'vowel-bot': 'Obsessed with vowels',
        'rhyme-bot': 'Everything rhymes now',
        'aggressive-bot': 'Comes out swinging',
        'defensive-bot': 'Hard to catch off guard',
        'learning-bot': 'Adapts to your style',
        'random-bot': 'Totally unpredictable',
        'mirror-bot': 'Plays just like you',
        'blitz-bot': 'Lightning fast',
        'zen-bot': 'Calm, cool, collected',
        'trickster-bot': 'Full of surprises',
        'scholar-bot': 'Loves rare words',
        'minimalist-bot': 'Does more with less',
        'maximalist-bot': 'Goes all in',
        'perfectionist-bot': 'Never slips up',
        'wildcard-bot': 'Anything can happen',
        'tactical-bot': 'Thinks several moves ahead',
        'strategic-bot': 'Playing the long game',
        'adaptive-bot': 'Changes tactics mid-game',
        'comeback-bot': 'Dangerous when behind',
        'guardian-bot': 'Protects its key letters',
        'hunter-bot': 'Hunts down key letters',
        'ninja-bot': 'Strikes without warning',
        'wizard-bot': 'Pulls off magic moves',
        'robot-bot': 'Cold, calculated precision',
        'beast-bot': 'Raw power incarnate',
        'noob-bot': 'Only ever adds an S'
      }
    },
    mechanic: {
      lines: ['NEW', 'FEATURE', '{item}'],
      meta: 'Now available in the game',
      metaByItem: {
        '5-letter-start': 'Toggle is on in the menu.',
        '6-letter-start': 'Toggle is on in the menu.',
        'vanity-filter': 'Let the explitives fly!',
        'time-pressure': '7 second turn timer. The pressure is on!'
      }
    },
    vanityFilter: { lines: ['FILTER', 'TOGGLE', 'UNLOCKED'], meta: 'Toggle it in the menu' },
    reveal: { lines: ['{item}', 'PREVIEW', 'UNLOCKED'], meta: 'Check the menu to see what\'s still locked' },
    darkMode: { lines: ['HELL', 'YES', 'BITCH'], meta: 'the founder and creator grants you dark mode' },
    generic: { lines: ['NEW', 'UNLOCK', '{item}'], meta: 'Check the menu to see what\'s new' }
  },

  /** Miscellaneous one-off alerts (share results, errors, etc.) */
  generic: {
    shareSuccess: { lines: ['SHARED'] },
    shareError: { lines: ['SHARE', 'FAILED'] },
    resetTrigger: { lines: ['DUH', "yeah it happened. i wouldn't use that word"] }
  }
} as const;

export type AlertCategory = keyof typeof alertCopy;
export type AlertKey<C extends AlertCategory> = keyof (typeof alertCopy)[C];

/**
 * Picks a random entry from an `AlertVariantSet`'s `variants` pool.
 * Used for `alertCopy.win`/`lose`/`quit` so the player sees a different
 * phrase each time that screen is shown.
 */
export function pickAlertVariant(set: AlertVariantSet): AlertCopyEntry {
  const { variants } = set;
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Substitutes `{param}` placeholders in an entry's lines with values from `params`.
 * Lines without matching placeholders are returned unchanged.
 */
export function resolveAlertLines(entry: AlertCopyEntry, params?: Record<string, string>): string[] {
  if (!params) return [...entry.lines];
  return entry.lines.map(line => substituteParams(line, params));
}

/**
 * Resolves an entry's `meta` phrase: looks up `metaByItem[itemId]` first
 * (for per-bot/per-mechanic variation), falls back to the entry's generic
 * `meta`, then substitutes any `{param}` placeholders. Returns `undefined`
 * if the entry has neither.
 */
export function resolveAlertMeta(entry: AlertCopyEntry, params?: Record<string, string>, itemId?: string): string | undefined {
  const template = (itemId && entry.metaByItem?.[itemId]) ?? entry.meta;
  if (!template) return undefined;
  return substituteParams(template, params);
}

function substituteParams(text: string, params?: Record<string, string>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_match, key: string) => params[key] ?? '');
}
