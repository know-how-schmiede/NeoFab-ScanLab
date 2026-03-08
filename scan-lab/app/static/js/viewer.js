import * as THREE from "../vendor/three/build/three.module.js";
import { OrbitControls } from "../vendor/three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "../vendor/three/examples/jsm/loaders/STLLoader.js";
import { GLTFLoader } from "../vendor/three/examples/jsm/loaders/GLTFLoader.js";

const container = document.getElementById("viewer-container");
const statusElement = document.getElementById("viewer-status");
const modelButtons = Array.from(document.querySelectorAll(".model-button"));
const modelColorInput = document.getElementById("model-color-input");
const modelColorResetButton = document.getElementById("model-color-reset");
const modelColorAddFavoriteButton = document.getElementById("model-color-add-favorite");
const modelColorRemoveFavoriteButton = document.getElementById("model-color-remove-favorite");
const colorPresetsContainer = document.querySelector(".color-presets");
let colorPresetButtons = Array.from(document.querySelectorAll(".color-preset"));
let lightingPresetButtons = Array.from(document.querySelectorAll(".lighting-preset"));
const resetViewButton = document.getElementById("viewer-reset-view");
const faceSelectionToggleButton = document.getElementById("viewer-toggle-face-selection");
const placeOnSelectedFaceButton = document.getElementById("viewer-place-on-selected-face");
const alignBoundingBoxAxesButton = document.getElementById("viewer-align-bbox-axes");
const boundingBoxToggleButton = document.getElementById("viewer-toggle-bounding-box");
const rotationToggleButton = document.getElementById("viewer-toggle-rotation");
const gridToggleButton = document.getElementById("viewer-toggle-grid");
const axesToggleButton = document.getElementById("viewer-toggle-axes");
const wireframeToggleButton = document.getElementById("viewer-toggle-wireframe");
const screenshotExportButton = document.getElementById("viewer-export-screenshot");
const modelInfoToggleButton = document.getElementById("viewer-toggle-model-info");
const localModelButton = document.getElementById("local-model-button");
const localModelInput = document.getElementById("local-model-input");
const viewerDropzone = document.getElementById("viewer-dropzone");
const modelInfoPanel = document.getElementById("viewer-model-info");
const modelInfoFileSize = document.getElementById("model-info-file-size");
const modelInfoBounds = document.getElementById("model-info-bounds");
const modelInfoTriangles = document.getElementById("model-info-triangles");

const DEFAULT_MODEL_COLOR = "#8aa2c8";
const DEFAULT_LIGHT_PROFILE = "studio";
const AUTO_ROTATE_SPEED = 1.6;
const SUPPORTED_LOCAL_EXTENSIONS = new Set(["stl", "glb"]);
const COLOR_FAVORITES_STORAGE_KEY = "scanlab.viewer.favorite_colors.v1";
const FACE_GROUND_TARGET_NORMAL = new THREE.Vector3(0, -1, 0);
const LIGHT_PROFILES = {
  studio: {
    label: "Studio",
    sceneBackground: 0xe8eff9,
    exposure: 1.0,
    hemi: { skyColor: 0xffffff, groundColor: 0x3f4d60, intensity: 1.0 },
    key: { color: 0xffffff, intensity: 1.15, position: [60, 120, 80] },
    fill: { color: 0xd6e3ff, intensity: 0.5, position: [-85, 60, -70] },
    rim: { color: 0xb8d1ff, intensity: 0.35, position: [0, 95, -115] },
  },
  technical: {
    label: "Technical",
    sceneBackground: 0xebf1f9,
    exposure: 1.05,
    hemi: { skyColor: 0xf8fbff, groundColor: 0x5f6d81, intensity: 0.9 },
    key: { color: 0xf7fbff, intensity: 1.2, position: [45, 140, 45] },
    fill: { color: 0xf2f7ff, intensity: 0.32, position: [-70, 75, -55] },
    rim: { color: 0xd5e1f3, intensity: 0.2, position: [0, 110, -95] },
  },
  "high-contrast": {
    label: "High Contrast",
    sceneBackground: 0xd4deed,
    exposure: 1.12,
    hemi: { skyColor: 0xf4f8ff, groundColor: 0x253446, intensity: 0.35 },
    key: { color: 0xffffff, intensity: 1.75, position: [110, 150, 55] },
    fill: { color: 0xd7e4ff, intensity: 0.12, position: [-120, 45, -60] },
    rim: { color: 0x9fbdf0, intensity: 0.9, position: [-15, 120, -130] },
  },
};

function setStatus(message, isError = false) {
  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.dataset.state = isError ? "error" : "ok";
}

function setActiveButton(activeButton) {
  modelButtons.forEach((button) => {
    button.classList.toggle("is-active", button === activeButton);
  });
}

function normalizeHexColor(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : null;
}

function getFileExtension(fileName) {
  if (typeof fileName !== "string") {
    return "";
  }

  const segments = fileName.toLowerCase().split(".");
  return segments.length > 1 ? segments.pop() : "";
}

function formatFileSize(bytesValue) {
  const bytes = Number(bytesValue);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function formatDimension(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "n/a";
  }

  return numericValue.toFixed(2);
}

