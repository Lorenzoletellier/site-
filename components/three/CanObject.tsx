"use client";

import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { drawCanLabel } from "@/lib/can-label";
import { buildCan } from "@/lib/can-model";
import type { Flavor } from "@/lib/flavors";

type Props = {
  flavor: Flavor;
  // Reçoit la canette une fois prête (matériaux propres à cette instance, modifiables)
  onLoad?: (root: THREE.Object3D) => void;
};

export const modelUrl = (slug: string) => `/models/petille-${slug}.glb`;

// Copie profonde avec des matériaux propres : on peut assombrir une canette sans toucher aux autres
function cloneWithMaterials(source: THREE.Object3D) {
  const root = source.clone(true);
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) child.material = (child.material as THREE.Material).clone();
  });
  return root;
}

function GltfCan({ flavor, onLoad }: Props) {
  const { scene } = useGLTF(modelUrl(flavor.id));
  const root = useMemo(() => cloneWithMaterials(scene), [scene]);
  useEffect(() => onLoad?.(root), [root, onLoad]);
  return <primitive object={root} />;
}

// Saveur sans fichier .glb : on construit la canette en code avec son étiquette
function CodedCan({ flavor, onLoad }: Props) {
  const [root, setRoot] = useState<THREE.Object3D | null>(null);
  const { name, color, accent, secondary, pattern, ingredients } = flavor;

  useEffect(() => {
    let cancelled = false;
    let texture: THREE.CanvasTexture | null = null;
    drawCanLabel({ name, color, accent, secondary, pattern, ingredients }).then((canvas) => {
      if (cancelled) return;
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      setRoot(buildCan(texture));
    });
    return () => {
      cancelled = true;
      texture?.dispose();
    };
  }, [name, color, accent, secondary, pattern, ingredients]);

  useEffect(() => {
    if (root) onLoad?.(root);
  }, [root, onLoad]);

  return root ? <primitive object={root} /> : null;
}

class GltfBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function CanObject(props: Props) {
  return (
    <GltfBoundary fallback={<CodedCan {...props} />}>
      <Suspense fallback={null}>
        <GltfCan {...props} />
      </Suspense>
    </GltfBoundary>
  );
}
