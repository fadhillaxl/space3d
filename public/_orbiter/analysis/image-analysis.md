# Image analysis — discovery-ov103 (daylight pad reference)

Protocol: `grimoire/intake/image_analysis.md`. Observation is separated from inference;
inferences are marked **(inf)**. Positions are object-space, never image-space.

Source: `Discovery_OV-103 jpg.webp`, converted losslessly to
`_orbiter/reference/discovery-ov103.png` because the pipeline loader reads PNG and JPEG only.

Probe: 605 x 896 px, `technicalSuitability: pass`, no warnings. This is a materially better
reference than the night frame used previously: daylight, far more pixels on the subject, and
every marking legible.

## Layer 1 — Identification & classification

Crewed launch vehicle stack on a mobile launcher platform in daylight, viewed from the orbiter's
dorsal side and slightly above. Four macro bodies: one large ogive-nosed propellant cylinder, two
flanking cylinders with conical noses, one winged lifting body mounted on one side of the large
cylinder. `primaryDomain: object`. Confidence 0.97.

Markings read directly: a NASA insignia on one wing, a US flag above the word `Discovery` on the
other. Service structure at frame left, ocean and vegetation behind. **(inf)** Space Shuttle
Discovery; identity is not load-bearing, because the geometry comes from the measurements below.

## Layer 2 — Overall form and silhouette (measured)

Method: the vehicle is bright and near-neutral while the background is blue-dominant sky and sea,
so the mask is "bright AND desaturated AND not blue-dominant". The service structure occupies the
left of the frame, so every silhouette measurement is taken on the **right half only**, outward
from the tank centreline at x = 318.5, then mirrored.

| Landmark | Image | In metres from the apex |
|---|---|---|
| Tank apex, dark tip cap | y = 95 | 0 (datum) |
| Tank orange ogive begins | y = 110 | 1.29 |
| Tank radius, plateau over rows 196 to 216 | 49 px | 4.20 (radius) |
| Booster apex | y = 217 | 10.45 |
| Booster outer edge, half-width | 91.5 px | 7.84 (from centreline) |
| Orbiter nose cap tip | y = 288 | 16.54 |
| Wing first exceeds the booster envelope | y = 576 | 41.23 |
| Wing maximum half-span | 140 px at y = 640 | 12.00 (half-span) |
| Platform deck top | y = 700 | 51.86 |

**Scale:** a tank radius of 49 px against a published 4.2 m gives **11.667 px per metre**. Two
independent checks pass on that scale: measured wing span 24.0 m against a published 23.79 m, a
0.9 percent agreement, and the tank diameter by construction.

**One measurement contradicts the earlier model.** The booster tips sit **10.45 m** below the tank
tip here. The model built from the night frame placed them 5.94 m below. The daylight frame is
unambiguous, and the ogive crop shows both apexes in a single view.

- Symmetry: bilateral about the plane containing the tank axis and the orbiter centreline.
- Shape language: geometric. Ogive, cone, cylinder, extruded delta, lofted fuselage.

## Layer 3 — Macro, meso and micro decomposition

- **Macro:** external tank, port booster, starboard booster, orbiter.
- **Meso:** tank as dark tip cap, ogive, oxidiser barrel, ribbed intertank, fuel barrel, aft dome.
  Booster as rounded nose cone, frustum, forward skirt, case, flared aft skirt, nozzle. Orbiter as
  nose cap, crew module, mid fuselage with payload bay doors, double-delta wing, vertical fin, two
  manoeuvring pods, three engine nozzles, body flap. Inter-body as forward and aft attach
  structure plus booster attach rings.
- **Micro:** two black ring bands on each booster; an orange square patch on each booster frustum;
  thruster-port clusters on each booster nose; a white rectangular decal on the tank ogive; the
  tank cable tray with its fastener line; intertank vertical stringers; the cabin window group;
  the dark marking cluster on the dorsal forward fuselage; the wing leading-edge band; elevon
  split lines; the two wing insignia.

## Layer 4 — Spatial relationships

