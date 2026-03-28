import * as THREE from "../vendor/three/build/three.module.js";
import { strFromU8, unzipSync } from "../vendor/three/examples/jsm/libs/fflate.module.js";
import { toCreasedNormals } from "../vendor/three/examples/jsm/utils/BufferGeometryUtils.js";

const SURFACE_MATERIAL_OPTIONS = {
  metalness: 0.1,
  roughness: 0.7,
};

const PLY_SCALAR_READERS = {
  char: { size: 1, read: (view, offset) => view.getInt8(offset) },
  int8: { size: 1, read: (view, offset) => view.getInt8(offset) },
  uchar: { size: 1, read: (view, offset) => view.getUint8(offset) },
  uint8: { size: 1, read: (view, offset) => view.getUint8(offset) },
  short: { size: 2, read: (view, offset) => view.getInt16(offset, true) },
  int16: { size: 2, read: (view, offset) => view.getInt16(offset, true) },
  ushort: { size: 2, read: (view, offset) => view.getUint16(offset, true) },
  uint16: { size: 2, read: (view, offset) => view.getUint16(offset, true) },
  int: { size: 4, read: (view, offset) => view.getInt32(offset, true) },
  int32: { size: 4, read: (view, offset) => view.getInt32(offset, true) },
  uint: { size: 4, read: (view, offset) => view.getUint32(offset, true) },
  uint32: { size: 4, read: (view, offset) => view.getUint32(offset, true) },
  float: { size: 4, read: (view, offset) => view.getFloat32(offset, true) },
  float32: { size: 4, read: (view, offset) => view.getFloat32(offset, true) },
  double: { size: 8, read: (view, offset) => view.getFloat64(offset, true) },
  float64: { size: 8, read: (view, offset) => view.getFloat64(offset, true) },
};

function clampColorComponent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  if (numericValue > 1) {
    return Math.min(1, Math.max(0, numericValue / 255));
  }

  return Math.min(1, Math.max(0, numericValue));
}

function createSurfaceMaterial(colorHex, useVertexColors = false) {
  return new THREE.MeshStandardMaterial({
    color: useVertexColors ? 0xffffff : colorHex,
    vertexColors: useVertexColors,
    ...SURFACE_MATERIAL_OPTIONS,
  });
}

