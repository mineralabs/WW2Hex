# Allied forces: Arnhem, 17–18 September 1944

Research notes for the WW2Hex Arnhem scenario. The scenario runs from 13:00 on 17 Sep 1944 (the first
gliders land on LZ S) to about 21:00 on 18 Sep 1944: 16 turns of 2 hours. It covers the 1st British
Airborne Division's first and second lifts, the march on the Arnhem road bridge, the fight at the
bridge, and the fighting in western Arnhem and Oosterbeek. The map runs from Ginkel Heath and Renkum
(west) to the Arnhem road bridge and the eastern edge of the town (east), and from the Amsterdamseweg
(north) to the Neder Rijn (south). Hexes are about 1 km and counters are battalions.

**Status of this file: provisional.** Much of it now rests on the unit war diaries, which the Pegasus
Archive has transcribed. Even so, no unit here should be marked `verified` in a scenario file until
the open questions at the end are checked, above all the per-lift strengths and gun counts.

## How to read this file

- **Confidence labels.** Each unit has three labels, in the order location / strength / equipment:
  - **V** (verified): two or more good sources agree. A unit war diary plus the divisional report
    counts as two only when they are clearly independent (different authors, different detail).
  - **P** (provisional): one source, or an estimate whose basis is stated.
  - **U** (unknown).
- **Coordinates** are WGS84 decimal degrees and good to roughly ±300 m unless stated. They are not
  quoted from the sources. Most were converted from the 1944 grid references in the war diaries
  (GSGS 4427 1:25,000 sheets) with the fit given in section 8. The rest come from OpenStreetMap place
  positions [OSM], or are estimates whose basis is given.
- **Source keys** in square brackets, such as [DIV-R], are listed with their URLs under "Sources" at
  the end. Keys marked (S) are secondary.
- **"Estimate"** means I worked the number out myself, and the basis is given beside it. Every other
  number comes from a cited source.
- **Strength.** "Went in" is the total that reached the battle over all lifts, from the Pegasus
  Archive table, which is taken from Middlebrook's *Arnhem 1944* [PA-OOB]. It does **not** tell you
  how many arrived on each lift. Per-lift figures are estimates unless a diary gives them.
- **Times** are British "A" time (GMT+1), as used in all the 1st Airborne orders and diaries
  [1PB-WD, para 31; 2PARA-WD]. British Double Summer Time ended on 17 Sep 1944. German sources use
  German summer time (GMT+2), so **German times are one hour later than British times for the same
  event** (P: basis is the British orders stating "A" time = GMT+1. Check against the German-side
  research before merging the timelines). Some secondary sources mix the two clocks, which explains
  some one-hour conflicts below.
- **Light (17/18 Sep, "A" time)** [1PB-WD; 2PARA-WD]: sunset 18:47, last light 19:41, moonset 19:13
  (new moon 17 Sep), first light 05:19, sunrise 06:13. Turns starting 19:00 to 05:00 are night turns.

---

## 1. Summary for scenario design

