"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { FRUIT_IMAGES, sceneFor, type FruitKind } from "@/lib/flavor-scene";
import type { Flavor } from "@/lib/flavors";

// ---------------------------------------------------------------------------------------------
// Formes 3D simples de chaque fruit (taille ~1 unité). Une image public/fruits/<fruit>.png listée
// dans FRUIT_IMAGES les remplace par un panneau toujours tourné vers la caméra.
// ---------------------------------------------------------------------------------------------

const mat = (color: string, roughness = 0.55, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, emissive: color, emissiveIntensity: 0.08, ...extra });

// Tranche d'agrume ou de concombre vue de face : écorce, peau blanche, quartiers ou pépins
function sliceTexture(rind: string, pith: string, flesh: string, segments: number, seeds: boolean) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  ctx.fillStyle = rind;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pith;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flesh;
  if (segments > 0) {
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(c + Math.cos(a + 0.06) * c * 0.1, c + Math.sin(a + 0.06) * c * 0.1);
      ctx.arc(c, c, c * 0.82, a + 0.06, a + (Math.PI * 2) / segments - 0.06);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(c, c, c * 0.84, 0, Math.PI * 2);
    ctx.fill();
  }
  if (seeds) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * c * 0.35, c + Math.sin(a) * c * 0.35, 7, 12, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(0.42, -0.25, 0.38, 0.25, 0, 0.55);
  shape.bezierCurveTo(-0.38, 0.25, -0.42, -0.25, 0, -0.5);
  return new THREE.ShapeGeometry(shape, 12);
}

// Points répartis sur une sphère (pour la framboise)
function fibonacciSphere(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  });
}

function useFruitAssets() {
  return useMemo(() => {
    const sphere = new THREE.SphereGeometry(1, 24, 16);
    const slice = new THREE.CylinderGeometry(1, 1, 0.14, 40);
    return {
      sphere,
      slice,
      leaf: leafGeometry(),
      petal: new THREE.SphereGeometry(1, 16, 8),
      tube: new THREE.CylinderGeometry(0.16, 0.16, 1.6, 20, 1, true),
      wedge: new THREE.CylinderGeometry(1, 1, 0.3, 16, 1, false, 0, Math.PI / 3),
      halfSphere: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      disc: new THREE.CircleGeometry(1, 32),
      raspberryPoints: fibonacciSphere(34),
      lemonSlice: sliceTexture("#f2c40f", "#fff6c8", "#ffe14d", 9, false),
      cucumberSlice: sliceTexture("#2f6b3a", "#cdeec0", "#b4e3a3", 0, true),
    };
  }, []);
}

type Assets = ReturnType<typeof useFruitAssets>;

function Slice({ assets, texture, side }: { assets: Assets; texture: THREE.Texture; side: string }) {
  const materials = useMemo(() => {
    const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.45, emissive: "#ffffff", emissiveMap: texture, emissiveIntensity: 0.08 });
    return [mat(side), face, face];
  }, [texture, side]);
  return <mesh geometry={assets.slice} material={materials} rotation={[Math.PI / 2, 0, 0]} />;
}

function Leaf({ assets, color, ...props }: { assets: Assets; color: string } & ThreeElements["mesh"]) {
  const material = useMemo(() => mat(color, 0.5, { side: THREE.DoubleSide }), [color]);
  return <mesh geometry={assets.leaf} material={material} {...props} />;
}

function Flower({ assets, petal, heart }: { assets: Assets; petal: string; heart: string }) {
  const petalMat = useMemo(() => mat(petal, 0.6), [petal]);
  const heartMat = useMemo(() => mat(heart, 0.5), [heart]);
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} geometry={assets.petal} material={petalMat} position={[Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0]}
            rotation={[0, 0, a]} scale={[0.5, 0.3, 0.06]} />
        );
      })}
      <mesh geometry={assets.sphere} material={heartMat} scale={0.14} position={[0, 0, 0.05]} />
    </group>
  );
}

