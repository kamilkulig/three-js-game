
  function enableShadow() {
    this.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  function onError(error) {
    const msg = console.error(JSON.stringify(error));
    console.error(error);
  }