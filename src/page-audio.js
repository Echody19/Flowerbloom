(() => {
  if (window.EchoBloomPageAudio) {
    return;
  }

  const entryAudio = new Audio(new URL('../enter.mp3', import.meta.url).href);
  const loopAudio = new Audio(new URL('../long.mp3', import.meta.url).href);
  const listeners = new Set();
  let entryTimerId = 0;
  let started = false;
  let waitingForGesture = false;

  entryAudio.preload = 'auto';
  loopAudio.preload = 'auto';
  loopAudio.loop = true;

  function isPlaying() {
    return !entryAudio.paused || !loopAudio.paused;
  }

  function emitState() {
    const detail = { playing: isPlaying() };

    listeners.forEach((listener) => listener(detail));
    window.dispatchEvent(new CustomEvent('echobloom-audio-state', { detail }));
  }

  function removeGestureFallback() {
    if (!waitingForGesture) {
      return;
    }

    waitingForGesture = false;
    document.removeEventListener('pointerdown', handleGestureFallback);
    document.removeEventListener('keydown', handleGestureFallback);
  }

  function waitForGesture() {
    if (waitingForGesture) {
      return;
    }

    waitingForGesture = true;
    document.addEventListener('pointerdown', handleGestureFallback, { once: true });
    document.addEventListener('keydown', handleGestureFallback, { once: true });
  }

  function startLoopAudio() {
    entryAudio.pause();
    loopAudio.currentTime = 0;
    loopAudio.play()
      .then(emitState)
      .catch(() => {
        started = false;
        emitState();
        waitForGesture();
      });
  }

  function start(force = false) {
    if (started && !force) {
      return;
    }

    started = true;
    removeGestureFallback();
    window.clearTimeout(entryTimerId);
    loopAudio.pause();
    loopAudio.currentTime = 0;
    entryAudio.currentTime = 0;

    entryAudio.play()
      .then(() => {
        emitState();
        entryTimerId = window.setTimeout(startLoopAudio, 5000);
      })
      .catch(() => {
        started = false;
        emitState();
        waitForGesture();
      });
  }

  function pause() {
    started = false;
    window.clearTimeout(entryTimerId);
    entryAudio.pause();
    loopAudio.pause();
    emitState();
  }

  function toggle() {
    if (isPlaying()) {
      pause();
      return false;
    }

    start(true);
    return true;
  }

  function onStateChange(listener) {
    listeners.add(listener);
    listener({ playing: isPlaying() });
    return () => listeners.delete(listener);
  }

  function handleGestureFallback() {
    removeGestureFallback();
    start(true);
  }

  window.EchoBloomPageAudio = {
    start,
    pause,
    toggle,
    isPlaying,
    onStateChange,
  };

  start();
})();
