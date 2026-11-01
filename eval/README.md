# Frame-by-frame check of SAM 3.1's dog tracks

Seventy's count is only as good as the tracks SAM 3.1 draws. This folder checks them by hand on the four sample clips: 28 frames taken at even steps through each clip, with every dog a person can see marked and matched to SAM's boxes.

| Clip | Frames | Dogs seen | Found | Missed | False boxes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mountain village square | 11 | 89 | 89 | 0 | 0 |
| Seaside promenade | 9 | 50 | 46 | 4 | 0 |
| Market street | 4 | 16 | 16 | 0 | 0 |
| Village lane | 4 | 8 | 8 | 0 | 0 |
| **All four** | **28** | **163** | **159** | **4** | **0** |

SAM found 159 of the 163 dogs in these frames (97.5%), and every box it drew was on a dog. All four misses are the same dog: a dark dog curled up on the far lawn of the promenade, about 40 pixels long in a 1080 by 1920 frame. It is the one dog the clip-level count misses too.

Some boxes needed a closer look before they could be scored: a 22-pixel box next to a parked van is a dog walking behind it, a 12-pixel box at the edge of the market clip is a dog leaving the frame, and a dark shape on a wall in the mountain clip is a clay pot that SAM rightly left alone. Each is noted in `labels.json`.

## What this does and doesn't show

It measures detection on sampled frames: whether a dog a person can see has a box, and whether a box is on a dog. It doesn't measure whether a dog keeps one id from start to finish; the clip-level hand counts in the app's sample surveys cover that. The labels were made with SAM's boxes on screen, not blind, and by one person. Four short clips are a small test.

## Check it yourself

The sheets show every scored frame with SAM's boxes in green and the missed dog in amber:

- [`web/public/eval/mountain-village.jpg`](../web/public/eval/mountain-village.jpg)
- [`web/public/eval/seaside-promenade.jpg`](../web/public/eval/seaside-promenade.jpg)
- [`web/public/eval/market-street.jpg`](../web/public/eval/market-street.jpg)
- [`web/public/eval/village-lane.jpg`](../web/public/eval/village-lane.jpg)

## Files

- `labels.json`: the hand labels, one entry per frame.
- `sam_boxes.json`: SAM 3.1's boxes on those frames, taken from its saved output.
- `score.py`: checks that every SAM box is labelled as a dog or a false box, then writes `results.json`. Standard library only; CI runs it on every push.
- `extract.py`: rebuilds `sam_boxes.json` and the sheets from the clips and SAM's output (`python eval/extract.py <footage_dir>`, needs OpenCV).

```bash
python eval/score.py
```

The clips are from Pexels and free to use under the Pexels licence.
