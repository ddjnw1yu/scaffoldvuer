import { Label, THREE } from 'zincjs';

export const createListFromPrimitives = (primitives, list) => {
  if (primitives) {
    let id = "";
    primitives.forEach(primitive => {
      id = primitive.uuid;
      if (primitive.region) {
        id = primitive.region.uuid + "/" + id;
      }
      if (primitive && primitive.getVisibility()) {
        list.push(id);
      }
    });
  }
  return list;
}

const getDistance = (point1, point2) => {
  const dist0 = point1[0] - point2[0];
  const dist1 = point1[1] - point2[1];
  const dist2 = point1[2] - point2[2];
  return Math.sqrt(dist0 * dist0 + dist1 * dist1 + dist2 * dist2);
}

export const getEditableLines = (event) => {
  const zincObjects = event.zincObjects;
  if (zincObjects.length > 0 && zincObjects[0]) {
    const zincObject = zincObjects[0];
    if (zincObject.isEditable && zincObject.isLines2) {
      const info = event.identifiers[0].extraData.intersected;
      if (info && info.faceIndex > -1) {
        const v = zincObject.getVerticesByFaceIndex(info.faceIndex);
        const p = event.identifiers[0].extraData.intersected.pointOnLine;
        if (v.length > 1) {
          const dist0 = getDistance(v[0], [p.x, p.y, p.z]);
          const dist1 = getDistance(v[1], [p.x, p.y, p.z]);
          if (dist0 > dist1) {
            return { zincObject, faceIndex: info.faceIndex, vertexIndex: info.faceIndex * 2 + 1, point: v[0]};
          } else {
            return { zincObject, faceIndex: info.faceIndex, vertexIndex: info.faceIndex * 2, point: v[1]};
          }
        }
      }
    }
  }
  return undefined;
}

export const getClickedObjects = (event) => {
  const zincObjects = event.zincObjects;
  if (zincObjects.length > 0 && zincObjects[0]) {
    const zincObject = zincObjects[0];
    return zincObject;
  }
  return undefined;
}

export const getDeletableObjects = (event) => {
  const zincObjects = event.zincObjects;
  if (zincObjects.length > 0 && zincObjects[0]) {
    const zincObject = zincObjects[0];
    if (zincObject.isEditable) {
      return zincObject;
    }
  }
  return undefined;
}

export const movePoint = (zincObject, index, diff) => {
  if (zincObject?.isEditable && zincObject?.isPointset) {
    let found = false;
    for (let i = 0; i < 3 && !found; i++) {
      if (diff[i] !== 0) {
        found = true;
      }
    }
    if (found && index > -1) {
      const v = zincObject.getVerticesByIndex(index);
      if (v) {
        v[0] = v[0] + diff[0];
        v[1] = v[1] + diff[1];
        v[2] = v[2] + diff[2];
      }
      zincObject.editVertices([v], index);
      zincObject.boundingBoxUpdateRequired = true;
      return true;
    }
  }
  return false;
}

export const getLineDistance = (zincObject, faceIndex) => {
  if (zincObject?.isEditable && zincObject?.isLines2) {
    if (faceIndex > -1) {
      const v = zincObject.getVerticesByFaceIndex(faceIndex);
      if (v && v.length > 1) {
        return getDistance(v[1], v[0]);
      }
    }
  }
  return 0;
}
 
//Move or extend a line
export const moveAndExtendLine = (zincObject, faceIndex, unit, extendOnly) => {
  if (zincObject && unit !== 0.0) {
    if (zincObject.isEditable && zincObject.isLines2) {
      if (faceIndex > -1) {
        const v = zincObject.getVerticesByFaceIndex(faceIndex);
        let d = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]];
        const mag = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
        for (let i = 0; i < 3; i++) {
          d[i] = d[i] / mag * unit;
          if (!extendOnly) {
            v[0][i] = v[0][i] + d[i];
            v[1][i] = v[1][i] + d[i];
          } else {
            v[1][i] = v[0][i] + d[i];
          }
        }
        zincObject.editVertices(v, faceIndex * 2);
        zincObject.boundingBoxUpdateRequired = true;
        return true;
      }
    }
  }
  return false;
}

