
  function enableShadow() {
    this.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  
  function is(obj, what) {
    return obj.name.indexOf(what) >= 0;
  }

  function onError(error) {
    const msg = console.error(JSON.stringify(error));
    console.error(error);
  }