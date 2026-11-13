# Reword — Full Marketing, Launch & Website Plan

> **Purpose**: The canonical marketing, launch, community and website plan. Companion docs: [DISCORD_SETUP.md](DISCORD_SETUP.md) (server build kit) · [LAUNCH_POSTS.md](LAUNCH_POSTS.md) (ready-to-post copy) · landing page source in [`/site`](../../site).
>
> Originally written under the working name "Wordplay"; the app has since been renamed **Reword**, and this copy is updated to match. Everything below §"Execution status" is the original plan.

## Execution status (updated 2026-11-13)

| Item                                   | Status                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public name                            | ✅ **Reword**                                                                                                                                          |
| Game URL                               | 🟡 `https://wordplay-blond.vercel.app`. Works, but there's no custom domain yet and the URL still says "wordplay" (open decision)                      |
| Daily Challenge URL                    | ✅ `<game URL>/?daily` opens today's challenge directly                                                                                                |
| Share grid has game name + direct link | ✅ First line is `Reword #N`; the share appends the Daily Challenge link (web and native). The grid shows only the start/target words, not the answers |
| Landing page (GitHub Pages)            | 🟡 Built in `/site` with the locked visual system. Needs GitHub Pages turned on in the repo settings to publish                                        |
| Social preview metadata (game + site)  | 🟡 Site has it; the game's `index.html` still to do                                                                                                    |
| Analytics                              | ❌ Not chosen (open decision)                                                                                                                          |
| Discord                                | ⏳ Kit ready ([DISCORD_SETUP.md](DISCORD_SETUP.md)); per Phase 3, open it once there's enough interest                                                 |
| Native apps                            | Expo testers on the preview channel; per Phase 5, web promotion doesn't wait for them                                                                  |

> **Correction to §2:** Daily Challenge words are not always five letters. Challenge #1048 (2026-11-13) is MAZER → UNCAGE. Site and post copy say "a start word and a finish word" instead. Either fix the generator or keep the copy length-neutral.
>
> **Landing page URL:** `https://tyrale.github.io/wordplay/` once Pages is enabled (Settings → Pages → Source: GitHub Actions); the workflow is `.github/workflows/pages.yml`.

## 1. Vision and positioning

**Every word is a doorway.**

**Supporting message:** A word game where every word can unlock something.

Reword is a simple-to-learn word transformation game with unusual depth. Players explore connections between words, compete against people and bots, solve a shared Daily Challenge, and discover hidden themes, mechanics, and interface features.

**Pitch:** Discover hidden themes, unique bots, and surprising mechanics as you explore an ever-growing network of words. Play against people, challenge bots, or solve the same Daily Challenge as everyone else.

Marketing should lead with _discovery and curiosity_, not a technical explanation of anagrams. A word can reveal something new; do not imply every word grants a collectible reward.

## 2. Core gameplay and product facts

Three player actions:

- **Add:** Introduce a new letter.
- **Remove:** Eliminate a letter.
- **Move:** Change the relative order of existing letters.

The game recognizes standard English, slang, profanity, and proper nouns. Human players always follow the same rules and scoring system. **No unlock may give a player extra points, a competitive advantage, or a rule change.** Certain special bots may intentionally break rules as part of their personality.

### Existing Daily Challenge

- One new puzzle every day.
- Random five-letter starting and finishing words.
- The same pair for every player that day.
- Existing Wordle-style, shareable results grid.

The Daily Challenge and sharing already exist: the launch plan must _promote and measure_ them, not treat them as features to build from scratch.

### Unlocks

The three browsable categories are **Themes, Mechanics, Bots**. Some discoveries live outside these categories and quietly add or enhance menus or interface capabilities.

Known examples:

- `red` reveals a red theme.
- `five` enables starting a game with five letters.
- `pirate` reveals a profanity-oriented bot.
- `unlock` reveals an unlock counter.
- `themes` reveals a list of themes with undiscovered names masked as `?????`, preserving word length.

Keep the complete unlock list secret. Players should know how many mysteries remain without knowing all the answers. Use accurate live counts rather than fixed marketing claims.

## 3. Brand and messaging

### Primary message

**Every word is a doorway.**

### Supporting messages

- Three simple actions. Countless possibilities.
- A word game where every word can unlock something.
- Same daily puzzle. Your own path.
- Some words reveal things you never expected.
- Play against people, bots, or the Daily Challenge.

### Voice

Bold, concise, curious, playful, and mysterious. Never make up player statistics, unlock rarity, word paths, or user testimonials. Show genuine gameplay and authentic discoveries.

