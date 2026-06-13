const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEAPI_URL = "https://www.timeapi.io/api/v1/timezone/coordinate";

const signsList = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const signsHindi = [
  "Mesh", "Vrishabh", "Mithun", "Kark", "Simha", "Kanya",
  "Tula", "Vrishchik", "Dhanu", "Makar", "Kumbha", "Meen"
];

const nakshatrasList = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

// Helper to clean/parse values
function cleanText(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return value.name || value.title || JSON.stringify(value);
  }
  return "Unavailable";
}

function normalizePlanetResponse(response) {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response.filter((item) => item && typeof item === "object");
  }

  return Object.entries(response)
    .filter(([key]) => /^\d+$/.test(key))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, value]) => value)
    .filter((item) => item && typeof item === "object" && (item.name || item.full_name));
}

function getPlanetSign(planet) {
  return planet.sign || planet.zodiac || planet.rasi || planet.full_name || "Unknown";
}

function toPlainText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toPlainText).filter(Boolean).join(" > ");
  if (value && typeof value === "object") {
    return toPlainText(
      value.full_name ||
      value.name ||
      value.dasha ||
      value.mahadasha ||
      value.antardasha ||
      value.current_dasa ||
      value.birth_dasa ||
      value.lord ||
      value.label ||
      value.title ||
      value.value
    );
  }
  return "";
}

