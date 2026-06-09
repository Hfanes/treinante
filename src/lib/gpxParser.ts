import type { RunDraft, Split } from "@/types";

interface Trackpoint {
  lat: number;
  lng: number;
  ele: number | null;
  time: Date | null;
  hr: number | null;
  power: number | null;
}

function textByLocalName(parent: Element, localName: string) {
  return [...parent.getElementsByTagName("*")].find(
    (element) => element.localName === localName
  )?.textContent;
}

function numberByLocalName(parent: Element, localName: string) {
  const value = textByLocalName(parent, localName);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineKm(a: Trackpoint, b: Trackpoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(x));
}

function smoothElevations(points: Trackpoint[]) {
  return points.map((point, index) => {
    if (point.ele === null) return null;
    const window = points
      .slice(Math.max(0, index - 2), index + 3)
      .map((item) => item.ele)
      .filter((value): value is number => value !== null);
    return window.length
      ? window.reduce((sum, value) => sum + value, 0) / window.length
      : point.ele;
  });
}

function average(values: number[]) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function computeSplits(points: Trackpoint[]) {
  const splits: Split[] = [];
  let totalDistance = 0;
  let splitDistance = 0;
  let splitMovingSeconds = 0;
  let splitStartElapsed = 0;
  let nextKm = 1;
  let lastTime = points[0].time;
  let elapsedSeconds = 0;
  let splitHr: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const segmentDistance = haversineKm(previous, point);
    const segmentSeconds =
      lastTime && point.time
        ? Math.max(0, (point.time.getTime() - lastTime.getTime()) / 1000)
        : 0;
    const movingSeconds = segmentSeconds > 60 ? 0 : segmentSeconds;

    elapsedSeconds += segmentSeconds;
    totalDistance += segmentDistance;
    splitDistance += segmentDistance;
    splitMovingSeconds += movingSeconds;
    lastTime = point.time;
    if (point.hr !== null) splitHr.push(point.hr);

    while (totalDistance >= nextKm && splitDistance > 0) {
      const overshoot = totalDistance - nextKm;
      const ratio = segmentDistance > 0 ? 1 - overshoot / segmentDistance : 1;
      const lat = previous.lat + (point.lat - previous.lat) * ratio;
      const lng = previous.lng + (point.lng - previous.lng) * ratio;
      const elevation =
        previous.ele !== null && point.ele !== null
          ? previous.ele + (point.ele - previous.ele) * ratio
          : (point.ele ?? previous.ele ?? 0);
      const pace = Math.max(1, Math.round(splitMovingSeconds));
      const averageHr = average(splitHr);

      splits.push({
        km: nextKm,
        pace,
        hr: averageHr === null ? null : Math.round(averageHr),
        elevation: Math.round(elevation),
        gap: pace,
        is_stop: pace > 540,
        lat,
        lng,
        timestamp: point.time?.toISOString(),
      });

      nextKm += 1;
      splitDistance = overshoot;
      splitMovingSeconds = Math.max(
        0,
        elapsedSeconds - splitStartElapsed - pace
      );
      splitStartElapsed = elapsedSeconds;
      splitHr = [];
    }
  }

  return splits;
}

export function parseGPX(xmlString: string): RunDraft {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("GPX file could not be parsed");
  }

  const trackpointElements = [...doc.getElementsByTagName("trkpt")];
  if (trackpointElements.length < 2) {
    throw new Error("GPX file contains no track data");
  }

  const points = trackpointElements.map((element) => {
    const lat = Number(element.getAttribute("lat"));
    const lng = Number(element.getAttribute("lon"));
    const timeText = textByLocalName(element, "time");

    return {
      lat,
      lng,
      ele: numberByLocalName(element, "ele"),
      time: timeText ? new Date(timeText) : null,
      hr: numberByLocalName(element, "hr"),
      power: numberByLocalName(element, "power"),
    } satisfies Trackpoint;
  });

  if (
    points.some(
      (point) => !Number.isFinite(point.lat) || !Number.isFinite(point.lng)
    )
  ) {
    throw new Error("GPX file contains invalid coordinates");
  }

  const first = points[0];
  const last = points[points.length - 1];
  let distance = 0;
  let movingTime = 0;
  let totalTime = 0;
  const elevations = smoothElevations(points);
  let elevationGain = 0;
  let elevationLoss = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    distance += haversineKm(previous, point);

    if (previous.time && point.time) {
      const seconds = Math.max(
        0,
        (point.time.getTime() - previous.time.getTime()) / 1000
      );
      totalTime += seconds;
      if (seconds <= 60) movingTime += seconds;
    }

    const previousEle = elevations[index - 1];
    const ele = elevations[index];
    if (previousEle !== null && ele !== null) {
      const delta = ele - previousEle;
      if (delta > 0) elevationGain += delta;
      if (delta < 0) elevationLoss += Math.abs(delta);
    }
  }

  const hrValues = points
    .map((point) => point.hr)
    .filter((value): value is number => value !== null);
  const powerValues = points
    .map((point) => point.power)
    .filter((value): value is number => value !== null);
  const name = textByLocalName(doc.documentElement, "name");
  const type = textByLocalName(doc.documentElement, "type");
  const fallbackTime = first.time ?? new Date();
  const safeMovingTime = Math.round(movingTime || totalTime || 1);
  const averageHr = average(hrValues);
  const averagePower = average(powerValues);

  return {
    title: name?.trim() || "GPX run",
    date: fallbackTime.toISOString().slice(0, 10),
    start_time: first.time?.toISOString() ?? null,
    source: "gpx",
    sport_type: type?.trim() || "Run",
    strava_activity_id: null,
    distance: Number(distance.toFixed(3)),
    total_time: Math.round(totalTime || movingTime),
    moving_time: safeMovingTime,
    avg_hr: averageHr === null ? null : Math.round(averageHr),
    max_hr: hrValues.length ? Math.max(...hrValues) : null,
    avg_power: averagePower === null ? null : Math.round(averagePower),
    max_power: powerValues.length ? Math.max(...powerValues) : null,
    elevation_gain: Math.round(elevationGain),
    elevation_loss: Math.round(elevationLoss),
    avg_pace: Math.round(safeMovingTime / Math.max(distance, 0.001)),
    start_lat: first.lat,
    start_lng: first.lng,
    end_lat: last.lat,
    end_lng: last.lng,
    summary_polyline: null,
    gpx_file_url: null,
    raw_splits: computeSplits(points),
    raw_source: {
      creator: doc.documentElement.getAttribute("creator"),
      point_count: points.length,
      warning: distance < 0.5 ? "GPX activity is shorter than 0.5 km" : null,
    },
    training_load: null,
    ctl_at_date: null,
    atl_at_date: null,
    tsb_at_date: null,
  };
}
