# Nijmegen sector, September 1944: geography research (PARTIAL)

Status: **PARTIAL.** All coordinates below come from OpenStreetMap, pulled through Nominatim and Overpass on 2026-10-16. They were converted to RD New (EPSG:28992) with the standard RD/WGS84 approximation polynomials (Schreutelkamp and Strang van Hees), which are accurate to about 1 m. Each lat/lon is the position of the **present-day** feature in OSM.

The historical notes (status in 1944, what is post-war) are marked **provisional**. They come from general knowledge and have not yet been checked against the sources in section 5. The deeper web research on crossings, the timeline, map licences and 1944 extents had not come back when this file was written. It is still to be merged.

Confidence tags:
- **verified**: checked against a live data source in this session.
- **provisional**: believed correct, but no citation yet.
- **unknown**: could not be determined.

Coordinate data: (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). This licence string comes back in every Nominatim response. **verified**

---

## 0. Bounding box check (verified)

| Corner | RD x | RD y | lat | lon |
|---|---|---|---|---|
| SW | 172000 | 413000 | 51.70550 | 5.63314 |
| SE | 200000 | 413000 | 51.70395 | 6.03820 |
| NW | 172000 | 437000 | 51.92122 | 5.63433 |
| NE | 200000 | 437000 | 51.91966 | 6.04133 |
| centre | 186000 | 425000 | 51.81276 | 5.83675 |

How well the box covers the named places (RD values from OSM place nodes):

- **Grave**, RD (179434, 419055), and the Grave bridge, about (179080, 420100): **inside**, about 7 km from the west edge. The strip from x 172000 to 177000 mostly holds Ravenstein, Herpen and Batenburg, so it could be trimmed.
- **Mook** (189319, 418326), Molenhoek, Plasmolen, Riethorst, Middelaar and Milsbeek (193882, 415220): **inside**.
- **Gennep** (195226, 412662): **OUTSIDE**, about 0.3 km south of y = 413000. Ottersum (196144, 412809) and the Niers mouth are also just outside.
- **Reichswald**: only the western edge is inside. That edge runs from about x 195000 to 198500 (Brandenberg 90 m at 197866, Lentsenberg 85 m at 198356). The main forest and its high ground lie at x 200000–203500, which is **outside**: Geldenberg 89 m (201026), Stoppelberg 92 m (202474), Rupenberg 96 m (203381).
- **Kranenburg** (197792, 422505), **Wyler** (194864, 424591) and **Zyfflich** (195439, 426259): **inside**.
- **Lent** (188050, 430765) and **Oosterhout** (185284, 432480): **inside**.
- **Elst** (186512, 436800): **just inside**, 0.2 km from the north edge. Part of the town extends north of y = 437000.

**Suggested box** if you want Gennep, the Niers and the Reichswald heights, with Elst fully inside: x 174000–204000, y 411000–438000. That is 30 x 27 km, roughly 800 hexes of 1 km.

---

## 1. Rivers, canals and crossings

### 1a. Crossing sites

Positions are from OSM and are **verified** for the present-day structure. The 1944 status is **provisional** unless marked otherwise.

