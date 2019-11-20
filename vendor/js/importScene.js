window.importScene = function(el, viewEl, intoId, sceneId) {

  var api = claraplayer(el);
  var numImports = 0;

  function view() {
    var h = api.deps.h;
    var THREE = api.deps.THREE;
    var R = api.deps.ramda;

    function importScene() {
      api.sceneIO.fetch(sceneId).then(function() {
        var newObjectsId = api.scene.find({ from: { id: sceneId }, name: 'Objects' });
        var nodes = api.scene.filter({ from: { id: newObjectsId }, type: ['PolyMesh','BinMesh','Null'] });
        var objectsId = api.scene.find({ type: 'Objects' });

        api.sceneGraph.addNode({
          name: 'Import Null',
          parent: objectsId,
          type: 'Null',
          plugs: {
            Transform: [['Transform', {translation: {x: 0, y: numImports++/2, z: 0}}]],
          },
        }).then(function(nullNodeId) {
          api.sceneGraph.clone(nodes, {[newObjectsId]: nullNodeId}).then(function(nodeMap) {
            console.log('new nodes', nodeMap);
          });
        });
      });
    };

    return h('div', {style: {float: 'left'}}, [
      h('button.btn', {
        on: { click: importScene },
      }, 'Import'),
    ]);
  };

  var playerVNode = api.deps.patch(document.getElementById(viewEl), view());
  api.sceneIO.fetchAndUse(intoId);
  api.on('loaded', function() {
    console.log('loaded');
  });

  api.on('change', function() {
    playerVNode = api.deps.patch(playerVNode, view());
  });
};
