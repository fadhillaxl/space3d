import * as THREE from 'three';

// Material Palette
const COLORS = {
  hull: 0xedeef2,
  hullWarm: 0xdde2ea,
  tps: 0x181b20,
  rcc: 0x0f1115,
  bay: 0x12161e,
  bayFloor: 0x1c232c,
  radiator: 0xc0c8d4,
  pod: 0xd4d9e2,
  bell: 0x7c848e,
  bellIn: 0x3d434b,
  glass: 0x1e293b,
  gold: 0xcfa538,
  goldDark: 0x8a6b22,
  solar: 0x132742,
  solarLit: 0x244f7d,
  dish: 0xd8dde4,
  boom: 0x64748b,
  foam: 0xc8642d,
  foamDark: 0xa04c20,
  srb: 0xdbe2ea,
  srbBand: 0x2d3748,
  strut: 0x475569,
  osr: 0xd8e4f0,
  tank: 0xb55a36,
  tower: 0x64748b,
  hall: 0x475569,
  hallGlow: 0x38bdf8,
  rail: 0xc4cdd8,
  pcb: 0x14532d,
  chip: 0x18181b,
  batt: 0x334155,
  bench: 0x1e293b,
  kabel: 0xd97706,
};

// Reusable standard materials
function makeMat(color: number, roughness = 0.5, metalness = 0.2) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

const MATS = {
  hull: makeMat(COLORS.hull, 0.4, 0.1),
  hullWarm: makeMat(COLORS.hullWarm, 0.45, 0.1),
  tps: makeMat(COLORS.tps, 0.85, 0.05),
  rcc: makeMat(COLORS.rcc, 0.9, 0.1),
  bay: makeMat(COLORS.bay, 0.6, 0.1),
  bayFloor: makeMat(COLORS.bayFloor, 0.5, 0.2),
  radiator: makeMat(COLORS.radiator, 0.2, 0.8),
  pod: makeMat(COLORS.pod, 0.4, 0.1),
  bell: makeMat(COLORS.bell, 0.35, 0.7),
  bellIn: makeMat(COLORS.bellIn, 0.8, 0.2),
  glass: new THREE.MeshPhysicalMaterial({
    color: COLORS.glass,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.9,
  }),
  gold: makeMat(COLORS.gold, 0.25, 0.85),
  goldDark: makeMat(COLORS.goldDark, 0.3, 0.8),
  solar: makeMat(COLORS.solar, 0.2, 0.5),
  dish: makeMat(COLORS.dish, 0.35, 0.6),
  boom: makeMat(COLORS.boom, 0.4, 0.6),
  foam: makeMat(COLORS.foam, 0.8, 0.05),
  srb: makeMat(COLORS.srb, 0.4, 0.2),
  srbBand: makeMat(COLORS.srbBand, 0.6, 0.1),
  strut: makeMat(COLORS.strut, 0.4, 0.7),
  osr: makeMat(COLORS.osr, 0.1, 0.9),
  hall: makeMat(COLORS.hall, 0.3, 0.7),
  hallGlow: new THREE.MeshBasicMaterial({ color: COLORS.hallGlow }),
  rail: makeMat(COLORS.rail, 0.25, 0.8),
  pcb: makeMat(COLORS.pcb, 0.5, 0.2),
  chip: makeMat(COLORS.chip, 0.7, 0.1),
  batt: makeMat(COLORS.batt, 0.4, 0.5),
  bench: makeMat(COLORS.bench, 0.7, 0.1),
  kabel: makeMat(COLORS.kabel, 0.6, 0.1),
};

