# Open historical map, elevation and vector sources for Nijmegen–Groesbeek–Grave (Sept 1944)

Date: 2026-10-16

# Open sources for a Sept 1944 map of Nijmegen–Groesbeek–Grave (with Reichswald/Kleve)

Confidence labels: **V** = verified (I fetched the live endpoint or read the licence text myself), **P** = provisional (from search snippets or secondary pages; some library sites block automated access), **U** = unknown.

## Bottom line
- **Live endpoints that cover the whole AOI:**
  - **Netherlands side:** the Topotijdreis "1944" tile service and the AHN elevation service.
  - **German side:** the NRW TK25 1936–1945 WMS and NRW DGM1 elevation.
  - **Woodland:** the RCE "1e Bosstatistiek 1938–42" WMS gives Dutch forest cover for exactly that period.
- **Cleanest licences:**
  - NRW services and DGM1 use dl-de/zero-2.0, which needs no attribution.
  - AHN is CC0.
  - RCE Bosstatistiek requires attribution only.
  - Gemeente Nijmegen historic rasters are CC BY 4.0.
- **Topotijdreis licence is contradictory.** The ArcGIS item says free to use with credit to Kadaster. The topotijdreis.nl FAQ forbids commercial use and derived services without written permission. Treat it as "attribution, non-commercial safe" unless Kadaster confirms otherwise.
- **PDOK has no historical topographic map services.** AHN is the only relevant PDOK item.
- **GSGS 4427 / AMS M831 scans exist** at the Library of Congress, and as a British Library copy listed on OldMapsOnline. The Nijmegen sheet is **Sheet 6 SW**. I could not confirm the Groesbeek or Grave sheet numbers.

## 1. Kadaster Topotijdreis (V)
**Endpoint pattern** (one service per year; the whole run 1815–2025 exists, including every year 1935–1946):
- REST: `https://tiles.arcgis.com/tiles/nSZVuSZjHpEZZbRo/arcgis/rest/services/Historische_tijdreis_{YEAR}/MapServer`
- Tiles: `.../MapServer/tile/{level}/{row}/{col}`
- WMTS: `.../MapServer/WMTS/1.0.0/WMTSCapabilities.xml`, which returns 200 with template `.../WMTS/tile/1.0.0/Historische_tijdreis_1944/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}`.
- The service list came from the site's own JS bundle (https://www.topotijdreis.nl/static/js/main.0adadb99.chunk.js).

**Technical details:**
- Projection is EPSG:28992 (RD New), with levels 0–11 (1:12,288,000 down to 1:6,000).
- The tiling origin is Esri-NL's own scheme, (-30515500, 31112400), **not** the PDOK/NL standard origin.
- Resolution at level 9 (1:24k) is 6.35 m/px; at level 10 it is 3.175 m/px.
- Tiles are 256-pixel JPEGs.
- I tested Nijmegen tile `9/18875/18887` (shows Keizer Karelplein) and Grave tile `9/18881/18882`. Both returned HTTP 200 with valid 256×256 JPEGs.

**Content of the 1944 service** (layers seen in `?f=json`):
- Bonnebladen_25K and TOP25_25K (the 1:25k series), plus a layer named `b455-1937.tif`
- TOP50_50K_1944 (1:50k series, i.e. the TMK successor RD050)
- TK200 and Gemeentekaart_1943 at small scales

**Edition dating inferred from tile hashes.** Each year's service shows the latest sheet published up to that year. I compared tile hashes across years:

| Area | Scale | Tile changes in service year | Unchanged through |
|---|---|---|---|
| Nijmegen | 1:25k | 1937 | 1945 |
| Groesbeek (Horst) | 1:25k | 1938 | 1945 |
| Grave and Mook | 1:25k | 1943 | 1945 |
| Nijmegen | 1:50k | 1939 | 1945 |

All change again in 1946 (post-war editions). So the 1944 service shows roughly 1937–1943 editions. Exact edition years per sheet are not exposed by the tiles-only service, so this dating is P.

