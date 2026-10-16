# Arnhem sector, September 1944: settlements, roads, railways and woods

2026-10-16

**Status key:** **V** = verified (I read it in the cited source or fetched it from a live data source), **P** = provisional (inferred, read off a period map by eye, conflicting or secondary sources), **U** = unknown or not found.

**Coordinates** are decimal WGS84, good to about ±300 m.
- **[OSM]**: OpenStreetMap place nodes and features via Nominatim and Overpass, 2026-10-16. These are present-day positions; data (c) OpenStreetMap contributors, ODbL 1.0.
- **[TT]**: read by eye off the Kadaster Topotijdreis "1944" tiles, in RD New against a 1 km grid, then converted with the RD polynomials in `tools/map-builder/geo.ts`. Good to about ±200-300 m.
- **[AF]**: from `docs/research-arnhem/allied-forces.md` section 8, which converted them from GSGS 4427 grid references.

The Dutch Wikipedia pages were read through the MediaWiki API extracts (`https://nl.wikipedia.org/w/api.php?action=query&prop=extracts&titles=...`). The page URLs are given below.

**1947 census** (municipality totals, so each includes all its villages): the WFS layer `wonen:INWONERS_GEMEENTEN_NL_1947` at https://geodata.zuid-holland.nl/geoserver/wonen/wfs, listed at https://data.overheid.nl/dataset/32563-inwoners-per-gemeente-in-1947--nederland-. The licence is public domain (PDM 1.0). **V.**

| Municipality (1947) | Pop. | Area ha | Includes |
|---|---|---|---|
| Arnhem | 97,350 | 6,706 | City, Schaarsbergen, Malburgen. Not Elden, which stayed in Elst until 1966. |
| Renkum | 21,732 | 4,406 | Oosterbeek, Renkum, Heelsum, Doorwerth, Heveadorp, Wolfheze |
| Rheden | 30,749 | 7,826 | Velp, Rheden, De Steeg, Dieren, Ellecom |
| Ede | 42,618 | 33,277 | Ede, Bennekom, Lunteren, Otterlo, Deelen, Ginkel |
| Wageningen | 17,119 | 2,948 | |
| Heteren | 4,381 | 3,271 | Heteren, Driel, Randwijk |
| Elst | 10,269 | 5,335 | Elst, Elden, Lent |
| Westervoort | 2,662 | 682 | |
| Huissen | 6,625 | 1,728 | |
| Duiven | 4,364 | 3,446 | |
| Zevenaar | 8,073 | 2,866 | |
| Rozendaal | 1,495 | 2,829 | |
| Apeldoorn | 83,449 | 33,896 | Hoenderloo (part), Beekbergen |

Which village belongs to which municipality is general knowledge (P).

---

## 1. Built-up extent in 1944

### 1a. Arnhem as a whole

| Fact | Status | Source |
|---|---|---|
| 1849 population 18,049; rapid growth after 1850 | V | https://nl.wikipedia.org/wiki/Geschiedenis_van_Arnhem |
| About 95,000 residents were evacuated after the battle and could return only after eight months. Of about 25,000 homes, only about 200 were undamaged. The Eusebiuskerk was among the many historic buildings destroyed. | V | same |
| The "mistaken" bombing of 22 Feb 1944 killed 97 and hit the gasworks. Malburgen was among the districts hit. | V | same; https://nl.wikipedia.org/wiki/Malburgen_(wijk) |
| Railways: Utrecht line and the station 1845; Emmerich 1856; Zutphen 1865; Nijmegen 1879 | V | Geschiedenis van Arnhem |
| Malburgen, Presikhaaf and Bakenhof (in Arnhem from 1953) were built in the 1950s. Elden moved from Elst to Arnhem in 1966. | V | same |