### Core story

The game isn't about finding _the_ answer. It's about discovering what is possible. Each word can lead to new routes, and some words reveal a world hidden inside the game. The product evolves as players explore it. Players share surprising paths and discoveries, making their own curiosity the strongest marketing channel.

## 4. Website strategy and design specification

**Goal:** Turn a visitor into a player quickly. Mobile web first, GitHub Pages hosting.

### Required sections

1. **Header:** Text-only game name, minimal navigation, Play link.
2. **Hero:** “Every word is a doorway.” A short discovery-led pitch, Play Free CTA, actual mobile gameplay screenshot.
3. **Rules:** Three simple actions, with exact Add/Remove/Move definitions.
4. **Daily Challenge:** Explain the shared five-letter start/finish and daily reset; feature an accurate example of the existing share grid.
5. **Hidden Discoveries:** Tease themes, mechanics, bots, and surprise interface additions without revealing the full list.
6. **Gameplay screenshots:** Real screenshots, uncluttered presentation.
7. **Final CTA:** Start playing.
8. **Footer:** Minimal.

### Locked visual system

- **Background:** `#FFFFFF` white.
- **Primary/base:** `#1F2E7C` dark blue, for headlines, body copy, buttons, and dark sections.
- **Accent:** `#3F6FEF` light blue, for highlights and interaction emphasis.
- **Font:** Inter, **weight 900 (Black) exclusively**, across headings, body, navigation, buttons, and footer.
- **No logo, no pills, no borders.**
- Avoid gradients, ornamental shadows, extra colors, and excessive decoration.
- Large typography and generous whitespace; clear hierarchy through scale, spacing, and color, never font-weight variation.
- Make the Daily Challenge a prominent dark-blue section.
- Ensure mobile and desktop responsiveness, accessible contrast, useful alt text, and working keyboard navigation.

### Website copy

**Hero:** Every word is a doorway.

**Supporting copy:** Discover hidden themes, unique bots, and surprising mechanics as you explore an ever-growing network of words. Play against people, challenge bots, or solve the same Daily Challenge as everyone else.

**Rules heading:** Three simple actions.

- ADD — Introduce a new letter.
- REMOVE — Eliminate a letter.
- MOVE — Change the relative order of existing letters.

**Daily heading:** One challenge. Thousands of paths.

**Discoveries heading:** Hidden discoveries.

### Website implementation checklist

- [ ] Keep the site in a GitHub Pages-ready `index.html` and assets folder.
- [ ] Replace placeholder `href="#"` Play links with the real game URL.
- [ ] Link Daily Challenge CTAs directly to the actual challenge.
- [ ] Use authentic screenshots and a faithful example of the share grid.
- [ ] Add meta description and social preview metadata.
- [ ] Test on iPhone, Android, and desktop.
- [ ] Measure page visits, Play clicks, Daily Challenge clicks, and referred game starts.

**Ongoing rule:** When the website design is changed, update the actual website files, not just the written recommendations.

## 5. Target audiences

**Primary:** Wordle, Scrabble, anagram, word ladder, casual puzzle, and daily word game fans.

**Secondary:** Completionists, secret hunters, linguistics enthusiasts, and friends seeking lightweight competitive play.

### Priority channels

1. **Built-in sharing:** Existing Daily Challenge grid and direct play links.
2. **Short video:** TikTok and YouTube Shorts showing genuine gameplay and discoveries.
3. **Reddit:** Participate in relevant word and puzzle communities with authentic challenges; respect self-promotion rules.
4. **Discord:** A small community for Daily Challenge discussion, Unlock Hunters, Word Paths, Bots, and Feedback.
5. **Creators:** Small and medium word-game, puzzle, and language creators.

Later channels: app stores, newsletters, press outreach, selective paid acquisition.

## 6. Launch roadmap

### Phase 1 — Foundation (Week 1)

- [ ] Confirm the public name, game URL, Daily Challenge URL, and landing page domain.
- [ ] Publish the GitHub Pages landing page.
- [ ] Verify every CTA works.
- [ ] Confirm the share grid includes a recognizable game name and direct link without spoiling answers.
- [ ] Add basic analytics: acquisition, game starts, completions, sharing, and retention.
- [ ] Produce a small kit of screenshots, a 10-second gameplay clip, and short product descriptions.

**Success:** A new visitor can understand the promise and start playing in under one minute.

### Phase 2 — Small player group (Weeks 2–3)