| Crossing | Type | lat, lon | RD x, y | Status 17–20 Sep 1944 (provisional) |
|---|---|---|---|---|
| Grave bridge over the Maas (today "John S. Thompsonbrug", N324) | road | 51.7691, 5.7361 | 179081, 420104 | Captured intact 17 Sep by E Coy, 2/504 PIR (Lt John S. Thompson). XXX Corps linked up here on the morning of 19 Sep. **unknown** whether today's span is the original 1929 structure. |
| Heumen lock and bridge, at the south end of the Maas–Waal Canal | lock + road bridge | 51.7694, 5.8514 | 187042, 420187 | Captured intact 17 Sep. On 19 Sep it was the route XXX Corps used to reach Nijmegen. |
| Malden bridge (Maldensebrug, Blankenbergseweg) | road | 51.7846, 5.8406 | 186288, 421867 | Blown by the Germans 17 Sep. |
| Hatert bridge (Hatertsebrug) | road | 51.8063, 5.8161 | 184582, 424271 | Blown 17/18 Sep. |
| Dukenburgsebrug | road | 51.8176, 5.8116 | 184261, 425522 | **unknown** whether it existed in 1944. Possibly post-war: the Dukenburg district dates from 1966 onwards. |
| Honinghutje bridge (today Graafsebrug, Graafseweg / N326) | road | 51.8261, 5.8082 | 184020, 426469 | Damaged (partly blown) and not used by tanks on 19 Sep. Captured 18–19 Sep. Details **unknown**. |
| Rail bridge beside Honinghutje (today "Spoorbrug Dukenburg", Nijmegen–Den Bosch line) | rail | 51.8256, 5.8084 | 184034, 426417 | **unknown** |
| Neerbosschebrug | road | 51.8375, 5.8093 | 184093, 427741 | **unknown** whether it existed in 1944. |
| Weurt locks, where the canal meets the Waal | lock | 51.8536, 5.8221 | 184974, 429640 | The canal had a Waal lock at Weurt from 1927. Its status in 1944 is **unknown**, and the present lock complex is a later rebuild (provisional). |
| Nijmegen Waal road bridge (Waalbrug, opened 1936) | road | 51.8537, 5.8700 (main span) | 188265, 429560 | Intact and prepared for demolition. Grenadier Guards tanks crossed at about 19:10 on 20 Sep. |
| Nijmegen Waal rail bridge (Spoorbrug, 1879) | rail | 51.8539, 5.8575 | 187403, 429581 | Intact. 3/504 PIR took the north end on 20 Sep. |
| Mook–Cuijk rail bridge over the Maas (Nijmegen–Venlo line) | rail | 51.7554, 5.8708 | 188391, 418633 | Status in Sep 1944 is **unknown**. It may have been blown in 1940 or in 1944. |
| Gennep rail bridge over the Maas (Boxtel–Wesel "Duitse Lijntje") | rail | about 51.70, 5.95 (outside the box) | – | A German armoured train crossed it on 10 May 1940. Status in 1944 is **unknown**. |
| Ferries on the Maas (Mook/Katwijk, Linden) and the Waal (Ooij/Erlecom, Haalderen, Nijmegen) | ferry | – | – | **unknown**. Not confirmed. |

These crossings did **NOT** exist in 1944. A map built from modern OSM would wrongly include them:
- A73 "Maasbrug bij Heumen" (51.7600, 5.8381)
- De Oversteek road bridge, 2013 (51.8591, 5.8420)
- A50 Tacitusbrug at Ewijk (51.885, 5.737)
- De Maasover footbridge at Mook (51.7553, 5.8710)
- the Spiegelwaal bridges De Lentloper and Zaligebrug
- the Snelbinder cycle bridge on the rail bridge

### 1b. Watercourses (provisional)

- **Waal**: the main river along the north side of Nijmegen.
  - The **Spiegelwaal** side channel and the island Veur-Lent (about 51.855–51.862 N, 5.84–5.87 E) were dug in 2013–2015 under the "Room for the Waal" project.
  - In 1944 this ground was dike and flood-plain meadow at Lent. Leave it out of a 1944 map.
- **Maas**: flows from Grave east past Nederasselt, Overasselt, Linden and Katwijk to Mook, then south past Middelaar and Milsbeek to Gennep.
  - Some bends were cut off during the 1930s Maas normalisation. One example is the Oude Maas at Overlangel (51.773, 5.684).
- **Maas–Waal Canal**: opened 1927. Runs from Heumen lock (51.769, 5.851) to Weurt (51.854, 5.822). The positions are **verified**; the opening date is **provisional**.
- **Oude Waal**: an old river arm in the Ooijpolder (51.854, 5.895).
- **Niers**: joins the Maas at Gennep, just outside the box.
- **Wetering / Linge near Elst** and the **Ooijpolder streams**: **unknown**. Not yet researched.

