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
const resetViewButton = document.getElementById("viewer-reset-view");
const rotationToggleButton = document.getElementById("viewer-toggle-rotation");
const gridToggleButton = document.getElementById("viewer-toggle-grid");
const axesToggleButton = document.getElementById("viewer-toggle-axes");
const wireframeToggleButton = document.getElementById("viewer-toggle-wireframe");
const modelInfoToggleButton = document.getElementById("viewer-toggle-model-info");
const localModelButton = document.getElementById("local-model-button");
const localModelInput = document.getElementById("local-model-input");
const viewerDropzone = document.getElementById("viewer-dropzone");
const modelInfoPanel = document.getElementById("viewer-model-info");
const modelInfoFileSize = document.getElementById("model-info-file-size");
const modelInfoBounds = document.getElementById("model-info-bounds");
const modelInfoTriangles = document.getElementById("model-info-triangles");

const DEFAULT_MODEL_COLOR = "#8aa2c8";
const AUTO_ROTATE_SPEED = 1.6;
const SUPPORTED_LOCAL_EXTENSIONS = new Set(["stl", "glb"]);
const COLOR_FAVORITES_STORAGE_KEY = "scanlab.viewer.favorite_colors.v1";

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

  const renderer = new THREE.WebGLRenderer({ antialias: true });
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

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(60, 120, 80);
  scene.add(dirLight);

  const grid = new THREE.GridHelper(220, 22, 0x8ea4c5, 0xc6d4ea);
  scene.add(grid);

  const axes = new THREE.AxesHelper(90);
  scene.add(axes);

  const stlLoader = new STLLoader();
  const gltfLoader = new GLTFLoader();
  let currentModelObject = null;
  let currentModelColor = new THREE.Color(DEFAULT_MODEL_COLOR);
  let defaultViewState = null;
  let isAutoRotationEnabled = false;
  let isGridVisible = true;
  let isAxesVisible = true;
  let isWireframeEnabled = false;
  let isModelInfoVisible = true;
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
      nextState ? "Automatische Rotation ausschalten" : "Automatische Rotation einschalten"
    );
    rotationToggleButton.title = nextState ? "Rotation aus" : "Rotation ein";
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
      nextState ? "Gitter ausblenden" : "Gitter einblenden"
    );
    gridToggleButton.title = nextState ? "Gitter aus" : "Gitter ein";
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
      nextState ? "Achsen-Helfer ausblenden" : "Achsen-Helfer einblenden"
    );
    axesToggleButton.title = nextState ? "Achsen aus" : "Achsen ein";
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
      nextState ? "Wireframe ausschalten" : "Wireframe einschalten"
    );
    wireframeToggleButton.title = nextState ? "Solid" : "Wireframe";
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
      nextState ? "Modellinfos ausblenden" : "Modellinfos einblenden"
    );
    modelInfoToggleButton.title = nextState ? "Infos aus" : "Infos ein";
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
    scene.add(currentModelObject);

    const metrics = getModelMetrics(currentModelObject);
    frameObject(currentModelObject);
    applyModelColor(`#${currentModelColor.getHexString()}`);
    setWireframeMode(isWireframeEnabled);
    updateModelInfoPanel({
      fileSizeBytes,
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
  updateModelInfoPanel();
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