function FruitShape({ kind, assets }: { kind: FruitKind; assets: Assets }) {
  // Matériaux partagés par sorte de fruit
  const m = useMemo(
    () => ({
      watermelonFlesh: mat("#ff4d5e", 0.5),
      watermelonRind: mat("#2f8f46", 0.5),
      seed: mat("#1a1a1a", 0.3),
      lemon: mat("#f5cf1d", 0.45),
      yuzu: mat("#d8cf3a", 0.7),
      blueberry: mat("#3a3f9e", 0.35),
      lavender: mat("#9b7cf0", 0.6),
      stem: mat("#5c8a4a", 0.6),
      pineapple: mat("#ffcf3d", 0.6),
      coconutShell: mat("#6b4428", 0.85, { side: THREE.DoubleSide }),
      coconutFlesh: mat("#fff6e6", 0.5),
      raspberry: mat("#d6245a", 0.45),
      peach: mat("#ffa274", 0.6),
      ginger: mat("#d8b27a", 0.8),
      apple: mat("#86d64f", 0.4),
      cinnamon: mat("#8b4a2b", 0.85, { side: THREE.DoubleSide }),
      vanilla: mat("#3b2416", 0.6),
      cucumberSide: "#2f6b3a",
    }),
    [],
  );

  switch (kind) {
    case "watermelon":
      return (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={assets.wedge} material={[m.watermelonRind, m.watermelonFlesh, m.watermelonFlesh]} />
          {[0.45, 0.6, 0.7].map((r, i) => (
            <mesh key={r} geometry={assets.sphere} material={m.seed} position={[Math.sin(0.4 + i * 0.25) * r, 0.16, Math.cos(0.4 + i * 0.25) * r]} scale={[0.04, 0.02, 0.07]} />
          ))}
        </group>
      );
    case "hibiscus":
      return <Flower assets={assets} petal="#ff4f8b" heart="#ffd23f" />;
    case "vanilla-flower":
      return <Flower assets={assets} petal="#f6ecd0" heart="#f2c94c" />;
    case "lemon-slice":
      return <Slice assets={assets} texture={assets.lemonSlice} side="#f2c40f" />;
    case "cucumber-slice":
      return <Slice assets={assets} texture={assets.cucumberSlice} side={m.cucumberSide} />;
    case "lemon":
      return (
        <group scale={0.55}>
          <mesh geometry={assets.sphere} material={m.lemon} scale={[1, 0.78, 0.78]} />
          <mesh geometry={assets.sphere} material={m.lemon} position={[1, 0, 0]} scale={0.14} />
        </group>
      );
    case "yuzu":
      return (
        <group scale={0.5}>
          <mesh geometry={assets.sphere} material={m.yuzu} scale={[1, 0.88, 1]} />
          <Leaf assets={assets} color="#4f8a3a" position={[0.2, 0.95, 0]} rotation={[0, 0, -0.8]} scale={0.8} />
        </group>
      );
    case "blueberry":
      return (
        <group scale={0.32}>
          {[[0, 0, 0], [1.6, 0.4, -0.4], [0.7, -1.3, 0.3]].map(([x, y, z]) => (
            <mesh key={`${x}${y}`} geometry={assets.sphere} material={m.blueberry} position={[x, y, z]} />
          ))}
        </group>
      );
    case "lavender":
      return (
        <group rotation={[0, 0, 0.3]}>
          <mesh geometry={assets.tube} material={m.stem} scale={[0.12, 1, 0.12]} position={[0, -0.4, 0]} />
          {Array.from({ length: 14 }, (_, i) => (
            <mesh key={i} geometry={assets.sphere} material={m.lavender} position={[Math.sin(i * 2.4) * 0.07, 0.3 + i * 0.05, Math.cos(i * 2.4) * 0.07]} scale={0.07} />
          ))}
        </group>
      );
    case "pineapple":
      return <mesh geometry={assets.wedge} material={m.pineapple} rotation={[Math.PI / 2, 0, 0]} scale={[0.9, 1.6, 0.9]} />;
    case "coconut":
      return (
        <group rotation={[-1.1, 0, 0]} scale={0.6}>
          <mesh geometry={assets.halfSphere} material={m.coconutShell} rotation={[Math.PI, 0, 0]} />
          <mesh geometry={assets.disc} material={m.coconutFlesh} rotation={[-Math.PI / 2, 0, 0]} scale={0.93} />
        </group>
      );
    case "raspberry":
      return (
        <group scale={0.4}>
          {assets.raspberryPoints.map((p, i) => (
            <mesh key={i} geometry={assets.sphere} material={m.raspberry} position={[p.x * 0.8, p.y, p.z * 0.8]} scale={0.32} />
          ))}
        </group>
      );
    case "basil":
      return <Leaf assets={assets} color="#3fa34d" scale={1.1} />;
    case "mint":
      return <Leaf assets={assets} color="#5fd38a" scale={0.9} />;
    case "peach":
      return (
        <group scale={0.55}>
          <mesh geometry={assets.sphere} material={m.peach} scale={[1, 0.95, 0.95]} />
          <Leaf assets={assets} color="#4f8a3a" position={[0.3, 0.95, 0]} rotation={[0, 0, -1]} scale={0.7} />
        </group>
      );
    case "ginger":
      return (
        <group scale={0.35}>
          {[[0, 0, 0, 1], [1.1, 0.5, 0, 0.7], [-0.9, 0.6, 0.2, 0.6], [0.4, -0.8, 0.1, 0.55]].map(([x, y, z, s]) => (
            <mesh key={`${x}${y}`} geometry={assets.sphere} material={m.ginger} position={[x, y, z]} scale={[s * 1.2, s * 0.8, s]} />
          ))}
        </group>
      );
    case "apple":
      return (
        <group scale={0.55}>
          <mesh geometry={assets.sphere} material={m.apple} scale={[1, 0.9, 1]} />
          <mesh geometry={assets.tube} material={m.cinnamon} scale={[0.25, 0.25, 0.25]} position={[0, 0.95, 0]} />
          <Leaf assets={assets} color="#4f8a3a" position={[0.35, 1.05, 0]} rotation={[0, 0, -1.1]} scale={0.6} />
        </group>
      );
    case "cinnamon":
      return (
        <group rotation={[0, 0, 1.2]}>
          <mesh geometry={assets.tube} material={m.cinnamon} />
          <mesh geometry={assets.tube} material={m.cinnamon} position={[0.34, 0, 0]} />
        </group>
      );
    case "vanilla-pod":
      return <mesh geometry={assets.tube} material={m.vanilla} rotation={[0, 0, 1]} scale={[0.35, 1.2, 0.35]} />;
  }
}