function finalizeSurfaceGeometry(geometry) {
  const positionAttribute = geometry.getAttribute("position");
  if (!positionAttribute || positionAttribute.count <= 0) {
    throw new Error("Model geometry does not contain any vertices.");
  }

  if (!geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  } else {
    geometry.normalizeNormals();
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function finalizeCreasedSurfaceGeometry(geometry, creaseAngle = Math.PI / 3) {
  const positionAttribute = geometry.getAttribute("position");
  if (!positionAttribute || positionAttribute.count <= 0) {
    throw new Error("Model geometry does not contain any vertices.");
  }

  const creasedGeometry = toCreasedNormals(geometry, creaseAngle);
  if (creasedGeometry !== geometry) {
    geometry.dispose();
  }

  creasedGeometry.computeBoundingBox();
  creasedGeometry.computeBoundingSphere();
  return creasedGeometry;
}

function resolveObjIndex(rawIndexText, itemCount) {
  const rawIndex = Number.parseInt(rawIndexText, 10);
  if (!Number.isFinite(rawIndex) || rawIndex === 0) {
    return -1;
  }

  const resolvedIndex = rawIndex > 0 ? rawIndex - 1 : itemCount + rawIndex;
  return resolvedIndex >= 0 && resolvedIndex < itemCount ? resolvedIndex : -1;
}

function parseObjFaceToken(token, vertexCount, normalCount) {
  const segments = token.split("/");
  const vertexIndex = resolveObjIndex(segments[0], vertexCount);
  const normalSegment = segments.length > 2 ? segments[2] : "";
  const normalIndex = normalSegment ? resolveObjIndex(normalSegment, normalCount) : -1;

  return { vertexIndex, normalIndex };
}

export function createObjMeshFromText(objText, colorHex) {
  if (typeof objText !== "string" || objText.trim() === "") {
    throw new Error("OBJ data is empty.");
  }

  const sourceVertices = [];
  const sourceNormals = [];
  const positions = [];
  const normals = [];
  let hasCompleteNormals = true;

  objText.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const parts = trimmedLine.split(/\s+/);
    const keyword = parts.shift();

    switch (keyword) {
      case "v": {
        if (parts.length < 3) {
          return;
        }

        sourceVertices.push(parts.slice(0, 3).map((value) => Number.parseFloat(value)));
        break;
      }
      case "vn": {
        if (parts.length < 3) {
          return;
        }

        sourceNormals.push(parts.slice(0, 3).map((value) => Number.parseFloat(value)));
        break;
      }
      case "f": {
        if (parts.length < 3) {
          return;
        }

        const faceVertices = parts.map((token) => parseObjFaceToken(token, sourceVertices.length, sourceNormals.length));
        for (let index = 1; index < faceVertices.length - 1; index += 1) {
          const triangle = [faceVertices[0], faceVertices[index], faceVertices[index + 1]];
          triangle.forEach(({ vertexIndex, normalIndex }) => {
            if (vertexIndex < 0 || !sourceVertices[vertexIndex]) {
              throw new Error("OBJ face references an invalid vertex index.");
            }

            positions.push(...sourceVertices[vertexIndex]);

            if (hasCompleteNormals) {
              if (normalIndex >= 0 && sourceNormals[normalIndex]) {
                normals.push(...sourceNormals[normalIndex]);
              } else {
                hasCompleteNormals = false;
              }
            }
          });
        }
        break;
      }
      default:
        break;
    }
  });

  if (positions.length === 0) {
    throw new Error("OBJ does not contain any faces.");
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (hasCompleteNormals && normals.length === positions.length) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  }

  finalizeSurfaceGeometry(geometry);
  return new THREE.Mesh(geometry, createSurfaceMaterial(colorHex));
}

function findPlyHeaderEnd(bytes) {
  const marker = [101, 110, 100, 95, 104, 101, 97, 100, 101, 114];

  for (let offset = 0; offset <= bytes.length - marker.length; offset += 1) {
    let matchesMarker = true;
    for (let markerIndex = 0; markerIndex < marker.length; markerIndex += 1) {
      if (bytes[offset + markerIndex] !== marker[markerIndex]) {
        matchesMarker = false;
        break;
      }
    }

    if (!matchesMarker) {
      continue;
    }

    const lineEndOffset = offset + marker.length;
    if (bytes[lineEndOffset] === 13 && bytes[lineEndOffset + 1] === 10) {
      return lineEndOffset + 2;
    }
    if (bytes[lineEndOffset] === 10 || bytes[lineEndOffset] === 13) {
      return lineEndOffset + 1;
    }
  }

  return -1;
}

function parsePlyHeader(headerText) {
  const lines = headerText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines[0] !== "ply") {
    throw new Error("PLY header is invalid.");
  }

  let format = "";
  const elements = [];
  let currentElement = null;

  lines.forEach((line) => {
    const parts = line.split(/\s+/);
    const keyword = parts[0];

    if (keyword === "format") {
      format = parts[1] || "";
      return;
    }

    if (keyword === "comment" || keyword === "obj_info" || keyword === "end_header") {
      return;
    }

    if (keyword === "element") {
      currentElement = {
        name: parts[1] || "",
        count: Number.parseInt(parts[2], 10) || 0,
        properties: [],
      };
      elements.push(currentElement);
      return;
    }

    if (keyword === "property" && currentElement) {
      if (parts[1] === "list") {
        currentElement.properties.push({
          kind: "list",
          countType: parts[2],
          itemType: parts[3],
          name: parts[4],
        });
      } else {
        currentElement.properties.push({
          kind: "scalar",
          type: parts[1],
          name: parts[2],
        });
      }
    }
  });

  if (!format) {
    throw new Error("PLY header is missing the format declaration.");
  }

  return { format, elements };
}