1. **On the map at the start (13:00, 17 Sep).** Nothing Allied is on the ground except the 186
   pathfinders of the 21st Independent Parachute Company, who dropped at 12:40 [PA-FL; STEER].
   The first lift lands during the first turn:
   - Gliders on **LZ S** (1st Airlanding Brigade) from 13:00, and on **LZ Z** (Div HQ, divisional
     troops, the 1st Para Brigade's vehicles and guns) from about 13:20–13:40 [PA-FL; DIV-R].
   - The 1st Parachute Brigade jumps on **DZ X** from about 13:50 to 14:10 [PA-FL; 1PARA-WD;
     3PARA-WD]. 2,283 men jumped on DZ X [PA-FL].
   - About **5,200 men** landed on 17 Sep [RAFM3]. 284 of 320 gliders arrived [RAFM3; PA-FL].
2. **First-day plan.** The 1st Para Brigade marches on the bridge by three routes: **LION**
   (2 Para, river road), **TIGER** (3 Para, Utrechtseweg), **LEOPARD** (1 Para, Amsterdamseweg). The
   Reconnaissance Squadron tries a jeep coup de main. The 1st Airlanding Brigade stays west to hold the
   zones for the second lift [1PB-WD; DIV-R].
3. **What happened on 17 Sep.**
   - The Recce Squadron was ambushed by Krafft's battalion just east of Wolfheze at about 16:00 and
     gave up the coup de main [RECCE-WD; STEER].
   - 1 Para was stopped on the Amsterdamseweg by armour and infantry (Spindler/Weber; see section 4)
     and spent the night in the woods south of the road [1PARA-WD; 1PB-WD].
   - 3 Para was stopped by Krafft's battalion near the Bilderberg and spent the night about the
     Hartenstein crossroads, with Urquhart and Lathbury [1PB-WD; DIV-R].
   - **2 Para reached the north end of the road bridge at about 20:00** (A Company), followed by
     Battalion HQ and Brigade HQ by about 21:30. About **740 men** were there by the morning of
     18 Sep [1PB-WD; DIV-R; MSW; WIKI-A].
4. **18 Sep.**
   - Gräbner's 9th SS Reconnaissance Battalion attacked across the bridge from about 09:00–09:30
     and was beaten off in about 2 hours, losing about 10–12 vehicles [DIV-R; PA-BR18; HN-GUN].
   - 1 Para, 3 Para (split in two) and the first-lift half of 2nd South Staffords fought through
     western Arnhem and were held near the St Elisabeth Hospital, about 2 km short of the bridge
     [DIV-R; 1PARA-WD; STAFFS-WD].
   - Urquhart was cut off in a house near the hospital from the afternoon of 18 Sep until 07:00 on
     19 Sep. Brigadier Hicks commanded the division from 09:15 [DIV-R].
   - **The second lift** was due at 10:00 but fog in England delayed it about 4–5 hours. It arrived
     between about 14:00 and 15:15 [DIV-R; 4PB-WD; 156-WD; PA-SL]. 4th Para Brigade (1,914 men)
     jumped on **DZ Y** (Ginkel Heath). Gliders landed on **LZ S** (69) and **LZ X** (204)
     [PA-SL].
   - The 11th Para Bn and the second half of the South Staffords were sent into Arnhem. 156 and 10
     Para Bns moved east along the railway and were stopped that night at the Spindler line
     (Dreijenseweg) [DIV-R; 156-WD].
   - **Resupply:** 33 Stirlings dropped 87 tons (net). About 12 tons were collected, plus 14 tons
     from 3 bulk-loaded Hamilcars [DIV-R App. D and E].
5. **Not available in the scenario window.**
   - 1st Polish Independent Parachute Brigade: none of it arrives. The Polish glider element,
     including the anti-tank battery, was planned as 35 Horsas on the third lift [DIV-R]. It landed
     on LZ L on the afternoon of **19 Sep** [4PSQN-WD; 2ATB-WD]. The parachute battalions jumped at
     Driel on **21 Sep**.
   - XXX Corps does not reach the area in the window. Guards Armoured reached Grave and Nijmegen on
     19 Sep.
   - The divisional seaborne tail (250 Coy RASC's main body and the transport) got no further than
     Nijmegen [250-WD; STEER].
6. **A "historical" position at 21:00 on 18 Sep** is described in section 7.3.

---

## 2. 1st British Airborne Division (Maj Gen R. E. Urquhart)

Side: allied. Parent: I Airborne Corps (Browning), First Allied Airborne Army.

### 2.1 Establishments used for estimates

- **Parachute battalion (1944).**
  - Three rifle companies of three platoons, plus HQ and Support Company [STEER; WIKI-5PB].
  - Support weapons: the sources disagree.
    - [STEER]: a platoon of **six 3-in mortars** and a platoon of **eight Vickers MMGs**.
    - [WIKI-5PB] (several Wikipedia battalion articles): **eight 3-in mortars, four Vickers,
      ten PIATs**.
    - The britishmilitaryhistory.co.uk chart shows 4 mortars, 4 Vickers and 10 PIATs (via search
      extract only).
    - Use 6–8 mortars and 4–8 MMGs, and check WE (Airborne) tables.
  - Anti-tank: PIATs only. A 6-pdr troop of the anti-tank battery was attached to each battalion
    [1PB-WD; STEER].
  - Two Bren carriers per battalion, landed by Hamilcar [STEER].
  - Strength: Middlebrook gives an average of **548 all ranks** for the parachute battalions at
    Arnhem [MID-X]. That figure is quoted only through a search extract.
- **Airlanding (glider) battalion (1944).**
  - Four rifle companies of four platoons. Each platoon of about 26 men was one Horsa load
    [STEER; WIKI-ALB].
  - Support Company [STEER; WIKI-ALB]:
    - Two mortar platoons: **12 × 3-in mortars**.
    - Two MMG platoons: **16 Vickers** [STEER]. The vickersmg.blog page gives 8 guns per platoon
      [VMG].
    - Two anti-tank platoons: **8 × 6-pdr**.
  - Establishment about **806** [WIKI-ALB]. Middlebrook's average landed at Arnhem was **773**
    [MID-X].
  - The lift took **62 Horsas and 1 Hamilcar** (Hamilcar = the battalion's two carriers) [WIKI-ALB].
- **Divisional anti-tank guns.**
  - [STEER] says **52 × 6-pdr** in total: 24 with the three airlanding battalions and 28 with the
    two Royal Artillery batteries.
  - **16 × 17-pdr**: two troops of four in each battery [STEER; AJ-17].
  - The battery diaries confirm the split:
    - 1st Airlanding A/Tk Battery: four 6-pdr troops (A, B, C, Z) and two 17-pdr troops (D, P)
      [1ATB-WD; PA-1ATB].
    - 2nd (Oban) Battery: three 6-pdr troops (E, G, H) and two 17-pdr troops (F, X) [2ATB-WD].
    - So: 16 + 12 = 28 × 6-pdr, and 8 + 8 = 16 × 17-pdr (estimate from the troop lists at 4 guns a
      troop. [4PB-WD] confirms "12 × 6 pr, 4 × 17 pr" for the 2nd Battery less one 17-pdr troop).
- **1st Airlanding Light Regiment RA.** Three batteries of two troops of four guns:
  **24 × 75-mm pack howitzers** [WIKI-LR; PA-LR].
- **Recce Squadron.** Jeeps with Vickers K guns, five men per jeep, sections of two jeeps, three
  sections per troop [STEER]. A Middlebrook-based forum post gives three troops of eight jeeps plus
  four 9th Field Coy RE jeeps for the coup de main [TFT] (S). Squadron total "went in": 181 [PA-OOB].
- **Rations and ammunition carried.** Two 24-hour ration packs and one emergency ration per man, one
  box of Compo per glider, fuel for 350 miles per vehicle, first-line ammunition plus extra carried in
  containers, RASC jeeps and bulk-loaded Hamilcars. The plan assumed link-up with ground forces after
  **four days** [DIV-R, para 211].

### 2.2 Lift totals

| Lift | Aircraft / gliders | Delivered | Sources |
|---|---|---|---|
| Pathfinders, 17 Sep 12:40 | 12 Stirlings | 186 men of 21 Indep Para Coy (6 officers, 180 men): Coy HQ and one platoon on LZ S, one platoon each on DZ X and LZ Z | [PA-FL; STEER] |
| First lift, 17 Sep | Plan: 143 C-47 (paras), 358 tugs, 345 Horsa + 13 Hamilcar [DIV-R]. RAF figures: 161 para aircraft, 320 tugs and gliders, 284 gliders arrived [RAFM3] | 2,283 paras on DZ X (4 refused, 1 killed) [PA-FL]. LZ S: 153 gliders sent, 134 arrived. LZ Z: 167 sent, 150 arrived [PA-FL; STEER]. About 5,200 men in total [RAFM3] | V (glider count), P (men) |
| Second lift, 18 Sep | Plan: 126 C-47, 301 tugs, 284 Horsa + 17 Hamilcar [DIV-R] | 1,914 men of 4th Para Bde on DZ Y; about 32 killed on the drop; one C-47 of 156 Bn's MG platoon shot down (19 paratroopers killed) [PA-SL]. 273 gliders approached: 69 to LZ S, 204 to LZ X [PA-SL]. RAF Museum figures differ (201 of 223 at LZ X and 189 of 215 at LZ S, from a garbled table) [RAFM4] | P |
| Resupply, 18 Sep | 33 Stirlings (35 planned) [DIV-R App. D; PA-SL]. RAF Museum says 35 [RAFM4] | 87 tons net (144 gross) dropped; about 12 tons (14%) collected. 2 aircraft lost (6%) [DIV-R App. D, E] | V (tons), P (losses) |
| Third lift, 19 Sep (outside window) | Plan: 114 C-47 (Poles), 35 tugs, 35 Horsas [DIV-R] | Polish glider element landed on LZ L, 19 Sep afternoon | — |

Second lift timings. All are "A" time; they span 14:00 to 15:15:

- 156 Bn jumped at 14:00 [156-WD]. 4th Para Bde HQ dropped at 14:20 [4PB-WD]. 4th Para Sqn RE
  dropped at 14:20 [4PSQN-WD]. 11 Bn dropped "at approx 1430" [11PARA-WD].
- 7 KOSB says "between 1400 and 1500" [KOSB-WD].
- Gliders: 2 Wing GPR at 14:15 [2GPR-WD]; HQ RASC at 14:15 [RASC-WD]. Div HQ log 15:15 [DIV-R].
- First paratroopers 15:09 [PA-SL]. Light Regt's 2 Bty: 17:00 [LTREGT-WD], which is probably the
  time it reached its position.
- **For the game: the second lift arrives in the 13:00–15:00 turn of 18 Sep.**

---

## 3. Units, battalion by battalion

Movement class for all parachute and airlanding infantry: **foot**. Each battalion had a few jeeps,
trailers, handcarts and two carriers. Glider-borne jeeps, 6-pdrs and carriers often went by
different routes from the infantry, and on 18 Sep they lost touch (3 Para) [1PB-WD].

"13:00 17 Sep" means the hex where the unit lands during the first turn. Coordinates for the zones
are in section 8.

### 3.1 1st Parachute Brigade (Brig G. W. Lathbury)

The brigade went in with 1st Para Sqn RE, 16 Para Field Ambulance, a Provost section, the 1st
Airlanding A/Tk Battery (12 × 6-pdr and 4 × 17-pdr under command; Z Troop stayed under the CRA) and
the Recce Squadron (less one troop) under command. 3rd Light Battery (8 × 75-mm) was in support
[1PB-WD App. A].
The glider element was 20 Horsas and 3 Hamilcars, landing on LZ Z [2PARA-WD; 1PB-WD O.O. No. 1].
Lathbury reported that the battalions were "about 100 per cent strength except for a few 3"
mortars and P.I.A.Ts", and that 11 of 12 brigade 6-pdrs arrived [1PB-WD App. A, para 5].

| Unit | Landed (zone, time) | Went in | Main equipment | 13:00 17 Sep | Nightfall 17 Sep | 18 Sep | Conf (L/S/E) |
|---|---|---|---|---|---|---|---|
| 1st Para Bde HQ and Defence Platoon | DZ X about 14:00; transport on LZ Z | 82 [PA-OOB]. With signals about 110 at the bridge [MSW] | Wireless jeeps (Lathbury's went with 3 Para) | DZ X | HQ (less Lathbury) at the bridge from about 21:30 (with 1st Para Sqn RE) [1PSQN-WD; 1PB-WD]. Lathbury spent the night with 3 Para at 690784 (51.989, 5.828) [1PB-WD] | At the bridge. Lathbury wounded in the afternoon near the hospital; Frost took over the whole bridge force [DIV-R; MSW] | V / P / P |
| 1st Para Bn (Lt Col D. T. Dobie) | DZ X 14:03–14:08 [1PARA-WD] | 548 [PA-OOB]. "Full strength except for three men" at 14:45 [1PARA-WD] | Para Bn establishment, plus A Troop 1 A/Tk Bty (4 × 6-pdr) and a section of 17-pdrs [1PB-WD O.O.] | DZ X | Moved from RV about 15:40–16:00 via Wolfheze station (665805) and north up Wolfhezerweg. R Coy was hit at 675820 (52.021, 5.807) about 17:00–18:00 and lost about 50%. The rest of the battalion was blocked from the Amsterdamseweg by "5 tanks and approx 15 half-tracks" and spent the night in the woods at about 690809 (52.011, 5.828) [1PARA-WD; 1PB-WD] | Left at 01:00 for the south without R Coy. Fought at road junction 709783 (51.988, 5.856) at 04:30. At 05:30 got Frost's call for help through the FOO and bypassed south. Fought along the railway, Den Brink and the river road through the day. T Coy was down to 22 men. By 18:30 "approx 100 men left" and almost no ammunition, just west of the hospital (51.984, 5.884). At 20:00 met the South Staffords, with R Coy (about 40 men) [1PARA-WD; DIV-R] | V / V / P |
| 2nd Para Bn (Lt Col J. D. Frost) | DZ X about 13:45–14:00; glider element (incl. jeeps) on LZ Z | Parachute element: **31 officers and 478 ORs took off** [2PARA-WD]. 481 [MID-X] or 525 [PA-OOB] "went in" (conflict; see section 9) | Para Bn establishment, plus B Troop 1 A/Tk Bty (4 × 6-pdr), B Troop 1 Para Sqn RE with three flame-throwers, and a section of 16 PFA [1PB-WD O.O.] | DZ X; RV at X-tracks 643783 (51.988, 5.760) [2PARA-WD] | Left the RV about 15:00–15:30 by LION: Heelsum, the lower road through Heveadorp and Oosterbeek, the railway at 712774. C Coy went for the railway bridge (707764), which was blown in its face. B Coy cleared Den Brink (51.987, 5.876). **A Coy reached the north end of the road bridge about 20:00** (19:30 [PA-2B17]; 20:30 [DIV-R]). Grayburn's platoon attacked the south end at 20:45 and failed. A second attempt with RE flame-throwers about 22:00 set fire to an ammunition store [1PB-WD; 1PSQN-WD; PA-2B17]. C Coy was trapped in a hotel overnight [1PB-WD] | At the bridge, holding the north end. B Coy (less one platoon, about 70 men) arrived about 05:00. C Coy broke up; Pegasus says about 100 under Major Dover surrendered [PA-BR18]. Gräbner's attack 09:00–11:30 was beaten off. An attack from the east in the afternoon by infantry and 2 tanks was held; both tanks knocked out. Houses burned at dusk [DIV-R; 1PB-WD] | V / P / V |
| 3rd Para Bn (Lt Col J. A. C. Fitch) | DZ X about 14:00 [3PARA-WD] | 588 [PA-OOB] | Para Bn establishment, plus C Troop 1 A/Tk Bty (4 × 6-pdr), C Troop 1 Para Sqn RE, a section of 16 PFA [1PB-WD O.O.] | DZ X | Left about 15:00 by TIGER (Utrechtseweg). At about 16:30–17:00 B Coy shot up Kussin's car and met Krafft's battalion near 683785 (51.990, 5.818); the leading 6-pdr was knocked out. Mortared heavily about 18:00. Halted for the night about 19:30 at about 690784 (51.989, 5.828), the Hartenstein crossroads, with Urquhart and Lathbury. Casualties 4 killed and 35 wounded. **C Coy** went by the railway to Arnhem station and reached the bridge about midnight. About 45 men got there; the leading platoon was ambushed [1PB-WD; 3PARA-WD; MSW] | Moved at 04:30 by LION. Split in the dark: B Coy, Bn HQ and the RE troop reached about 300 yd west of the hospital about 06:30. A Coy, HQ Coy (mortars, MMGs), 3 of 4 6-pdrs and the GOC's and Lathbury's wireless jeeps went astray and joined 1 Para. The only 6-pdr with the front half was lost to an 88. B Coy group held about 6 houses near 730780 (51.985, 5.886) all day; about 20–40 men of A Coy got through about 14:30–15:00. Strength about 130–140 at 14:00. Dark: still near the hospital [DIV-R; 1PB-WD; 3PARA-WD] | V / P / P |
| 1st Airlanding A/Tk Battery RA (Maj W. F. Arnold) | LZ Z on 17 Sep about 14:00, less 5 gliders. The 5 came on 18 Sep at 15:00 [1ATB-WD] | 191 [PA-OOB] | **17 Sep:** One 6-pdr landed 20 miles short and two 17-pdrs crashed on landing [1ATB-WD]. Z Troop lost one gun on a Dutch island; its other three came under the CRA. So about 14 × 6-pdr reached the RV (11 with the brigade [1PB-WD], 3 of Z Troop) and probably 6 × 17-pdr (estimate: 8 flown [AJ-17; AJ-HAM] less the 2 that crashed). Arnhem Jim says 2 more Hamilcars were lost en route, which would leave 4 (conflict) | A, B, C Troops with 1, 2 and 3 Para respectively; Z Troop and the 17-pdrs with Div | **Bridge:** B Troop (4 × 6-pdr) and probably one gun of C Troop, about 40 men [PA-BR18; MSW; WIKI-A]. A Troop with 1 Para. C Troop mostly with 3 Para's lost rear half | 18 Sep: guns with 1 Para and 3 Para fought in western Arnhem. Two 17-pdrs were later guarding the Light Regt at Oosterbeek church [AJ-17]. On 19 Sep the guns in the Div HQ area were grouped as the "17-pdr Group" [1ATB-WD] | P / V / P |
| 1st Parachute Sqn RE (Maj D. Murray) | DZ X 14:00, 90% at the RV [1PSQN-WD] | 143 [PA-OOB] | 3 flame-throwers per troop (A and B), demolition stores | DZ X | HQ, A Tp and B Tp went with Bde HQ and 2 Para along LION. Ambushed around the pontoon bridge (20:30–21:30). Reached the road bridge 21:30–22:00 and occupied houses east of the ramp and the Van Limburg Stirum school. About 75 at the bridge [MSW]. C Tp (Cox) was with 3 Para; C Tp (George) laagered on the DZ [1PSQN-WD] | Held the school and houses east of the ramp. At first light Murray found the bridge "not prepared for demolition" [1PB-WD] | V / P / P |
| 16 Para Field Ambulance (Lt Col E. Townsend) | DZ X | 135 [PA-OOB] | — | DZ X | Brigade dressing station opened at the St Elisabeth Hospital (727779) on the evening of 17 Sep [1PB-WD] | At the hospital, which was overrun on 18 Sep and changed hands. Treat it as non-combat | P / V / – |

### 3.2 Reconnaissance Squadron and the coup de main

| Unit | Landed | Went in | Equipment | 13:00 17 Sep | Nightfall 17 Sep | 18 Sep | Conf |
|---|---|---|---|---|---|---|---|
| 1st Airborne Reconnaissance Sqn (Maj C. F. H. Gough) | Glider element on LZ Z 13:35; paratroops on DZ X about 14:10 [RECCE-WD] | 181 [PA-OOB] | Jeeps with Vickers K. About 28 jeeps (estimate: 3 troops × 8, plus HQ [TFT]); check. One glider with 2 jeeps did not arrive [RECCE-WD]. **The "lost jeeps" story is false:** Urquhart was wrongly told at about 15:20 that most of the transport had been lost [STEER] | LZ Z / DZ X | Left about 15:30–15:40 along the track north of and beside the railway: C Troop leading, then Tac HQ, D Troop and Support Troop. A Troop reported to Div HQ [RECCE-WD; STEER]. **C Troop was ambushed** on Johannahoeveweg just east of Wolfheze (about 52.006, 5.800; estimate from [STEER]'s description of the tunnel under the railway) about 16:00 by Krafft's reserve platoon. It lost 2 jeeps (Bucknall's and McGregor's) and about 7 killed and 4 captured [BOA-RECCE; STEER]. The squadron withdrew. **Gough with 2–3 HQ jeeps** went round by LION and reached the bridge in the evening [BOA-RECCE; WIKI-A]; about 8 recce men were at the bridge [MSW]. The rest of the squadron was in Div reserve. One troop held posts in the wood south of Reijersheide (6781; about 52.016, 5.806) watching the Amsterdamseweg [DIV-R; 1ALB-WD] | 06:30: the squadron less C Troop recced the Utrechtseweg; under fire at 708782 (51.987, 5.855) from 08:00 and fought dismounted all day. Night at 692785 (51.990, 5.831), near the Hartenstein [RECCE-WD] | V / V / P |

### 3.3 1st Airlanding Brigade (Brig P. H. W. Hicks; acting GOC from 09:15 18 Sep)

All three battalions landed on **LZ S** (Border's diary gives the LZ as "6581"; it is the same area).
Brigade HQ opened at 664806 (52.008, 5.791) by about 16:00 [1ALB-WD; DIV-R]. On the evening of
18 Sep the HQ moved to the Bilderberg (6878; about 51.990, 5.818) [1ALB-WD]. Hilaro Barlow was
deputy commander; he commanded the brigade while Hicks led the division [WIKI-ALB; 1ALB-WD].

| Unit | Landed | Went in | Equipment | 13:00 17 Sep | Nightfall 17 Sep | 18 Sep | Conf (L/S/E) |
|---|---|---|---|---|---|---|---|
| 7th (Galloway) Bn KOSB (Lt Col R. Payton-Reid) | LZ S about 13:30. **56 gliders; 8 failed to arrive.** One platoon was taken prisoner near the Dutch coast [KOSB-WD; PA-FL] | 765 [PA-OOB]. Estimate about 680 on 17 Sep (765 less about 3 platoons and part-loads in the 8 missing gliders). Some sub-units came on 18 Sep (Lt Doig's and Lt Waite's platoons) [KOSB-WD] | Airlanding establishment. On landing: "Atk – three guns short", and one more 6-pdr broken in its glider, so about 4–5 serviceable 6-pdrs (estimate); mortars "four dets short"; MMG "1 Pl short" [KOSB-WD] | LZ S | Covered DZ Y (Ginkel Heath) [KOSB-WD; 1ALB-WD]: <br>• A Coy at Planken Wambuis on the Amsterdamseweg (6683; about 52.034, 5.790). Ambushed SS Wach Bn 3 lorries; Germans report 25 dead and 60 wounded [PA-FL]. <br>• B Coy and C Coy on the west side of the DZ facing Ede. <br>• Bn HQ at the south end of the DZ, by the unfinished motorway embankment. <br>• D Coy in reserve. <br>A platoon at 633839 (52.038, 5.745) was attacked repeatedly overnight [DIV-R] | Heavy fighting round DZ Y from 05:00 with SS Wach Bn 3 (Dutch SS). A platoon of D Coy was overrun. By the time of the drop the DZ was "completely clean" [KOSB-WD; BOA-GINKEL]. Released after the drop. **Left about 19:00** along the north side of the railway, past Wolfheze, toward Johannahoeve and the high ground at Pt 56 (698797) and Pt 54 (704801). Held up in the dark. By dawn 19 Sep based on Johannahoeve (6979; about 51.999–52.008, 5.836) [KOSB-WD; DIV-R] | V / P / P |
| 2nd Bn South Staffordshire Regt (Lt Col W. D. H. McCardie) | **1st lift:** BHQ, B and D Coys, one Vickers platoon and an HC mortar platoon, on LZ S at Reijers Camp (662815) [STAFFS-WD]. One B Coy platoon did not arrive and B Coy HQ cast off over England. **2nd lift (18 Sep, LZ S):** Rear BHQ, A and C Coys, one Vickers platoon, Jeep platoon, mortars, two A/Tk platoons [STAFFS-WD]. The 2nd-lift element was 35 gliders [STEER] | 767 [PA-OOB]. Estimate: about 400 on 17 Sep and about 360 on 18 Sep (35 gliders × about 10 men, given that many carried jeeps and guns) | 1st lift: about 4 × 6-pdr? (U). 2nd lift: two A/Tk platoons (8 × 6-pdr) [STAFFS-WD]. Towed 6-pdr seen on Utrechtseweg 18 Sep [PA-1PB18] | LZ S | Two platoons cleared Wolfheze. The rest screened the north-east edge of LZ S, concentrated at Reijers Camp (6681; about 52.016, 5.788) [PA-FL; 1ALB-WD] | 09:30–10:00: ordered to reinforce 1 Para Bde; moved through Wolfheze and Oosterbeek. Held up 14:00–14:20 about 703783–708782 (51.988, 5.851–5.855). Entered the town about 19:00–20:00 and met 1 Para and 3 Para remnants at 726776 (51.983, 5.881) [STAFFS-WD; DIV-R; PA-1PB18]. 2nd-lift companies followed: A Coy reached the battalion about midnight, the rest at first light 19 Sep [STAFFS-WD] | V / P / P |
| 1st Bn The Border Regt (Maj S. Cousens; Lt Col T. Haddon's glider cast off) | LZ S 13:15. "All gliders less six landed"; the CO's did not arrive. One rifle platoon and 5 glider loads of the transport platoon were held back for 18 Sep [BORDER-WD] | 788 [PA-OOB]. Embussed for the airfields on 17 Sep: 41 officers and 754 ORs [BORDER-WD]. Estimate about 700 on 17 Sep | Airlanding establishment (8 × 6-pdr, 12 mortars). B Coy lost all its vehicles at Renkum on 18 Sep [BORDER-WD] | LZ S | Covered DZ X / LZ Z (the LZ X of 18 Sep) [BORDER-WD; 1ALB-WD]: <br>• Bn HQ at Jonkershoeve (6479; about 51.998, 5.763). <br>• A Coy in Wood 6480. <br>• **B Coy at Renkum** (6276; about 51.972, 5.734), including the brickworks. <br>• C Coy in Wood 6579. <br>• D Coy at X-roads 633784, near Heelsum; also liberated Heelsum [PA-FL]. | B Coy was attacked at Renkum from 07:00 by von Tettau's forces (see 4.4). It lost its vehicles and support weapons and broke out along the river; it rejoined by 17:00. The battalion covered the 2nd-lift landing on LZ X from about 14:00–15:00. **Moved 19:00** to Phase II positions on the west side of Oosterbeek, dug in by 05:15 19 Sep: Bn HQ house 682785; A Coy Graftombe (6878); B Coy Weg (6877); C Coy astride the main road 679784; D Coy Zilverenberg (6778). That is about 51.985–51.990, 5.805–5.822 [BORDER-WD; DIV-R] | V / P / P |
| 1st Airlanding Bde HQ and Defence Platoon | LZ S 13:15 | 69 [PA-OOB] | — | LZ S | House 664806 | Bilderberg (6878) from 19:00 [1ALB-WD] | V / V / – |
| 181 Airlanding Field Ambulance | LZ S | 137 [PA-OOB] | — | LZ S | MDS near Bde HQ, then in a factory at Wolfheze | From 17:00 ferried the wounded toward Oosterbeek and Arnhem [1ALB-WD] | P / V / – |

### 3.4 4th Parachute Brigade (Brig J. W. Hackett), arriving 18 Sep

The brigade had under command the 4th Para Sqn RE, 133 PFA, 2 Para Platoon of 250 Coy RASC, Provost,
and the 2nd A/Tk Battery less one 17-pdr troop: 12 × 6-pdr and 4 × 17-pdr [4PB-WD O.O. No. 1].
An advance party jumped with the first lift. 10 Bn's lift was 33 C-47s, 7 Horsas and 1 Hamilcar
[10PARA-WD]. The brigade's gliders landed on LZ X, and their transport moved east along the railway
track to the dispersal point at X-roads 676819/677817 [4PB-WD; 10PARA-WD].

On landing, Hackett was told by Lt Col Mackenzie (GSO1) at about 15:15 that 11 Bn was to go into
Arnhem. Hackett objected but agreed, and asked for 7 KOSB in exchange [DIV-R; PA-4PB18]. Hicks agreed.

| Unit | Landed | Went in | Equipment | Arrives | Nightfall 18 Sep (21:00) | Conf (L/S/E) |
|---|---|---|---|---|---|---|
| 4th Para Bde HQ and Defence Platoon | DZ Y 14:20 [4PB-WD] | 86 [PA-OOB] | — | 13:00–15:00 turn, 18 Sep | About 17:00 moved to KOSB HQ at 634822 (52.023, 5.747). About 18:45 moved to the hotel at 647813 (52.015, 5.766) [DIV-R] | V / V / – |
| 156 Para Bn (Lt Col Sir R. des Voeux) | DZ Y 14:00 [156-WD] | 621–625 [PA-OOB]. Lost one aircraft (machine-gun platoon, 19 killed) [PA-SL]. At the RV at 14:30, 611838 (52.037, 5.713), "less about 2 officers and 100 men who were casualties and stragglers" [156-WD] | Para Bn establishment, less most of the MG platoon. H Troop of 2 A/Tk Bty (4 × 6-pdr) [4PB-WD]. One glider with 2 jeeps ditched [156-WD] | 13:00–15:00 turn, 18 Sep | Left 17:00 along the north edge of the railway. At 20:00 met its glider element at the railway crossing 665805 (Wolfheze, 52.008, 5.792). At 21:00 C Coy hit the Spindler line at 696794 (51.998, 5.837). Formed a firm base for the night in the wood at 678802 (52.005, 5.811) [156-WD; DIV-R] | V / P / P |
| 10th Para Bn (Lt Col K. B. I. Smyth) | DZ Y, same drop [10PARA-WD] | 582 [PA-OOB] | Para Bn establishment. G Troop 2 A/Tk Bty (4 × 6-pdr) [4PB-WD; 10PARA-WD] | 13:00–15:00 turn, 18 Sep | Stayed firm at about 624842 (DZ RV wood, 52.041, 5.731), covering 133 PFA. Then halted at the road and track junction 634823 (52.023, 5.747), to move at 03:00 on 19 Sep. One company took over from KOSB at 634822 [DIV-R; PA-4PB18] | V / V / P |
| 11th Para Bn (Lt Col G. H. Lea) | DZ Y about 14:30 [11PARA-WD] | 571 [PA-OOB] | Para Bn establishment. E Troop 2 A/Tk Bty (4 × 6-pdr) went with it; it destroyed 4 tanks on the evening of 18 Sep and lost one gun to air attack [2ATB-WD] | 13:00–15:00 turn, 18 Sep | Lay up in the woods at the south-east corner of the DZ until about 17:30. Then ordered to the bridge under 1 Para Bde; marched via Wolfheze (6680) and Oosterbeek, picking up its transport and A/Tk guns north of the railway [11PARA-WD; DIV-R]. At 22:00 a recce party took part of 11 Bn to 713776 (51.983, 5.862) [RECCE-WD]. **Reached the South Staffords at 726778 (51.983, 5.881) in the early hours of 19 Sep** [DIV-R]. At 21:00 18 Sep it is on the road between Wolfheze and Oosterbeek (estimate: about 51.990, 5.830) | P / V / P |
| 2nd (Oban) Airlanding A/Tk Battery (Maj A. F. Haynes) | 24 Horsas and 8 Hamilcars to LZ X, 18 Sep [PA-2ATB] | 168 [PA-OOB; PA-2ATB] | 12 × 6-pdr (E, G, H Troops) and 8 × 17-pdr (F, X). F Troop lost 3 Hamilcars: one in the North Sea, two short in Holland (one gun later salvaged [AJ-17]). So about **12 × 6-pdr and 5 × 17-pdr** landed (estimate) [2ATB-WD] | 13:00–15:00 turn | All available guns had joined their units by 20:00. E Tp with 11 Bn, G with 10 Bn, H with 156 Bn. X Tp (17-pdr) in brigade reserve. F Tp to the Div troops area at Oosterbeek [2ATB-WD] | V / V / P |
| 4th Para Sqn RE (Maj A. Perkins) | DZ Y 14:20 [4PSQN-WD] | 155 [PA-OOB] | Most containers lost on the DZ | 13:00–15:00 turn | At 17:00 to an RV 1 mile south of the railway for the night. 1 Troop with 156 Bn [4PSQN-WD] | P / V / P |
| 133 Para Field Ambulance | DZ Y | 129 [PA-OOB] | — | 13:00–15:00 turn | On DZ Y, covered by 10 Bn [PA-4PB18] | P / V / – |

### 3.5 Divisional troops

| Unit | Landed | Went in | Equipment | 17 Sep | 18 Sep | Conf (L/S/E) |
|---|---|---|---|---|---|---|
| Div HQ and Defence Platoon (Urquhart) | LZ Z from 13:00. GSO2 (Int) and BM RA landed in England and came on 18 Sep [DIV-R] | 142 [PA-OOB] | Wireless; Urquhart's rover jeep | Opened 14:15–14:30 at 657799/658799 (52.002, 5.780), edge of LZ Z. After dark moved into 4 gliders on LZ Z at 655798 [DIV-R]. **Urquhart left at 16:30** and was cut off with 3 Para from about 18:00 [DIV-R] | 07:00 moved to 665783 (51.988, 5.792). Hicks took command at 09:15. **Moved to the Hartenstein Hotel (693783; [OSM] 51.9877, 5.8327) about 16:00–17:00** [DIV-R; 1GPR-WD; HQRA-WD]. Urquhart was hidden in the attic of a house in Zwarteweg near the hospital (about 51.985, 5.885) from the afternoon of 18 Sep until 07:00 on 19 Sep [DIV-R; BOA-S18] | V / V / – |
| 1st Airborne Divisional Signals | LZ Z / DZ X | 348 [PA-OOB] | 22, 68 and 76 sets | With Div HQ | With Div HQ | P / V / P |
| HQ RA and 1 Forward Observation Unit | LZ Z | HQ RA small; 1 FOU 73 [PA-OOB] | FOO parties with each para battalion | CRA on LZ Z | HQ RA at the Hartenstein from 18:00 [HQRA-WD] | P / V / – |
| 1st Airlanding Light Regt RA (Lt Col W. F. K. Thompson) | **17 Sep: 1 and 3 Btys and RHQ, 57 gliders** [WIKI-LR], from 13:15. 1 Bty missing 2 gliders (one in England; one landed near Renkum and arrived later). 3 Bty missing 3 gliders (one in England, one crashed in Holland, one landed safely in Holland) [LTREGT-WD]. One glider with a gun and crew was shot down [HN-GUN]. **18 Sep: 2 Bty, 33 gliders**, from about 15:00, less 1 gun and 1 ammunition glider [LTREGT-WD; WIKI-LR] | 372 [PA-OOB; WIKI-LR] | 24 × 75-mm pack howitzers on establishment. **17 Sep: estimate 15–16 in action.** 3 Bty had all 8 at Oosterbeek on 18 Sep [HN-GUN], so most losses fell on 1 Bty or on non-gun gliders. **18 Sep:** 2 Bty adds 7 [LTREGT-WD], so about 22–23 in all. Horsa load: gun, jeep, ammunition trailer and crew [HN-GUN; STEER] | 1 and 3 Btys in action at 663793 (51.997, 5.789), east edge of LZ Z by Wolfheze, by 15:00. First shoot at dusk against the Hotel Wolfheze. FOOs went with 1, 2 and 3 Para. **Maj Munford (3 Bty) and Capt Harrison reached the bridge with 2 Para** [LTREGT-WD; HN-GUN] | **3 Bty in action beside Oosterbeek church by about 09:00–10:00** (696773; [OSM] Oude Kerk 51.978, 5.838). Registered on the south end of the bridge; fired on Gräbner's column and for 1 Para [HN-GUN; LTREGT-WD]. 2 Bty landed and deployed beside 1 Bty at 663793. By about 17:00–18:30, **1 and 2 Btys and RHQ had moved north of the Utrechtseweg near the Hartenstein**: 1 Bty about 700 yd west of Div HQ, 2 Bty about 1,000 yd north (estimates about 51.989, 5.823 and 51.996, 5.833) [HN-GUN; LTREGT-WD] | V / V / P |
| 9th (Airborne) Field Coy RE (Maj J. C. Winchester) | LZ Z (652797) 13:40. One personnel glider crashed in England with all aboard killed. One jeep glider force-landed in England. The OC's glider crashed on landing [9FD-WD] | 194 [PA-OOB] | Jeeps, demolition stores | 4 jeeps for the coup de main landed on LZ S by mistake and never joined the Recce Sqn [STEER]. Capt Heggie with 2 jeeps and 11 men went to join the Recce Sqn. Capt O'Callaghan with No. 2 Pl (less a section) went for the railway bridge. No. 1 Pl attacked the Hotel Wolfheze (672793). Coy HQ and No. 3 Pl dug in at 665792 (51.996, 5.792) [9FD-WD] | About 25–30 sappers under O'Callaghan reached the road bridge in the morning [DIV-R; MSW]. A platoon spiked 21 German 105-mm guns found at Wolfheze [1ALB-WD; PA-FL] | V / V / P |
| 21st Independent Parachute Coy (Maj B. A. Wilson) | Pathfinders 12:40 [PA-FL; STEER] | 186 [PA-OOB] | Eureka beacons, panels, smoke | One platoon on each of LZ S, LZ Z and DZ X. HQ at Reijerscamp farm [STEER] | Marked the 2nd-lift zones (U) | P / V / – |
| The Glider Pilot Regiment (1 and 2 Wings) | All glider lifts | 1,262 in all (incl. 19 Sep) [PA-OOB]. Estimate about 570 on 17 Sep (2 per glider × 284 gliders) and about 540 more on 18 Sep (2 × 273) | Rifles, Stens, Brens: light infantry | 1 Wing laagered around Div HQ and near the Wolfheze asylum [1GPR-WD]. 2 Wing: F Sqn, E Sqn and C Sqn around Wolfheze (657807–672804), facing east [2GPR-WD] | 1 Wing at the Hartenstein from 16:10 [1GPR-WD]. 2 Wing marched at 19:00 to positions at 688790–694792 (about 51.994, 5.825–5.833), north of the Hartenstein [2GPR-WD] | V / P / P |
| 250 (Airborne) Light Composite Coy RASC | One para platoon with each brigade (5 gliders of jeeps each), plus 18 Horsas carrying half a transport platoon [DIV-R para 211] | 226 [PA-OOB] | Jeeps and trailers loaded with spare ammunition | No. 3 Platoon (about 40) and Maj Clark went with 1 Para Bde to the bridge [MSW]. The transport platoon ordered to wood 655806 "never appeared" [1ALB-WD] | CRASC set up the divisional maintenance area (DMA) at the Hartenstein about 15:30 and organised collection of the resupply [RASC-WD] | P / V / P |
| Other small units: RAOC (19), REME (61), Provost (69), 89 FS Section (16), Dutch liaison (12), RAF light warning units (45), US air support team (10), Phantom (10), Jedburgh (3), PR (15), 261 Fd Park Coy RE (13) [PA-OOB] | various | as given | — | With Div HQ | With Div HQ | P / V / – |

### 3.6 Polish 1st Independent Parachute Brigade Group (Maj Gen S. Sosabowski)

**Not in the window.** The 1st Para Bde orders gave the Poles DZ K (south of the bridge) and LZ L
on D+2 [1PB-WD O.O. No. 1]. The Div report's third lift was 114 C-47s and 35 Horsas, "less its Light
Bty" [DIV-R].

- The Polish glider element, including the anti-tank battery, landed on **LZ L** at about 14:30 on
  **19 Sep** [4PSQN-WD]. The 2 A/Tk Bty's second-in-command also came in with it [2ATB-WD].
- The parachute battalions flew on **21 Sep** to a new DZ at Driel.
- Only a Polish signals liaison officer was with the division on 17–18 Sep [PA-OOB].

Scenario note: LZ L needed to be held for 19 Sep. That was 7 KOSB's task on the evening of 18 Sep
[KOSB-WD; DIV-R]. A victory condition can reward holding it (section 7).

---

## 4. Routes, stop lines and who stopped whom

The routes were set in the 1st Para Bde orders. Code names: LION = Heelsum–Heveadorp–Arnhem (river
road), TIGER = Heelsum–Arnhem (Utrechtseweg), LEOPARD = Planken Wambuis–Arnhem (Amsterdamseweg).
The main bridge was WATERLOO (746768), the pontoon bridge PUTNEY (738774), and the railway bridge
CHARING X (706763) [1PB-WD App. A]. DZ X to the road bridge is about 10.5 km in a straight line,
and about 13 km by LION (estimate from the coordinates in section 8).

### 4.1 LION (2 Para, Bde HQ, 1 Para Sqn RE, B Tp A/Tk, later 3 Para, 1 Para, South Staffords, 11 Bn)

Waypoints (grid converted, ±300 m):

| Place | Grid | Lat, Lon |
|---|---|---|
| 2 Para RV | 643783 | 51.988, 5.760 |
| Heelsum | 6477 | about 51.981, 5.763 |
| Heveadorp / lower road | 6877 | about 51.977, 5.815 |
| Railway, Oosterbeek-Laag | 712774 | 51.980, 5.860 |
| Railway bridge (blown, C Coy) | 707764 | 51.971, 5.853 |
| Den Brink | 7178 / 723782 | 51.987, 5.876 |
| St Elisabeth Hospital | 729779 | 51.984, 5.885 |
| Pontoon bridge | 738774 | 51.980, 5.898 |
| Road bridge, north end | 746768 | 51.974, 5.910 ([OSM] bridge centre 51.9748, 5.9116) |

Opposition on 17 Sep was light: an armoured car and snipers near the railway, and machine guns on
Den Brink [DIV-R; PA-2B17]. Krafft's troops and the 9th SS's Spindler group did not close LION until
after 2 Para and 3 Para had passed. By 07:00–08:00 on 18 Sep it was blocked at Den Brink, the
railway bridge area and the factory at 720776, by German infantry, armoured cars, a tank, and 20-mm
flak firing from the south bank [1PARA-WD; 1PB-WD].

### 4.2 TIGER (3 Para)

- Stopped about 16:30–18:00 at 683785 (the Bilderberg woods, 51.990, 5.818) by **Krafft's SS
  battalion** (SS-Pz.Gren.Ausb.u.Ers.Btl. 16) with a self-propelled gun [PA-1PB17; 1PB-WD].
- Night at 690784 (51.989, 5.828).
- On 18 Sep the battalion went south to LION.

### 4.3 LEOPARD (1 Para; the Recce Squadron's planned route ran on the railway track to its south)

- Recce Sqn stopped about 16:00 just east of Wolfheze (Johannahoeveweg, about 52.006, 5.800) by
  Krafft's reserve platoon north of the railway [STEER; BOA-RECCE].
- 1 Para was blocked 17:00–21:00 at 675820 and 690809–694809 (52.011–52.021, 5.807–5.834) by
  armour and infantry on the Amsterdamseweg. The sources name them as Kampfgruppe Spindler [WIKI-A]
  or Luftwaffe signallers of Kampfgruppe Weber with armoured vehicles [PA-1PB17].
- "5 tanks and approx 15 half-tracks" passed X-roads 691811 moving west [1PARA-WD].

### 4.4 West and north (airlanding brigade, 4th Para Bde)

- **DZ Y:** SS Wach Bn 3 (Dutch SS, about 600 [BOA-GINKEL] (S)) attacked 7 KOSB from about 05:00
  on 18 Sep [KOSB-WD; BOA-GINKEL].
- **Renkum and Heelsum:** von Tettau's forces (SS NCO school, naval troops) attacked B Coy 1 Border
  at Renkum from 07:00 on 18 Sep [BORDER-WD; WIKI-A].
- **18 Sep evening:** the Spindler blocking line ran from north of the Amsterdamseweg down the
  Dreijenseweg (702805–699791) to Oosterbeek station and the river. It stopped 156 Bn and 7 KOSB
  [156-WD; PA-4PB18; BOA-S18].

### 4.5 The bridge perimeter

- The force held houses on both sides of the north ramp. Named positions [MSW; 1PSQN-WD; 2PARA-WD]:
  - A Coy at the north end, the "DIGBY" block next to building 67.
  - Battalion HQ and Brigade HQ in buildings west of the ramp.
  - The Van Limburg Stirum School and houses east of the ramp (RE, part of C Coy 3 Para).
  - B Coy's triangular block when it arrived.
- Extent: about 300 × 300 m, within about 51.976–51.979, 5.906–5.914 (estimate from the 2 Para
  plan and [OSM]). **In a 1 km hex grid it is a single hex**, the one containing the north end of
  the bridge.
- **The south end stayed in German hands.**
  - Grayburn's platoon attacked at 20:45 and the flame-thrower attempt was made about 22:00; both
    failed.
  - A boat crossing by the Bde Defence Platoon also failed: there were no barges [1PB-WD; DIV-R].
- During 18 Sep the Germans abandoned or lost some outlying houses. At dusk "several of the houses"
  were burnt down [DIV-R; PA-BR18].

### 4.6 Force at the bridge, morning 18 Sep

Middlebrook's "best available estimate", reproduced in [MSW]:

| Element | Men |
|---|---|
| 2nd Para Bn (A Coy, B Coy less a platoon, Bn HQ, HQ/Support Coy) | 340 |
| 1st Para Bde HQ, Defence Platoon and Signals | 110 |
| 1st Para Sqn RE | 75 |
| 3rd Para Bn (C Coy part) | 45 |
| 1st Airlanding A/Tk Bty | 40 |
| 250 Lt Comp Coy RASC (No. 3 Pl) and Maj Clark | 40 |
| 9th Field Coy RE (part of No. 2 Pl) | 30 |
| Others: 17 glider pilots, 8 Recce Sqn, FOOs, signallers, PR and similar | about 59 |
| **Total** | **about 740** |

- About 60 officers [MSW].
- The ~740 total is confirmed by [WIKI-A], [WIKI-JFB], [RAFM3] and [PA-BR18]: **V**.
- Bridge guns: 4–5 × 6-pdr [PA-BR18; WIKI-A], plus PIATs. On 18 Sep the guns and PIATs knocked out
  about 10 armoured vehicles in the morning (six by 6-pdr, four by PIAT) and two tanks in the
  afternoon [DIV-R].
- Losses by nightfall on 18 Sep were light: "only ten men had been killed and approximately thirty
  wounded" [MSW] (P).
- The only reliable link from the bridge to the division was the 3 Bty net, by Munford to
  Wilkinson's set in Oosterbeek [HN-GUN; LTREGT-WD], plus the Dutch civil telephone [1PB-WD].

**Game suggestion.** Start the bridge force as 2 Para (≈340), a "Frost Force HQ / Bde HQ" counter
(≈110), an RE counter (≈105, combining the 1st Para Sqn and the 9 Fd Coy party) and an A/Tk counter
(4 × 6-pdr). Let it enter the bridge hex in the 19:00–21:00 turn of 17 Sep if 2 Para's route is
open, and add the 3 Para C Coy fragment (≈45) and B Coy (≈70) during the night.

---

## 5. Air resupply and supply rules

### 5.1 The 18 Sep resupply

- **Aircraft:** 33 Stirlings of 38 Group (35 planned). 2 were lost (6%) [DIV-R App. D; PA-SL;
  RAFM4].
- **Time:** with the second lift, about 15:15–15:30 [DIV-R; 1GPR-WD].
- **Dropped:** 87 tons net, 144 tons gross. A Stirling load was 24 containers and 4 panniers
  [DIV-R App. D].
- **Collected:** about **12 tons (14%)** [DIV-R App. E; PA-SL]. A further 14 tons came from the
  3 bulk-loaded Hamilcars of the second lift (about 66% collected) [DIV-R App. E]. The Hamilcar loads
  were 75-mm HE, 6-pdr APCBC, 17-pdr AP, 3-in mortar HE, RE stores and mines [DIV-R App. B].
- **Where:** the sources conflict.
  - Pegasus [PA-SL] and Wikipedia [WIKI-A] say LZ L (east of Wolfheze, north of the railway), and
    that the Germans had overrun much of it.
  - The Div HQ log for 15:25 says "Supply drop on DZ 'X', somewhat scattered" [DIV-R].
  - The Div report says "a fair proportion was collected by the Div R.A.S.C. and taken to the Div
    dump at Div H.Q." [DIV-R para 77].
  - Resolve this from Margry or Middlebrook before placing the drop hex.
- **Ammunition resupplied on 18 Sep** [DIV-R App. E (ii)]: the 75-mm, 6-pdr and 17-pdr columns
  cannot be read reliably in the transcription. Leave as U.
- **The 19 Sep drop is outside the window.** It fell on the pre-planned supply dropping point
  (SDP), which was in German hands, despite signals to change it [RASC-WD].

### 5.2 Supply and command problems that matter for game rules

1. **Units carried their own supply for about 2–4 days.** The plan assumed link-up after four days
   [DIV-R para 211]. **Food is not a problem inside the window.** Suggested rule: every 1st Airborne
   unit is in supply for the whole scenario, with no supply line needed.
2. **Ammunition is the binding limit for units in heavy contact.**
   - 1 Para had "practically no amn" by 18:30 on 18 Sep and was resupplied by the South Staffords at
     20:00 [1PARA-WD].
   - 3 Para's carriers with the reserve ammunition never reached the leading company [3PARA-WD].
   - Suggested rule: an ammunition-depletion marker after two consecutive turns of combat, removed
     by stacking with a fresh unit or by passing through the Div dump hex (Hartenstein, from
     the 15:00–17:00 turn of 18 Sep).
3. **Transport was scarce and road-bound.** Jeeps and guns could not follow infantry bypass routes
   through the woods [1PARA-WD; 1PB-WD]. Suggested rule: towed 6-pdrs, 17-pdrs and howitzers move on
   roads and tracks only, and separate from their battalions if the battalion moves cross-country
   at night.
4. **Wireless failed.**
   - 22 and 68 sets failed in the woods and town and were "useless at night" [1PB-WD App. E].
   - Div HQ had almost no contact with 1 Para Bde [DIV-R para 67].
   - Urquhart was out of touch from about 18:00 on 17 Sep to 07:25 on 19 Sep [DIV-R].
   - Suggested rules:
     - A command-range or "out of contact" rule for 1 Para Bde units beyond about 3 hexes from Div
       HQ.
     - No GOC for the 1st Airborne from the 17:00 turn of 17 Sep to the end of the scenario, with
       Hicks as acting commander from 09:15 on 18 Sep: −1 to coordinated attacks, or similar.
     - Artillery support at the bridge only through the 3 Bty FOO net.
5. **No air support and no resupply control.**
   - Ground-to-air links failed (wrong frequencies, no visual control post (VCP)) [RAFM3; DIV-R
     para 214].
   - SDPs could not be changed [RASC-WD].
   - Suggested rules: no close air support for the Allies, and the resupply drops at a fixed,
     pre-planned hex.
6. **Landing zones had to be held.** The airlanding brigade was tied to the zones until the second
   lift arrived; then it was released.
   - Suggested rule: gliders or paratroops landing in or next to an enemy-occupied hex take step
     losses.
   - The 18 Sep lift was strafed at 11:15 by about 20 Me 109s that set gliders on fire [DIV-R].
     Make it a random event.
7. **Weather delay.** The second lift was planned for about 10:00 and arrived about 14:00–15:15
   [DIV-R; PA-SL]. Suggested rule: roll for arrival in the 09:00, 11:00 or 13:00 turn of 18 Sep,
   with the historical result being the 13:00 turn.

---

## 6. Timeline of Allied actions, 17–18 September 1944

All times are "A" time (GMT+1). German sources are one hour later.

### 17 September (D Day)

| Time | Event | Sources |
|---|---|---|
| 09:45–10:30 | Take-off from England | [PA-FL; DIV-R; RAFM3] |
| 12:40 | 21 Indep Para Coy pathfinders drop on LZ S, DZ X and LZ Z | [PA-FL; STEER] |
| 13:00 | First gliders land on LZ S (1st Airlanding Bde) | [PA-FL; DIV-R] |
| 13:15–13:40 | Gliders on LZ Z (Div HQ, Light Regt, Recce Sqn jeeps, 1 Para Bde guns and vehicles). Two 17-pdr Hamilcars overturn | [PA-FL; LTREGT-WD; 1ATB-WD] |
| about 13:50–14:10 | 1st Para Bde jumps on DZ X (2,283 men) | [PA-FL; 1PARA-WD; 3PARA-WD; 1PSQN-WD] |
| 14:15–14:30 | Div HQ opens at 657799 | [DIV-R] |
| 14:45 | Battalions at RVs, wireless working | [STEER; 1PARA-WD] |
| about 15:00 | 2 Para (LION) and 3 Para (TIGER) move off | [1PB-WD; STEER] |
| 15:00–16:00 | KOSB to DZ Y; Border to the DZ X / Renkum area; South Staffords to Wolfheze and Reijers Camp | [KOSB-WD; BORDER-WD; 1ALB-WD] |
| about 15:20 | Urquhart wrongly told the Recce Sqn has lost its transport | [STEER] |
| 15:30–16:00 | 1 Para ordered to move (LEOPARD); Recce Sqn moves off 15:30–15:40 | [STEER; 1PARA-WD; RECCE-WD] |
| about 16:00 | Recce Sqn C Troop ambushed east of Wolfheze; coup de main abandoned | [RECCE-WD; STEER] |
| 16:30 | Urquhart leaves Div HQ; later trapped with 3 Para | [DIV-R] |
| 16:30–18:00 | 3 Para held at the Bilderberg by Krafft; Kussin killed | [1PB-WD; PA-1PB17] |
| 17:00–19:00 | 1 Para's R Coy mauled at 675820; battalion blocked from the Amsterdamseweg | [1PARA-WD] |
| about 18:00 | 2 Para's C Coy detached to the railway bridge; it is blown | [1PB-WD] |
| 18:47 / 19:41 | Sunset / last light | [1PB-WD] |
| about 19:30 | 3 Para halts at 690784 for the night | [1PB-WD] |
| **about 20:00** | **2 Para's A Coy reaches the north end of the road bridge** (19:30 [PA-2B17]; 20:30 [DIV-R]) | [1PB-WD; DIV-R; PA-2B17] |
| 20:45 | Grayburn's platoon attacks the south end; repulsed | [1PB-WD] |
| 21:30–22:00 | Bde HQ, 1 Para Sqn RE and Frost's HQ in position. Gough arrives with 2–3 jeeps (time U) | [1PSQN-WD; BOA-RECCE] |
| 22:00–23:00 | Flame-thrower attack on the pillbox; ammunition store burns. "Bridge captured" (north end) about 22:30–23:00 | [1PSQN-WD; 1PB-WD] |
| about 24:00 | About 45 of 3 Para's C Coy reach the bridge | [1PB-WD; MSW] |

### 18 September (D+1)

| Time | Event | Sources |
|---|---|---|
| 01:00 | 1 Para moves south without R Coy | [1PARA-WD; DIV-R] |
| 04:30 | 3 Para moves off toward LION; 1 Para fights at 709783 | [DIV-R; 1PARA-WD] |
| about 05:00 | B Coy 2 Para (about 70) reaches the bridge. KOSB attacked at DZ Y | [DIV-R; 1PB-WD; BOA-GINKEL] |
| 05:30 | 1 Para gets Frost's call for reinforcements and turns south | [1PARA-WD] |
| 06:30 | 3 Para's B Coy group 300 yd west of the hospital; the rear half has gone astray | [DIV-R] |
| 07:00 | Border's B Coy attacked at Renkum. Div HQ moves to 665783 | [BORDER-WD; DIV-R] |
| about 08:00 | 1 Para in contact at the railway bridge 715780 and Den Brink. Recce Sqn under fire at 708782 | [1PARA-WD; RECCE-WD] |
| 09:00–09:30 to about 11:30 | **Gräbner's 9th SS Recce Bn attacks across the bridge**; about 10–12 vehicles destroyed. 3 Bty's howitzers support from Oosterbeek | [DIV-R; PA-BR18; HN-GUN] |
| 09:15 | Hicks takes command of the division | [DIV-R] |
| 09:30–10:00 | South Staffords (first lift) ordered to Arnhem; move off | [DIV-R; STAFFS-WD] |
| about 10:00 | Second lift's planned time; delayed by fog | [DIV-R] |
| 11:15 | About 20 Me 109s strafe the LZs and DZs | [DIV-R] |
| 14:00–14:20 | South Staffords held about 703783–708782 | [DIV-R] |
| about 14:00–15:15 | **Second lift arrives**: 4th Para Bde on DZ Y; gliders on LZ S and LZ X | [156-WD; 4PB-WD; DIV-R; PA-SL] |
| 14:00–15:00 | 3 Para's B Coy group (130–140) tries to push east from the hospital; fails | [DIV-R] |
| about 15:15–15:30 | Resupply drop of 33 Stirlings: 87 tons, about 12 collected | [DIV-R] |
| 15:15 | Hackett told 11 Bn is to go to Arnhem | [DIV-R] |
| afternoon | Urquhart and Lathbury break out from 3 Para; Lathbury wounded; Urquhart hides near the hospital | [DIV-R; PA-1PB18] |
| 16:00–17:00 | Div HQ to the Hartenstein. 3 Bty at Oosterbeek church; 1 and 2 Btys north of Utrechtseweg | [DIV-R; 1GPR-WD; HN-GUN] |
| 17:00 | 156 Bn moves east along the railway. 4th Para Bde HQ to 634822. Border's B Coy rejoins | [156-WD; DIV-R; BORDER-WD] |
| about 17:30 | 11 Bn leaves its lying-up area for Arnhem | [11PARA-WD] |
| late afternoon | Attack on the bridge from the east by infantry and 2 tanks; both tanks knocked out | [DIV-R] |
| 18:30 | 1 Para about 100 men near the hospital, almost out of ammunition | [1PARA-WD] |
| 19:00 | 1st Airlanding Bde moves east: Border to west Oosterbeek, Bde HQ to the Bilderberg, KOSB toward Johannahoeve. 2 Wing GPR to north of the Hartenstein | [1ALB-WD; KOSB-WD; 2GPR-WD] |
| 19:00–20:00 | South Staffords' first-lift half meets 1 Para and 3 Para at 726776 | [STAFFS-WD; 1PARA-WD] |
| 20:00 | 156 Bn meets its glider element at the Wolfheze crossing | [156-WD] |
| 21:00 | 156 Bn's C Coy ambushed at 696794 on the Spindler line; battalion forms a firm base in wood 678802 | [156-WD] |
| night 18/19 | 11 Bn and the South Staffords' second half march into Arnhem. Attack on the bridge planned for 01:00, then put off; it went in at about 04:00–04:45 on 19 Sep | [1PARA-WD; STAFFS-WD; DIV-R] |

---

## 7. Objectives, victory conditions and the historical outcome

### 7.1 Allied objectives (from the plan)

From [DIV-R, paras 17–20] and [1PB-WD]:

- **1st Para Bde:** take and hold the road bridge (first priority) and the pontoon bridge (second).
  Hold the north end facing west and north-west, and put one company on the south bank.
- **1 Para:** hold the high ground north of Arnhem (squares 7580 and 7279, about 52.00–52.01,
  5.89–5.93).
- **1st Airlanding Bde:** hold the zones until the second lift has landed, then form the western
  perimeter of Arnhem.
- **4th Para Bde:** form the northern perimeter on the high ground north of the town, linking with
  1 Para Bde on the Arnhem–Apeldoorn road.

### 7.2 Recommended victory conditions (Allied side)

Suggested victory points (VP). Calibrate against the German-side file.

1. **Road bridge, north end.**
   - A VP each turn from the 21:00 turn of 17 Sep that an Allied unit holds the bridge's north-end
     hex.
   - A large bonus if it is held, and the bridge is intact, at the end of the scenario.
   - The bridge was not prepared for demolition [1PB-WD]. Keep a German demolition option off by
     default.
2. **Road bridge, south end / both ends.** A large bonus if an Allied unit holds the south-end hex
   at the end. This is the plan's objective, and it was never achieved historically.
3. **Link-up at the bridge.** A bonus if any Allied combat unit that did not start in the bridge
   force reaches the bridge hex or an adjacent hex, in supply, by the end. Historically this failed.
   The nearest approach was the hospital, about 2 km west.
4. **Western Arnhem.** VP for Allied control of the St Elisabeth Hospital / Den Brink hexes at the
   end (historically contested).
5. **Landing zone for 19 Sep.** VP if LZ L (Johannahoeve, about 52.005, 5.820) is not enemy-held at
   the end. Historically it was contested: KOSB were on its edge, and Spindler's line was just east.
6. **Division base.** Lose VP if the Hartenstein / Oosterbeek hexes or the Heveadorp ferry hex
   (about 51.973, 5.820, estimate) are enemy-held at the end. They mattered later in the battle.
7. **Losses.** Lose VP per step lost. Historically the 1st Para Bde battalions outside the bridge
   lost about 50–80% of their strength by the end of 18 Sep.

### 7.3 What a "historical" position looks like at 21:00 on 18 Sep

| Force | Position | Rough strength |
|---|---|---|
| Frost's bridge force | North-end hex (about 51.977, 5.910), intact. South end held by the Germans. Some houses burnt | About 600–700 effective (740 less the 18 Sep casualties: about 10 killed and 30 wounded [MSW]; P) |
| 1 Para | Just west of the St Elisabeth Hospital (51.984, 5.883) | About 100 plus R Coy's 40 [1PARA-WD] |
| 3 Para | Front half (B Coy group) in houses near the hospital / Onderlangs (51.983, 5.887); rear half (A Coy, HQ Coy) with 1 Para | 130–140 front half [DIV-R]; rear half unknown, perhaps 100 (estimate) |
| 2 S Staffords (first lift) | With 1 Para and 3 Para near 726776 (51.983, 5.881); second half on the road from LZ S | About 400 + 360 (estimate) |
| 11 Para Bn | On the road from Wolfheze toward Oosterbeek / Arnhem | About 550 (571 less drop losses; estimate) |
| Div HQ, HQ RA, GPR 1 Wing, Div dump | Hartenstein (51.988, 5.833) | — |
| Light Regt | 3 Bty at Oosterbeek church; 1 and 2 Btys north of Utrechtseweg | About 22–23 guns |
| 1 Border | Moving to west Oosterbeek (Graftombe, Zilverenberg, Heveadorp) | About 700 |
| 7 KOSB | Marching from DZ Y along the railway toward Johannahoeve / LZ L | About 650 (estimate) |
| 156 Para Bn | Firm base, wood 678802 (52.005, 5.811) | About 500 (625 less about 100 at the RV and the night's losses) |
| 10 Para Bn | 634823 near DZ Y (52.023, 5.747) | About 550 (estimate) |
| 4th Para Bde HQ | Hotel at 647813 (52.015, 5.766) | — |
| Recce Sqn | 692785 near the Hartenstein (less C Troop) | About 150 |
| 2 Wing GPR | North of the Hartenstein, 688790–694792 | About 400–500 (estimate) |
| LZ S, LZ Z, LZ X, DZ X, DZ Y | Abandoned; Germans infiltrating | — |

**Verdict.** At 21:00 on 18 Sep the Allies hold the north end of the bridge and the Oosterbeek
base. They have not linked up at the bridge, do not hold the south end, and have about two
battalions' worth of 1st Para Bde strength burnt out in western Arnhem. On the VP scheme above that
is roughly an **Allied marginal loss or draw**. The scenario designer must set the thresholds so that
the historical result scores about even.

---

## 8. Coordinates: zones and key places

### 8.1 Grid conversion

The war diaries use the 1944 GSGS 4427 1:25,000 grid (sheets 388 GINKEL, 387 EDE, 6 NW ARNHEM).
E and N are the kilometre values read from a 6-figure reference; for example, 693783 gives E = 69.3
and N = 78.3. The fit is:

- lat = 51.9877 + (N − 78.3) / 111.2
- lon = 5.8327 + (E − 69.3) / 68.7

It was calibrated on the Hartenstein Hotel (693783 = Airborne Museum [OSM] 51.9877, 5.8327) and the
St Elisabeth Hospital (729779; the hospital position is taken from [OSM] Zwarteweg, 51.985, 5.885, so
it is itself approximate). Checked on independent points:

- Oosterbeek church, 696773 → 51.979, 5.837 ([OSM] Oude Kerk 51.978, 5.838: about 80 m).
- Koepel, 712793 → 51.997, 5.860 ([OSM] 51.996, 5.861: about 120 m).
- Hotel Bilderberg, square 6878 → 51.990, 5.821 ([OSM] 51.990, 5.818).
- Wolfheze, square 6680 → 52.008, 5.792 ([OSM] 52.006, 5.792).
- Road bridge, 746768 → 51.974, 5.910 ([OSM] bridge centre 51.975, 5.912).

Treat converted positions as ±300 m, and 4-figure (square) references as ±700 m.

### 8.2 Drop and landing zones

| Zone | Use | Lat, Lon (centre) | Basis |
|---|---|---|---|
| LZ S | 1st Airlanding Bde, 17 Sep; South Staffords' second half and other gliders, 18 Sep (69 gliders) | about 52.013, 5.785 | North of the railway, Wolfheze to Reijerscamp. S Staffords landed at 662815 (52.017, 5.788). Reijerscamp [OSM] 52.015, 5.778. Bde HQ at 664806 on its south-east edge |
| LZ Z | Div HQ, divisional troops, 1 Para Bde gliders, 17 Sep | about 52.000, 5.772 | South of the railway, west of Wolfheze. Div HQ at 657799 (52.002, 5.780) and 9 Fd Coy at 652797 (52.000, 5.773) on the LZ; Light Regt at 663793 on its east edge |
| DZ X / LZ X | 1st Para Bde drop, 17 Sep; 204 gliders, 18 Sep | about 51.991, 5.758 | Renkum Heath north of Heelsum, south of LZ Z, either side of Telefoonweg [STEER]. 2 Para's RV at 643783 (51.988, 5.760) |
| DZ Y | 4th Para Bde drop, 18 Sep (Ginkel Heath) | about 52.036, 5.733 | [OSM] Ginkelse Heide 52.031, 5.727. 10 Bn RV wood 623842 (52.041, 5.731); 156 RV 611838 (52.037, 5.713); KOSB HQ at its south end near the motorway |
| LZ L | Polish gliders, 19 Sep; possibly the 18 Sep supply drop | about 52.005, 5.820 (estimate) | North of the railway between Wolfheze and Johannahoeve ([OSM] 52.008, 5.837). 156 Bn "halted short of LZ L" [PA-4PB18] at wood 678802 (52.005, 5.811). Check on the Margry maps |
| DZ K | Planned Polish DZ, south of the bridge (not used) | about 51.965, 5.905 (estimate) | Polder south of the road bridge [PA-PLAN] |

### 8.3 Key places

| Place | Lat, Lon | Note |
|---|---|---|
| Arnhem road bridge, north end / Frost perimeter | 51.977, 5.910 | [OSM] bridge centre 51.9748, 5.9116; perimeter 51.976–51.979, 5.906–5.914 (estimate) |
| Pontoon bridge (PUTNEY) | 51.980, 5.898 | Grid 738774 |
| Railway bridge, Oosterbeek (CHARING X) | 51.971, 5.853 | Grid 707764 / 706763 |
| St Elisabeth Hospital | 51.984, 5.885 | Grid 729779 |
| Den Brink | 51.987, 5.876 | Grid 723782 |
| Monastery (South Staffords, 19 Sep) | 51.985, 5.892 | Grid 734780 |
| Arnhem Centraal station | 51.985, 5.900 | [OSM] |
| Hartenstein Hotel (Div HQ from 18 Sep) | 51.988, 5.833 | [OSM] |
| Oosterbeek Oude Kerk (3 Bty) | 51.978, 5.838 | [OSM] |
| Hotel Bilderberg (1 AL Bde HQ from 18 Sep) | 51.990, 5.818 | [OSM] |
| 3 Para night position, 17/18 Sep | 51.989, 5.828 | Grid 690784 |
| 1 Para night position, 17/18 Sep | 52.011, 5.828 | Grid 690809 |
| Recce Sqn ambush site | about 52.006, 5.800 | Estimate from [STEER] (Johannahoeveweg by the railway tunnel) |
| Wolfheze (station / level crossing) | 52.007, 5.792 | Grid 665805; [OSM] |
| Hotel Wolfheze | 51.997, 5.802 | Grid 672793 |
| Heelsum | 51.983, 5.755 | [OSM] |
| Renkum (village) | 51.972, 5.734 | Grid 6276 (the [OSM] point 51.992, 5.792 is the municipality, not the village) |
| Planken Wambuis (KOSB A Coy) | about 52.034, 5.790 | Grid 6683 square; the [OSM] area point 52.054, 5.778 is too far north |
| Johannahoeve | 52.000–52.008, 5.836 | Grid 6979; [OSM] 52.008, 5.837 |
| Dreijenseweg (Spindler line) | 51.998–52.006, 5.840 | Grid 702805–699791 |
| Koepel (4th Para Bde objective) | 51.996, 5.861 | Grid 712793; [OSM] |
| Heveadorp ferry | about 51.973, 5.820 | Estimate, below the Westerbouwing ([OSM] 51.976, 5.822) |

---

## 9. Open questions and conflicts to resolve

1. **2 Para strength.**
   - The diary has 31 officers and 478 ORs taking off by parachute (509) [2PARA-WD].
   - Middlebrook (via search extract) gives 481, "more than 100 lower" than 1 and 3 Para [MID-X].
   - Pegasus "went in" gives 525 [PA-OOB].
   - The difference is probably the glider element. Check Middlebrook's appendix.
2. **Per-lift strengths** for the South Staffords, KOSB and Border, and for the divisional troops.
   All the per-lift figures here are estimates. Middlebrook's appendix and the glider load tables in
   Margry, or the Glider Pilot Regiment loading lists, should settle them.
3. **17-pdr count on 17 Sep.** The battery diary says 2 crashed on landing [1ATB-WD]. Arnhem Jim says
   2 were lost en route as well as 2 overturned, leaving 4 [AJ-17]. RAF Museum says 2 flipped
   [RAFM3]. Use 6 provisionally.
4. **6-pdrs with the airlanding battalions on 17 Sep** (KOSB says 3 short and 1 broken; Border and
   the South Staffords are unknown), and **6-pdrs at the bridge** (4 or 5).
5. **Light Regt guns on 17 Sep:** 15 or 16. Five gliders were missing, but not all of them carried
   guns.
6. **Recce Sqn jeep count**, and whether Gough reached the bridge with 2 or 3 jeeps. Which troop was
   attached to 1 Para Bde?
7. **Location of the 18 Sep supply drop:** LZ L [PA-SL; WIKI-A] or DZ X [DIV-R log]. Check Margry
   and Middlebrook.
8. **Time of the 2 Para arrival at the bridge:** 19:30, 20:00 or 20:30 for A Coy, and 22:00–23:00 for
   "bridge captured". Some of the spread is probably the GMT+1 / GMT+2 clock mix.
9. **Time of the Gräbner attack:** 09:00 or 09:30 (British), and 12 or 20 vehicles destroyed [PA-BR18
   text vs caption]. [DIV-R] says about 10.
10. **Second lift arrival:** 14:00–14:30 (unit diaries) or about 15:00–15:15 (Div report, Pegasus).
    Decide which turn it lands in.
11. **Parachute battalion support weapons** (6 or 8 mortars, 4 or 8 MMGs, PIAT totals). Check the WE
    (Airborne) 1944 tables, for example on bayonetstrength.uk.
12. **11 Bn's position at 21:00 on 18 Sep.** No diary gives a time between leaving at 17:30 and
    meeting the South Staffords "in the early hours".
13. **Clock offset with German sources.** Confirm that the German records use GMT+2 before merging
    timelines.
14. **LZ L and the Heveadorp ferry** coordinates should be checked on a 1944 map (Margry, or the
    GSGS 4427 sheets).

---

## 10. Sources

(S) means a secondary or web-only source. The war diaries were read as transcriptions on the Pegasus
Archive. They have not been checked against the National Archives originals.

**Primary documents (war diaries, National Archives WO 171, transcribed by the Pegasus Archive)**
- Index: https://www.pegasusarchive.org/arnhem/war.htm
- [DIV-R] 1st Airborne Division HQ war diary and "Report on Operation MARKET" with annexures
  (WO 171/392) — https://www.pegasusarchive.org/arnhem/war_divhq.htm
- [1PB-WD] 1st Parachute Brigade HQ (WO 171/592), incl. O.O. No. 1 and Lathbury's report —
  https://www.pegasusarchive.org/arnhem/war_1stbde.htm
- [1PARA-WD] 1st Para Bn (WO 171/1236) — https://www.pegasusarchive.org/arnhem/war_1stBatt.htm
- [2PARA-WD] 2nd Para Bn (WO 171/1237), incl. O.O. No. 1 —
  https://www.pegasusarchive.org/arnhem/war_2ndBatt.htm
- [3PARA-WD] 3rd Para Bn — https://www.pegasusarchive.org/arnhem/war_3rdBatt.htm
- [4PB-WD] 4th Parachute Brigade HQ (WO 171/594), incl. O.O. No. 1 —
  https://www.pegasusarchive.org/arnhem/war_4thbde.htm
- [156-WD] 156 Para Bn (WO 171/1247) — https://www.pegasusarchive.org/arnhem/war_156thBatt.htm
- [10PARA-WD] 10th Para Bn (WO 171/1243) — https://www.pegasusarchive.org/arnhem/war_10thBatt.htm
- [11PARA-WD] 11th Para Bn (WO 171/1244) — https://www.pegasusarchive.org/arnhem/war_11thBatt.htm
- [1ALB-WD] 1st Airlanding Brigade HQ (WO 171/589) —
  https://www.pegasusarchive.org/arnhem/war_1albde.htm
- [BORDER-WD] 1st Border (WO 166/15077) — https://www.pegasusarchive.org/arnhem/war_border.htm
- [STAFFS-WD] 2nd South Staffords (WO 171/1375) —
  https://www.pegasusarchive.org/arnhem/war_2ndStaffs.htm
- [KOSB-WD] 7th KOSB (WO 171/1323) — https://www.pegasusarchive.org/arnhem/war_7thkosb.htm
- [RECCE-WD] 1st Airborne Recce Sqn (WO 171/406) —
  https://www.pegasusarchive.org/arnhem/war_recce.htm
- [LTREGT-WD] 1st Airlanding Light Regt RA (WO 171/1016) —
  https://www.pegasusarchive.org/arnhem/war_lightregt.htm
- [HQRA-WD] HQ RA (WO 171/396) — https://www.pegasusarchive.org/arnhem/war_hqra.htm
- [1ATB-WD] 1st Airlanding A/Tk Bty (WO 171/957) —
  https://www.pegasusarchive.org/arnhem/war_1atbty.htm
- [2ATB-WD] 2nd (Oban) Airlanding A/Tk Bty (WO 171/958) —
  https://www.pegasusarchive.org/arnhem/war_2atbty.htm
- [1PSQN-WD] 1st Para Sqn RE (WO 171/1509) —
  https://www.pegasusarchive.org/arnhem/war_1parasqn.htm
- [4PSQN-WD] 4th Para Sqn RE (WO 171/1511) —
  https://www.pegasusarchive.org/arnhem/war_4parasqn.htm
- [9FD-WD] 9th Field Coy RE (WO 171/1513) — https://www.pegasusarchive.org/arnhem/war_9fdcoy.htm
- [RASC-WD] HQ RASC (WO 171/400) — https://www.pegasusarchive.org/arnhem/war_hqrasc.htm
- [250-WD] 250 Lt Comp Coy RASC (WO 171/2416) — https://www.pegasusarchive.org/arnhem/war_250coy.htm
- [1GPR-WD] / [2GPR-WD] 1 and 2 Wings, Glider Pilot Regiment —
  https://www.pegasusarchive.org/arnhem/war_1gpr.htm ;
  https://www.pegasusarchive.org/arnhem/war_2gpr.htm

**Pegasus Archive narrative and reference pages (S; based largely on Middlebrook)**
- [PA-OOB] 1st Airborne Division unit strengths and casualties —
  https://www.pegasusarchive.org/arnhem/order_1st.htm
- [PA-PLAN] The Plan — https://www.pegasusarchive.org/arnhem/depth_groundplan.htm
- [PA-FL] The First Lift — https://www.pegasusarchive.org/arnhem/depth_first_lift.htm
- [PA-1PB17] The 1st Parachute Brigade, 17 Sep —
  https://www.pegasusarchive.org/arnhem/depth_1paraprog.htm
- [PA-2B17] The 2nd Battalion, 17 Sep — https://www.pegasusarchive.org/arnhem/depth_2ndbatt1.htm
- [PA-BR18] Arnhem Bridge, 18 Sep — https://www.pegasusarchive.org/arnhem/depth_bridge18.htm
- [PA-SL] The Second Lift — https://www.pegasusarchive.org/arnhem/depth_secondlift.htm
- [PA-4PB18] The 4th Parachute Brigade, 18 Sep —
  https://www.pegasusarchive.org/arnhem/depth_4para18.htm
- [PA-1PB18] The 1st Parachute Brigade, 18 Sep —
  https://www.pegasusarchive.org/arnhem/depth_1para18.htm
- [PA-1ATB] / [PA-2ATB] / [PA-LR] Unit histories —
  https://www.pegasusarchive.org/arnhem/batt_1stATBat.htm ;
  https://www.pegasusarchive.org/arnhem/batt_2ndATBat.htm ;
  https://www.pegasusarchive.org/arnhem/batt_light_reg.htm

**Books (cited through quotations or online copies; not checked in print)**
- [STEER] Steer, Frank, *Arnhem: The Landing Grounds and Oosterbeek* (Battleground Europe, Pen &
  Sword). **Read through an unauthorised online copy**
  (https://erenow.org/ww/arnhem-the-landing-grounds-and-oosterbeek/3.php and neighbouring pages).
  Check every [STEER] item against a print copy.
- [MSW] "Arnhem: The Battle at the Bridge", warhistory.org. It reproduces Middlebrook's bridge-force
  table ("the best available estimate") and the 18 Sep narrative —
  https://warhistory.org/@msw/article/arnhem-the-battle-at-the-bridge (S)
- [MID-X] Middlebrook, Martin, *Arnhem 1944: The Airborne Battle* (Viking/Penguin, 1994). Battalion
  averages (548 para, 773 glider) and 2 Para's 481, **known only from a search extract** of an online
  copy (silo.pub). Check in print.
- Not consulted, and recommended for verification:
  - Middlebrook, *Arnhem 1944* (full appendices: lift tables and unit strengths).
  - Margry, K. (ed.), *Operation Market-Garden Then and Now* (After the Battle, 2002), for the DZ/LZ
    and SDP maps and the bridge perimeter.
  - Kershaw, *It Never Snows in September* (1990), for the German side and clock times.
  - Ryan, *A Bridge Too Far* (1974).
  - Frost, *A Drop Too Many* (1980).
  - Urquhart, *Arnhem* (1958).
  - Peters & Buist, *Glider Pilots at Arnhem* (2009).
  - The Airborne Museum Hartenstein publications.

**Secondary and web sources**
- [WIKI-A] Wikipedia, "Battle of Arnhem" (S) — https://en.wikipedia.org/wiki/Battle_of_Arnhem
- [WIKI-ALB] Wikipedia, "1st Airlanding Brigade (United Kingdom)" (S) —
  https://en.wikipedia.org/wiki/1st_Airlanding_Brigade_(United_Kingdom)
- [WIKI-LR] Wikipedia, "1st Airlanding Light Regiment" (S) —
  https://en.wikipedia.org/wiki/1st_Airlanding_Light_Regiment
- [WIKI-JFB] Wikipedia, "John Frost Bridge" (S) — https://en.wikipedia.org/wiki/John_Frost_Bridge
- [WIKI-5PB] Wikipedia, "5th Parachute Brigade (United Kingdom)" and battalion articles, for the
  parachute battalion establishment (S) —
  https://en.wikipedia.org/wiki/5th_Parachute_Brigade_(United_Kingdom)
- [HN-GUN] "Gunners at Arnhem", HistoryNet (S) — https://historynet.com/gunners-at-arnhem/
- [AJ-17] "The 17 pounder Anti-Tank Guns at Operation Market-Garden", Arnhem Jim blog (S) —
  https://arnhemjim.blogspot.com/2012/10/the-17-pounder-anti-tank-guns-at.html
- [AJ-HAM] "The Hamilcar Gliders at Operation Market-Garden", Arnhem Jim blog (S) —
  https://arnhemjim.blogspot.com/2012/06/hamilcar-gliders-at-operation-market.html
- [RAFM3] / [RAFM4] RAF Museum, "The Royal Air Force and Operation Market Garden", chapters 3 and 4
  (S) — https://www.rafmuseum.org.uk/blog/the-royal-air-force-and-operation-market-garden-chapter-3/ ;
  https://www.rafmuseum.org.uk/blog/the-royal-air-force-and-operation-market-garden-chapter-4/
- [BOA-RECCE] / [BOA-S18] / [BOA-GINKEL] battle-of-arnhem.com (Patrick Arink), articles on the Recce
  Squadron, on 18 Sep in western Arnhem, and on Ginkel Heath (S) —
  https://www.battle-of-arnhem.com/the-failed-race-to-the-rhine-bridge-by-the-1st-airborne-reconnaissance-squadron/
  (site certificate expired when read; other articles under https://www.battle-of-arnhem.com/tag/september-18)
- [VMG] "An Airlanding Battalion of 1944–45", Vickers MG Collection (S) —
  https://vickersmg.blog/in-use/british-service/the-british-army/an-airlanding-battalion-of-1944-45/
- [TFT] treefrogtreasures forum thread "Battle for Arnhem", quoting Middlebrook on Recce Sqn jeeps
  (S, forum) — https://forum.treefrogtreasures.com/goto/post?id=900311
- [OSM] OpenStreetMap Nominatim place positions, queried Oct 2026 —
  https://nominatim.openstreetmap.org/