---

## 2. Settlements

Centres are OSM place nodes (**verified**). The 1944 extents are **provisional** estimates.

| Place | lat, lon | RD x, y | 1944 notes (provisional) |
|---|---|---|---|
| Nijmegen (centre) | 51.8475, 5.8638 | 187838, 428876 | City of about 90,000. Districts are listed below. |
| Grave | 51.7597, 5.7411 | 179434, 419055 | Small fortified town, radius about 0.6 km. |
| Groesbeek | 51.7741, 5.9305 | 192499, 420743 | Large village, radius about 1 km. |
| Mook | 51.7526, 5.8842 | 189319, 418326 | Village, radius about 0.4 km. |
| Molenhoek | 51.7663, 5.8716 | 188438, 419846 | Small. Most of today's housing is post-war. |
| Malden | 51.7802, 5.8539 | 187207, 421387 | Village, radius about 0.5 km. Today's size is post-war. |
| Heumen | 51.7654, 5.8442 | 186549, 419732 | Small village, radius about 0.3 km. |
| Overasselt | 51.7610, 5.7891 | 182747, 419222 | Small village. |
| Nederasselt | 51.7734, 5.7469 | 179825, 420584 | Small village. |
| Wijchen | 51.8072, 5.7262 | 178377, 424336 | Village, radius about 0.6 km. Mostly post-war today. |
| Alverna | 51.8035, 5.7562 | 180449, 423938 | Hamlet on the Grave–Nijmegen road. |
| Beek | 51.8289, 5.9246 | 192046, 426833 | Village strung along the Nijmegen–Kleve road. |
| Berg en Dal | 51.8260, 5.9093 | 190995, 426510 | Villa and hotel settlement on the ridge. |
| Heilig Landstichting | 51.8171, 5.8917 | 189785, 425509 | Small. |
| Ubbergen | 51.8368, 5.9009 | 190405, 427704 | Hamlet. |
| Ooij | 51.8544, 5.9390 | 193012, 429684 | Polder village. |
| Persingen | 51.8413, 5.9184 | 191605, 428211 | Polder hamlet. |
| Erlecom | 51.8488, 5.9634 | 194703, 429069 | Polder hamlet. |
| Leuth | 51.8382, 5.9935 | 196783, 427908 | Polder village. |
| Kekerdom | 51.8645, 6.0091 | 197834, 430846 | Polder village. |
| Lent | 51.8645, 5.8670 | 188050, 430765 | Small dike village. The Waalsprong expansion (about 1998 onwards) is post-war. |
| Oosterhout | 51.8800, 5.8270 | 185284, 432480 | Small dike village. |
| Ressen | 51.8910, 5.8681 | 188102, 433721 | Hamlet. |
| Elst | 51.9188, 5.8453 | 186512, 436800 | Village, radius about 0.5 km. |
| Bemmel | 51.8915, 5.8985 | 190195, 433792 | Village. |
| Haalderen | 51.8865, 5.9266 | 192131, 433243 | Village. |
| Weurt | 51.8583, 5.8154 | 184496, 430056 | Village. |
| Beuningen | 51.8587, 5.7674 | 181188, 430079 | Village. |
| Kranenburg (Germany) | 51.7896, 6.0074 | 197792, 422505 | Small town, radius about 0.4 km. |
| Wyler (Germany in 1944) | 51.8085, 5.9652 | 194864, 424591 | Hamlet. Under Dutch administration 1949–1963 (provisional). |
| Zyfflich (Germany) | 51.8235, 5.9738 | 195439, 426259 | Hamlet. |
| Niel (Germany) | 51.8263, 6.0189 | 198550, 426600 | Hamlet. |
| Frasselt (Germany) | 51.7706, 6.0232 | 198897, 420402 | Hamlet. |
| Gennep | 51.7013, 5.9691 | 195226, 412662 | Small town. Just outside the box. |
| Ottersum | 51.7025, 5.9824 | 196144, 412809 | Village. Just outside the box. |
| Milsbeek | 51.7244, 5.9500 | 193882, 415220 | Village. |
| Middelaar | 51.7240, 5.9156 | 191511, 415166 | Village. |
| Plasmolen | 51.7372, 5.9224 | 191966, 416638 | Hamlet. |
| Riethorst | 51.7358, 5.9175 | 191633, 416480 | Hamlet. |
| Breedeweg | 51.7586, 5.9429 | 193365, 419030 | Hamlet. |
| De Horst | 51.7744, 5.9700 | 195220, 420795 | Hamlet. |
| Grafwegen | 51.7520, 5.9429 | 193374, 418288 | Border hamlet. |
| Den Heuvel (Wylerbaan) | 51.7960, 5.9571 | 194312, 423188 | Hamlet. Position is approximate, taken from a campsite and shop of that name. |
| De Ploeg | 51.7701, 5.9475 | 193673, 420311 | Position is a modern street. **unknown** whether it was a 1944 locality. |
| Kiekberg (hill and hamlet) | 51.7466, 5.9195 | 191762, 417674 | Hill, 79 m. |
| Cuijk | 51.7299, 5.8801 | 189048, 415805 | Town on the west bank. |
| Katwijk | 51.7506, 5.8728 | 188530, 418105 | Hamlet on the west bank of the Maas. |
| Linden | 51.7485, 5.8282 | 185451, 417849 | Hamlet on the west bank of the Maas. |
| Ravenstein | 51.7970, 5.6516 | 173235, 423184 | Small fortified town. |

