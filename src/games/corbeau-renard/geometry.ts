export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

/**
 * UV sphere for sculpted organic storybook forms (canopy clusters, crow body, fox head, tail)
 */
export function createSphereMesh(latSegments = 14, lonSegments = 18): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let lat = 0; lat <= latSegments; lat++) {
    const theta = (lat * Math.PI) / latSegments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= lonSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / lonSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      positions.push(nx, ny, nz);
      normals.push(nx, ny, nz);
      uvs.push(lon / lonSegments, 1 - lat / latSegments);
    }
  }

  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const first = lat * (lonSegments + 1) + lon;
      const second = first + lonSegments + 1;
      // Counter-clockwise outward-facing winding
      indices.push(first, first + 1, second);
      indices.push(second, first + 1, second + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

/**
 * Tapered cylinder along Y axis (-0.5 to +0.5) for tree trunk, fox torso, cheese wheels
 */
export function createCylinderMesh(
  radialSegments = 20,
  topRadius = 1,
  bottomRadius = 1
): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const slope = bottomRadius - topRadius;

  // Side ring vertices
  for (let yIdx = 0; yIdx <= 1; yIdx++) {
    const y = yIdx === 0 ? -0.5 : 0.5;
    const r = yIdx === 0 ? bottomRadius : topRadius;
    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const len = Math.hypot(cosT, slope, sinT) || 1;
      positions.push(cosT * r, y, sinT * r);
      normals.push(cosT / len, slope / len, sinT / len);
      uvs.push(u, yIdx);
    }
  }

  const ringStride = radialSegments + 1;
  for (let i = 0; i < radialSegments; i++) {
    const a = i;
    const b = i + 1;
    const c = i + ringStride;
    const d = i + ringStride + 1;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  // Top cap
  const topCenterIdx = positions.length / 3;
  positions.push(0, 0.5, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i <= radialSegments; i++) {
    const theta = (i / radialSegments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions.push(cosT * topRadius, 0.5, sinT * topRadius);
    normals.push(0, 1, 0);
    uvs.push(0.5 + cosT * 0.5, 0.5 + sinT * 0.5);
  }
  for (let i = 0; i < radialSegments; i++) {
    indices.push(topCenterIdx, topCenterIdx + 1 + i + 1, topCenterIdx + 1 + i);
  }

  // Bottom cap
  const bottomCenterIdx = positions.length / 3;
  positions.push(0, -0.5, 0);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0.5);
  for (let i = 0; i <= radialSegments; i++) {
    const theta = (i / radialSegments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    positions.push(cosT * bottomRadius, -0.5, sinT * bottomRadius);
    normals.push(0, -1, 0);
    uvs.push(0.5 + cosT * 0.5, 0.5 + sinT * 0.5);
  }
  for (let i = 0; i < radialSegments; i++) {
    indices.push(bottomCenterIdx, bottomCenterIdx + 1 + i, bottomCenterIdx + 1 + i + 1);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

/**
 * Cone along Y axis (base -0.5, tip +0.5) for fox ears, upturned snout, crow beak, grass blades
 */
export function createConeMesh(radialSegments = 12): MeshData {
  return createCylinderMesh(radialSegments, 0.02, 1.0);
}

/**
 * Textured 3D quad (-0.5..+0.5 in X and Y, facing +Z) used for HTML-in-Canvas 3D planes
 */
export function createQuadMesh(): MeshData {
  return {
    positions: new Float32Array([
      -0.5, -0.5, 0,
      0.5, -0.5, 0,
      0.5, 0.5, 0,
      -0.5, 0.5, 0,
    ]),
    normals: new Float32Array([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ]),
    uvs: new Float32Array([
      0, 1,
      1, 1,
      1, 0,
      0, 0,
    ]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
  };
}