// -------------------------------------------------------------
// LOCAL ASTRONOMICAL ENGINE
// -------------------------------------------------------------
function computeAstrologyLocally(name, dob, tob, pob, loc) {
  const [year, month, day] = dob.split("-").map(Number);
  const [hour, minute] = tob.split(":").map(Number);
  const tzOffset = 5.5; // IST

  // Calculate JD
  let y = year;
  let m = month;
  let dVal = day + (hour + minute / 60 - tzOffset) / 24;

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dVal + B - 1524.5;
  const dDays = JD - 2451545.0;

  const ayanamsa = 23.85 + (0.0139 * dDays) / 365.25;
  const obliquity = (23.4392911 - 0.0000004 * dDays) * Math.PI / 180;

  const GMST = (280.46061837 + 360.98564736629 * dDays) % 360;
  const LST = (GMST + loc.longitude) % 360;
  const lstRad = LST * Math.PI / 180;
  const latRad = loc.latitude * Math.PI / 180;

  const num = -Math.cos(lstRad);
  const den = Math.sin(lstRad) * Math.cos(obliquity) + Math.tan(latRad) * Math.sin(obliquity);
  let ascTropical = Math.atan2(num, den) * 180 / Math.PI;
  if (ascTropical < 0) ascTropical += 360;

  const ascSidereal = (ascTropical - ayanamsa + 360) % 360;
  const lagnaSignNum = Math.floor(ascSidereal / 30) + 1;
  const lagnaSign = signsList[lagnaSignNum - 1];

  const calcPlanet = (baseLong, dailyMotion, meanAnomalyBase, anomalyMotion, coef1, coef2) => {
    const L = (baseLong + dailyMotion * dDays) % 360;
    const M = ((meanAnomalyBase + anomalyMotion * dDays) % 360) * Math.PI / 180;
    const tropical = L + coef1 * Math.sin(M) + coef2 * Math.sin(2 * M);
    return (tropical - ayanamsa + 360) % 360;
  };

  const sunLong = calcPlanet(280.466, 0.985647, 357.529, 0.985600, 1.915, 0.020);
  const moonLong = calcPlanet(218.316, 13.176396, 134.963, 13.064992, 6.289, 0.214);
  const marsLong = calcPlanet(355.453, 0.524021, 19.388, 0.524021, 4.500, 0.150);
  const jupLong = calcPlanet(34.404, 0.083085, 19.388, 0.083085, 5.500, 0.220);
  const satLong = calcPlanet(49.944, 0.033444, 317.020, 0.033444, 6.100, 0.310);

  const mercLong = (sunLong + 7.5 * Math.sin(((252.25 + 4.0923 * dDays) % 360) * Math.PI / 180)) % 360;
  const venLong = (sunLong + 3.4 * Math.sin(((181.98 + 1.6021 * dDays) % 360) * Math.PI / 180)) % 360;

  const rahuLong = (125.1228 - 0.05295376 * dDays + 360) % 360;
  const ketuLong = (rahuLong + 180) % 360;

  const getHouse = (planetLong) => {
    const planetSignNum = Math.floor(planetLong / 30) + 1;
    return (planetSignNum - lagnaSignNum + 12) % 12 + 1;
  };

  const getNakshatra = (long) => {
    const idx = Math.floor(long / (360 / 27));
    return nakshatrasList[idx % 27];
  };

  const formatSign = (long) => {
    const idx = Math.floor(long / 30);
    return `${signsList[idx]} (${signsHindi[idx]})`;
  };

  const planets = [
    { name: "Ascendant", sign: formatSign(ascSidereal), house: 1, nakshatra: getNakshatra(ascSidereal) },
    { name: "Sun", sign: formatSign(sunLong), house: getHouse(sunLong), nakshatra: getNakshatra(sunLong) },
    { name: "Moon", sign: formatSign(moonLong), house: getHouse(moonLong), nakshatra: getNakshatra(moonLong) },
    { name: "Mars", sign: formatSign(marsLong), house: getHouse(marsLong), nakshatra: getNakshatra(marsLong) },
    { name: "Mercury", sign: formatSign(mercLong), house: getHouse(mercLong), nakshatra: getNakshatra(mercLong) },
    { name: "Jupiter", sign: formatSign(jupLong), house: getHouse(jupLong), nakshatra: getNakshatra(jupLong) },
    { name: "Venus", sign: formatSign(venLong), house: getHouse(venLong), nakshatra: getNakshatra(venLong) },
    { name: "Saturn", sign: formatSign(satLong), house: getHouse(satLong), nakshatra: getNakshatra(satLong) },
    { name: "Rahu", sign: formatSign(rahuLong), house: getHouse(rahuLong), nakshatra: getNakshatra(rahuLong) },
    { name: "Ketu", sign: formatSign(ketuLong), house: getHouse(ketuLong), nakshatra: getNakshatra(ketuLong) }
  ];

  const moonSignIdx = Math.floor(moonLong / 30);
  const moonRashi = `${signsList[moonSignIdx]} (${signsHindi[moonSignIdx]})`;
  const moonNak = getNakshatra(moonLong);

  const dashaLords = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
  const dashaYears = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

  const moonNakLong = moonLong % (360 / 27);
  const nakTotalDegrees = 360 / 27;
  const fracRemaining = 1 - (moonNakLong / nakTotalDegrees);

  const startNakIdx = Math.floor(moonLong / nakTotalDegrees);
  const startLord = dashaLords[startNakIdx % 9];
  const startDashaDurationRemaining = dashaYears[startLord] * fracRemaining;

  const birthTimeMs = new Date(`${dob}T${tob}:00`).getTime();
  const diffYears = (Date.now() - birthTimeMs) / (365.25 * 24 * 60 * 60 * 1000);

  let currentDasha = "";
  if (diffYears < startDashaDurationRemaining) {
    currentDasha = `${startLord} / ${dashaLords[(startNakIdx + 1) % 9]}`;
  } else {
    let elapsed = startDashaDurationRemaining;
    let lordIdx = (startNakIdx % 9) + 1;
    while (elapsed < diffYears && lordIdx < 100) {
      const nextLord = dashaLords[lordIdx % 9];
      const duration = dashaYears[nextLord];
      if (elapsed + duration >= diffYears) {
        const subLord = dashaLords[(lordIdx + 2) % 9];
        currentDasha = `${nextLord} / ${subLord}`;
        break;
      }
      elapsed += duration;
      lordIdx++;
    }
  }

  // If calculation didn't result in a valid dasha, derive it from starting point
  if (!currentDasha) {
    currentDasha = `${startLord} / ${dashaLords[(startNakIdx + 1) % 9]}`;
  }

  const interpretations = {
    Aries: "Having an Aries placements triggers highly pioneering energies. You thrive under direct challenges, possess a spark of immediate execution, and possess strong executive vision.",
    Taurus: "With Taurus placements, you carry deep stability, patience, and a grounded character. You appreciate beauty, values, and possess natural financial foresight.",
    Gemini: "Gemini placement details you as highly intellectual, expressive, and adaptable. You are an excellent communicator, curious storyteller, and solve issues analytically.",
    Cancer: "Having Cancer alignments highlights extreme compassion, emotional intelligence, and protective attributes. You are deeply intuitive, domestic, and value personal trust.",
    Leo: "Having a Leo placements paints you as a natural-born leader, high-spirited, courageous, and filled with creative energy. You carry a highly magnetic physical glow and unshakeable ethics.",
    Virgo: "Virgo placement highlights strong critical analysis, organizational detail, and service attributes. You strive for perfection and decode complex scenarios easily.",
    Libra: "Libra alignments emphasize harmony, aesthetics, and social relationships. You are an excellent mediator, cooperative partner, and strive for balance in all realms.",
    Scorpio: "Scorpio placement makes you highly intense, magnetic, and emotionally resilient. You possess sharp intuition, investigative talent, and transform issues into strengths.",
    Sagittarius: "Sagittarius elements give you an optimistic, philosophical, and adventurous character. You value absolute truth, continuous learning, and direct freedom.",
    Capricorn: "Capricorn placement details you as highly disciplined, ambitious, and practical. You respect structure, long-term investments, and rise to positions of high authority.",
    Aquarius: "Aquarius placements make you highly humanitarian, forward-thinking, and original. You value intellectual freedom, community action, and original ideas.",
    Pisces: "Pisces alignments show profound spiritual insight, creativity, and empathy. You are artistic, deeply intuitive, and look at the world through a compassionate lens."
  };

  const remedies = {
    Aries: "Keep a red handkerchief in your pocket. Recite Hanuman Chalisa daily. Chant Mars Beej Mantra.",
    Taurus: "Carry a silver copper coin to stabilize career decisions. Wear off-white or silver tones on Fridays.",
    Gemini: "Feed green grass or vegetables to cows on Wednesdays. Wear emerald tones to boost intellectual energy.",
    Cancer: "Offer milk to Shiva Lingam on Mondays. Keep a silver square piece in your wallet for emotional peace.",
    Leo: "Wear off-white/golden tones on Sundays for peak professional results. Recite Anurag Hridaya Stotra.",
    Virgo: "Donate green items to needy children. Chant Mercury Beej Mantra on Wednesdays.",
    Libra: "Chant Venus Beej Mantra. Help needy women. Wear white or cream clothes on Fridays.",
    Scorpio: "Recite Shiva Stavan. Chant Mars mantra. Keep a copper bottle with you.",
    Sagittarius: "Fast on Thursdays. Wear yellow clothing or carry a yellow thread. Chant Jupiter mantra.",
    Capricorn: "Light a mustard oil lamp under a Peepal tree on Saturdays. Chant Saturn Beej Mantra.",
    Aquarius: "Help elderly people or sanitary workers. Recite Hanuman Chalisa on Saturdays.",
    Pisces: "Donate yellow sweets or books on Thursdays. Wear saffron or yellow colors."
  };

  return {
    provider: "offline",
    name,
    dob,
    tob,
    pob,
    location: loc,
    lagnaSign,
    lagnaSignNum,
    rashi: moonRashi,
    nakshatra: moonNak,
    dasha: currentDasha || "Jupiter / Venus",
    planets,
    interpretation: interpretations[lagnaSign] || interpretations.Leo,
    remedy: remedies[moonSignIdx >= 0 ? signsList[moonSignIdx] : "Leo"] || remedies.Taurus
  };
}

