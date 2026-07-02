let dialToneInterval = null;
let ringtoneOsc = null;
let ringtoneInterval = null;

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playDialTone() {
  stopDialTone();
  const ctx = getAudioContext();

  let step = 0;
  const notes = [697, 770, 852, 941];

  function playTone() {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freq = notes[step % notes.length];
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.15;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.start(now);
    osc.stop(now + 0.12);

    step++;
  }

  playTone();
  dialToneInterval = setInterval(playTone, 150);
}

export function stopDialTone() {
  if (dialToneInterval) {
    clearInterval(dialToneInterval);
    dialToneInterval = null;
  }
}

export function playRingback() {
  stopRingback();
  const ctx = getAudioContext();
  let on = true;

  function playCycle() {
    if (!ringtoneInterval) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.value = 0.2;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  ringtoneInterval = setInterval(() => {
    playCycle();
  }, 1000);

  playCycle();
}

export function stopRingback() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

export function playRingtone() {
  stopRingtone();
  const ctx = getAudioContext();

  function playCycle() {
    if (!ringtoneInterval) return;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 440;
      osc.type = "sine";
      gain.gain.value = 0.3;

      const startTime = ctx.currentTime + i * 0.4;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    }
  }

  ringtoneInterval = setInterval(playCycle, 2000);
  playCycle();
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

export function playConnectSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = 800;
  osc.type = "sine";
  gain.gain.value = 0.2;

  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.linearRampToValueAtTime(1000, now + 0.1);
  osc.frequency.linearRampToValueAtTime(800, now + 0.2);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function playDisconnectSound() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = 480;
  osc.type = "sine";
  gain.gain.value = 0.2;

  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(480, now);
  osc.frequency.linearRampToValueAtTime(380, now + 0.15);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);
}

export function stopAllSounds() {
  stopDialTone();
  stopRingback();
  stopRingtone();
}
