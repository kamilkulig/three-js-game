

  // Util function for fbx models
  function enableShadow() {
    this.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }