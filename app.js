// State variables
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const indicatorsContainer = document.getElementById('slideIndicators');

// Debounce flag for scroll events
let isScrolling = false;
const scrollDebounceTime = 1000;

// Swipe gesture detection variables
let touchStartY = 0;
let touchEndY = 0;
let touchStartX = 0;
let touchEndX = 0;

// Web Audio API Synthesizer for Epic Ambience
class EpicAmbientSynth {
    constructor() {
        this.ctx = null;
        this.nodes = [];
        this.isPlaying = false;
        this.lfo = null;
    }

    init() {
        // Initialize audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    }

    start() {
        if (this.isPlaying) return;
        if (!this.ctx) this.init();

        // Resume context in case browser blocked it
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.isPlaying = true;
        this.nodes = [];

        // Synthesize an epic deep drone: root (E1 = 41.2Hz) + fifth (B1 = 61.7Hz) + octave (E2 = 82.4Hz)
        const frequencies = [41.2, 61.7, 82.4, 123.47];
        
        // Low pass filter to make it very dark and atmospheric
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, this.ctx.currentTime);
        filter.Q.setValueAtTime(1, this.ctx.currentTime);
        filter.connect(this.ctx.destination);
        this.nodes.push(filter);

        // Master gain
        const masterGain = this.ctx.createGain();
        masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 3.0); // Fade in
        masterGain.connect(filter);
        this.nodes.push(masterGain);

        // Create oscillators
        frequencies.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = idx === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            // Subtle volume variation per oscillator
            gain.gain.setValueAtTime(idx === 0 ? 0.4 : 0.2, this.ctx.currentTime);
            
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(0);
            
            this.nodes.push(osc);
            this.nodes.push(gain);
        });

        // LFO (Low Frequency Oscillator) to modulate filter cutoff for a swell/breathing effect
        this.lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        
        this.lfo.type = 'sine';
        this.lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime); // Very slow: every 6 seconds
        lfoGain.gain.setValueAtTime(50, this.ctx.currentTime); // Modulate by 50Hz
        
        this.lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        this.lfo.start(0);
        
        this.nodes.push(this.lfo);
        this.nodes.push(lfoGain);
    }

    stop() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        
        // Find master gain if exists and fade out
        this.nodes.forEach(node => {
            if (node instanceof GainNode && node.gain.value > 0.05) {
                node.gain.setValueAtTime(node.gain.value, this.ctx.currentTime);
                node.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
            }
        });

        setTimeout(() => {
            if (!this.isPlaying && this.ctx) {
                // Stop oscillators
                this.nodes.forEach(node => {
                    if (node instanceof OscillatorNode) {
                        try { node.stop(); } catch (e) {}
                    }
                });
                this.nodes = [];
            }
        }, 1100);
    }

    // Play a brief high quality sound effect (e.g. rumble for division, chime for success)
    playEffect(type) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime;
        
        if (type === 'rumble') {
            // Earth rumble sound (low pass noise + deep sine sweeps)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(25, now + 1.5);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(90, now);
            filter.frequency.exponentialRampToValueAtTime(30, now + 1.5);

            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 2.0);
        } else if (type === 'chime') {
            // Golden success chime (pentatonic bell sounds)
            const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50]; // C5, E5, G5, B5, C6
            
            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                
                gain.gain.setValueAtTime(0.0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);
                
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 1.5);
            });
        } else if (type === 'beep') {
            // Warning beep
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.4);
        }
    }
}

// Instantiate Synth
const ambientSynth = new EpicAmbientSynth();

// Sound Toggle Event
const soundToggle = document.getElementById('soundToggle');
const soundPanel = document.getElementById('soundControlPanel');

soundToggle.addEventListener('click', () => {
    if (ambientSynth.isPlaying) {
        ambientSynth.stop();
        soundPanel.classList.remove('playing');
        soundToggle.querySelector('.icon').innerText = '🔇';
    } else {
        ambientSynth.start();
        soundPanel.classList.add('playing');
        soundToggle.querySelector('.icon').innerText = '🔊';
    }
});

// Setup Slide Indicators (Dots)
function setupIndicators() {
    indicatorsContainer.innerHTML = '';
    slides.forEach((_, idx) => {
        const dot = document.createElement('button');
        dot.classList.add('indicator-dot');
        if (idx === 0) dot.classList.add('active');
        dot.setAttribute('aria-label', `Ir a diapositiva ${idx + 1}`);
        dot.addEventListener('click', () => goToSlide(idx));
        indicatorsContainer.appendChild(dot);
    });
}