export function createDiscoveryModel(options: { doorsOpen?: boolean; livery?: 'discovery' | 'buran' } = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = 'discovery-orbiter';
  const isBuran = options.livery === 'buran';

  // 1. Fuselage
  const fuseGeom = new THREE.CylinderGeometry(2.3, 2.7, 24, 32);
  fuseGeom.rotateZ(Math.PI / 2);
  const fuseMesh = new THREE.Mesh(fuseGeom, MATS.hull);
  fuseMesh.position.set(0, 0, 0);
  fuseMesh.userData = { group: 'body' };
  root.add(fuseMesh);

  // TPS black belly (lower shell)
  const bellyGeom = new THREE.CylinderGeometry(2.35, 2.75, 24, 32, 1, false, Math.PI, Math.PI);
  bellyGeom.rotateZ(Math.PI / 2);
  const bellyMesh = new THREE.Mesh(bellyGeom, MATS.tps);
  bellyMesh.position.set(0, -0.05, 0);
  bellyMesh.userData = { group: 'wing' };
  root.add(bellyMesh);

  // Nose cone
  const noseGeom = new THREE.ConeGeometry(2.3, 6, 32);
  noseGeom.rotateZ(-Math.PI / 2);
  const noseMesh = new THREE.Mesh(noseGeom, MATS.hull);
  noseMesh.position.set(15, 0, 0);
  noseMesh.userData = { group: 'body' };
  root.add(noseMesh);

  // Black RCC nose tip
  const tipGeom = new THREE.SphereGeometry(0.8, 16, 16);
  const tipMesh = new THREE.Mesh(tipGeom, MATS.rcc);
  tipMesh.position.set(17.8, 0, 0);
  tipMesh.userData = { group: 'wing' };
  root.add(tipMesh);

  // Cockpit windows
  const canopyGeom = new THREE.BoxGeometry(2.5, 1.2, 2.4);
  const canopyMesh = new THREE.Mesh(canopyGeom, MATS.glass);
  canopyMesh.position.set(12.5, 1.8, 0);
  canopyMesh.userData = { group: 'body' };
  root.add(canopyMesh);

  // 2. Wings (Double Delta)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(7, 0);
  wingShape.lineTo(-12, 11.5);
  wingShape.lineTo(-15, 11.5);
  wingShape.lineTo(-15, 0);
  wingShape.closePath();

  const wingExtrude = new THREE.ExtrudeGeometry(wingShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 });
  wingExtrude.rotateX(Math.PI / 2);

  const leftWing = new THREE.Mesh(wingExtrude, MATS.hull);
  leftWing.position.set(0, -1.2, 0);
  leftWing.userData = { group: 'wing' };
  root.add(leftWing);

  const rightWingGeom = wingExtrude.clone();
  rightWingGeom.scale(1, 1, -1);
  const rightWing = new THREE.Mesh(rightWingGeom, MATS.hull);
  rightWing.position.set(0, -1.2, 0);
  rightWing.userData = { group: 'wing' };
  root.add(rightWing);

  // Wing leading edge (black RCC)
  const leftEdgeGeom = new THREE.CylinderGeometry(0.25, 0.25, 23, 16);
  leftEdgeGeom.rotateZ(0.55);
  const leftEdge = new THREE.Mesh(leftEdgeGeom, MATS.rcc);
  leftEdge.position.set(-2.5, -1.2, 6.2);
  leftEdge.userData = { group: 'wing' };
  root.add(leftEdge);

  const rightEdgeGeom = leftEdgeGeom.clone();
  rightEdgeGeom.rotateY(Math.PI);
  const rightEdge = new THREE.Mesh(rightEdgeGeom, MATS.rcc);
  rightEdge.position.set(-2.5, -1.2, -6.2);
  rightEdge.userData = { group: 'wing' };
  root.add(rightEdge);

  // 3. Vertical Fin & Rudder
  const finShape = new THREE.Shape();
  finShape.moveTo(-6, 0);
  finShape.lineTo(-16, 10.5);
  finShape.lineTo(-18.5, 10.5);
  finShape.lineTo(-18.5, 0);
  finShape.closePath();

  const finExtrude = new THREE.ExtrudeGeometry(finShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05 });
  finExtrude.rotateY(Math.PI / 2);
  const finMesh = new THREE.Mesh(finExtrude, MATS.hull);
  finMesh.position.set(0, 2.5, 0.18);
  finMesh.userData = { group: 'fin' };
  root.add(finMesh);

  // 4. OMS Pods (left & right)
  [-1, 1].forEach((side) => {
    const podGeom = new THREE.CylinderGeometry(1.0, 1.4, 6.5, 16);
    podGeom.rotateZ(Math.PI / 2);
    const podMesh = new THREE.Mesh(podGeom, MATS.pod);
    podMesh.position.set(-14.5, 2.4, 2.3 * side);
    podMesh.userData = { group: 'pod' };
    root.add(podMesh);

    // OMS nozzle
    const omsNozzleGeom = new THREE.CylinderGeometry(0.3, 0.6, 1.2, 16);
    omsNozzleGeom.rotateZ(Math.PI / 2);
    const omsNozzle = new THREE.Mesh(omsNozzleGeom, MATS.bell);
    omsNozzle.position.set(-18.2, 2.5, 2.3 * side);
    omsNozzle.userData = { group: 'pod' };
    root.add(omsNozzle);
  });

  // 5. Main Engines (SSME x3) - Only on Space Shuttle Discovery (Buran had none)
  if (!isBuran) {
    const engineLocs = [
      [-17.8, 2.6, 0],
      [-18.5, 0.2, 1.4],
      [-18.5, 0.2, -1.4],
    ];
    engineLocs.forEach(([x, y, z]) => {
      const bellGeom = new THREE.ConeGeometry(1.2, 3.2, 24, 1, true);
      bellGeom.rotateZ(Math.PI / 2);
      const bellMesh = new THREE.Mesh(bellGeom, MATS.bell);
      bellMesh.position.set(x, y, z);
      bellMesh.userData = { group: 'engine' };
      root.add(bellMesh);

      const bellInGeom = new THREE.ConeGeometry(1.15, 3.1, 24);
      bellInGeom.rotateZ(Math.PI / 2);
      const bellIn = new THREE.Mesh(bellInGeom, MATS.bellIn);
      bellIn.position.set(x + 0.1, y, z);
      bellIn.userData = { group: 'engine' };
      root.add(bellIn);
    });
  }

  // Body flap under engines
  const flapGeom = new THREE.BoxGeometry(3.5, 0.25, 4.5);
  const flapMesh = new THREE.Mesh(flapGeom, MATS.tps);
  flapMesh.position.set(-17.5, -1.5, 0);
  flapMesh.userData = { group: 'body' };
  root.add(flapMesh);

  // 6. Payload Bay Interior & Doors
  const bayGeom = new THREE.BoxGeometry(16, 2.4, 3.6);
  const bayMesh = new THREE.Mesh(bayGeom, MATS.bayFloor);
  bayMesh.position.set(-0.5, 1.2, 0);
  bayMesh.userData = { group: 'bay' };
  root.add(bayMesh);

  // Doors (rotatable on pivot)
  const isDoorOpen = !!options.doorsOpen;
  const doorAngle = isDoorOpen ? 1.6 : 0.05;

  [-1, 1].forEach((side) => {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.5, 2.3, 1.9 * side);

    const doorPanelGeom = new THREE.CylinderGeometry(2.1, 2.1, 15.8, 16, 1, true, 0, Math.PI / 2);
    doorPanelGeom.rotateZ(Math.PI / 2);
    const doorMesh = new THREE.Mesh(doorPanelGeom, MATS.radiator);
    doorPivot.add(doorMesh);

    doorPivot.rotation.x = side > 0 ? doorAngle : -doorAngle;
    doorPivot.userData = { group: 'door' };
    root.add(doorPivot);
  });

  return root;
}

