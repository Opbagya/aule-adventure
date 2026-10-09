import * as THREE from "three";

// Separate display-space planets keep interplanetary trips out of docking physics.
export const DESTINATIONS = [
  { id: "mercury", name: "Mercury", center: new THREE.Vector3(-12000, 9000, -14000), radius: 900, offset: new THREE.Vector3(0, 0, 1700), surface: "rock", tint: "#99968e", relief: 4 },
  { id: "venus", name: "Venus", center: new THREE.Vector3(-6500, 10000, -23000), radius: 1200, offset: new THREE.Vector3(0, 0, 2100), surface: "rock", tint: "#cbb58d", relief: 3 },
  { id: "earth", name: "Earth", center: new THREE.Vector3(0, 10000, -32000), radius: 1500, offset: new THREE.Vector3(0, 0, 2600), surface: "earth", tint: "#ffffff", relief: 5 },
  { id: "mars", name: "Mars", center: new THREE.Vector3(-5200, 2600, -10500), radius: 1250, offset: new THREE.Vector3(0, 0, 2150), surface: "mars", tint: "#ffffff", relief: 7 },
  { id: "jupiter", name: "Jupiter", center: new THREE.Vector3(6500, 4200, -15000), radius: 2400, offset: new THREE.Vector3(0, 0, 4000), surface: "cloud", tint: "#c9aa88", relief: 0 },
  { id: "saturn", name: "Saturn", center: new THREE.Vector3(14000, 7000, -26000), radius: 2000, offset: new THREE.Vector3(0, 0, 3600), surface: "cloud", tint: "#dccb9c", relief: 0 },
  { id: "uranus", name: "Uranus", center: new THREE.Vector3(22000, 11000, -36000), radius: 1650, offset: new THREE.Vector3(0, 0, 2900), surface: "cloud", tint: "#96ddd9", relief: 0 },
  { id: "neptune", name: "Neptune", center: new THREE.Vector3(30000, 12000, -44000), radius: 1600, offset: new THREE.Vector3(0, 0, 2850), surface: "cloud", tint: "#517ce3", relief: 0 },
] as const;
export type DestinationId = typeof DESTINATIONS[number]["id"];