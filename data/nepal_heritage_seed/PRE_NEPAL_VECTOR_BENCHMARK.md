# Pre-Nepal visual vector benchmark

Model `openai/clip-vit-base-patch32` (512-d, L2-normalized) on Apple `mps`. Gallery photos are fused **0.85 image + 0.15 visual-cue text**, then orthogonalized against confusers inside 150 m. At query time the image is scored **0.88 visual cosine + 0.12 cosine of a 16-d softmax over a fixed attribute bank**. The query is never fused with its own monument text. 275 photos, 78 monuments indexed (10 zero-shot, no Commons photo).

## (a) Pure visual retrieval (no GPS)

### Scores

- Recall@1: **0.967**
- Recall@3: **0.993**
- MRR: **0.979**

| Query monument | Mistaken for | Times | Zones |
| --- | --- | --- | --- |
| Nyatapola Mandir | Harati Devi Mandir (Ajima) | 1 | bhaktapur_durbar → swayambhunath |
| Jagannath Mandir | Dattatreya Mandir | 1 | kathmandu_durbar → bhaktapur_durbar |
| Kumari Ghar | Gaddhi Baithak | 1 | kathmandu_durbar → kathmandu_durbar |
| Maju Dega | Kumbheshwar Mandir | 1 | kathmandu_durbar → patan_durbar |
| Stone Inscription of Pratap Malla | Pottery Square (Talako) | 1 | kathmandu_durbar → bhaktapur_durbar |
| Char Narayan Mandir | Taleju Bell | 1 | patan_durbar → kathmandu_durbar |
| Kumbheshwar Mandir | Harati Devi Mandir (Ajima) | 1 | patan_durbar → swayambhunath |
| Taleju Bell, Patan | Taleju Bell | 1 | patan_durbar → kathmandu_durbar |
| Vishwanath Mandir | Krishna Mandir | 1 | patan_durbar → patan_durbar |

## (b) Hybrid geo-visual retrieval

Simulated GPS is the true monument plus ±25 m of urban noise. Candidates farther than 150 m are dropped. That removes cross-zone swaps such as Kumbheshwar (Patan) versus Harati Ajima (Swayambhunath).

### Scores

- Recall@1: **0.993**
- Recall@3: **1.000**
- MRR: **0.996**

| Query monument | Mistaken for | Times | Zones |
| --- | --- | --- | --- |
| Kumari Ghar | Gaddhi Baithak | 1 | kathmandu_durbar → kathmandu_durbar |
| Vishwanath Mandir | Krishna Mandir | 1 | patan_durbar → patan_durbar |

## (c) Leave-one-photo-out hybrid geo-visual retrieval

For each of 64 monuments with at least two Commons photos, one real photo is the query and that file is removed from the index. No augmentation and no ground-truth text. GPS noise and the attribute re-ranker stay on.

### Scores

- Recall@1: **0.625**
- Recall@3: **0.844**
- MRR: **0.724**

| Query monument | Mistaken for | Times | Zones |
| --- | --- | --- | --- |
| Ajima Shrine, Boudha | Boudha Mahachaitya (Boudhanath Stupa) | 1 | boudhanath → boudhanath |
| 55-Window Palace | Vatsala Durga Mandir | 1 | bhaktapur_durbar → bhaktapur_durbar |
| Vatsala Durga Mandir | Nyatapola Mandir | 1 | bhaktapur_durbar → bhaktapur_durbar |
| Gaddhi Baithak | Taleju Bell | 1 | kathmandu_durbar → kathmandu_durbar |
| Hanuman Dhoka Palace | Kumari Ghar | 1 | kathmandu_durbar → kathmandu_durbar |
| Jagannath Mandir | Maju Dega | 1 | kathmandu_durbar → kathmandu_durbar |
| Kumari Ghar | Gaddhi Baithak | 1 | kathmandu_durbar → kathmandu_durbar |
| Taleju Bell | Maju Dega | 1 | kathmandu_durbar → kathmandu_durbar |
| Taleju Bhawani Temple | Taleju Bell | 1 | kathmandu_durbar → kathmandu_durbar |
| Arya Ghat | Pashupatinath Temple (Main Pagoda Courtyard) | 1 | pashupatinath → pashupatinath |
| Gorakhnath Shikhar Mandir | Arya Ghat | 1 | pashupatinath → pashupatinath |
| Pashupatinath Temple (Main Pagoda Courtyard) | Pandra Shivalaya | 1 | pashupatinath → pashupatinath |
| Panch Deval | Bachhareshwari Mandir | 1 | pashupatinath → pashupatinath |
| Pandra Shivalaya | Pashupatinath Temple (Main Pagoda Courtyard) | 1 | pashupatinath → pashupatinath |
| Bhimsen Mandir | Mani Dhara (Manga Hiti) | 1 | patan_durbar → patan_durbar |

## Zero-shot coverage

These monuments have no Commons photo. Their vector is the mean of four CLIP text prompts (roof, materials, guardians, disambiguation tip): Changu Narayan Satellite Trail, Prayer Wheel Arcade, Chini Lama Residence, Bone Chorten Gateways, Vasuki Nath Mandir, Vishwaroopa Courtyard, Vajra Dhatu Mandala, Nagarkot Viewpoint Stele, Dewa Dharma Monastery, Vasubandhu Chorten.
