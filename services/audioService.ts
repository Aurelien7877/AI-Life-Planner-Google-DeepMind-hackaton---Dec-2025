// Soft, Organic UI Sounds

let ctx: AudioContext | null = null;

const getContext = () => {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ctx;
};

export const initAudio = () => {
  const context = getContext();
  if (context.state === 'suspended') {
    context.resume();
  }
};

export const playSound = (type: 'pop' | 'paper' | 'success' | 'delete' | 'typing') => {
  try {
    const context = getContext();
    if (context.state === 'suspended') context.resume();

    const osc = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    switch (type) {
      case 'pop':
        // Soft bubble pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'paper':
        // White noise burst (paper rustle)
        const bufferSize = context.sampleRate * 0.1;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = context.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = context.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1000;

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);

        noise.connect(noiseFilter);
        noiseFilter.connect(gain);
        gain.connect(context.destination);
        noise.start(now);
        break;

      case 'success':
        // Pleasant chord
        const frequencies = [523.25, 659.25, 783.99]; // C Major
        frequencies.forEach((freq, i) => {
          const o = context.createOscillator();
          const g = context.createGain();
          o.type = 'triangle';
          o.frequency.value = freq;
          
          g.gain.setValueAtTime(0.05, now + (i * 0.05));
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + (i * 0.05));
          
          o.connect(g);
          g.connect(context.destination);
          o.start(now + (i * 0.05));
          o.stop(now + 0.6);
        });
        break;

      case 'delete':
        // Soft thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'typing':
        // Very subtle click
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, now); // High freq but very short
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
        
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.01);
        break;
    }
  } catch (e) {
    // Ignore audio context errors
  }
};