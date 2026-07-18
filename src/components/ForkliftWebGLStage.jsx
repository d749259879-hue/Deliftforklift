import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Grid,
  Html,
  Lightformer,
  OrbitControls,
  Sparkles,
  useGLTF,
} from "@react-three/drei";
import { gsap } from "gsap";
import { AdditiveBlending, Box3, Group, MathUtils, Sphere, Vector3 } from "three";


const MODEL_URL = "/assets/forklift-3d/delift-forklift.glb?v=20260718-1";

const CATEGORY_TO_SYSTEM = {
  "brake-master-cylinder": "brakes",
  "oil-pump": "hydraulics",
  "torque-converter": "transmission",
  "power-steering-cylinder": "steering",
  "tilt-rod": "mast",
  switch: "electrical",
};

const SYSTEM_ALIASES = {
  body: ["body", "chassis", "forkliftbody"],
  mast: ["mast", "liftmast"],
  forks: ["forks", "fork", "forkassembly"],
  steering: ["steering", "steeringsystem"],
  hydraulics: ["hydraulics", "hydraulic", "hydraulicsystem"],
  transmission: ["transmission", "gearbox"],
  brakes: ["brakes", "brake", "brakesystem"],
  electrical: ["electrical", "electricalsystem", "battery"],
};

const EXPLODED_OFFSETS = {
  mast: [-3.4, 1.25, 0.15],
  steering: [-3.2, 0.05, 1],
  brakes: [-3.25, -1.02, 1],
  hydraulics: [3.05, 0.34, -0.12],
  transmission: [3.45, 0.04, 0.42],
  electrical: [3.18, -1.02, 0.78],
};

const PHONE_EXPLODED_OFFSETS = {
  mast: [-1.7, 2.7, -0.2],
  steering: [-3.2, 0.25, 0.55],
  brakes: [-2.55, -1.2, -0.5],
  hydraulics: [1.6, 2.4, -0.4],
  transmission: [2.85, 0.65, -0.1],
  electrical: [2.95, -1.15, -0.45],
};

const PHONE_ASSEMBLY_FACTORS = {
  mast: 0.95,
  steering: 0.9,
  brakes: 1,
  hydraulics: 0.92,
  transmission: 1,
  electrical: 1.05,
};

const EXPLOSION_CURVES = {
  mast: [-0.42, 0.58, -0.18],
  forks: [-0.32, -0.22, 0.16],
  steering: [-0.54, 0.36, 0.48],
  hydraulics: [0.52, 0.54, -0.42],
  transmission: [0.62, 0.16, -0.08],
  brakes: [-0.48, -0.36, 0.42],
  electrical: [0.54, -0.34, 0.44],
};

const DISPLAY_ASSEMBLIES = {
  "tilt-rod": {
    slot: "mast",
    scale: 1.25,
    meshes: [
      "Hydraulics_TiltCylinder_-1",
      "Hydraulics_TiltPiston_-1",
      "Hydraulics_TiltPivot_-1",
    ],
  },
  "power-steering-cylinder": {
    slot: "steering",
    scale: 1.35,
    meshes: ["Steering_Cylinder", "Steering_Piston"],
  },
  "brake-master-cylinder": {
    slot: "brakes",
    scale: 2.1,
    meshes: [
      "Brakes_MasterCylinder",
      "Brakes_FluidReservoir",
      "Brakes_ReservoirCap",
    ],
  },
  "oil-pump": {
    slot: "hydraulics",
    scale: 1.15,
    meshes: [
      "Hydraulics_PumpHousing",
      "Hydraulics_PumpFace",
      "Hydraulics_PumpRing",
      ...Array.from({ length: 8 }, (_, index) => `Hydraulics_PumpBolt_${String(index + 1).padStart(2, "0")}`),
      "Hydraulics_Manifold",
      ...Array.from({ length: 4 }, (_, index) => `Hydraulics_HoseCoupler_${String(index + 1).padStart(2, "0")}`),
    ],
  },
  "torque-converter": {
    slot: "transmission",
    scale: 1.35,
    meshes: ["Transmission_TorqueConverter", "Transmission_ConverterRing"],
  },
  switch: {
    slot: "electrical",
    scale: 1.6,
    meshes: [
      "Electrical_SwitchBody",
      "Electrical_SwitchHex",
      "Electrical_SwitchPlunger",
      "Electrical_SwitchTerminal_01",
      "Electrical_SwitchTerminal_02",
    ],
  },
};

const ORBIT_PROFILES = {
  mast: { phase: 0.2, radius: 0.14, lift: 0.05, speed: 0.25 },
  forks: { phase: 1.0, radius: 0.11, lift: 0.035, speed: -0.22 },
  steering: { phase: 1.9, radius: 0.17, lift: 0.06, speed: 0.28 },
  hydraulics: { phase: 2.7, radius: 0.16, lift: 0.07, speed: -0.24 },
  transmission: { phase: 3.5, radius: 0.14, lift: 0.05, speed: 0.23 },
  brakes: { phase: 4.35, radius: 0.16, lift: 0.055, speed: -0.27 },
  electrical: { phase: 5.2, radius: 0.15, lift: 0.06, speed: 0.26 },
};

