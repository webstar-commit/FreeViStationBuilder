import * as THREE from '../../vendor/three.js';

function getCommand(scope, clara, name) {
  const greenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  let prevSelectedItem = null;

  function getScale(boundingBox, sizeOfSymbol) {
    const { max, min } = boundingBox;
    const dX = max.x - min.x,
      dZ = max.z - min.z;
    const radius = Math.sqrt(dX * dX + dZ * dZ);
    return radius / sizeOfSymbol;
  }

  const cone = new THREE.ConeGeometry(0.2, 0.6, 25);
  const translateGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 32);
  const coneClone = cone.clone();
  cone.translate(0, 1.5, 0);
  coneClone.rotateX(Math.PI);
  coneClone.translate(0, -1.5, 0);
  translateGeometry.merge(cone);
  translateGeometry.merge(coneClone);

  const clone = translateGeometry.clone();
  clone.rotateZ(Math.PI / 2);
  translateGeometry.merge(clone);

  const translateSymbol = new THREE.Mesh(translateGeometry, greenMaterial);
  translateSymbol.position.set(0, 0.1, 0);
  translateSymbol.rotateX(Math.PI / 2);
  translateSymbol.name = 'translateSymbol';

  const cone1 = new THREE.ConeGeometry(0.2, 0.6, 25);
  const rotateGeometry = new THREE.TorusGeometry(1.5, 0.05, 16, 100, 2.5);
  cone1.rotateX(Math.PI);
  cone1.translate(1.45, 0, 0);
  rotateGeometry.merge(cone1);

  const clone1 = rotateGeometry.clone();
  clone1.rotateZ(Math.PI);
  rotateGeometry.merge(clone1);

  const rotateSymbol = new THREE.Mesh(rotateGeometry, greenMaterial);
  rotateSymbol.position.set(0, 0.1, 0);
  rotateSymbol.rotateX(Math.PI / 2);

  const commands = {
    rotateItem: {
      widget: {
        draw: function(manipObject) {
          manipObject.add(rotateSymbol);
        },
        remove: function(manipObject) {
          manipObject.remove(rotateSymbol);
        },
        position: function(manipObject) {
          const { selectedItem } = scope.props;
          const selectedPosition = new THREE.Vector3().setFromMatrixPosition(
            clara.scene.getWorldTransform(selectedItem)
          );
          if (prevSelectedItem !== selectedItem) {
            const bb = clara._store
              .getTranslator()
              .getNodeBoundingBox(selectedItem);
            const scale = getScale(bb, 2.95);
            //manipObject.children[0].scale.set(scale, scale, scale);
            prevSelectedItem = selectedItem;
          }
          manipObject.position.copy(selectedPosition);
        },
      },
      tool: {
        drag: function(ev) {
          const bb = ev.rect;
          const { selectedItem, sceneId } = scope.props;
          const rotSybId = scope.state.rotateSymbol;
          if (!this.active) return false;
          if (!selectedItem) return;

          return {
            momentum: false,
            handle: function(ev) {
              const { THREE } = clara.deps;
              const degrees = 360 * ev.deltaX / bb.width;
              const id = clara.scene.find({
                from: { id: selectedItem },
                shallow: true,
                name: 'Rotate Root',
              });
              const rotation = clara.scene.get({
                id: id,
                plug: 'Transform',
                operatorIndex: 0,
                property: 'rotation',
              });
              clara.scene.set(
                { id: id, plug: 'Transform', property: 'rotation' },
                { x: rotation.x, y: rotation.y + degrees, z: rotation.z }
              );
            },
          };
        },
        mouseup: function(ev) {
          const { selectedItem, sceneId, showPopupButton } = scope.props;
          if (!this.active) return false;
          if (!selectedItem) return;
          showPopupButton();
        },
      },
    },
    translateItem: {
      widget: {
        draw: function(manipObject) {
          manipObject.add(translateSymbol);
        },
        remove: function(manipObject) {
          manipObject.remove(translateSymbol);
        },
        position: function(manipObject) {
          const { selectedItem } = scope.props;
          const selectedPosition = new THREE.Vector3().setFromMatrixPosition(
            clara.scene.getWorldTransform(selectedItem)
          );
          const bb = clara._store
            .getTranslator()
            .getNodeBoundingBox(selectedItem);
          const scale = getScale(bb, 2.4);
          //manipObject.children[0].scale.set(scale, scale, scale);
          manipObject.position.copy(selectedPosition);
        },
      },
      tool: {
        drag: function(ev) {
          const bb = ev.rect;
          const { selectedItem, sceneId, hidePopupButton } = scope.props;
          if (!this.active) return false;
          if (!selectedItem) return;

          return {
            momentum: false,
            handle: function(ev) {
              const { THREE } = clara.deps;
              const camId = clara.player.getCamera();
              const cam = clara.scene.get({ id: camId, evalPlug: 'Camera' });
              const camType = cam ? cam.projection : 'perspective';
              //TODO: add orthographic support
              let camAttrs = [
                'fieldOfView',
                'aspectRatio',
                'nearClip',
                'farClip',
              ];
              let defaultCamAttrs = [45, 16.0 / 9.0, 10, 50000];
              camAttrs = camAttrs.map((attr, index) => {
                return cam ? cam[attr] : defaultCamAttrs[index];
              });
              const cameraProjectionMatrix = new THREE.Matrix4();
              var near = camAttrs[2],
                top = near * Math.tan(Math.PI / 180 * 0.5 * camAttrs[0]),
                height = 2 * top,
                width = camAttrs[1] * height,
                left = -0.5 * width,
                far = camAttrs[3];
              cameraProjectionMatrix.makePerspective(
                left,
                left + width,
                top,
                top - height,
                near,
                far
              );
              const cameraWorldMatrix = clara.player.getCameraWorldTransform();
              const cameraPosition = new THREE.Vector3().setFromMatrixPosition(
                cameraWorldMatrix
              );

              const worldUnprojectMatrix = new THREE.Matrix4()
                .getInverse(cameraProjectionMatrix, true)
                .premultiply(cameraWorldMatrix);
              const worldProjectMatrix = new THREE.Matrix4().getInverse(
                worldUnprojectMatrix,
                true
              );
              const pos = clara.scene.get({
                id: selectedItem,
                plug: 'Transform',
                property: 'translation',
              });
              const itemPosition = new THREE.Vector3(pos.x, pos.y, pos.z);
              const ndcRef = new THREE.Vector3()
                .copy(itemPosition)
                .applyMatrix4(worldProjectMatrix);
              const mouseDelta = new THREE.Vector2(
                2 * ev.deltaX / bb.x,
                -2 * ev.deltaY / bb.y
              );
              const origin = new THREE.Vector3(0, 0, ndcRef.z).applyMatrix4(
                worldUnprojectMatrix
              );
              const destination = new THREE.Vector3(
                mouseDelta.x,
                mouseDelta.y,
                ndcRef.z
              ).applyMatrix4(worldUnprojectMatrix);
              destination.sub(origin);
              itemPosition.add(destination);

              const offsetDirection = new THREE.Vector3().subVectors(
                itemPosition,
                cameraPosition
              );
              const offsetScale =
                -(cameraPosition.y - 0.05) /
                  (itemPosition.y - cameraPosition.y) -
                1;
              itemPosition.addScaledVector(offsetDirection, offsetScale);
              itemPosition.y = 0.05;
              clara.scene.set(
                {
                  id: selectedItem,
                  plug: 'Transform',
                  property: 'translation',
                },
                itemPosition
              );
              hidePopupButton();
            },
          };
        },
        mouseup: function(ev) {
          const {
            selectedItem,
            sceneId,
            showPopupButton,
            changePopupButtonPosition,
          } = scope.props;
          if (!this.active) return false;
          if (!selectedItem) return;

          // var pos = scope.state.clara._store
          //   .getTranslator()
          //   .toScreenPosition(scope.props.selectedItem);
          // scope.props.changePopupButtonPosition(pos.x - 150, pos.y - 50);
          scope.props.showPopupButton();
        },
      },
    },
  };
  return commands[name];
}
export default getCommand;
