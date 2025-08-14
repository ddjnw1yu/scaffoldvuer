import WEBGL from './WebGL';
import Zinc from 'zincjs';
const THREE = Zinc.THREE;
import { BaseModule } from './BaseModule';
import { EVENT_TYPE } from "./EventNotifier";
import GraphicsHighlight from "./GraphicsHighlight";
import { objectsToZincObjects } from "./Utilities";

/**
 * Create a {@link Zinc.Renderer} on the dom element with corresponding elementID.
 * @param {String} elementID - id of the target dom element.
 * @returns {Zinc.Renderer}
 */
const createRenderer = function () {
  const localContainer = document.createElement( 'div' );
  let localRenderer = undefined;;
  localContainer.style.height = "100%";
  if (WEBGL.isWebGLAvailable()) {
    localRenderer = new Zinc.Renderer(localContainer, window);
    Zinc.defaultMaterialColor = 0xFFFF9C;
    localRenderer.initialiseVisualisation();
    localRenderer.playAnimation = false;
  } else {
    const warning = WEBGL.getWebGLErrorMessage();
    localContainer.appendChild(warning);
  }
  return {Zinc, "renderer":localRenderer, "container":localContainer};
}

const RendererModule = function()  {
  BaseModule.call(this);
  this.scene = undefined;
  this.rendererContainer = undefined;
  this.displayArea = undefined;
  this.graphicsHighlight = new GraphicsHighlight();
  this.selectObjectOnPick = true;
  this.zincRenderer = null;
  this.selectedScreenCoordinates = new THREE.Vector3();
  this.selectedCenter = undefined;
  this.liveUpdatesObjects = undefined;
  this.ignorePreviousSelected = false;
}

RendererModule.prototype = Object.create(BaseModule.prototype);

RendererModule.prototype.getIntersectedObject = function(intersects) {
	if (intersects) {
    const typeMap = intersects.map(intersect => {
      if (intersect && intersect.object &&
        intersect.object.userData) {
        if (intersect.object.userData.isMarker) {
          return 1;
        } else if (intersect.object.name && 
          intersect.object.userData.isZincObject) {
          if (intersect.object.name === "_Unnamed") {
            return 3;
          } else {
            return 2;
          }
        }
      }
      return 0;
    });
    //prioritise markers
    let i = typeMap.indexOf(1);
    if (i > -1) {
      return intersects[i];
    }
    //Proritise objects that is not called _Unnamed
    i = typeMap.indexOf(2);
    i = (i > -1) ? i : typeMap.indexOf(3);
    return intersects[i];
	}
	return undefined;
}


RendererModule.prototype.getAnnotationsFromObjects = function(objects) {
  const annotations = [];
  for (var i = 0; i < objects.length; i++) {
    const zincObject = objects[i].userData;
    let annotation = undefined;
    if (zincObject) {
      if (zincObject.isGlyph || zincObject.isGlyphset) {
        let glyphset = zincObject;
        if (zincObject.isGlyph) {
          glyphset = zincObject.getGlyphset();
        }
        annotation = glyphset.userData ? glyphset.userData.annotation : undefined;
        if (annotation && annotation.data) {
          if (objects[i].name && objects[i].name != "")
            annotation.data.id = objects[i].name;
          else
            annotation.data.id = glyphset.groupName;
        }
      } else {
        annotation = zincObject.userData ? zincObject.userData.annotation : undefined;
        if (annotation && annotation.data){
          annotation.data.id = objects[i].name;
        }
      }
      if (annotation) {
        annotation.data.anatomicalId = zincObject.anatomicalId;
        annotation.data.isNerves = zincObject.userData.isNerves;
        annotation.data.zincObject = zincObject;
      }
    }
    if (annotation)
      annotations.push(annotation);
  }
	return annotations;
}

RendererModule.prototype.setHighlightedByObjects = function(
  objects, coords, extraData, propagateChanges) {
  const zincObjects = objectsToZincObjects(objects);
  const changed = this.graphicsHighlight.setHighlighted(objects);
  if (propagateChanges) {
    let eventType = EVENT_TYPE.MOVE;
    if (changed)
      eventType = EVENT_TYPE.HIGHLIGHTED;
    const annotations = this.getAnnotationsFromObjects(objects);
    if (annotations.length > 0) {
      annotations[0].coords = coords;
      annotations[0].extraData = extraData;
    }
    this.publishChanges(annotations, eventType, zincObjects);
  }
  return changed;
}


RendererModule.prototype.setHighlightedByZincObjects = function(
  zincObjects, coords, extraData, propagateChanges) {
    let morphs = [];
    if (zincObjects) {
      zincObjects.forEach(zincObject => {
        if (zincObject && zincObject.getMorph())
          morphs.push(zincObject.getMorph());
      });
    }

    return this.setHighlightedByObjects(morphs, coords, extraData, propagateChanges);
}

