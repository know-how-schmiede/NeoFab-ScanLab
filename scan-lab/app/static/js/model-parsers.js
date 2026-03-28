import * as THREE from "../vendor/three/build/three.module.js";

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