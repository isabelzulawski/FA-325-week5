// drawing into music
// x = time, y = pitch
// each stroke = one continuous voice

let strokes = [];
let currentStroke = null;
let selectedSound = 0;
let voices = new Map();

let canvas;
let playButton;
let speedSlider;
let soundButtons = [];

let audio;
let master;
let playing = false;
let starting = false;
let playhead = 0;

const LEFT_EDGE = 40;
const RIGHT_EDGE = 760;
const TOP_EDGE = 70;
const BOTTOM_EDGE = 430;

// lower, softer pitch range: C major pentatonic
const notes = [130.81, 146.83, 164.81, 196, 220, 261.63];

// all sounds use smooth sine waves
// a second quiet oscillator gives a slow shimmer!
const sounds = [
  {
    label: "Blue · soft",
    colour: [135, 210, 255],
    offset: 0,
    blend: 0,
    level: 0.55
  },
  {
    label: "Purple · warm",
    colour: [195, 155, 255],
    offset: 0.6,
    blend: 0.25,
    level: 0.5
  },
  {
    label: "Orange · floating",
    colour: [255, 195, 120],
    offset: 1.2,
    blend: 0.35,
    level: 0.45
  }
];

function setup() {
  canvas = createCanvas(800, 500);
  pixelDensity(1);

  let soundRow = createDiv();
  soundRow.style("margin", "10px 0");

  sounds.forEach((sound, index) => {
    let button = createButton(sound.label);
    button.parent(soundRow);
    button.style("margin-right", "8px");
    button.style("padding", "8px 12px");
    button.style("cursor", "pointer");

    button.mousePressed(() => {
      selectedSound = index;
      updateSoundButtons();
    });

    soundButtons.push(button);
  });

  updateSoundButtons();

  let playbackRow = createDiv();

  playButton = createButton("Play drawing");
  playButton.parent(playbackRow);
  playButton.style("margin-right", "8px");
  playButton.mousePressed(togglePlayback);

  let clearButton = createButton("Clear");
  clearButton.parent(playbackRow);
  clearButton.style("margin-right", "12px");
  clearButton.mousePressed(clearDrawing);

  let label = createSpan("Playback duration ");
  label.parent(playbackRow);

  speedSlider = createSlider(4, 20, 12, 0.5);
  speedSlider.parent(playbackRow);

  let units = createSpan(" seconds");
  units.parent(playbackRow);
}

function updateSoundButtons() {
  soundButtons.forEach((button, index) => {
    let colour = sounds[index].colour;
    let selected = index === selectedSound;

    button.style(
      "background",
      selected ? `rgb(${colour.join(",")})` : "#202433"
    );

    button.style("color", selected ? "#10121c" : "#eeeeee");
    button.style(
      "border",
      selected
        ? "2px solid white"
        : "2px solid transparent"
    );
    button.style("border-radius", "6px");
  });
}

function draw() {
  background(12, 14, 26);

  drawGuides();
  drawStrokes();

  if (playing) {
    playhead = min(
      1,
      playhead + deltaTime / 1000 / speedSlider.value()
    );

    let x = lerp(LEFT_EDGE, RIGHT_EDGE, playhead);
    let positions = getPositions(x);

    updateVoices(positions);
    drawPlayhead(x, positions);

    if (playhead >= 1) {
      stopPlayback();
    }
  }

  noStroke();
  textAlign(LEFT);
  fill(220);
  textSize(16);
  text("drawing --> music", LEFT_EDGE, 30);

  fill(...sounds[selectedSound].colour);
  textSize(12);
  textAlign(RIGHT);
  text(sounds[selectedSound].label, RIGHT_EDGE, 30);
  textAlign(LEFT);

  fill(150, 160, 185);
  textSize(12);
  text(
    "choose a sound, then draw...the rules turn it into music!",
    LEFT_EDGE,
    465
  );
}

function drawGuides() {
  strokeWeight(1);

  for (let i = 0; i < notes.length; i++) {
    let y = map(
      i,
      0,
      notes.length - 1,
      BOTTOM_EDGE,
      TOP_EDGE
    );

    stroke(255, 255, 255, 15);
    line(LEFT_EDGE, y, RIGHT_EDGE, y);
  }

  noFill();
  stroke(255, 255, 255, 35);
  rect(
    LEFT_EDGE,
    TOP_EDGE,
    RIGHT_EDGE - LEFT_EDGE,
    BOTTOM_EDGE - TOP_EDGE
  );
}

function drawStrokes() {
  noFill();
  strokeWeight(3);

  for (let strokeData of strokes) {
    stroke(...sounds[strokeData.soundId].colour);

    let previous = null;

    for (let p of strokeData.points) {
      if (p === null) {
        previous = null;
        continue;
      }

      if (previous) {
        line(previous.x, previous.y, p.x, p.y);
      } else {
        point(p.x, p.y);
      }

      previous = p;
    }
  }
}

function drawPlayhead(x, positions) {
  stroke(230, 245, 255, 110);
  strokeWeight(1);
  line(x, TOP_EDGE, x, BOTTOM_EDGE);

  noStroke();

  for (let [strokeData, y] of positions) {
    let colour = sounds[strokeData.soundId].colour;

    // Soft glow, no splash.
    for (let size = 36; size >= 8; size -= 4) {
      fill(...colour, 7);
      circle(x, y, size);
    }

    fill(...colour, 220);
    circle(x, y, 6);

    fill(240, 245, 255);
    circle(x, y, 3);
  }
}