function readNamedNumber(source, candidateNames) {
  for (const name of candidateNames) {
    const value = source[name];
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function pushTriangulatedFace(targetIndices, faceIndices) {
  if (!Array.isArray(faceIndices) || faceIndices.length < 3) {
    return;
  }

  const indices = faceIndices.map((value) => Number.parseInt(value, 10));
  if (!indices.every((value) => Number.isInteger(value) && value >= 0)) {
    throw new Error("PLY face contains invalid vertex indices.");
  }

  for (let index = 1; index < indices.length - 1; index += 1) {
    targetIndices.push(indices[0], indices[index], indices[index + 1]);
  }
}

function consumeAsciiPlyProperty(tokens, cursor, property) {
  if (property.kind === "scalar") {
    if (cursor >= tokens.length) {
      throw new Error("PLY data row is incomplete.");
    }

    return {
      value: Number.parseFloat(tokens[cursor]),
      cursor: cursor + 1,
    };
  }

  if (cursor >= tokens.length) {
    throw new Error("PLY list property is incomplete.");
  }

  const listLength = Number.parseInt(tokens[cursor], 10);
  let nextCursor = cursor + 1;
  const values = [];

  for (let index = 0; index < listLength; index += 1) {
    if (nextCursor >= tokens.length) {
      throw new Error("PLY list property is incomplete.");
    }

    values.push(Number.parseFloat(tokens[nextCursor]));
    nextCursor += 1;
  }

  return { value: values, cursor: nextCursor };
}

function parseAsciiPlyData(bodyText, header) {
  const lines = bodyText.split(/\r?\n/);
  const positions = [];
  let normals = [];
  let colors = [];
  const indices = [];
  let lineIndex = 0;

  header.elements.forEach((element) => {
    for (let rowIndex = 0; rowIndex < element.count; rowIndex += 1) {
      while (lineIndex < lines.length && lines[lineIndex].trim() === "") {
        lineIndex += 1;
      }

      if (lineIndex >= lines.length) {
        throw new Error("PLY body ended unexpectedly.");
      }

      const tokens = lines[lineIndex].trim().split(/\s+/);
      lineIndex += 1;

      if (element.name === "vertex") {
        const rowData = {};
        let cursor = 0;

        element.properties.forEach((property) => {
          const result = consumeAsciiPlyProperty(tokens, cursor, property);
          rowData[property.name] = result.value;
          cursor = result.cursor;
        });

        const x = readNamedNumber(rowData, ["x"]);
        const y = readNamedNumber(rowData, ["y"]);
        const z = readNamedNumber(rowData, ["z"]);
        if (![x, y, z].every(Number.isFinite)) {
          throw new Error("PLY vertex is missing coordinates.");
        }

        positions.push(x, y, z);

        if (normals) {
          const nx = readNamedNumber(rowData, ["nx"]);
          const ny = readNamedNumber(rowData, ["ny"]);
          const nz = readNamedNumber(rowData, ["nz"]);
          if ([nx, ny, nz].every(Number.isFinite)) {
            normals.push(nx, ny, nz);
          } else {
            normals = null;
          }
        }

        if (colors) {
          const red = readNamedNumber(rowData, ["red", "r", "diffuse_red"]);
          const green = readNamedNumber(rowData, ["green", "g", "diffuse_green"]);
          const blue = readNamedNumber(rowData, ["blue", "b", "diffuse_blue"]);
          if ([red, green, blue].every(Number.isFinite)) {
            colors.push(clampColorComponent(red), clampColorComponent(green), clampColorComponent(blue));
          } else {
            colors = null;
          }
        }

        continue;
      }

      if (element.name === "face") {
        const rowData = {};
        let cursor = 0;

        element.properties.forEach((property) => {
          const result = consumeAsciiPlyProperty(tokens, cursor, property);
          rowData[property.name] = result.value;
          cursor = result.cursor;
        });

        const faceIndices = rowData.vertex_indices || rowData.vertex_index;
        pushTriangulatedFace(indices, faceIndices);
      }
    }
  });

  return { positions, normals, colors, indices };
}

function getPlyScalarReader(typeName) {
  const reader = PLY_SCALAR_READERS[typeName];
  if (!reader) {
    throw new Error(`PLY property type ${typeName} is not supported.`);
  }

  return reader;
}

function consumeBinaryPlyProperty(view, offset, property) {
  if (property.kind === "scalar") {
    const scalarReader = getPlyScalarReader(property.type);
    return {
      value: scalarReader.read(view, offset),
      offset: offset + scalarReader.size,
    };
  }

  const countReader = getPlyScalarReader(property.countType);
  const listLength = countReader.read(view, offset);
  let nextOffset = offset + countReader.size;
  const values = [];

  for (let index = 0; index < listLength; index += 1) {
    const itemReader = getPlyScalarReader(property.itemType);
    values.push(itemReader.read(view, nextOffset));
    nextOffset += itemReader.size;
  }

  return { value: values, offset: nextOffset };
}

function parseBinaryLittleEndianPlyData(arrayBuffer, headerOffset, header) {
  const view = new DataView(arrayBuffer, headerOffset);
  const positions = [];
  let normals = [];
  let colors = [];
  const indices = [];
  let offset = 0;

  header.elements.forEach((element) => {
    for (let rowIndex = 0; rowIndex < element.count; rowIndex += 1) {
      const rowData = {};
      element.properties.forEach((property) => {
        const result = consumeBinaryPlyProperty(view, offset, property);
        rowData[property.name] = result.value;
        offset = result.offset;
      });

      if (element.name === "vertex") {
        const x = readNamedNumber(rowData, ["x"]);
        const y = readNamedNumber(rowData, ["y"]);
        const z = readNamedNumber(rowData, ["z"]);
        if (![x, y, z].every(Number.isFinite)) {
          throw new Error("PLY vertex is missing coordinates.");
        }

        positions.push(x, y, z);

        if (normals) {
          const nx = readNamedNumber(rowData, ["nx"]);
          const ny = readNamedNumber(rowData, ["ny"]);
          const nz = readNamedNumber(rowData, ["nz"]);
          if ([nx, ny, nz].every(Number.isFinite)) {
            normals.push(nx, ny, nz);
          } else {
            normals = null;
          }
        }

        if (colors) {
          const red = readNamedNumber(rowData, ["red", "r", "diffuse_red"]);
          const green = readNamedNumber(rowData, ["green", "g", "diffuse_green"]);
          const blue = readNamedNumber(rowData, ["blue", "b", "diffuse_blue"]);
          if ([red, green, blue].every(Number.isFinite)) {
            colors.push(clampColorComponent(red), clampColorComponent(green), clampColorComponent(blue));
          } else {
            colors = null;
          }
        }

        continue;
      }

      if (element.name === "face") {
        const faceIndices = rowData.vertex_indices || rowData.vertex_index;
        pushTriangulatedFace(indices, faceIndices);
      }
    }
  });

  return { positions, normals, colors, indices };
}

export function createPlyMeshFromArrayBuffer(arrayBuffer, colorHex) {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength <= 0) {
    throw new Error("PLY data is empty.");
  }

  const bytes = new Uint8Array(arrayBuffer);
  const headerEndOffset = findPlyHeaderEnd(bytes);
  if (headerEndOffset < 0) {
    throw new Error("PLY header terminator was not found.");
  }

  const headerText = new TextDecoder("utf-8").decode(bytes.slice(0, headerEndOffset));
  const header = parsePlyHeader(headerText);

  let parsedData;
  if (header.format === "ascii") {
    const bodyText = new TextDecoder("utf-8").decode(bytes.slice(headerEndOffset));
    parsedData = parseAsciiPlyData(bodyText, header);
  } else if (header.format === "binary_little_endian") {
    parsedData = parseBinaryLittleEndianPlyData(arrayBuffer, headerEndOffset, header);
  } else {
    throw new Error("Only ASCII and binary little-endian PLY files are supported.");
  }

  if (parsedData.positions.length === 0) {
    throw new Error("PLY does not contain any vertices.");
  }

  if (parsedData.indices.length === 0) {
    throw new Error("PLY does not contain any faces.");
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(parsedData.positions, 3));
  geometry.setIndex(parsedData.indices);

  if (parsedData.normals && parsedData.normals.length === parsedData.positions.length) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(parsedData.normals, 3));
  }

  if (parsedData.colors && parsedData.colors.length === parsedData.positions.length) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(parsedData.colors, 3));
  }

  finalizeSurfaceGeometry(geometry);
  const useVertexColors = Boolean(geometry.getAttribute("color"));
  return new THREE.Mesh(geometry, createSurfaceMaterial(colorHex, useVertexColors));
}
function normalizeThreeMfArchivePath(pathValue) {
  if (typeof pathValue !== "string") {
    return "";
  }

  return pathValue.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function readThreeMfArchiveEntries(arrayBuffer) {
  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength <= 0) {
    throw new Error("3MF data is empty.");
  }

  const archiveEntries = new Map();
  const unzippedEntries = unzipSync(new Uint8Array(arrayBuffer));

  Object.entries(unzippedEntries).forEach(([entryPath, entryBytes]) => {
    const normalizedPath = normalizeThreeMfArchivePath(entryPath);
    if (normalizedPath) {
      archiveEntries.set(normalizedPath, entryBytes);
    }
  });

  if (archiveEntries.size === 0) {
    throw new Error("3MF archive does not contain any files.");
  }

  return archiveEntries;
}

