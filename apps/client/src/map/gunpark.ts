import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { soldier } from './figures3d.ts';
import type { ModelId } from './catalog3d.ts';
import { buildGun, isGunId } from './ordnance3d.ts';
import { buildVehicle } from './vehicles3d.ts';
import { onThemeChange, setThemeChoice, themeChoice, tokenColour, type ThemeChoice } from '../theme.ts';
import { bakeCamoCoordinates, choose, chosenScheme, paintMaterial, schemesFor, type FigureKind, type PaintSubject, type Scheme } from './paint.ts';

/**
 * The Gun Park: the game's artillery and soldiers on a turntable, full size,
 * with each one's facts and a choice of historical paint schemes. A choice is
 * saved in this browser and repaints the 3D map's miniatures. Cosmetic only.
 */

type Side = 'allied' | 'german';

type Group = 'artillery' | 'anti-tank' | 'armour';

interface GunEntry {
  kind: 'gun';
  id: ModelId;
  side: Side;
  group: Group;
  name: string;
  nation: string;
  /** Label and value pairs for the card. */
  facts: [string, string][];
  /** Artillery only: real maximum range in km, and the game's range in 1 km hexes. */
  range?: number;
  game?: number;
  /** How the game rates it in direct fire. */
  inGame?: string;
  units: string[];
  note: string;
}
interface FigureEntry {
  kind: 'figure';
  id: FigureKind;
  side: Side;
  name: string;
  helmet: string;
  units: string[];
  note: string;
}
type Entry = GunEntry | FigureEntry;

/** The game's direct-fire rating, from the rules' weapon classes: range in hexes, then hard and soft fire. */
const rated = (range: number, hard: number, soft: number) => `Direct fire to ${range} hex${range === 1 ? '' : 'es'} · ${hard} against vehicles · ${soft} against infantry`;
const art = (cal: string, weight: string, shell: string): [string, string][] => [['Calibre', cal], ['Weight', weight], ['Shell', shell]];
const veh = (weight: string, crew: number, gun: string, armour: string, speed: string): [string, string][] => [['Weight', weight], ['Crew', String(crew)], ['Gun', gun], ['Armour', armour], ['Road speed', speed]];