function FruitImage({ kind }: { kind: FruitKind }) {
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(`/fruits/${kind}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [kind]);
  return (
    <sprite scale={1.4}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

// ---------------------------------------------------------------------------------------------
// Champ de fruits : un groupe par saveur, qui apparaît quand la saveur passe au centre
// ---------------------------------------------------------------------------------------------

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

type Item = { kind: FruitKind; base: THREE.Vector3; rotation: THREE.Euler; spin: THREE.Vector3; scale: number; phase: number };

function layout(kinds: FruitKind[], count: number, seed: number): Item[] {
  const rand = seeded(seed * 97 + 13);
  return Array.from({ length: count }, (_, i) => {
    const z = -2.5 - rand() * 8;
    // On évite la zone de la canette centrale
    let x = (rand() * 2 - 1) * (6 + -z * 0.6);
    if (Math.abs(x) < 2.6) x = Math.sign(x || 1) * (2.6 + rand() * 2);
    return {
      kind: kinds[i % kinds.length],
      base: new THREE.Vector3(x, -2.2 + rand() * 6, z),
      rotation: new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI),
      spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5),
      scale: 0.7 + rand() * 0.6,
      phase: rand() * Math.PI * 2,
    };
  });
}

type FieldProps = {
  flavors: Flavor[];
  activeId: string;
  count: number; // fruits par saveur (moins sur mobile)
  pointer: RefObject<{ x: number; y: number }>;
  reducedMotion: boolean;
};

function FlavorFruits({ flavor, index, show, count, pointer, reducedMotion, assets }: Omit<FieldProps, "flavors" | "activeId"> & {
  flavor: Flavor;
  index: number;
  show: boolean;
  assets: Assets;
}) {
  const group = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const items = useMemo(() => layout(sceneFor(flavor).fruits, count, index + 1), [flavor, count, index]);
  const progress = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // Apparition / disparition douce
    progress.current = THREE.MathUtils.damp(progress.current, show ? 1 : 0, show ? 3 : 5, delta);
    g.visible = progress.current > 0.01;
    if (!g.visible) return;
    const t = state.clock.elapsedTime;
    const px = pointer.current?.x ?? 0;
    const py = pointer.current?.y ?? 0;
    items.forEach((item, i) => {
      const o = refs.current[i];
      if (!o) return;
      // Parallaxe : les fruits proches bougent plus que les lointains
      const depth = 1 / (1 + -item.base.z * 0.25);
      const float = reducedMotion ? 0 : Math.sin(t * 0.6 + item.phase) * 0.25;
      o.position.set(
        item.base.x + (reducedMotion ? 0 : px * 0.9 * depth),
        item.base.y + float + (reducedMotion ? 0 : py * 0.5 * depth) - (1 - progress.current) * 1.5,
        item.base.z,
      );
      if (!reducedMotion) {
        o.rotation.x += item.spin.x * delta;
        o.rotation.y += item.spin.y * delta;
        o.rotation.z += item.spin.z * delta;
      }
      o.scale.setScalar(item.scale * progress.current);
    });
  });

  return (
    <group ref={group} visible={false}>
      {items.map((item, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} rotation={item.rotation}>
          {FRUIT_IMAGES.includes(item.kind) ? <FruitImage kind={item.kind} /> : <FruitShape kind={item.kind} assets={assets} />}
        </group>
      ))}
    </group>
  );
}

export default function Fruits({ flavors, activeId, count, pointer, reducedMotion }: FieldProps) {
  const assets = useFruitAssets();
  return (
    <>
      {flavors.map((flavor, index) =>
        sceneFor(flavor).fruits.length > 0 ? (
          <FlavorFruits key={flavor.id} flavor={flavor} index={index} show={flavor.id === activeId} count={count}
            pointer={pointer} reducedMotion={reducedMotion} assets={assets} />
        ) : null,
      )}
    </>
  );
}
