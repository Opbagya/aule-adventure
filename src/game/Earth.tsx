import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SUN_DIR } from "./sim";
import { getGlow } from "./textures";

export const EARTH_R = 20000;
export const EARTH_C = new THREE.Vector3(0, -21450, -1500);

const earthVert = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position,1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const earthFrag = /* glsl */ `
uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uClouds; uniform sampler2D uSpec;
uniform vec3 uSun; uniform float uCloudOff;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(N, uSun);
  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 night = texture2D(uNight, vUv).rgb;
  vec4 ct = texture2D(uClouds, vUv + vec2(uCloudOff, 0.0));
  float cl = clamp(ct.r * ct.a, 0.0, 1.0);
  float spec = texture2D(uSpec, vUv).r;
  float dl = clamp(ndl * 1.15 + 0.04, 0.0, 1.0);
  vec3 col = mix(day * 1.25, vec3(0.92), cl * 0.8) * dl * 1.7;
  vec3 H = normalize(uSun + V);
  float sp = pow(max(dot(N, H), 0.0), 70.0) * spec * (1.0 - cl);
  col += vec3(1.0, 0.92, 0.8) * sp * dl * 6.0;
  float nightMix = 1.0 - smoothstep(-0.18, 0.04, ndl);
  col += night * vec3(1.0, 0.72, 0.42) * nightMix * (1.0 - cl * 0.85) * 2.4;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float tw = smoothstep(-0.25, 0.45, ndl);
  vec3 atm = mix(vec3(1.0, 0.45, 0.2), vec3(0.32, 0.6, 1.0), smoothstep(0.0, 0.4, ndl)) * fres * tw * 3.0;
  col = col * (1.0 - fres * 0.6) + atm + vec3(0.04, 0.09, 0.2) * dl * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;

const atmoVert = /* glsl */ `
varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const atmoFrag = /* glsl */ `
uniform vec3 uC; uniform float uR; uniform float uRa; uniform vec3 uSun;
varying vec3 vW;
void main(){
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vW - ro);
  float t = dot(uC - ro, rd);
  vec3 p = ro + rd * t;
  float b = length(p - uC);
  float h = clamp((b - uR) / (uRa - uR), 0.0, 1.0);
  float g = pow(1.0 - h, 3.0);
  vec3 n = normalize(p - uC);
  float s = dot(n, uSun);
  float lit = smoothstep(-0.3, 0.25, s);
  vec3 c = mix(vec3(1.0, 0.38, 0.12), vec3(0.28, 0.58, 1.0), smoothstep(-0.05, 0.35, s));
  gl_FragColor = vec4(c * g * lit * 4.0, 1.0);
}`;

export function Earth() {
  const [day, night, clouds, spec] = useTexture<string[]>([
    "/textures/earth_atmos_2048.jpg",
    "/textures/earth_lights_2048.png",
    "/textures/earth_clouds_1024.png",
    "/textures/earth_specular_2048.jpg",
  ]) as THREE.Texture[] as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = night.anisotropy = 8;
    clouds.wrapS = THREE.RepeatWrapping;
    return new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: day },
        uNight: { value: night },
        uClouds: { value: clouds },
        uSpec: { value: spec },
        uSun: { value: SUN_DIR },
        uCloudOff: { value: 0 },
      },
      vertexShader: earthVert,
      fragmentShader: earthFrag,
    });
  }, [day, night, clouds, spec]);
  const atmo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uC: { value: EARTH_C },
          uR: { value: EARTH_R },
          uRa: { value: EARTH_R * 1.022 },
          uSun: { value: SUN_DIR },
        },
        vertexShader: atmoVert,
        fragmentShader: atmoFrag,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.y += dt * 0.004;
    mat.uniforms['uCloudOff']!.value += dt * 0.00025;
  });
  return (
    <group position={EARTH_C} rotation={[0.35, 0, 0.2]}>
      <mesh ref={mesh} material={mat} rotation={[0, 2.2, 0]}>
        <sphereGeometry args={[EARTH_R, 160, 120]} />
      </mesh>
      <mesh material={atmo}>
        <sphereGeometry args={[EARTH_R * 1.022, 128, 96]} />
      </mesh>
    </group>
  );
}

export function Starfield() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 7000;
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.randomDirection().multiplyScalar(60000);
      p.set([v.x, v.y, v.z], i * 3);
      const b = Math.pow(Math.random(), 6) * 2.5 + 0.15;
      const warm = Math.random();
      c.set([b * (0.85 + warm * 0.2), b * 0.92, b * (1.05 - warm * 0.2)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors depthWrite={false} />
    </points>
  );
}

export function Sun() {
  const ref = useRef<THREE.Group>(null);
  const tex = useMemo(() => getGlow(), []);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position).addScaledVector(SUN_DIR, 50000);
  });
  return (
    <group ref={ref}>
      <sprite scale={[2600, 2600, 1]}>
        <spriteMaterial map={tex} color={new THREE.Color(40, 38, 34)} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <sprite scale={[14000, 14000, 1]}>
        <spriteMaterial map={tex} color={new THREE.Color(0.9, 0.85, 0.75)} depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.5} />
      </sprite>
    </group>
  );
}