RendererModule.prototype.setupLiveCoordinates = function(zincObjects) {
  this.liveUpdatesObjects = zincObjects;
  if (zincObjects && (zincObjects.length > 0)) {
    const boundingBox = this.scene.getBoundingBoxOfZincObjects(zincObjects);
    let newSelectedCenter = new THREE.Vector3();
    if (boundingBox) {
      boundingBox.getCenter(newSelectedCenter);
      if (this.selectedCenter == undefined) {
        this.selectedCenter = newSelectedCenter;
      } else {
        this.selectedCenter.copy(newSelectedCenter);
      }
    } else {
      this.selectedCenter = undefined;
    }
  } else {
    this.selectedCenter = undefined;
  }
}


RendererModule.prototype.setSelectedByObjects = function(
  objects, coords, extraData, propagateChanges) {
  let changed = false;
  if (this.selectObjectOnPick) {
    changed = this.graphicsHighlight.setSelected(objects);
  } else {
    changed = true;
  }
  if (changed || this.ignorePreviousSelected) {
    const zincObjects = objectsToZincObjects(objects);
    if (this.selectObjectOnPick) {
      this.setupLiveCoordinates(zincObjects);
    }
    if (propagateChanges) {
      const eventType = EVENT_TYPE.SELECTED;
      const annotations = this.getAnnotationsFromObjects(objects);
      if (annotations.length > 0) {
        annotations[0].coords = coords;
        annotations[0].extraData = extraData;
      }
      this.publishChanges(annotations, eventType, zincObjects);
    }
  }
  return changed;
}

RendererModule.prototype.setSelectedByZincObjects = function(
  zincObjects, coords, extraData, propagateChanges) {
  let morphs = [];
  if (zincObjects) {
    zincObjects.forEach(zincObject => {
      if (zincObject) {
        const morph = zincObject.getMorph();
        if (morph) {
          morphs.push(morph);
        }
      }
    });
  }

  return this.setSelectedByObjects(morphs, coords, extraData, propagateChanges);
}

const addGlyphToArray = function(objects) {
  return function(glyph) {
    objects.push(glyph.getMesh());
  }
}

RendererModule.prototype.findObjectsByGroupName = function(groupName) {
  return this.scene.findObjectsWithGroupName(groupName);
}

RendererModule.prototype.setHighlightedByGroupName = function(groupName, propagateChanges) {
  const objects = this.findObjectsByGroupName(groupName);
  return this.setHighlightedByObjects(objects, undefined, {}, propagateChanges);
}

RendererModule.prototype.setSelectedByGroupName = function(groupName, propagateChanges) {
  const objects = this.findObjectsByGroupName(groupName);
  return this.setSelectedByObjects(objects, undefined, {}, propagateChanges);
}

RendererModule.prototype.changeBackgroundColour = function(backgroundColourString) {
  const colour = new THREE.Color(backgroundColourString);
  if (this.zincRenderer) {
    let internalRenderer = this.zincRenderer.getThreeJSRenderer();
    internalRenderer.setClearColor( colour, 1 );
  }
}

RendererModule.prototype.resetView = function() {
  if (this.zincRenderer)
    this.zincRenderer.resetView();
}
  
RendererModule.prototype.viewAll = function() {
  if (this.zincRenderer)
    this.zincRenderer.viewAll();
}

/**
 * Start the animation and let the renderer to processs with
 * time progression
 */
RendererModule.prototype.playAnimation = function(flag) {
  if (this.zincRenderer)
    this.zincRenderer.playAnimation = flag;
}

/**
* Set the speed of playback
*/
RendererModule.prototype.setPlayRate = function(value) {
  if (this.zincRenderer)
    this.zincRenderer.setPlayRate(value);
}

/**
* Get the speed of playback
*/
RendererModule.prototype.getPlayRate = function(value) {
  if (this.zincRenderer)
    return this.zincRenderer.getPlayRate();
  else
    return 0.0;
}
  
  /** Initialise everything in the renderer, including the 3D renderer,
 *  and picker for the 3D renderer.
 * 
 */
RendererModule.prototype.initialiseRenderer = function(displayAreaIn) {
  if (this.zincRenderer === undefined || this.rendererContainer === undefined) {
    let returnedValue = createRenderer();
    this.Zinc = returnedValue["Zinc"];
    this.zincRenderer = returnedValue["renderer"];
    this.rendererContainer = returnedValue["container"];
  }
  if (displayAreaIn) {
    this.displayArea = displayAreaIn;
    this.displayArea.appendChild( this.rendererContainer );
    if (this.zincRenderer)
      this.zincRenderer.animate();
  }
}

RendererModule.prototype.destroy = function() {
  if (this.zincRenderer) {
    this.zincRenderer.dispose();
    this.zincRenderer.getThreeJSRenderer().dispose();
    this.zincRenderer = undefined;
  }
  BaseModule.prototype.destroy.call( this );
}

export {
  RendererModule
}
