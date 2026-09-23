# Image analysis — shuttle-pad-sts41d.jpg

Protocol: `grimoire/intake/image_analysis.md`. Observation is separated from inference;
every inference is marked **(inf)**. Positions are object-space (forward/aft, dorsal/ventral,
port/starboard relative to the orbiter), never image-space.

Probe: 400 x 492 px, JPEG, 57 KB, `technicalSuitability: conditional`
(warning: "low resolution; small geometry/material details may be unreliable").

## Layer 1 — Identification & classification

- Work type: crewed launch vehicle **stack** standing on a mobile launcher platform at night,
  floodlit from the lower left.
- Composition: one large ogive-nosed propellant cylinder, two slender flanking cylinders with
  conical noses, one winged lifting body mounted on one side of the large cylinder.
- Broad classification: multi-body launch assembly. `primaryDomain: object`. Confidence 0.95.
- Legible markings read directly off the frame: `USA` and a US flag on one wing upper surface,
  `NASA` and `Discovery` on the opposite side. **(inf)** the subject is Space Shuttle Discovery
  on a Launch Complex 39 pad; the filename asserts STS-41-D. Identity is not load-bearing for
  geometry — the geometry comes from measurement below.

## Layer 2 — Overall form & silhouette (measured)

Measured from the pixel data, not estimated by eye:

| Landmark | Image px |
|---|---|
| Tank nose apex | y = 146, x = 216 |
| Starboard booster nose apex | y = 159 |
| Tank barrel diameter | 60-61 px (row y = 200: x 192..252) |
| Maximum wing span | 166 px (row y = 390: x 139..305) |
| Platform deck line | y ~ 460 |

Cross-check against published Shuttle dimensions: tank diameter 8.4 m at 61 px gives
7.26 px/m; orbiter span 23.79 m then predicts 173 px against 166 px measured. The 4 percent
shortfall is consistent with the stack being yawed slightly away from the camera, so the
photo agrees with published dimensions within perspective error.

**Consequence:** published dimensions are admissible as the metric backbone, and the photo is
used for feature layout, colour and finish rather than for scale.

- Bounding volume: vertical cluster, tall and slender.
- Symmetry: bilateral about the plane containing the tank axis and the orbiter centreline.
  The two boosters are a mirror pair across that plane.
- Shape language: geometric. Primitives are cylinder, ogive/cone, extruded delta profile,
  lofted fuselage.

## Layer 3 — Macro / meso / micro decomposition

- **Macro:** external tank; port booster; starboard booster; orbiter.
- **Meso:**
  - tank: ogive nose with a forward fitting, upper (oxidiser) barrel, waisted intertank band,
    lower (fuel) barrel, aft dome.
  - booster: nose cone, frustum, forward skirt, four case segments with visible ring joints,
    aft skirt, nozzle.
  - orbiter: nose cap, crew module, mid fuselage with payload bay, double-delta wing,
    vertical fin, two orbital manoeuvring pods, three main engine nozzles, body flap.
  - inter-body: forward attach strut between orbiter nose and tank; aft attach structure;
    booster-to-tank attach rings.
- **Micro:** cabin window group, elevon split line on each wing trailing edge, booster
  segment joint rings, a vertical conduit line running the length of the tank, wing
  leading-edge dark band, markings (`USA`, flag, `NASA`, `Discovery`).

## Layer 4 — Spatial relationships

- `<orbiter, attached-to, tank>` via forward strut (contact: strut/pin) and an aft attach
  structure (contact: socket). The orbiter's ventral surface faces the tank.
- `<booster, flush-with, tank>` on each side, contact type: overlap through attach rings.
  The boosters sit at roughly +/-90 degrees from the orbiter around the tank axis.
- `<booster nose apex, below, tank nose apex>` by 13 px measured, so the boosters are
  shorter than the tank and their tips sit lower on the stack.
- `<wing tips, extend-beyond, booster outer surface>` — measured: wing span 166 px exceeds
  the booster pair's outer envelope in the same rows.
- `<fin, projects-toward, camera>` at the aft end; it reads as a narrow bright vertical
  blade because it is seen nearly edge-on.

## Layer 5 — Materials & surface (PBR terms)

- Tank: dielectric, metalness 0, roughness high (matte). Sprayed insulation, not a painted
  shell. **(inf)** the surface relief is a sprayed foam texture; the resolution here cannot
  resolve it, so it is a material claim, not a measured one.
- Orbiter dorsal surface and boosters: dielectric, metalness 0, roughness mid, near-white.
- Orbiter nose cap and wing leading edges: dielectric, very low albedo, roughness mid.
- Engine nozzles: metallic response with a visibly brighter rim **(inf)** metalness ~1,
  roughness low-to-mid.
- No transparent or translucent region on the vehicle.

## Layer 6 — Colour & finish

Sampled, with the caveat that the scene is lit by sodium-tinted floodlights, so measured
hue is illuminant-shifted and warmer than the vehicle's true albedo:

- Tank: saturated orange, mid value, warm. Reads as a value gradient from bright on the
  lit side to near-black on the unlit side.
- Orbiter and boosters: near-white, high value, very low saturation.
- Nose cap, leading edges, engine bay: near-black, low value.
- Finish is matte throughout; there is no gloss highlight anywhere on the vehicle.

## Layer 7 — Identity-defining features

1. Ogive nose with a distinct nose-to-barrel transition ring.
2. Vertical conduit line running the full length of the tank, off the centreline.
3. Waisted intertank band separating the two tank barrels.
4. Booster case joint rings — the boosters are segmented, not smooth tubes.
5. Booster nose cone plus frustum: two cone angles, not one.
6. Orbiter black nose cap.
7. Cabin window group.
8. Dark swept band along each wing leading edge.
9. Elevon split lines on each wing trailing edge.
10. Double-delta wing planform — the glove is a shallower sweep than the outer panel.
11. Vertical fin.
12. Two orbital manoeuvring pods flanking the fin base.
13. Three main engine nozzles clustered at the aft end.
14. `USA` plus flag on one wing, `NASA` plus `Discovery` on the other.
15. Forward attach strut standing off between orbiter nose and tank.

## Layer 8 — Uncertainty & single-image limits

- **Hidden:** the entire far side of the stack — the tank's back, the far booster's outboard
  face, the orbiter's ventral tile pattern, the payload bay interior. One view cannot show them.
- **Occluded:** the tank's lower half behind the orbiter; the aft attach structure; the
  booster hold-down posts behind the platform deck.
- **Uncertain from resolution:** window count and shape, marking glyph forms, tile linework,
  nozzle internal detail. At 400 x 492 the orbiter's cabin spans roughly 20 px, so these are
  below the resolution floor and must be sourced from published dimensions, not from the photo.
- **Illuminant:** night floodlight, strongly directional and sodium-tinted. Measured colour is
  not albedo. De-lighting is required before any colour is transferred to a material.
- **Excluded from the model on purpose:** the fixed service structure, the vent hood arm over
  the tank nose, and the platform deck. They are scenery, not the vehicle, and the page's
  component hotspots address vehicle parts only.
