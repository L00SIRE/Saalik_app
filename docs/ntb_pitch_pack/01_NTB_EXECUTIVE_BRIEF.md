# Saalik: executive brief for the Nepal Tourism Board

**Proposal:** a 90-day pilot of Saalik in the Kathmandu Valley, at no cost to the Board, to test whether a phone-based monument guide can move visitors toward lesser-visited heritage towns and send bookings to licensed local guides.

## What Saalik does

A visitor points a phone at a temple. Saalik identifies the monument from the photo and the phone's GPS position, then tells its story in English or Nepali, by text or by voice, with no mobile signal required. The story ends with an offer to walk the area with a licensed local guide, and the guide receives the request tagged with the monument that prompted it.

The Board sees the other side of the same activity in a web command center: where scans happen, which monuments still lack reference photographs, and what guides earn from scan-led bookings.

## What exists today

| Component | State |
| --- | --- |
| Heritage corpus | 101 monuments across 8 zones: the 7 UNESCO monument zones of the Kathmandu Valley plus Kirtipur, Bungamati, Panauti and other satellite towns. Each has bilingual names, 5 sourced lore passages and a 60-second audio script. |
| Monument recognition | 363 open-license reference photographs covering 68 monuments in 6 priority zones. Another 10 monuments in those zones are indexed from text descriptions only, until field photographs exist. |
| Mobile app | Scanner, offline stories, voice narration, follow-up questions, a 90-minute walking-route builder and guide booking. A demo mode runs the full flow in airplane mode. |
| Command center | Dispersion, registry health, guide livelihoods, alerts, a 3D model of each zone with winter sun and shadow, and a policy simulator. Its visitor and revenue figures are seeded demonstration data until the pilot produces real ones. |

## Measured accuracy

These figures come from our pre-departure benchmark, run on a laptop before any fieldwork in Nepal. The full method and caveats are in `data/nepal_heritage_seed/PRE_NEPAL_VECTOR_BENCHMARK.md`.

| Test | Result | What it shows |
| --- | --- | --- |
| Photo plus GPS, field-condition copies of the reference photos (363 queries) | Recall@1 **1.000** | The system is robust to overcast light, partial occlusion and tilt. The reference photo itself stays in the index, so this is not a test on new photographs. |
| Photo plus GPS, photographs held out of the index (64 queries) | Recall@1 **0.828**, Recall@3 **0.938** | The closest test we have to a visitor's own photo. The right monument is the first answer about 5 times in 6 and is among the top 3 about 15 times in 16. |
| Processing time per photo | **49.5 ms** median, warm, on an Apple-silicon laptop (MPS) | Decode, quality check, encoding and ranking. Network time is not included. |

The remaining errors are between neighbours in the same square, such as Kumari Ghar and Gaddhi Baithak. The app handles those by asking the visitor one question about what they can see.

## What the benchmark does not show

- Every monument coordinate is a desk-research estimate. The GPS step needs surveyed positions before its accuracy on site can be trusted.
- The reference photographs come from Wikimedia Commons. Some are by the same photographer as the test photograph.
- All 101 monument texts are editorial drafts. None has yet been reviewed by a site custodian or the Department of Archaeology.

The first 30 days of the pilot exist to close these three gaps.

## What we ask of the Board

1. Permission to photograph the pilot monuments for the reference index, and an introduction to site custodians for review of the texts.
2. An introduction to licensed guides in the pilot zones who are willing to take bookings through the app.
3. One point of contact, and a monthly review meeting.

## What the Board receives

1. A weekly dispersion report: scans by zone and by hour, in aggregate, with no personal data.
2. The verified bilingual texts and the surveyed coordinates for every pilot monument, for the Board's own use.
3. A closing report at day 90 with measured recognition accuracy on site, guide bookings and income, and a recommendation on whether to extend.

The draft terms are in `02_90_DAY_PILOT_MOU.md`. A five-minute demonstration script is in `03_5MIN_DEMO_SCRIPT.md`.