function insideCanvas() {
  return (
    mouseX >= LEFT_EDGE &&
    mouseX <= RIGHT_EDGE &&
    mouseY >= TOP_EDGE &&
    mouseY <= BOTTOM_EDGE
  );
}

function mousePressed(event) {
  if (event && event.target !== canvas.elt) return;
  if (!insideCanvas()) return;

  stopPlayback();

  currentStroke = {
    soundId: selectedSound,
    points: [{ x: mouseX, y: mouseY }]
  };

  strokes.push(currentStroke);
}

function mouseDragged() {
  if (!currentStroke) return;

  let points = currentStroke.points;

  if (insideCanvas()) {
    let previous = points[points.length - 1];

    if (previous) {
      let distance = dist(
        previous.x,
        previous.y,
        mouseX,
        mouseY
      );

      let steps = max(1, ceil(distance / 4));

      for (let i = 1; i <= steps; i++) {
        points.push({
          x: lerp(previous.x, mouseX, i / steps),
          y: lerp(previous.y, mouseY, i / steps)
        });
      }
    } else {
      points.push({ x: mouseX, y: mouseY });
    }
  } else if (points[points.length - 1] !== null) {
    points.push(null);
  }

  return false;
}

function mouseReleased() {
  currentStroke = null;
}

async function togglePlayback() {
  if (starting) return;

  if (playing) {
    stopPlayback();
    return;
  }

  if (strokes.length === 0) return;

  starting = true;

  try {
    if (!audio) {
      let AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      audio = new AudioContextClass();

      master = audio.createGain();
      master.gain.value = 0.18;
      master.connect(audio.destination);
    }

    await audio.resume();

    stopPlayback();
    playhead = 0;
    playing = true;
    playButton.html("Stop");
  } finally {
    starting = false;
  }
}

function getPositions(x) {
  let positions = new Map();

  for (let strokeData of strokes) {
    let previous = null;

    for (let p of strokeData.points) {
      if (p === null) {
        previous = null;
        continue;
      }

      if (previous) {
        let minX = min(previous.x, p.x);
        let maxX = max(previous.x, p.x);

        if (x >= minX && x <= maxX) {
          let dx = p.x - previous.x;

          let y =
            abs(dx) < 0.001
              ? (previous.y + p.y) / 2
              : lerp(
                  previous.y,
                  p.y,
                  (x - previous.x) / dx
                );

          positions.set(strokeData, y);
        }
      }

      previous = p;
    }
  }

  return positions;
}

function createVoice(sound, frequency) {
  let oscillator = audio.createOscillator();
  let shimmer = audio.createOscillator();

  let mainGain = audio.createGain();
  let shimmerGain = audio.createGain();
  let envelope = audio.createGain();

  oscillator.type = "sine";
  shimmer.type = "sine";

  oscillator.frequency.value = frequency;
  shimmer.frequency.value = frequency + sound.offset;

  // keep total level similar across the three sounds
  mainGain.gain.value = 1 / (1 + sound.blend);
  shimmerGain.gain.value = sound.blend / (1 + sound.blend);

  envelope.gain.value = 0;

  oscillator.connect(mainGain);
  shimmer.connect(shimmerGain);

  mainGain.connect(envelope);
  shimmerGain.connect(envelope);
  envelope.connect(master);

  // Disconnect the entire voice after both oscillators end.
  let ended = 0;

  function cleanUp() {
    ended++;

    if (ended === 2) {
      oscillator.disconnect();
      shimmer.disconnect();
      mainGain.disconnect();
      shimmerGain.disconnect();
      envelope.disconnect();
    }
  }

  oscillator.onended = cleanUp;
  shimmer.onended = cleanUp;

  oscillator.start();
  shimmer.start();

  return { oscillator, shimmer, envelope };
}

function updateVoices(positions) {
  let now = audio.currentTime;

  for (let [strokeData, voice] of voices) {
    if (!positions.has(strokeData)) {
      voice.envelope.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  for (let [strokeData, y] of positions) {
    let sound = sounds[strokeData.soundId];

    let scalePosition = constrain(
      map(
        y,
        BOTTOM_EDGE,
        TOP_EDGE,
        0,
        notes.length - 1
      ),
      0,
      notes.length - 1
    );

    let lower = floor(scalePosition);
    let upper = min(lower + 1, notes.length - 1);
    let fraction = scalePosition - lower;

    let frequency =
      notes[lower] *
      pow(notes[upper] / notes[lower], fraction);

    let voice = voices.get(strokeData);

    if (!voice) {
      voice = createVoice(sound, frequency);
      voices.set(strokeData, voice);
    }

    // gentle pitch changes and slow fades
    voice.oscillator.frequency.setTargetAtTime(
      frequency,
      now,
      0.08
    );

    voice.shimmer.frequency.setTargetAtTime(
      frequency + sound.offset,
      now,
      0.08
    );

    voice.envelope.gain.setTargetAtTime(
      sound.level / max(1, positions.size),
      now,
      0.1
    );
  }
}

function stopPlayback() {
  playing = false;
  playButton.html("Play drawing");

  if (!audio) return;

  let now = audio.currentTime;

  for (let voice of voices.values()) {
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setTargetAtTime(0, now, 0.06);

    voice.oscillator.stop(now + 0.4);
    voice.shimmer.stop(now + 0.4);
  }

  voices.clear();
}

function clearDrawing() {
  stopPlayback();
  strokes = [];
  currentStroke = null;
  playhead = 0;
}