**Licence (conflicting):**
- The ArcGIS Online item 981e67cb4a5141eb816305cdaaa1f1b9 (owner Esri_NL_Content) has this licenseInfo: "De tiled services van de historische kaarten zijn vrij te gebruiken onder vermelding van bron: Kadaster" (free to use if Kadaster is credited). Credits: "Esri Nederland; Kadaster…". Source: https://www.arcgis.com/sharing/rest/search?q=%22Historische%20topografische%20data%201944%22%20owner:Esri_NL_Content&f=json (V).
- The topotijdreis.nl FAQ, embedded in the JS bundle, says: "U mag de website topotijdreis niet commercieel gebruiken…" (you may not use the Topotijdreis website commercially). It also forbids "het creëren van additionele functionaliteiten en afgeleide diensten" (creating additional functionality or derived services), and says other use needs prior written permission from Kadaster. It points to https://www.topotijdreis.nl/images/Algemene_voorwaarden_en_privacy.pdf (V).
- It is **not** CC BY or CC0 anywhere I could find.
- Kadaster sells prints and scans: https://www.kadaster.nl/producten/kaarten-en-luchtfoto-s/historisch (P; no prices or licence text shown).

## 2. PDOK, AHN and other Dutch government services
- **AHN WCS:** `https://service.pdok.nl/rws/ahn/wcs/v1_0` (V).
  - Coverages are `dtm_05m` and `dsm_05m`.
  - AccessConstraints: "Geen beperkingen; http://creativecommons.org/publicdomain/zero/1.0/" (no restrictions, CC0).
  - Test GetCoverage of `dtm_05m` with SUBSET x(192000,192500) y(420000,420500) returned a 1000×1000 float32 GeoTIFF.
  - The abstract says this is AHN4, flown 2020–2022, so it shows modern terrain (sand and gravel pits, the A73, Mookerplas and so on).