### Nijmegen districts

Positions are OSM quarter nodes (**verified**). Their 1944 classification is **provisional**.

**Built up by 1944**
- Benedenstad (51.8488, 5.8651)
- Stadscentrum (51.8445, 5.8621)
- Bottendaal (51.8383, 5.8568)
- Altrade (51.8389, 5.8722)
- Hunnerberg (51.8409, 5.8836)
- Galgenveld (51.8341, 5.8653)
- Biezen (51.8492, 5.8466)
- Wolfskuil (51.8394, 5.8439)
- Nije Veld (51.8332, 5.8454)
- Hazenkamp (51.8273, 5.8470)
- Heijendaal (51.8231, 5.8634)
- Groenewoud (51.8214, 5.8787)
- Hengstdal (51.8333, 5.8817)

**Partly built by 1944**
- Goffert (51.8204, 5.8251)
- Sint Anna (51.8224, 5.8507)

**Separate villages in 1944**
- Hees (51.8423, 5.8304)
- Neerbosch (roughly 51.832–51.842, 5.795–5.815)
- Hatert (51.8071, 5.8263)
- Brakkenstein (51.8132, 5.8652), small

**Post-war**
- Dukenburg (51.8090, 5.8013) and its quarters: Tolhuis, Zwanenveld, Meijhorst, Aldenhof, Malvert, Lankforst, Weezenhof, Staddijk
- Lindenholt (51.8332, 5.7867)
- Grootstal (51.8111, 5.8430)
- Hatertse Hei
- Nijmegen-Noord / Waalsprong (51.8728, 5.8575)

---

## 3. Roads and railways (provisional)

### Roads that existed in 1944

- **Grave–Nijmegen**: Grave bridge, then Alverna, then the Graafseweg over the Honinghutje canal bridge into Nijmegen-West.
  - Because Honinghutje was damaged, XXX Corps went round via Overasselt, the Heumen lock bridge and Malden.
- **Nijmegen–Malden–Molenhoek–Mook–Plasmolen–Middelaar–Gennep**: the Rijksweg along the east bank of the Maas.
- **Nijmegen–Groesbeek**: Groesbeekseweg and Nijmeegsebaan. Also the **Groesbeek–Mook** road.
- **Nijmegen–Beek–Wyler–Kranenburg–Kleve**: the Rijksstraatweg.
- **Nijmegen–Ooij**.
- **Nijmegen–Lent–Elst–Arnhem**: the raised road across "the island".
- **Nijmegen–Wijchen–Ravenstein**.

