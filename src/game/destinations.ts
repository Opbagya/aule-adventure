import * as THREE from "three";

// Deliberately compressed exploration distances; docking remains metre-scale.
export const DESTINATIONS = [
  { id: "mars", name: "Mars", center: new THREE.Vector3(-5200, 2600, -10500), radius: 1250, offset: new THREE.Vector3(0, 0, 5500) },
  { id: "jupiter", name: "Jupiter", center: new THREE.Vector3(6500, 4200, -15000), radius: 2400, offset: new THREE.Vector3(0, 0, 10500) },
] as const;
export type DestinationId = typeof DESTINATIONS[number]["id"];