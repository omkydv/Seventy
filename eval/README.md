# Frame-by-frame check of SAM 3.1's dog tracks

Seventy's count is built on the tracks SAM 3.1 draws. This folder checks them by hand on the four sample clips: 28 frames taken through each clip, with every dog a person can see marked and matched to SAM's boxes.

| Clip | Frames | Dog sightings | Boxed | False alarms |
| --- | ---: | ---: | ---: | ---: |
| Mountain village square | 11 | 89 | 89 | 0 |
| Seaside promenade | 9 | 50 | 46 | 0 |
| Market street | 4 | 16 | 16 | 0 |
| Village lane | 4 | 8 | 8 | 0 |
| **All four** | **28** | **163** | **159** | **0** |

Every one of SAM's 159 boxes was on a real dog: no false alarms. Over the whole clips SAM found all 28 dogs, and Seventy counted each once, matching the hand count on every clip. The four sightings without a box are one dog, curled up dark against the far lawn of the promenade, about 40 pixels long in a 1080 by 1920 frame; SAM picks it up at 21.9 s and it is counted.

Some boxes needed a closer look before they could be scored: a 22-pixel box next to a parked van is a dog walking behind it, a 12-pixel box at the edge of the market clip is a dog leaving the frame, and a dark shape on a wall in the mountain clip is a clay pot that SAM rightly left alone. Each is noted in `labels.json`.

## Method

Each frame was scored at full resolution with SAM's boxes drawn on it: does every dog a person can see have a box, and is every box on a dog. Whether a dog keeps one number from start to finish is checked by the clip-level hand counts in the app's sample surveys.

## Check it yourself

The sheets show every scored frame with SAM's boxes in green, and in amber the curled-up dog on the frames before SAM picks it up:

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