### Roads that did NOT exist in 1944

- the A73, A50 and A325 motorways
- the A15
- the A326 and N325 in their dual-carriageway form
- De Oversteek (2013)

### Railways in 1944

Station positions are from OSM and are **verified** for the modern or old sites.

- **Nijmegen station**: 51.8431, 5.8531.
- **Nijmegen–Arnhem**: over the Waal rail bridge to Elst (51.9173, 5.8549).
- **Nijmegen–Kleve**: via Groesbeek and Kranenburg.
  - The old Groesbeek station site is now the start of the Grenzland-Draisine rail-bike line, at 51.7778, 5.9346.
  - Kranenburg station: 51.7861, 6.0068.
- **Nijmegen–Venlo**: via Mook-Molenhoek (51.7665, 5.8790), then over the Maas to Cuijk (51.7266, 5.8742).
- **Nijmegen–Den Bosch**: via Wijchen (51.8112, 5.7298) and Ravenstein (51.7948, 5.6377).
- **Post-war stations**, which should be left off a 1944 map: Nijmegen Dukenburg, Nijmegen Goffert, Nijmegen Heyendaal and Nijmegen Lent.

---

## 4. High ground, woods and low ground

### Spot heights

These are OSM natural=peak nodes (**verified** as OSM values). They are modern survey heights in metres above NAP.

| Peak | Height (m) | lat, lon |
|---|---|---|
| Preekstoel (Berg en Dal) | 94.9 | 51.8117, 5.9216 |
| Flierenberg | 93.4 | 51.8038, 5.9219 |
| Muntberg | 92.1 | 51.7943, 5.9028 |
| Hanenberg | 91.8 | 51.8249, 5.9153 |
| Meiberg | 87 | 51.8102, 5.9118 |
| Galgenberg | 86.5 | 51.8247, 5.9069 |
| Zonnenheuvel | 81.8 | 51.8285, 5.9055 |
| Kwakkenberg | 81.5 | 51.8295, 5.8975 |
| Hooge Hoenderberg | 81.1 | 51.7803, 5.9017 |
| Kiekberg | 79 | 51.7466, 5.9195 |
| Wolfsberg | 78 | 51.7704, 5.9056 |
| Papenberg | 75 | 51.7549, 5.9103 |
| Duivelsberg (Wylerberg) | 73.6 | 51.8194, 5.9461 |
| Sint-Maartensberg | 66.1 | 51.7412, 5.9325 |
| Kops Plateau | 63.1 | 51.8372, 5.8947 |
| Sint-Jansberg | 59 | 51.7393, 5.9275 |
| Hunnerberg | 54.5 | 51.8389, 5.8849 |
| Valkhof (Hofberg) | 34.5 | 51.8478, 5.8703 |
| Brandenberg (Reichswald) | 90 | 51.7681, 6.0082 |
| Lentsenberg (Reichswald) | 85 | 51.7578, 6.0152 |
| Stoppelberg (Reichswald, outside the box) | 92 | 51.7704, 6.0750 |
| Rupenberg (Reichswald, outside the box) | 96 | 51.7715, 6.0882 |

The **Teufelsberg** does not appear in OSM under that name. It is probably the German name for the Duivelsberg/Wylerberg (provisional). There is no data yet for **De Hel**.

### Woods and heath (provisional)

- Heumensoord (51.7976, 5.8663)
- Mookerheide (51.758, 5.889). Probably more open heath in 1944 than today.
- Sint-Jansberg (51.744, 5.921)
- the woods around Groesbeek and Berg en Dal
- the Reichswald

How the 1944 heath/wood boundaries ran is **unknown** and still needs checking against period maps.

### Low ground (provisional)

- the Ooijpolder and the Duffelt
- the Betuwe north of the Waal: meadows and orchards
- the Maas flood plains at Grave, Overasselt and Mook

### Lakes that a modern OSM map would show wrongly