**Approximate 1944 outline** (my synthesis from the 1:25,000 and 1:50,000 sheets [TT] and the district table; P):
- **South:** the Rhine, from the Praets/schipbrug to the IJssel mouth. The river front was gasworks, the slaughterhouse, the goods station and factories east of the old town.
- **West:** Heijenoord, Lombok, the St Elisabeth hospital and Transvaal, to about **5.876°E** at the Utrechtseweg. Beyond lay the Klingelbeek, Den Brink and Mariëndaal estates, open or wooded, then Oosterbeek about 2 km further west.
- **North:** Burgemeesterswijk and Hoogkamp (1930s), Sonsbeek park, Alteveer/Cranevelt (1930s) to about **52.003°N**. Above that were woods and heath (Warnsborn, Schaarsbergen).
- **East:** Klarendal, Geitenkamp (1920-30) and St Marten to about **5.94°E**. Presikhaaf was still an estate ("Geest Presikhaaf" on the sheet). Between Arnhem and Velp there was mostly ribbon building along the Velperweg.
- **South bank:** only the start of Malburgen (about 360 houses by 1940, more built during the war) around the south end of the bridge, at about 51.968-51.972, 5.903-5.916 [TT 1:50k red blocks]. Elsewhere were floodplain, brickworks and polder; Elden was a separate village.

### 1b. Arnhem districts

| District | 1944? | Build dates | lat, lon | Status | Source |
|---|---|---|---|---|---|
| Binnenstad (old town) | Yes; wrecked in Sept 1944 | Medieval; walls removed after 1808 | 51.980, 5.910 | V | https://nl.wikipedia.org/wiki/Klarendal (1808); Geschiedenis van Arnhem |
| Klarendal | Yes | From 1830; Mussenbuurt 1911 | 51.9900, 5.9228 | V | https://nl.wikipedia.org/wiki/Klarendal |
| Spijkerkwartier | Yes | Planned 1853, built mainly 1878-1889+ | 51.9820, 5.9191 | V | https://nl.wikipedia.org/wiki/Spijkerkwartier |
| Sint Marten | Yes | Built in seven years around 1900 | 51.9878, 5.9122 | V | https://nl.wikipedia.org/wiki/Sint_Marten_(Arnhem) |
| Geitenkamp | Yes | 1920-1930 garden village, about 2,000 homes; land bought 1917 | 52.0016, 5.9411 | V | https://nl.wikipedia.org/wiki/Geitenkamp_(Arnhem) |
| Alteveer / 't Cranevelt | Yes | 1930s | 52.0023, 5.9092 | V | https://nl.wikipedia.org/wiki/Alteveer_en_Cranevelt |
| Hoogkamp (in Burgemeesterswijk) | Yes | 1930s, with 1950s additions on its east, west and north sides; a pre-war tram ran to it | about 51.995, 5.885 (P; the nl.wiki coordinate is wrong) | V dates | https://nl.wikipedia.org/wiki/Hoogkamp |
| Burgemeesterswijk, Transvaal | Yes | Early 20th c. | about 51.990, 5.895 | P | not checked |
| Heijenoord / Lombok | Yes | Around 1900-1920s | 51.9870, 5.8858 [OSM] | P | not checked |
| Presikhaaf | **No** | City interested from the early 1930s; first houses 1949; shopping centre 1965; station 1969 | 51.9826, 5.9553 | V | https://nl.wikipedia.org/wiki/Presikhaaf |
| Monnikenhuizen | **No** | 1950s; Arnhemse Allee one-third 1950s, over half 1970s | 52.0011, 5.9308 | V | https://nl.wikipedia.org/wiki/Monnikenhuizen |
| Schaarsbergen | Village | Grew from about 1850 as a heath reclamation village; 750-1,250 inhabitants around 1880 | 52.0209, 5.8728 [OSM] | V | https://nl.wikipedia.org/wiki/Schaarsbergen |
| Malburgen | **Mostly no** | Plan 1927 for 18,000 households; building began 1937; about 360 houses by May 1940; slow building in the war; damaged 22 Feb 1944 and in the battle; the rest is post-war | 51.9665, 5.9092 (district) | V | https://nl.wikipedia.org/wiki/Malburgen_(wijk) |
| Immerloo, Het Duifje | No | Mid-1960s | – | V | https://nl.wikipedia.org/wiki/Arnhem-Zuid |
| Vredenburg / Kronenburg, Holthuizen | No | Late 1960s | – | V | Geschiedenis van Arnhem; Arnhem-Zuid |
| Elderveld | No | Early 1970s to mid-1980s | 51.9600, 5.8589 | V | https://nl.wikipedia.org/wiki/Elderveld |
| De Laar | No | After Elderveld (1980s) | – | P | Arnhem-Zuid |
| Rijkerswoerd | No | From 1989 | 51.9437, 5.8915 | V | https://nl.wikipedia.org/wiki/Rijkerswoerd |
| Schuytgraaf | No | From 2002 (VINEX) | about 51.955, 5.835 | V | Arnhem-Zuid |
| Elden | Separate village in Elst municipality; to Arnhem in 1966 | Old village; tram stop 1908-1920 | 51.9575, 5.8819 | V | https://nl.wikipedia.org/wiki/Elden_(Arnhem) |

