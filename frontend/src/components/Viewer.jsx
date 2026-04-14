import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { API_BASE } from "../AppContext";

function resolveAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function Viewer({ tumorMeshUrl, brainMeshUrl }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const tumorRef = useRef(null);
  const brainRef = useRef(null);
  const loaderRef = useRef(null);
  const brainMaterialsRef = useRef(null);
  const [brainMode, setBrainMode] = useState("solid");
  const [meshLoading, setMeshLoading] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030814);
    scene.fog = new THREE.FogExp2(0x030814, 0.0012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 5000);
    camera.position.set(0, 70, 140);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minDistance = 60;
    controls.maxDistance = 500;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    let resumeTimer = null;
    const onUserInteract = () => {
      controls.autoRotate = false;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 3000);
    };
    renderer.domElement.addEventListener("pointerdown", onUserInteract);

    const hemi = new THREE.HemisphereLight(0x1a2a4a, 0x0a0c10, 1.8);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xc0d8ff, 3.0);
    keyLight.position.set(120, 180, 90);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x88aaff, 1.0);
    fillLight.position.set(-100, 60, 60);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x00ffc8, 1.6);
    rimLight.position.set(-80, -30, -140);
    scene.add(rimLight);
    const underLight = new THREE.DirectionalLight(0x3366ff, 0.8);
    underLight.position.set(0, -120, 0);
    scene.add(underLight);
    const tumorGlow = new THREE.PointLight(0xff3300, 4.0, 120, 1.5);
    tumorGlow.position.set(0, 0, 0);
    scene.add(tumorGlow);
    scene._tumorGlow = tumorGlow;

    const resize = () => {
      const width  = mount.clientWidth  || 600;
      const height = mount.clientHeight || 480;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    let frameId = 0;
    const animate = () => {
      controls.update();
      const t = performance.now() * 0.001;
      tumorGlow.intensity = 3.5 + Math.sin(t * 2.0) * 1.0;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    loaderRef.current = new OBJLoader();

    return () => {
      clearTimeout(resumeTimer);
      renderer.domElement.removeEventListener("pointerdown", onUserInteract);
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const loader = loaderRef.current;
    if (!scene || !camera || !controls || !loader) return undefined;

    const tumorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff2222,
      emissive: 0xff1100,
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      depthWrite: true,
    });

    const brainSolid = new THREE.MeshPhysicalMaterial({
      color: 0x99ccff,
      transparent: true,
      transmission: 0.72,
      ior: 1.38,
      thickness: 18,
      roughness: 0.12,
      metalness: 0.0,
      reflectivity: 0.25,
      envMapIntensity: 0.8,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const brainWireframe = new THREE.MeshBasicMaterial({
      color: 0x55ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    brainMaterialsRef.current = { solid: brainSolid, wireframe: brainWireframe };

    const applyMaterial = (root, material) => {
      root.traverse((child) => {
        if (child.isMesh) child.material = material;
      });
    };

    const loadObj = (url, material, slot, renderOrder = 0) =>
      new Promise((resolve, reject) => {
        if (!url) {
          if (slot.current) { scene.remove(slot.current); slot.current = null; }
          resolve(null);
          return;
        }
        loader.load(
          `${url}?t=${Date.now()}`,
          (object) => {
            applyMaterial(object, material);
            object.renderOrder = renderOrder;
            if (slot.current) scene.remove(slot.current);
            slot.current = object;
            scene.add(object);
            resolve(object);
          },
          undefined,
          reject,
        );
      });

    const frameScene = (tumor, brain) => {
      const box = new THREE.Box3();
      if (tumor) box.expandByObject(tumor);
      if (brain) box.expandByObject(brain);
      if (box.isEmpty()) return;

      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      const distance = size * 1.4;

      controls.target.copy(center);
      camera.position.set(
        center.x + distance * 0.5,
        center.y + distance * 0.4,
        center.z + distance * 0.9,
      );
      camera.lookAt(center);
      controls.update();

      if (tumor && scene._tumorGlow) {
        const tumorBox = new THREE.Box3().setFromObject(tumor);
        const tumorCenter = tumorBox.getCenter(new THREE.Vector3());
        scene._tumorGlow.position.copy(tumorCenter);
      }
    };

    let cancelled = false;
    setMeshLoading(true);
    Promise.all([
      loadObj(resolveAssetUrl(tumorMeshUrl), tumorMaterial, tumorRef, 2),
      loadObj(resolveAssetUrl(brainMeshUrl), brainSolid, brainRef, 1),
    ]).then(([tumor, brain]) => {
      if (!cancelled) {
        frameScene(tumor, brain);
        setMeshLoading(false);
      }
    }).catch((error) => {
      console.error("Failed to load mesh", error);
      if (!cancelled) setMeshLoading(false);
    });

    return () => { cancelled = true; };
  }, [tumorMeshUrl, brainMeshUrl]);

  useEffect(() => {
    const brain = brainRef.current;
    const mats = brainMaterialsRef.current;
    if (!brain || !mats) return;

    if (brainMode === "hidden") {
      brain.visible = false;
    } else {
      brain.visible = true;
      const mat = brainMode === "wireframe" ? mats.wireframe : mats.solid;
      brain.traverse((child) => {
        if (child.isMesh) child.material = mat;
      });
    }
  }, [brainMode]);

  return (
    <div className="viewer-wrapper">
      <div className="viewer" ref={mountRef} />
      {meshLoading && (
        <div className="viewer-loading-overlay">
          <span className="spinner" />
          <span>Loading 3D Mesh...</span>
        </div>
      )}
      <div className="viewer-toolbar">
        <button
          className={`toolbar-btn ${brainMode === "solid" ? "active" : ""}`}
          onClick={() => setBrainMode("solid")}
        >
          Solid
        </button>
        <button
          className={`toolbar-btn ${brainMode === "wireframe" ? "active" : ""}`}
          onClick={() => setBrainMode("wireframe")}
        >
          Wireframe
        </button>
        <button
          className={`toolbar-btn ${brainMode === "hidden" ? "active" : ""}`}
          onClick={() => setBrainMode("hidden")}
        >
          Tumor Only
        </button>
      </div>
    </div>
  );
}
