import * as THREE from "three";

// Canette 33 cl modélisée en code : corps de rayon 1 et de hauteur 3, haut et fond en profils
// tournés (LatheGeometry), comme l'emboutissage d'une vraie canette. Sert à générer les fichiers
// public/models/petille-<saveur>.glb, et de modèle de secours si l'un d'eux manque.
const BODY_H = 3;
const TOP = BODY_H / 2;
const SEGMENTS = 64;
const LID_Y = TOP + 0.33;

const shoulderProfile = [
  [1, TOP], [0.995, TOP + 0.06], [0.95, TOP + 0.16], [0.88, TOP + 0.26], [0.845, TOP + 0.31],
  [0.85, TOP + 0.34], [0.84, TOP + 0.37], [0.8, TOP + 0.37], [0.785, TOP + 0.33],
].map(([x, y]) => new THREE.Vector2(x, y));

const bottomProfile = [
  [0, -TOP - 0.1], [0.55, -TOP - 0.13], [0.72, -TOP - 0.2], [0.8, -TOP - 0.22],
  [0.9, -TOP - 0.17], [0.98, -TOP - 0.08], [1, -TOP],
].map(([x, y]) => new THREE.Vector2(x, y));

const metal = (color: string, roughness: number, side: THREE.Side = THREE.FrontSide) =>
  new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, side });

function part(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  return mesh;
}

export function buildCan(label: THREE.Texture): THREE.Group {
  const can = new THREE.Group();
  can.name = "canette";

  // Corps peint : vernis brillant sur aluminium. La face avant de l'étiquette (x = W/2) regarde +z.
  const body = new THREE.MeshPhysicalMaterial({ map: label, metalness: 0.3, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 });
  body.name = "etiquette";
  can.add(part("corps", new THREE.CylinderGeometry(1, 1, BODY_H, SEGMENTS, 1, true), body, [0, 0, 0], [0, Math.PI, 0]));

  can.add(part("epaulement", new THREE.LatheGeometry(shoulderProfile, SEGMENTS), metal("#d3d7dc", 0.22, THREE.DoubleSide)));
  can.add(part("fond", new THREE.LatheGeometry(bottomProfile, SEGMENTS), metal("#c4c9cf", 0.3, THREE.DoubleSide)));
  can.add(part("couvercle", new THREE.CylinderGeometry(0.79, 0.79, 0.02, SEGMENTS), metal("#b9bec5", 0.35), [0, LID_Y, 0]));

  // Ouverture (côté face avant) et sa ligne de découpe
  can.add(part("ouverture", new THREE.CircleGeometry(0.2, 32), metal("#9aa0a8", 0.45), [0, LID_Y + 0.012, 0.4], [-Math.PI / 2, 0, 0], [1.25, 0.85, 1]));
  can.add(part("decoupe", new THREE.TorusGeometry(0.2, 0.008, 6, 40), metal("#6b7179", 0.5), [0, LID_Y + 0.014, 0.4], [Math.PI / 2, 0, 0], [1.25, 0.85, 1]));

  // Anneau d'ouverture : rivet, languette et anneau
  const tab = metal("#e2e5e9", 0.2);
  can.add(part("rivet", new THREE.CylinderGeometry(0.06, 0.07, 0.04, 20), tab, [0, LID_Y + 0.03, 0]));
  can.add(part("languette", new THREE.BoxGeometry(0.22, 0.02, 0.3), tab, [0, LID_Y + 0.035, 0.12]));
  can.add(part("anneau", new THREE.TorusGeometry(0.16, 0.04, 12, 40), tab, [0, LID_Y + 0.035, -0.22], [Math.PI / 2, 0, 0], [1.2, 1, 0.6]));

  // Recentre verticalement (le haut dépasse plus que le fond)
  can.position.y = -0.1;
  const root = new THREE.Group();
  root.add(can);
  return root;
}
