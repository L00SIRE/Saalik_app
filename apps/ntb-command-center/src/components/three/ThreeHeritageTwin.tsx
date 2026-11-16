"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  classifyLighting,
  daylightWindow,
  formatNpt,
  nptToUtc,
  shadowLengthM,
  solarPosition,
  sunDirection,
  type Lighting,
} from "@/lib/twin/solar";
import type { CaptureAngle, SunPosition, TwinData, TwinMonument } from "@/lib/twin/types";

const RAD = Math.PI / 180;
const DAY_COUNT = 62; // 1 December to 31 January

const ANGLE_LABEL: Record<CaptureAngle, string> = {
  ESTABLISHING_FRONT: "Establishing front",
  LEFT_45: "45° left",
  RIGHT_45: "45° right",
  CLOSE_UP_ICONOGRAPHY: "Close-up iconography",
  WIDE_COURTYARD_CONTEXT: "Wide courtyard",
};

const LIGHTING: Record<Lighting, { label: string; color: number; badge: string }> = {
  FRONT_LIT: { label: "Front-lit", color: 0x2f6b4f, badge: "badgeReady" },
  SIDE_LIT: { label: "Side-lit", color: 0xb7791f, badge: "badgePartial" },
  BACKLIT: { label: "Backlit", color: 0x9b3b2e, badge: "badgeWarning" },
  NO_SUN: { label: "No sun", color: 0x7a828b, badge: "badgeInfo" },
};

/** Slider day 0 is 1 December 2026; day 31 is 1 January 2027. */
function winterDate(dayIndex: number): { year: number; month: number; day: number; label: string } {
  return dayIndex < 31
    ? { year: 2026, month: 12, day: dayIndex + 1, label: `${dayIndex + 1} Dec` }
    : { year: 2027, month: 1, day: dayIndex - 30, label: `${dayIndex - 30} Jan` };
}

interface Station {
  angle: CaptureAngle;
  /** Compass bearing from the monument to the photographer. */
  bearingDeg: number;
  distanceM: number;
  hfovDeg: number;
  aimHeightM: number;
}

/** Where the five field-capture shots are taken from, relative to the assumed facade bearing. */
function captureStations(monument: TwinMonument): Station[] {
  const reach = monument.footprintM / 2 + Math.max(monument.heightM, monument.footprintM) * 1.1;
  const mid = monument.heightM * 0.5;
  const front = monument.facingDeg;
  return [
    { angle: "ESTABLISHING_FRONT", bearingDeg: front, distanceM: reach, hfovDeg: 50, aimHeightM: mid },
    { angle: "LEFT_45", bearingDeg: front + 45, distanceM: reach, hfovDeg: 50, aimHeightM: mid },
    { angle: "RIGHT_45", bearingDeg: front - 45, distanceM: reach, hfovDeg: 50, aimHeightM: mid },
    {
      angle: "CLOSE_UP_ICONOGRAPHY",
      bearingDeg: front,
      distanceM: monument.footprintM / 2 + 4,
      hfovDeg: 28,
      aimHeightM: Math.min(monument.heightM * 0.35, 3),
    },
    { angle: "WIDE_COURTYARD_CONTEXT", bearingDeg: front, distanceM: reach * 2.2, hfovDeg: 74, aimHeightM: mid },
  ];
}

const stationLighting = (sun: SunPosition, station: Station): Lighting =>
  classifyLighting(sun, station.bearingDeg + 180);

/** Scene offset for a compass bearing: +x east, +z south. */
const bearingVector = (bearingDeg: number, lengthM: number) =>
  new THREE.Vector3(Math.sin(bearingDeg * RAD) * lengthM, 0, -Math.cos(bearingDeg * RAD) * lengthM);

type Mats = Record<"brick" | "wood" | "stone" | "lime" | "gilt" | "water" | "bronze", THREE.MeshStandardMaterial>;

