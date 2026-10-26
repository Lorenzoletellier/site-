"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import CanObject, { modelUrl } from "@/components/three/CanObject";
import type { Flavor } from "@/lib/flavors";

export type HeroCanProps = {
  flavor: Flavor;
  preload: string[]; // slugs dont le .glb existe, chargés en avance pour des changements instantanés
  pointer: RefObject<{ x: number; y: number }>;
  reducedMotion: boolean;
  mobile: boolean;
  running: boolean;
  onReady: () => void;
  openKey: number; // incrémenté à chaque clic sur « Ouvrir » : lance l'animation d'ouverture
};

const TILT = -0.35; // ~20° : le haut de la canette penche vers la droite
const SWAP_AT = 0.3; // secondes : on change de modèle au creux du mouvement

// Animation d'ouverture (secondes depuis le clic)
export const OPEN_DURATION = 2.8;
const TAB_UP = 0.35; // l'anneau se soulève
const PSCHITT = 0.55; // la gerbe part
const TAB_DOWN = 2.3; // l'anneau se rabat
const GRAVITY = -11;

type CanBox = { top: number; radius: number };

// Boîte englobante dans le repère du parent (le groupe qui fait tourner la canette),
// sans l'inclinaison ni la rotation appliquées au-dessus
function localBox(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const toParent = root.parent ? root.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
  const box = new THREE.Box3();
  const m = new THREE.Matrix4();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    m.multiplyMatrices(toParent, child.matrixWorld);
    box.union(child.geometry.boundingBox!.clone().applyMatrix4(m));
  });
  return box;
}

// Gouttes et bulles du « pschitt », en coordonnées du monde (indépendantes du mouvement de la canette)
function Spray({ color, origin, up, startAt, mobile, reducedMotion }: {
  color: string;
  origin: RefObject<THREE.Vector3>;
  up: RefObject<THREE.Vector3>;
  startAt: RefObject<number | null>;
  mobile: boolean;
  reducedMotion: boolean;
}) {
  const DROPS = reducedMotion ? 0 : mobile ? 110 : 240;
  const BUBBLES = mobile ? 40 : 80;
  const drops = useRef<THREE.InstancedMesh>(null);
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const state = useMemo(
    () => ({
      d: Array.from({ length: DROPS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), born: 0, life: 0, size: 0, speed: 0, spread: 0, angle: 0, live: false })),
      b: Array.from({ length: BUBBLES }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), born: 0, life: 0, size: 0, speed: 0, spread: 0, angle: 0, live: false })),
      launched: -1,
    }),
    [DROPS, BUBBLES],
  );

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    const start = startAt.current;
    const o = origin.current;
    const u = up.current;
    // Nouvelle ouverture : on tire le hasard de chaque goutte (départ étalé sur 0,5 s depuis l'ouverture).
    // La position de départ n'est prise qu'à la naissance de la goutte : la canette a fini de se placer.
    if (start !== null && state.launched !== start) {
      state.launched = start;
      for (const d of state.d) {
        d.born = start + PSCHITT + Math.random() * 0.5;
        d.life = 0.9 + Math.random() * 0.8;
        d.size = 0.03 + Math.random() * 0.07;
        d.speed = 3.5 + Math.random() * 4.5;
        d.spread = Math.random() * 1.4;
        d.angle = Math.random() * Math.PI * 2;
        d.live = false;
      }
      for (const b of state.b) {
        b.born = start + PSCHITT + Math.random() * 1.6;
        b.life = 1.2 + Math.random() * 1.2;
        b.size = 0.02 + Math.random() * 0.05;
        b.live = false;
      }
    }
    const side = new THREE.Vector3(1, 0, 0).cross(u).normalize();
    const side2 = u.clone().cross(side).normalize();
    const step = (mesh: THREE.InstancedMesh | null, list: typeof state.d, gravity: number) => {
      if (!mesh) return;
      list.forEach((item, i) => {
        const age = now - item.born;
        if (start !== null && age >= 0 && !item.live) {
          // Naissance : départ depuis l'ouverture du couvercle, dans l'axe de la canette
          item.live = true;
          if (gravity) {
            item.p.copy(o);
            item.v.copy(u).multiplyScalar(item.speed).addScaledVector(side, Math.cos(item.angle) * item.spread).addScaledVector(side2, Math.sin(item.angle) * item.spread);
          } else {
            item.p.copy(o).addScaledVector(side, (Math.random() - 0.5) * 0.4).addScaledVector(side2, (Math.random() - 0.5) * 0.4);
            item.v.copy(u).multiplyScalar(0.8 + Math.random() * 1.2).addScaledVector(side, (Math.random() - 0.5) * 0.4);
          }
        }
        if (start === null || age < 0 || age > item.life) {
          tmp.scale.setScalar(0);
        } else {
          const p = item.p.clone().addScaledVector(item.v, age);
          p.y += 0.5 * gravity * age * age;
          tmp.position.copy(p);
          // Les gouttes s'étirent dans le sens de leur vitesse, puis rétrécissent en fin de vie
          const fade = 1 - Math.pow(age / item.life, 3);
          tmp.scale.set(item.size * fade, item.size * fade * (gravity ? 1.6 : 1), item.size * fade);
        }
        tmp.updateMatrix();
        mesh.setMatrixAt(i, tmp.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    step(drops.current, state.d, GRAVITY);
    step(bubbles.current, state.b, 0);
  });

  return (
    <>
      {DROPS > 0 && (
        <instancedMesh ref={drops} args={[undefined, undefined, DROPS]} frustumCulled={false}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshPhysicalMaterial color={color} roughness={0.05} metalness={0} clearcoat={1} transparent opacity={0.88} />
        </instancedMesh>
      )}
      <instancedMesh ref={bubbles} args={[undefined, undefined, BUBBLES]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.1} transparent opacity={0.55} clearcoat={1} />
      </instancedMesh>
    </>
  );
}

function FloatingCan({ flavor, pointer, reducedMotion, mobile, onReady, openKey }: Omit<HeroCanProps, "preload" | "running">) {
  const outer = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const [shown, setShown] = useState(flavor);
  const change = useRef<{ at: number; pending: boolean }>({ at: 0, pending: false });
  const boost = useRef(0);
  const scale = useRef(1);
  const elapsed = useRef(0);
  // On peut attraper la canette : glisser pour la faire tourner, elle garde son élan en la lâchant
  const drag = useRef({ active: false, x: 0, y: 0, velocity: 0, tilt: 0 });
  const gl = useThree((state) => state.gl);

  // Ouverture : l'anneau se soulève, la canette tremble, la gerbe jaillit
  const box = useRef<CanBox>({ top: 1.2, radius: 0.33 });
  const tab = useRef<THREE.Group>(null);
  const openAt = useRef<number | null>(null);
  const sprayStart = useRef<number | null>(null);
  const origin = useRef(new THREE.Vector3());
  const upDir = useRef(new THREE.Vector3(0, 1, 0));
  const clock = useThree((state) => state.clock);
  useEffect(() => {
    if (!openKey) return;
    openAt.current = elapsed.current;
    sprayStart.current = clock.elapsedTime;
  }, [openKey, clock]);
  // Changement de saveur pendant l'ouverture : on arrête proprement
  useEffect(() => {
    openAt.current = null;
    sprayStart.current = null;
  }, [flavor.id]);

  // Point de départ de la gerbe : l'ouverture du couvercle, convertie dans le repère du monde
  const updateSprayOrigin = () => {
    const s = spin.current;
    if (!s) return;
    s.updateWorldMatrix(true, false);
    origin.current.set(0, box.current.top, box.current.radius * 0.45);
    s.localToWorld(origin.current);
    upDir.current.set(0, 1, 0).applyQuaternion(s.getWorldQuaternion(new THREE.Quaternion())).normalize();
  };

  const ring = useRef<THREE.Object3D | null>(null);
  const handleLoad = (root: THREE.Object3D) => {
    // L'anneau du modèle est caché pendant l'ouverture : on anime le nôtre, articulé sur le rivet
    ring.current = root.getObjectByName("anneau") ?? null;
    const b = localBox(root);
    box.current = { top: b.max.y, radius: Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2 };
    onReady();
  };

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { ...drag.current, active: true, x: e.clientX, y: e.clientY, velocity: 0 };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      if (spin.current) spin.current.rotation.y += dx * 0.012;
      d.velocity = dx * 0.012 * 60;
      d.tilt = THREE.MathUtils.clamp(d.tilt + dy * 0.004, -0.5, 0.5);
    };
    const up = (e: PointerEvent) => {
      drag.current.active = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    };
    el.style.cursor = "grab";
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
    };
  }, [gl]);

  // Nouvelle saveur : la canette accélère sa rotation, rétrécit, change de modèle puis revient
  useEffect(() => {
    if (flavor.id === shown.id) return;
    change.current = { at: elapsed.current, pending: true };
    if (!reducedMotion) boost.current = 13;
  }, [flavor, shown.id, reducedMotion]);

  useFrame((state, delta) => {
    const o = outer.current;
    const s = spin.current;
    if (!o || !s) return;
    elapsed.current += delta;
    const t = elapsed.current;

    if (change.current.pending && (reducedMotion || t - change.current.at > SWAP_AT)) {
      change.current.pending = false;
      setShown(flavor);
    }
    const dip = change.current.pending && !reducedMotion ? 0.8 : 1;
    scale.current = THREE.MathUtils.damp(scale.current, dip, 9, delta);
    o.scale.setScalar(scale.current);

    boost.current = THREE.MathUtils.damp(boost.current, 0, 2.6, delta);
    const d = drag.current;
    const openT = openAt.current === null ? -1 : t - openAt.current;
    const opening = openT >= 0 && openT < OPEN_DURATION;
    if (openT >= OPEN_DURATION) openAt.current = null;

    // Anneau : se soulève, reste ouvert pendant la gerbe, puis se rabat
    const tb = tab.current;
    if (tb) {
      tb.visible = opening;
      if (ring.current) ring.current.visible = !opening;
      tb.position.y = box.current.top + 0.005;
      const lift = !opening ? 0 : openT < TAB_UP ? 0 : openT < PSCHITT ? (openT - TAB_UP) / (PSCHITT - TAB_UP) : openT < TAB_DOWN ? 1 : Math.max(0, 1 - (openT - TAB_DOWN) / 0.3);
      tb.rotation.x = lift * 0.95;
    }

    if (opening) {
      // Canette face caméra, haut légèrement vers nous pour voir l'ouverture
      s.rotation.y = THREE.MathUtils.damp(s.rotation.y, Math.round(s.rotation.y / (Math.PI * 2)) * Math.PI * 2, 5, delta);
      const shake = openT > PSCHITT && openT < PSCHITT + 0.3 && !reducedMotion ? (Math.random() - 0.5) * 0.06 : 0;
      o.rotation.z = THREE.MathUtils.damp(o.rotation.z, shake, 6, delta);
      o.rotation.x = THREE.MathUtils.damp(o.rotation.x, 0.38, 6, delta);
      o.position.y = THREE.MathUtils.damp(o.position.y, -0.35, 5, delta);
      updateSprayOrigin();
      return;
    }

    if (!d.active) {
      // Élan après le lâcher, puis retour à la rotation lente et à l'inclinaison normale
      d.velocity = THREE.MathUtils.damp(d.velocity, 0, 2.2, delta);
      d.tilt = THREE.MathUtils.damp(d.tilt, 0, 2, delta);
      s.rotation.y += d.velocity * delta;
      if (!reducedMotion) s.rotation.y += (0.35 + boost.current) * delta;
    }

    const px = reducedMotion ? 0 : pointer.current?.x ?? 0;
    const py = reducedMotion ? 0 : pointer.current?.y ?? 0;
    const float = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.12;
    o.position.y = THREE.MathUtils.damp(o.position.y, float + (dip < 1 ? 0.25 : 0), 6, delta);
    o.rotation.z = THREE.MathUtils.damp(o.rotation.z, TILT + (reducedMotion ? 0 : Math.sin(t * 0.6) * 0.04) - px * 0.08, 4, delta);
    o.rotation.x = THREE.MathUtils.damp(o.rotation.x, 0.12 + py * 0.12 + d.tilt, 4, delta);
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, px * 0.25, 3, delta);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
    <group ref={outer} rotation={[0.12, 0, TILT]}>
      <group ref={spin} rotation={[0, -0.5, 0]}>
        <CanObject key={shown.id} flavor={shown} onLoad={handleLoad} />
        {/* Anneau d'ouverture, articulé sur son bord arrière */}
        <group ref={tab} visible={false}>
          <mesh position={[0, 0.02, -box.current.radius * 0.24]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.2, 1, 1]}>
            <torusGeometry args={[box.current.radius * 0.17, box.current.radius * 0.035, 12, 40]} />
            <meshPhysicalMaterial color="#cfd4db" metalness={1} roughness={0.22} clearcoat={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[box.current.radius * 0.07, box.current.radius * 0.07, 0.03, 20]} />
            <meshPhysicalMaterial color="#cfd4db" metalness={1} roughness={0.25} />
          </mesh>
          {/* Ouverture sombre dans le couvercle */}
          <mesh position={[0, 0.002, box.current.radius * 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[box.current.radius * 0.17, 24]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
      </group>
    </group>
    <Spray color={flavor.color} origin={origin} up={upDir} startAt={sprayStart} mobile={mobile} reducedMotion={reducedMotion} />
    </>
  );
}

