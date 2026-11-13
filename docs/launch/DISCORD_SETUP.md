# Reword Discord — Setup Kit

> **Purpose**: Everything needed to build the Reword Discord in under an hour, using the five starter channels from [LAUNCH_PLAN.md](LAUNCH_PLAN.md) §10. Per the plan's Phase 3, open it once there's enough interest (e.g. the first recurring players are asking where to talk). It's cheap to build ahead of time and keep private until then.

Discord's menus move around occasionally. If a setting isn't exactly where it's described below, search for it in Server Settings.

**Guardrails from the plan that apply here:** keep it small (add channels only when participation justifies them) · never publish the full unlock list · never invent stats or testimonials.

---

## 1. Create the server (5 min)

1. In Discord: **+ (Add a Server) → Create My Own → For a club or community**. Name it **Reword**. Use `apps/native/assets/icon.png` as the server icon (Discord's own requirement; the "no logo" rule applies to the website).
2. Turn on **two-factor authentication** on your Discord account (User Settings → My Account).

## 2. Turn it into a Community server (5 min)

**Server Settings → Enable Community → Get Started.** This unlocks forum channels, Onboarding and the Server Guide.

- Verification level: **Medium** · Explicit media filter: **all members**.
- Rules channel: `#rules` · Community updates channel: `#mod-log`.
- **AutoMod**: turn on mention-spam, suspected-spam and commonly-flagged-words blocking.
- **Overview → Default Notification Settings: Only @mentions.**

## 3. Channels — the five from the plan, plus the minimum around them (15 min)

```
#rules             read-only
#announcements     read-only (only you post): new content, releases

#daily-challenge   Forum — one post per day titled "Reword #N"; paths only in ||spoiler tags||
#unlock-hunters    Forum — one post per discovery; trigger words ALWAYS in ||spoiler tags||
#word-paths        surprising routes between words, "can you get from X to Y?"
#bots              bot personalities, rivalries, funny games
#feedback          Forum — tags: bug / idea / confusing / fixed / shipped

#mod-log           private
```

**The `#unlock-hunters` rule is what protects the mystery.** Post guidelines: _"Say what you found (a theme, a bot, a new menu…), never the word that triggered it unless it's inside ||spoiler tags||. Hidden theme name lengths (`?????`) are fair game to compare."_ Players can then work things out together without the catalog ever being posted openly. Don't post or pin a full list yourself.

Other settings:

- `#rules` and `#announcements`: @everyone can view and react, but not send messages.
- `#daily-challenge` default sort: **creation date**.

## 4. Roles (5 min)

Keep them minimal: **Dev** (you, Administrator) · **Mod** (later: Manage Messages, Timeout Members) · **Early Player** (everyone who joins before the public web launch; a permanent thank-you) · **Daily** (self-assigned, can be pinged when the daily thread goes up).

## 5. Onboarding (10 min)

**Server Settings → Onboarding.** Default channels: all five public channels plus `#announcements`.

One question: _"What are you here for?"_ (multi-select)

- 📅 The Daily Challenge → role **Daily**, channel `#daily-challenge`
- 🔍 Hunting hidden unlocks → `#unlock-hunters`
- 🤖 Bots → `#bots`
- 🔤 Word paths → `#word-paths`

**Server Guide → To-do list:** "Play today's challenge" → `#daily-challenge` · "Read the rules" → `#rules`.

## 6. Copy-paste text

### #rules

```
Every word is a doorway. Keep the doors open for everyone:

1. Be kind. No harassment, hate speech or personal attacks.
2. Spoilers go in ||spoiler tags||: Daily Challenge paths, and the word that
   triggers any unlock. Say WHAT you found, not HOW, unless it's tagged.
3. Bugs, confusion and ideas go in #feedback. They get read.
4. No spam or self-promotion without asking first.
5. The game accepts profanity. In chat, keep it PG-13.
```

### Welcome message (Server Guide + pinned)

```
Welcome to Reword. Every word is a doorway.

Three simple actions: ADD a letter, REMOVE a letter, MOVE letters around.
Some words reveal things you never expected.

📅 Everyone gets the same Daily Challenge. Post your result in #daily-challenge
🔍 Found something hidden? Tell #unlock-hunters (spoiler-tag the word!)
🔤 Found a wild route between two words? #word-paths
🤖 A bot did something strange? #bots
💬 Confused, stuck, or found a bug? #feedback

Today's challenge: https://wordplay-blond.vercel.app/?daily
```

### First posts (seed each channel before inviting anyone)

- **#daily-challenge**: today's post, `Reword #N`, with your own share result.
- **#unlock-hunters**: a single teaser that reveals something exists without spoiling it, for example _"There's a word that makes a new menu appear. Has anyone found it yet?"_ Only use teasers about things that are actually in the game.
- **#word-paths**: a real path you played, posed as a question. Verify it in the game first; the plan forbids invented paths.
- **#feedback**: _"What confused you in your first game?"_ This feeds the Phase 2 onboarding work directly.

## 7. Invite link

**Invite People → Edit invite link →** Expire: **Never**, Max uses: **No limit**. Send it to Claude to wire into the website footer and the game menu.

## 8. Habits

- Post the daily thread every day (until it's automated, per Workflow A in the plan).
- Answer every `#feedback` post, and retag it `fixed`/`shipped` when it lands. Mention the person who asked.
- Use what people discover and ask about in `#unlock-hunters` as signal for "refine discovery pacing" (90-day goal).
