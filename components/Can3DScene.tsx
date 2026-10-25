"use client";

import { useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import CanObject from "./three/CanObject";
import type { Flavor } from "@/lib/flavors";

export type Can3DSceneProps = {
  flavor: Flavor;
  active: boolean; // false quand la canette est hors de l'écran : on arrête le rendu
  reducedMotion: boolean;
  autoRotateSpeed: number;
  onReady: () => void;
};

export default function Can3DScene({ flavor, active, reducedMotion, autoRotateSpeed, onReady }: Can3DSceneProps) {
  // Prévient le parent une fois la canette chargée, pour masquer l'image de secours
  const onLoad = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(onReady));
  }, [onReady]);

  return (
    <Canvas
      // Sans animation automatique, on ne redessine que lorsque l'utilisateur fait tourner la canette
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.9, 8.4], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      // OrbitControls bloque le défilement tactile : on rend le défilement vertical à la page
      className="touch-pan-y!"
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />

      {/* Reflets du métal : un studio de bandes lumineuses, calculé une seule fois */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 3, 5]} scale={[8, 1.5, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[5, 1, 0]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[0, 2, -5]} rotation-y={Math.PI} scale={[8, 1.5, 1]} />
        <Lightformer form="circle" intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={3} />
      </Environment>

      <CanObject flavor={flavor} onLoad={onLoad} />
      <ContactShadows position={[0, -2.05, 0]} opacity={0.35} scale={5} blur={2.6} far={3} resolution={256} frames={1} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        autoRotate={!reducedMotion}
        autoRotateSpeed={autoRotateSpeed}
        rotateSpeed={0.7}
        minPolarAngle={Math.PI / 2 - 0.45}
        maxPolarAngle={Math.PI / 2 + 0.15}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