const GUNS: GunEntry[] = [
  // Allied artillery
  { kind: 'gun', id: 'pack-75', side: 'allied', group: 'artillery', name: '75 mm Pack Howitzer M1A1', nation: 'United States', facts: art('75 mm', '653 kg', '6.2 kg'), range: 8.8, game: 8,
    units: ['376th Parachute Field Artillery Bn · 10', '456th Parachute Field Artillery Bn · 11', '319th Glider Field Artillery Bn · 12'],
    note: 'Breaks down into nine loads for parachute or glider delivery. The 82nd Airborne\u2019s main artillery at Nijmegen.' },
  { kind: 'gun', id: 'm3-105', side: 'allied', group: 'artillery', name: '105 mm Howitzer M3', nation: 'United States', facts: art('105 mm', '1,130 kg', '15 kg'), range: 7.6, game: 7,
    units: ['320th Glider Field Artillery Bn · 12'], note: 'A shortened 105 mm barrel on a pack-howitzer-type split-trail carriage, light enough to fly in by glider.' },
  { kind: 'gun', id: 'gun-25pdr', side: 'allied', group: 'artillery', name: 'Ordnance QF 25-pounder', nation: 'United Kingdom', facts: art('87.6 mm', '1,800 kg', '11.3 kg'), range: 12.3, game: 12,
    units: ['55th (West Somerset Yeomanry) Field Regt RA · 24 (from turn 3)'], note: 'Fires from its circular platform, so the crew can swing it through a full circle. Comes up the corridor with the Guards.' },
  { kind: 'gun', id: 'sexton', side: 'allied', group: 'artillery', name: 'Sexton self-propelled 25-pounder', nation: 'Canada / United Kingdom', facts: art('87.6 mm', '25.9 t', '11.3 kg'), range: 12.3, game: 12,
    units: ['153rd (Leicestershire Yeomanry) Field Regt RA · 24 (from turn 3)'], note: 'A 25-pounder in an open-topped hull on a Ram tank chassis, so the guns keep up with the armour.' },
  // Allied anti-tank guns
  { kind: 'gun', id: 'towed-17pdr', side: 'allied', group: 'anti-tank', name: '17-pounder anti-tank gun', nation: 'United Kingdom', facts: [['Calibre', '76.2 mm'], ['Weight', '3,040 kg'], ['Penetration', 'about 130 mm at 1,000 m']], inGame: rated(2, 10, 1),
    units: ['21st Anti-Tank Regt RA (part) · 6 (from turn 4)'], note: 'The most powerful Allied anti-tank gun in the battle, able to kill a Panther from the front.' },
  { kind: 'gun', id: 'six-pdr', side: 'allied', group: 'anti-tank', name: '6-pounder anti-tank gun', nation: 'United Kingdom', facts: [['Calibre', '57 mm'], ['Weight', '1,140 kg'], ['Penetration', 'about 80 mm at 1,000 m']], inGame: rated(2, 10, 1),
    units: ['1st (Motor) Bn Grenadier Guards · 12', '5th Bn Coldstream Guards · 6 (from turn 3)', '3rd Bn Irish Guards · 6 (from turn 4)', '1st Bn Welsh Guards · 6 (from turn 6)'], note: 'The infantry battalions\u2019 own anti-tank guns, towed by carriers.' },
  { kind: 'gun', id: 'us-57mm', side: 'allied', group: 'anti-tank', name: '57 mm Gun M1', nation: 'United States', facts: [['Calibre', '57 mm'], ['Weight', '1,230 kg'], ['Penetration', 'about 75 mm at 1,000 m']], inGame: rated(2, 10, 1),
    units: ['1st Bn, 505th Parachute Infantry · 2', '1st Bn, 508th Parachute Infantry · 2', '3rd Bn, 508th Parachute Infantry · 6'], note: 'The American-built 6-pounder, flown in by glider with the 80th Airborne Anti-Aircraft (Anti-Tank) Battalion.' },
  // Allied armour
  { kind: 'gun', id: 'sherman-75', side: 'allied', group: 'armour', name: 'Sherman V', nation: 'United States, in British service', facts: veh('31.6 t', 5, '75 mm M3', 'up to 76 mm', '40 km/h'), inGame: rated(2, 8, 6),
    units: ['2nd (Armoured) Bn Grenadier Guards · 31', '1st (Armoured) Bn Coldstream Guards · 40 (from turn 3)', '2nd (Armoured) Bn Irish Guards · 34 (from turn 4)', 'Sherwood Rangers Yeomanry · 45 (from turn 11)'],
    note: 'The M4A4 with its long hull: the Guards\u2019 main tank, which crossed the Waal road bridge at dusk on 20 September.' },
  { kind: 'gun', id: 'sherman-firefly', side: 'allied', group: 'armour', name: 'Sherman VC Firefly', nation: 'United Kingdom', facts: veh('34.8 t', 4, '17-pounder', 'up to 76 mm', '40 km/h'), inGame: rated(2, 12, 6),
    units: ['2nd (Armoured) Bn Grenadier Guards · 9', '1st (Armoured) Bn Coldstream Guards · 12 (from turn 3)', '2nd (Armoured) Bn Irish Guards · 10 (from turn 4)', 'Sherwood Rangers Yeomanry · 12 (from turn 11)'],
    note: 'A Sherman with the 17-pounder, about one in each troop of four. Its long barrel made it the first target German gunners looked for.' },
  { kind: 'gun', id: 'stuart', side: 'allied', group: 'armour', name: 'M5 Stuart', nation: 'United States, in British service', facts: veh('15 t', 4, '37 mm M6', 'up to 64 mm', '58 km/h'), inGame: rated(2, 4, 4),
    units: ['2nd (Armoured) Bn Grenadier Guards · 6', '1st (Armoured) Bn Coldstream Guards · 8 (from turn 3)', '2nd (Armoured) Bn Irish Guards · 6 (from turn 4)', '2nd (Armoured Reconnaissance) Bn Welsh Guards · 8 (from turn 6)'],
    note: 'The light tank of the battalions\u2019 reconnaissance troops.' },
  { kind: 'gun', id: 'cromwell', side: 'allied', group: 'armour', name: 'Cromwell', nation: 'United Kingdom', facts: veh('27.9 t', 5, '75 mm', 'up to 76 mm', '64 km/h'), inGame: rated(2, 8, 6),
    units: ['2nd (Armoured Reconnaissance) Bn Welsh Guards · 40 (from turn 6)'], note: 'Fast and low, on Christie suspension: the Welsh Guards\u2019 cruiser tank.' },
  { kind: 'gun', id: 'challenger', side: 'allied', group: 'armour', name: 'A30 Challenger', nation: 'United Kingdom', facts: veh('33 t', 5, '17-pounder', 'up to 102 mm', '52 km/h'), inGame: rated(2, 12, 6),
    units: ['2nd (Armoured Reconnaissance) Bn Welsh Guards · 6 (from turn 6)'], note: 'A stretched Cromwell with a tall turret, built to give the cruiser regiments a 17-pounder.' },
  { kind: 'gun', id: 'm10-17pdr', side: 'allied', group: 'armour', name: 'M10 Achilles', nation: 'United States / United Kingdom', facts: veh('29.6 t', 5, '17-pounder', 'up to 57 mm, open top', '51 km/h'), inGame: rated(2, 12, 4),
    units: ['21st Anti-Tank Regt RA (part) · 12 (from turn 4)'], note: 'An American tank destroyer re-armed by the British with the 17-pounder.' },
  { kind: 'gun', id: 'daimler-ac', side: 'allied', group: 'armour', name: 'Daimler armoured car', nation: 'United Kingdom', facts: veh('7.6 t', 3, '2-pounder', 'up to 16 mm', '80 km/h'), inGame: rated(2, 1, 3),
    units: ['2nd Household Cavalry Regiment (B Sqn) · 12'], note: 'The Household Cavalry scouted ahead of the Guards on these, and reached the 82nd at Grave first.' },
  // German artillery
  { kind: 'gun', id: 'lefh-18', side: 'german', group: 'artillery', name: '10.5 cm leFH 18', nation: 'Germany', facts: art('105 mm', '1,985 kg', '14.8 kg'), range: 10.7, game: 10,
    units: ['SS-Artillerie-Ausbildungs- und Ersatz-Regiment · 4', 'Battery, SS-Panzer-Artillerie-Regiment 10 · 4'], note: 'The German divisional workhorse. Many still rode on the large spoked wheels of horse-drawn batteries.' },
  { kind: 'gun', id: 'sfh-18', side: 'german', group: 'artillery', name: '15 cm sFH 18', nation: 'Germany', facts: art('149 mm', '5,512 kg', '43.5 kg'), range: 13.3, game: 13,
    units: ['SS-Artillerie-Ausbildungs- und Ersatz-Regiment · 4'], note: 'The standard German heavy field howitzer, shelling the approaches to the Waal bridges from north of the river.' },
  { kind: 'gun', id: 'ml-20', side: 'german', group: 'artillery', name: '152 mm ML-20 (captured)', nation: 'Soviet Union, in German service', facts: art('152 mm', '7,270 kg', '43.6 kg'), range: 17.2, game: 17,
    units: ['Korps Feldt artillery · 9'], note: 'A Soviet gun-howitzer taken in the East and issued to German units as the 15.2 cm KH 433/1.' },
  // German anti-tank and flak
  { kind: 'gun', id: 'flak-88', side: 'german', group: 'anti-tank', name: '8.8 cm Flak 36', nation: 'Germany', facts: [['Calibre', '88 mm'], ['Weight', '7,400 kg travelling'], ['Penetration', 'about 100 mm at 1,000 m']], inGame: rated(3, 14, 4),
    units: ['4./schwere Flak-Abteilung 572 (south bank guns) · 2', 'Fort Hof van Holland garrison · 1', 'Flak on the railway bridge and at Lent · 3', 'KG Hermann, 1st battalion · 1 (from turn 9)'], note: 'An anti-aircraft gun turned on tanks, the deadliest gun on the field. Shown with the shield fitted for ground fighting.' },
  { kind: 'gun', id: 'flak-20', side: 'german', group: 'anti-tank', name: '2 cm Flak 38', nation: 'Germany', facts: [['Calibre', '20 mm'], ['Weight', '420 kg in action'], ['Rate of fire', '420 to 480 rounds a minute']], inGame: rated(2, 2, 4),
    units: ['4./schwere Flak-Abteilung 572 · 4', 'Flak on the railway bridge and at Lent · 4', 'KG Greschick, three battalions · 14 (from turn 9)', 'KG Hermann, 1st battalion · 3 (from turn 9)'], note: 'Light flak, used with terrible effect against infantry and the paratroopers\u2019 boats crossing the Waal.' },
  { kind: 'gun', id: 'pak-light', side: 'german', group: 'anti-tank', name: '5 cm PaK 38', nation: 'Germany', facts: [['Calibre', '50 mm'], ['Weight', '1,000 kg'], ['Penetration', 'about 60 mm at 1,000 m']], inGame: rated(2, 6, 1),
    units: ['Kampfgruppe Euling · 5'], note: 'The scenario lists 3.7, 4.7 and 5 cm guns together; shown as the 5 cm PaK 38.' },
  // German armour
  { kind: 'gun', id: 'stug-iii', side: 'german', group: 'armour', name: 'StuG III Ausf. G', nation: 'Germany', facts: veh('23.9 t', 4, '7.5 cm StuK 40 L/48', 'up to 80 mm', '40 km/h'), inGame: rated(2, 11, 5),
    units: ['Frundsberg Sturmgeschütze · 2 (from turn 15)', 'Kampfgruppe Euling · 4 (type disputed: StuG III or Jagdpanzer IV/70)'], note: 'A turretless assault gun, low and hard to see, with side skirts against anti-tank rifles.' },
  { kind: 'gun', id: 'tank-de', side: 'german', group: 'armour', name: 'Panther', nation: 'Germany', facts: veh('44.8 t', 5, '7.5 cm KwK 42 L/70', 'up to 110 mm', '46 km/h'), inGame: rated(2, 8, 6),
    units: ['Tanks with KG Hermann · 3 (from turn 9; a Panther per Saunders, type uncertain)'], note: 'The best German medium tank, its long gun able to outrange every Allied tank here.' },
  { kind: 'gun', id: 'tiger-i', side: 'german', group: 'armour', name: 'Tiger I', nation: 'Germany', facts: veh('57 t', 5, '8.8 cm KwK 36 L/56', 'up to 120 mm', '45 km/h'), inGame: rated(3, 14, 7),
    units: ['Campaign: s.Pz.Kp. Hummel · 2 (from turn 27) and 10 (from turn 33)'], note: 'The heavy tank of 1942, still nearly proof against a Sherman from the front. Hummel\u2019s company reached Arnhem from 19 September and crossed the road bridge on the evening of the 20th.' },
  { kind: 'gun', id: 'tank-fr', side: 'german', group: 'armour', name: 'Char B1 bis (captured)', nation: 'France, in German service', facts: veh('31.5 t', 4, '75 mm in the hull, 47 mm in the turret', 'up to 60 mm', '28 km/h'), inGame: rated(2, 4, 4),
    units: ['Campaign: Panzer-Kompanie 224 · 11 (from turn 21; with Renault, Hotchkiss and Somua tanks)'], note: 'French tanks taken in 1940 and issued to second-line units; some B1s carried flame-throwers. They attacked the Border on the west of the Oosterbeek perimeter.' },
  { kind: 'gun', id: 'flak-20-sp', side: 'german', group: 'armour', name: 'Sd.Kfz. 10/4', nation: 'Germany', facts: veh('about 5 t', 7, '2 cm Flak 30 or 38', 'none', '65 km/h'), inGame: rated(2, 2, 4),
    units: ['Halftrack company von Fürstenberg · 3'], note: 'A light halftrack carrying a 2 cm Flak on its open bed.' },
  { kind: 'gun', id: 'ac-de', side: 'german', group: 'armour', name: 'Sd.Kfz. 222 armoured car', nation: 'Germany', facts: veh('4.8 t', 3, '2 cm KwK 30', 'up to 14.5 mm', '80 km/h'), inGame: rated(2, 1, 3),
    units: ['Halftrack company von Fürstenberg · 5 (type unknown; shown as an Sd.Kfz. 222)'], note: 'A light four-wheeled scout car with an open turret under a wire anti-grenade screen.' },
];
const FIGURES: FigureEntry[] = [
  { kind: 'figure', id: 'us-para', side: 'allied', name: 'US paratrooper', helmet: 'M2 steel helmet: deep and round, with the paratroop chinstrap',
    units: ['504th, 505th and 508th Parachute Infantry', '307th Airborne Engineer Bn'], note: 'The 82nd Airborne, dropped round Groesbeek and Grave on 17 September.' },
  { kind: 'figure', id: 'uk-para', side: 'allied', name: 'British paratrooper', helmet: 'Airborne steel helmet: a plain rimless dome on a leather chinstrap',
    units: ['Arnhem: 1st, 4th Parachute and 1st Airlanding Brigades, 1st Airborne Division', 'The Glider Pilot Regiment'], note: 'The 1st British Airborne Division, landed west of Arnhem on 17 and 18 September.' },
  { kind: 'figure', id: 'uk', side: 'allied', name: 'British infantryman', helmet: 'Mk II "Brodie": a shallow bowl on a wide, flat brim',
    units: ['1st (Motor) Bn Grenadier Guards', '5th Coldstream, 3rd Irish and 1st Welsh Guards'], note: 'The Guards Armoured Division’s infantry, up the corridor with XXX Corps.' },
  { kind: 'figure', id: 'de', side: 'german', name: 'German soldier', helmet: 'M42 Stahlhelm: a tall crown and a skirt flaring over the neck and ears',
    units: ['406th Division, KG Göbel, IB 526', 'KG Greschick, Bataillon Isphording', 'KG Henke and the Fort Hof van Holland garrison'], note: 'Army, training, depot and security troops, the bulk of the German infantry here.' },
  { kind: 'figure', id: 'de-ss', side: 'german', name: 'Waffen-SS grenadier', helmet: 'M42 Stahlhelm under a camouflage cover',
    units: ['Kampfgruppe Euling', 'Kampfgruppe Reinhold'], note: 'From the 10th SS Panzer Division Frundsberg, holding the Valkhof, Hunner Park and Lent.' },
  { kind: 'figure', id: 'de-fj', side: 'german', name: 'Fallschirmjäger', helmet: 'Paratroop helmet: a smooth dome with straight sides and no rim',
    units: ['KG Becker: Fallschirmjäger-Regiments 5, 8 and 9', 'KG Hermann and KG Budde'], note: 'German paratroops, counter-attacking from the Reichswald.' },
];
const ENTRIES: Entry[] = [...GUNS, ...FIGURES];
const MAX_RANGE = 18;