const MARKER_SCREEN_OFFSETS = {
  mast: ["clamp(-92px, -6cqw, -58px)", "clamp(-36px, -2.4cqw, -22px)"],
  hydraulics: ["clamp(52px, 5cqw, 78px)", "clamp(-58px, -4cqw, -34px)"],
  transmission: ["clamp(56px, 5.4cqw, 84px)", "clamp(-18px, -1.2cqw, -8px)"],
  steering: ["clamp(-132px, -9cqw, -92px)", "clamp(-18px, -1.2cqw, -8px)"],
  brakes: ["clamp(-96px, -6.4cqw, -64px)", "clamp(38px, 3.2cqw, 58px)"],
  electrical: ["clamp(64px, 5.8cqw, 92px)", "clamp(42px, 3.5cqw, 64px)"],
};

const CAMERA_CONFIG = {
  phone: {
    assembled: 18.4,
    expanded: 18.4,
    assembledPosition: [11.38, 3.62, 13.88],
    expandedPosition: [11.38, 3.62, 13.88],
    fov: 42,
  },
  portrait: {
    assembled: 10.9,
    expanded: 10.9,
    assembledPosition: [6.28, 3.2, 7.58],
    expandedPosition: [6.28, 3.2, 7.58],
    fov: 46,
  },
  wide: {
    assembled: 10.35,
    expanded: 10.3,
    assembledPosition: [6.52, 0.79, 7.98],
    expandedPosition: [6.5, 0.82, 7.95],
    fov: 39,
  },
};

const CATALOG_WIDE_CAMERA = {
  assembled: 9.55,
  expanded: 9.5,
  assembledPosition: [6.02, 0.71, 7.36],
  expandedPosition: [5.98, 0.73, 7.34],
  fov: 39,
};


function normalizeNodeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}


function matchSystem(objectName, exactOnly = false) {
  const normalized = normalizeNodeName(objectName);
  if (!normalized) return null;

  for (const [system, aliases] of Object.entries(SYSTEM_ALIASES)) {
    if (aliases.includes(normalized)) return system;
    if (!exactOnly && aliases.some((alias) => normalized.includes(alias))) return system;
  }
  return null;
}


function findSystemFromObject(object) {
  let current = object;
  while (current) {
    const system = matchSystem(current.name);
    if (system) return system;
    current = current.parent;
  }
  return null;
}


function findCategoryFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.categoryId) return current.userData.categoryId;
    current = current.parent;
  }
  return null;
}