export const updateBoundingBox = (geometry, scene) => {
  const box = scene.getBoundingBox();
  const dim = new THREE.Vector3().subVectors(box.max, box.min);
  const boxGeo = new THREE.BoxGeometry(dim.x, dim.y, dim.z);
  dim.addVectors(box.min, box.max).multiplyScalar( 0.5 );
  const positions = boxGeo.getAttribute("position");
  const count = positions.count;
  const vertices = [];
  for (let i = 0; i < count; i++) {
    vertices[i] = [
      positions.array[i * 3],
      positions.array[i * 3 + 1],
      positions.array[i * 3 + 2]
    ];
  }
  geometry.editVertices(vertices , 0);
  geometry.setPosition(dim.x, dim.y, dim.z);
  boxGeo.dispose();
}

export const extractAllFullPaths = (item, list) => {
  let nodeName = "";
  if (item.isRegion) {
    nodeName = `__r${item.regionPath}`;
  }
  if (item.isPrimitives) {
    nodeName = `${item.regionPath}/${item.label}`;
  }
  list.push(nodeName);
  if (item.children)
    item.children.forEach(child => extractAllFullPaths(child, list));
}

export const findObjectsWithNames = (rootRegion, names, regionPath, transverse) => {
  let targetRegion = rootRegion;
  const targetObjects = [];
  if (regionPath)
    targetRegion = rootRegion.findChildFromPath(regionPath);
  if (targetRegion) {
    const isArray = Array.isArray(names);
    let array = names;
    if (!isArray) {
      array = [array];
    }
    array.forEach(name => {
      const temp = targetRegion.findObjectsWithGroupName(name, transverse);
      targetObjects.push(...temp);
    });
  }
  return targetObjects;
}

export const getAllObjects = (scene) => {
  let objects = scene.getRootRegion().getAllObjects(true);
  let id = 1;
  return objects.map(object => Object.assign(object, { id: id++ })); // Add id to each object
}

const findObjectWithUUID = (objects, uuid, remove) => {
  const index = objects.findIndex(obj => obj.uuid === uuid);
  let object = undefined;
  if (index > -1) {
    object = objects[index];
    if (remove) {
      objects.splice(index, 1);
    }
  }
  return object;
}

export const convertUUIDsToFullPaths = (rootRegion, IDs) => {
  const results = [];
  if (rootRegion && IDs && IDs.length > 0) {
    //a region to primitivs map list
    const rpLists = {};
    const reIDToPath = {};
    const allRegions = [rootRegion, ...rootRegion.getChildRegions(true)];
    let region = undefined;
    let primitive = undefined;
    let regionID = undefined;
    
    IDs.forEach(id => {
      const uuids = id.split("/");
      regionID = uuids[0];
      region = findObjectWithUUID(allRegions, regionID, false);
      if (region) {
        if (!reIDToPath[regionID]) {
          reIDToPath[regionID] = region.getFullPath();
        }
        if (uuids[1]) {
          if (!rpLists[regionID]) {
            rpLists[regionID] = region.getAllObjects(false);
          }
          primitive = findObjectWithUUID(rpLists[regionID], uuids[1], true);
          if (primitive) {
            results.push(`${reIDToPath[regionID]}/${primitive.groupName}`);
          }
        } else {
          results.push(`__r/${reIDToPath[regionID]}`);
        }
      }
    });
  }
  return results;
}

export const createUnqiuesFromObjects = (zincObjects) => {
  if (zincObjects) {
    const expanded = [];
    zincObjects.forEach(obj => {
      if (obj.isZincObject) {
        expanded.push(obj);
      } else if (obj.isRegion) {
        expanded.push(...obj.getAllObjects(true));
      }
    });
    const uniq = Object.values(
      expanded.reduce((acc, obj) => ({ ...acc, [obj.uuid]: obj }), {})
    );
    return uniq;
  }
  return [];
}

export const getObjectsFromAnnotations = (scene, annotations) => {
  const returned = {label: "Multiple selections", regionPath: "", objects: []};
  if (annotations && scene) {
    const rpList = {};
    const rootRegion = scene.getRootRegion();
    if (annotations.length > 0) {
      returned.regionPath = annotations[0].data.region;
      returned.label = annotations[0].data.group;
    }
    annotations.forEach(annotation => {
      if (!annotation.data.region.includes(returned.regionPath)) {
        returned.regionPath = "";
      }
      if (returned.label !== annotation.data.group) {
        returned.label = "Multiple selections";
      }
      const region = rootRegion.findChildFromPath(annotation.data.region);
      if (!rpList[region.uuid]) {
        rpList[region.uuid] = region.getAllObjects(false);
      }
      const obj = findObjectWithUUID(rpList[region.uuid], annotation.data.uuid);
      if (obj) returned.objects.push(obj);
    });
  }
  return returned;
}