### 1c. Villages and towns

The 1944 radius column is my estimate (P), read from the [TT] sheets: dense red or pink on the 1:25,000 sheet and red on the 1:50,000. A radius of 0 means a single-hex village.

| Place | lat, lon [OSM place node] | 1944 notes | Radius km (P) |
|---|---|---|---|
| **Oosterbeek** | 51.9884, 5.8420 (node); built-up centre about 51.986, 5.844 [TT] | Large villa village (Renkum municipality 21,732). Built up from about 5.825 to 5.857°E and from the river terrace (Benedendorpsweg, about 51.977) to just north of the Utrecht railway at Oosterbeek-Hoog station (about 51.996). Oosterbeek-Laag lies by the Arnhem-Nijmegen line. The Dreijen hamlet grew round the 1845 station [nl.wiki Station Oosterbeek]. | 0.8 |
| **Velp** | 51.9959, 5.9751 | Compact villa town on the Arnhem-Zutphen road and railway, about 1.7 × 1.5 km on the sheet [TT] | 0.6 |
| **Renkum** | 51.9751, 5.7336 | Village with paper mills and brickworks by the river; B Coy 1 Border there on 18 Sep [AF] | 0.3 |
| **Heelsum** | 51.9832, 5.7554 | Small village on the Utrechtseweg, just south of DZ X | 0 |
| **Doorwerth** | 51.9789, 5.8048 | Small village; the castle is at 51.9667, 5.7885 [OSM] by the river | 0 |
| **Heveadorp** | 51.9758, 5.8092 | Small model village (from a 1913 factory estate, P) in the Seelbeek valley, west of the Westerbouwing [nl.wiki Heveadorp] | 0 |
| **Wolfheze** | 52.0050, 5.7926 (station 52.0053, 5.7936) | Small village round the 1845 station (opened 16 May 1845), with the large psychiatric institution south and west of it. The old village of Oud-Wolfheze, about 1 km south, was abandoned long ago [nl.wiki Wolfheze]. | 0 |
| **Driel** | 51.9592, 5.8162 (village node; the church on Kerkstraat is about 51.962, 5.812) | Polder village, Heteren municipality | 0 |
| **Elden** | 51.9582, 5.8833 | Polder village, Elst municipality | 0 |
| **Westervoort** | 51.9627, 5.9673 | Small village (2,662) east of the IJssel bridges, with Fort Westervoort | 0 |
| **Schaarsbergen** | 52.0209, 5.8728 | Hamlet on the heath edge | 0 |
| **Deelen** | 52.0660, 5.8927 | Hamlet beside the Luftwaffe airfield | 0 |
| Ede | 52.0458, 5.6702 | Small town (municipality 42,618) with barracks; the station is south of the centre | 0.6 |
| Bennekom | 51.9980, 5.6759 | Village | 0.3 |
| Wageningen | 51.9686, 5.6683 | Small town with the agricultural college | 0.5 |
| Heteren, Randwijk | 51.9554, 5.7573; 51.9534, 5.7097 | Polder villages | 0 |
| Huissen | 51.9384, 5.9394 | Small walled town on the Rhine | 0.3 |
| Duiven, Zevenaar | 51.9496, 6.0246; 51.9357, 6.0789 | Village; small town (Zevenaar is just outside window A) | 0; 0.3 |
| Rozendaal, Rheden, De Steeg, Lathum | 52.0031, 5.9601; 52.0044, 6.0303; 52.0200, 6.0606; 51.9868, 6.0196 | Villages on the Velp-Dieren road and the IJssel | 0, 0.3, 0, 0 |
| Otterlo, Hoenderloo, Terlet, Woeste Hoeve | 52.1015, 5.7721; 52.1177, 5.8762; 52.0590, 5.9413; 52.1053, 5.9515 | Veluwe villages and road hamlets | 0 |
| Lunteren | 52.0865, 5.6191 | Village; outside window A (2 hexes west) | – |
| Elst | 51.9188, 5.8453 | In the Nijmegen map | – |