function createModelSnapshot(scene) {
  const root = scene.clone(true);
  root.updateWorldMatrix(true, true);

  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (Array.isArray(object.material)) {
      object.material = object.material.map((material) => material.clone());
    } else if (object.material) {
      object.material = object.material.clone();
    }
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material?.isMeshStandardMaterial) continue;
      const materialName = material.name.toLowerCase();
      if (materialName.includes("black_titanium")) material.color.set("#223139");
      if (materialName.includes("gunmetal")) material.color.set("#31424a");
      if (materialName.includes("edge_metal")) material.color.set("#46565d");
      if (materialName.includes("delift_orange")) {
        material.color.set("#b56816");
        material.metalness = 0.66;
        material.emissive?.set("#2f1000");
        material.emissiveIntensity = 0.06;
      }
      material.envMapIntensity = 1.14;
      material.roughness = MathUtils.clamp(material.roughness ?? 0.5, 0.32, 0.6);
    }
  });

  const systems = {};
  const objects = [];
  root.traverse((object) => objects.push(object));

  for (const exactOnly of [true, false]) {
    for (const object of objects) {
      const system = matchSystem(object.name, exactOnly);
      if (system && !systems[system]) systems[system] = object;
    }
  }

  const bounds = new Box3().setFromObject(root);
  const size = bounds.getSize(new Vector3());
  const bodyBounds = systems.body ? new Box3().setFromObject(systems.body) : bounds;
  const rotationCenter = bodyBounds.getCenter(new Vector3());
  const sphere = bounds.getBoundingSphere(new Sphere());
  const scale = 4.2 / Math.max(sphere.radius, 0.01);
  const displayRoot = new Group();
  const movingSystems = [];
  const systemAnchors = {};
  displayRoot.name = "display_assemblies";
  root.add(displayRoot);

  for (const [categoryId, assembly] of Object.entries(DISPLAY_ASSEMBLIES)) {
    const system = assembly.slot;
    const group = new Group();
    const matchingMeshes = assembly.meshes.map((name) => root.getObjectByName(name));
    const missingMeshes = assembly.meshes.filter((_, index) => !matchingMeshes[index]);

    if (missingMeshes.length) {
      throw new Error(`The forklift GLB is missing: ${missingMeshes.join(", ")}`);
    }

    group.name = `display_${categoryId}`;
    group.userData.systemId = system;
    group.userData.categoryId = categoryId;
    displayRoot.add(group);

    for (const object of matchingMeshes) {
      const clone = object.clone(false);
      clone.name = `${object.name}_display`;
      clone.castShadow = true;
      clone.receiveShadow = true;
      clone.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material?.clone();
      clone.matrix.copy(object.matrixWorld);
      clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
      clone.matrixAutoUpdate = true;
      group.add(clone);
      object.visible = false;
    }

    const assemblyBounds = new Box3().setFromObject(group);
    const center = assemblyBounds.getCenter(new Vector3());
    for (const child of group.children) child.position.sub(center);
    group.position.copy(center);

    const offset = EXPLODED_OFFSETS[system];
    const curve = EXPLOSION_CURVES[system] || [0, 0, 0];
    const explodedPosition = center.clone().add(new Vector3(...offset).divideScalar(scale));
    const clearancePosition = center.clone().add(
      new Vector3(...offset).normalize().multiplyScalar(0.58 / scale),
    );
    const curvePosition = clearancePosition.clone()
      .lerp(explodedPosition, 0.5)
      .add(new Vector3(...curve).divideScalar(scale));
    const motion = { progress: 0 };

    movingSystems.push({
      categoryId,
      system,
      object: group,
      basePosition: center.clone(),
      baseRotation: group.rotation.clone(),
      clearancePosition,
      explodedPosition,
      explodedRotationY: (offset[0] >= 0 ? 1 : -1) * 0.12,
      curvePosition,
      animatedTarget: center.clone(),
      displayScale: assembly.scale,
      phoneOffset: new Vector3(...PHONE_EXPLODED_OFFSETS[system]),
      phoneClearancePosition: center.clone(),
      phoneExplodedPosition: center.clone(),
      phoneCurvePosition: center.clone(),
      motion,
    });

    systemAnchors[system] = {
      object: group,
      localPoint: new Vector3(0, 0, 0),
      worldPoint: new Vector3(),
      motion,
    };
  }

  if (movingSystems.length !== Object.keys(DISPLAY_ASSEMBLIES).length) {
    throw new Error("The forklift GLB does not contain all six display assemblies.");
  }

  return {
    root,
    systems,
    systemAnchors,
    movingSystems,
    scale,
    position: [
      -rotationCenter.x * scale,
      -1.42 - bounds.min.y * scale,
      -rotationCenter.z * scale,
    ],
    dimensions: size,
  };
}


