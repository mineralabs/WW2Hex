# Arnhem sector, 17-18 September 1944: geography research

2026-10-16

**Status key:** **V** = verified (I read it in the cited source or fetched it from a live data source in this session), **P** = provisional (inferred, read off a period map by eye, conflicting, or from secondary sources), **U** = unknown or not found.

**Coordinates** are decimal WGS84, good to about ±300 m unless stated.
- Points marked [OSM] come from OpenStreetMap through Nominatim and Overpass on 2026-10-16 and give the position of the **present-day** feature. Data (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
- Points marked [TT] I read off the Kadaster Topotijdreis "1944" tiles (section 7). I measured them in RD New (EPSG:28992) against a 1 km grid I drew on the tiles, then converted them with the RD polynomials in `tools/map-builder/geo.ts`. Treat them as ±200-300 m.
- Points marked [AF] are taken from the sibling file `docs/research-arnhem/allied-forces.md` section 8. That file converted them from the war-diary grid references on GSGS 4427.
- Elevations marked [EU-DEM] come from OpenTopoData's `eudem25m` dataset (https://api.opentopodata.org/v1/eudem25m), which is modern terrain.

Companion file: `settlements-roads-1944.md` (built-up extents, roads, railways, woods, post-war changes in detail).

---

## 0. Map extent

### 0a. Recommended window (A): directly north of the Nijmegen map

`"grid": { "grid": "europe-laea-1km", "col": 2023, "row": 2728, "cols": 30, "rows": 32 }`

This uses the same 30 columns as the Nijmegen map (col 2023-2052) and ends one row above it (rows 2728-2759; Nijmegen starts at row 2760). The row is even, as `windowGrid` requires.

| Corner (outer hex edge) | lat, lon |
|---|---|
| NW | 52.1718, 5.6339 |
| NE | 52.1873, 6.0792 |
| SW | 51.9206, 5.6583 |
| SE | 51.9361, 6.1011 |
| centre (hex [15,16]) | 52.0504, 5.8721 |

I computed this with the LAEA formulas from `tools/map-builder/geo.ts`. The size is 30 km wide and about 27.7 km tall, because rows are 866 m apart. **V** for the arithmetic: I recomputed the Nijmegen window the same way, and its NW corner (51.923, 5.658) and centre match `map.geo` in `scenarios/nijmegen-1944/source/map.generated.json`.

Europe-grid hexes of the key places (global [col,row]; all inside window A unless marked):

| Place | Hex | Place | Hex |
|---|---|---|---|
| Ede | [2024, 2744] (1 hex from the west edge) | Arnhem road bridge | [2040, 2754] |
| Ginkel Heath DZ Y | [2027, 2745] | Westervoort IJssel bridge | [2043, 2754] |
| Wageningen | [2024, 2754] | Velp | [2044, 2751] |
| Renkum | [2028, 2753] | Rheden | [2048, 2751] |
| Wolfheze | [2032, 2749] | De Steeg (Zutphen road) | [2050, 2749] |
| Hartenstein, Oosterbeek | [2035, 2752] | Huissen | [2041, 2759] (south edge row) |
| Driel | [2033, 2755] | Zevenaar | [2051, 2760]: **outside**, one row into the Nijmegen map |
| Deelen airfield | [2038, 2743] | Elst | [2035, 2761]: **outside**, two rows into the Nijmegen map |
| Otterlo | [2031, 2737] | Lunteren | [2021, 2738]: **outside**, 2 hexes west |
| Hoenderloo | [2038, 2735] | Apeldoorn | [2046, 2724]: **outside**, 4 rows north |
| Woeste Hoeve (Apeldoorn road) | [2043, 2737] | Beekbergen | about row 2729 (north edge) |

The German approach routes all enter the map:
- **From the north-west and west:** Ede and the Ede-Arnhem road enter at the west edge. Lunteren is 2 hexes outside, and its road comes in through Ede.
- **From Apeldoorn:** the Arnhem-Apeldoorn road enters at the north edge near Beekbergen, about 4 km short of Apeldoorn.
- **From Zutphen:** the road via Velp, Rheden and De Steeg leaves at the east edge near Dieren.
- **From Elst and Nijmegen:** the Arnhem-Elst road leaves the south edge about 2 km north of Elst.

### 0b. Does it join the Nijmegen map?

**Yes, exactly.**
- Nijmegen's window is col 2023, row 2760, 30 × 32. Its north edge does not run where the brief says (about 51.93°N from 5.74 to 6.18°E). The outer hex edge runs from **51.923°N, 5.658°E (NW corner) to 51.939°N, 6.101°E (NE corner)**. It tilts slightly because LAEA grid north is rotated against true north at 5-6°E. **V** (computed; matches `map.geo`)
- Window A's south edge is that same line. Together the two maps form one 30 × 64 strip from Beekbergen to Gennep, joined hex for hex.
- At the seam: Elst, Zevenaar, Bemmel and the Linge lie in the Nijmegen map. Huissen, Driel and the whole Arnhem front lie in window A.

### 0c. Alternatives

- **(B) Elst inside the map:** col 2023, row 2732, 30 × 32. Corners: NW 52.141, 5.637; SE 51.905, 6.104. This loses Hoenderloo and Beekbergen and puts Elst 3 rows inside the south edge. It **overlaps** the Nijmegen map by 4 rows. Overlapping hexes are identical on the shared grid, so a campaign could still merge the two, but the maps no longer simply abut.
- **(C) Shifted 4 columns west:** col 2019, row 2728. Lunteren (2021) comes inside and De Steeg drops out. NW corner 52.170, 5.576; SE corner 51.934, 6.043. Only 26 of its 30 columns then line up with the Nijmegen map.
- **(D) Shorter:** rows 2732-2759 (28 rows), north edge about 52.14-52.15. This removes mostly empty Veluwe forest and heath north of Hoenderloo. Units from Apeldoorn and Beekbergen then enter about 7 km short of Beekbergen.

---

## 1. Rivers and streams

### 1a. Watercourses

| Watercourse | 1944 notes | Today vs 1944 | Status |
|---|---|---|---|
| **Nederrijn** (Lower Rhine) | Flows west from the IJsselkop at Westervoort/IJsseloord, past Arnhem (where it bends south round the Malburgen polder), Oosterbeek, Heveadorp, Renkum and Wageningen. The river was about 100 m wide at the bridges and lined by winter dikes. North bank: steep Veluwe ridge (Westerbouwing, Oosterbeek, Arnhem). South bank: flat Betuwe polder (Driel, Elden, Malburgen) with uiterwaarden (flood meadows: Meinerswijk, the Rosande polder on the north bank). | The main channel is broadly the same (the 1937 Bonne sheet matches OSM within a few hundred metres). **Post-war:** (1) the **Driel weir and locks** ("stuw- en sluizencomplex Driel", Prinses Irenestuw) just west of Heveadorp: OSM shows it, but it did not exist in 1944; (2) floodplain lakes, clay pits and side channels in Meinerswijk, Stadsblokken and the Rijkerswoerd sand pits. | Course P; weir V that it exists today [nl.wiki Westerbouwing, Heveadorp]; weir date P (about 1970) |
| **Pannerdensch Kanaal** | The upper Rhine branch from Pannerden north past Loo and Huissen to the IJsselkop. The 1937 sheet labels it "Neder Rijn" east of Huissen. OSM calls it "Pannerdensch Kanaal". Only its northern 3-4 km fall in window A. | Same course | P |
| **IJssel** | Leaves the Rhine at the IJsselkop opposite Westervoort, then runs north-east past Westervoort, Lathum and Rheden. A road and rail bridge at Westervoort ("Spoor en Rijbr." on the 1937 sheet) [TT]. | The A12 IJsselbrug (51.974, 5.991) [OSM] is post-war (A12 Velperbroek-Zevenaar opened 1961) [nl.wiki Rijksweg 12]. | Course P; A12 V |
| **Groene Rivier** (Malburgen) | High-water channel dug in an old river bed north of the Malburgen bandijk when the Rijnbrug was built (1930s). Normally dry. | Built over in Malburgen | V [nl.wiki Malburgen (wijk)] |
| **Veluwe streams**: Renkumse beek, Heelsumse beek, Seelbeek (Heveadorp), the Oosterbeek and Zijpendaal brooks, Sint Jansbeek (Sonsbeek), Beekhuizense beek (Velp) | Short spring-fed brooks running south off the ridge into the Rhine. Narrow and in steep little valleys, with mills and ponds. | Same | P. I suggest leaving them out; they are under a hex wide and not a real obstacle. |
| **Linge**, Betuwe weteringen | The Linge rises near Doornenburg and passes south of Elst, so it is in the Nijmegen map. Polder ditches and weteringen cut the Betuwe into small fields. | Same | P |

**OSM names to use:** `Nederrijn` (river), `IJssel` (river), `Pannerdensch Kanaal` (canal or river; check both tags). **U:** whether OSM tags the Rhine at Arnhem as `Nederrijn` along its whole length.

### 1b. Crossings in 1944 and their state on 17-18 September

| Crossing | Type | lat, lon | State 17-18 Sep 1944 | Status | Sources |
|---|---|---|---|---|---|
| **Arnhem road bridge** (Rijnbrug, now John Frostbrug) | Steel arch road bridge, built 1932-35, opened 1935 | centre 51.9748, 5.9116 [OSM]; nl.wiki gives 51°58′29″N 5°54′42″E (51.9747, 5.9117). North ramp about 51.977, 5.912; south end about 51.972, 5.911. | **Intact.** Blown by the Dutch on 10 May 1940, repaired during the occupation. Repair dates conflict: "not repaired until 1943" (Liberation Route) vs "ready in August 1944" (nl.wiki). It was in use by 17 Sep: Gräbner's 9th SS reconnaissance battalion crossed it southwards at dusk on 17 Sep. A Coy 2 Para reached the north end about 20:00 on 17 Sep. The south end stayed German. At first light on 18 Sep Murray found it "not prepared for demolition" [AF 4.5]. Gräbner's return attack ran 09:00-11:30 on 18 Sep. Bombed and destroyed by B-26s of the US 344th BG on **7 Oct 1944**. | V | https://nl.wikipedia.org/wiki/John_Frostbrug ; https://en.wikipedia.org/wiki/Battle_of_Arnhem ; https://www.europeremembers.com/pois/703/boterdijk ; allied-forces.md 3-4 |
| **Oosterbeek railway bridge** (Arnhem-Nijmegen line; code name CHARING X) | Rail bridge (first built 1879) | 51.9724-51.9739, 5.8559-5.8568 [OSM, today's bridge on the same alignment]; 51.971, 5.853 [AF]; nl.wiki infobox 51.9697, 5.8550. Use about **51.972, 5.856**. | **Blown by the Germans on 17 Sep** as Lt Peter Barry's 9 Platoon, C Coy 2 Para, went onto the span. The demolition was by a mobile platoon of Bataillon Krafft, which guarded the south side. **Time: U.** Sources say only "late in the afternoon" (a C Coy private, ParaData) and "just before" or "as" 2 Para arrived. 2 Para left the DZ about 15:00-15:30 and reached the north end of the road bridge about 20:00, so 18:00-19:00 is a reasonable working estimate (**P**). History: Dutch blew it on 10 May 1940; the Germans replaced it on 19 Nov 1940 with a single-track span brought from Zaltbommel; temporary bridge from Dordrecht after the war; permanent bridge 1952. | Blown V; time U | https://nl.wikipedia.org/wiki/Spoorbrug_Oosterbeek ; https://paradata.org.uk/content/4663878 ; https://www.battle-of-arnhem.com/?p=974 (search extract) |
| **Arnhem pontoon (ship) bridge** (code name PUTNEY) | Boat bridge | about **51.980, 5.898** [AF; TT: "Schipbr." at the Praets, RD 190.1, 443.7 → 51.9804, 5.8982]. Same site as today's Nelson Mandela bridge (51.9793, 5.9002 [nl.wiki]). | **Unusable.** The Germans had removed the middle section and moored it on the south bank (or a few hundred metres downstream). B Coy 2 Para and the sappers reached it about 20:30-21:30 (or "around two in the morning"; sources differ) and found no boats. It played no further part. **Conflict:** nl.wiki says the schipbrug lay there "from 1603 to 1936". The Liberation Route page says it stayed in use after 1935 and was important after the road bridge was blown in 1940. So the 1944 pontoon was either the old schipbrug or a 1940 replacement on the same site (P). | Unusable V | https://www.europeremembers.com/pois/703/boterdijk ; https://en.wikipedia.org/wiki/Battle_of_Arnhem ; https://nl.wikipedia.org/wiki/Nelson_Mandelabrug_(Arnhem) |
| **Heveadorp-Driel ferry** (Drielse veer) | Cable ferry (gierpont), taking vehicles | ferry line about **51.9726, 5.8244** [OSM way "Drielse Veer"]; north landing below the Westerbouwing; [AF] estimate 51.973, 5.820 | **Working on 17-18 Sep** (P: no source says otherwise). The ferryman (Pieter in Ryan; veerbaas Peter Hensen in a local source) disabled it on about 20 Sep, or sank it according to en.wiki, so that the Germans could not use it. It was gone when the Poles reached Driel on 21 Sep. | Status 17-18 Sep P; later loss V (en.wiki) | https://en.wikipedia.org/wiki/Battle_of_Arnhem ; https://www.geocaching.com/geocache/GCB4Z07 (search extract) ; https://erenow.org/ww/a-bridge-too-far-the-classic-history-of-the-greatest-battle-of-world-war-ii/34.php |
| **Westervoort IJssel bridges** (road and rail, Arnhem-Zevenaar-Emmerich) | Road and rail bridges side by side ("Spoor en Rijbr.") | about **51.971, 5.957** [TT: RD 194.15, 442.65] | **P: intact and in German use.** Rail bridge from 1856. Both were blown by the Dutch on 10 May 1940 (V), then presumably rebuilt. A German raid on the "three bridges over the IJssel near Westervoort" failed. The Germans blew the bridges again in April 1945 (V). I found nothing on September 1944. Pannerden, Doesburg and Westervoort are the IJssel and Rhine crossings the 10th SS could use towards the Betuwe. | 1940 and 1945 V; Sep 1944 P | https://nationaalonderduikmuseum.nl/en/freedom-programme/quartet/westervoort/ ; https://www.bruggenstichting.nl/images/bruggen2002/dec-Evolutie.pdf ; https://www.liberationroute.com/pois/493/mustering-the-troops |
| Other Rhine ferries: Renkum-Heteren, Wageningen-Randwijk (Lexkesveer), Huissen-Loo (Looveer, hamlet at 51.937, 5.959 [OSM]), Pannerden (outside, east) | Ferries | – | **U.** Not researched. Pannerden is where the 10th SS ferried units over to the Betuwe from 18 Sep; it is about 4 km east of window A. | U |

**Crossings that did NOT exist in 1944.** A modern OSM map would wrongly include:
- the **Nelson Mandela bridge** (Roermondspleinbrug; opened 18 Dec 1977, renamed 1987) at 51.9793, 5.9002 [nl.wiki];
- the **Andrej Sacharov bridge** (N325 Pleijroute, 1987) east of the city [nl.wiki Rijksweg 325];
- the **A50 Rhine bridge at Heteren** (A50 south of Grijsoord, about 1972; P);
- the **A12 IJsselbrug** at Westervoort (1961) [nl.wiki Rijksweg 12];
- the **Driel weir** (about 1970; P).

The **John Frost bridge** stands on the 1935 site. Its rebuild was open to traffic from **1950** (nl.wiki; the infobox also lists 1949). The brief's "rebuilt 1948" is the start of work, not the opening (P). It was renamed on 17 Dec 1977 (en.wiki) or 16 Sep 1978 (nl.wiki): **conflict, P**.

---

## 2. Settlements

Summary only. Extents, district dates and sources are in `settlements-roads-1944.md` section 1.

- **Arnhem** was a city of about 95,000-97,000 people, with 97,350 in the 1947 municipality (V, 1947 census). It filled the Veluwe slope north of the river, from Heijenoord/Lombok in the west (about 5.876°E) to Klarendal/Geitenkamp in the east (about 5.94°E), and from the Rhine north to Sonsbeek and Alteveer/Cranevelt (about 52.003°N). South of the river there was only the 1937-44 nucleus of Malburgen by the bridge ramp, plus Elden village.
- **Not built in 1944:** Presikhaaf (from 1949), Monnikenhuizen (1950s), Malburgen beyond the first ~360 houses (1950s), Immerloo and Het Duifje (mid-1960s), Vredenburg/Kronenburg (late 1960s), Elderveld (1970s-80s), De Laar, Rijkerswoerd (from 1989), Schuytgraaf (from 2002) and GelreDome.
- **Oosterbeek** (Renkum municipality 21,732 in 1947) was a large villa village on both sides of the Utrechtseweg between the railway and the river.
- **Velp** was a compact villa town.
- **Renkum, Heelsum, Doorwerth, Heveadorp, Wolfheze** (village and asylum), **Driel, Elden, Westervoort, Schaarsbergen, Deelen** were small villages or hamlets.

---

## 3. Woods, heaths, polder and heights

### 3a. Land cover in 1944

Read off the Topotijdreis 1944 tiles [TT]: the 1:50,000 sheet (pink = heath, green = wood) and the 1937-edition 1:25,000 sheet around Arnhem. **P**: by-eye reading, and the sheets date from the late 1930s.

| Area | 1944 cover | Notes |
|---|---|---|
| **Ginkel Heath** (Ginkelse Heide), DZ Y | Open heath, about 52.025-52.045, 5.71-5.75 | The Ede-Arnhem road crosses it. The Germans' unfinished A12 embankment ran along its south side ("by the unfinished motorway embankment", KOSB HQ [AF]). Still heath today. V that it is heath [nl.wiki Ginkelse Heide] |
| **Renkum Heath** (DZ X / LZ X) and the **Wolfheze heath** (LZ Z) | Open heath and fields north of Heelsum, between the Utrechtseweg and the Utrecht-Arnhem railway, about 51.985-52.005, 5.75-5.79 | Bisected after the war by the A12 (1957) and the A50 (about 1972). Much is now wood or regrown. P |
| **LZ S, Reijers-Camp** | Reclaimed farmland (rectangular fields) north of the railway, about 52.008-52.020, 5.775-5.80 | "Rojers Camp" on the 1:25,000 sheet [TT]. P |
| **Johannahoeve, LZ L** | Fields and farmland between the railway and the Amsterdamseweg, about 52.000-52.008, 5.82-5.84 | "Johanna Hoeve" [TT] at about 52.003, 5.829. P |
| **Veluwe woods** | Pine and mixed estate woods: Doorwerth wood (Doorwerthsche Bosch), the Oosterbeek estates (Bilderberg, Hemelse Berg, Mariëndaal, Lichtenbeek), Warnsborn, Schaarsbergen, the Rozendaal and Velp woods, the Planken Wambuis woods | Generally **less** wooded than today; several areas mapped as heath or open sand in the 1930s are wood now. Use the Bosstatistiek 1938-42 (section 7), which the builder already reads for the Netherlands. P |
| **Heaths north of Arnhem** | Large open heaths: the Arnhemsche Heide and Terletsche Veld north of Schaarsbergen, the Deelensche Zand, the Rozendaalsche and Worth-Rhedensche Veld, the Planken Wambuis heath, and the Hoge Veluwe heath and drift sand (Otterlo-Hoenderloo) | Largely open in 1944. Deelen airfield was built on them. P |
| **Betuwe** (south of the river) | Flat clay polder with grassland, orchards, brickworks along the river (many "Steenfabriek" on the sheet), dike roads, and wet ditches every 50-100 m | Floodplains: Meinerswijk, the Stadswaarden, the Malburgsche and Huissensche waarden. Polder level about 9-10 m [EU-DEM: Driel 9.5 m]. The Nijmegen research found it "nearly impassable for tanks" off the roads. P |

### 3b. Heights and places of note

| Feature | lat, lon | Height (EU-DEM, modern) | Notes | Status |
|---|---|---|---|---|
| **Westerbouwing** | 51.9755, 5.8223 [OSM; nl.wiki] | about 37 m at the restaurant, river about 8 m | A café on the ridge overlooking the Driel ferry; Ryan calls it a "hundred-foot-high hill". It dominated the ferry and the west of the later perimeter. | V position, P height |
| Hemelse Berg | 51.9836, 5.8271 [OSM] | 45 m [OSM ele] | Wooded estate west of the Hartenstein | V (OSM) |
| Zilverberg | 51.9844, 5.8066 [OSM] | 63 m [OSM ele] | Border Regt D Coy position on 19 Sep ("Zilverenberg") [AF] | V (OSM) |
| Boersberg (Doorwerth) | 51.9726, 5.7803 [OSM] | 44 m | Ridge above Doorwerth castle | V (OSM) |
| Koepel / Lichtenbeek high ground | 51.996, 5.861 [AF; OSM] | about 55-64 m (Vijverberg 55 m at 52.0043, 5.8569; spot 64 m at 52.0003, 5.8715 [OSM]) | 4th Para Bde objective | P |
| **Den Brink** | 51.987, 5.876 [AF, grid 723782] | about 28-30 m [EU-DEM] | Height in west Arnhem by the Arnhem-Nijmegen railway. B Coy 2 Para cleared it on 17 Sep. German machine guns there blocked LION from 07:00-08:00 on 18 Sep. | P |
| Apostelenberg, Ruyterenberg (Sonsbeek) | 51.992-51.994, 5.908 | 62-70 m [OSM] | Ridge above the old town | V (OSM) |
| De Waterberg, Bicksberg | 52.010, 5.917; 52.001, 5.895 | 68 m; 76 m [OSM] | North Arnhem heights | V (OSM) |
| Tafelberg (Rheden) | 52.0345, 6.0085 | 103 m [OSM] | Highest ground of the Velp-Rheden ridge, about 107 m nearby. **Not** the Tafelberg hotel in Oosterbeek. | V (OSM) |
| **Hartenstein Hotel** | 51.9877, 5.8327 [OSM, Airborne Museum] | about 58 m | Div HQ from about 16:00-17:00 on 18 Sep [AF] | V |
| **Tafelberg Hotel**, Oosterbeek (Pietersbergseweg) | about 51.9845, 5.8371 [OSM building "Tafelberg"] | about 57 m | Later the main dressing station | P |
| Schoonoord Hotel (Utrechtseweg 214) | 51.9878, 5.8381 [OSM] | – | Dressing station from 18-19 Sep (P) | V position |
| **St Elisabeth Hospital** (Sint Elisabeths Gasthuis, Utrechtseweg) | 51.9850, 5.8860 [OSM building]; 51.984, 5.885 [AF] | about 28 m | Brigade dressing station from the evening of 17 Sep; changed hands on 18 Sep [AF] | V |
| **The "Monastery"** | 51.985, 5.892 [AF, grid 734780] | – | South Staffords' objective on 19 Sep. The grid matches the Municipal Museum, Utrechtseweg 87 (51.9855, 5.8922 [OSM]), which D Coy's first objective "the municipal museum" also names (HistoryNet). P that "Monastery" means the museum building. | P |
| **Oosterbeek Oude Kerk** ("Lonsdale church") | 51.9780, 5.8378 [OSM; nl.wiki 51.97796, 5.8378] | about 13 m | 3 Bty Light Regt beside it from about 09:00-10:00 on 18 Sep [AF]; damaged and restored 1949-50 [nl.wiki] | V |
| Oosterbeek-Laag railway viaduct (Benedendorpsweg) | about 51.980, 5.856 [AF: railway at 712774 → 51.980, 5.860] | – | Built 1875-78; blown 1940 and repaired; fighting on 17 Sep [Liberation Route] | V event, P position |
| Wolfheze asylum (Christelijk Gesticht) | about 51.999, 5.796 (P, south-west of the station) | – | Bombed on 17 Sep before the landings (P) | P |
| Hotel Wolfheze | 51.997, 5.802 [AF] | – | Attacked by 9 Fd Coy on 17 Sep [AF] | P |
| **Deelen airfield** (Fliegerhorst Deelen) | 52.0603, 5.8725 [nl.wiki] | about 45 m | Pre-1914 Dutch auxiliary field, rebuilt 1940-44 as the Luftwaffe's largest airfield in the Netherlands [nl.wiki]. It is **missing** from the 1:50,000 sheet in Topotijdreis 1944. | V |
| Willemsplein (German town HQ, C Coy 2 Para's later target) | 51.9836, 5.9062 [OSM] | – | | P |
| Hotel Bilderberg | 51.9901, 5.8175 [OSM] | – | 1st Airlanding Bde HQ from 19:00 on 18 Sep [AF] | V |

---

## 4. Drop and landing zones

From allied-forces.md section 8.2 [AF], cross-checked against land cover [TT] and OSM names.

| Zone | Centre lat, lon | Ground in 1944 | Status |
|---|---|---|---|
| LZ S (Reijers-Camp) | 52.013, 5.785 | Fields north of the railway; Reijers-Camp neighbourhood at 52.0156, 5.7889 [OSM] | P |
| LZ Z | 52.000, 5.772 | Heath and fields south of the railway, west of Wolfheze | P |
| DZ X / LZ X (Renkum Heath) | 51.991, 5.758 | Heath north of Heelsum, either side of the Telefoonweg | P |
| DZ Y (Ginkel Heath) | 52.036, 5.733 | Heath, with the Ede-Arnhem road through it | P |
| LZ L (Johannahoeve) | 52.005, 5.820 (AF estimate); Johannahoeve farm 52.003, 5.829 [TT] | Fields between the railway and the Amsterdamseweg | P |
| DZ K (planned Polish DZ, not used) | 51.965, 5.905 | Polder south of the road bridge | P |

---

## 5. Post-war changes a modern map gets wrong

Details and sources are in `settlements-roads-1944.md` section 5.

1. **Bridges:**
   - Nelson Mandela bridge (1977), Andrej Sacharov bridge (1987), A50 Heteren bridge (about 1972) and the A12 IJssel bridge (1961) are all new; leave them out.
   - The John Frost bridge is a 1950 rebuild on the 1935 site; keep it.
   - The Oosterbeek rail bridge is a 1952 rebuild on the 1879 alignment; keep it as a site, but it was down on 17 Sep.
2. **Motorways and fast roads:**
   - A12: Planken Wambuis-Arnhem Noord opened 1957, Arnhem Noord-Velperbroek and Velperbroek-Zevenaar 1961. Through 1940-42 the Germans built **embankments** for it, which were left unfinished when building stopped in 1942. So a raised earthwork crossed the area north of Arnhem in 1944, but there was no road on it.
   - A50: the Waterberg-Grijsoord stretch opened 29 May 1957; the stretch south via Wolfheze and Heteren about 1972.
   - A325 and N325 (Pleijroute), the Arnhem-Zuid ring roads, and the N224 dual carriageway.
3. **Districts:** see section 2.
4. **Water:** Driel weir and locks; floodplain clay and sand pits (Meinerswijk, the Rijkerswoerdse Plassen from the late 1970s); the 21st-century Room for the River works.
5. **Land cover:** heath has turned to wood in many places (Renkum, Wolfheze, north Arnhem). Papendal sports centre, the Hoge Veluwe park infrastructure, and Deelen's current runway layout are post-war.
6. **Railways:**
   - Arnhem Zuid station (2004), Arnhem Presikhaaf (1969) and Oosterbeek's current station buildings are post-war.
   - The wartime German **spur from Wolfheze to Deelen** existed in 1944 and was removed after the liberation [nl.wiki Station Wolfheze].

---

## 6. Elevation notes for the builder

EU-DEM samples (modern terrain, m above sea level):

| Point | Height | Point | Height |
|---|---|---|---|
| Driel polder | 9.5 | Oude Kerk, Benedendorpsweg | 13.4 |
| Arnhem south bank (51.96, 5.90) | 12.5 | Den Brink / Klingelbeek (51.983, 5.86) | 29.8 |
| LZ Z / DZ X | 28-33 | LZ S | 33.8 |
| DZ Y (Ginkel) | 22.5 | Johannahoeve | 26.7 |
| Hartenstein | 58.7 | Tafelberg Hotel | 57.2 |
| Arnhem Sonsbeek ridge (51.99, 5.91) | 46.5 | North Arnhem (52.01, 5.92) | 87.8 |
| Deelen | 45.4 | | |

The water surface reads about 3.7 m, which is a DEM artefact.

The Nijmegen map used `polderBelowMeters` 10.5. Here the river terrace at Oosterbeek-Laag is about 13 m, so the threshold has to separate the Betuwe (9-11 m) from the north-bank terrace (12-15 m). I suggest **11.5 m** with `polderRisePerKmEast` 0.1. Check that the Benedendorpsweg strip and the Arnhem riverside are not flagged as polder (P).

---

## 7. Historical map sources

| Source | Coverage | Licence | Notes | Status |
|---|---|---|---|---|
| **Kadaster Topotijdreis**, service `Historische_tijdreis_1944` | All of window A | Conflicting: the ArcGIS item says free with credit "Kadaster"; the topotijdreis.nl FAQ forbids commercial use and derived services without written permission (see `docs/research/map-sources.md` §1) | Tile endpoint: `https://tiles.arcgis.com/tiles/nSZVuSZjHpEZZbRo/arcgis/rest/services/Historische_tijdreis_{YEAR}/MapServer/tile/{level}/{row}/{col}` (RD New, Esri-NL origin -30515500, 31112400). I fetched level 8, 9 and 10 tiles over Arnhem, Oosterbeek, Wolfheze, Ginkel, Velp and Driel; all returned 200. **Edition caveat:** at level 9 (1:25,000) the Arnhem-bridge tile last changes in the 1937 service and is identical 1937-1945; the Oosterbeek tile likewise. But that sheet **does not show the 1935 Rijnbrug** (it still shows the schipbrug at the Praets) **or the Malburgen houses**, so its survey content predates 1935 in places. Even the 1946 service tile shows the schipbrug and not the bridge. The level 8 (1:50,000) sheet does show the bridge, the diagonal road to Elden and Elst, and the Malburgen blocks, but **not Deelen airfield**. Use the 1:50,000 sheet for roads and the 1:25,000 sheet for detail, and check both against the GSGS sheets. | V (tiles fetched); licence conflict |
| RCE **1e Bosstatistiek 1938-42** WMS | All NL | Attribution: Staatsbosbeheer, Stichting Bosdata, RCE | The builder's `woods.netherlands: "bosstatistiek"` source. Covers all of window A, which is entirely Dutch. | V (from the Nijmegen research) |
| **GSGS 4427** (= AMS M831) Holland 1:25,000 | Sheets used in the war diaries: **388 GINKEL, 387 EDE, 6 NW ARNHEM** [AF 8.1]. A dealer lists "Arnhem 6 NW", "Arnhem v2 6 NW" and "Arnhem 6 NW East". OldMapsOnline lists "Arnhem (East)" and "Ginkel (West and East)" as M831 / GSGS 4427. | British Crown copyright on 1943-44 sheets has expired (50 years); LoC scans are "free to use" (P) | LoC set g6000m.gct00040 (https://www.loc.gov/item/2003630738/). I did not identify which LoC image numbers hold the Arnhem and Ginkel sheets (U). Dealer list: https://www.battlefieldhistorian.com/gsgs-4427-series-holland-125000.asp ; Project '44 sells a reproduction covering Heelsum-Arnhem (https://project44.ca/store/products/arnhem-1-25-000/) | P |
| GSGS 4416 / AMS Holland 1:100,000, 1:50,000 | Overview | as above | Not checked for this area | U |
| **RAF aerial photographs** (WUR collection, Sept 1944 onwards; a 6 Sep 1944 RAF recce photo of west Arnhem is on ParaData, https://paradata.org.uk/media/14266) | Most of the area | WUR reuse terms unconfirmed; Crown copyright on pre-1957 photos likely expired | Geoportal https://library.wur.nl/WebQuery/geoportal/raf | P |
| Bonnebladen scans (DANS) | All NL | Restricted to Dutch academic users | Same content as the Topotijdreis 1:25,000 | V (Nijmegen research) |
| OSM, EU-DEM, Copernicus GLO-30 | All | ODbL; Copernicus licence | Modern | V |

---

## 8. Open questions

1. **Exact time the Oosterbeek railway bridge was blown** on 17 Sep. Check Middlebrook (*Arnhem 1944*), Margry (*Market Garden Then and Now*) or the 2 Para war diary. The scenario designer has to decide whether it is ever usable. Map-config has `fromTurn` but no "until" turn, so the simplest choice is to **leave it out** (my recommendation): nobody crossed it.
2. **Westervoort IJssel bridges in Sept 1944:** were they rebuilt after 1940, as one combined road and rail bridge or two separate ones? Were they in use?
3. **Heveadorp ferry:** capacity (vehicles?), and the exact date it was disabled. Was it operating on 17-18 Sep?
4. **Arnhem-Elst road alignment in 1944:** the 1:50,000 sheet shows the diagonal bridge road via Elden, but the 1:25,000 sheet predates the bridge. Confirm on GSGS 4427 sheet 6 NW. Nijmegen's research says the new Rijksweg 52 was unfinished near Aam and the old road ran on the Griftdijk.
5. **A12 earthworks (1940-42):** how far they ran across Ginkel, Renkum heath and the Schaarsbergen woods. They were a real line of cover; KOSB HQ sat by them on DZ Y.
6. **1944 heath versus wood** on Renkum heath, LZ Z, LZ L and north Arnhem: check against the Bosstatistiek WMS and RAF photos.
7. **Monastery = Municipal Museum?** Confirm from the South Staffords' war diary.
8. Positions of the **Wolfheze asylum** buildings and the **Tafelberg Hotel** (OSM gives only modern buildings with that name).
9. Ferries at Renkum-Heteren, Wageningen and Huissen-Loo in 1944.
10. OSM tagging of the Nederrijn, IJssel and Pannerdensch Kanaal names inside the window, for the `osmNames` lists below.

---

## For map-config.json

Ready-to-paste lists in the format of `scenarios/nijmegen-1944/source/map-config.json`. Every `source` note points to these files. Positions are ±300 m; anything marked P or U above stays provisional here.

Choices made below, which the designer can change:
- The **pontoon bridge is left out** (unusable).
- The **Oosterbeek railway bridge is left out** (blown on 17 Sep before anyone crossed). A commented-out entry is given if you want it.
- The **Heveadorp ferry is included** for foot and wheeled units.
- **Railways are not listed**, because map-config has no railway type.

```jsonc
{
  "id": "arnhem-1944",
  "name": "Arnhem, 17-18 September 1944",
  "grid": { "grid": "europe-laea-1km", "col": 2023, "row": 2728, "cols": 30, "rows": 32 },
  "elevationStepMeters": 10,
  "reliefSpacingMeters": 100,
  "polderBelowMeters": 11.5,
  "polderRisePerKmEast": 0.1,
  "woodsFraction": 0.35,
  "woods": { "netherlands": "bosstatistiek", "osmAreas": [] },

  "rivers": [
    { "id": "nederrijn", "name": "Nederrijn", "kind": "major", "osmNames": ["Nederrijn", "Neder-Rijn", "Rijn"], "osmWaterway": "river" },
    { "id": "pannerdensch-kanaal", "name": "Pannerdensch Kanaal", "kind": "major", "osmNames": ["Pannerdensch Kanaal"], "osmWaterway": "river" },
    { "id": "ijssel", "name": "IJssel", "kind": "major", "osmNames": ["IJssel", "Gelderse IJssel"], "osmWaterway": "river" }
  ],

  "settlements": [
    { "name": "Arnhem", "kind": "town", "centre": { "lat": 51.9850, "lon": 5.9070 }, "radiusKm": 1.0, "label": true, "source": "settlements-roads-1944.md 1a-1b: old town, station, Spijkerkwartier, St Marten; city of ~97,000 (1947)" },
    { "name": "", "kind": "town", "centre": { "lat": 51.9930, "lon": 5.9300 }, "radiusKm": 0.7, "label": false, "source": "settlements-roads-1944.md 1b: Klarendal (from 1830), Mussenbuurt (1911), Geitenkamp (1920-30)" },
    { "name": "", "kind": "town", "centre": { "lat": 51.9890, "lon": 5.8850 }, "radiusKm": 0.6, "label": false, "source": "settlements-roads-1944.md 1b: Heijenoord, Lombok, Burgemeesterswijk, Hoogkamp (1930s); built up to about 5.876 E" },
    { "name": "", "kind": "town", "centre": { "lat": 52.0020, "lon": 5.9090 }, "radiusKm": 0.4, "label": false, "source": "settlements-roads-1944.md 1b: Alteveer / 't Cranevelt (1930s)" },
    { "name": "Malburgen", "kind": "village", "centre": { "lat": 51.9698, "lon": 5.9104 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1b: ~360 houses by 1940 at the bridge's south ramp; rest post-war" },
    { "name": "Oosterbeek", "kind": "town", "centre": { "lat": 51.9862, "lon": 5.8443 }, "radiusKm": 0.8, "label": true, "source": "settlements-roads-1944.md 1c: villa village between the railway and the river (TT 1:25k)" },
    { "name": "Velp", "kind": "town", "centre": { "lat": 51.9955, "lon": 5.9747 }, "radiusKm": 0.6, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Renkum", "kind": "village", "centre": { "lat": 51.9751, "lon": 5.7336 }, "radiusKm": 0.3, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Heelsum", "kind": "village", "centre": { "lat": 51.9832, "lon": 5.7554 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Doorwerth", "kind": "village", "centre": { "lat": 51.9789, "lon": 5.8048 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Heveadorp", "kind": "village", "centre": { "lat": 51.9758, "lon": 5.8092 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1c" },
    { "name": "Wolfheze", "kind": "village", "centre": { "lat": 52.0030, "lon": 5.7940 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c: station hamlet and asylum" },
    { "name": "Driel", "kind": "village", "centre": { "lat": 51.9610, "lon": 5.8140 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Elden", "kind": "village", "centre": { "lat": 51.9600, "lon": 5.8860 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Westervoort", "kind": "village", "centre": { "lat": 51.9623, "lon": 5.9663 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c (municipality 2,662 in 1947)" },
    { "name": "Schaarsbergen", "kind": "village", "centre": { "lat": 52.0250, "lon": 5.8720 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Deelen", "kind": "village", "centre": { "lat": 52.0660, "lon": 5.8927 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Ede", "kind": "town", "centre": { "lat": 52.0430, "lon": 5.6720 }, "radiusKm": 0.6, "label": true, "source": "settlements-roads-1944.md 1c: one hex from the west edge" },
    { "name": "Bennekom", "kind": "village", "centre": { "lat": 51.9980, "lon": 5.6759 }, "radiusKm": 0.3, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Wageningen", "kind": "town", "centre": { "lat": 51.9686, "lon": 5.6683 }, "radiusKm": 0.5, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Heteren", "kind": "village", "centre": { "lat": 51.9554, "lon": 5.7573 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Randwijk", "kind": "village", "centre": { "lat": 51.9534, "lon": 5.7097 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1c" },
    { "name": "Huissen", "kind": "town", "centre": { "lat": 51.9384, "lon": 5.9394 }, "radiusKm": 0.3, "label": true, "source": "settlements-roads-1944.md 1c (south edge row)" },
    { "name": "Duiven", "kind": "village", "centre": { "lat": 51.9496, "lon": 6.0246 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Rozendaal", "kind": "village", "centre": { "lat": 52.0031, "lon": 5.9601 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1c" },
    { "name": "Rheden", "kind": "village", "centre": { "lat": 52.0044, "lon": 6.0303 }, "radiusKm": 0.3, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "De Steeg", "kind": "village", "centre": { "lat": 52.0200, "lon": 6.0606 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1c" },
    { "name": "Lathum", "kind": "village", "centre": { "lat": 51.9868, "lon": 6.0196 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1c" },
    { "name": "Otterlo", "kind": "village", "centre": { "lat": 52.1015, "lon": 5.7721 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Hoenderloo", "kind": "village", "centre": { "lat": 52.1177, "lon": 5.8762 }, "radiusKm": 0, "label": true, "source": "settlements-roads-1944.md 1c" },
    { "name": "Terlet", "kind": "village", "centre": { "lat": 52.0590, "lon": 5.9413 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1c: hamlet on the Apeldoorn road" },
    { "name": "Woeste Hoeve", "kind": "village", "centre": { "lat": 52.1053, "lon": 5.9515 }, "radiusKm": 0, "label": false, "source": "settlements-roads-1944.md 1c: hamlet on the Apeldoorn road" }
  ],

  "features": [
    { "name": "Hartenstein", "at": { "lat": 51.9877, "lon": 5.8327 }, "source": "geography-1944.md 3b (Div HQ from 18 Sep)" },
    { "name": "St Elisabeth Hospital", "at": { "lat": 51.9850, "lon": 5.8860 }, "source": "geography-1944.md 3b" },
    { "name": "Den Brink", "at": { "lat": 51.9870, "lon": 5.8760 }, "source": "geography-1944.md 3b; allied-forces.md 8.3 (grid 723782); provisional" },
    { "name": "Monastery", "at": { "lat": 51.9855, "lon": 5.8922 }, "source": "geography-1944.md 3b: probably the Municipal Museum; provisional" },
    { "name": "Oosterbeek church", "at": { "lat": 51.9780, "lon": 5.8378 }, "source": "geography-1944.md 3b (Oude Kerk)" },
    { "name": "Westerbouwing", "at": { "lat": 51.9755, "lon": 5.8223 }, "source": "geography-1944.md 3b" },
    { "name": "Tafelberg Hotel", "at": { "lat": 51.9845, "lon": 5.8371 }, "source": "geography-1944.md 3b; provisional; probably the same hex as Hartenstein" },
    { "name": "Ginkel Heath", "at": { "lat": 52.0360, "lon": 5.7330 }, "source": "geography-1944.md 4 (DZ Y)" },
    { "name": "Renkum Heath", "at": { "lat": 51.9910, "lon": 5.7580 }, "source": "geography-1944.md 4 (DZ X / LZ X)" },
    { "name": "LZ Z", "at": { "lat": 52.0000, "lon": 5.7720 }, "source": "geography-1944.md 4" },
    { "name": "Reijers-Camp", "at": { "lat": 52.0130, "lon": 5.7850 }, "source": "geography-1944.md 4 (LZ S)" },
    { "name": "Johannahoeve", "at": { "lat": 52.0040, "lon": 5.8290 }, "source": "geography-1944.md 4 (LZ L)" },
    { "name": "Koepel", "at": { "lat": 51.9960, "lon": 5.8610 }, "source": "geography-1944.md 3b; allied-forces.md 8.3" },
    { "name": "Deelen airfield", "at": { "lat": 52.0603, "lon": 5.8725 }, "source": "geography-1944.md 3b (Fliegerhorst Deelen)" },
    { "name": "Betuwe", "at": { "lat": 51.9450, "lon": 5.8200 }, "source": "geography-1944.md 3a (polder label)" }
  ],

  "bridges": [
    { "id": "arnhem-road-bridge", "name": "Arnhem road bridge (Rijnbrug)", "river": "nederrijn", "at": { "lat": 51.9748, "lon": 5.9116 }, "source": "geography-1944.md 1b: intact 17-18 Sep; north end British from 20:00 17 Sep, south end German" },
    { "id": "heveadorp-ferry", "name": "Heveadorp-Driel ferry", "river": "nederrijn", "at": { "lat": 51.9726, "lon": 5.8244 }, "movementClasses": ["foot", "wheeled"], "source": "geography-1944.md 1b: cable ferry, working 17-18 Sep (provisional); disabled about 20-21 Sep" },
    { "id": "westervoort-ijssel-bridges", "name": "Westervoort IJssel bridges", "river": "ijssel", "at": { "lat": 51.9710, "lon": 5.9570 }, "source": "geography-1944.md 1b: road and rail, in German use (provisional)" }
    // Left out on purpose (geography-1944.md 1b):
    // { "id": "oosterbeek-rail-bridge", "name": "Oosterbeek railway bridge", "river": "nederrijn", "at": { "lat": 51.9720, "lon": 5.8560 }, "movementClasses": ["foot"], "source": "blown by the Germans on 17 Sep as C Coy 2 Para reached it" },
    // { "id": "arnhem-pontoon-bridge", "name": "Arnhem pontoon bridge", "river": "nederrijn", "at": { "lat": 51.9800, "lon": 5.8980 }, "source": "middle section removed; unusable" }
  ],

  "roads": [
    { "id": "utrechtseweg", "name": "Utrechtseweg (TIGER)", "kind": "main", "via": [
      { "lat": 51.9686, "lon": 5.6683 }, { "lat": 51.9751, "lon": 5.7336 }, { "lat": 51.9832, "lon": 5.7554 }, { "lat": 51.9881, "lon": 5.8168 },
      { "lat": 51.9877, "lon": 5.8327 }, { "lat": 51.9849, "lon": 5.8673 }, { "lat": 51.9850, "lon": 5.8860 }, { "lat": 51.9855, "lon": 5.8922 },
      { "lat": 51.9836, "lon": 5.9062 }, { "lat": 51.9770, "lon": 5.9120 }
    ], "source": "settlements-roads-1944.md 2: Wageningen-Renkum-Heelsum-Oosterbeek-Arnhem; OSM points, 1944 alignment from TT" },
    { "id": "lion", "name": "Benedendorpsweg-Klingelbeekseweg (LION)", "kind": "secondary", "via": [
      { "lat": 51.9832, "lon": 5.7554 }, { "lat": 51.9800, "lon": 5.7850 }, { "lat": 51.9789, "lon": 5.8048 }, { "lat": 51.9762, "lon": 5.8231 },
      { "lat": 51.9785, "lon": 5.8369 }, { "lat": 51.9800, "lon": 5.8560 }, { "lat": 51.9815, "lon": 5.8736 }, { "lat": 51.9839, "lon": 5.8845 },
      { "lat": 51.9800, "lon": 5.8980 }, { "lat": 51.9770, "lon": 5.9120 }
    ], "source": "settlements-roads-1944.md 2; allied-forces.md 4.1 (Heelsum-Heveadorp-Oosterbeek-Laag-Onderlangs-Rijnkade)" },
    { "id": "amsterdamseweg", "name": "Ede-Arnhem road (Amsterdamseweg, LEOPARD)", "kind": "main", "via": [
      { "lat": 52.0430, "lon": 5.6720 }, { "lat": 52.0369, "lon": 5.7341 }, { "lat": 52.0340, "lon": 5.7800 }, { "lat": 52.0184, "lon": 5.8085 },
      { "lat": 52.0102, "lon": 5.8324 }, { "lat": 52.0021, "lon": 5.8590 }, { "lat": 51.9958, "lon": 5.8721 }, { "lat": 51.9854, "lon": 5.9019 }
    ], "source": "settlements-roads-1944.md 2: via Ginkel Heath and Planken Wambuis (TT, OSM)" },
    { "id": "dreijenseweg", "name": "Dreijenseweg", "kind": "secondary", "via": [
      { "lat": 51.9877, "lon": 5.8400 }, { "lat": 51.9937, "lon": 5.8409 }, { "lat": 52.0027, "lon": 5.8444 }, { "lat": 52.0079, "lon": 5.8453 }
    ], "source": "settlements-roads-1944.md 2 (Spindler line, 18 Sep)" },
    { "id": "wolfheze-oosterbeek", "name": "Wolfhezerweg (south)", "kind": "secondary", "via": [
      { "lat": 52.0050, "lon": 5.7926 }, { "lat": 51.9942, "lon": 5.8028 }, { "lat": 51.9881, "lon": 5.8168 }
    ], "source": "settlements-roads-1944.md 2 (TT)" },
    { "id": "wolfheze-north", "name": "Wolfhezerweg (north)", "kind": "secondary", "via": [
      { "lat": 52.0050, "lon": 5.7926 }, { "lat": 52.0166, "lon": 5.8030 }, { "lat": 52.0184, "lon": 5.8085 }
    ], "source": "settlements-roads-1944.md 2 (1 Para's route north to LEOPARD)" },
    { "id": "heelsum-wolfheze", "name": "Heelsum-Wolfheze road", "kind": "secondary", "via": [
      { "lat": 51.9832, "lon": 5.7554 }, { "lat": 51.9950, "lon": 5.7750 }, { "lat": 52.0050, "lon": 5.7926 }
    ], "source": "settlements-roads-1944.md 2; alignment provisional" },
    { "id": "arnhem-apeldoorn", "name": "Arnhem-Apeldoorn road", "kind": "main", "via": [
      { "lat": 51.9880, "lon": 5.9100 }, { "lat": 52.0023, "lon": 5.9092 }, { "lat": 52.0281, "lon": 5.9299 }, { "lat": 52.0623, "lon": 5.9433 },
      { "lat": 52.1010, "lon": 5.9531 }, { "lat": 52.1581, "lon": 5.9603 }, { "lat": 52.1900, "lon": 5.9650 }
    ], "source": "settlements-roads-1944.md 2: Apeldoornseweg via Terlet and Woeste Hoeve (TT 1:50k)" },
    { "id": "arnhem-deelen", "name": "Arnhem-Schaarsbergen-Deelen road", "kind": "secondary", "via": [
      { "lat": 51.9958, "lon": 5.8721 }, { "lat": 52.0250, "lon": 5.8720 }, { "lat": 52.0603, "lon": 5.8725 }, { "lat": 52.0660, "lon": 5.8927 }
    ], "source": "settlements-roads-1944.md 2; provisional" },
    { "id": "arnhem-velp-zutphen", "name": "Arnhem-Velp-Zutphen road", "kind": "main", "via": [
      { "lat": 51.9770, "lon": 5.9120 }, { "lat": 51.9830, "lon": 5.9180 }, { "lat": 51.9890, "lon": 5.9450 }, { "lat": 51.9955, "lon": 5.9747 },
      { "lat": 52.0044, "lon": 6.0303 }, { "lat": 52.0200, "lon": 6.0606 }, { "lat": 52.0450, "lon": 6.1000 }
    ], "source": "settlements-roads-1944.md 2: Velperweg, Rheden, De Steeg towards Dieren and Zutphen" },
    { "id": "arnhem-zevenaar", "name": "Arnhem-Westervoort-Zevenaar road", "kind": "main", "via": [
      { "lat": 51.9830, "lon": 5.9180 }, { "lat": 51.9780, "lon": 5.9400 }, { "lat": 51.9710, "lon": 5.9570 }, { "lat": 51.9623, "lon": 5.9663 },
      { "lat": 51.9496, "lon": 6.0246 }, { "lat": 51.9357, "lon": 6.0789 }
    ], "source": "settlements-roads-1944.md 2 (TT)" },
    { "id": "arnhem-elst", "name": "Arnhem-Elst road (south bank)", "kind": "main", "via": [
      { "lat": 51.9748, "lon": 5.9116 }, { "lat": 51.9681, "lon": 5.9032 }, { "lat": 51.9624, "lon": 5.8939 }, { "lat": 51.9545, "lon": 5.8790 },
      { "lat": 51.9477, "lon": 5.8670 }, { "lat": 51.9386, "lon": 5.8604 }, { "lat": 51.9215, "lon": 5.8538 }
    ], "source": "settlements-roads-1944.md 2: diagonal bridge road past Elden to Elst (TT 1:50k); joins nijmegen-1944 'nijmegen-arnhem' road; provisional" },
    { "id": "driel-elden", "name": "Driel-Elden dike road", "kind": "secondary", "via": [
      { "lat": 51.9726, "lon": 5.8244 }, { "lat": 51.9610, "lon": 5.8140 }, { "lat": 51.9640, "lon": 5.8500 }, { "lat": 51.9600, "lon": 5.8860 }
    ], "source": "settlements-roads-1944.md 2: ferry-Driel-Elden; provisional" },
    { "id": "driel-heteren", "name": "Driel-Heteren dike road", "kind": "secondary", "via": [
      { "lat": 51.9610, "lon": 5.8140 }, { "lat": 51.9554, "lon": 5.7573 }, { "lat": 51.9534, "lon": 5.7097 }
    ], "source": "settlements-roads-1944.md 2; provisional" },
    { "id": "ede-wageningen", "name": "Ede-Bennekom-Wageningen road", "kind": "secondary", "via": [
      { "lat": 52.0430, "lon": 5.6720 }, { "lat": 51.9980, "lon": 5.6759 }, { "lat": 51.9686, "lon": 5.6683 }
    ], "source": "settlements-roads-1944.md 2; provisional" },
    { "id": "ede-otterlo", "name": "Ede-Otterlo road", "kind": "secondary", "via": [
      { "lat": 52.0430, "lon": 5.6720 }, { "lat": 52.0700, "lon": 5.7300 }, { "lat": 52.1015, "lon": 5.7721 }
    ], "source": "settlements-roads-1944.md 2; provisional (route north-west towards Lunteren leaves the map via Ede)" },
    { "id": "otterlo-hoenderloo-apeldoorn", "name": "Otterlo-Hoenderloo-Apeldoorn road", "kind": "secondary", "via": [
      { "lat": 52.1015, "lon": 5.7721 }, { "lat": 52.1222, "lon": 5.8161 }, { "lat": 52.1177, "lon": 5.8762 }, { "lat": 52.1493, "lon": 5.8832 },
      { "lat": 52.1641, "lon": 5.8982 }, { "lat": 52.1856, "lon": 5.9281 }
    ], "source": "settlements-roads-1944.md 2 (TT 1:50k: Hoenderloo north-east towards Ugchelen and Apeldoorn); provisional" }
  ]
}
```