function parseXmlDocument(xmlText, label) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(xmlText, "application/xml");
  const parserError = documentNode.querySelector("parsererror");
  if (parserError) {
    throw new Error(`${label} XML is invalid.`);
  }

  return documentNode;
}

function getElementChildren(node) {
  return Array.from(node?.childNodes || []).filter((childNode) => childNode.nodeType === 1);
}

function getDirectChildrenByLocalName(node, localName) {
  return getElementChildren(node).filter((childNode) => childNode.localName === localName);
}

function getFirstDirectChildByLocalName(node, localName) {
  return getDirectChildrenByLocalName(node, localName)[0] || null;
}

function parseThreeMfRelationshipTarget(archiveEntries) {
  const relationshipsPath = Array.from(archiveEntries.keys()).find((entryPath) => entryPath.toLowerCase() === "_rels/.rels");
  if (!relationshipsPath) {
    return "";
  }

  const relationshipsXml = strFromU8(archiveEntries.get(relationshipsPath));
  const relationshipsDocument = parseXmlDocument(relationshipsXml, "3MF relationships");
  const relationshipNodes = Array.from(relationshipsDocument.getElementsByTagName("*")).filter(
    (element) => element.localName === "Relationship"
  );
  const modelRelationship = relationshipNodes.find((element) => {
    const relationshipType = element.getAttribute("Type") || "";
    return relationshipType.toLowerCase().includes("/3dmodel");
  });

  return normalizeThreeMfArchivePath(modelRelationship?.getAttribute("Target") || "");
}