export function createStackModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'space-shuttle-launch-stack';

  // 1. External Tank (ET) - Center
  const etGroup = new THREE.Group();
  etGroup.userData = { group: 'et' };

  // ET LH2 Cylinder
  const lh2Geom = new THREE.CylinderGeometry(4.2, 4.2, 28, 32);
  const lh2Mesh = new THREE.Mesh(lh2Geom, MATS.foam);
  lh2Mesh.position.set(0, -6, 0);
  etGroup.add(lh2Mesh);

  // ET Intertank ring
  const interGeom = new THREE.CylinderGeometry(4.25, 4.25, 5.5, 32);
  const interMesh = new THREE.Mesh(interGeom, MATS.foam);
  interMesh.position.set(0, 10.75, 0);
  etGroup.add(interMesh);

  // ET LOX Ogive Nose Cone
  const loxGeom = new THREE.ConeGeometry(4.2, 14, 32);
  const loxMesh = new THREE.Mesh(loxGeom, MATS.foam);
  loxMesh.position.set(0, 20.5, 0);
  etGroup.add(loxMesh);

  // Top Dark Tip
  const tipGeom = new THREE.SphereGeometry(0.8, 16, 16);
  const tipMesh = new THREE.Mesh(tipGeom, MATS.rcc);
  tipMesh.position.set(0, 27.5, 0);
  etGroup.add(tipMesh);

  root.add(etGroup);

  // 2. Solid Rocket Boosters (SRBs) - Left & Right
  [-1, 1].forEach((side) => {
    const srbGroup = new THREE.Group();
    srbGroup.position.set(0, -2, 6.8 * side);
    srbGroup.userData = { group: 'srb' };

    // Booster main body
    const srbBodyGeom = new THREE.CylinderGeometry(1.85, 1.85, 38, 32);
    const srbBody = new THREE.Mesh(srbBodyGeom, MATS.srb);
    srbGroup.add(srbBody);

    // Black stripes
    [-8, 4].forEach((yPos) => {
      const bandGeom = new THREE.CylinderGeometry(1.88, 1.88, 0.8, 32);
      const band = new THREE.Mesh(bandGeom, MATS.srbBand);
      band.position.set(0, yPos, 0);
      srbGroup.add(band);
    });

    // Frustum and nose cap
    const srbNoseGeom = new THREE.ConeGeometry(1.85, 6.5, 32);
    const srbNose = new THREE.Mesh(srbNoseGeom, MATS.srb);
    srbNose.position.set(0, 22.25, 0);
    srbGroup.add(srbNose);

    // Nozzle (gimbaled, flared brick-red bell)
    const srbNozzleGeom = new THREE.ConeGeometry(2.4, 4.5, 24, 1, true);
    srbNozzleGeom.rotateX(Math.PI);
    const srbNozzle = new THREE.Mesh(srbNozzleGeom, MATS.bell);
    srbNozzle.position.set(0, -21.25, 0);
    srbGroup.add(srbNozzle);

    root.add(srbGroup);
  });

  // 3. Orbiter attached to +X side of External Tank
  const orbiter = createDiscoveryModel();
  orbiter.scale.set(0.9, 0.9, 0.9);
  orbiter.rotation.set(0, 0, Math.PI / 2);
  orbiter.position.set(5.8, -4, 0);
  orbiter.userData = { group: 'orbiter' };
  root.add(orbiter);

  // 4. Structural Struts
  const strutGroup = new THREE.Group();
  strutGroup.userData = { group: 'strut' };

  [-1, 1].forEach((side) => {
    const srbStrutGeom = new THREE.CylinderGeometry(0.2, 0.2, 3.2, 8);
    srbStrutGeom.rotateX(Math.PI / 2);
    const srbStrut = new THREE.Mesh(srbStrutGeom, MATS.strut);
    srbStrut.position.set(0, 11, 5.2 * side);
    strutGroup.add(srbStrut);
  });

  const orbStrutGeom = new THREE.CylinderGeometry(0.3, 0.3, 3.5, 8);
  orbStrutGeom.rotateZ(Math.PI / 2);
  const orbStrut = new THREE.Mesh(orbStrutGeom, MATS.strut);
  orbStrut.position.set(4.2, 4, 0);
  strutGroup.add(orbStrut);

  root.add(strutGroup);

  return root;
}

