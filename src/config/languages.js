// Maps the language key the Android app sends to a Judge0 CE language ID.
// IDs are from Judge0's /languages endpoint (stable, well-known values).
const LANGUAGE_IDS = {
  python: 71, // Python 3.8.1
  java: 62,   // Java OpenJDK 13.0.1
  cpp: 54,    // C++ GCC 9.2.0
};

function resolveLanguageId(languageKey) {
  const id = LANGUAGE_IDS[languageKey];
  if (!id) {
    throw new Error(
      `Unsupported language "${languageKey}". Supported: ${Object.keys(LANGUAGE_IDS).join(", ")}`
    );
  }
  return id;
}

module.exports = { LANGUAGE_IDS, resolveLanguageId };