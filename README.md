# Aule Orbit Ops

Build a complete, standalone, production-grade, hyper-realistic 3D space simulation game titled "AULE SPACE: ORBITAL RPOD SIMULATOR" in modular React + Three.js. It should look hyper realistic.

Requirements from spec:
### 1. BRAND CONTEXT & MARKETING MISSION (Aule Space)
- Brand: Aule Space (https://aule.space/) - "Building the autonomous robotic workforce for satellites in orbit, pioneering satellite-agnostic docking and life-extension jetpacks."
- Objective: A visceral, hyper-realistic marketing mini-game where the player pilots the "Aule Servicer-1" (autonomous RPOD tug) through a treacherous orbital debris field in Low Earth Orbit (LEO) and executes a high-precision docking maneuver onto a high-value, stranded communications satellite (ComSat-9) whose station-keeping fuel has depleted.
- Marketing CTA / End Screen:
  - On successful dock: "MISSION SUCCESS: SATELLITE LIFE EXTENDED BY 5 YEARS. 0 kg fuel wasted. Powered by Aule Space Autonomous RPOD. [Explore Aule Space Fleet -> https://aule.space/]"
  - High score based on: Time elapsed, Remaining Delta-V / RCS Fuel, and Docking Precision Velocity (< 0.15 m/s).

### 2. VISUALS & GRAPHICS SPECIFICATIONS (Hyper-Realism)
The visual bar must be photorealistic, inspired by NASA photography, Gravity, and Interstellar:
1. Earth & Atmosphere:
   - High-resolution photorealistic Earth sphere rotating slowly below (LEO altitude ~450 km).
   - Atmospheric rim shader (Rayleigh/Mie scattering effect with subtle blue daylight horizon curve) fading into deep pitch-black space.
   - Day-night terminator with realistic city light grids on the night side and cloud specular highlights on the day side.
2. Space Lighting & Materials:
   - Directional Sun light with realistic high-contrast space illumination (hard shadows, blinding white sun reflections, deep black unlit occlusions).
   - Three.js ToneMapping: ACESFilmicToneMapping with exposure tuned for high dynamic range.
   - Materials: Physically Based Rendering (MeshStandardMaterial or MeshPhysicalMaterial with metalness 0.9, roughness 0.2, clearcoat for solar panels, and metallic crinkled gold/silver MLI thermal foil shaders for the Aule Servicer hull).
3. Post-Processing & Camera Effects:
   - Bloom effect on sun flares, thruster engine glows, Earth horizon, and target navigation beacons.
   - Subtle lens flare and chromatic aberration on high-speed maneuvers.
   - Depth of field and toggleable camera views:
     - View 1: Cockpit / Bow Docking Optical Sensor (HUD crosshair overlay).
     - View 2: Cinematic Third-Person Chase Cam (trailing the Aule servicer).
     - View 3: Target Fixed Camera (watching the servicer approach ComSat-9).

### 3. ASSETS & 3D MODELS (Procedural / PBR)
Create mathematically defined, high-detail procedural 3D models:
1. Player Craft ("Aule Servicer-1"):
   - Cubical/hexagonal bus wrapped in golden thermal foil with dual articulated solar wings, forward-facing optical LiDAR sensor turret, 4 quad-RCS cold-gas thruster blocks with visible blue-white particle exhaust bursts, and a universal mechanical/magnetic docking ring on the front.
2. Target Satellite ("ComSat-9"):
   - Massive communications satellite: Large parabolic high-gain antenna dish, extended blue solar arrays, apogee kick motor nozzle, flashing strobe navigation lights (green starboard, red port, flashing white docking target beacon), and an aft docking ring matching Aule’s agnostic clamp.
3. Orbital Hazards (Debris & Asteroids):
   - 30-50 high-speed orbital debris hazards: Defunct rocket booster stages, broken solar panel shards, tumbled CubeSats, fragmented titanium foil, and micrometeorites tumbling with random angular momentum.
   - Proximity radar collision volumes (bounding spheres).

### 4. PHYSICS & 6-DOF FLIGHT MECHANICS
Implement realistic orbital flight dynamics with inertia:
- Newton's First Law: No atmospheric drag. Once thrusters fire, the craft maintains velocity and angular momentum unless countered.
- Flight Controls:
  - W / S: Pitch Down / Pitch Up (or Forward / Reverse Surge)
  - A / D: Yaw Left / Yaw Right
  - Q / E: Roll Counter-Clockwise / Roll Clockwise
  - Shift / Ctrl: Forward Translation Thrust / Backward Retrograde Thrust
  - Space: Translation Up (Heave) / C: Translation Down
  - X: Flight Computer Auto-Kill Rotation / Stabilization (Active RCS Dampener)
  - V: Switch Camera View (Sensor Cam / Chase Cam / Target Cam)
  - Mobile/Touch support: Responsive on-screen virtual twin virtual joysticks (Translation & Rotation) and emergency dampener button.
- RCS Particle FX: Every keypress triggers immediate directional gas puff particles and camera vibration.

### 5. RPOD & DOCKING SIMULATION PHASES
1. Phase 1: Transit & Debris Avoidance (Range: 1500m -> 200m): Navigate through the debris field without sustaining critical hull impact. Proximity Warning System: HUD beeps and highlights incoming high-velocity debris in red with time-to-impact (TTI).
2. Phase 2: Terminal Approach & Alignment (Range: 200m -> 15m): ComSat-9 comes into visual range. Docking Corridor holographic alignment funnel cone. Match rotation with ComSat-9 tumbling (0.5 rpm); synchronize roll and pitch.
3. Phase 3: Contact & Capture (Range: < 15m): Velocity must be strictly under 0.20 m/s. Angular misalignment must be under 3.5 degrees. When within 1.5m and aligned: Magnetic capture locks in, servo clamps animate closed, HUD announces "HARD DOCK CONFIRMED".

### 6. AEROSPACE HUD & TELEMETRY UI
Sleek military/aerospace vector HUD (SpaceX Dragon / Apollo AGC / glass cockpit):
- Target marker, prograde/retrograde vector indicators, boresight alignment crosshairs.
- Range to target, closure rate (turns red if > 0.3 m/s inside 50m), Delta-V / RCS fuel gauge, roll/pitch/yaw error angles, warning banners (IMPACT WARNING, EXCESSIVE CLOSURE RATE, CORRIDOR DEVIATION).

### 7. SOUND DESIGN (Web Audio API Synthesized)
Synthesize audio via Web Audio API:
- Deep sub-bass thud when firing RCS thrusters.
- Warning alarm pulses for debris proximity and high closure velocity.
- Radio static squelch and synthesized mission control voice chime on milestones.
- Heavy metallic latch mechanical clamp lock sound upon docking success.
- Low drone ambient spacecraft interior hum.

### 8. DELIVERABLE REQUIREMENTS
- 100% complete, working code with 60 FPS performance.
- Start screen with mission briefing, tutorial controls overlay, pause menu, and Aule Space victory screen with clickable link to https://aule.space/.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://auleadventure.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1d115bfa-727d-4462-a5eb-ee9975299ad2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