export function createBuranStackModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'buran-energia-launch-stack';

  // 1. Energia Central Core (Hydrolox Stage)
  const coreGroup = new THREE.Group();
  coreGroup.userData = { group: 'core' };

  const coreGeom = new THREE.CylinderGeometry(4.4, 4.4, 38, 32);
  const coreMesh = new THREE.Mesh(coreGeom, MATS.hullWarm);
  coreGroup.add(coreMesh);

  const coreDomeGeom = new THREE.SphereGeometry(4.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const coreDome = new THREE.Mesh(coreDomeGeom, MATS.hull);
  coreDome.position.set(0, 19, 0);
  coreGroup.add(coreDome);

  // 4 RD-0120 engines at base of Energia
  const rdLocs = [
    [-1.5, -20.5, -1.5],
    [1.5, -20.5, -1.5],
    [-1.5, -20.5, 1.5],
    [1.5, -20.5, 1.5],
  ];
  rdLocs.forEach(([x, y, z]) => {
    const rdNozzle = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.0, 16, 1, true), MATS.bell);
    rdNozzle.rotateX(Math.PI);
    rdNozzle.position.set(x, y, z);
    coreGroup.add(rdNozzle);
  });
  root.add(coreGroup);

  // 2. Four Zenit Liquid Boosters (RD-170)
  const angles = [0.75, 2.35, 3.9, 5.5];
  angles.forEach((ang) => {
    const zenitGroup = new THREE.Group();
    const bx = Math.cos(ang) * 6.5;
    const bz = Math.sin(ang) * 6.5;
    zenitGroup.position.set(bx, -4, bz);
    zenitGroup.userData = { group: 'booster' };

    const zenitGeom = new THREE.CylinderGeometry(2.0, 2.0, 32, 24);
    const zenitMesh = new THREE.Mesh(zenitGeom, MATS.hull);
    zenitGroup.add(zenitMesh);

    const zenitNose = new THREE.Mesh(new THREE.ConeGeometry(2.0, 5, 24), MATS.hull);
    zenitNose.position.set(0, 18.5, 0);
    zenitGroup.add(zenitNose);

    // Quad nozzle cluster
    const qLocs = [
      [-0.6, -17.5, -0.6],
      [0.6, -17.5, -0.6],
      [-0.6, -17.5, 0.6],
      [0.6, -17.5, 0.6],
    ];
    qLocs.forEach(([qx, qy, qz]) => {
      const qn = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.0, 16, 1, true), MATS.bell);
      qn.rotateX(Math.PI);
      qn.position.set(qx, qy, qz);
      zenitGroup.add(qn);
    });

    root.add(zenitGroup);
  });

  // 3. Buran Orbiter attached
  const buran = createDiscoveryModel({ livery: 'buran' });
  buran.scale.set(0.9, 0.9, 0.9);
  buran.rotation.set(0, 0, Math.PI / 2);
  buran.position.set(5.9, -3, 0);
  buran.userData = { group: 'buran' };
  root.add(buran);

  return root;
}

