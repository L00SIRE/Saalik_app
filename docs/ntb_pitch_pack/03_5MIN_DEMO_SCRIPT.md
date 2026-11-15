# Five-minute demonstration script

One presenter, one phone, one laptop. The phone part works in airplane mode.

## Before the meeting

1. On the laptop, from the repository root: `npm --prefix apps/ntb-command-center run dev`, then open `http://localhost:3000`. `npm run live:all` also starts the API and the CLIP worker, which a real camera scan needs; this script does not need them.
2. On the phone, open the app and tap **Explore Saalik**. The green banner at the top confirms the demo session.
3. Open the **Discover** tab. Under "Saalik Heritage", set the mode to **NTB VIP Demo**.
4. In the command center, untick **Spoken narration** if you will talk over the film.
5. Turn the phone's ringer on, so the voice narration is audible.

## The five minutes

| Time | Screen | Do | Say |
| --- | --- | --- | --- |
| 0:00 | Laptop, "NTB pitch film" | Press **Play 90-second film** and let scene 1 run, then pause. | "Most visitors see the same few squares. Kirtipur, Bungamati and Panauti stay quiet. Saalik is built to move attention, and guide income, outward." |
| 0:30 | Phone, **AI Monument Scanner** | Choose **Patan Durbar Square**, then **Krishna Mandir**, then **Run on-device scan**. | "On site, a visitor points the camera at a temple. Here I pick the temple from a library, because we are not standing in Patan, and the match runs on the phone with no signal. On photographs the system had never seen, the right monument came first 83 percent of the time and was in the top three 94 percent of the time." |
| 1:00 | Phone, monument story | Tap the top match. Press play on the **Voice Historian** bar, then tap **नेपाली**. | "Each of 101 monuments has a sixty-second story in English and Nepali. Every passage lists its sources. These are editorial drafts; the pilot's first month is for custodians to review them." |
| 1:40 | Phone, **Ask Saalik** | Tap **Ask Saalik**, then "What happened in the 2015 earthquake?" | "Follow-up questions are answered from the same sourced notes, not from an open-ended chatbot, so the app cannot invent history." |
| 2:10 | Phone, walk | Close the drawer. Tap **Build My 90-Min Heritage Walk**. | "From any scan, the app builds the shortest 90-minute route through the nearest monuments, counting walking time and time at each stop." |
| 2:40 | Phone, booking | Tap **Book Verified Local Storyteller**. Choose **Hidden Patan: Courtyards, Metalsmiths & a Newari Lunch** with Bishnu Maharjan, tap **Book now**, pick a date, tap **Confirm Booking**. | "The story ends with a licensed local guide. The walk is free, and the visitor tips what it was worth." |
| 3:10 | Phone, guide view | On the green banner, tap **Bishnu**. | "This is the guide's phone. The request is at the top of his list, marked as coming from a scan of Krishna Mandir. That is the link between a scan and a livelihood." |
| 3:30 | Laptop, "3D heritage twin" | Select **Patan Durbar Square** and **Krishna Mandir**. Drag the **Time (NPT)** slider from 07:00 to 16:00. | "This is how we plan the field photography. For a December morning it shows which of the five standard camera positions has the sun behind it, and which neighbouring monuments within 150 metres the system is most likely to confuse." |
| 4:10 | Laptop, "Policy ROI simulator" | Move **Satellite ward dispersion** up, then **Scan-to-guide conversion**. | "This is a planning model, not a forecast. It shows what a given level of dispersion and guide conversion would mean for the three towns and for guide income over 90 days." |
| 4:40 | Laptop, executive brief | Open `01_NTB_EXECUTIVE_BRIEF.md`. | "We are asking for a 90-day pilot at no cost to the Board: permission to photograph, an introduction to custodians and guides, and one point of contact. In return the Board receives a weekly dispersion report, the verified texts and coordinates, and a closing report." |

## If something goes wrong

- **The scan shows two close matches.** That is the tie-breaker. Read the question aloud and tap the right monument; it is part of the product.
- **No voice.** Check the ringer switch and volume. The Nepali voice needs a Nepali text-to-speech voice installed on the phone; if there is none, use English.
- **The booking does not appear for Bishnu.** Only bookings on Bishnu's own tours reach his dashboard. Book the tour named above, not one led by another guide.
- **The command center shows SEED_FALLBACK.** The API is not running. Everything on the page still works from the seeded data.

## Numbers to have ready

- 363 reference photographs, 68 monuments photographed, 10 more indexed from text only.
- Recall@1 1.000 on field-condition copies of the reference photographs with GPS. This is a robustness test, not a test on new photographs.
- Recall@1 0.828 and Recall@3 0.938 on 64 photographs held out of the index.
- 49.5 ms median processing time per photo on an Apple-silicon laptop.
- All coordinates are desk-research estimates and all texts are drafts until the pilot's first month is done.