// -------------------------------------------------------------
// MAIN CONTROLLER ENDPOINT
// -------------------------------------------------------------
export const getBirthChart = async (req, res, next) => {
  const { name, dob, tob, pob } = req.body;

  try {
    if (!name || !dob || !tob || !pob) {
      res.status(400);
      throw new Error('All fields (name, dob, tob, pob) are required');
    }

    // 1. Geocode Place of birth using Nominatim (Running on backend, avoiding CORS)
    let loc = {
      displayName: pob,
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: "Asia/Kolkata"
    };

    try {
      const geoRes = await fetch(
        `${NOMINATIM_URL}?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(pob)}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "KaalDarshan/1.0"
          }
        }
      );
      if (geoRes.ok) {
        const results = await geoRes.json();
        const bestMatch = results[0];
        if (bestMatch?.display_name && bestMatch.lat && bestMatch.lon) {
          loc.displayName = bestMatch.display_name;
          loc.latitude = Number(bestMatch.lat);
          loc.longitude = Number(bestMatch.lon);

          // Get timezone
          const tzRes = await fetch(`${TIMEAPI_URL}?latitude=${loc.latitude}&longitude=${loc.longitude}`);
          if (tzRes.ok) {
            const tzPayload = await tzRes.json();
            loc.timezone = tzPayload.timeZoneName || tzPayload.timeZone || tzPayload.timezone || "Asia/Kolkata";
          }
        }
      }
    } catch (err) {
      console.warn("Backend geocoding failed, falling back to Delhi default:", err.message);
    }

    const apiKey = process.env.VITE_ASTROLOGY_API_KEY;

    // 2. Fetch from VedicAstroAPI if key is configured
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE" && !apiKey.startsWith("ak-dummy")) {
      try {
        const [year, month, day] = dob.split("-");
        const formattedDob = `${day}/${month}/${year}`;
        const queryParams = new URLSearchParams({
          api_key: apiKey,
          dob: formattedDob,
          tob: tob,
          lat: loc.latitude.toFixed(4),
          lon: loc.longitude.toFixed(4),
          tz: "5.5"
        }).toString();

        const planetRes = await fetch(`https://api.vedicastroapi.com/v3-json/horoscope/planet-details?${queryParams}`);
        if (planetRes.ok) {
          const planetData = await planetRes.json();
          if (planetData.status === 200 && planetData.response) {
            const rawPlanets = normalizePlanetResponse(planetData.response);
            const ascendant = rawPlanets.find((p) => p.name === "As" || p.full_name === "Ascendant") || rawPlanets[0];
            const ascSign = getPlanetSign(ascendant) || "Leo";
            const lagnaSignNum = signsList.indexOf(ascSign) + 1 || 5;

            const getFormatSign = (p) => {
              const planetSign = getPlanetSign(p);
              const idx = signsList.indexOf(planetSign);
              return idx >= 0 ? `${signsList[idx]} (${signsHindi[idx]})` : planetSign;
            };

            const mappedPlanets = rawPlanets.map((p) => ({
              name: p.full_name || p.name,
              sign: getFormatSign(p),
              house: p.house,
              nakshatra: p.nakshatra || "Unknown"
            }));

            const moon = rawPlanets.find((p) => p.name === "Mo" || p.full_name === "Moon") || { zodiac: "Taurus", nakshatra: "Rohini" };
            const moonSignIdx = signsList.indexOf(getPlanetSign(moon));
            const moonRashi = moonSignIdx >= 0 ? `${signsList[moonSignIdx]} (${signsHindi[moonSignIdx]})` : getPlanetSign(moon);
            const moonNak = moon.nakshatra;

            let dashaStr = "Jupiter / Venus";
            let dashaFromApi = null;
            try {
              const dashaRes = await fetch(`https://api.vedicastroapi.com/v3-json/dashas/current-mahadasha?${queryParams}`);
              if (dashaRes.ok) {
                const dashaData = await dashaRes.json();
                if (dashaData.status === 200 && dashaData.response) {
                  const maha = toPlainText(dashaData.response.mahadasha || dashaData.response.birth_dasa || dashaData.response.current_dasa || dashaData.response.lord || "Jupiter");
                  const antara = toPlainText(dashaData.response.antardasha || dashaData.response.sub_dasha || dashaData.response.child_dasha || "Venus");
                  dashaFromApi = `${maha || "Jupiter"} / ${antara || "Venus"}`;
                  if (dashaFromApi && dashaFromApi !== "Jupiter / Venus") {
                    dashaStr = dashaFromApi;
                  }
                }
              }
            } catch (dashaErr) {
              console.warn("Mahadasha fetch failed:", dashaErr.message);
            }

            // Pre-compute local derivations (used as fallback for dasha + interpretation)
            const localDerivations = computeAstrologyLocally(name, dob, tob, pob, loc);

            // Use offline calculation as fallback if API didn't provide unique dasha
            if (!dashaFromApi || dashaStr === "Jupiter / Venus") {
              const offlineDasha = localDerivations.dasha;
              if (offlineDasha && offlineDasha !== "Jupiter / Venus") {
                dashaStr = offlineDasha;
              }
            }

            return res.json({
              provider: "vedicastroapi",
              name,
              dob,
              tob,
              pob,
              location: loc,
              lagnaSign: ascSign,
              lagnaSignNum,
              rashi: moonRashi,
              nakshatra: moonNak,
              dasha: dashaStr,
              planets: mappedPlanets,
              interpretation: localDerivations.interpretation,
              remedy: localDerivations.remedy
            });
          } else {
            console.warn("VedicAstroAPI error response:", planetData.response);
          }
        }
      } catch (apiErr) {
        console.warn("VedicAstroAPI fetch failed, falling back to local calculation:", apiErr.message);
      }
    }

    // 3. Fallback to Local Engine if API key missing or failing/depleted
    const localResult = computeAstrologyLocally(name, dob, tob, pob, loc);
    return res.json(localResult);

  } catch (error) {
    next(error);
  }
};