# Seventy

**Know when a street is safe from rabies.**

Walk a street with any phone. Seventy counts every dog once, reads each vaccination mark, and tells a vaccination team whether the area has reached the 70% that stops rabies. Every number comes with the evidence behind it: each dog's close-up, its moment in the walk, and what the model read.

Built for the Meta Global AI Developer Hackathon 2026 (Indie track, theme: Build for Your World). Every AI step runs on Meta models: SAM 3.1, Muse Spark and Muse Wonder.

## Why

- Rabies kills tens of thousands of people every year. Four in ten are children, and 99% of cases start with a dog ([WHO fact sheet, 2026](https://www.who.int/news-room/fact-sheets/detail/rabies)).
- Vaccinating 70% of dogs stops the virus spreading, and teams do that work every year, area by area.
- Checking whether a drive reached 70% is the weak step. One campaign measured three standard ways gave 47%, 32% and 19% ([Frontiers in Microbiology, 2025](https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2025.1696281/full)).
- Street counts miss puppies and overstate coverage by about 10%, and local governments often have no budget to check at all ([Frontiers in Veterinary Science, 2017](https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2017.00033/full)).

An area wrongly marked complete is where rabies keeps moving. Seventy keeps the walk teams already do and turns it into evidence anyone can check.

Cities already pay for this kind of count. In October 2026, San Antonio commissioned an AI count of its roaming dogs for about $99,000, after volunteer hand counts came back with blank sheets ([KSAT, 28 October 2026](https://www.ksat.com/news/local/2026/10/28/researchers-use-cell-phones-and-ai-to-count-loose-dogs-in-san-antonio/), [Southwest Research Institute](https://www.swri.org/what-we-do/internal-research-development/2024/automotive-transportation/city-of-san-antonio-rd-league-computer-vision-unrestrained-dog-census-10-r633004)). Rabies programmes in Asia and Africa face the same question on a fraction of that budget.

## Who it is for

| Team | Their question | What one walk gives them |
|---|---|---|
| Rabies vaccination programmes | Did this area reach 70%? | Coverage with an honest margin, and every dog's mark as evidence |
| Dog sterilization programmes | What share of the dogs here is sterilized? | The same walk read for the ear notch, with every unclear ear sent to a person |
| City animal services | How many roaming dogs, and where? | Every dog counted once along the route, owned dogs on a lead set apart |

Seventy measures dog vaccination for programme teams. It gives no medical advice to anyone.

## What it does

1. **Walk.** Film the street with any phone. The browser converts the video into small pieces (5–10 frames a second, 960 px) and uploads only those; the original stays on the phone.
2. **Count every dog once.** SAM 3.1 tracks every dog in each piece from the single word "dog". Pieces overlap by two seconds and are stitched by box overlap, so a dog crossing a boundary keeps one number.
3. **Check for repeats.** When a track starts after another ended, Muse Spark compares their close-ups and decides whether it is the same dog. Unsure pairs go to a person.
4. **Blur people.** SAM 3.1 looks for people only to pixelate them inside their own outline in every frame. Nobody is tracked, counted or identified.
5. **Read every mark.** The browser cuts the sharpest close-ups from the original video. SAM 3.1 finds the ears and enlarges them. Muse Spark reads paint, collars, ear tags and ear notches, notes puppies and dogs on a lead, and says "can't tell" when it can't. A person decides those.
6. **Get a second opinion.** For collars and ear tags, SAM 3.1 looks for the mark on the same close-up. When it and Muse Spark disagree, neither answer counts and the dog goes to a person.
7. **Decide with an honest margin.** Coverage comes with a Wilson 95% interval. Fewer than ten readable dogs is never called. The page says what to do next.
8. **Report.** Muse Wonder writes one page for the office, with the WHO and national rules it relies on found by web search and cited.

## Results (measured)

Four short street clips from four very different places. Two checks by hand: every dog in each clip counted without looking at Seventy's answer, and 28 frames scored one dog at a time against SAM 3.1's boxes.

**Dogs counted once, per clip**

| Clip | Place | By hand | Seventy | What differed |
|---|---|---|---|---|
| Mountain village square | A mountain village at dusk, 20 s | 13 | 13 | Nothing |
| Seaside promenade | A seaside town, 22 s | 9 | 8 | Missed a dark dog lying flat on the lawn, far from the camera |
| Market street | A busy city market, 6 s | 4 | 4 | Nothing |
| Village lane | A village in the tropics, 16 s | 2 | 2 | Nothing |
| **Total** | | **28** | **27** | |

**SAM 3.1's boxes, frame by frame** ([`eval/`](eval/))

| Clip | Frames | Dogs seen | Found | Missed | False boxes |
|---|---:|---:|---:|---:|---:|
| Mountain village square | 11 | 89 | 89 | 0 | 0 |
| Seaside promenade | 9 | 50 | 46 | 4 | 0 |
| Market street | 4 | 16 | 16 | 0 | 0 |
| Village lane | 4 | 8 | 8 | 0 | 0 |
| **All four** | **28** | **163** | **159** | **4** | **0** |

SAM 3.1 found 97.5% of the dogs a person can see in those frames, and every box it drew was on a dog. All four misses are the same dark dog curled up on the far lawn. The labels, SAM's boxes, the frames and the scoring script are in [`eval/`](eval/); CI rescores them on every push.

- **Ear tag.** One dog on the promenade carries a municipal ear tag about 25 pixels across. Muse Spark said it couldn't be sure; a person confirmed it in one look at SAM's enlarged ear.
- **Repeats.** Seventy checked 4 possible repeats and merged none. It left the unsure ones for a person, including one distant dog on the promenade that may have been seen twice.
- **Second opinion.** SAM 3.1 found the beagle's collar on the promenade and no collar on the dogs without one. On one mountain dog it read dark eyebrow spots as an ear tag, disagreed with Muse Spark, and the dog went to a person instead of being counted wrong.
- **Cost.** $0.64 for all four clips: tracking dogs and people, ear zoom, readings, second opinions and repeat checks. Each written report adds about $0.18. A ten-minute walk at five frames a second costs about two dollars: $1.28 to track dogs and people, about $0.015 a dog for readings, and the report.
- **Time.** SAM 3.1 tracked each clip in 30–75 seconds; pieces of a long walk run in parallel.

Four short clips are a small test, and the frame check was made by one person with SAM's boxes on screen. The next test is a full ten-minute walk, counted blind by two people.

## Meta models

| Model | Job in Seventy |
|---|---|
| SAM 3.1, video | Tracks every dog through each piece of the walk; this is the count |
| SAM 3.1, video | Finds people, only to blur them |
| SAM 3.1, image | Finds the ears on each close-up so small tags and notches can be enlarged |
| SAM 3.1, image | Looks for collars and ear tags itself, as a second opinion on Muse Spark's reading |
| Muse Spark 1.3 | Reads marks into fixed fields, notes puppies and leads, decides repeats, says "can't tell" |
| Muse Wonder 1.0 | Writes the cited report with web search |
| `@meta-sam/parser`, `@meta-sam/graphics`, `@meta-sam/video` | Decode SAM's output and draw outlines, numbers and blur on the video in the browser |

## How it is built

```mermaid
flowchart LR
  A[Phone video] -->|Mediabunny, in the browser| B[5–10 fps pieces]
  B --> C[(Supabase Storage)]
  C --> D[SAM 3.1 video: dogs]
  C --> E[SAM 3.1 video: people]
  D --> F[Stitch pieces, check repeats]
  F --> G[Close-ups cut in the browser]
  G --> H[SAM 3.1 image: ears]
  H --> I[Muse Spark: marks]
  H --> S[SAM 3.1 image: second opinion]
  I --> J[Wilson interval, decision]
  S --> J
  J --> K[Muse Wonder: report]
```

- `web/`: Next.js 16 app (App Router, React 19), Supabase for data and storage, Mediabunny for in-browser video conversion.
  - `src/lib/stats.ts`: Wilson intervals, coverage status, Chapman's estimator, walk statistics.
  - `src/lib/tracks.ts`: stitching tracks across pieces.
  - `src/lib/marks.ts`: mark rules.
  - `src/lib/server/`: the pipeline (jobs, polling, readings, report).
  - `src/components/WalkReplay.tsx`: the replay, with labels and blur drawn per frame.
- `eval/`: the frame-by-frame check of SAM 3.1's dog boxes, with hand labels and a scoring script.
- `worker/`: Python tools for preparing sample walks offline: split, track, stitch, read, re-identify, and draw boxes for checking by hand.
- `supabase/migrations/`: the database schema.

## Run it

Needs Node 22, Python 3.12 with ffmpeg on PATH (for the offline tools), a Supabase project and a Meta Model API key.

```bash
cd web
cp ../.env.example .env.local   # MODEL_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
npm install
npm run dev
```

Apply the SQL in `supabase/migrations/` to the Supabase project, in order.

To try it without filming anything, open `/app/new?sample=1`: it loads a 6-second market clip, ready to run through the whole pipeline live.

To prepare a sample walk offline and load it:

```bash
bash worker/tools/prepare_sample.sh walk.mp4 out/walk 10
python worker/tools/reid.py out/walk
cd web && npx tsx scripts/seed-walk.ts ../out/walk --title "Village lane" --mode plan
```

## Tests

```bash
cd web
npm test        # statistics, mark rules, second opinions, track stitching
npm run lint
npm run typecheck
cd .. && python eval/score.py   # SAM 3.1 against the hand labels
```

CI runs all four on every push.

## Footage and photographs

The street clips are from Pexels and used under the Pexels License. The photographs on the landing page are from Unsplash and used under the Unsplash License. No real people are tracked in any of them, and every person in the replays is blurred.

## Built during the hackathon

All code here was written between October 26 and November 4, 2026, by one person in a rural village, with a laptop and a phone.