function ResponsiveCamera({ expanded, reducedMotion, variant }) {
  const { camera, size } = useThree();
  const directionRef = useRef(new Vector3());
  const targetRef = useRef(new Vector3(0, -0.22, 0));
  const transitionRef = useRef({ remaining: 0 });
  const initialStateRef = useRef(true);

  useEffect(() => {
    camera.near = 0.1;
    camera.far = 80;
    camera.lookAt(0, -0.22, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    if (initialStateRef.current) {
      initialStateRef.current = false;
      return;
    }
    transitionRef.current.remaining = reducedMotion ? 0 : (expanded ? 1.05 : 0.95);
  }, [expanded, reducedMotion]);

  useFrame((_, delta) => {
    const aspect = size.width / Math.max(size.height, 1);
    const mode = aspect < 0.72 ? "phone" : aspect < 1.12 ? "portrait" : "wide";
    const config = variant === "catalog" && mode === "wide"
      ? CATALOG_WIDE_CAMERA
      : CAMERA_CONFIG[mode];
    targetRef.current.y = mode === "phone" ? -0.28 : mode === "portrait" ? -0.24 : -0.22;
    const desiredDistance = expanded ? config.expanded : config.assembled;
    const transition = transitionRef.current;

    if (transition.remaining > 0) {
      const targetPosition = expanded ? config.expandedPosition : config.assembledPosition;
      const damping = expanded ? 3.8 : 4.2;
      camera.position.x = MathUtils.damp(camera.position.x, targetPosition[0], damping, delta);
      camera.position.y = MathUtils.damp(camera.position.y, targetPosition[1], damping, delta);
      camera.position.z = MathUtils.damp(camera.position.z, targetPosition[2], damping, delta);
      camera.lookAt(targetRef.current);
      transition.remaining = Math.max(0, transition.remaining - delta);
    } else {
      const direction = directionRef.current.copy(camera.position).sub(targetRef.current);
      const currentDistance = Math.max(direction.length(), 0.01);
      const nextDistance = reducedMotion
        ? desiredDistance
        : MathUtils.damp(currentDistance, desiredDistance, expanded ? 2.7 : 3.2, delta);

      camera.position
        .copy(targetRef.current)
        .add(direction.normalize().multiplyScalar(nextDistance));
    }

    const nextFov = reducedMotion
      ? config.fov
      : MathUtils.damp(camera.fov, config.fov, 4.5, delta);
    if (Math.abs(camera.fov - nextFov) > 0.001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}


function OrbitingCamera({ expanded, reducedMotion }) {
  const { size } = useThree();
  const [paused, setPaused] = useState(false);
  const [transitionPaused, setTransitionPaused] = useState(true);
  const resumeTimerRef = useRef(0);
  const transitionTimerRef = useRef(0);

  useEffect(() => () => {
    window.clearTimeout(resumeTimerRef.current);
    window.clearTimeout(transitionTimerRef.current);
  }, []);

  useEffect(() => {
    window.clearTimeout(transitionTimerRef.current);
    setTransitionPaused(true);
    if (expanded) return undefined;
    transitionTimerRef.current = window.setTimeout(() => setTransitionPaused(false), 1050);
    return () => window.clearTimeout(transitionTimerRef.current);
  }, [expanded]);

  function pauseRotation() {
    window.clearTimeout(resumeTimerRef.current);
    setPaused(true);
  }

  function resumeRotationLater() {
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 2600);
  }

  const aspect = size.width / Math.max(size.height, 1);
  const polarAngle = aspect < 0.72 ? 1.36 : aspect < 1.12 ? 1.44 : 1.47;
  const targetY = aspect < 0.72 ? -0.28 : aspect < 1.12 ? -0.24 : -0.22;

  return (
    <OrbitControls
      makeDefault
      target={[0, targetY, 0]}
      enableDamping={!reducedMotion}
      dampingFactor={0.065}
      enablePan={false}
      enableZoom={false}
      minPolarAngle={polarAngle}
      maxPolarAngle={polarAngle}
      autoRotate={!reducedMotion && !paused && !transitionPaused && !expanded}
      autoRotateSpeed={2.5}
      onStart={pauseRotation}
      onEnd={resumeRotationLater}
    />
  );
}


function ContextLossGuard({ onError }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event) => {
      event.preventDefault();
      onError?.(new Error("The WebGL context was lost."));
    };
    canvas.addEventListener("webglcontextlost", handleContextLost, { once: true });
    return () => canvas.removeEventListener("webglcontextlost", handleContextLost);
  }, [gl, onError]);

  return null;
}


function SystemMarkers({ expanded, items, lang, model, onHoverChange, onSelectCategory }) {
  const markerRefs = useRef(new Map());
  const anchors = useMemo(() => items.flatMap((item) => {
    const system = CATEGORY_TO_SYSTEM[item.id];
    const anchor = model.systemAnchors[system];
    return anchor ? [{ anchor, item, system }] : [];
  }), [items, model.systemAnchors]);

  useFrame(() => {
    if (!expanded) return;
    model.root.updateWorldMatrix(true, true);
    for (const { anchor, system } of anchors) {
      const marker = markerRefs.current.get(system);
      if (!marker) continue;
      marker.visible = (anchor.motion?.progress ?? 0) > 0.78;
      anchor.worldPoint.copy(anchor.localPoint);
      anchor.object.localToWorld(anchor.worldPoint);
      marker.position.copy(anchor.worldPoint);
    }
  });

  if (!expanded) return null;

  return anchors.map(({ item, system }) => {
    const label = item.primary || (lang === "en" ? item.en : item.zh);
    const secondary = item.secondary || (lang === "en" ? item.zh : item.en);
    const markerOffset = MARKER_SCREEN_OFFSETS[system] || [0, 0];
    const MarkerControl = onSelectCategory ? "button" : "div";
    return (
      <group
        key={item.id}
        visible={(model.systemAnchors[system]?.motion?.progress ?? 0) > 0.78}
        ref={(node) => {
          if (node) markerRefs.current.set(system, node);
          else markerRefs.current.delete(system);
        }}
      >
        <Html center zIndexRange={[5, 3]}>
          <MarkerControl
            className="showroom-3d-node"
            style={{
              "--marker-shift-x": markerOffset[0],
              "--marker-shift-y": markerOffset[1],
            }}
            type={onSelectCategory ? "button" : undefined}
            data-system={system}
            data-category={item.id}
            data-interactive={onSelectCategory ? "true" : "false"}
            aria-label={`${label} / ${secondary}`}
            onFocus={() => onHoverChange?.(true)}
            onBlur={() => onHoverChange?.(false)}
            onPointerEnter={() => onHoverChange?.(true)}
            onPointerLeave={() => onHoverChange?.(false)}
            onClick={onSelectCategory ? (event) => {
              event.stopPropagation();
              onSelectCategory(item.id);
            } : undefined}
          >
            <span aria-hidden="true" />
            <strong lang={item.primaryLang} dir={item.primaryDir}>{label}</strong>
            <small lang={item.secondaryLang} dir={item.secondaryDir}>{secondary}</small>
          </MarkerControl>
        </Html>
      </group>
    );
  });
}