- **AHN WMS:** `https://service.pdok.nl/rws/ahn/wms/v1_0` (V). Layers are `dtm_05m`, `dsm_05m` and `kaartbladindex`, also CC0.
- **No historical topo series on PDOK.** I searched the Nationaal Georegister CSW (https://nationaalgeoregister.nl/geonetwork/srv/dut/csw) for Bonne, TMK and historical maps.
- **RCE "Historische kaarten" WMS:** `https://geoserver-bigdata.nieuwland.nl/RCE/wms` (V). Layers:
  - `BOSSTATISTIEK1`: 1st Forest Statistics 1938–1942, forest, heath and so on on a topo base. My GetMap over Groesbeek showed woods coloured on the Dutch side only; the Reichswald is uncoloured.
  - `Bonnebladen1900` (ca. 1900 editions)
  - `Waterstaatskaarten1`
  - `rce_tmk1850_pyramide`
  - CRS is EPSG:28992 or CRS:84.
- **RCE licences** (from the ISO metadata via the CSW):
  - Bosstatistiek: "Geen gebruiksbeperkingen; Naamsvermelding verplicht, Staatsbosbeheer, Stichting Bosdata, RCE" (no use restrictions; attribution to those three required), record d2f61107-d31e-4b89-803d-b39eaf2468b9 (V).
  - Bonnebladen1900: attribution "Kadaster, Wageningen Environmental Research, RCE" required (V).
- **Gemeente Nijmegen historic raster WMS:** `https://services.nijmegen.nl/geoservices/wms/extern_Historie_raster` (V).
  - Layers include `1930.ecw` (topographic map), `1936_lufo.ecw` (**1936 aerial mosaic of Nijmegen city; I fetched it and it works**), `1938.ecw` (Deckers city plan), `1949_lufo.ecw`, `1950.ecw` and `Nijmegen1950oorlogsschade.ecw` (war damage).
  - The city maps are CC BY 4.0 on data.overheid.nl, e.g. https://data.overheid.nl/dataset/odn-historische-kaart-1930--topografische-kaart- (V).
  - I found no dataset or licence record for the 1936/1949 aerial layers (U). The WMS says Fees/Access "None".
  - Coverage is the municipality only.

## 3. Wartime military maps (GSGS / AMS)
- **GSGS 4427 = AMS M831 "Holland 1:25,000"**, digitised at the LoC as set g6000m.gct00040.
  - Item record: https://www.loc.gov/item/2003630738/
  - Nijmegen (1943): https://www.loc.gov/resource/g6000m.gct00040/?sp=37
  - Groesbeek: https://www.loc.gov/resource/g6000m.gct00040/?sp=2
  - The contents list includes "Sheet 6 S.W. Nijmegen" and there are 1943 and 1944 editions (P; the LoC blocks scripted access with Cloudflare).
  - Rights: the LoC Geography & Map Division says digitised content is "free to use and reuse unless a Rights Advisory is present". AMS maps are US federal works (P).
- **British Library copy:** "Holland 1:25,000, Nijmegen", AMS M831 (GSGS 4427), at https://www.oldmapsonline.org/map/britishlibrary/5018269_6SW_1943 (P; returned 403 to me).
- **Sheet numbering (P):** a dealer's sheet list (https://www.battlefieldhistorian.com/gsgs-4427-series-holland-125000.asp) shows Nijmegen 6 SW (v1, v2, v3 West), Arnhem 6 NW, Druten 5 SE, Os 11 NE and 's-Hertogenbosch 11 SW. Groesbeek is probably 6 SE and the Grave/Mook area is probably 11 NE / 12 NW, but **unconfirmed**. This dealer sells £20 reproductions, so it is not an open source.
- **Eastern Holland 1:25,000 (GSGS 4414 / AMS M832):** LoC https://www.loc.gov/resource/g6000m.gct00041/ and McMaster's index https://library.mcmaster.ca/maps/index-wwii-eastern-holland-125000-scale-maps (P; the index's town list does not include Nijmegen).
- **Germany 1:25,000 (GSGS 4414 / AMS M841, on Messtischblatt numbering):**
  - LoC https://www.loc.gov/item/2008625027/ and https://www.loc.gov/resource/g6080m.gct00113b/
  - British Library "Germany 1:25,000, Kleve" sheet 4202 (1955 edition): https://www.oldmapsonline.org/map/britishlibrary/4998803_4202_1955 (P)
- **McMaster:** the WWII topo collection offers 600 dpi TIFF downloads "for non-commercial purposes only" under a Creative Commons licence; I could not read which version (P). Pages: https://library.mcmaster.ca/maps/ww2/ww2_topos_home.htm and https://library.mcmaster.ca/wwii-topographic-map-series-france-belgium-holland. All McMaster pages returned 403 to me. The series list there gives GSGS 2541 as 1:100,000 France/Belgium/Holland, not 1:25k.
- **UT PCL:** has Holland 1:100,000 (AMS M631 and M641), e.g. sheet 5 's-Hertogenbosch at https://collections.lib.utexas.edu/catalog/utlmaps:d8c5e837-275a-462e-9360-260c2f6e6a08. I found **no** Holland 1:25k or 1:50k at UT (P; the site blocks bots).
- **NLS (maps.nls.uk):** no Holland or Lower Rhine WWII coverage found. Its non-UK GSGS holdings are mainly Belgium and France (https://maps.nls.uk/international/) (P).
- **Wikimedia Commons:** no GSGS 4427 or M831 Nijmegen sheets found. The M841 category has no Kleve sheets, and the Messtischblatt row-42 category starts at 4206 (V via API).
- **Copyright in GSGS:** British Crown copyright in published works runs 50 years from publication, so 1943–45 sheets should be expired (P; https://www.legislation.gov.uk/ukpga/1988/48/schedule/1/crossheading/crown-copyright).

## 4. German Messtischblatt (TK25) for Kleve and the Reichswald (V, best German source)
- **`https://www.wms.nrw.de/geobasis/wms_nw_tk25_1936-1945`**, layer `nw_tk25_1936-1945`.
  - These are DTK25 sheets updated 1936–1945.
  - It renders only at scales 1:2,000–1:27,000 (about 7.5 m/px or finer); coarser requests come back blank.
  - CRS options include EPSG:25832 and EPSG:28992.
  - I fetched images over Kranenburg/Frasselt and over Grafwegen/Groesbeek. They show the Reichswald, and sheet 4201 also shows the Dutch side around Groesbeek.
- **`https://www.wms.nrw.de/geobasis/wms_nw_neuaufnahme`** (1891–1912) is also available. Its layer `nw_neuaufnahme_info` answers GetFeatureInfo with sheet numbers.
- **Relevant sheets** (from GetFeatureInfo):
  - 4101 Zyfflich
  - 4201 Grafwegen (Wyler / Groesbeek border)
  - 4202 Kleve (Kranenburg and northern Reichswald)
  - 4302 Goch (southern Reichswald)
- **Licence:** "Datenlizenz Deutschland – Zero 2.0" (https://www.govdata.de/dl-de/zero-2-0), which allows any use with no attribution required (V).
- **Deutsche Fotothek:** its Saxon Messtischblätter are CC BY-SA 4.0, but I found no Kleve-area sheets there (U).
- There is no historical-map download directory on OpenGeodata.NRW; the `/geobasis/hist/` path returned nothing.

## 5. Bonnebladen scans
- **DANS** "Chromo-Topographische Kaart des Rijks (1:25.000). Bonnebladen [scans]", DOI https://doi.org/10.17026/DANS-XMD-R6P4: all 706 sheets, 1866–1953 editions, 300 dpi TIFF (a georeferenced version is a separate dataset). Licence is the "DANS Licence"; **access is restricted to Dutch academic staff and students** (V via the Dataverse API).
- **WUR "Geogerefereerde Bonnebladen"** (around 1900 editions): https://data.overheid.nl/dataset/54350-geogerefereerde-bonnebladen. Licence unknown, access restricted, ordered via geodesk@wur.nl (P).
- I did not confirm Utrecht, Leiden, Delpher or Gelders Archief scans (U). TU Delft says its Bonne sheets are not online (https://www.tudelft.nl/en/library/collections/map-room/map-collection/historical-maps/bonne-maps-1865-1930) (P).

## 6. Aerial photos 1944–45
- **WUR RAF collection:** 94,257 photos, mostly Sept 1944 to May 1945. Geoportal https://library.wur.nl/WebQuery/geoportal/raf (responds 200). Free 150 dpi download; higher resolution is paid. Source: https://wur.nl/en/article/About-the-RAF-aerial-photographs-1943-1947.htm (P).
  - Records are labelled "Crown Copyright" with holder Wageningen UR.
  - That page's CC BY-NC 4.0 statement applies to a different collection (IMAG photos), not the RAF photos.
  - UK Crown copyright on photos taken before June 1957 has likely expired, but **WUR's own reuse terms are unconfirmed** (U).
- **NCAP:** paid licences per use; personal research is free (https://www.ncap.org/licence-terms, https://ncap.org/products-services/licensing). Restrictive (P).
- **Kadaster:** WWII aerial photos 1939–1947 are orderable (https://www.kadaster.nl/producten/kaarten-en-luchtfoto-s/historisch/luchtfoto-s); price and licence for the WWII set are not stated (P).
- **Regionaal Archief Nijmegen beeldbank:** open data listed as CC BY 4.0 (https://data.overheid.nl/dataset/odn-beeldbank). Per-image rights vary (P).

## 7. Modern open vector and elevation data
- **OpenStreetMap:** ODbL. "free to copy… as long as you credit OpenStreetMap and its contributors"; share-alike applies to derived databases. Source: https://www.openstreetmap.org/copyright (V).
- **SRTMGL1 v003 (1 arc-second):** "openly shared, without restriction"; DOI 10.5067/MEASURES/SRTM/SRTMGL1.003. Sources: https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003 and https://www.usgs.gov/centers/eros/science/usgs-eros-archive-data-use-and-citation (P; the page itself returned 403).
  - AWS terrain tiles: `https://s3.amazonaws.com/elevation-tiles-prod/skadi/N51/N51E005.hgt.gz` and `.../N51E006.hgt.gz` both return 200 (V).
  - Note that the terrain-tiles set mixes in EU-DEM for Europe and has its own attribution list: https://github.com/tilezen/joerd/blob/master/docs/attribution.md (V).
- **Copernicus DEM GLO-30:** free licence.
  - Required notice: "© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS". If you modify the data, use "produced using Copernicus WorldDEM-30 …" instead.
  - Licence page: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM (V).
  - Tiles `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N51_00_E005_00_DEM/Copernicus_DSM_COG_10_N51_00_E005_00_DEM.tif` and the `E006` equivalent both return 200 (V).
  - It is a surface model (DSM), so trees and buildings are included.
- **NRW DGM1:** 1 m GeoTIFF tiles at `https://www.opengeodata.nrw.de/produkte/geobasis/hm/dgm1_tiff/dgm1_tiff/`, e.g. `dgm1_32_290_5740_1_nw_2024.tif`. There are 88 tiles in the 290–299 km × 5740–5749 km block.
  - WCS: `https://www.wcs.nrw.de/geobasis/wcs_nw_dgm`, coverage `nw_dgm`.
  - Licence dl-de/zero-2.0 (V). This is also modern terrain.

## Sources table
| Source | Coverage | Date shown | Format / endpoint | Licence | Reuse notes | Conf. |
|---|---|---|---|---|---|---|
| Topotijdreis 1944 | All NL in the AOI | ~1937–43 editions | ArcGIS tiles/WMTS, EPSG:28992 | "Free with credit: Kadaster" vs FAQ "no commercial use or derived services" | Get written confirmation for commercial use | V (licence conflict) |
| NRW TK25 1936–45 | DE side plus border NL (4101/4201/4202/4302) | 1936–45 | WMS wms.nrw.de | dl-de/zero-2.0 | Any use | V |
| RCE Bosstatistiek | NL | 1938–42 | WMS geoserver-bigdata.nieuwland.nl/RCE | Attribution SBB / Bosdata / RCE | Woods, heath, orchards | V |
| Nijmegen historic WMS | Nijmegen municipality | 1930, 1936 aerial, 1938, 1949–50 | WMS services.nijmegen.nl | CC BY 4.0 (maps); aerials U | | V / U |
| AHN4 | NL | 2020–22 | PDOK WCS/WMS, 0.5 m | CC0 | Modern terrain | V |
| NRW DGM1 | DE | ~2022–24 | GeoTIFF / WCS | dl-de/zero-2.0 | Modern terrain | V |
| GSGS 4427 / M831 | NL 1:25k | 1943–44 | LoC scans | US PD / LoC free reuse | Nijmegen = Sheet 6 SW | P |
| GSGS 4414 / M841 | DE 1:25k | 1943+ | LoC / BL scans | As above | Kleve = 4202 | P |
| McMaster WWII | Various | 1940s | 600 dpi TIFF | CC, non-commercial | Version unread | P |
| DANS Bonnebladen | NL | 1866–1953 | TIFF / GeoTIFF | DANS licence, restricted | Academic only | V |
| WUR RAF photos | NL | 1943–47 | Geoportal | Crown copyright; WUR terms unclear | 150 dpi free | P / U |
| NCAP | Various | WWII | Paid | Restrictive | | P |
| OSM | All | Current | PBF etc. | ODbL | Attribution, share-alike | V |
| SRTMGL1 / terrain tiles | All | 2000 | HGT | Unrestricted (USGS); terrain tiles mixed | | P / V |
| Copernicus GLO-30 | All | 2011–15 | COG on S3 | Free, required notice | DSM | V |

## Could not confirm
- GSGS 4427 sheet numbers for Groesbeek and Grave.
- Exact Topotijdreis edition years per sheet (only inferred from tile changes).
- LoC per-sheet Rights Advisory and direct image URLs.
- McMaster's exact CC licence version and whether it holds Nijmegen-area sheets.
- WUR's reuse terms for RAF photos.
- Licence of the Nijmegen 1936/1949 aerial layers.
- Any Deutsche Fotothek, Utrecht or Leiden scans for this area.

The LoC, McMaster, UT PCL, NLS and OldMapsOnline sites all blocked automated access (Cloudflare, 403, Anubis or human verification), so those entries rest on search snippets.

Test images I fetched are in C:\Users\LUKE~1.MAC\AppData\Local\Temp\claude\c--Users-luke-macmillan-WW2Hex\6918b2e5-b058-4c20-a867-52a527aaa703\scratchpad (e.g. k_wyler.jpg, bos.jpg, nijm1936.jpg, ahn_groesbeek.tif, tiles\grave_b.jpg).

## RCE BOSSTATISTIEK1 legend
- **GetLegendGraphic URL:** `https://geoserver-bigdata.nieuwland.nl/RCE/wms?service=WMS&version=1.3.0&request=GetLegendGraphic&format=image/png&layer=BOSSTATISTIEK1` (returns HTTP 200, a 337-byte PNG) (V).
- **It does not give class colours.** The image is GeoServer's generic 20×20 blue checkered "raster" swatch. The layer is a scanned map with the default `raster` style, so the service has no class legend (V). The capabilities document lists no separate LegendURL.
- **Colours I saw in the GetMap over Groesbeek–Mook–Cuijk** (RD bbox 188000,414000,200000,424000) (V as observed):
  - dark green
  - mid green
  - light yellow-green
  - lilac/purple patches
  - dark brown blocks (e.g. east of Groesbeek near Breedeweg, and south of the St. Jansberg area)
  - small red, blue, orange and yellow patches and line features (likely roadside planting and boundaries)
  - an uncoloured cream/beige topo base for non-wooded land and for the German side (Reichswald)
- **Which colour means which class is unconfirmed (U).** The source document is *De Nederlandsche Boschstatistiek* (SBB, 1946), referenced in the RCE metadata record d2f61107-d31e-4b89-803d-b39eaf2468b9. Its legend would be needed to map colours to forest, heath, drift sand, peat/marsh, orchard and roadside planting. My guess that the dark and light greens are forest types and lilac is heath is provisional (P).