- [ ] Recruit 30–100 testers who enjoy word games.
- [ ] Invite them to play the Daily Challenge on multiple days.
- [ ] Observe where onboarding causes confusion.
- [ ] Measure first-game completion and next-day return.
- [ ] Ask what unlocks they found and what they expected.
- [ ] Fix major usability and reliability issues.

**Success:** A meaningful subset voluntarily returns without reminders.

### Phase 3 — Public web launch (Weeks 4–6)

- [ ] Announce the game using “Every word is a doorway.”
- [ ] Post a real gameplay demonstration.
- [ ] Publish a Daily Challenge invitation and share example.
- [ ] Contribute puzzles to communities where allowed.
- [ ] Open a small Discord if interest warrants.
- [ ] Contact a first group of puzzle creators.
- [ ] Improve the landing page based on conversion data.

**Success:** Repeatable new-player acquisition and measurable retention.

### Phase 4 — Automated marketing (Weeks 7–10)

- [ ] Automate daily challenge announcements.
- [ ] Generate weekly highlights from real gameplay data.
- [ ] Draft short-form captions and scripts with AI.
- [ ] Create templated media from validated game events.
- [ ] Schedule approved content.
- [ ] Send weekly analytics and feedback summaries.
- [ ] Add safeguards and a kill switch for publishing errors.

**Success:** Marketing takes a short weekly review rather than daily manual effort.

### Phase 5 — Native apps (after web validation)

- [ ] Plan iOS and Android builds.
- [ ] Preserve accounts, unlocks, and progress where appropriate.
- [ ] Prepare app store screenshots, descriptions, and videos.
- [ ] Run native beta tests.
- [ ] Announce each app release as its own marketing moment.

Do not delay web promotion while waiting for native apps.

## 7. Content strategy

Content should come from real gameplay, not generic promotional claims.

### Content pillars

- **Daily Challenge:** Everyone gets the same puzzle; compare spoiler-free results.
- **Unexpected Paths:** “Can you get from this word to that one?”
- **Hidden Discoveries:** Reveal the _existence_ of a mystery without spoiling the full unlock list.
- **Bot Personalities:** Funny or surprising games against bots.
- **Community Highlights:** Impressive paths, unusual words, creative solutions.
- **Behind the Game:** Occasional authentic progress updates.

### Example weekly calendar

| Day       | Content                    |
| --------- | -------------------------- |
| Monday    | Daily Challenge invitation |
| Tuesday   | Surprising word path       |
| Wednesday | Hidden discovery teaser    |
| Thursday  | Bot spotlight              |
| Friday    | Community puzzle           |
| Saturday  | Interesting player result  |
| Sunday    | Weekly recap               |

Begin with 3–5 high-quality posts per week plus a lightweight daily challenge announcement if useful. Repurpose strong clips across platforms.

### Sample hooks

- “Every word can unlock something. What will you find?”
- “Can you reach this five-letter word from that one?”
- “I played one word and a new menu appeared.”
- “Everyone got the same puzzle today. Nobody had to take the same path.”
- “This bot doesn't play like the others.”

Only use specific paths and player claims after verifying them.

## 8. Built-in growth loops

### Daily Challenge sharing

The existing grid should make it easy to:

- Identify the game.
- Identify the challenge date/number.
- Show a spoiler-free result.
- Invite someone to try the same challenge.
- Open the game through a working link.

### Unlock sharing

Allow players to share an interesting discovery without automatically publishing the entire catalog or spoiling the trigger word if that would undermine mystery.

### Friend challenges (future idea)

Explore links that open a specific starting word or custom word challenge, without sign-up friction.

### Community discovery

Encourage players to compare hidden theme lengths, discuss bots, and build their own community knowledge. Don't publish the complete unlock catalog.

## 9. Low-maintenance automation system

**Goal:** Automate repetitive work while keeping public content authentic and trustworthy.

### Suggested architecture

Game database / analytics → workflow orchestrator (such as n8n) → AI content drafting → media templates → approval → scheduler/platform integrations → reporting.

Choose vendors and costs when implementing.

### Workflow A — Daily Challenge post

1. Fetch today's actual puzzle.
2. Confirm correct date and game URL.
3. Generate a branded teaser.
4. Avoid spoilers.
5. Schedule or publish.
6. Record the post URL and performance.

### Workflow B — Interesting gameplay highlights

1. Read eligible game events.
2. Detect unusual or entertaining paths.
3. Verify every word and transition using the game engine.
4. Respect player privacy and consent.
5. Generate a script, caption, and short video.
6. Queue for review and publishing.

### Workflow C — Unlock discoveries