// Update UI indicator state
function updateIndicators() {
    const dots = document.querySelectorAll('.indicator-dot');
    dots.forEach((dot, idx) => {
        if (idx === currentSlide) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Update Slide Navigation Buttons (prev / next)
function updateNavButtons() {
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === slides.length - 1;
}

// Main function to display a slide
function goToSlide(index) {
    if (index < 0 || index >= slides.length) return;
    
    // Deactivate current slide
    slides[currentSlide].classList.remove('active');
    
    // Activate new slide
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    
    // Sync dots and buttons
    updateIndicators();
    updateNavButtons();

    // Trigger slide specific logic
    handleSlideAnimations(currentSlide);
}

// Perform animations/logic specific to slides on entry
function handleSlideAnimations(slideIdx) {
    // Reset components on other slides when entering them
    
    // Slide 4: Count down resetting
    if (slideIdx !== 3) {
        resetTimer();
    } else {
        // Trigger alert tone on countdown slide entry if synth active
        if (ambientSynth.isPlaying) {
            ambientSynth.playEffect('beep');
        }
    }
    
    // Slide 7: Crown split resetting
    if (slideIdx !== 6) {
        resetRupture();
    }
}

// Slide navigation bindings
prevBtn.addEventListener('click', () => {
    goToSlide(currentSlide - 1);
});

nextBtn.addEventListener('click', () => {
    goToSlide(currentSlide + 1);
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Space') {
        if (e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            goToSlide(currentSlide + 1);
        }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            goToSlide(currentSlide - 1);
        }
    }
});

// Mouse Scroll Wheel Navigation with Debounce
document.addEventListener('wheel', (e) => {
    if (e.target.tagName === 'TEXTAREA') return; // Don't block scroll in textarea

    if (isScrolling) return;

    if (e.deltaY > 20) {
        // Scroll down / Siguiente
        isScrolling = true;
        goToSlide(currentSlide + 1);
        setTimeout(() => { isScrolling = false; }, scrollDebounceTime);
    } else if (e.deltaY < -20) {
        // Scroll up / Anterior
        isScrolling = true;
        goToSlide(currentSlide - 1);
        setTimeout(() => { isScrolling = false; }, scrollDebounceTime);
    }
}, { passive: false });

// Touch/Swipe Gesture Navigation
document.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.closest('.choice-card') || e.target.closest('#ruptureBtn') || e.target.closest('#timerActionBtn')) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
});

document.addEventListener('touchend', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.closest('.choice-card') || e.target.closest('#ruptureBtn') || e.target.closest('#timerActionBtn')) return;
    
    touchEndY = e.changedTouches[0].clientY;
    touchEndX = e.changedTouches[0].clientX;
    
    const diffY = touchStartY - touchEndY;
    const diffX = touchStartX - touchEndX;

    // Detect vertical swipe (upward for next, downward for prev)
    if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
        if (diffY > 0) {
            goToSlide(currentSlide + 1);
        } else {
            goToSlide(currentSlide - 1);
        }
    }
    // Detect horizontal swipe (leftward for next, rightward for prev)
    else if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
            goToSlide(currentSlide + 1);
        } else {
            goToSlide(currentSlide - 1);
        }
    }
});


/* ==========================================
   INTERACTIVE ELEMENTS CODE
   ========================================== */

// --- Slide 4: Countdown Timer ---
const timerText = document.getElementById('countdownTimer');
const timerActionBtn = document.getElementById('timerActionBtn');
const timerCircle = document.querySelector('.timer-circle');
let timerInterval = null;
let timerPhase = 0; // 0 = 3 days, 1 = 2 days, 2 = 1 day, 3 = finished

timerActionBtn.addEventListener('click', () => {
    if (timerInterval) return;
    
    timerActionBtn.disabled = true;
    timerCircle.classList.add('active');
    
    timerInterval = setInterval(() => {
        timerPhase++;
        
        // Sound beep on each tick if synth is running
        ambientSynth.playEffect('beep');

        if (timerPhase === 1) {
            timerText.innerText = "2 DIAS";
        } else if (timerPhase === 2) {
            timerText.innerText = "1 DIA";
        } else if (timerPhase === 3) {
            clearInterval(timerInterval);
            timerText.innerText = "💥 FIN";
            timerCircle.classList.remove('active');
            timerActionBtn.innerText = "Tiempo Agotado";
            
            // Play heavier shake/alert rumble
            ambientSynth.playEffect('rumble');
            
            // Advance slide after a slight delay to feel the consequence
            setTimeout(() => {
                goToSlide(4); // Advance to choices screen
            }, 1200);
        }
    }, 1000);
});

