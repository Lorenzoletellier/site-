"use client";

import { useCallback, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import CanObject from "@/components/three/CanObject";
import Fruits from "./Fruits";
import { sceneFor } from "@/lib/flavor-scene";
import type { Flavor } from "@/lib/flavors";

// État partagé avec la page (glisser, souris), lu à chaque image sans provoquer de rendu React
export type SceneControls = {
  target: number; // position visée dans la gamme, sans borne (on boucle)
  drag: number; // décalage pendant un glisser, en nombre de canettes
  moved: boolean; // le pointeur a bougé depuis l'appui : ce n'est pas un clic
  pointer: { x: number; y: number }; // souris, de -1 à 1
};

export type HomeSceneCanvasProps = {
  flavors: Flavor[];
  activeIndex: number;
  open: boolean; // fiche produit ouverte
  mobile: boolean;
  reducedMotion: boolean;
  running: boolean;
  controls: RefObject<SceneControls>;
  nameAnchor: RefObject<HTMLDivElement | null>; // le nom est posé sur le socle : on le suit à l'écran
  onSelect: (index: number) => void;
  onOpen: () => void;
  onReady: () => void;
};

const CAN_Y = 0.35;
const CAN_SCALE = 0.8;
const PEDESTAL_Y = -1.5;
const SPOT_Y = 2.55;

const wrap = (d: number, n: number) => ((((d + n / 2) % n) + n) % n) - n / 2;

// Lueur radiale additive (halo du projecteur, dessus du socle, sol)
function glowMaterial(opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: opacity } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5)) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2) * uOpacity; gl_FragColor = vec4(uColor * a, a); }",
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

// Faisceau du projecteur : plus lumineux en haut et sur les bords, comme un rai de lumière
function beamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0.16 } },
    vertexShader:
      "varying vec2 vUv; varying vec3 vNormal; void main(){ vUv = uv; vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vNormal; void main(){ float edge = 1.0 - abs(vNormal.z); float a = uOpacity * pow(vUv.y, 1.6) * (0.35 + 0.65 * edge); gl_FragColor = vec4(uColor * a, a); }",
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

type CanProps = {
  flavor: Flavor;
  index: number;
  count: number;
  props: HomeSceneCanvasProps;
  pos: RefObject<number>;
  onCenterLoad: () => void;
};

