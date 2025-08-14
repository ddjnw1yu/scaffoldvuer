import { THREE } from 'zincjs';
import { objectsToZincObjects } from "./Utilities";

const setEmissiveColour = (fullList, colour, setDepthFunc) => {
  for (let i = 0; i < fullList.length; i++) {
    if (fullList[i] && fullList[i].material && fullList[i].material.emissive) {
      let object = fullList[i].userData;
      if (object && object.isZincObject) {
        object.setEmissiveRGB(colour);
      } else if (fullList[i].material && fullList[i].material.emissive) {
        fullList[i].material.emissive.setRGB(...colour);
      }
      if (setDepthFunc && fullList[i].material.depthFunc) {
        fullList[i].material.depthFunc = THREE.LessEqualDepth;
      }
      fullList[i].children.forEach(child => {
        const object = child.userData;
        if (object && object.isZincObject && child.material && child.material.emissive) {
          child.material.emissive.setRGB(...colour);
        }
      });
    }
  }
}

/**
 * This module manages highlighted and selected objects in 3D modules. 
 * 
 * @class
 * @returns {exports.GraphicsHighlight}
 */
const GraphicsHighlight = function() {
  let currentHighlightedObjects = [];
  let currentSelectedObjects = [];
  this.highlightColour = [1, 0, 0];
  this.selectColour = [0, 1, 0];
  this.originalColour = [0, 0, 0];
  const _temp1 = [];
  const _temp2 = [];
  const _this = this;

  const isDifferent = function(array1, array2) {
    if ((array1.length == 0) && (array2.length == 0))
      return false; 
    for (let i = 0; i < array1.length; i++) {
      let matched = false;
      for (let j = 0; j < array2.length; j++) {
        if (array1[i] === array2[j]) {
          matched = true;
        }
      }
      if (!matched)
        return true;
    }
    for (let i = 0; i < array2.length; i++) {
      let matched = false;
      for (let j = 0; j < array1.length; j++) {
        if (array2[i] === array1[j]) {
          matched = true;
        }
      }
      if (!matched)
        return true;
    }
    return false;
  }
  
  const getUnmatchingObjects = function(objectsArray1, objectsArray2) {
    _temp1.length = 0;
    if (objectsArray2.length == 0)
      return objectsArray1;
    for (let i = 0; i < objectsArray1.length; i++) {
      let matched = false;
      for (let j = 0; j < objectsArray2.length; j++) {
        if (objectsArray1[i] === objectsArray2[j]) {
          matched = true;
        }
      }
      if (!matched)
      _temp1.push(objectsArray1[i]);
    }
    return _temp1;
  }


   /*
    * Not sure why the following block does not work
    *
  this.setHighlighted = function(objects) {
    const previousHighlightedObjects = [...currentHighlightedObjects];
    // Selected object cannot be highlighted
    const array = getUnmatchingObjects(objects, currentSelectedObjects);
    const fullList = getFullListOfObjects(array);
    const different = isDifferent(array, previousHighlightedObjects);
    console.log("highlight:", different)
    if (different) {
      _this.resetHighlighted();
      setEmissiveColour(fullList, _this.highlightColour, false);
    }
    currentHighlightedObjects = array;
    return different;
  }

  this.setSelected = function(objects) {
    // first find highlighted object that are not selected
    const previousHSelectedObjects = [...currentSelectedObjects];
    const fullList = getFullListOfObjects(objects);
    const different = isDifferent(objects, previousHSelectedObjects);
    console.log("selected:", different)
    if (different) {
      _this.resetHighlighted();
      _this.resetSelected();
      setEmissiveColour(fullList, _this.selectColour, false);
    }
    currentSelectedObjects = objects;
    return different;
  }
  */

  this.setHighlighted = function(objects) {
    const previousHighlightedObjects = [...currentHighlightedObjects];
    this.setNervesRadius(previousHighlightedObjects, 1, 8);
    _this.resetHighlighted();
    // Selected object cannot be highlighted
    const array = getUnmatchingObjects(objects, currentSelectedObjects);
    const fullList = getFullListOfObjects(array);
    this.setNervesRadius(array, 6, 24);
    setEmissiveColour(fullList, _this.highlightColour, false);
    currentHighlightedObjects = array;
    return isDifferent(currentHighlightedObjects, previousHighlightedObjects);
  }

  this.setSelected = function(objects) {
    // first find highlighted object that are not selected
    const previousHSelectedObjects = [...currentSelectedObjects];
    //const array = getUnmatchingObjects(currentHighlightedObjects, objects);
    _this.resetHighlighted();
    _this.resetSelected();
    const fullList = getFullListOfObjects(objects);
    setEmissiveColour(fullList, _this.selectColour, false);
    currentSelectedObjects = objects;
    return isDifferent(currentSelectedObjects, previousHSelectedObjects);
  }

  const getFullListOfObjects = function(objects) {
    _temp2.length = 0;
    for (let i = 0; i < objects.length; i++) {
      if (objects[i].material)
        _temp2.push(objects[i]);
    }
    return _temp2;
  }

  this.setNervesRadius = function(target, radius, radialSegments) {
    const currentObjects = objectsToZincObjects(target);
    if (currentObjects && currentObjects.length) {
      currentObjects.forEach((currentObject) => {
        console.log(currentObject)
        if (currentObject.isTubeLines && currentObject.userData?.isNerves) {
          currentObject.setTubeLines(radius, radialSegments);
        } 
      });
    }
  }
  
  this.resetHighlighted = function() {
    const fullList = getFullListOfObjects(currentHighlightedObjects);
    setEmissiveColour(fullList, _this.originalColour, true);
    this.setNervesRadius(currentHighlightedObjects, 1, 4);
    currentHighlightedObjects = [];
  }
  
  this.resetSelected = function() {
    const fullList = getFullListOfObjects(currentSelectedObjects);
    setEmissiveColour(fullList, _this.originalColour, true);
    currentSelectedObjects = [];
  }
  
  this.getSelected = function() {
    return currentSelectedObjects;
  }
  
  this.reset = function() {
    _this.resetSelected();
    _this.resetHighlighted();
  }
}

export { GraphicsHighlight as default };