function Turntable({ expanded, reducedMotion }) {
  const { size } = useThree();
  const groupRef = useRef(null);
  const energyRingRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const aspect = size.width / Math.max(size.height, 1);
    const targetScale = aspect < 0.72
      ? (expanded ? 0.82 : 0.8)
      : aspect < 1.12
        ? (expanded ? 0.95 : 0.9)
        : (expanded ? 1 : 0.94);
    if (groupRef.current) {
      const nextScale = reducedMotion
        ? targetScale
        : MathUtils.damp(groupRef.current.scale.x, targetScale, 4.2, delta);
      groupRef.current.scale.setScalar(nextScale);
    }
    if (!energyRingRef.current || reducedMotion) return;
    energyRingRef.current.rotation.z = clock.elapsedTime * (expanded ? 0.16 : 0.09);
  });

  return (
    <group ref={groupRef} position={[0, -1.42, 0]} scale={0.94}>
      <mesh receiveShadow position={[0, -0.26, 0]}>
        <cylinderGeometry args={[4.18, 4.18, 0.16, 96]} />
        <meshStandardMaterial color="#020405" metalness={0.64} roughness={0.42} />
      </mesh>
      <mesh receiveShadow position={[0, -0.13, 0]}>
        <cylinderGeometry args={[4.02, 4.02, 0.1, 96]} />
        <meshStandardMaterial color="#05080a" metalness={0.58} roughness={0.46} />
      </mesh>
      <mesh receiveShadow position={[0, -0.04, 0]}>
        <cylinderGeometry args={[3.86, 3.86, 0.08, 96]} />
        <meshStandardMaterial color="#071014" metalness={0.48} roughness={0.58} />
      </mesh>
      <mesh receiveShadow position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.85, 96]} />
        <meshBasicMaterial color="#04080a" />
      </mesh>
      <Grid
        position={[0, 0.012, 0]}
        args={[7.25, 7.25]}
        cellColor="#17677b"
        cellSize={0.34}
        cellThickness={0.46}
        sectionColor="#2aa7c2"
        sectionSize={1.7}
        sectionThickness={0.82}
        fadeDistance={5.2}
        fadeStrength={1.5}
      />
      <mesh position={[0, 0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.84, 0.018, 8, 160]} />
        <meshBasicMaterial color="#35d8ff" transparent opacity={0.88} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.1, 0.012, 6, 160]} />
        <meshBasicMaterial color="#8b6728" transparent opacity={0.42} toneMapped={false} />
      </mesh>
      <mesh ref={energyRingRef} position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.78, 0.012, 6, 144, Math.PI * 1.54]} />
        <meshBasicMaterial color="#157b9e" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.12, 0.008, 5, 144]} />
        <meshBasicMaterial color="#1f819d" transparent opacity={0.24} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.06, 0.007, 5, 128]} />
        <meshBasicMaterial color="#1f819d" transparent opacity={0.19} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.013, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.14, 4.22, 128]} />
        <meshBasicMaterial color="#133440" transparent opacity={0.42} toneMapped={false} />
      </mesh>
    </group>
  );
}