function box(w: number, h: number, d: number, mat: THREE.Material, y = 0, x = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

function cylinder(top: number, bottom: number, h: number, mat: THREE.Material, y = 0, segments = 24, x = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, h, segments), mat);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** Square hipped roof or tapering storey; `topSide` and `eaveSide` are edge lengths. */
function frustum(topSide: number, eaveSide: number, h: number, mat: THREE.Material, y: number): THREE.Mesh {
  const mesh = cylinder(topSide * 0.707, eaveSide * 0.707, h, mat, y, 4);
  mesh.rotation.y = Math.PI / 4;
  return mesh;
}

function buildMonument(m: TwinMonument, mats: Mats): THREE.Group {
  const group = new THREE.Group();
  const w = m.footprintM;
  const h = m.heightM;
  const add = (...meshes: THREE.Object3D[]) => group.add(...meshes);

  switch (m.archetype) {
    case "PAGODA":
    case "PAVILION": {
      const tiers = Math.max(1, m.roofTiers);
      const plinth = h * 0.14;
      for (let step = 0; step < 3; step += 1) {
        const side = w * (1.5 - step * 0.2);
        add(box(side, plinth / 3, side, mats.brick, (plinth / 3) * step));
      }
      add(box(w * 0.35, plinth * 0.6, w * 0.4, mats.stone, 0, 0, w * 0.8)); // entrance steps mark the facade
      const tierH = ((h - plinth) * 0.92) / tiers;
      for (let tier = 0; tier < tiers; tier += 1) {
        const side = w * (0.8 - (0.5 * tier) / tiers);
        const y = plinth + tier * tierH;
        add(box(side, tierH * 0.55, side, mats.brick, y), frustum(side * 0.7, side * 1.7, tierH * 0.45, mats.wood, y + tierH * 0.55));
      }
      add(cylinder(0.05, w * 0.06, h * 0.08, mats.gilt, plinth + tiers * tierH, 8));
      break;
    }
    case "SHIKHARA": {
      add(box(w * 1.3, h * 0.1, w * 1.3, mats.stone), box(w * 0.35, h * 0.06, w * 0.4, mats.stone, 0, 0, w * 0.75));
      add(box(w * 0.9, h * 0.25, w * 0.9, mats.stone, h * 0.1));
      add(cylinder(w * 0.3, w * 0.5, h * 0.3, mats.stone, h * 0.35, 8), cylinder(w * 0.12, w * 0.3, h * 0.25, mats.stone, h * 0.65, 8));
      add(cylinder(w * 0.18, w * 0.18, h * 0.04, mats.stone, h * 0.9, 16), cylinder(0.05, w * 0.07, h * 0.06, mats.gilt, h * 0.94, 8));
      break;
    }
    case "STUPA": {
      const radius = w / 2;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.72, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.lime);
      dome.position.y = h * 0.12;
      add(cylinder(radius, radius, h * 0.12, mats.lime), dome);
      add(box(radius * 0.36, h * 0.12, radius * 0.36, mats.gilt, h * 0.12 + radius * 0.7));
      add(cylinder(0.05, radius * 0.16, h * 0.3, mats.gilt, h * 0.24 + radius * 0.7, 13));
      break;
    }
    case "DOME": {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.lime);
      dome.position.y = h * 0.6;
      add(box(w, h * 0.6, w, mats.lime), dome, cylinder(0.05, w * 0.05, h * 0.1, mats.gilt, h * 0.6 + w * 0.42, 8));
      break;
    }
    case "PALACE": {
      add(box(w, h * 0.8, w * 0.32, mats.lime), box(w * 1.02, h * 0.08, w * 0.36, mats.wood, h * 0.8));
      const towerRoof = frustum(w * 0.05, w * 0.3, h * 0.2, mats.wood, h * 1.15);
      towerRoof.position.x = -w * 0.42;
      add(box(w * 0.16, h * 1.15, w * 0.3, mats.brick, 0, -w * 0.42), towerRoof);
      break;
    }
    case "COURTYARD": {
      const wing = w * 0.2;
      const offset = (w - wing) / 2;
      for (const [x, z, sx, sz] of [
        [0, -offset, w, wing],
        [0, offset, w, wing],
        [-offset, 0, wing, w - 2 * wing],
        [offset, 0, wing, w - 2 * wing],
      ] as const) {
        add(box(sx, h * 0.85, sz, mats.brick, 0, x, z), box(sx * 1.04, h * 0.1, sz * 1.04, mats.wood, h * 0.85, x, z));
      }
      break;
    }
    case "BELL":
    case "GATEWAY": {
      const span = w * 0.8;
      add(box(w * 0.14, h * 0.85, w * 0.14, mats.stone, 0, -span / 2), box(w * 0.14, h * 0.85, w * 0.14, mats.stone, 0, span / 2));
      add(box(w, h * 0.12, w * 0.2, mats.stone, h * 0.85));
      if (m.archetype === "BELL") add(cylinder(w * 0.12, w * 0.24, h * 0.4, mats.bronze, h * 0.4, 16));
      else add(frustum(w * 0.2, w * 1.15, h * 0.18, mats.wood, h * 0.97));
      break;
    }
    case "PILLAR": {
      add(box(w * 0.9, h * 0.1, w * 0.9, mats.stone), cylinder(w * 0.14, w * 0.18, h * 0.7, mats.stone, h * 0.1, 12));
      add(box(w * 0.5, h * 0.04, w * 0.5, mats.stone, h * 0.8), box(w * 0.28, h * 0.16, w * 0.28, mats.gilt, h * 0.84));
      break;
    }
    case "WATER":
    case "GHAT": {
      add(box(w, 0.6, w * 0.6, mats.stone), box(w * 0.9, 0.2, w * 0.5, mats.water, 0.5));
      if (m.archetype === "GHAT") {
        for (let step = 0; step < 3; step += 1) add(box(w, 0.5, w * 0.08, mats.stone, 0.5 * step, 0, -w * (0.34 + step * 0.08)));
      }
      break;
    }
    case "SHRINE":
      add(box(w, h * 0.65, w, mats.stone), frustum(w * 0.15, w * 1.25, h * 0.35, mats.wood, h * 0.65));
      break;
    default:
      add(cylinder(0.1, w * 0.3, Math.max(h, 2), mats.gilt, 0, 12));
  }

  group.position.set(m.x, 0, m.z);
  group.rotation.y = Math.PI - m.facingDeg * RAD; // local +z (the entrance side) points along the facade bearing
  group.userData.monumentId = m.id;
  group.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