const crewFor = (e: GunEntry): FigureKind => (e.side === 'allied' ? (e.nation.startsWith('United States') && e.group !== 'armour' ? 'us-para' : 'uk') : 'de');

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class GunPark {
  private readonly root: HTMLElement;
  private readonly onClose: () => void;
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  private controls: OrbitControls | null = null;
  private readonly display = new THREE.Group();
  private turntable = new THREE.Group();
  private strip: THREE.Mesh | null = null;
  private current: Entry = GUNS[2]!;
  private lineup = false;
  private showCrew = true;
  private tags: { el: HTMLElement; pos: THREE.Vector3 }[] = [];
  private flight: { t0: number; ms: number; fp: THREE.Vector3; ft: THREE.Vector3; tp: THREE.Vector3; tt: THREE.Vector3 } | null = null;
  private frameId = 0;
  private readonly cleanup: (() => void)[] = [];

  constructor(root: HTMLElement, onClose: () => void) {
    this.root = root;
    this.onClose = onClose;
  }

  mount(): void {
    const root = this.root;
    root.innerHTML = `
      <div class="gp-stage"></div>
      <div class="gp-labels"></div>
      <aside class="gp-panel gp-register" aria-label="Guns and soldiers">
        <div class="gp-head">
          <div><div class="gp-eyebrow">WW2Hex · Market Garden 1944</div><h1>Gun Park</h1></div>
          <button type="button" class="gp-close" aria-label="Close the Gun Park" title="Close">×</button>
        </div>
        <div><div class="gp-eyebrow gp-side allied">Allied artillery</div><ul class="gp-list" data-group="allied-artillery"></ul></div>
        <div><div class="gp-eyebrow gp-side allied">Allied anti-tank guns</div><ul class="gp-list" data-group="allied-anti-tank"></ul></div>
        <div><div class="gp-eyebrow gp-side allied">Allied armour</div><ul class="gp-list" data-group="allied-armour"></ul></div>
        <div><div class="gp-eyebrow gp-side german">German artillery</div><ul class="gp-list" data-group="german-artillery"></ul></div>
        <div><div class="gp-eyebrow gp-side german">German anti-tank and flak</div><ul class="gp-list" data-group="german-anti-tank"></ul></div>
        <div><div class="gp-eyebrow gp-side german">German armour</div><ul class="gp-list" data-group="german-armour"></ul></div>
        <div><div class="gp-eyebrow">Soldiers</div><ul class="gp-list" data-group="figure"></ul></div>
        <div class="gp-chips" role="group" aria-label="View">
          <button class="gp-chip" data-t="lineup" aria-pressed="false">Line-up to scale</button>
          <button class="gp-chip" data-t="crew" aria-pressed="true">Crewman</button>
          <button class="gp-chip" data-t="spin" aria-pressed="true">Turn</button>
          <button class="gp-chip gp-theme" data-t="theme" aria-pressed="false"></button>
        </div>
      </aside>
      <aside class="gp-panel gp-card" aria-live="polite"></aside>
      <div class="gp-hint">Drag to turn · scroll or pinch to zoom · right-drag to move</div>`;
    root.querySelector<HTMLButtonElement>('.gp-close')!.onclick = () => this.onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.onClose();
    };
    window.addEventListener('keydown', onKey);
    this.cleanup.push(() => window.removeEventListener('keydown', onKey));

    const stage = root.querySelector<HTMLElement>('.gp-stage')!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    stage.appendChild(renderer.domElement);
    const controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = 1.48;
    controls.minDistance = 1.2;
    controls.maxDistance = 60;
    controls.zoomSpeed = 1.8;
    controls.autoRotateSpeed = 0.9;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = !reduced;
    const spin = root.querySelector<HTMLButtonElement>('[data-t="spin"]')!;
    if (reduced) spin.setAttribute('aria-pressed', 'false');
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
      spin.setAttribute('aria-pressed', 'false');
    });

    const paintSky = () => {
      const sky = tokenColour('--gp-sky', 0xdcdfd6);
      this.scene.background = new THREE.Color(sky);
      this.scene.fog = new THREE.Fog(sky, 30, 90);
    };
    paintSky();
    this.cleanup.push(onThemeChange(paintSky));
    this.scene.add(new THREE.HemisphereLight(0xf3f1e6, 0x51503f, 1.9));
    const sun = new THREE.DirectionalLight(0xfff2da, 2.6);
    sun.position.set(-8, 14, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
    sun.shadow.bias = -0.0003;
    this.scene.add(sun);
    this.buildGround();
    this.scene.add(this.display);

    // Light, dark or the computer's setting, for the Gun Park and the whole game.
    const themeBtn = root.querySelector<HTMLButtonElement>('[data-t="theme"]')!;
    const next: Record<ThemeChoice, ThemeChoice> = { light: 'dark', dark: 'auto', auto: 'light' };
    const label: Record<ThemeChoice, string> = { light: '☀ Light', dark: '☾ Dark', auto: '◐ Auto' };
    const showTheme = () => {
      themeBtn.textContent = label[themeChoice()];
      themeBtn.title = `Screens: ${label[themeChoice()].slice(2)}. Click for ${label[next[themeChoice()]].slice(2).toLowerCase()}.`;
    };
    showTheme();
    this.cleanup.push(onThemeChange(showTheme));
    themeBtn.onclick = () => setThemeChoice(next[themeChoice()]);
    for (const b of root.querySelectorAll<HTMLButtonElement>('.gp-chip:not(.gp-theme)')) {
      b.onclick = () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        if (b.dataset.t === 'lineup') this.lineup = on;
        if (b.dataset.t === 'crew') this.showCrew = on;
        if (b.dataset.t === 'spin') controls.autoRotate = on;
        if (b.dataset.t !== 'spin') this.refresh();
      };
    }
    const resize = () => {
      const w = root.clientWidth || 1;
      const h = root.clientHeight || 1;
      renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    this.cleanup.push(() => observer.disconnect());
    resize();

    this.camera.position.set(9, 5, 10);
    controls.target.set(0, 0.6, 0);
    this.refresh();
    const loop = (now: number) => {
      this.frame(now);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    for (const off of this.cleanup) off();
    this.controls?.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.renderer?.dispose();
    this.root.innerHTML = '';
  }

  // -------------------------------------------------------------------------

  private refresh(): void {
    this.renderList();
    if (this.lineup) this.showLineup();
    else this.showOne(this.current);
  }

  private buildGround(): void {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = '#7d8a57';
    g.fillRect(0, 0, 512, 512);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 9000; i++) {
      const v = 90 + rand() * 70;
      g.fillStyle = `rgba(${(v * 0.85) | 0}, ${v | 0}, ${(v * 0.55) | 0}, 0.35)`;
      g.fillRect(rand() * 512, rand() * 512, 2, 4 + rand() * 6);
    }
    const grass = new THREE.CanvasTexture(c);
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
    grass.colorSpace = THREE.SRGBColorSpace;
    grass.repeat.set(6, 6);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.25, 72), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
    disc.position.y = -0.125;
    disc.receiveShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(6.35, 6.45, 0.4, 72, 1, true), new THREE.MeshStandardMaterial({ color: 0x5c5040, roughness: 0.9 }));
    rim.position.y = -0.2;
    this.turntable.add(disc, rim);
    this.scene.add(this.turntable);
    const long = grass.clone();
    long.repeat.set(4, 26);
    long.needsUpdate = true;
    this.strip = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 30), new THREE.MeshStandardMaterial({ map: long, roughness: 1 }));
    this.strip.position.y = -0.125;
    this.strip.receiveShadow = true;
    this.strip.visible = false;
    this.scene.add(this.strip);
  }

  /** A gun or a soldier in its chosen paint, its patterns laid across the whole model. */
  private model(e: Entry): THREE.Group {
    const g = e.kind === 'gun' ? (isGunId(e.id) ? buildGun(e.id, paintMaterial(chosenScheme(e.id))) : buildVehicle(e.id as Parameters<typeof buildVehicle>[0], paintMaterial(chosenScheme(e.id)))) : this.figure(e.id, 0);
    bakeCamoCoordinates(g);
    return g;
  }
  private figure(kind: FigureKind, pose: number): THREE.Group {
    const holder = new THREE.Group();
    holder.add(soldier(kind, paintMaterial(chosenScheme(kind), 0.9), pose));
    bakeCamoCoordinates(holder);
    return holder;
  }

  private clear(): void {
    while (this.display.children.length) this.display.remove(this.display.children[0]!);
    for (const t of this.tags) t.el.remove();
    this.tags = [];
  }

  private frameView(dist: number, target: THREE.Vector3): void {
    const dir = new THREE.Vector3(1.0, 0.55, 1.15).normalize();
    this.flyTo(target.clone().add(dir.multiplyScalar(dist)), target);
  }

  private showOne(e: Entry): void {
    this.clear();
    this.turntable.visible = true;
    this.strip!.visible = false;
    const m = this.model(e);
    this.display.add(m);
    const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
    if (e.kind === 'gun') {
      if (this.showCrew) {
        const crew = this.figure(crewFor(e), 1);
        crew.position.set(-size.x * 0.15, 0, size.z / 2 + 0.6);
        crew.rotation.y = -0.6;
        this.display.add(crew);
      }
      this.frameView(Math.max(size.x, size.y * 2) * 1.35 + 2.2, new THREE.Vector3(0, size.y * 0.42, 0));
    } else {
      // A soldier: three in different poses, close up.
      m.rotation.y = 0.5;
      for (const [x, z, pose, turn] of [[-0.7, 0.9, 1, 0.2], [-0.5, -0.9, 2, 0.8]] as const) {
        const f = this.figure(e.id, pose);
        f.position.set(x, 0, z);
        f.rotation.y = turn;
        this.display.add(f);
      }
      this.frameView(4.2, new THREE.Vector3(0, 1.0, 0));
    }
    this.renderCard(e);
  }

  private showLineup(): void {
    this.clear();
    this.turntable.visible = false;
    this.strip!.visible = true;
    const group = this.current.kind === 'gun' ? this.current.group : 'artillery';
    const sized = GUNS.filter((g) => g.group === group).map((g) => {
      const m = this.model(g);
      return { g, m, size: new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()) };
    }).sort((a, b) => a.size.x - b.size.x);
    const gap = 1.4;
    const total = sized.reduce((s, x) => s + x.size.z, 0) + gap * (sized.length - 1);
    let z = -total / 2;
    for (const { g, m, size } of sized) {
      m.position.set(0, 0, z + size.z / 2);
      this.display.add(m);
      const el = document.createElement('div');
      el.className = `gp-tag ${g.side}`;
      el.textContent = g.name.replace(' (captured)', '');
      this.root.querySelector('.gp-labels')!.appendChild(el);
      this.tags.push({ el, pos: new THREE.Vector3(0, size.y + 0.5, z + size.z / 2) });
      z += size.z + gap;
    }
    if (this.showCrew) {
      const crew = this.figure('uk', 0);
      crew.position.set(-1.5, 0, z + 0.4);
      this.display.add(crew);
    }
    this.strip!.geometry.dispose();
    this.strip!.geometry = new THREE.BoxGeometry(14, 0.25, total + 6);
    this.frameView(total * 0.95 + 4, new THREE.Vector3(0, 0.8, 0));
    this.renderCard(null, group, sized.map((x) => x.g));
  }

  private flyTo(pos: THREE.Vector3, target: THREE.Vector3): void {
    if (!this.controls) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      return;
    }
    this.flight = { t0: performance.now(), ms: 900, fp: this.camera.position.clone(), ft: this.controls.target.clone(), tp: pos, tt: target };
  }

  private renderList(): void {
    const groups: Record<string, Entry[]> = { figure: FIGURES };
    for (const g of GUNS) (groups[`${g.side}-${g.group}`] ??= []).push(g);
    for (const ul of this.root.querySelectorAll<HTMLElement>('.gp-list')) {
      ul.innerHTML = groups[ul.dataset.group!]!.map((e) => `
        <li><button class="gp-item" data-id="${e.id}" aria-pressed="${!this.lineup && e.id === this.current.id}">
          <span>${esc(e.name.replace(' (captured)', ''))}</span><span class="gp-cal ${e.kind === 'figure' ? e.side : ''}">${esc(e.kind === 'gun' ? (e.facts.find(([k]) => k === 'Calibre')?.[1] ?? '') : e.side === 'allied' ? 'Allied' : 'German')}</span>
        </button></li>`).join('');
    }
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('.gp-item')) {
      b.onclick = () => {
        this.current = ENTRIES.find((e) => e.id === b.dataset.id)!;
        this.lineup = false;
        this.root.querySelector('[data-t="lineup"]')!.setAttribute('aria-pressed', 'false');
        this.refresh();
      };
    }
  }

  private paintSection(subject: PaintSubject): string {
    const current = chosenScheme(subject);
    const swatch = (s: Scheme) => {
      const [a, b, c] = s.colours;
      const bg = !b ? a : `linear-gradient(135deg, ${a} 0 45%, ${b} 45% 72%, ${c ?? a} 72%)`;
      return `<span class="gp-swatch" style="background:${bg}"></span>`;
    };
    return `
      <div>
        <div class="gp-eyebrow">Paint</div>
        <div class="gp-schemes" role="radiogroup" aria-label="Paint scheme">
          ${schemesFor(subject).map((s) => `
            <button type="button" class="gp-scheme" role="radio" data-scheme="${s.id}" aria-checked="${s.id === current.id}" title="${esc(s.note)}">
              ${swatch(s)}<span>${esc(s.name)}</span>
            </button>`).join('')}
        </div>
        <p class="gp-note">${esc(current.note)} Your choice also paints this ${subject.startsWith('vehicles') ? 'army’s vehicles' : 'model'} on the 3D map.</p>
      </div>`;
  }

  private renderCard(e: Entry | null, group: Group = 'artillery', lined: GunEntry[] = []): void {
    const card = this.root.querySelector<HTMLElement>('.gp-card')!;
    const units = (list: string[]) => `<div><div class="gp-eyebrow">In the scenario</div><ul class="gp-units">${list.map((u) => `<li>${esc(u)}</li>`).join('')}</ul></div>`;
    const bar = (real: number, game: number) => `<div class="gp-bar"><span class="real" style="width:${(real / MAX_RANGE) * 100}%"></span><span class="game" style="width:${(game / MAX_RANGE) * 100}%"></span></div>`;
    if (!e) {
      const title = { artillery: 'The artillery', 'anti-tank': 'The anti-tank guns and flak', armour: 'The armour' }[group];
      card.innerHTML = `
        <div><div class="gp-eyebrow">Line-up</div><h2>${title}, to scale</h2>
        <p class="gp-who">Shortest to longest, side by side, all facing the same way, with a 1.75 m soldier at the end of the row.</p></div>
        ${group === 'artillery' ? `<div class="gp-range">
          ${[...lined].sort((a, b) => a.range! - b.range!).map((g) => `
            <div>
              <div class="gp-range-legend"><span class="${g.side}">${esc(g.name.replace(' (captured)', ''))}</span><span>${g.range} km · ${g.game} hex</span></div>
              ${bar(g.range!, g.game!)}
            </div>`).join('')}
          <div class="gp-range-legend"><span>Grey: real maximum range</span><span>Gold: range in the game</span></div>
        </div>` : `<ul class="gp-units">${lined.map((g) => `<li><span class="${g.side}">${esc(g.name)}</span>: ${esc(g.facts.find(([k]) => k === 'Weight')?.[1] ?? '')}</li>`).join('')}</ul>`}
        <p class="gp-note">Pick anything on the left to see it on its own and choose its paint.</p>`;
      return;
    }
    if (e.kind === 'figure') {
      card.innerHTML = `
        <div><div class="gp-eyebrow ${e.side}">${e.side === 'allied' ? 'Allied' : 'German'} · Soldiers</div><h2>${esc(e.name)}</h2></div>
        <dl><dt>Helmet</dt><dd class="gp-text">${esc(e.helmet)}</dd></dl>
        ${units(e.units)}
        <p class="gp-note">${esc(e.note)} Enemy units you have only spotted always show as the side's ordinary soldiers.</p>
        ${this.paintSection(e.id)}`;
    } else {
      let range = '';
      if (e.range !== undefined && e.game !== undefined) {
        const diff = e.game - e.range;
        const flag = Math.abs(diff) >= 1.5 ? `<p class="gp-flag">The game gives it ${e.game} hexes, ${diff > 0 ? 'more' : 'less'} than the real gun's ${e.range} km.</p>` : '';
        range = `<dl><dt>Range</dt><dd>${e.range} km real · ${e.game} hexes in game</dd></dl>
          <div class="gp-range">${bar(e.range, e.game)}<div class="gp-range-legend"><span>Grey: real</span><span>Gold: in the game</span><span>${MAX_RANGE} km</span></div></div>${flag}`;
      }
      card.innerHTML = `
        <div><div class="gp-eyebrow ${e.side}">${e.side === 'allied' ? 'Allied' : 'German'} · ${esc(e.nation)}</div><h2>${esc(e.name)}</h2></div>
        <dl>${e.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${range}
        ${e.inGame ? `<div><div class="gp-eyebrow">In the game</div><p class="gp-who">${esc(e.inGame)}</p></div>` : ''}
        ${units(e.units)}
        <p class="gp-note">${esc(e.note)}</p>
        ${this.paintSection(e.id)}`;
    }
    for (const b of card.querySelectorAll<HTMLButtonElement>('.gp-scheme')) {
      b.onclick = () => {
        choose(e.id, b.dataset.scheme!);
        // Swap the model in place, keeping the camera where it is.
        const flight = this.flight;
        this.showOne(e);
        this.flight = flight;
      };
    }
  }

  private frame(now: number): void {
    if (!this.renderer || !this.controls) return;
    const f = this.flight;
    if (f) {
      const t = Math.min(1, (now - f.t0) / f.ms);
      const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      this.camera.position.lerpVectors(f.fp, f.tp, k);
      this.controls.target.lerpVectors(f.ft, f.tt, k);
      if (t >= 1) this.flight = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    const v = new THREE.Vector3();
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    for (const t of this.tags) {
      v.copy(t.pos).project(this.camera);
      t.el.hidden = v.z >= 1;
      if (v.z < 1) t.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
  }
}
