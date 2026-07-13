// Hold the mouse button and drag to peek around the diorama; release and the
// camera glides back to the default framing. Pure look-around — it never
// changes presentation state.
export function bindOrbit(cameraRig, domElement) {
  let dragging = false;

  domElement.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    cameraRig.orbitDrag(e.movementX, e.movementY);
  });

  const stop = () => {
    if (!dragging) return;
    dragging = false;
    cameraRig.orbitRelease();
  };
  window.addEventListener('mouseup', stop);
  window.addEventListener('blur', stop);
}
