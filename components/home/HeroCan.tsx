"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
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
};

const TILT = -0.35; // ~20° : le haut de la canette penche vers la droite
const SWAP_AT = 0.3; // secondes : on change de modèle au creux du mouvement

function FloatingCan({ flavor, pointer, reducedMotion, onReady }: Omit<HeroCanProps, "preload" | "mobile" | "running">) {
  const outer = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const [shown, setShown] = useState(flavor);
  const change = useRef<{ at: number; pending: boolean }>({ at: 0, pending: false });
  const boost = useRef(0);
  const scale = useRef(1);
  const elapsed = useRef(0);

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
    if (!reducedMotion) s.rotation.y += (0.35 + boost.current) * delta;

    const px = reducedMotion ? 0 : pointer.current?.x ?? 0;
    const py = reducedMotion ? 0 : pointer.current?.y ?? 0;
    const float = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.12;
    o.position.y = THREE.MathUtils.damp(o.position.y, float + (dip < 1 ? 0.25 : 0), 6, delta);
    o.rotation.z = THREE.MathUtils.damp(o.rotation.z, TILT + (reducedMotion ? 0 : Math.sin(t * 0.6) * 0.04) - px * 0.08, 4, delta);
    o.rotation.x = THREE.MathUtils.damp(o.rotation.x, 0.12 + py * 0.12, 4, delta);
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, px * 0.25, 3, delta);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={outer} rotation={[0.12, 0, TILT]}>
      <group ref={spin} rotation={[0, -0.5, 0]}>
        <CanObject key={shown.id} flavor={shown} onLoad={onReady} />
      </group>
    </group>
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

export default function HeroCan({ flavor, preload, pointer, reducedMotion, mobile, running, onReady }: HeroCanProps) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={mobile ? [1, 1.5] : [1, 2]}
      gl={{ alpha: true, antialias: !mobile, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 11.5], fov: 30 }}
      style={{ pointerEvents: "none" }}
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
      <FloatingCan flavor={flavor} pointer={pointer} reducedMotion={reducedMotion} onReady={onReady} />
      <Preload slugs={preload} />
    </Canvas>
  );
}