- The orbiter is attached to the tank on one side, ventral surface facing the tank, held off by
  forward and aft attach structure. The standoff gap is visible in the frame.
- Each booster sits flush against the tank through attach rings, at roughly 90 degrees from the
  orbiter around the tank axis.
- Each booster apex sits below the tank apex by 10.45 m, measured.
- The booster aft skirts rest on the platform. The boosters carry the stack; the tank does not
  reach the deck.
- The wing tips extend beyond the booster outer envelope: 12.00 m half-span against a 7.84 m
  booster half-envelope.

## Layer 5 — Materials and surface

Daylight, so these are far better constrained than in the night frame.

- Tank: dielectric, metalness 0, roughness high. Sprayed insulation with visible relief and a
  mottled surface.
- Orbiter dorsal surfaces and boosters: dielectric, metalness 0, roughness mid. Near-white and
  visibly **soiled** — the orbiter's white carries grey streaking and staining, not a clean white.
- Orbiter nose cap and wing leading edges: dielectric, very low albedo, roughness mid.
- Booster ring bands: dielectric, very low albedo, matte.
- Booster nozzle interiors: **red-brown**, matte. An observed colour, not metal.
- Nothing transparent or translucent except the cabin glazing.

## Layer 6 — Colour and finish

Daylight and near-neutral illumination, so sampled colour is much closer to albedo than in the
night frame. De-lighting still applies but corrects far less.

- Tank: mid-value tan-orange, moderately saturated. Lighter and less saturated than the night
  frame implied, where the floodlight had pushed it deep.
- Boosters and orbiter upper surfaces: high value, very low saturation, slightly warm.
- Nose cap, leading edges and ring bands: low value, near-neutral.
- Booster nozzle interior: mid-value red-brown, moderately saturated.
- The finish is matte across the whole vehicle.

## Layer 7 — Identity-defining features

1. Dark conical tip cap at the tank apex, distinct from the orange ogive.
2. White rectangular decal on the tank ogive.
3. Tank cable tray with a visible fastener line running the tank's length.
4. Ribbed intertank band with fine vertical stringers.
5. Booster nose is a rounded cone, **not** a two-slope cone with a step.
6. Two black ring bands on each booster, one below the frustum and one lower.
7. Orange square patch on each booster frustum.
8. Thruster-port clusters on each booster nose.
9. Strongly flared booster aft skirt.
10. Red-brown booster nozzle interior.
11. Orbiter black nose cap.
12. Cabin window group: three forward panes visible over the nose, plus an overhead pair.
13. Dark marking cluster on the dorsal forward fuselage, bilaterally symmetric.
14. Thin black wing leading-edge band following both sweep angles.
15. Elevon split lines on each wing trailing edge.
16. NASA insignia on the **port** wing upper surface; US flag above `Discovery` on the
    **starboard** wing upper surface. Screen-right is model +Z in the page's upright view.
17. Soiling and streaking across the orbiter's white upper surfaces.

## Layer 8 — Uncertainty and single-image limits

- **Hidden:** the far side of the whole stack, the orbiter's ventral surface, the payload bay
  interior. Reconstructed from symmetry and published layout; declared inference.
- **Occluded:** the lower third of the tank behind the orbiter; the booster aft skirts and nozzles
  below the platform deck; the orbiter's aft engine cluster, only partly visible.
- **Uncertain:** the dark marking cluster on the dorsal forward fuselage is clearly present and
  clearly symmetric, but this view cannot settle what it is. The night frame's ambiguity is
  partly resolved, though: it is **not** the wing glove leading edge, because the wing sits far
  aft of it.
- **Perspective:** the booster half-envelope measures 7.84 m where the published axis offset plus
  radius gives 8.26 m, a 5 percent shortfall consistent with a slight stack yaw. Lateral
  measurements are therefore treated as about 5 percent compressed; longitudinal ones are not.
- **Excluded from the model on purpose:** service structure, platform deck, tail service masts,
  and landscape. They are scenery, and the host page's component labels address vehicle parts only.
