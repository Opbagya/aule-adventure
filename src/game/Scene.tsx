import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Earth, Starfield, Sun } from "./Earth";
import { ComSat, Corridor, DebrisField, Servicer } from "./Models";
import { SimLoop, Thrusters } from "./SimLoop";
import { SUN_DIR, sim } from "./sim";
import { Planets } from "./Planets";
import { LandingGear, LandingSurface } from "./Landing";
import { MotionBlur, SpeedStreaks, WarpTunnel } from "./FlightEffects";
import { Asteroids } from "./Asteroids";

function Lighting() {
  const light = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const { scene } = useThree();
  useEffect(() => {
    scene.add(target);
    if (light.current) light.current.target = target;
    return () => void scene.remove(target);
  }, [scene, target]);
  useFrame(() => {
    // shadow frustum follows the servicer (covers ComSat during terminal phase)
    target.position.copy(sim.pos);
    light.current?.position.copy(sim.pos).addScaledVector(SUN_DIR, 80);
  });
  return (
    <>
      <directionalLight
        ref={light}
        intensity={5.5}
        color="#fff6ea"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={180}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* Earthshine from below, nothing from the void above */}
      <hemisphereLight args={["#c4d4e8", "#2a5a9a", 0.6]} />
    </>
  );
}

function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom luminanceThreshold={4} luminanceSmoothing={0.1} intensity={0.22} radius={0.25} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <MotionBlur />
    </EffectComposer>
  );
}

export function SpaceScene() {
  return (
    <Canvas
      shadows="basic"
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping, toneMappingExposure: 1.0 }}
      camera={{ fov: 55, near: 0.1, far: 90000, position: [0, 3, 1520] }}
    >
      <color attach="background" args={["#000000"]} />
      <SimLoop />
      <Lighting />
      <Environment resolution={128} frames={1}>
        <Lightformer form="circle" intensity={12} color="#fff4e0" position={SUN_DIR.clone().multiplyScalar(30).toArray()} scale={5} />
        <Lightformer intensity={1.2} color="#3b78c8" position={[0, -30, 0]} rotation-x={Math.PI / 2} scale={[120, 120, 1]} />
        <Lightformer intensity={0.25} color="#9ab8e0" position={[-30, -8, 0]} rotation-y={Math.PI / 2} scale={[80, 10, 1]} />
      </Environment>
      <Starfield />
      <Sun />
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
      <Suspense fallback={null}><Planets /></Suspense>
      <ComSat />
      <Corridor />
      <Servicer />
       <Suspense fallback={null}><DebrisField /><Asteroids /><LandingSurface /></Suspense>
       <LandingGear />
       <SpeedStreaks />
       <WarpTunnel />
      <Thrusters />
      <Effects />
    </Canvas>
  );
}