function GalaxyOrbits({ expanded, reducedMotion }) {
  const groupRef = useRef(null);
  const materialRefs = useRef([]);

  useFrame(({ clock }, delta) => {
    const targetOpacity = expanded ? 1 : 0.28;
    for (const material of materialRefs.current) {
      if (!material) continue;
      material.opacity = reducedMotion
        ? targetOpacity * material.userData.maxOpacity
        : MathUtils.damp(
          material.opacity,
          targetOpacity * material.userData.maxOpacity,
          expanded ? 3.7 : 5.2,
          delta,
        );
    }

    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y = clock.elapsedTime * (expanded ? 0.055 : 0.028);
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.18) * 0.018;
  });

  const orbitLines = [
    { radius: 3.05, color: "#48e3ff", opacity: 0.34, scale: [1.46, 0.34, 1], rotation: [Math.PI / 2.02, 0.08, 0.08] },
    { radius: 3.82, color: "#1c9bc8", opacity: 0.25, scale: [1.3, 0.3, 1], rotation: [Math.PI / 2.06, -0.18, -0.07] },
    { radius: 4.62, color: "#54dcff", opacity: 0.18, scale: [1.14, 0.28, 1], rotation: [Math.PI / 2.01, 0.24, 0.05] },
    { radius: 5.34, color: "#ffad19", opacity: 0.045, scale: [1.02, 0.26, 1], rotation: [Math.PI / 2.04, -0.3, -0.04] },
  ];

  return (
    <group ref={groupRef} position={[0, -0.18, 0]}>
      {orbitLines.map((orbit, index) => (
        <mesh
          key={orbit.radius}
          rotation={orbit.rotation}
          scale={orbit.scale}
        >
          <torusGeometry args={[orbit.radius, index === 0 ? 0.018 : 0.011, 6, 192]} />
          <meshBasicMaterial
            ref={(material) => {
              materialRefs.current[index] = material;
              if (material) material.userData.maxOpacity = orbit.opacity;
            }}
            color={orbit.color}
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.02, 96]} />
        <meshBasicMaterial
          ref={(material) => {
            materialRefs.current[orbitLines.length] = material;
            if (material) material.userData.maxOpacity = 0.16;
          }}
          color="#48e3ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}


function ForkliftModel({
  expanded,
  items,
  lang,
  reducedMotion,
  onActivate,
  onHoverChange,
  onReady,
  onSelectCategory,
}) {
  const { camera, size } = useThree();
  const { scene } = useGLTF(MODEL_URL);
  const model = useMemo(() => createModelSnapshot(scene), [scene]);
  const mobileForkTines = useMemo(() => (
    ["Forks_LeftTine", "Forks_RightTine"]
      .map((name) => model.root.getObjectByName(name))
      .filter(Boolean)
      .map((object) => ({
        object,
        basePositionX: object.position.x,
        baseScaleX: object.scale.x,
      }))
  ), [model]);
  const readyRef = useRef(false);
  const cameraForwardRef = useRef(new Vector3());
  const cameraRightRef = useRef(new Vector3());
  const worldUpRef = useRef(new Vector3(0, 1, 0));
  const categoryBySystem = useMemo(() => {
    const mapping = {};
    for (const item of items) {
      const system = CATEGORY_TO_SYSTEM[item.id];
      if (system) mapping[system] = item.id;
    }
    return mapping;
  }, [items]);

  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    const frame = window.requestAnimationFrame(() => onReady?.());
    return () => window.cancelAnimationFrame(frame);
  }, [onReady]);

  useEffect(() => {
    const targetProgress = expanded ? 1 : 0;
    if (reducedMotion) {
      for (const part of model.movingSystems) part.motion.progress = targetProgress;
      return undefined;
    }

    const sequence = expanded
      ? model.movingSystems
      : [...model.movingSystems].reverse();
    const timeline = gsap.timeline();
    sequence.forEach((part, index) => {
      timeline.to(part.motion, {
        progress: targetProgress,
        duration: expanded ? 0.84 : 0.76,
        ease: expanded ? "power3.out" : "power3.inOut",
        overwrite: "auto",
      }, index * (expanded ? 0.038 : 0.032));
    });

    return () => timeline.kill();
  }, [expanded, model, reducedMotion]);

  useFrame(({ clock }, delta) => {
    const aspect = size.width / Math.max(size.height, 1);
    const isPhone = aspect < 0.72;
    const tineLengthFactor = isPhone ? 0.78 : 1;
    for (const tine of mobileForkTines) {
      tine.object.scale.x = MathUtils.damp(
        tine.object.scale.x,
        tine.baseScaleX * tineLengthFactor,
        9,
        delta,
      );
      tine.object.position.x = MathUtils.damp(
        tine.object.position.x,
        tine.basePositionX - 0.94 * (1 - tineLengthFactor),
        9,
        delta,
      );
    }
    const layoutScale = isPhone
      ? { x: 1, y: 1, z: 1 }
      : aspect < 1.12
        ? { x: 0.72, y: 0.86, z: 0.78 }
        : { x: 1, y: 1, z: 1 };
    const cameraForward = cameraForwardRef.current;
    const cameraRight = cameraRightRef.current;
    const worldUp = worldUpRef.current;

    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();
    cameraRight.crossVectors(cameraForward, worldUp).normalize();

    for (const part of model.movingSystems) {
      const progress = MathUtils.clamp(part.motion.progress, 0, 1);
      const profile = ORBIT_PROFILES[part.system];
      const orbitPhase = profile
        ? clock.elapsedTime * profile.speed + profile.phase
        : 0;
      const targetPosition = part.animatedTarget;
      if (isPhone) {
        part.phoneExplodedPosition
          .copy(part.basePosition)
          .addScaledVector(cameraRight, part.phoneOffset.x / model.scale)
          .addScaledVector(worldUp, part.phoneOffset.y / model.scale)
          .addScaledVector(cameraForward, part.phoneOffset.z / model.scale);
        part.phoneClearancePosition
          .copy(part.basePosition)
          .lerp(part.phoneExplodedPosition, 0.18);
        part.phoneCurvePosition
          .copy(part.phoneClearancePosition)
          .lerp(part.phoneExplodedPosition, 0.5)
          .addScaledVector(worldUp, 0.36 / model.scale)
          .addScaledVector(cameraForward, (part.phoneOffset.x >= 0 ? -0.2 : 0.2) / model.scale);
      }
      const clearancePosition = isPhone
        ? part.phoneClearancePosition
        : part.clearancePosition;
      const curvePosition = isPhone ? part.phoneCurvePosition : part.curvePosition;
      const explodedPosition = isPhone ? part.phoneExplodedPosition : part.explodedPosition;
      const curveX = clearancePosition.x
        + (curvePosition.x - clearancePosition.x) * layoutScale.x;
      const curveY = clearancePosition.y
        + (curvePosition.y - clearancePosition.y) * layoutScale.y;
      const curveZ = clearancePosition.z
        + (curvePosition.z - clearancePosition.z) * layoutScale.z;
      const explodedX = clearancePosition.x
        + (explodedPosition.x - clearancePosition.x) * layoutScale.x;
      const explodedY = clearancePosition.y
        + (explodedPosition.y - clearancePosition.y) * layoutScale.y;
      const explodedZ = clearancePosition.z
        + (explodedPosition.z - clearancePosition.z) * layoutScale.z;
      const travelProgress = MathUtils.clamp((progress - 0.42) / 0.58, 0, 1);

      if (progress <= 0.42) {
        const clearanceProgress = MathUtils.smoothstep(progress, 0, 0.42);
        targetPosition.lerpVectors(
          part.basePosition,
          clearancePosition,
          clearanceProgress,
        );
      } else {
        const inverseTravel = 1 - travelProgress;
        targetPosition.set(
          inverseTravel * inverseTravel * clearancePosition.x
            + 2 * inverseTravel * travelProgress * curveX
            + travelProgress * travelProgress * explodedX,
          inverseTravel * inverseTravel * clearancePosition.y
            + 2 * inverseTravel * travelProgress * curveY
            + travelProgress * travelProgress * explodedY,
          inverseTravel * inverseTravel * clearancePosition.z
            + 2 * inverseTravel * travelProgress * curveZ
            + travelProgress * travelProgress * explodedZ,
        );
      }

      let targetRotationY = MathUtils.lerp(
        part.baseRotation.y,
        part.explodedRotationY,
        travelProgress,
      );

      if (profile && !reducedMotion) {
        const orbitWeight = MathUtils.smoothstep(progress, 0.82, 1);
        targetPosition.x += Math.cos(orbitPhase) * profile.radius * orbitWeight / model.scale;
        targetPosition.y += Math.sin(orbitPhase * 1.6) * profile.lift * orbitWeight / model.scale;
        targetPosition.z += Math.sin(orbitPhase) * profile.radius * orbitWeight / model.scale;
        targetRotationY += Math.sin(orbitPhase) * 0.055 * orbitWeight;
      }

      const responsiveAssemblyScale = isPhone
        ? PHONE_ASSEMBLY_FACTORS[part.system]
        : aspect < 1.12 ? 0.94 : 1;
      const assemblyScale = MathUtils.lerp(
        1,
        part.displayScale * responsiveAssemblyScale,
        MathUtils.smoothstep(progress, 0.42, 1),
      );

      part.object.position.copy(targetPosition);
      part.object.rotation.y = targetRotationY;
      part.object.scale.setScalar(assemblyScale);
    }
  });

  function handleModelClick(event) {
    event.stopPropagation();
    if ((event.delta ?? 0) > 5) return;

    const isPhoneViewport = size.width / Math.max(size.height, 1) < 0.72;
    const directCategoryId = findCategoryFromObject(event.object);
    const system = directCategoryId ? null : findSystemFromObject(event.object);
    const categoryId = directCategoryId || (system ? categoryBySystem[system] : null);
    if (!isPhoneViewport && expanded && categoryId && onSelectCategory) {
      onSelectCategory(categoryId);
      return;
    }
    if (isPhoneViewport && expanded) return;
    onActivate?.();
  }

  return (
    <>
      <group
        position={[0, size.width / Math.max(size.height, 1) < 0.72 ? 0.256 : 0, 0]}
        scale={size.width / Math.max(size.height, 1) < 0.72 ? 0.94 : 1}
      >
        <group position={model.position} scale={model.scale}>
          <primitive
            object={model.root}
            onClick={handleModelClick}
            onPointerOver={(event) => {
              event.stopPropagation();
              onHoverChange?.(true);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              onHoverChange?.(false);
            }}
          />
        </group>
      </group>
      <SystemMarkers
        expanded={expanded}
        items={items}
        lang={lang}
        model={model}
        onHoverChange={onHoverChange}
        onSelectCategory={onSelectCategory}
      />
    </>
  );
}