export function createSatriaSatelliteModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'satria-1-satellite';

  // 1. Bus Platform (Gold MLI Box)
  const busGeom = new THREE.BoxGeometry(4.8, 6.2, 4.2);
  const busMesh = new THREE.Mesh(busGeom, MATS.gold);
  busMesh.userData = { group: 'bus' };
  root.add(busMesh);

  // Top and bottom avionics deck
  const deckGeom = new THREE.BoxGeometry(5.0, 0.35, 4.4);
  const topDeck = new THREE.Mesh(deckGeom, MATS.goldDark);
  topDeck.position.set(0, 3.15, 0);
  topDeck.userData = { group: 'bus' };
  root.add(topDeck);

  // 2. Optical Solar Reflectors (OSR Panels) on North/South sides
  [-1, 1].forEach((side) => {
    const osrGeom = new THREE.BoxGeometry(4.6, 5.8, 0.1);
    const osrMesh = new THREE.Mesh(osrGeom, MATS.osr);
    osrMesh.position.set(0, 0, 2.15 * side);
    osrMesh.userData = { group: 'osr' };
    root.add(osrMesh);
  });

  // 3. Dual Deployable Solar Arrays (38m span)
  [-1, 1].forEach((side) => {
    const arrayGroup = new THREE.Group();
    arrayGroup.userData = { group: 'solar' };

    // Boom arm
    const boomGeom = new THREE.CylinderGeometry(0.18, 0.18, 4.5, 12);
    boomGeom.rotateZ(Math.PI / 2);
    const boomMesh = new THREE.Mesh(boomGeom, MATS.boom);
    boomMesh.position.set(4.2 * side, 0, 0);
    arrayGroup.add(boomMesh);

    // 5 Solar panels per wing
    for (let i = 0; i < 5; i++) {
      const pX = (6.8 + i * 3.8) * side;
      const panelGeom = new THREE.BoxGeometry(3.5, 5.2, 0.12);
      const panelMesh = new THREE.Mesh(panelGeom, MATS.solar);
      panelMesh.position.set(pX, 0, 0);
      arrayGroup.add(panelMesh);
    }
    root.add(arrayGroup);
  });

  // 4. Steerable Ka-Band Dish Reflectors
  const dishPositions: [number, number, number, number][] = [
    [0, 2.4, 2.8, 0.4],
    [0, 2.4, -2.8, -0.4],
    [2.8, 2.4, 0, 0],
    [-2.8, 2.4, 0, 0],
  ];
  dishPositions.forEach(([x, y, z, rotZ]) => {
    const dishGroup = new THREE.Group();
    dishGroup.position.set(x, y, z);
    dishGroup.rotation.z = rotZ;
    dishGroup.userData = { group: 'antenna' };

    // Parabolic main dish
    const dishGeom = new THREE.SphereGeometry(1.8, 24, 16, 0, Math.PI * 2, 0, 0.65);
    dishGeom.rotateX(Math.PI / 2);
    const dishMesh = new THREE.Mesh(dishGeom, MATS.dish);
    dishGroup.add(dishMesh);

    // Feed horn & subreflector
    const hornGeom = new THREE.CylinderGeometry(0.15, 0.35, 1.2, 12);
    const horn = new THREE.Mesh(hornGeom, MATS.boom);
    horn.position.set(0, 0, 0.8);
    horn.rotateX(Math.PI / 2);
    dishGroup.add(horn);

    root.add(dishGroup);
  });

  // 5. Electric Hall-Effect Plasma Thrusters (SPT-100 x4)
  const thrusterLocs = [
    [-1.6, -3.2, -1.4],
    [1.6, -3.2, -1.4],
    [-1.6, -3.2, 1.4],
    [1.6, -3.2, 1.4],
  ];
  thrusterLocs.forEach(([x, y, z]) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, y, z);
    tGroup.userData = { group: 'thruster' };

    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16), MATS.hall);
    tGroup.add(bodyMesh);

    // Glowing plasma ion channel
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 12, 24), MATS.hallGlow);
    glowRing.rotateX(Math.PI / 2);
    glowRing.position.set(0, -0.42, 0);
    tGroup.add(glowRing);

    root.add(tGroup);
  });

  // 6. Internal Xenon Propellant Tank (visible in x-ray or when bus hidden)
  const tankGeom = new THREE.SphereGeometry(1.6, 24, 24);
  const tankMesh = new THREE.Mesh(tankGeom, MATS.hull);
  tankMesh.position.set(0, 0, 0);
  tankMesh.userData = { group: 'tank' };
  root.add(tankMesh);

  return root;
}

