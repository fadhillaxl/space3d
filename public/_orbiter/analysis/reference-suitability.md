# Reference suitability verdict — discovery-ov103.png

Rubric: `grimoire/intake/validation_rubric.md`.

## Verdict: PASS

Every pass criterion is met. This is a stronger reference than the night frame it replaces, which
was rated `conditional`.

| Criterion | Reading |
|---|---|
| One obvious target object | Met. The stack is the subject; tower, deck and landscape are scenery and are excluded by scope. |
| Object occupies enough of frame | Met. The vehicle spans roughly 280 x 600 px of a 605 x 896 frame. |
| At least one strong silhouette | Met. Daylight, and the vehicle is bright and near-neutral against blue-dominant sky and sea, so the mask separates cleanly on hue rather than luminance alone. |
| Major materials visible | Met. Five material families separate by eye: sprayed insulation, painted skin, dark thermal protection, red-brown nozzle interior, cabin glazing. |
| Hidden side inferable | Met. Bilateral symmetry about the tank and orbiter plane, plus rotational symmetry of tank and boosters. |
| Approximable with primitives | Strongly met. Ogive, cone, cylinder, extruded delta and a lofted fuselage cover the whole vehicle. |

## What this reference newly settles

1. **Booster tip offset.** The booster apexes sit 10.45 m below the tank apex. The previous model,
   built from a night frame, had 5.94 m. Both apexes appear in one crop here, so this is measured,
   not inferred.
2. **Marking layout.** NASA insignia on the port wing; US flag above `Discovery` on the starboard
   wing. The night frame could not resolve the glyphs at all.
3. **Booster nose form.** A rounded cone with two black ring bands below it, not the two-slope
   cone with a step that the night frame appeared to show.
4. **Nozzle colour.** The booster nozzle interiors are red-brown. The night frame gave only an
   unlit shadow there, and the earlier model guessed grey metal.
5. **Tank colour.** Mid-value tan-orange. The night frame's floodlight had pushed it much deeper.

## Conditions that still apply

1. **Single view.** The far side of the stack, the orbiter's ventral surface and the payload bay
   interior are unobserved. Reconstructed from symmetry and published layout, and reported as
   inference.
2. **Occlusion at the base.** The booster aft skirts and nozzles pass behind the platform deck,
   so their lower geometry is inferred.
3. **Lateral compression.** The stack is slightly yawed: the booster half-envelope measures about
   5 percent narrower than the published offset. Lateral measurements carry that caveat;
   longitudinal ones do not.
4. **One unresolved feature.** The dark marking cluster on the dorsal forward fuselage is clearly
   present and symmetric, but this view cannot say what it is. It is modelled as an observed dark
   marking group and labelled as such rather than given a false identity.

## What would raise fidelity further

A rear three-quarter view and a plan view of the orbiter. Not required for the intended use, which
is a real-time browser prop on an educational page.