const getCoordinatesForAnnotationFeature = (zincObject) => {
  const mesh = zincObject.getMorph();
  let attr = 'position';
  if (zincObject.isLines2) {
    attr = 'instanceStart';
  }
  const coords = [];
  let vIndex = 0;
  const position = mesh.geometry.getAttribute( attr );
  for (let i = 0; i < zincObject.drawRange; i++) {
    coords.push([
      position.array[vIndex++],
      position.array[vIndex++],
      position.array[vIndex++],
    ]);
  }
  return coords;
}

export const createNewAnnotationsWithFeatures = (zincObject, region, group, scaffoldUrl, comment) => {
  let type = undefined;
  if (zincObject.isPointset) {
    type = "MultiPoint";
  } else if (zincObject.isLines2) {
    type = "MultiLineString";
  } else {
    type = "Feature";
  }
  const drawn = type === "Feature" ? false : true;
  const label = type === "Feature" ? "Feature annotation" : "Drawn annotation";
  if (type) {
    const coords = getCoordinatesForAnnotationFeature(zincObject);
    //Check if region ends with a slash
    let fullName = region.slice(-1) === "/" ? region : region + "/";
    fullName = fullName + group;
    const featureID = fullName;
    const userAnnotation = {
      resource: scaffoldUrl,
      item: {
        "id": featureID,
      },
      body: {
        evidence: [],
        comment: comment,
      },
      feature: {
        "id": featureID,
        "properties": {
            "drawn": drawn,
            "label": label
        },
        "geometry": {
            "coordinates": coords,
            "type": type
        }
      },
    }
    if (comment === "Deleted") {
      userAnnotation.feature = undefined;
    }

    return userAnnotation;
  }
}

/*
 * Add/Update drawn annotations to the server.
 */
export const addUserAnnotationWithFeature = (service, userToken, zincObject,
  region, group, scaffoldUrl, action) => {
  const annotation = createNewAnnotationsWithFeatures(zincObject, region, group, scaffoldUrl, action);
  if (annotation) {
    if (service && service.currentUser) {
      annotation.creator = {...service.currentUser};
      if (!annotation.creator.orcid) annotation.creator.orcid = '0000-0000-0000-0000';
      service.addAnnotation(userToken, annotation)
      .then((response) => {
        if (!response.annotationId) {
          console.log('There is a problem with the submission, please try again later');
        }
      })
      .catch(() => {
        console.log('There is a problem with the submission, please try again later');
      })
    }
    return annotation;
  }
}

/*
 * Get the drawn annotation stored on the annotation server
 */
export const getDrawnAnnotations = async (service, userToken, scaffoldUrl) => {
  const resource = scaffoldUrl;
  return await service.drawnFeatures(userToken, resource);
}

/*
 * Convert features store in annotation server into primitives
 */
export const annotationFeaturesToPrimitives = (scene, features)  => {
  if (scene) {
    features.forEach((feature) => {
      const geometry = feature.geometry;
      const regionGroup = decodeURIComponent(feature.id);
      const last = regionGroup.lastIndexOf('/');
      const region = regionGroup.substring(0, last);
      const group = regionGroup.substring(last + 1);
      let object = undefined;
      if (geometry.type === "MultiPoint") {
        object = scene.createPoints(
          region,
          group,
          geometry.coordinates,
          group,
          0x0022ee,
        );
      } else if (geometry.type === "MultiLineString") {
        object = scene.createLines(
          region,
          group,
          geometry.coordinates,
          0x00ee22,
        );
      }
      if (object) object.zincObject.isEditable = true;
    });
  }
}

export const objectsToZincObjects = function(objects) {
  const zincObjects = [];
  for (let i = 0; i < objects.length; i++) {
    let zincObject = objects[i].userData;
    if (zincObject) {
      if (zincObject.isGlyph || zincObject.isGlyphset) {
        let glyphset = zincObject;
        if (zincObject.isGlyph)
          glyphset = zincObject.getGlyphset();
        zincObjects.push(glyphset);
      } else {
        zincObjects.push(zincObject);
      }
    }
  }
  return zincObjects;
}