function resolveThreeMfModelPath(archiveEntries) {
  const relationshipTarget = parseThreeMfRelationshipTarget(archiveEntries);
  if (relationshipTarget && archiveEntries.has(relationshipTarget)) {
    return relationshipTarget;
  }

  const archivePaths = Array.from(archiveEntries.keys());
  const preferredModelPath = archivePaths.find((entryPath) => /^3d\/.+\.model$/i.test(entryPath));
  if (preferredModelPath) {
    return preferredModelPath;
  }

  const fallbackModelPath = archivePaths.find((entryPath) => /\.model$/i.test(entryPath));
  if (fallbackModelPath) {
    return fallbackModelPath;
  }

  throw new Error("3MF archive does not contain a .model part.");
}

function readThreeMfModelDocument(arrayBuffer) {
  const archiveEntries = readThreeMfArchiveEntries(arrayBuffer);
  const modelPath = resolveThreeMfModelPath(archiveEntries);
  const modelEntry = archiveEntries.get(modelPath);
  if (!modelEntry) {
    throw new Error(`3MF model part ${modelPath} is missing from the archive.`);
  }

  const modelXml = strFromU8(modelEntry);
  const modelDocument = parseXmlDocument(modelXml, "3MF model");
  const modelNode = getElementChildren(modelDocument).find((element) => element.localName === "model") || modelDocument.documentElement;
  if (!modelNode || modelNode.localName !== "model") {
    throw new Error("3MF archive does not contain a valid model element.");
  }

  return { modelDocument, modelNode };
}