function Scene({
  expanded,
  items,
  lang,
  mobileMode,
  variant,
  reducedMotion,
  onActivate,
  onHoverChange,
  onError,
  onReady,
  onSelectCategory,
}) {
  return (
    <>
      <ResponsiveCamera
        expanded={expanded}
        reducedMotion={reducedMotion}
        variant={variant}
      />
      <ContextLossGuard onError={onError} />
      <Environment resolution={mobileMode ? 48 : 96} background={false}>
        <Lightformer
          color="#eafcff"
          intensity={2.8}
          position={[0, 5.5, 4.5]}
          scale={[8, 3, 1]}
        />
        <Lightformer
          color="#45d8ff"
          intensity={1.45}
          position={[-5.5, 2.5, 0]}
          rotation-y={Math.PI / 2}
          scale={[6, 2.2, 1]}
        />
        <Lightformer
          color="#ff9f32"
          intensity={0.38}
          position={[5, 1.8, -3.5]}
          rotation-y={-Math.PI / 2}
          scale={[4.5, 1.6, 1]}
        />
      </Environment>
      <ambientLight intensity={0.68} />
      <hemisphereLight args={["#bceeff", "#08090a", 0.92]} />
      <directionalLight
        castShadow={!mobileMode}
        color="#eefaff"
        intensity={3.2}
        position={[-5, 8, 7]}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <directionalLight color="#8edfff" intensity={1.25} position={[6, 5, 7]} />
      <directionalLight color="#ffffff" intensity={1.1} position={[0, 6, -8]} />
      <directionalLight color="#ff9f32" intensity={0.22} position={[6, 3, -5]} />
      <spotLight color="#36d5ff" intensity={7.5} angle={0.5} penumbra={0.84} position={[0, 8, 5]} />

      <Sparkles
        count={reducedMotion ? 12 : mobileMode ? (expanded ? 34 : 14) : (expanded ? 72 : 28)}
        color={expanded ? "#77e8ff" : "#45d9ff"}
        opacity={expanded ? 0.42 : 0.16}
        scale={[11, 5.5, 10]}
        size={expanded ? 1.7 : 1.15}
        speed={reducedMotion ? 0 : (expanded ? 0.28 : 0.08)}
      />
      <Sparkles
        count={reducedMotion ? 3 : mobileMode ? (expanded ? 7 : 2) : (expanded ? 14 : 5)}
        color="#ffb23b"
        opacity={expanded ? 0.34 : 0.08}
        scale={[10, 4.8, 9]}
        size={expanded ? 1.2 : 0.75}
        speed={reducedMotion ? 0 : 0.16}
      />
      <Grid
        position={[0, -1.78, 0]}
        args={[24, 24]}
        cellColor="#0a4050"
        cellSize={0.48}
        cellThickness={0.34}
        sectionColor="#167b99"
        sectionSize={2.4}
        sectionThickness={0.7}
        fadeDistance={14}
        fadeStrength={1.3}
        infiniteGrid
      />
      <Turntable expanded={expanded} reducedMotion={reducedMotion} />
      <GalaxyOrbits expanded={expanded} reducedMotion={reducedMotion} />
      <ForkliftModel
        expanded={expanded}
        items={items}
        lang={lang}
        reducedMotion={reducedMotion}
        onActivate={onActivate}
        onHoverChange={onHoverChange}
        onReady={onReady}
        onSelectCategory={onSelectCategory}
      />
      {!mobileMode ? (
        <ContactShadows
          key={expanded ? "expanded" : "assembled"}
          position={[0, -1.405, 0]}
          opacity={0.24}
          scale={10}
          blur={3.2}
          far={5.5}
          resolution={256}
          frames={1}
        />
      ) : null}
      <OrbitingCamera expanded={expanded} reducedMotion={reducedMotion} />
    </>
  );
}


