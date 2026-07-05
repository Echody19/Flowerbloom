const hero = document.querySelector('.home-hero');
const soundToggle = document.querySelector('.home-sound-toggle');

let audioContext;
let masterGain;
let soundOn = false;

function updateSoundButton(pending = false) {
  if (!soundToggle) {
    return;
  }

  soundToggle.setAttribute('aria-pressed', String(soundOn));
  soundToggle.textContent = pending ? '点按开声' : soundOn ? '有声' : '声音';
}

function createNoiseBuffer(context) {
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;

  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.018 * white) / 1.018;
    data[index] = last * 3.2;
  }

  return buffer;
}

function ensureAmbience() {
  if (audioContext) {
    return true;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    if (soundToggle) {
      soundToggle.hidden = true;
    }

    return false;
  }

  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioContext.destination);

  const noise = audioContext.createBufferSource();
  const noiseFilter = audioContext.createBiquadFilter();
  const noiseGain = audioContext.createGain();
  noise.buffer = createNoiseBuffer(audioContext);
  noise.loop = true;
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 760;
  noiseFilter.Q.value = 0.5;
  noiseGain.gain.value = 0.12;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start();

  [174, 261.63, 329.63].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.018 : 0.008;
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start();
  });

  return true;
}

async function startAmbience(isAutoplay = false) {
  if (!ensureAmbience()) {
    return;
  }

  await audioContext.resume();
  const now = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setTargetAtTime(0.075, now, 0.7);
  soundOn = true;
  updateSoundButton(false);

  if (!isAutoplay) {
    document.body.classList.add('home-audio-started');
  }
}

function stopAmbience() {
  if (!audioContext || !masterGain) {
    return;
  }

  const now = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setTargetAtTime(0, now, 0.45);
  soundOn = false;
  updateSoundButton(false);
}

function handleAction(action) {
  if (action === 'toggle-sound') {
    if (window.EchoBloomPageAudio) {
      soundOn = window.EchoBloomPageAudio.toggle();
      updateSoundButton(false);
      return;
    }

    startAmbience(false).catch(() => updateSoundButton(true));
    return;
  }

  if (action === 'chat-with-spirit') {
    window.location.href = 'chat.html';
    return;
  }

  if (action === 'enter-garden') {
    window.location.href = 'garden.html';
  }
}

function setParallax(event) {
  if (!hero) {
    return;
  }

  const rect = hero.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  hero.style.setProperty('--scene-x', `${(-x * 10).toFixed(2)}px`);
  hero.style.setProperty('--scene-y', `${(-y * 7).toFixed(2)}px`);
}

function resetParallax() {
  if (!hero) {
    return;
  }

  hero.style.setProperty('--scene-x', '0px');
  hero.style.setProperty('--scene-y', '0px');
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action]');

  if (!trigger) {
    return;
  }

  handleAction(trigger.dataset.action);
});

if (hero && window.matchMedia('(pointer: fine)').matches) {
  hero.addEventListener('pointermove', setParallax);
  hero.addEventListener('pointerleave', resetParallax);
}

window.addEventListener('load', () => {
  soundOn = Boolean(window.EchoBloomPageAudio?.isPlaying());
  updateSoundButton(false);
});

if (window.EchoBloomPageAudio) {
  window.EchoBloomPageAudio.onStateChange(({ playing }) => {
    soundOn = Boolean(playing);
    updateSoundButton(false);
  });
}