function parseThreeMfNumericAttribute(node, attributeName) {
  const value = Number.parseFloat(node?.getAttribute(attributeName));
  return Number.isFinite(value) ? value : NaN;
}

function parseThreeMfIntegerAttribute(node, attributeName) {
  const value = Number.parseInt(node?.getAttribute(attributeName), 10);
  return Number.isInteger(value) ? value : -1;
}

function parseThreeMfTransform(transformText) {
  if (typeof transformText !== "string" || transformText.trim() === "") {
    return null;
  }

  const values = transformText
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseFloat(value));

  if (values.length !== 12 || !values.every(Number.isFinite)) {
    throw new Error("3MF component transform is invalid.");
  }

  const matrix = new THREE.Matrix4();
  matrix.set(
    values[0], values[3], values[6], values[9],
    values[1], values[4], values[7], values[10],
    values[2], values[5], values[8], values[11],
    0, 0, 0, 1
  );
  return matrix;
}

function getThreeMfUnitScaleToMillimeter(unitName) {
  switch ((unitName || "millimeter").toLowerCase()) {
    case "micron":
      return 0.001;
    case "millimeter":
      return 1;
    case "centimeter":
      return 10;
    case "meter":
      return 1000;
    case "inch":
      return 25.4;
    case "foot":
      return 304.8;
    default:
      return 1;
  }
}

function hasRenderableGeometry(object3d) {
  let hasMeshGeometry = false;

  object3d?.traverse((node) => {
    if (hasMeshGeometry || !node.isMesh || !node.geometry) {
      return;
    }

    const positionAttribute = node.geometry.getAttribute("position");
    if (positionAttribute && positionAttribute.count > 0) {
      hasMeshGeometry = true;
    }
  });

  return hasMeshGeometry;
}

