"use client";

import { useCallback, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import CanObject from "@/components/three/CanObject";
import type { Flavor } from "@/lib/flavors";

export type BrandCansProps = {
  flavors: Flavor[]; // 3 saveurs : gauche, centre, droite
  pointer: RefObject<{ x: number; y: number }>;
  reducedMotion: boolean;
  mobile: boolean;
  running: boolean;
  onReady: () => void;
};

// Position, inclinaison et phase de flottaison de chaque canette de la composition
const LAYOUT = [
  { x: -2.05, y: -0.35, z: -0.6, tilt: 0.32, scale: 0.92, phase: 0, spin: -0.7 },
  { x: 0, y: 0.15, z: 0.4, tilt: -0.12, scale: 1.08, phase: 2.1, spin: -0.35 },
  { x: 2.05, y: -0.2, z: -0.6, tilt: -0.34, scale: 0.92, phase: 4.2, spin: 0.2 },
];

function FloatingCan({ flavor, slot, pointer, reducedMotion, onLoad }: {
  flavor: Flavor;
  slot: (typeof LAYOUT)[number];
  pointer: BrandCansProps["pointer"];
  reducedMotion: boolean;
  onLoad: () => void;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime + slot.phase;
    const px = reducedMotion ? 0 : pointer.current?.x ?? 0;
    const py = reducedMotion ? 0 : pointer.current?.y ?? 0;
    const float = reducedMotion ? 0 : Math.sin(t * 0.8) * 0.14;
    g.position.y = THREE.MathUtils.damp(g.position.y, slot.y + float, 5, delta);
    g.position.x = THREE.MathUtils.damp(g.position.x, slot.x + px * 0.12 * (1 + slot.z), 4, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, slot.tilt + (reducedMotion ? 0 : Math.sin(t * 0.5) * 0.05) - px * 0.06, 4, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.1 + py * 0.1, 4, delta);
    if (!reducedMotion) g.rotation.y += 0.25 * delta;
  });

  return (
    <group ref={group} position={[slot.x, slot.y, slot.z]} rotation={[0.1, slot.spin, slot.tilt]} scale={slot.scale}>
      <CanObject flavor={flavor} onLoad={onLoad} />
    </group>
  );
}

export default function BrandCans({ flavors, pointer, reducedMotion, mobile, running, onReady }: BrandCansProps) {
  // La scène n'apparaît qu'une fois les trois canettes prêtes (l'image de secours reste jusque-là)
  const loaded = useRef(new Set<string>());
  const onLoad = useCallback(
    (id: string) => {
      loaded.current.add(id);
      if (loaded.current.size === flavors.length) requestAnimationFrame(() => requestAnimationFrame(onReady));
    },
    [flavors.length, onReady],
  );

  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={mobile ? [1, 1.5] : [1, 2]}
      gl={{ alpha: true, antialias: !mobile, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, mobile ? 14 : 13], fov: 30 }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[-4, 5, 6]} intensity={2.2} color="#fff8f0" />
      {/* Contre-jour bleuté : les canettes se détachent du fond électrique */}
      <directionalLight position={[4, 1, -4]} intensity={1.4} color="#9fb0ff" />
      <Environment resolution={mobile ? 64 : 256} frames={1}>
        <Lightformer intensity={2.2} position={[-4, 2, 4]} scale={[3, 8, 1]} />
        <Lightformer intensity={1.4} position={[5, 1, 3]} scale={[2, 8, 1]} />
        <Lightformer intensity={1} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={0.8} position={[0, 0, -6]} scale={[12, 6, 1]} color="#c8d0ff" />
      </Environment>
      {flavors.slice(0, LAYOUT.length).map((flavor, i) => (
        <FloatingCan
          key={flavor.id}
          flavor={flavor}
          slot={LAYOUT[i]}
          pointer={pointer}
          reducedMotion={reducedMotion}
          onLoad={() => onLoad(flavor.id)}
        />
      ))}
    </Canvas>
  );
}
