function normalizeText(value, max = 100) {
  return String(value || '').trim().slice(0, max);
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function newId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

module.exports = {
  normalizeText,
  isValidUrl,
  toInt,
  newId
};
