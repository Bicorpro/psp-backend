const cfg = require("./config.json");
const states = cfg.peter.states;
const WALK = states.find((st) => st.name === "WALK");

let pet = {
  state: WALK.name,
  speed: WALK.speed,
  minProb: WALK.minProb,
  streak: WALK.streak,
};

// define a start pos (Polygone building in Grenoble)
let pos = {
  latitude: 45.20415,
  longitude: 5.6933013,
};

function getPeterPos() {
  pos = calculateNextPos(pos);
  return {
    latitude: pos.latitude,
    longitude: pos.longitude,
    timestamp: new Date(),
  };
}

function calculateNextPos(pos) {
  // If streak reaches 0, switch to a new state
  if (pet.streak === 0) {
    const rnd = Math.random();
    let chosenSt = states.find((st) => rnd <= st.minProb);

    pet.state = chosenSt.name;
    pet.speed = chosenSt.speed;
    pet.minProb = chosenSt.minProb;
    pet.streak = chosenSt.streak;
  }

  pet.streak--;

  return {
    latitude: pos.latitude + randInt(-1, 1) * speedToDeg(pet.speed),
    longitude: pos.longitude + randInt(-1, 1) * speedToDeg(pet.speed),
  };
}

function randInt(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function speedToDeg(speed) {
  const dist = speed * (cfg.LoRaWan.delay / 3600);
  return dist / 111; // Convert distance from kmh to lat/long degrees
}

module.exports = { getPeterPos };
