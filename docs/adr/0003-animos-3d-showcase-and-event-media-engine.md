# ADR-0003: Animos 3D Perspective Showcase & Social/Event Media Engine

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Reverse engineering `https://animos.app/editor` revealed 9 categories of 3D & perspective card animations (`3D & Perspective`, `Multiscene`, `Isometric`, `Orbit`, `Carousel & Flow`, `Grid`, `Spotlight & Focus`, `Reveal & Wipe`, `Stack & Scatter`), customizable media slots, card aspect ratios (`1:1`, `16:9`, `4:3`, `3:4`, `9:16`), and camera tilt/depth fade parameters.

## Decision

We built `src/engine/animosRenderer.js` and `src/constants/animosTemplates.js` using painter's algorithm depth-sorting (back-to-front $z$-order) and 2D affine foreshortening transforms (`ctx.transform`), paired with 6 studio aspect ratios (`4:5`, `1:1`, `9:16`, `16:9`, `4:3`, `3:4`) and 8 one-click Social & Event Media export presets.

## Consequences

- Users can combine 3D product/photo showcases with kinetic typography and export directly for both social media (`Reels`, `TikTok`, `Feed`, `YouTube`) and live event venues (`Main Stage LED Wall 16:9`, `Digital Signage Totem 9:16`, `Exhibition Booth 4:3`).