function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerPhase = 0;
    timerText.innerText = "3 DIAS";
    timerCircle.classList.remove('active');
    timerActionBtn.disabled = false;
    timerActionBtn.innerText = "Sentir la Presión";
}


// --- Slide 5: Choose Advice ---
const choiceElders = document.getElementById('choiceElders');
const choiceYouth = document.getElementById('choiceYouth');

choiceElders.addEventListener('click', () => {
    choiceElders.classList.add('selected-wisdom');
    choiceYouth.classList.remove('selected-pride');
    ambientSynth.playEffect('chime');
    
    // Auto-advance slightly to decision after showing selection
    setTimeout(() => {
        // Highlight youth advice to show contrasting choice Roboam made
        choiceElders.classList.remove('selected-wisdom');
        choiceYouth.classList.add('selected-pride');
        ambientSynth.playEffect('beep');
        
        setTimeout(() => {
            goToSlide(5); // Go to Slide 6 (La Decisión)
        }, 1500);
    }, 1800);
});

choiceYouth.addEventListener('click', () => {
    choiceYouth.classList.add('selected-pride');
    choiceElders.classList.remove('selected-wisdom');
    ambientSynth.playEffect('rumble');

    setTimeout(() => {
        goToSlide(5); // Go to Slide 6 (La Decisión)
    }, 1200);
});


// --- Slide 7: Interactive Rupture (Kingdom Division) ---
const crown = document.getElementById('kingdomCrown');
const ruptureBtn = document.getElementById('ruptureBtn');
const resetRuptureBtn = document.getElementById('resetRuptureBtn');

ruptureBtn.addEventListener('click', () => {
    crown.classList.add('ruptured');
    ruptureBtn.style.display = 'none';
    resetRuptureBtn.style.display = 'inline-block';
    
    // Play dramatic seismic rupture audio effect
    ambientSynth.playEffect('rumble');
    
    // Trigger screen flash (via adding class or shaking)
    document.getElementById('ruptureText').innerText = "❌ EL REINO SE HA DIVIDIDO: Israel del Norte rechaza a la dinastía de David.";
    document.getElementById('ruptureText').style.color = "var(--accent-crimson)";
    document.getElementById('ruptureText').style.fontWeight = "bold";
});

resetRuptureBtn.addEventListener('click', () => {
    resetRupture();
});

function resetRupture() {
    crown.classList.remove('ruptured');
    ruptureBtn.style.display = 'inline-block';
    resetRuptureBtn.style.display = 'none';
    document.getElementById('ruptureText').innerText = "El reino unificado de David y Salomón se rompe en dos bloques irreparables.";
    document.getElementById('ruptureText').style.color = "var(--text-muted)";
    document.getElementById('ruptureText').style.fontWeight = "normal";
}


// --- Slide 12: Stars Generator & Reflection Saving ---
function generateStars() {
    const starsOverlay = document.getElementById('starsOverlay');
    if (!starsOverlay) return;

    starsOverlay.innerHTML = '';
    const numStars = 60;
    
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Random positions and sizes
        const size = Math.random() * 3 + 1; // 1px to 4px
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = Math.random() * 2 + 2;

        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${posX}%`;
        star.style.top = `${posY}%`;
        star.style.animationDelay = `${delay}s`;
        star.style.animationDuration = `${duration}s`;

        starsOverlay.appendChild(star);
    }
}

// Reflection save logic
const saveReflectionBtn = document.getElementById('saveReflectionBtn');
const reflectionInput = document.getElementById('reflectionInput');
const savedMessage = document.getElementById('savedMessage');
const userBox = document.querySelector('.user-reflection-box');

saveReflectionBtn.addEventListener('click', () => {
    const text = reflectionInput.value.trim();
    if (text.length > 0) {
        localStorage.setItem('roboam_reflection', text);
        
        userBox.style.display = 'none';
        savedMessage.style.display = 'block';
        
        // Play success tone
        ambientSynth.playEffect('chime');
    } else {
        reflectionInput.placeholder = "Por favor escribe una reflexión antes de guardar...";
        reflectionInput.focus();
    }
});


// Initialization
window.addEventListener('DOMContentLoaded', () => {
    setupIndicators();
    generateStars();
    
    // Load saved reflection if any
    const savedReflection = localStorage.getItem('roboam_reflection');
    if (savedReflection) {
        reflectionInput.value = savedReflection;
    }
});