function clearGroup(group: THREE.Group, disposeMaterials: boolean): void {
  group.traverse((child) => {
    const node = child as THREE.Mesh;
    node.geometry?.dispose();
    if (disposeMaterials) (node.material as THREE.Material | undefined)?.dispose();
  });
  group.clear();
}

function ring(radiusM: number, color: number, y: number): THREE.LineLoop {
  const points = Array.from({ length: 96 }, (_, i) => {
    const angle = (i / 96) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radiusM, y, Math.sin(angle) * radiusM);
  });
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color }));
}

function segments(points: THREE.Vector3[], color: number): THREE.LineSegments {
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color }));
}

/** Wireframe view pyramid from the photographer's eye to the image plane at the monument. */
function frustumLines(monument: TwinMonument, station: Station, color: number): THREE.LineSegments {
  const centre = new THREE.Vector3(monument.x, 0, monument.z);
  const eye = centre.clone().add(bearingVector(station.bearingDeg, station.distanceM)).setY(1.6);
  const aim = centre.clone().setY(station.aimHeightM);
  const forward = aim.clone().sub(eye);
  const depth = forward.length();
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward);
  const halfW = Math.tan((station.hfovDeg * RAD) / 2) * depth;
  const halfH = halfW * (4 / 3); // phone held in portrait
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => aim.clone().addScaledVector(right, sx! * halfW).addScaledVector(up, sy! * halfH));
  const points: THREE.Vector3[] = [];
  corners.forEach((corner, i) => points.push(eye, corner, corner, corners[(i + 1) % 4]!));
  return segments(points, color);
}

/** Green (easy to separate) through red (near-identical prototype vectors). */
function cosineColor(cosine: number | null): number {
  if (cosine === null) return 0x9aa1a8;
  const t = Math.min(1, Math.max(0, (cosine - 0.6) / 0.35));
  return new THREE.Color(0x2f6b4f).lerp(new THREE.Color(0x9b3b2e), t).getHex();
}