---

## 2. Roads in 1944

### 2a. Roads that existed

Coordinate chains are in `geography-1944.md`, "For map-config.json".

| Road | Fact | Status | Source |
|---|---|---|---|
| **Utrechtseweg** (TIGER): Wageningen-Renkum-Heelsum-Oosterbeek-Arnhem | Main road along the Veluwe ridge. 3 Para's route; Krafft stopped it at the Bilderberg woods on 17 Sep. The South Staffords and 11 Bn attacked along it on 18-19 Sep past the hospital and museum. OSM points: 51.9881, 5.8168; 51.9871, 5.8204 (Oosterbeek); Museum Arnhem 51.9855, 5.8922. | V (that it existed and was the route); alignment P | [AF] 4.2; https://www.historynet.com/operation-market-garden-2nd-battalion-of-the-south-staffordshire-regiment-defend-arhem-bridge/ (search extract) |
| **Benedendorpsweg - Klingelbeekseweg - Onderlangs - Rijnkade** (LION) | Lower river road: Heelsum → Doorwerth/Heveadorp → Oosterbeek church → under the railway at Oosterbeek-Laag → Klingelbeek → Onderlangs → Rijnkade → bridge ramp. OSM points: Benedendorpsweg 51.9787, 5.8320 / 5.8428; Klingelbeekseweg 51.9808, 5.8693 to 51.9828, 5.8769; Onderlangs 51.9839-51.9843, 5.8845-5.8921. | V (route); alignment P | [AF] 4.1; https://en.wikipedia.org/wiki/Battle_of_Arnhem |
| **Amsterdamseweg / Ede-Arnhem road** (LEOPARD) | Ede → across Ginkel Heath (DZ Y) → Planken Wambuis → past Johannahoeve and Lichtenbeek → Arnhem station. Clear on both [TT] sheets. It was rijksweg 24 in the 1932 plan (Renswoude-Wolfheze section only designed), dropped once the A12 was built. Today it is the N224. SS Wach Bn 3 came along it from Ede; KOSB A Coy ambushed lorries at Planken Wambuis on 17 Sep [AF]. OSM: 52.0021, 5.8590; 51.9958, 5.8721; 51.9854, 5.9019. | V (that it existed); P alignment west of Wolfheze | https://nl.wikipedia.org/wiki/Provinciale_weg_224 ; [AF] 3, 4.3 |
| **Dreijenseweg** | North-south lane from Oosterbeek-Hoog station to the Amsterdamseweg, through woods. The Spindler blocking line ran down it on the evening of 18 Sep [AF 4.4]. OSM: 51.9990-52.0027, 5.8442-5.8444. | V | [AF]; [OSM] |
| **Wolfhezerweg** | From Wolfheze north to the Amsterdamseweg (1 Para's route on 17 Sep) and south-east to the Utrechtseweg at the Bilderberg. OSM: 52.0166, 5.8030; 52.0190, 5.8072. | V (north part, [AF]); south part P | [AF] 3.1 |
| Heelsum-Wolfheze road | Links DZ X / LZ Z to Wolfheze | P | [TT] |
| **Arnhem-Apeldoorn road** (Apeldoornseweg) | Straight road north from Arnhem via Terlet and Woeste Hoeve to Beekbergen and Apeldoorn [TT 1:50k]. The 9th SS refit area lay towards Apeldoorn and Beekbergen. | P (alignment from the sheet) | [TT] |
| Arnhem-Schaarsbergen-Deelen | Local road north to the airfield | P | [TT] |
| **Arnhem-Velp-Rheden-De Steeg-Dieren** (to Zutphen) | Old main road along the foot of the Veluwe ridge (Velperweg), beside the Arnhem-Zutphen railway [TT] | P | [TT] |
| **Arnhem-Westervoort-Duiven-Zevenaar** | Main road east over the IJssel bridges at Westervoort, beside the Emmerich railway [TT] | P | [TT] |
| **Arnhem-Elst (south bank)** | The 1:50,000 sheet shows a main road running diagonally south-west from the south end of the Rijnbrug across the Malburgen polder, past Elden, then south to Elst. The 1:25,000 sheet predates the bridge and shows only the older Praets-Elden road and the "Stoomtram" line. The Nijmegen research notes the 1927 Rijkswegenplan bridge road, the unfinished Rijksweg 52 embankment near Aam, and the old road on the Griftdijk. | P (alignment) | [TT]; `docs/research/settlements-roads-1944.md` §2; https://nl.wikipedia.org/wiki/Provinciale_weg_325 |
| Praets-Elden road and steam tram | The older road from the schipbrug landing at the Praets south to Elden, with the steam tram alongside ("Stoomtram") [TT 1:25k] | P | [TT] |
| Driel dike roads | Ferry → Driel → Elden, and Driel → Heteren → Randwijk along the bandijk. Raised dike roads across wet polder. | P | [TT] |
| Ede-Bennekom-Wageningen, Ede-Otterlo, Otterlo-Hoenderloo-Apeldoorn | Secondary roads | P | [TT] |

### 2b. Modern roads that did not exist in 1944

| Road | Built / opened | Status | Source |
|---|---|---|---|
| **A12** Ede-Arnhem-Velperbroek-Zevenaar | Veenendaal-Planken Wambuis 1956; Planken Wambuis-Arnhem Noord 1957; Arnhem Noord (Apeldoornseweg)-Velperbroek 1961; Velperbroek-Zevenaar 1961 (one carriageway). The Germans ordered it extended north round Arnhem to Emmerich in 1940. Earthworks were far advanced when Speer stopped work in 1942. **The embankments existed in 1944; the road did not.** | V | https://nl.wikipedia.org/wiki/Rijksweg_12 |
| **A50** | Waterberg-Grijsoord (north of Arnhem) opened 29 May 1957, numbered A12 at first. The stretch south past Wolfheze and over the Rhine at Heteren came later; the Wolfheze article says the motorway has run there "since 1972". | V (1957); 1972 P | https://nl.wikipedia.org/wiki/Rijksweg_50 ; https://nl.wikipedia.org/wiki/Wolfheze |
| **A325 / N325 Pleijroute**, Andrej Sacharov bridge | Rijksweg 52 was begun in the war but unfinished. The bridge opened in 1987; the province took the road over in 1993. | V | https://nl.wikipedia.org/wiki/Provinciale_weg_325 |
| **Nelson Mandela bridge** (Roermondspleinbrug) and its approach roads (Eldenseweg; the Roermondsplein, Nieuwe Plein and Willemsplein rebuilds) | Decided 1965, built from 1974, opened 18 Dec 1977, renamed 1987 | V | https://nl.wikipedia.org/wiki/Nelson_Mandelabrug_(Arnhem) |
| N224 dual carriageway between the A12 and Arnhem | Post-war | V | Provinciale weg 224 |
| Arnhem-Zuid ring and district roads (Burgemeester Matsersingel etc.) | 1960s-2000s | P | – |

---

## 3. Railways in 1944

Map-config has no railway type. These lines matter for line-of-sight (embankments and cuttings) and for scenario text.

| Line | Facts | Points (lat, lon) | Status | Source |
|---|---|---|---|---|
| **Utrecht-Arnhem** (Rhijnspoorweg), double track | Ede-Arnhem opened May 1845. Stations at Ede, Wolfheze (opened 16 May 1845) and Oosterbeek (Hoog, in a cutting by an overbridge; its building was lost in 1944). The line north of the LZs was 1 Para and the Recce Sqn's axis. A German spur ran from Wolfheze to Deelen airfield during the war and was removed after liberation. | Ede station about 52.028, 5.670 (P); Wolfheze 52.0053, 5.7936; Oosterbeek 51.9950, 5.8394; Arnhem Centraal 51.9851, 5.9000 | V | https://nl.wikipedia.org/wiki/Station_Wolfheze ; https://nl.wikipedia.org/wiki/Station_Oosterbeek ; Geschiedenis van Arnhem |
| **Arnhem-Nijmegen** | Opened 1879. Leaves Arnhem westwards along the north bank, passes Oosterbeek-Laag station and the Benedendorpsweg viaduct (1875-78), crosses the Rhine on the Oosterbeek railway bridge, then runs straight south across the polder to Elst. The viaduct was blown in 1940 and repaired. | Oosterbeek-Laag about 51.980, 5.856 (P); bridge about 51.972, 5.856; line at about 5.854°E south to Elst station 51.9173, 5.8549 | V | https://nl.wikipedia.org/wiki/Spoorbrug_Oosterbeek ; https://www.europeremembers.com/pois/2190/the-railway-viaduct-during-the-battle-of-arnhem |
| **Arnhem-Zutphen** | Opened 1865, via Velp, Rheden, De Steeg and Dieren | Velp station 51.9950, 5.9810 [OSM] | V (date) | Geschiedenis van Arnhem |
| **Arnhem-Emmerich** | Opened 1856, over the IJssel at Westervoort, via Duiven and Zevenaar | IJssel bridge about 51.971, 5.957 [TT] | V (date) | Geschiedenis van Arnhem; https://www.bruggenstichting.nl/images/bruggen2002/dec-Evolutie.pdf |
| Ede-Lunteren (to Amersfoort or Barneveld) | Leaves Ede to the north | Lunteren station 52.0851, 5.6243 [OSM] | P | – |
| Steam tram Arnhem-Elden-Lent | Elden was a stop 1908-1920; still drawn on the 1937 sheet | – | V (dates); 1944 state U | https://nl.wikipedia.org/wiki/Elden_(Arnhem) |

### Stations

| Station | lat, lon | 1944 | Status |
|---|---|---|---|
| Arnhem (Centraal) | 51.9851, 5.9000 [OSM] | Open | V |
| Oosterbeek (Hoog) | 51.9950, 5.8394 | Open; building lost in 1944, rebuilt after liberation, demolished 1972 | V |
| Oosterbeek-Laag | about 51.980, 5.856 | Arnhem-Nijmegen line; 2 Para fought nearby on 17 Sep [Liberation Route Boterdijk] | P position |
| Wolfheze | 52.0053, 5.7936 | Open; Deelen spur | V |
| Velp | 51.9950, 5.9810 [OSM] | Open | P |
| Arnhem Velperpoort | 51.985, 5.920 [OSM] | U whether it existed in 1944 | U |
| Arnhem Zuid, Arnhem Presikhaaf | – | **Did not exist** (opened 2004 and 1969) | V |

---

## 4. Woods, heath and polders

| Area | 1944 condition | Status | Source |
|---|---|---|---|
| **Ginkelse Heide** (DZ Y) | Heath mixed with wood, east of Ede, divided from the Ederheide by the Verlengde Arnhemseweg (N224). 17-18 Sep landings and fighting; the memorial is at 52.0369, 5.7341 [OSM]. Still heath with a sheep flock today. | V | https://nl.wikipedia.org/wiki/Ginkelse_Heide ; https://www.europeremembers.com/pois/705/airborne-landings-on-the-ginkel-heath |
| **Renkumse Heide** (DZ X / LZ X) and the Wolfheze heath (LZ Z) | Heath and arable land between Heelsum and Wolfheze [TT 1:50k pink]. Now cut by the A12 and A50 and partly wooded. OSM nature reserve 52.0068, 5.7546. | P | [TT] |
| **Reijers-Camp** (LZ S) | Reclaimed fields ("Rojers Camp") north of the railway | P | [TT]; [OSM] 52.0156, 5.7889 |
| **Johannahoeve** (LZ L) | Farmland between the railway and the Amsterdamseweg | P | [TT] |
| Oosterbeek and Doorwerth estates: Doorwerthsche Bosch, Zilverenberg, Hemelse Berg, Bilderberg, Mariëndaal, Lichtenbeek, Warnsborn | Mixed estate woods with villas and parks, on the steep ridge | P | [TT] |
| North of Arnhem: Schaarsbergen woods, Arnhemsche Heide, Terletsche Veld, Deelensche Zand, Rozendaalsche Veld | Wide heaths and drift sand with blocks of pine. Deelen airfield (1940-44) was built on them. | P | [TT 1:50k] |
| Velp-Rheden ridge (Beekhuizen, Rozendaal, Worth-Rheden, Tafelberg 103 m) | Woods and heath | P | [TT]; [OSM] peaks |
| De Hoge Veluwe (Otterlo-Hoenderloo) | Heath, drift sand and wood; the Kröller-Müller estate | P | [TT] |
| **Betuwe** polders (Driel, Elden, Malburgen, Huissen; the Eldensche and Malburgsche polders) | Grassland and orchards, with brickworks along the river and floodplain meadows (Meinerswijk, the Stadswaarden). Dense ditches; roads on dikes. | P | [TT]; Nijmegen research ("nearly impassable for tanks") |

---

## 5. Post-war changes a modern OSM map would get wrong

| Change | Date | Status | Source |
|---|---|---|---|
| Nelson Mandela bridge | 18 Dec 1977 | V | Nelson Mandelabrug (Arnhem) |
| John Frost bridge | **Same site.** Destroyed 7 Oct 1944; rebuilt and open to traffic from 1950 (infobox also says 1949). Renamed 17 Dec 1977 (en.wiki) or 16 Sep 1978 (nl.wiki). | V (1950); rename date conflict | https://nl.wikipedia.org/wiki/John_Frostbrug ; https://en.wikipedia.org/wiki/John_Frost_Bridge |
| Oosterbeek railway bridge | Same alignment; temporary bridge after the war, permanent bridge 1952, deck replaced 2004 | V | Spoorbrug Oosterbeek |
| Andrej Sacharov bridge and N325 | 1987 | V | Provinciale weg 325 |
| A12 (with its IJssel bridge) | 1956-1962 | V | Rijksweg 12 |
| A50 | 1957 (north), about 1972 (south via Heteren) | V / P | Rijksweg 50; Wolfheze |
| Driel weir and locks | About 1970 | P | nl.wiki Westerbouwing (exists today) |
| Arnhem-Zuid: Malburgen (beyond the 1937-44 nucleus), Immerloo, Vredenburg, Elderveld, De Laar, Rijkerswoerd, Schuytgraaf; GelreDome | 1950s-2000s | V | 1b |
| Presikhaaf, Monnikenhuizen, Arnhemse Allee, the 1950s additions at Hoogkamp | 1949-1970s | V | 1b |
| Rijkerswoerdse Plassen (sand pits) | From the late 1970s | V | https://nl.wikipedia.org/wiki/Rijkerswoerd |
| Floodplain pits and channels in Meinerswijk, Stadsblokken and Malburgen | Post-war | P | – |
| Growth of Ede, Wageningen, Bennekom, Velp, Oosterbeek-Noord, Driel, Westervoort, Duiven | Post-war; extents U | P | – |
| Heath turned to wood (Renkum heath, north Arnhem heaths) | Gradual | P | [TT] vs OSM |
| Papendal national sports centre (Schaarsbergen) | Post-war | P | https://nl.wikipedia.org/wiki/Schaarsbergen |
| Deelen: today's runway 01-19 (2,400 m) and the post-1945 RNLAF base | The German Fliegerhorst existed in 1944; the details differ | P | https://nl.wikipedia.org/wiki/Vliegbasis_Deelen |
| Stations Arnhem Zuid (2004) and Arnhem Presikhaaf (1969) | Post-war | V | 3 |

---

## 6. Main open items

1. **1944 alignment of the Arnhem-Elst road** across the Malburgen polder. Check GSGS 4427 sheet 6 NW or a 1944 RAF photo. The 1:25,000 Topotijdreis sheet predates the 1935 bridge.
2. **Exact 1944 western edge of Arnhem** (Heijenoord, Lombok, Klingelbeek) and northern edge (Hoogkamp). The dates for Burgemeesterswijk, Transvaal and Heijenoord were not checked.
3. **Village sizes around 1944** (only 1947 municipality totals are known). The 1947 census volumes give figures by kern.
4. **Malburgen in Sept 1944:** how many houses had been added after 1940?
5. **Wolfheze asylum layout** and the effect of the 17 Sep bombing.
6. The **German A12 embankment**: its exact line in 1944 across Ginkel, Renkum heath, Schaarsbergen and north Arnhem.
7. **Velperpoort station** in 1944, and whether the Arnhem-Elden-Lent tram still ran.
8. Ede and Lunteren station positions and the Ede-Lunteren line.