export function createCubeSatModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'cubesat-1u';

  // Scale: 1 unit = 2 cm (10 cm = 5 units)
  const CUBE_SIZE = 5.0;

  // 1. Chassis Frame (Aluminium 6061 Hard Anodized Rails)
  const frameGroup = new THREE.Group();
  frameGroup.userData = { group: 'rangka' };

  // 4 corner rails
  [-1, 1].forEach((rx) => {
    [-1, 1].forEach((rz) => {
      const railGeom = new THREE.BoxGeometry(0.4, CUBE_SIZE + 0.6, 0.4);
      const railMesh = new THREE.Mesh(railGeom, MATS.rail);
      railMesh.position.set(rx * (CUBE_SIZE / 2 - 0.1), 0, rz * (CUBE_SIZE / 2 - 0.1));
      frameGroup.add(railMesh);
    });
  });

  // Top and bottom cross bars
  [-1, 1].forEach((ry) => {
    const rimGeom = new THREE.BoxGeometry(CUBE_SIZE, 0.35, CUBE_SIZE);
    const rimMesh = new THREE.Mesh(rimGeom, MATS.rail);
    rimMesh.position.set(0, ry * (CUBE_SIZE / 2), 0);
    frameGroup.add(rimMesh);
  });
  root.add(frameGroup);

  // 2. Body Solar Panels
  const panelGroup = new THREE.Group();
  panelGroup.userData = { group: 'panel' };

  [-1, 1].forEach((side) => {
    const pX = new THREE.Mesh(new THREE.BoxGeometry(0.08, CUBE_SIZE - 0.6, CUBE_SIZE - 0.6), MATS.solar);
    pX.position.set(side * (CUBE_SIZE / 2 - 0.04), 0, 0);
    panelGroup.add(pX);

    const pZ = new THREE.Mesh(new THREE.BoxGeometry(CUBE_SIZE - 0.6, CUBE_SIZE - 0.6, 0.08), MATS.solar);
    pZ.position.set(0, 0, side * (CUBE_SIZE / 2 - 0.04));
    panelGroup.add(pZ);
  });
  root.add(panelGroup);

  // 3. Deployable Solar Wings
  const deployGroup = new THREE.Group();
  deployGroup.userData = { group: 'deploy' };

  [-1, 1].forEach((side) => {
    const wingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, CUBE_SIZE, CUBE_SIZE * 0.9), MATS.solar);
    wingMesh.position.set(side * (CUBE_SIZE * 1.15), 0, 0);
    deployGroup.add(wingMesh);
  });
  root.add(deployGroup);

  // 4. Tape Spring UHF/VHF Antenna
  const antennaGroup = new THREE.Group();
  antennaGroup.userData = { group: 'antena' };

  const antGeom = new THREE.CylinderGeometry(0.04, 0.04, 8, 8);
  antGeom.rotateX(0.4);
  const antMesh = new THREE.Mesh(antGeom, MATS.boom);
  antMesh.position.set(0, -CUBE_SIZE / 2 - 3.8, 1.2);
  antennaGroup.add(antMesh);
  root.add(antennaGroup);

  // 5. Internal PC104 Circuit Boards (Stacked)
  const boardGroup = new THREE.Group();
  boardGroup.userData = { group: 'papan' };

  [-1.5, -0.5, 0.5, 1.5].forEach((yPos) => {
    const pcbMesh = new THREE.Mesh(new THREE.BoxGeometry(CUBE_SIZE - 0.8, 0.12, CUBE_SIZE - 0.8), MATS.pcb);
    pcbMesh.position.set(0, yPos, 0);
    boardGroup.add(pcbMesh);

    // Microchips on board
    const chipMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 1.2), MATS.chip);
    chipMesh.position.set(0.4, yPos + 0.12, 0.4);
    boardGroup.add(chipMesh);
  });
  root.add(boardGroup);

  // 6. Battery Pack (dual 18650 cells)
  const battGroup = new THREE.Group();
  battGroup.userData = { group: 'baterai' };

  [-0.6, 0.6].forEach((xOffset) => {
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.2, 16), MATS.batt);
    cell.position.set(xOffset, 0, -1.0);
    battGroup.add(cell);
  });
  root.add(battGroup);

  // 7. Mini Camera Payload (Aperture lens)
  const payloadGroup = new THREE.Group();
  payloadGroup.userData = { group: 'muatan' };

  const lensMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.9, 16), MATS.bell);
  lensMesh.position.set(0, CUBE_SIZE / 2 + 0.35, 0);
  payloadGroup.add(lensMesh);

  const glassMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), MATS.glass);
  glassMesh.position.set(0, CUBE_SIZE / 2 + 0.8, 0);
  payloadGroup.add(glassMesh);

  root.add(payloadGroup);

  return root;
}

