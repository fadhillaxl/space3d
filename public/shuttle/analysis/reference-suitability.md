# Reference suitability verdict — shuttle-pad-sts41d.jpg

Rubric: `grimoire/intake/validation_rubric.md`.

## Verdict: CONDITIONAL — proceed

Not `pass`, because the resolution and the single viewpoint both bind. Not `reject`, because
no reject criterion is met: the target is unambiguous, the frame is a vehicle reference rather
than a scene study, no identity-defining shape is cropped, and the subject is built from
primitives rather than from smoke, liquid, glass or lace.

## Against each pass criterion

| Criterion | Reading |
|---|---|
| One obvious target object | Met. The stack is the subject; the tower and deck are background and are excluded by scope. |
| Object occupies enough of frame | Met. The vehicle spans about 200 x 430 px of a 400 x 492 frame. |
| At least one strong silhouette | Strongly met. Floodlit vehicle against a black sky gives a clean, unambiguous outline — the single best property of this reference. |
| Major materials visible | Partially met. Three material families are separable, but under sodium floodlight, so hue is illuminant-shifted. |
| Hidden side inferable | Met. Bilateral symmetry about the tank/orbiter plane, plus rotational symmetry of tank and boosters, carries most of the unseen geometry. |
| Approximable with primitives | Strongly met. Cylinder, ogive, cone, extruded delta profile and a lofted fuselage cover the whole vehicle. |

## Conditions attached

1. **Resolution floor.** Sub-20 px features (windows, marking glyphs, tile linework, nozzle
   internals) cannot be read from this image. They come from published Shuttle dimensions and
   are labelled inference, not measurement.
2. **Single view.** The far side of the stack, the orbiter's ventral surface and the payload bay
   interior are not observed. They are reconstructed from symmetry and published layout, and
   reported as such.
3. **Illuminant.** Night floodlight is directional and sodium-tinted. No colour may be sampled
   from the photo into a material without de-lighting first.
4. **Marking fidelity.** Exact glyph forms of `USA`, `NASA` and `Discovery` are below the
   resolution floor. Placement is taken from the photo; letterforms are approximated.

## What would raise this to `pass`

Daylight orthographic-ish side, front and rear views of the stack at higher resolution. Not
required for the intended use, which is a real-time browser prop on an educational page.
