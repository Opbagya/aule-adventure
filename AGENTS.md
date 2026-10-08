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
- Planet exploration uses separate compressed-distance destinations and a reversible transfer that preserves mission position, velocity, attitude, fuel and time; enables travel without invalidating metre-scale docking physics.
- Planet surface images are bundled local assets loaded inside Canvas Suspense; avoids runtime third-party image dependencies.