1. Detect unlock events.
2. Identify genuinely noteworthy discoveries.
3. Decide what can be teased without spoilers.
4. Generate a post.
5. Review and schedule.

### Workflow D — Weekly summary

1. Aggregate traffic, retention, sharing, and post results.
2. Highlight top content and player moments.
3. Summarize recurring community feedback.
4. Recommend a few next actions.
5. Deliver the report by email or Slack.

### Safety and quality controls

- Begin with approval before AI-generated posts go live.
- Automate only reliable templates after testing.
- Never invent players, reviews, rarity figures, or word paths.
- Do not auto-spam Reddit or communities.
- Follow platform rules, rate limits, and consent requirements.
- Log publishing actions and support a pause switch.

## 10. Community and creator outreach

### Discord starter channels

- Daily Challenge
- Unlock Hunters
- Word Paths
- Bots
- Feedback / Bugs

Only add channels when participation justifies them.

### Creator kit

- Game URL.
- 10-second real gameplay clip.
- A few screenshots.
- A short pitch.
- Daily Challenge link.
- Optional spoiler-safe discovery teaser.

### Outreach draft

> I made a free mobile word game where every word can unlock something. It uses three simple actions, has a shared Daily Challenge, and hides themes, bots, and other surprises throughout the game. I'd love to send you a challenge and see what path you find.

## 11. Metrics and experiments

| Metric                        | Question answered                        |
| ----------------------------- | ---------------------------------------- |
| Landing-to-play conversion    | Does the website convince people to try? |
| First-game completion         | Can new players understand the game?     |
| Day 1 / 7 / 30 retention      | Do people return?                        |
| Daily Challenge participation | Is the daily ritual working?             |
| Share rate                    | Do players want to show their results?   |
| Share-to-play conversion      | Do shares acquire players?               |
| Unlocks discovered per player | Does discovery sustain interest?         |
| Source-attributed new players | Which channels work?                     |

### First experiments

- “Every word is a doorway” vs. “Every word can unlock something.”
- “Play Free” vs. “Play Today's Challenge.”
- Gameplay video vs. hidden-discovery teaser.
- Different spoiler-free share invitations.

Set success criteria before testing; avoid conclusions from tiny samples.

**Early milestone:** Get 100 people who voluntarily return to play the Daily Challenge, rather than chasing a large one-day traffic spike.

## 12. Risks and guardrails

- **Low retention:** Improve onboarding before buying ads.
- **Spoiled unlocks:** Tease mysteries rather than publishing the full list.
- **Invalid AI-generated paths:** Validate against the real game rules.
- **Too many channels:** Start with a small number and expand based on evidence.
- **Repetitive automation:** Use authentic gameplay moments and varied templates.
- **Native app distraction:** Prioritize web retention first.
- **Unfair gameplay perception:** Never introduce player power-ups or scoring advantages.
- **Overpromising:** Clearly distinguish live features from future ideas.

## 13. Immediate next actions

### This week

- [ ] Confirm game and Daily Challenge URLs.
- [ ] Publish and QA the landing page.
- [ ] Ensure all Play buttons link correctly.
- [ ] Validate share-to-play behavior.
- [ ] Add conversion and retention analytics.
- [ ] Record three real gameplay clips.
- [ ] Recruit the first recurring players.

### Next 30 days

- [ ] Measure onboarding and repeat play.
- [ ] Establish a sustainable posting rhythm.
- [ ] Test Reddit puzzle posts where permitted.
- [ ] Reach out to small word-game creators.
- [ ] Set up a lightweight community space.
- [ ] Build the first automated Daily Challenge post.
- [ ] Create a weekly analytics summary.

### Next 90 days

- [ ] Find at least one repeatable acquisition channel.
- [ ] Improve share conversion.
- [ ] Automate verified content workflows.
- [ ] Refine discovery pacing based on player behavior.
- [ ] Prepare native app launch materials if metrics support expansion.

## 14. Decisions made and still open

**Decided:** Discovery-first positioning; existing Daily Challenge and share grid; mobile web first; Themes/Mechanics/Bots plus uncategorized discoveries; no player advantages; white/navy/blue website; Inter Black 900 only; no logo, pills, or borders; marketing should be heavily automated.

**Open:** Final public domain and game URLs; analytics platform; automation stack; initial creator list; exact launch timing; native implementation approach; optional email signup.

---

## North Star

**Curiosity → First game → Discovery → Return tomorrow → Share → New player → New discovery.**

The game creates the moments. The website gets people playing. The share flow brings new players. Automation helps those moments travel without requiring constant manual marketing.

**Every word is a doorway.**