export default function ForkliftWebGLStage({ onBackgroundActivate, ...props }) {
  const [mobileMode, setMobileMode] = useState(() => (
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760
  ));

  useEffect(() => {
    const updateMobileMode = () => {
      setMobileMode(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760);
    };
    window.addEventListener("resize", updateMobileMode, { passive: true });
    return () => window.removeEventListener("resize", updateMobileMode);
  }, []);

  return (
    <Canvas
      className="showroom-webgl__canvas"
      camera={{
        position: props.variant === "catalog"
          ? CATALOG_WIDE_CAMERA.assembledPosition
          : CAMERA_CONFIG.wide.assembledPosition,
        fov: 39,
        near: 0.1,
        far: 80,
      }}
      dpr={mobileMode ? 0.9 : 1.25}
      frameloop={props.reducedMotion || props.active === false ? "demand" : "always"}
      gl={{
        alpha: true,
        antialias: !mobileMode,
        powerPreference: mobileMode ? "default" : "high-performance",
        preserveDrawingBuffer: false,
      }}
      shadows={mobileMode ? false : "basic"}
      onPointerMissed={(event) => {
        if ((event.delta ?? 0) > 5) return;
        onBackgroundActivate?.();
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000", 0);
        gl.toneMappingExposure = 1.3;
      }}
    >
      <Scene {...props} mobileMode={mobileMode} />
    </Canvas>
  );
}


useGLTF.preload(MODEL_URL);