function CarouselCan({ flavor, index, count, props, pos, onCenterLoad }: CanProps) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<{ material: THREE.MeshStandardMaterial; base: THREE.Color }[]>([]);
  const spin = useRef(0);
  const { mobile, reducedMotion, open, controls, onSelect, onOpen, activeIndex } = props;

  const onLoad = useCallback(
    (root: THREE.Object3D) => {
      materials.current = [];
      root.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          materials.current.push({ material: child.material, base: child.material.color.clone() });
        }
      });
      if (index === activeIndex) onCenterLoad();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seul le premier chargement compte
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const d = wrap(index - pos.current, count);
    const ad = Math.abs(d);
    const near = Math.min(ad, 1);
    const maxVisible = open ? 0.4 : mobile ? 1.3 : 4.3;
    g.visible = ad < maxVisible;
    if (!g.visible) return;

    // Disposition en arc de cercle, légèrement inclinée
    const step = mobile ? 0.62 : 0.42;
    const radius = mobile ? 3.4 : 6.4;
    const angle = d * step;
    const t = state.clock.elapsedTime;
    const bob = reducedMotion ? 0 : Math.sin(t * 1.1 + index) * 0.05;
    g.position.set(radius * Math.sin(angle), CAN_Y + ad * 0.12 + bob, -radius * (1 - Math.cos(angle)));
    const scale = CAN_SCALE * (1 - near * 0.36 - Math.max(ad - 1, 0) * 0.05);
    g.scale.setScalar(scale);

    // La canette du centre tourne lentement ; les autres reviennent face à nous
    if (ad < 0.5 && !reducedMotion) spin.current += delta * 0.45;
    else spin.current = THREE.MathUtils.damp(spin.current, Math.round(spin.current / (Math.PI * 2)) * Math.PI * 2, 3, delta);
    g.rotation.set(0.08, spin.current - angle * 0.7, -0.12 - d * 0.07);

    // Les canettes des côtés sont plus sombres
    const light = 1 - near * 0.72;
    for (const { material, base } of materials.current) {
      material.color.copy(base).multiplyScalar(light);
      material.setValues({ envMapIntensity: 0.35 + light * 0.65 });
    }
  });

  return (
    <group
      ref={group}
      // Une canette masquée reste touchée par le rayon : on la laisse passer à la suivante
      onClick={(e) => {
        if (!group.current?.visible) return;
        e.stopPropagation();
        if (controls.current?.moved) return;
        if (index === activeIndex) onOpen();
        else onSelect(index);
      }}
      onPointerOver={(e) => {
        if (!group.current?.visible) return;
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <CanObject flavor={flavor} onLoad={onLoad} />
    </group>
  );
}

function Stage(props: HomeSceneCanvasProps) {
  const { flavors, activeIndex, open, mobile, reducedMotion, controls, nameAnchor, onReady } = props;
  const count = flavors.length;
  const active = flavors[activeIndex];
  const size = useThree((state) => state.size);

  const pos = useRef(controls.current?.target ?? 0);
  const stage = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const rimLeft = useRef<THREE.PointLight>(null);
  const rimRight = useRef<THREE.PointLight>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const color = useRef(new THREE.Color(sceneFor(active).light));
  const target = useMemo(() => new THREE.Color(), []);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const lastNameY = useRef(-1);
  const readyOnce = useRef(false);

  const halo = useMemo(() => glowMaterial(0.9), []);
  const pedestalGlow = useMemo(() => glowMaterial(0.75), []);
  const floorGlow = useMemo(() => glowMaterial(0.28), []);
  const beam = useMemo(() => beamMaterial(), []);

  const onCenterLoad = useCallback(() => {
    if (readyOnce.current) return;
    readyOnce.current = true;
    requestAnimationFrame(() => requestAnimationFrame(onReady));
  }, [onReady]);

  useFrame((state, delta) => {
    const c = controls.current;
    if (!c) return;
    // Transition d'environ 0,8 s, avec un amorti doux ; le glisser suit le doigt en direct
    pos.current = THREE.MathUtils.damp(pos.current, c.target + c.drag, reducedMotion ? 30 : 5.5, delta);

    // La lumière prend la couleur de la saveur
    color.current.lerp(target.set(sceneFor(active).light), 1 - Math.exp(-delta * 4));
    const col = color.current;
    for (const m of [halo, pedestalGlow, floorGlow, beam]) m.uniforms.uColor.value.copy(col);
    spot.current?.color.copy(col);
    rimLeft.current?.color.copy(col);
    rimRight.current?.color.copy(col);
    ring.current?.color.copy(col);
    lamp.current?.color.copy(col).lerp(target.set("#ffffff"), 0.25).multiplyScalar(0.7);

    // Fiche ouverte : la scène glisse sur le côté (ou vers le haut sur mobile)
    const s = stage.current;
    if (s) {
      s.position.x = THREE.MathUtils.damp(s.position.x, open && !mobile ? -2.4 : 0, 4, delta);
      s.position.y = THREE.MathUtils.damp(s.position.y, open && mobile ? 1.6 : 0, 4, delta);
    }

    // Caméra : plus de recul en portrait, légère parallaxe à la souris
    const portrait = size.width / size.height < 0.8;
    const dist = portrait ? 14 : 11.5;
    const px = reducedMotion ? 0 : c.pointer.x * 0.35;
    const py = reducedMotion ? 0 : c.pointer.y * 0.18;
    const cam = state.camera;
    cam.position.set(
      THREE.MathUtils.damp(cam.position.x, px, 3, delta),
      THREE.MathUtils.damp(cam.position.y, 0.1 + py, 3, delta),
      dist,
    );
    cam.lookAt(0, -0.3, 0);

    // Position à l'écran du socle, pour y poser le nom de la saveur
    if (nameAnchor.current && s) {
      projected.set(s.position.x, PEDESTAL_Y + s.position.y - 0.25, 1.8).project(state.camera);
      const y = Math.round(((1 - projected.y) / 2) * size.height);
      if (Math.abs(y - lastNameY.current) > 0.5) {
        lastNameY.current = y;
        nameAnchor.current.style.setProperty("top", `${y}px`);
      }
    }
  });

  // Les fruits lisent la souris dans l'état partagé
  const pointer = useMemo(() => ({ get current() { return controls.current?.pointer ?? { x: 0, y: 0 }; } }), [controls]);

  // Sur mobile, on ne charge que les canettes proches
  const mounted = (i: number) => !mobile || Math.abs(wrap(i - activeIndex, count)) <= 2;

  return (
    <>
      <fog attach="fog" args={["#08080a", 11, 26]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[0, 2, 8]} intensity={0.55} />
      <Environment resolution={mobile ? 128 : 256} frames={1}>
        <Lightformer form="rect" intensity={0.9} position={[0, 3, 5]} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 1.5, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[6, 1.5, 1]} />
        <Lightformer form="circle" intensity={1.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={2.5} />
      </Environment>

      <group ref={stage}>
        {/* Projecteur circulaire au-dessus de la canette centrale */}
        <spotLight ref={spot} position={[0, SPOT_Y + 2, 1.4]} angle={0.42} penumbra={0.85} intensity={110} distance={0} decay={2} />
        <pointLight ref={rimLeft} position={[-2.4, 1.6, -1.2]} intensity={10} />
        <pointLight ref={rimRight} position={[2.4, 1.6, -1.2]} intensity={10} />
        <group position={[0, SPOT_Y, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.85, 0.05, 16, 64]} />
            <meshStandardMaterial color="#2a2a2e" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <circleGeometry args={[0.8, 48]} />
            <meshBasicMaterial ref={lamp} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, -0.3]} material={halo} scale={7}>
            <planeGeometry />
          </mesh>
        </group>
        <mesh position={[0, (SPOT_Y + PEDESTAL_Y) / 2, 0]} material={beam}>
          <cylinderGeometry args={[0.78, 1.9, SPOT_Y - PEDESTAL_Y, 48, 1, true]} />
        </mesh>

        {/* Socle rond éclairé */}
        <group position={[0, PEDESTAL_Y, 0]}>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[1.8, 1.85, 0.34, 64]} />
            <meshStandardMaterial color="#141417" metalness={0.85} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.42, 0]}>
            <cylinderGeometry args={[2.15, 2.2, 0.16, 64]} />
            <meshStandardMaterial color="#0e0e10" metalness={0.8} roughness={0.45} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
            <torusGeometry args={[1.78, 0.018, 8, 96]} />
            <meshBasicMaterial ref={ring} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={pedestalGlow} scale={3.5}>
            <planeGeometry />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]} material={floorGlow} scale={11}>
            <planeGeometry />
          </mesh>
        </group>

        {/* Carrousel des saveurs */}
        {flavors.map((flavor, index) =>
          mounted(index) ? (
            <CarouselCan key={flavor.id} flavor={flavor} index={index} count={count} props={props} pos={pos} onCenterLoad={onCenterLoad} />
          ) : null,
        )}
      </group>

      <Fruits flavors={flavors} activeId={active.id} count={mobile ? 4 : 9} reducedMotion={reducedMotion} pointer={pointer} />
    </>
  );
}

export default function HomeSceneCanvas(props: HomeSceneCanvasProps) {
  return (
    <Canvas
      frameloop={props.running ? "always" : "never"}
      dpr={props.mobile ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 0.5, 10.5], fov: 35 }}
      gl={{ antialias: !props.mobile, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <Stage {...props} />
    </Canvas>
  );
}