function createThreeMfMesh(meshNode, colorHex) {
  const verticesNode = getFirstDirectChildByLocalName(meshNode, "vertices");
  const trianglesNode = getFirstDirectChildByLocalName(meshNode, "triangles");
  if (!verticesNode || !trianglesNode) {
    throw new Error("3MF mesh is incomplete.");
  }

  const vertexNodes = getDirectChildrenByLocalName(verticesNode, "vertex");
  if (vertexNodes.length === 0) {
    throw new Error("3MF mesh does not contain any vertices.");
  }

  const positions = [];
  vertexNodes.forEach((vertexNode) => {
    const x = parseThreeMfNumericAttribute(vertexNode, "x");
    const y = parseThreeMfNumericAttribute(vertexNode, "y");
    const z = parseThreeMfNumericAttribute(vertexNode, "z");
    if (![x, y, z].every(Number.isFinite)) {
      throw new Error("3MF vertex is missing coordinates.");
    }

    positions.push(x, y, z);
  });

  const triangleNodes = getDirectChildrenByLocalName(trianglesNode, "triangle");
  if (triangleNodes.length === 0) {
    throw new Error("3MF mesh does not contain any triangles.");
  }

  const indices = [];
  const vertexCount = positions.length / 3;
  triangleNodes.forEach((triangleNode) => {
    const v1 = parseThreeMfIntegerAttribute(triangleNode, "v1");
    const v2 = parseThreeMfIntegerAttribute(triangleNode, "v2");
    const v3 = parseThreeMfIntegerAttribute(triangleNode, "v3");
    const triangleIndices = [v1, v2, v3];

    if (!triangleIndices.every((indexValue) => indexValue >= 0 && indexValue < vertexCount)) {
      throw new Error("3MF triangle references an invalid vertex index.");
    }

    indices.push(v1, v2, v3);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  const finalizedGeometry = finalizeCreasedSurfaceGeometry(geometry);
  return new THREE.Mesh(finalizedGeometry, createSurfaceMaterial(colorHex));
}

export function inspectThreeMfArrayBuffer(arrayBuffer) {
  const { modelNode } = readThreeMfModelDocument(arrayBuffer);
  const directElementNames = new Set(
    Array.from(modelNode.getElementsByTagName("*")).map((element) => element.localName)
  );

  return {
    hasDisplayResources:
      directElementNames.has("basematerials") ||
      directElementNames.has("colorgroup") ||
      directElementNames.has("texture2dgroup") ||
      directElementNames.has("texture2d") ||
      directElementNames.has("pbmetallicdisplayproperties"),
  };
}

export function createThreeMfObjectFromArrayBuffer(arrayBuffer, colorHex) {
  const { modelNode } = readThreeMfModelDocument(arrayBuffer);
  const resourcesNode = getFirstDirectChildByLocalName(modelNode, "resources");
  if (!resourcesNode) {
    throw new Error("3MF model does not contain any resources.");
  }

  const objectNodes = new Map();
  getDirectChildrenByLocalName(resourcesNode, "object").forEach((objectNode) => {
    const objectId = objectNode.getAttribute("id");
    if (objectId) {
      objectNodes.set(objectId, objectNode);
    }
  });

  if (objectNodes.size === 0) {
    throw new Error("3MF model does not contain any objects.");
  }

  const builtObjects = new Map();
  const buildObjectById = (objectId, ancestry = []) => {
    if (builtObjects.has(objectId)) {
      return builtObjects.get(objectId);
    }

    const objectNode = objectNodes.get(objectId);
    if (!objectNode) {
      throw new Error(`3MF references missing object ${objectId}.`);
    }

    if (ancestry.includes(objectId)) {
      throw new Error(`3MF contains a circular object reference for ${objectId}.`);
    }

    const meshNode = getFirstDirectChildByLocalName(objectNode, "mesh");
    let object3d;

    if (meshNode) {
      object3d = createThreeMfMesh(meshNode, colorHex);
    } else {
      const componentsNode = getFirstDirectChildByLocalName(objectNode, "components");
      const componentNodes = getDirectChildrenByLocalName(componentsNode, "component");
      if (componentNodes.length === 0) {
        throw new Error(`3MF object ${objectId} does not contain a supported mesh or components.`);
      }

      object3d = new THREE.Group();
      componentNodes.forEach((componentNode) => {
        const componentObjectId = componentNode.getAttribute("objectid");
        if (!componentObjectId) {
          throw new Error(`3MF object ${objectId} contains a component without objectid.`);
        }

        const componentObject = buildObjectById(componentObjectId, [...ancestry, objectId]).clone(true);
        const transform = parseThreeMfTransform(componentNode.getAttribute("transform"));
        if (transform) {
          componentObject.applyMatrix4(transform);
        }

        object3d.add(componentObject);
      });
    }

    const objectName = objectNode.getAttribute("name");
    if (objectName) {
      object3d.name = objectName;
    }

    builtObjects.set(objectId, object3d);
    return object3d;
  };

  const rootGroup = new THREE.Group();
  const buildNode = getFirstDirectChildByLocalName(modelNode, "build");
  const itemNodes = getDirectChildrenByLocalName(buildNode, "item");

  if (itemNodes.length > 0) {
    itemNodes.forEach((itemNode) => {
      const objectId = itemNode.getAttribute("objectid");
      if (!objectId) {
        throw new Error("3MF build item is missing objectid.");
      }

      const itemObject = buildObjectById(objectId).clone(true);
      const transform = parseThreeMfTransform(itemNode.getAttribute("transform"));
      if (transform) {
        itemObject.applyMatrix4(transform);
      }

      rootGroup.add(itemObject);
    });
  } else if (objectNodes.size === 1) {
    const [onlyObjectId] = objectNodes.keys();
    rootGroup.add(buildObjectById(onlyObjectId).clone(true));
  } else {
    objectNodes.forEach((_, objectId) => {
      rootGroup.add(buildObjectById(objectId).clone(true));
    });
  }

  const unitScale = getThreeMfUnitScaleToMillimeter(modelNode.getAttribute("unit"));
  if (unitScale !== 1) {
    rootGroup.scale.setScalar(unitScale);
  }

  rootGroup.updateMatrixWorld(true);
  if (!hasRenderableGeometry(rootGroup)) {
    throw new Error("3MF does not contain any renderable geometry.");
  }

  return rootGroup;
}
