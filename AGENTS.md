<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Game sim state lives in a mutable singleton (src/game/sim.ts) read by R3F useFrame and polled by the DOM HUD; avoids React re-renders at 60fps.
- All planetary trips and mission returns use the same tested transfer step with exact arrival snapping and clean velocity resets; prevents stale landing or travel state on repeat visits while preserving the mission snapshot.
- Planet surface images are bundled local assets loaded inside Canvas Suspense; avoids runtime third-party image dependencies.
- Manual landing uses a planet-relative tangent frame with shared terrain height calculations and a side camera; cached per-destination terrain is reused from every approach, and gas giants use explicitly fictional cloud decks rather than claiming solid ground.
- Assisted flight is a switchable velocity controller; Newtonian flight remains available for unassisted docking.
- Motion effects are speed-dependent peripheral blur and pooled star streaks, disabled on landing; keeps the vehicle readable.
- Flight HUD omits telemetry and labels while retaining separate interactive controls; keeps flight scenery unobstructed.
- Licensed CC0 asteroid meshes are served through a project asset pointer; engineered debris retains custom detailed geometry and generated wear maps.
- Destination selection is a separate DOM overlay, and warp visuals use pooled camera-local geometry plus synthesized audio; keeps the flight viewport clear without runtime media dependencies.
