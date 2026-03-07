import * as THREE from "../vendor/three/build/three.module.js";
import { OrbitControls } from "../vendor/three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "../vendor/three/examples/jsm/loaders/STLLoader.js";

const container = document.getElementById("viewer-container");
const statusElement = document.getElementById("viewer-status");
const modelButtons = Array.from(document.querySelectorAll(".model-button"));
const modelColorInput = document.getElementById("model-color-input");
const modelColorResetButton = document.getElementById("model-color-reset");
const colorPresetButtons = Array.from(document.querySelectorAll(".color-preset"));
const resetViewButton = document.getElementById("viewer-reset-view");
const rotationToggleButton = document.getElementById("viewer-toggle-rotation");
const DEFAULT_MODEL_COLOR = "#8aa2c8";
const AUTO_ROTATE_SPEED = 1.6;

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

  const loader = new STLLoader();
  let currentMesh = null;
  let currentModelColor = new THREE.Color(DEFAULT_MODEL_COLOR);
  let defaultViewState = null;
  let isAutoRotationEnabled = false;

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

  function setActivePreset(colorValue) {
    const normalizedColor = normalizeHexColor(colorValue);
    colorPresetButtons.forEach((button) => {
      const presetColor = normalizeHexColor(button.dataset.color);
      button.classList.toggle("is-active", presetColor === normalizedColor);
    });
  }

  function applyModelColor(colorValue, { syncInput = true } = {}) {
    const normalizedColor = normalizeHexColor(colorValue);
    if (!normalizedColor) {
      return;
    }

    currentModelColor = new THREE.Color(normalizedColor);

    if (currentMesh && currentMesh.material && "color" in currentMesh.material) {
      currentMesh.material.color.set(normalizedColor);
      currentMesh.material.needsUpdate = true;
    }

    if (syncInput && modelColorInput) {
      modelColorInput.value = normalizedColor;
    }

    setActivePreset(normalizedColor);
  }

  function disposeCurrentMesh() {
    if (!currentMesh) {
      return;
    }

    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
    currentMesh = null;
  }

  function frameObject(mesh) {
    const bounds = new THREE.Box3().setFromObject(mesh);
    if (bounds.isEmpty()) {
      return;
    }

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    mesh.position.sub(center);

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

  function loadModel(modelUrl, modelName, sourceButton) {
    if (!modelUrl) {
      setStatus("No model URL provided.", true);
      return;
    }

    setStatus(`Loading ${modelName} ...`);

    loader.load(
      modelUrl,
      (geometry) => {
        disposeCurrentMesh();
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: currentModelColor.getHex(),
          metalness: 0.1,
          roughness: 0.7,
        });

        currentMesh = new THREE.Mesh(geometry, material);
        scene.add(currentMesh);

        frameObject(currentMesh);
        setActiveButton(sourceButton);
        setStatus(`Loaded ${modelName}.`);
      },
      undefined,
      () => {
        setStatus(`Failed to load ${modelName}.`, true);
      }
    );
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
      loadModel(button.dataset.modelUrl, button.dataset.modelName, button);
    });
  });
  if (modelColorInput) {
    modelColorInput.addEventListener("input", () => {
      applyModelColor(modelColorInput.value, { syncInput: false });
    });
  }

  colorPresetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyModelColor(button.dataset.color);
    });
  });

  if (modelColorResetButton) {
    modelColorResetButton.addEventListener("click", () => {
      applyModelColor(DEFAULT_MODEL_COLOR);
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

  setResetViewEnabled(false);
  setAutoRotation(false);
  applyModelColor(DEFAULT_MODEL_COLOR);

  if (modelButtons.length > 0) {
    const firstButton = modelButtons[0];
    loadModel(firstButton.dataset.modelUrl, firstButton.dataset.modelName, firstButton);
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