interface SceneRefs {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sun: THREE.DirectionalLight;
  sky: THREE.HemisphereLight;
  ground: THREE.Mesh;
  grid: THREE.GridHelper;
  monuments: THREE.Group;
  overlay: THREE.Group;
  mats: Mats;
  render: () => void;
}

export function ThreeHeritageTwin({ data }: { data: TwinData }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const three = useRef<SceneRefs | null>(null);
  const focused = useRef<string | null>(null);
  const [zoneId, setZoneId] = useState(data.zones[0]?.zoneId ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(20); // 21 December, the winter solstice
  const [minutes, setMinutes] = useState(9 * 60);

  const zone = data.zones.find((z) => z.zoneId === zoneId) ?? data.zones[0];
  const ordered = useMemo(
    () => [...(zone?.monuments ?? [])].sort((a, b) => a.tourSequence - b.tourSequence),
    [zone],
  );
  const monument = ordered.find((m) => m.id === selectedId) ?? ordered[0];
  const date = winterDate(dayIndex);
  const sun = solarPosition(nptToUtc(date.year, date.month, date.day, minutes));
  const daylight = useMemo(() => daylightWindow(date.year, date.month, date.day), [date.year, date.month, date.day]);
  const stations = useMemo(() => (monument ? captureStations(monument) : []), [monument]);

  /** Times between 06:00 and 18:00 when the establishing shot has the sun behind the photographer. */
  const frontLit = useMemo(() => {
    const front = stations[0];
    if (!front) return "";
    const ranges: string[] = [];
    let start: number | null = null;
    for (let minute = 360; minute <= 1080; minute += 15) {
      const lit = stationLighting(solarPosition(nptToUtc(date.year, date.month, date.day, minute)), front) === "FRONT_LIT";
      if (lit && start === null) start = minute;
      if ((!lit || minute === 1080) && start !== null) {
        ranges.push(`${formatNpt(start)}–${formatNpt(lit ? minute : minute - 15)}`);
        start = null;
      }
    }
    return ranges.join(", ");
  }, [stations, date.year, date.month, date.day]);

  const neighbors = useMemo(
    () => [...(monument?.neighbors ?? [])].sort((a, b) => (b.cosine ?? -1) - (a.cosine ?? -1)),
    [monument],
  );

  // Renderer, camera, lights and the reusable ground: created once.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 1, 6000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 1500;

    const sunLight = new THREE.DirectionalLight(0xfff1dc, 2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    const shadowCamera = sunLight.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -230;
    shadowCamera.right = shadowCamera.top = 230;
    shadowCamera.near = 1;
    shadowCamera.far = 1200;
    const sky = new THREE.HemisphereLight(0xdfe8f0, 0x8d8474, 0.55);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(700, 64),
      new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const grid = new THREE.GridHelper(600, 24, 0xa8a294, 0xc4bfb2); // 25 m cells
    grid.position.y = 0.05;

    const monuments = new THREE.Group();
    const overlay = new THREE.Group();
    scene.add(sunLight, sunLight.target, sky, ground, grid, monuments, overlay);

    const material = (color: number, roughness = 0.85, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const mats: Mats = {
      brick: material(0xa85a3c),
      wood: material(0x4a3226),
      stone: material(0x8e9499),
      lime: material(0xe9e5da),
      gilt: material(0xd4a94a, 0.4, 0.6),
      water: material(0x3f7f8f, 0.3),
      bronze: material(0x7a5a32, 0.5, 0.5),
    };

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / Math.max(1, clientHeight);
      camera.updateProjectionMatrix();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    controls.addEventListener("change", render);

    // A click that did not drag selects the monument under the pointer.
    const raycaster = new THREE.Raycaster();
    let downAt = { x: 0, y: 0 };
    const onDown = (event: PointerEvent) => {
      downAt = { x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 4) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      let hit: THREE.Object3D | null = raycaster.intersectObjects(monuments.children, true)[0]?.object ?? null;
      while (hit && !hit.userData.monumentId) hit = hit.parent;
      if (hit) setSelectedId(hit.userData.monumentId as string);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    three.current = { renderer, scene, camera, controls, sun: sunLight, sky, ground, grid, monuments, overlay, mats, render };
    resize();

    return () => {
      observer.disconnect();
      controls.dispose();
      clearGroup(monuments, false);
      clearGroup(overlay, true);
      Object.values(mats).forEach((mat) => mat.dispose());
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      grid.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      three.current = null;
    };
  }, []);

  // Procedural buildings for the chosen zone.
  useEffect(() => {
    const refs = three.current;
    if (!refs || !zone) return;
    clearGroup(refs.monuments, false);
    for (const item of zone.monuments) refs.monuments.add(buildMonument(item, refs.mats));
    focused.current = null;
    refs.render();
  }, [zone]);

  // Sun, shadows, capture frustums and the geofence overlay for the selected monument.
  useEffect(() => {
    const refs = three.current;
    if (!refs || !monument) return;
    const centre = new THREE.Vector3(monument.x, 0, monument.z);

    if (focused.current !== monument.id) {
      focused.current = monument.id;
      refs.controls.target.copy(centre).setY(monument.heightM * 0.4);
      refs.camera.position.copy(centre).add(new THREE.Vector3(120, 105, 165));
      refs.controls.update();
      refs.ground.position.set(centre.x, 0, centre.z);
      refs.grid.position.set(centre.x, 0.05, centre.z);
    }

    const up = sun.elevationDeg > 0;
    const direction = sunDirection(sun);
    refs.sun.position.set(centre.x + direction.x * 500, Math.max(direction.y, 0.02) * 500, centre.z + direction.z * 500);
    refs.sun.target.position.copy(centre);
    refs.sun.intensity = up ? 0.5 + 2.3 * Math.min(1, sun.elevationDeg / 35) : 0;
    refs.sun.color.set(sun.elevationDeg < 12 ? 0xffc890 : 0xfff1dc);
    refs.sky.intensity = up ? 0.55 : 0.14;
    refs.scene.background = new THREE.Color(up ? 0xcfe0ec : 0x1c2530);

    clearGroup(refs.overlay, true);
    const local = (object: THREE.Object3D) => {
      object.position.add(centre);
      return object;
    };
    refs.overlay.add(local(ring(data.geofenceRadiusM, 0xa85a3c, 0.2)), local(ring(monument.geofenceRadiusM, 0xa8844f, 0.25)));
    for (const neighbor of monument.neighbors) {
      const other = zone?.monuments.find((m) => m.id === neighbor.id);
      if (!other) continue;
      refs.overlay.add(
        segments([centre.clone().setY(0.4), new THREE.Vector3(other.x, 0.4, other.z)], cosineColor(neighbor.cosine)),
      );
    }
    for (const station of stations) {
      refs.overlay.add(frustumLines(monument, station, LIGHTING[stationLighting(sun, station)].color));
    }
    if (up) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
      marker.position.set(centre.x + direction.x * 260, direction.y * 260, centre.z + direction.z * 260);
      refs.overlay.add(marker);
    }
    refs.render();
    // `sun` is derived from dayIndex and minutes; listing those keeps the effect off object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monument, zone, stations, dayIndex, minutes, data.geofenceRadiusM]);

  if (!zone || !monument) return <p className="muted">No heritage zones found in the seed corpus.</p>;

  const shadow = shadowLengthM(monument.heightM, sun.elevationDeg);

  return (
    <div className="twinLayout">
      <div>
        <div ref={mountRef} className="twinCanvas" aria-label={`3D model of ${zone.nameEn}`} />
        <div className="rangeRow">
          <label htmlFor="twin-day">Date</label>
          <input
            id="twin-day"
            type="range"
            min={0}
            max={DAY_COUNT - 1}
            value={dayIndex}
            onChange={(event) => setDayIndex(Number(event.target.value))}
          />
          <span className="mono">{date.label}</span>
        </div>
        <div className="rangeRow">
          <label htmlFor="twin-time">Time (NPT)</label>
          <input
            id="twin-time"
            type="range"
            min={360}
            max={1080}
            step={5}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          />
          <span className="mono">{formatNpt(minutes)}</span>
        </div>
        <div className="legendRow" style={{ marginTop: 8 }}>
          {(Object.keys(LIGHTING) as Lighting[]).map((key) => (
            <span key={key}>
              <span className="legendSwatch" style={{ background: `#${LIGHTING[key].color.toString(16).padStart(6, "0")}` }} />
              {LIGHTING[key].label} camera
            </span>
          ))}
          <span>
            <span className="legendSwatch" style={{ background: "#a85a3c" }} />
            {data.geofenceRadiusM} m candidate radius
          </span>
        </div>
      </div>

      <div className="twinPanel">
        <div className="formGrid">
          <div className="field">
            <label htmlFor="twin-zone">Zone</label>
            <select
              id="twin-zone"
              value={zone.zoneId}
              onChange={(event) => {
                setZoneId(event.target.value);
                setSelectedId(null);
              }}
            >
              {data.zones.map((z) => (
                <option key={z.zoneId} value={z.zoneId}>
                  {z.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="twin-monument">Monument</label>
            <select id="twin-monument" value={monument.id} onChange={(event) => setSelectedId(event.target.value)}>
              {ordered.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="small" style={{ marginTop: 10 }}>
          <strong>{monument.nameEn}</strong> · {monument.nameNe}
          <br />
          <span className="muted">
            {monument.monumentType.replaceAll("_", " ").toLowerCase()}, about {Math.round(monument.heightM)} m tall (nominal)
          </span>
        </p>

        <table className="dataTable" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <td>Sun</td>
              <td className="mono">
                {sun.elevationDeg > 0
                  ? `az ${sun.azimuthDeg.toFixed(0)}° · el ${sun.elevationDeg.toFixed(1)}°`
                  : "below the horizon"}
              </td>
            </tr>
            <tr>
              <td>Shadow length</td>
              <td className="mono">{Number.isFinite(shadow) ? `${Math.round(shadow)} m` : "—"}</td>
            </tr>
            <tr>
              <td>Sunrise · noon · sunset</td>
              <td className="mono">
                {formatNpt(daylight.sunriseMin)} · {formatNpt(daylight.solarNoonMin)} · {formatNpt(daylight.sunsetMin)}
              </td>
            </tr>
            <tr>
              <td>Front-lit facade</td>
              <td className="mono">{frontLit || "not on this date"}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="twinHeading">Five field-capture cameras</h3>
        {stations.map((station) => {
          const lighting = LIGHTING[stationLighting(sun, station)];
          const note = monument.captureAngles.find((item) => item.angle === station.angle)?.framingNote;
          return (
            <div key={station.angle} className="twinStation">
              <div>
                <strong>{ANGLE_LABEL[station.angle]}</strong> <span className={`badge ${lighting.badge}`}>{lighting.label}</span>
                <span className="small muted"> · {Math.round(station.distanceM)} m back</span>
              </div>
              {note ? <div className="small muted">{note}</div> : null}
            </div>
          );
        })}

        <h3 className="twinHeading">
          Geofence cosine · {neighbors.length} monument{neighbors.length === 1 ? "" : "s"} within {data.geofenceRadiusM} m
        </h3>
        {neighbors.length === 0 ? (
          <p className="small muted">Nothing else is in range, so GPS alone identifies this monument.</p>
        ) : (
          neighbors.slice(0, 8).map((neighbor) => (
            <button key={neighbor.id} type="button" className="twinNeighbor" onClick={() => setSelectedId(neighbor.id)}>
              <span>{neighbor.nameEn}</span>
              <span className="mono small">
                {Math.round(neighbor.distanceM)} m · {neighbor.cosine === null ? "no vector" : neighbor.cosine.toFixed(3)}
              </span>
              <span className="barTrack">
                <span
                  className="barFill"
                  style={{
                    display: "block",
                    width: `${Math.round(Math.max(0, neighbor.cosine ?? 0) * 100)}%`,
                    background: `#${cosineColor(neighbor.cosine).toString(16).padStart(6, "0")}`,
                  }}
                />
              </span>
            </button>
          ))
        )}
        <p className="small muted" style={{ marginTop: 10 }}>
          Heights, footprints and facade bearings are nominal: the corpus has no surveyed dimensions, and each facade is
          assumed to face the zone centre. Cosines compare {data.vectorModel ?? "no"} prototype vectors.
        </p>
      </div>
    </div>
  );
}