All of these are probably post-war sand, gravel or clay pits. This is **provisional** and the dates still need confirming.

- Mookerplas (51.7310, 5.9233)
- Kraaijenbergse Plassen (51.7393, 5.8227)
- "Plas 1–8" between Linden and Heumen (51.745–51.753, 5.79–5.85)
- Heeswijkse Plas (51.7452, 5.8537)
- Berendonck (51.8092, 5.7772)
- Wijchens Meer (51.7971, 5.7362)
- Wylermeer and Wylerbergmeer (51.818–51.826, 5.944–5.956)
- Lentse, Oosterhoutse and Zandse plassen (51.875–51.880, 5.855–5.872)
- Weurtse Grindgat (51.8645, 5.8178)
- Eisenhowerplas (51.9097, 5.8669)
- Groene Heuvels (51.847, 5.691)
- Leemgroeve Biessael, a former clay pit (51.7662, 5.9047)
- the Spiegelwaal channel (2015)

The Hatertse and Wijchense vennen (51.78–51.80, 5.79–5.81) are probably natural fens that existed before the war.

---

## 5. Map and elevation sources

| Source | Licence | Status |
|---|---|---|
| OpenStreetMap | ODbL 1.0, attribution "(c) OpenStreetMap contributors" | **verified** |
| SRTM 1 arc-second elevation (NASA/USGS) | public domain | **provisional** |
| AHN Dutch elevation (via PDOK) | CC0 | **provisional**. It shows modern terrain, so quarry lakes and embankments appear. |
| NRW DGM1 elevation (Reichswald part) | dl-de/zero-2-0 | **provisional** |
| Kadaster Topotijdreis (https://www.topotijdreis.nl), 1940s layers | – | Tile endpoint and licence **unknown** |
| GSGS 4427 / AMS 1:25,000 sheets (McMaster, NLS, UT PCL) | – | Sheet numbers and licences **unknown** |
| Bonnebladen 1:25,000 | – | **unknown** |

---

## 6. Timeline, 19–20 Sep 1944 (provisional)

**19 Sep**
- About 08:30: Guards Armoured links up with the 82nd Airborne at the Grave bridge (51.7691, 5.7361), then drives via the Heumen lock (51.7694, 5.8514) and Malden to Nijmegen.
- Afternoon and evening: Grenadier Guards and 2/505 PIR attack towards the bridges through Keizer Karelplein (51.8421, 5.8602), Hunner Park (51.8471, 5.8721) and the Valkhof (about 51.848, 5.870). They are held short of the road bridge.
- **unknown**: the location of the post office linked to the rumoured demolition control.

**20 Sep**
- About 15:00: 3/504 PIR (Maj Julian Cook) crosses the Waal in canvas boats.
  - They launch from Nijmegen-West, downstream (west) of the rail bridge, near the PGEM power station and the canal mouth. The exact launch point is **unknown**.
  - Do not use the modern "Centrale Gelderland" site (51.857, 5.835) as the launch point; it is not confirmed to be the same plant.
- They land on the north bank between Oosterhout and Lent. They then take Fort Hof van Holland (51.8621, 5.8522) and the north ends of the rail bridge and then the road bridge.
- About 19:10: Grenadier Guards tanks (Sgt Peter Robinson's troop) cross the road bridge.
- Same day, German counter-attacks on the Groesbeek heights:
  - Mook and Riethorst (51.736–51.753, 5.88–5.92), against the 505th.
  - Wyler, Den Heuvel and Beek (51.796–51.829, 5.92–5.97), against the 508th. Beek is lost and retaken.

---

## Open items: still need citations

- Every 1944 status marked provisional above.
- Honinghutje and Hatert bridge details, and the time each was blown.
- Whether bridges existed at Dukenburg and Neerbosch in 1944.
- Ferries, and the state of the Mook–Cuijk and Gennep rail bridges.
- The exact Waal crossing launch and landing points.
- The 1944 boundaries between heath and wood.
- When each quarry lake was dug.
- The endpoint and licence for each historical map source.
