const configActions = {
  show: (scene, name, value, baseNode) => {
    return scene.setAll({ from:{id:baseNode}, name: name, plug: 'Properties', property: 'visible' }, true)
  },

  hide: (scene, name, value, baseNode) => {
    return scene.setAll({ from:{id:baseNode}, name: name, plug: 'Properties', property: 'visible' }, false)
  },

  setMaterial: (scene, query, reference, baseNode, sceneId) => {
    const mat = scene.find({from:{id:sceneId}, name: reference});
    if (mat) return scene.setAll({ from:{id:baseNode}, name: query, plug: 'Material', property: 'reference' }, mat);
    return Promise.resolve(true);
  },

  setImage: (scene, query, reference, baseNode, sceneId) => {
    const ref = scene.find({from:{id:sceneId}, name: reference});
    if (ref) return scene.setAll({ from:{id:baseNode}, name: query, plug: 'Material', property: 'baseMap' }, ref);
    return Promise.resolve(true);
  },

  setDefaultColor: (scene, query, value, baseNode) => {
    return scene.setAll({ from:{id:baseNode}, name: query, plug: 'Material', property: 'defaultColor' }, value);
  },

  openAnnotation: (scene, query, baseNode) => {
    return Promise.all(scene.filter(query).map(annotations.openAnnotation));
  },

  closeAnnotation: (scene, query, baseNode) => {
    return Promise.all(scene.filter(query).map(annotations.closeAnnotation));
  },

  set: (scene, query, value, baseNode) => {
    //console.log('set: ', query, typeof value, value);
    const newQuery = Object.assign({}, query, {from:{id:baseNode}});
    return scene.setAll(newQuery, value);
  },
};


export default configActions;