function initViewer() {
  if (!container || !statusElement) {
    return;
  }

  setStatus("Viewer initializing...");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eff9);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    5000
  );
  camera.position.set(150, 100, 150);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
  controls.target.set(0, 0, 0);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3f4d60, 1.0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd6e3ff, 0.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xb8d1ff, 0.35);
  scene.add(rimLight);

  const grid = new THREE.GridHelper(220, 22, 0x8ea4c5, 0xc6d4ea);
  scene.add(grid);

  const axes = new THREE.AxesHelper(90);
  scene.add(axes);

  const stlLoader = new STLLoader();
  const gltfLoader = new GLTFLoader();
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let currentModelObject = null;
  let currentModelFileSizeBytes = null;
  let currentModelBoundingBoxHelper = null;
  let selectedFaceNormalWorld = null;
  let faceSelectionMarker = null;
  let isFaceSelectionEnabled = false;
  let currentModelColor = new THREE.Color(DEFAULT_MODEL_COLOR);
  let defaultViewState = null;
  let isAutoRotationEnabled = false;
  let isGridVisible = true;
  let isAxesVisible = true;
  let isWireframeEnabled = false;
  let isModelInfoVisible = true;
  let isBoundingBoxVisible = false;
  const builtInPresetColors = new Set(
    colorPresetButtons.map((button) => normalizeHexColor(button.dataset.color)).filter(Boolean)
  );
  let favoritePresetColors = [];

  function setResetViewEnabled(isEnabled) {
    if (!resetViewButton) {
      return;
    }

    resetViewButton.disabled = !isEnabled;
  }

  function storeCurrentViewAsDefault() {
    defaultViewState = {
      position: camera.position.clone(),
      near: camera.near,
      far: camera.far,
      target: controls.target.clone(),
    };
    setResetViewEnabled(true);
  }

  function resetToDefaultView() {
    if (!defaultViewState) {
      return;
    }

    camera.position.copy(defaultViewState.position);
    camera.near = defaultViewState.near;
    camera.far = defaultViewState.far;
    camera.updateProjectionMatrix();

    controls.target.copy(defaultViewState.target);
    controls.update();
  }

  function setAutoRotation(enabled) {
    const nextState = Boolean(enabled);
    isAutoRotationEnabled = nextState;
    controls.autoRotate = nextState;

    if (nextState) {
      if (defaultViewState) {
        controls.target.copy(defaultViewState.target);
      } else {
        controls.target.set(0, 0, 0);
      }
      controls.update();
    }

    if (!rotationToggleButton) {
      return;
    }

    rotationToggleButton.classList.toggle("is-toggled", nextState);
    rotationToggleButton.setAttribute("aria-pressed", String(nextState));
    rotationToggleButton.setAttribute(
      "aria-label",
      nextState ? "Disable auto-rotation" : "Enable auto-rotation"
    );
    rotationToggleButton.title = nextState ? "Disable auto-rotation" : "Enable auto-rotation";
  }

  function setGridVisibility(visible) {
    const nextState = Boolean(visible);
    isGridVisible = nextState;
    grid.visible = nextState;

    if (!gridToggleButton) {
      return;
    }

    gridToggleButton.classList.toggle("is-toggled", nextState);
    gridToggleButton.setAttribute("aria-pressed", String(nextState));
    gridToggleButton.setAttribute(
      "aria-label",
      nextState ? "Hide grid" : "Show grid"
    );
    gridToggleButton.title = nextState ? "Hide grid" : "Show grid";
  }

  function setAxesVisibility(visible) {
    const nextState = Boolean(visible);
    isAxesVisible = nextState;
    axes.visible = nextState;

    if (!axesToggleButton) {
      return;
    }

    axesToggleButton.classList.toggle("is-toggled", nextState);
    axesToggleButton.setAttribute("aria-pressed", String(nextState));
    axesToggleButton.setAttribute(
      "aria-label",
      nextState ? "Hide axes" : "Show axes"
    );
    axesToggleButton.title = nextState ? "Hide axes" : "Show axes";
  }

  function setWireframeMode(enabled) {
    const nextState = Boolean(enabled);
    isWireframeEnabled = nextState;

    if (currentModelObject) {
      currentModelObject.traverse((node) => {
        if (!node.isMesh) {
          return;
        }

        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
          if (!material || !("wireframe" in material)) {
            return;
          }

          material.wireframe = nextState;
          material.needsUpdate = true;
        });
      });
    }

    if (!wireframeToggleButton) {
      return;
    }

    wireframeToggleButton.classList.toggle("is-toggled", nextState);
    wireframeToggleButton.setAttribute("aria-pressed", String(nextState));
    wireframeToggleButton.setAttribute(
      "aria-label",
      nextState ? "Disable wireframe" : "Enable wireframe"
    );
    wireframeToggleButton.title = nextState ? "Show solid" : "Enable wireframe";
  }

  function setModelInfoVisibility(visible) {
    const nextState = Boolean(visible);
    isModelInfoVisible = nextState;

    if (modelInfoPanel) {
      modelInfoPanel.classList.toggle("is-hidden", !nextState);
    }

    if (!modelInfoToggleButton) {
      return;
    }

    modelInfoToggleButton.classList.toggle("is-toggled", nextState);
    modelInfoToggleButton.setAttribute("aria-pressed", String(nextState));
    modelInfoToggleButton.setAttribute(
      "aria-label",
      nextState ? "Hide model info" : "Show model info"
    );
    modelInfoToggleButton.title = nextState ? "Hide model info" : "Show model info";
  }

  function setBoundingBoxToggleEnabled(isEnabled) {
    if (!boundingBoxToggleButton) {
      return;
    }

    boundingBoxToggleButton.disabled = !isEnabled;
  }

  function removeBoundingBoxHelper() {
    if (!currentModelBoundingBoxHelper) {
      return;
    }

    scene.remove(currentModelBoundingBoxHelper);
    currentModelBoundingBoxHelper.geometry.dispose();
    currentModelBoundingBoxHelper.material.dispose();
    currentModelBoundingBoxHelper = null;
  }

  function syncBoundingBoxHelper() {
    if (!isBoundingBoxVisible || !currentModelObject) {
      removeBoundingBoxHelper();
      return;
    }

    if (!currentModelBoundingBoxHelper) {
      currentModelBoundingBoxHelper = new THREE.BoxHelper(currentModelObject, 0xff8a00);
      scene.add(currentModelBoundingBoxHelper);
    }

    currentModelBoundingBoxHelper.update();
  }

  function setBoundingBoxVisibility(visible) {
    const nextState = Boolean(visible);
    isBoundingBoxVisible = nextState;

    if (nextState) {
      syncBoundingBoxHelper();
    } else {
      removeBoundingBoxHelper();
    }

    if (!boundingBoxToggleButton) {
      return;
    }

    boundingBoxToggleButton.classList.toggle("is-toggled", nextState);
    boundingBoxToggleButton.setAttribute("aria-pressed", String(nextState));
    boundingBoxToggleButton.setAttribute(
      "aria-label",
      nextState ? "Hide bounding box" : "Show bounding box"
    );
    boundingBoxToggleButton.title = nextState ? "Hide bounding box" : "Show bounding box";
  }

  function setPlaceOnSelectedFaceEnabled(isEnabled) {
    if (!placeOnSelectedFaceButton) {
      return;
    }

    placeOnSelectedFaceButton.disabled = !isEnabled;
  }

  function setAlignBoundingBoxEnabled(isEnabled) {
    if (!alignBoundingBoxAxesButton) {
      return;
    }

    alignBoundingBoxAxesButton.disabled = !isEnabled;
  }

  function setFaceSelectionEnabled(enabled) {
    const nextState = Boolean(enabled);
    isFaceSelectionEnabled = nextState;

    if (!faceSelectionToggleButton) {
      return;
    }

    faceSelectionToggleButton.classList.toggle("is-toggled", nextState);
    faceSelectionToggleButton.setAttribute("aria-pressed", String(nextState));
    faceSelectionToggleButton.setAttribute(
      "aria-label",
      nextState ? "Disable face selection" : "Enable face selection"
    );
    faceSelectionToggleButton.title = nextState ? "Disable face selection" : "Enable face selection";
  }

  function removeFaceSelectionMarker() {
    if (!faceSelectionMarker) {
      return;
    }

    scene.remove(faceSelectionMarker);

    if (faceSelectionMarker.line) {
      faceSelectionMarker.line.geometry.dispose();
      faceSelectionMarker.line.material.dispose();
    }

    if (faceSelectionMarker.cone) {
      faceSelectionMarker.cone.geometry.dispose();
      faceSelectionMarker.cone.material.dispose();
    }

    faceSelectionMarker = null;
  }

  function clearSelectedFace() {
    selectedFaceNormalWorld = null;
    removeFaceSelectionMarker();
    setPlaceOnSelectedFaceEnabled(false);
  }

  function refreshFaceSelectionMarker(origin, normal) {
    removeFaceSelectionMarker();

    const direction = normal.clone().normalize();
    if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() <= 0) {
      return;
    }

    let markerLength = 22;
    if (currentModelObject) {
      const bounds = new THREE.Box3().setFromObject(currentModelObject);
      if (!bounds.isEmpty()) {
        const size = bounds.getSize(new THREE.Vector3());
        markerLength = Math.max(18, Math.min(Math.max(size.x, size.y, size.z) * 0.24, 72));
      }
    }

    faceSelectionMarker = new THREE.ArrowHelper(
      direction,
      origin.clone(),
      markerLength,
      0xff8a00,
      markerLength * 0.28,
      markerLength * 0.16
    );
    scene.add(faceSelectionMarker);
  }

  function selectFaceFromIntersection(intersection) {
    if (!intersection || !intersection.face || !intersection.object) {
      return false;
    }

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld);
    const worldNormal = intersection.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    if (!Number.isFinite(worldNormal.lengthSq()) || worldNormal.lengthSq() <= 0) {
      setStatus("Selected face has no valid normal.", true);
      return false;
    }

    selectedFaceNormalWorld = worldNormal;
    refreshFaceSelectionMarker(intersection.point.clone(), worldNormal);
    setPlaceOnSelectedFaceEnabled(true);
    setFaceSelectionEnabled(false);
    setStatus("Face selected. Click 'Place model on selected face'.");
    return true;
  }

  function pickFaceFromClientPosition(clientX, clientY) {
    if (!currentModelObject || !renderer || !renderer.domElement) {
      setStatus("Load a model before selecting a face.", true);
      return false;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      setStatus("Unable to read viewer size for face selection.", true);
      return false;
    }

    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNdc, camera);
    const intersections = raycaster.intersectObject(currentModelObject, true);
    const hit = intersections.find((entry) => {
      return entry.object && entry.object.isMesh && entry.face;
    });

    if (!hit) {
      setStatus("No model face selected. Click directly on the model surface.", true);
      return false;
    }

    return selectFaceFromIntersection(hit);
  }

  function centerModelOnGroundPlane() {
    if (!currentModelObject) {
      return false;
    }

    currentModelObject.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(currentModelObject);
    if (bounds.isEmpty()) {
      return false;
    }

    const boundsCenter = bounds.getCenter(new THREE.Vector3());
    currentModelObject.position.x -= boundsCenter.x;
    currentModelObject.position.z -= boundsCenter.z;
    currentModelObject.position.y -= bounds.min.y;
    currentModelObject.updateMatrixWorld(true);
    return true;
  }

  function refreshModelMetricsAndView() {
    if (!currentModelObject) {
      return;
    }

    const metrics = getModelMetrics(currentModelObject);
    updateModelInfoPanel({
      fileSizeBytes: currentModelFileSizeBytes,
      boundingBoxSize: metrics.boundingBoxSize,
      triangleCount: metrics.triangleCount,
    });

    const bounds = new THREE.Box3().setFromObject(currentModelObject);
    if (!bounds.isEmpty()) {
      controls.target.copy(bounds.getCenter(new THREE.Vector3()));
      controls.update();
    }

    storeCurrentViewAsDefault();
  }

  function collectHorizontalVertexSamples(maxSamples = 12000) {
    if (!currentModelObject) {
      return [];
    }

    const meshEntries = [];
    let totalVertexCount = 0;

    currentModelObject.updateMatrixWorld(true);
    currentModelObject.traverse((node) => {
      if (!node.isMesh || !node.geometry) {
        return;
      }

      const positionAttribute = node.geometry.getAttribute("position");
      if (!positionAttribute || positionAttribute.count <= 0) {
        return;
      }

      meshEntries.push({ mesh: node, positionAttribute });
      totalVertexCount += positionAttribute.count;
    });

    if (totalVertexCount <= 0) {
      return [];
    }

    const stride = Math.max(1, Math.ceil(totalVertexCount / maxSamples));
    const worldVertex = new THREE.Vector3();
    const samples = [];

    meshEntries.forEach(({ mesh, positionAttribute }) => {
      for (let index = 0; index < positionAttribute.count; index += stride) {
        worldVertex.fromBufferAttribute(positionAttribute, index);
        worldVertex.applyMatrix4(mesh.matrixWorld);
        samples.push({ x: worldVertex.x, z: worldVertex.z });
      }
    });

    return samples;
  }

  function computeFootprintAreaForYaw(samples, yawRadians) {
    if (!Array.isArray(samples) || samples.length === 0) {
      return Number.POSITIVE_INFINITY;
    }

    const cosYaw = Math.cos(yawRadians);
    const sinYaw = Math.sin(yawRadians);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    samples.forEach((sample) => {
      const rotatedX = cosYaw * sample.x - sinYaw * sample.z;
      const rotatedZ = sinYaw * sample.x + cosYaw * sample.z;
      minX = Math.min(minX, rotatedX);
      maxX = Math.max(maxX, rotatedX);
      minZ = Math.min(minZ, rotatedZ);
      maxZ = Math.max(maxZ, rotatedZ);
    });

    return Math.max(0, maxX - minX) * Math.max(0, maxZ - minZ);
  }

  function normalizeAngleRadians(angle) {
    let normalized = angle;
    while (normalized <= -Math.PI) {
      normalized += 2 * Math.PI;
    }
    while (normalized > Math.PI) {
      normalized -= 2 * Math.PI;
    }
    return normalized;
  }

  function getShortestEquivalentRightAngleRotation(angle) {
    const quarterTurn = Math.PI / 2;
    const snappedTurns = Math.round(angle / quarterTurn);
    return normalizeAngleRadians(angle - snappedTurns * quarterTurn);
  }

  function computeBestYawAlignmentAngle(samples) {
    if (!Array.isArray(samples) || samples.length < 3) {
      return 0;
    }

    let sumX = 0;
    let sumZ = 0;
    let sumXX = 0;
    let sumZZ = 0;
    let sumXZ = 0;

    samples.forEach((sample) => {
      sumX += sample.x;
      sumZ += sample.z;
      sumXX += sample.x * sample.x;
      sumZZ += sample.z * sample.z;
      sumXZ += sample.x * sample.z;
    });

    const sampleCount = samples.length;
    const meanX = sumX / sampleCount;
    const meanZ = sumZ / sampleCount;
    const covXX = sumXX / sampleCount - meanX * meanX;
    const covZZ = sumZZ / sampleCount - meanZ * meanZ;
    const covXZ = sumXZ / sampleCount - meanX * meanZ;

    const principalAngle = 0.5 * Math.atan2(2 * covXZ, covXX - covZZ);
    if (!Number.isFinite(principalAngle)) {
      return 0;
    }

    const currentArea = computeFootprintAreaForYaw(samples, 0);
    if (!Number.isFinite(currentArea) || currentArea <= 0) {
      return 0;
    }

    const areaTolerance = Math.max(1e-6, currentArea * 1e-5);
    const candidates = [
      getShortestEquivalentRightAngleRotation(-principalAngle),
      getShortestEquivalentRightAngleRotation(-principalAngle + Math.PI / 2),
    ];

    let bestAngle = 0;
    let bestArea = currentArea;
    candidates.forEach((candidate) => {
      const candidateArea = computeFootprintAreaForYaw(samples, candidate);
      if (!Number.isFinite(candidateArea)) {
        return;
      }

      if (candidateArea < bestArea - areaTolerance) {
        bestArea = candidateArea;
        bestAngle = candidate;
        return;
      }

      if (Math.abs(candidateArea - bestArea) <= areaTolerance && Math.abs(candidate) < Math.abs(bestAngle)) {
        bestAngle = candidate;
      }
    });

    const relativeImprovement = (currentArea - bestArea) / currentArea;
    if (relativeImprovement < 1e-4) {
      return 0;
    }

    return bestAngle;
  }

  function alignBoundingBoxToAxes() {
    if (!currentModelObject) {
      setStatus("Load a model before aligning the bounding box.", true);
      return;
    }

    const samples = collectHorizontalVertexSamples();
    if (samples.length < 3) {
      setStatus("Unable to align bounding box: not enough geometry data.", true);
      return;
    }

    const yawAngle = computeBestYawAlignmentAngle(samples);
    if (!Number.isFinite(yawAngle)) {
      setStatus("Bounding box alignment failed due to invalid rotation.", true);
      return;
    }

    const didRotate = Math.abs(yawAngle) > 1e-6;
    if (didRotate) {
      const worldYawAxis = new THREE.Vector3(0, 1, 0);
      const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(worldYawAxis, yawAngle);
      currentModelObject.quaternion.premultiply(yawQuaternion);
      currentModelObject.updateMatrixWorld(true);
    }

    if (!centerModelOnGroundPlane()) {
      setStatus("Unable to align bounding box: invalid model bounds.", true);
      return;
    }

    refreshModelMetricsAndView();
    clearSelectedFace();
    setFaceSelectionEnabled(false);
    setStatus(
      didRotate
        ? "Bounding box aligned to coordinate axes and model re-centered on ground."
        : "Bounding box was already aligned; model re-centered on ground."
    );
  }

  function placeModelOnSelectedFace() {
    if (!currentModelObject) {
      setStatus("Load a model before placing it on a selected face.", true);
      return;
    }

    if (!selectedFaceNormalWorld) {
      setStatus("Select a face first.", true);
      return;
    }

    const sourceNormal = selectedFaceNormalWorld.clone().normalize();
    if (!Number.isFinite(sourceNormal.lengthSq()) || sourceNormal.lengthSq() <= 0) {
      setStatus("Selected face normal is invalid.", true);
      return;
    }

    const alignmentQuaternion = new THREE.Quaternion().setFromUnitVectors(
      sourceNormal,
      FACE_GROUND_TARGET_NORMAL
    );
    currentModelObject.applyQuaternion(alignmentQuaternion);
    currentModelObject.updateMatrixWorld(true);

    if (!centerModelOnGroundPlane()) {
      setStatus("Unable to place model: invalid model bounds.", true);
      return;
    }

    refreshModelMetricsAndView();
    clearSelectedFace();
    setFaceSelectionEnabled(false);
    setStatus("Model placed on selected face, aligned, and centered on the ground plane.");
  }

  function buildScreenshotFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `scan-lab-viewer-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
  }

  function parsePixelValue(rawValue, fallback = 0) {
    const numericValue = Number.parseFloat(rawValue);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  function drawRoundedRectPath(context, x, y, width, height, radius) {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.moveTo(x + safeRadius, y);
    context.lineTo(x + width - safeRadius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    context.lineTo(x + width, y + height - safeRadius);
    context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    context.lineTo(x + safeRadius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    context.lineTo(x, y + safeRadius);
    context.quadraticCurveTo(x, y, x + safeRadius, y);
    context.closePath();
  }

  function drawModelInfoOverlayOnScreenshot(context, canvasWidth, canvasHeight) {
    if (!modelInfoPanel || !container) {
      return;
    }

    if (!isModelInfoVisible || modelInfoPanel.classList.contains("is-hidden")) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const panelRect = modelInfoPanel.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0 || panelRect.width <= 0 || panelRect.height <= 0) {
      return;
    }

    const scaleX = canvasWidth / containerRect.width;
    const scaleY = canvasHeight / containerRect.height;
    const scale = Math.min(scaleX, scaleY);

    const rawX = (panelRect.left - containerRect.left) * scaleX;
    const rawY = (panelRect.top - containerRect.top) * scaleY;
    const rawWidth = panelRect.width * scaleX;
    const rawHeight = panelRect.height * scaleY;
    const panelX = Math.max(0, Math.min(rawX, canvasWidth - 2));
    const panelY = Math.max(0, Math.min(rawY, canvasHeight - 2));
    const panelWidth = Math.max(2, Math.min(rawWidth, canvasWidth - panelX));
    const panelHeight = Math.max(2, Math.min(rawHeight, canvasHeight - panelY));

    const panelStyle = window.getComputedStyle(modelInfoPanel);
    const headingElement = modelInfoPanel.querySelector("h4");
    const headingStyle = headingElement ? window.getComputedStyle(headingElement) : null;
    const firstRow = modelInfoPanel.querySelector(".viewer-model-info-row");
    const firstTerm = firstRow ? firstRow.querySelector("dt") : null;
    const firstDetail = firstRow ? firstRow.querySelector("dd") : null;
    const termStyle = firstTerm ? window.getComputedStyle(firstTerm) : null;
    const detailStyle = firstDetail ? window.getComputedStyle(firstDetail) : null;
    const rowElements = Array.from(modelInfoPanel.querySelectorAll(".viewer-model-info-row"));

    const rows = rowElements
      .map((row) => {
        const term = row.querySelector("dt");
        const detail = row.querySelector("dd");
        return {
          termText: term ? term.textContent.trim() : "",
          detailText: detail ? detail.textContent.trim() : "",
        };
      })
      .filter((entry) => entry.termText || entry.detailText);

    const paddingLeft = parsePixelValue(panelStyle.paddingLeft, 10) * scaleX;
    const paddingRight = parsePixelValue(panelStyle.paddingRight, 10) * scaleX;
    const paddingTop = parsePixelValue(panelStyle.paddingTop, 8) * scaleY;
    const borderRadius = parsePixelValue(panelStyle.borderTopLeftRadius, 10) * scale;
    const borderWidth = Math.max(1, parsePixelValue(panelStyle.borderTopWidth, 1) * scale);

    const fontFamily = panelStyle.fontFamily || "Segoe UI, Tahoma, Geneva, Verdana, sans-serif";
    const titleText = headingElement ? headingElement.textContent.trim() : "Model info";
    const titleFontSize = (headingStyle ? parsePixelValue(headingStyle.fontSize, 14) : 14) * scaleY;
    const rowFontSize = (termStyle ? parsePixelValue(termStyle.fontSize, 12) : 12) * scaleY;
    const titleToRowsGap = 8 * scaleY;
    const rowStep = rowFontSize * 1.35;

    context.save();
    drawRoundedRectPath(context, panelX, panelY, panelWidth, panelHeight, borderRadius);
    context.fillStyle = panelStyle.backgroundColor || "rgba(255, 255, 255, 0.94)";
    context.fill();
    context.lineWidth = borderWidth;
    context.strokeStyle = panelStyle.borderColor || "#95aacc";
    context.stroke();

    const leftTextX = panelX + paddingLeft;
    const rightTextX = panelX + panelWidth - paddingRight;
    let cursorY = panelY + paddingTop + titleFontSize;

    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.font = `${headingStyle ? headingStyle.fontWeight : "600"} ${titleFontSize}px ${fontFamily}`;
    context.fillStyle = headingStyle ? headingStyle.color : "#213752";
    context.fillText(titleText, leftTextX, cursorY);

    cursorY += titleToRowsGap;
    rows.forEach((entry, index) => {
      cursorY += rowFontSize;
      if (index > 0) {
        cursorY += rowStep - rowFontSize;
      }

      context.textAlign = "left";
      context.font = `${termStyle ? termStyle.fontWeight : "600"} ${rowFontSize}px ${fontFamily}`;
      context.fillStyle = termStyle ? termStyle.color : "#314a66";
      context.fillText(entry.termText, leftTextX, cursorY);

      context.textAlign = "right";
      context.font = `${detailStyle ? detailStyle.fontWeight : "400"} ${rowFontSize}px ${fontFamily}`;
      context.fillStyle = detailStyle ? detailStyle.color : "#23384f";
      context.fillText(entry.detailText, rightTextX, cursorY);
    });

    context.restore();
  }

  function exportScreenshotAsPng() {
    if (!renderer || !renderer.domElement) {
      setStatus("Screenshot export is not available.", true);
      return;
    }

    try {
      renderer.render(scene, camera);
      const sourceCanvas = renderer.domElement;
      if (sourceCanvas.width <= 0 || sourceCanvas.height <= 0) {
        throw new Error("Renderer canvas has invalid size for screenshot export.");
      }

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = sourceCanvas.width;
      exportCanvas.height = sourceCanvas.height;
      const exportContext = exportCanvas.getContext("2d");
      if (!exportContext) {
        throw new Error("Unable to create 2D context for screenshot export.");
      }

      exportContext.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
      drawModelInfoOverlayOnScreenshot(exportContext, exportCanvas.width, exportCanvas.height);

      const imageDataUrl = exportCanvas.toDataURL("image/png");
      if (!imageDataUrl.startsWith("data:image/png")) {
        throw new Error("Screenshot export did not return a PNG image.");
      }

      const downloadLink = document.createElement("a");
      downloadLink.href = imageDataUrl;
      downloadLink.download = buildScreenshotFilename();
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      setStatus("Screenshot exported as PNG.");
    } catch (error) {
      console.error("Screenshot export failed.", error);
      setStatus("Screenshot export failed.", true);
    }
  }

  function countTrianglesInObject(object3d) {
    if (!object3d) {
      return 0;
    }

    let triangleCount = 0;
    object3d.traverse((node) => {
      if (!node.isMesh || !node.geometry) {
        return;
      }

      const geometry = node.geometry;
      if (geometry.index && Number.isFinite(geometry.index.count)) {
        triangleCount += geometry.index.count / 3;
        return;
      }

      const positionAttribute = geometry.getAttribute("position");
      if (positionAttribute && Number.isFinite(positionAttribute.count)) {
        triangleCount += positionAttribute.count / 3;
      }
    });

    return Math.round(triangleCount);
  }

  function getModelMetrics(object3d) {
    const bounds = new THREE.Box3().setFromObject(object3d);
    if (bounds.isEmpty()) {
      return { boundingBoxSize: null, triangleCount: 0 };
    }

    return {
      boundingBoxSize: bounds.getSize(new THREE.Vector3()),
      triangleCount: countTrianglesInObject(object3d),
    };
  }

  function updateModelInfoPanel({ fileSizeBytes = null, boundingBoxSize = null, triangleCount = null } = {}) {
    if (modelInfoFileSize) {
      modelInfoFileSize.textContent = formatFileSize(fileSizeBytes);
    }

    if (modelInfoBounds) {
      if (boundingBoxSize) {
        modelInfoBounds.textContent =
          `${formatDimension(boundingBoxSize.x)} x ${formatDimension(boundingBoxSize.y)} x ${formatDimension(
            boundingBoxSize.z
          )}`;
      } else {
        modelInfoBounds.textContent = "n/a";
      }
    }

    if (modelInfoTriangles) {
      const triangles = Number(triangleCount);
      modelInfoTriangles.textContent = Number.isFinite(triangles) ? triangles.toLocaleString("en-US") : "n/a";
    }
  }

  function setDropzoneDragActive(isActive) {
    if (!viewerDropzone) {
      return;
    }

    viewerDropzone.classList.toggle("is-dragover", Boolean(isActive));
  }

  function setActiveLightingPreset(profileKey) {
    lightingPresetButtons.forEach((button) => {
      const isActive = button.dataset.lightProfile === profileKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function applyLightingProfile(profileKey, { quiet = false } = {}) {
    const profile = LIGHT_PROFILES[profileKey];
    if (!profile) {
      setStatus(`Unknown lighting profile: ${profileKey}`, true);
      return;
    }

    scene.background.setHex(profile.sceneBackground);
    renderer.toneMappingExposure = profile.exposure;

    hemiLight.color.setHex(profile.hemi.skyColor);
    hemiLight.groundColor.setHex(profile.hemi.groundColor);
    hemiLight.intensity = profile.hemi.intensity;

    keyLight.color.setHex(profile.key.color);
    keyLight.intensity = profile.key.intensity;
    keyLight.position.set(...profile.key.position);

    fillLight.color.setHex(profile.fill.color);
    fillLight.intensity = profile.fill.intensity;
    fillLight.position.set(...profile.fill.position);

    rimLight.color.setHex(profile.rim.color);
    rimLight.intensity = profile.rim.intensity;
    rimLight.position.set(...profile.rim.position);

    setActiveLightingPreset(profileKey);

    if (!quiet) {
      setStatus(`Lighting profile set to ${profile.label}.`);
    }
  }

  function setActivePreset(colorValue) {
    const normalizedColor = normalizeHexColor(colorValue);
    colorPresetButtons.forEach((button) => {
      const presetColor = normalizeHexColor(button.dataset.color);
      button.classList.toggle("is-active", presetColor === normalizedColor);
    });
  }

  function refreshPresetButtons() {
    if (!colorPresetsContainer) {
      colorPresetButtons = [];
      return;
    }

    colorPresetButtons = Array.from(colorPresetsContainer.querySelectorAll(".color-preset"));
  }

  function bindPresetButton(button) {
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      applyModelColor(button.dataset.color);
    });
  }

  function readFavoritePresetsFromStorage() {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(COLOR_FAVORITES_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const unique = new Set();
      parsed.forEach((entry) => {
        const normalizedColor = normalizeHexColor(entry);
        if (!normalizedColor || builtInPresetColors.has(normalizedColor)) {
          return;
        }
        unique.add(normalizedColor);
      });

      return Array.from(unique);
    } catch (error) {
      console.warn("Unable to read color favorites from localStorage.", error);
      return [];
    }
  }

  function persistFavoritePresets() {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(COLOR_FAVORITES_STORAGE_KEY, JSON.stringify(favoritePresetColors));
    } catch (error) {
      console.warn("Unable to persist color favorites to localStorage.", error);
    }
  }

  function hasPresetColor(colorValue) {
    const normalizedColor = normalizeHexColor(colorValue);
    if (!normalizedColor) {
      return false;
    }

    return colorPresetButtons.some((button) => {
      return normalizeHexColor(button.dataset.color) === normalizedColor;
    });
  }

  function isFavoritePresetColor(colorValue) {
    const normalizedColor = normalizeHexColor(colorValue);
    if (!normalizedColor) {
      return false;
    }

    return favoritePresetColors.includes(normalizedColor);
  }

  function createFavoritePresetButton(colorValue) {
    const normalizedColor = normalizeHexColor(colorValue);
    if (!normalizedColor) {
      return null;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-preset";
    button.dataset.color = normalizedColor;
    button.dataset.favorite = "true";
    button.style.setProperty("--preset-color", normalizedColor);
    button.setAttribute(
      "aria-label",
      `Favorite ${normalizedColor} (right-click to remove)`
    );
    button.title = `Favorite ${normalizedColor} (right-click to remove)`;

    return button;
  }

  function removeFavoritePreset(colorValue, { quiet = false } = {}) {
    const normalizedColor = normalizeHexColor(colorValue);
    if (!normalizedColor || !colorPresetsContainer) {
      return false;
    }

    if (!isFavoritePresetColor(normalizedColor)) {
      if (!quiet) {
        if (builtInPresetColors.has(normalizedColor)) {
          setStatus(`Color ${normalizedColor} is a built-in preset and cannot be removed.`, true);
        } else {
          setStatus(`Color ${normalizedColor} is not in favorite presets.`, true);
        }
      }
      return false;
    }

    const buttonToRemove = colorPresetButtons.find((button) => {
      return (
        button.dataset.favorite === "true" &&
        normalizeHexColor(button.dataset.color) === normalizedColor
      );
    });
    if (buttonToRemove) {
      buttonToRemove.remove();
    }

    favoritePresetColors = favoritePresetColors.filter((color) => color !== normalizedColor);
    persistFavoritePresets();
    refreshPresetButtons();
    setActivePreset(`#${currentModelColor.getHexString()}`);

    if (!quiet) {
      setStatus(`Removed ${normalizedColor} from color presets.`);
    }

    return true;
  }

  function addFavoritePreset(colorValue, { quiet = false, persist = true } = {}) {
    const normalizedColor = normalizeHexColor(colorValue);
    if (!normalizedColor || !colorPresetsContainer) {
      return false;
    }

    if (hasPresetColor(normalizedColor)) {
      setActivePreset(normalizedColor);
      if (!quiet) {
        setStatus(`Color ${normalizedColor} already exists in presets.`);
      }
      return false;
    }

    const button = createFavoritePresetButton(normalizedColor);
    if (!button) {
      return false;
    }

    bindPresetButton(button);
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      removeFavoritePreset(normalizedColor);
    });

    colorPresetsContainer.appendChild(button);
    favoritePresetColors.push(normalizedColor);
    if (persist) {
      persistFavoritePresets();
    }

    refreshPresetButtons();
    setActivePreset(normalizedColor);

    if (!quiet) {
      setStatus(`Added ${normalizedColor} to color presets.`);
    }

    return true;
  }

  function loadFavoritePresetsFromStorage() {
    const storedFavorites = readFavoritePresetsFromStorage();
    favoritePresetColors = [];

    storedFavorites.forEach((colorValue) => {
      addFavoritePreset(colorValue, { quiet: true, persist: false });
    });

    persistFavoritePresets();
  }

  function applyModelColor(colorValue, { syncInput = true } = {}) {
    const normalizedColor = normalizeHexColor(colorValue);
    if (!normalizedColor) {
      return;
    }

    currentModelColor = new THREE.Color(normalizedColor);

    if (currentModelObject) {
      currentModelObject.traverse((node) => {
        if (!node.isMesh) {
          return;
        }

        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
          if (!material || !("color" in material) || !material.color) {
            return;
          }

          material.color.set(normalizedColor);
          material.needsUpdate = true;
        });
      });
    }

    if (syncInput && modelColorInput) {
      modelColorInput.value = normalizedColor;
    }

    setActivePreset(normalizedColor);
  }

  function disposeMaterial(material, disposedTextures) {
    if (!material) {
      return;
    }

    Object.values(material).forEach((value) => {
      if (!value || !value.isTexture || disposedTextures.has(value)) {
        return;
      }

      value.dispose();
      disposedTextures.add(value);
    });

    material.dispose();
  }

  function disposeCurrentModel() {
    clearSelectedFace();
    setFaceSelectionEnabled(false);
    setAlignBoundingBoxEnabled(false);
    setBoundingBoxToggleEnabled(false);
    removeBoundingBoxHelper();
    currentModelFileSizeBytes = null;

    if (!currentModelObject) {
      return;
    }

    scene.remove(currentModelObject);

    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    const disposedTextures = new Set();

    currentModelObject.traverse((node) => {
      if (!node.isMesh) {
        return;
      }

      if (node.geometry && !disposedGeometries.has(node.geometry)) {
        node.geometry.dispose();
        disposedGeometries.add(node.geometry);
      }

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material || disposedMaterials.has(material)) {
          return;
        }

        disposeMaterial(material, disposedTextures);
        disposedMaterials.add(material);
      });
    });

    currentModelObject = null;
  }

  function frameObject(object3d) {
    const bounds = new THREE.Box3().setFromObject(object3d);
    if (bounds.isEmpty()) {
      return;
    }

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    object3d.position.sub(center);

    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const cameraDistance = maxSize * 1.8;

    camera.position.set(cameraDistance, cameraDistance * 0.7, cameraDistance);
    camera.near = Math.max(maxSize / 2000, 0.05);
    camera.far = Math.max(maxSize * 30, 1000);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();
    storeCurrentViewAsDefault();
  }

  function createStlMesh(geometry) {
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: currentModelColor.getHex(),
      metalness: 0.1,
      roughness: 0.7,
    });
    return new THREE.Mesh(geometry, material);
  }

  function finalizeLoadedModel(object3d, modelName, { sourceButton = null, fileSizeBytes = null } = {}) {
    disposeCurrentModel();
    currentModelObject = object3d;
    currentModelFileSizeBytes = fileSizeBytes;
    scene.add(currentModelObject);
    setAlignBoundingBoxEnabled(true);
    setBoundingBoxToggleEnabled(true);
    syncBoundingBoxHelper();

    const metrics = getModelMetrics(currentModelObject);
    frameObject(currentModelObject);
    applyModelColor(`#${currentModelColor.getHexString()}`);
    setWireframeMode(isWireframeEnabled);
    updateModelInfoPanel({
      fileSizeBytes: currentModelFileSizeBytes,
      boundingBoxSize: metrics.boundingBoxSize,
      triangleCount: metrics.triangleCount,
    });
    setActiveButton(sourceButton);
    setStatus(`Loaded ${modelName}.`);
  }

  function loadModel(modelUrl, modelName, sourceButton, fileSizeBytes = null) {
    if (!modelUrl) {
      setStatus("No model URL provided.", true);
      return;
    }

    setStatus(`Loading ${modelName} ...`);

    stlLoader.load(
      modelUrl,
      (geometry) => {
        const mesh = createStlMesh(geometry);
        finalizeLoadedModel(mesh, modelName, { sourceButton, fileSizeBytes });
      },
      undefined,
      () => {
        setStatus(`Failed to load ${modelName}.`, true);
      }
    );
  }

  function parseGlb(arrayBuffer) {
    return new Promise((resolve, reject) => {
      gltfLoader.parse(arrayBuffer, "", resolve, reject);
    });
  }

  async function loadLocalFile(file) {
    if (!file) {
      return;
    }

    const extension = getFileExtension(file.name);
    if (!SUPPORTED_LOCAL_EXTENSIONS.has(extension)) {
      setStatus("Unsupported local file. Use .stl or .glb.", true);
      return;
    }

    setStatus(`Loading local file ${file.name} ...`);
    setActiveButton(null);

    try {
      const buffer = await file.arrayBuffer();

      if (extension === "stl") {
        const geometry = stlLoader.parse(buffer);
        const mesh = createStlMesh(geometry);
        finalizeLoadedModel(mesh, file.name, { fileSizeBytes: file.size });
        return;
      }

      const gltf = await parseGlb(buffer);
      const gltfRoot = gltf.scene || (Array.isArray(gltf.scenes) ? gltf.scenes[0] : null);

      if (!gltfRoot) {
        throw new Error("GLB does not contain a scene.");
      }

      finalizeLoadedModel(gltfRoot, file.name, { fileSizeBytes: file.size });
    } catch (error) {
      console.error("Local model load failed.", error);
      setStatus(`Failed to load ${file.name}.`, true);
    }
  }

  function handleLocalFileSelection(fileList) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const file = fileList[0];
    void loadLocalFile(file);
  }

  function preventDefaultDrag(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function render() {
    if (isBoundingBoxVisible) {
      syncBoundingBoxHelper();
    }

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener("resize", handleResize);

  renderer.domElement.addEventListener("click", (event) => {
    if (!isFaceSelectionEnabled) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    pickFaceFromClientPosition(event.clientX, event.clientY);
  });

  modelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const modelSizeBytes = Number.parseInt(button.dataset.modelSizeBytes || "", 10);
      loadModel(
        button.dataset.modelUrl,
        button.dataset.modelName,
        button,
        Number.isFinite(modelSizeBytes) ? modelSizeBytes : null
      );
    });
  });

  if (localModelButton && localModelInput) {
    localModelButton.addEventListener("click", () => {
      localModelInput.click();
    });
  }

  if (localModelInput) {
    localModelInput.addEventListener("change", () => {
      handleLocalFileSelection(localModelInput.files);
      localModelInput.value = "";
    });
  }

  if (viewerDropzone && localModelInput) {
    viewerDropzone.addEventListener("click", () => {
      localModelInput.click();
    });

    viewerDropzone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      localModelInput.click();
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      viewerDropzone.addEventListener(eventName, (event) => {
        preventDefaultDrag(event);
        setDropzoneDragActive(true);
      });
    });

    ["dragleave", "dragend"].forEach((eventName) => {
      viewerDropzone.addEventListener(eventName, (event) => {
        preventDefaultDrag(event);
        setDropzoneDragActive(false);
      });
    });

    viewerDropzone.addEventListener("drop", (event) => {
      preventDefaultDrag(event);
      setDropzoneDragActive(false);
      handleLocalFileSelection(event.dataTransfer ? event.dataTransfer.files : null);
    });
  }

  if (container) {
    ["dragenter", "dragover", "drop"].forEach((eventName) => {
      container.addEventListener(eventName, preventDefaultDrag);
    });
  }

  if (modelColorInput) {
    modelColorInput.addEventListener("input", () => {
      applyModelColor(modelColorInput.value, { syncInput: false });
    });
  }

  colorPresetButtons.forEach((button) => {
    bindPresetButton(button);
  });
  lightingPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLightingProfile(button.dataset.lightProfile);
    });
  });
  loadFavoritePresetsFromStorage();

  if (modelColorResetButton) {
    modelColorResetButton.addEventListener("click", () => {
      applyModelColor(DEFAULT_MODEL_COLOR);
    });
  }

  if (modelColorAddFavoriteButton) {
    modelColorAddFavoriteButton.addEventListener("click", () => {
      const sourceColor = modelColorInput ? modelColorInput.value : `#${currentModelColor.getHexString()}`;
      addFavoritePreset(sourceColor);
    });
  }

  if (modelColorRemoveFavoriteButton) {
    modelColorRemoveFavoriteButton.addEventListener("click", () => {
      const sourceColor = modelColorInput ? modelColorInput.value : `#${currentModelColor.getHexString()}`;
      removeFavoritePreset(sourceColor);
    });
  }

  if (faceSelectionToggleButton) {
    faceSelectionToggleButton.addEventListener("click", () => {
      if (!currentModelObject) {
        setStatus("Load a model before selecting a face.", true);
        return;
      }

      const nextState = !isFaceSelectionEnabled;
      setFaceSelectionEnabled(nextState);

      if (nextState) {
        setStatus("Face selection enabled. Click a model surface.");
      } else {
        setStatus("Face selection disabled.");
      }
    });
  }

  if (placeOnSelectedFaceButton) {
    placeOnSelectedFaceButton.addEventListener("click", () => {
      placeModelOnSelectedFace();
    });
  }

  if (alignBoundingBoxAxesButton) {
    alignBoundingBoxAxesButton.addEventListener("click", () => {
      alignBoundingBoxToAxes();
    });
  }

  if (boundingBoxToggleButton) {
    boundingBoxToggleButton.addEventListener("click", () => {
      if (!currentModelObject) {
        setStatus("Load a model before toggling the bounding box.", true);
        return;
      }

      setBoundingBoxVisibility(!isBoundingBoxVisible);
    });
  }

  if (resetViewButton) {
    resetViewButton.addEventListener("click", () => {
      resetToDefaultView();
    });
  }

  if (rotationToggleButton) {
    rotationToggleButton.addEventListener("click", () => {
      setAutoRotation(!isAutoRotationEnabled);
    });
  }

  if (gridToggleButton) {
    gridToggleButton.addEventListener("click", () => {
      setGridVisibility(!isGridVisible);
    });
  }

  if (axesToggleButton) {
    axesToggleButton.addEventListener("click", () => {
      setAxesVisibility(!isAxesVisible);
    });
  }

  if (wireframeToggleButton) {
    wireframeToggleButton.addEventListener("click", () => {
      setWireframeMode(!isWireframeEnabled);
    });
  }

  if (screenshotExportButton) {
    screenshotExportButton.addEventListener("click", () => {
      exportScreenshotAsPng();
    });
  }

  if (modelInfoToggleButton) {
    modelInfoToggleButton.addEventListener("click", () => {
      setModelInfoVisibility(!isModelInfoVisible);
    });
  }

  setResetViewEnabled(false);
  setAutoRotation(false);
  setGridVisibility(true);
  setAxesVisibility(true);
  setWireframeMode(false);
  setModelInfoVisibility(true);
  setAlignBoundingBoxEnabled(false);
  setBoundingBoxToggleEnabled(false);
  setBoundingBoxVisibility(false);
  setFaceSelectionEnabled(false);
  clearSelectedFace();
  updateModelInfoPanel();
  applyLightingProfile(DEFAULT_LIGHT_PROFILE, { quiet: true });
  applyModelColor(DEFAULT_MODEL_COLOR);

  if (modelButtons.length > 0) {
    const firstButton = modelButtons[0];
    const firstModelSizeBytes = Number.parseInt(firstButton.dataset.modelSizeBytes || "", 10);
    loadModel(
      firstButton.dataset.modelUrl,
      firstButton.dataset.modelName,
      firstButton,
      Number.isFinite(firstModelSizeBytes) ? firstModelSizeBytes : null
    );
  } else {
    setStatus("No sample model files found in sample_models.", true);
  }

  render();
}

try {
  initViewer();
} catch (error) {
  console.error("Viewer initialization failed.", error);
  setStatus("Viewer initialization failed. Check browser console for details.", true);
}