function Preload({ slugs }: { slugs: string[] }) {
  useEffect(() => {
    // Après le premier affichage, quand le navigateur est libre
    const id = setTimeout(() => slugs.forEach((slug) => useGLTF.preload(modelUrl(slug))), 1500);
    return () => clearTimeout(id);
  }, [slugs]);
  return null;
}

export default function HeroCan({ flavor, preload, pointer, reducedMotion, mobile, running, onReady, openKey }: HeroCanProps) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={mobile ? [1, 1.5] : [1, 2]}
      gl={{ alpha: true, antialias: !mobile, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, mobile ? 9.5 : 11.5], fov: 30 }}
      style={{ touchAction: "pan-y" }}
    >
      {/* Lumière de studio claire : reflets blancs sur le métal, ombres douces */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[-4, 5, 6]} intensity={2.4} color="#fff8f0" />
      <directionalLight position={[5, -1, 3]} intensity={0.9} color="#ffffff" />
      <Environment resolution={mobile ? 64 : 256}>
        <Lightformer intensity={2.2} position={[-4, 2, 4]} scale={[3, 8, 1]} />
        <Lightformer intensity={1.4} position={[5, 1, 3]} scale={[2, 8, 1]} />
        <Lightformer intensity={1} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={0.6} position={[0, 0, -6]} scale={[12, 6, 1]} color="#fff3ea" />
      </Environment>
      {/* Ombre douce sous la canette : elle ne flotte plus dans le vide */}
      {!mobile && <ContactShadows position={[0, -2.7, 0]} opacity={0.28} blur={2.8} scale={7} far={5} resolution={256} color="#3a2a1a" />}
      <FloatingCan flavor={flavor} pointer={pointer} reducedMotion={reducedMotion} mobile={mobile} onReady={onReady} openKey={openKey} />
      <Preload slugs={preload} />
    </Canvas>
  );
}
