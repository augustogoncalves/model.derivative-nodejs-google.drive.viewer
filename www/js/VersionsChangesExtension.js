function VersionChanges(viewer, options) {
  Autodesk.Viewing.Extension.call(this, viewer, options);
}

VersionChanges.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
VersionChanges.prototype.constructor = VersionChanges;

VersionChanges.prototype.load = function () {
  var modelA = this.options.modelA;
  var modelB = this.options.modelB;

  var removed = {};
  var added = {};
  var modified = {};

  var red = new THREE.Vector4(1, 0, 0, 1);
  var green = new THREE.Vector4(0, 0.5, 0, 1);
  var orange = new THREE.Vector4(1, 0.6, 0.2, 1);

  viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, function () {
    listElements(function (listA, listB) {
      // make all elements as ghost
      viewer.isolate(-1);
      viewer.clearThemingColors(modelA);
      viewer.clearThemingColors(modelB);

      for (var extIdA in listA) {
        if (listB[extIdA] != null) continue;
        var dbIdA = listA[extIdA].dbId;
        removed[extIdA] = dbIdA;
        console.log('Removed dbId: ' + dbIdA);
        viewer.impl.visibilityManager.show(dbIdA, modelA);
        viewer.setThemingColor(dbIdA, red, modelA);
      }

      for (var extIdB in listB) {
        if (listA[extIdB] != null) continue;
        var dbIdB = listB[extIdB].dbId
        added[extIdB] = dbIdB;
        console.log('Added dbId: ' + dbIdB);
        viewer.impl.visibilityManager.show(dbIdB, modelB);
        viewer.setThemingColor(dbIdB, green, modelB);
      }

      for (var extId in listA) {
        if (typeof listB[extId] === 'undefined') continue; // removed dbId

        var dbId = listA[extId].dbId; // should be the same as listB[extId]
        var propsA = listA[extId].properties;
        var propsB = listB[extId].properties;

        for (var i = 0; i < propsA.length; i++) {
          if (propsB[i] == null) continue;
          if (propsA[i].displayCategory.indexOf('__')==0) continue; // internal properties
          if (propsA[i].displayValue != propsB[i].displayValue) {
            console.log('Property ' + dbId + ': ' + propsA[i].displayName + ' changed from '
              + propsA[i].displayValue + ' to ' + propsB[i].displayValue);
            modified[extId] = dbId;
          }
        }

        if (typeof modified[extId] != 'undefined') {
          console.log('Modified dbId: ' + dbId);
          // color on both models
          //viewer.impl.visibilityManager.show(dbId, modelA);
          //viewer.impl.visibilityManager.show(dbId, modelB);
          viewer.setThemingColor(dbId, orange, modelA);
          viewer.setThemingColor(dbId, orange, modelB);
        }
      }
    });
  });

  function listElements(callback) {
    getAllLeafComponents(modelA, function (modelAdbIds) {
      getAllLeafComponents(modelB, function (modelBdbIds) {
        // this count will help wait until getProperties end all callbacks
        var count = modelAdbIds.length + modelBdbIds.length;

        var modelAExtIds = {};
        modelAdbIds.forEach(function (modelAdbId) {
          modelA.getProperties(modelAdbId, function (modelAProperty) {
            modelAExtIds[modelAProperty.externalId] = {'dbId': modelAdbId, 'properties': modelAProperty.properties};
            count--;
            if (count == 0) callback(modelAExtIds, modelBExtIds);
          });
        });

        var modelBExtIds = {};
        modelBdbIds.forEach(function (modelBdbId) {
          modelB.getProperties(modelBdbId, function (modelBProperty) {
            modelBExtIds[modelBProperty.externalId] = {'dbId': modelBdbId, 'properties': modelBProperty.properties};
            count--;
            if (count == 0) callback(modelAExtIds, modelBExtIds);
          });
        });
      });
    });
  }


  function getAllLeafComponents(model, callback) {
    var components = [];

    function getLeafComponentsRec(tree, parentId) {
      if (tree.getChildCount(parentId) > 0) {
        tree.enumNodeChildren(parentId, function (childId) {
          getLeafComponentsRec(tree, childId);
        });
      }
      else
        components.push(parentId);
      return components;
    }

    var instanceTree = model.getInstanceTree();
    var allLeafComponents = getLeafComponentsRec(instanceTree, instanceTree.nodeAccess.rootId);
    callback(allLeafComponents);
  }

  return true;
};

VersionChanges.prototype.unload = function () {
  return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('Autodesk.Forge.Samples.VersionChanges', VersionChanges);