export function createFlatSatModel(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'flatsat-testbench';

  // 1. Antistatic Workbench
  const benchGeom = new THREE.BoxGeometry(24, 0.8, 16);
  const benchMesh = new THREE.Mesh(benchGeom, MATS.bench);
  benchMesh.position.set(0, -0.4, 0);
  benchMesh.userData = { group: 'meja' };
  root.add(benchMesh);

  // 2. Unfolded Subsystem PCBs
  const boardGroup = new THREE.Group();
  boardGroup.userData = { group: 'papan' };

  const boardCoords = [
    [-6, 0.1, -4],
    [0, 0.1, -4],
    [6, 0.1, -4],
    [-6, 0.1, 3],
    [0, 0.1, 3],
    [6, 0.1, 3],
  ];
  boardCoords.forEach(([x, y, z], idx) => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 4.2), MATS.pcb);
    board.position.set(x, y, z);
    boardGroup.add(board);

    // IC Chips
    const chip = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 1.2), MATS.chip);
    chip.position.set(x + 0.5, y + 0.12, z + 0.5);
    boardGroup.add(chip);
  });
  root.add(boardGroup);

  // 3. Harness Ribbon Cables
  const cableGroup = new THREE.Group();
  cableGroup.userData = { group: 'kabel' };

  const cables = [
    [-3, 0.15, -4, 2, 0.05, 0.8],
    [3, 0.15, -4, 2, 0.05, 0.8],
    [-3, 0.15, 3, 2, 0.05, 0.8],
    [3, 0.15, 3, 2, 0.05, 0.8],
    [0, 0.15, -0.5, 0.8, 0.05, 3.2],
  ];
  cables.forEach(([cx, cy, cz, w, h, d]) => {
    const cableMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MATS.kabel);
    cableMesh.position.set(cx, cy, cz);
    cableGroup.add(cableMesh);
  });
  root.add(cableGroup);

  // 4. Test Instruments (Benchtop Power Supply & Monitor)
  const standGroup = new THREE.Group();
  standGroup.userData = { group: 'ujistand' };

  // Power supply
  const psuMesh = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 4), MATS.hullWarm);
  psuMesh.position.set(-8.5, 1.6, 6);
  standGroup.add(psuMesh);

  // Monitor screen
  const monMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 0.5), MATS.chip);
  monMesh.position.set(7, 2.5, 6);
  standGroup.add(monMesh);

  const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.8, 0.05), MATS.glass);
  screenMesh.position.set(7, 2.5, 5.72);
  standGroup.add(screenMesh);

  root.add(standGroup);

  return root;
}

export function build3DModel(variant: string, options?: { doorsOpen?: boolean }): THREE.Group {
  switch (variant) {
    case 'discovery':
      return createDiscoveryModel(options);
    case 'stack':
      return createStackModel();
    case 'buran':
      return createDiscoveryModel({ livery: 'buran', doorsOpen: options?.doorsOpen });
    case 'buranStack':
      return createBuranStackModel();
    case 'satria':
      return createSatriaSatelliteModel();
    case 'cubesat':
      return createCubeSatModel();
    case 'flatsat':
      return createFlatSatModel();
    default:
      return createDiscoveryModel(options);
  }
}
