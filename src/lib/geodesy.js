const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

function normalizeLongitude(lng) {
  return ((lng + 540) % 360) - 180;
}

export function distance(start, destination) {
  const startLat = toRadians(start[1]);
  const destinationLat = toRadians(destination[1]);
  const deltaLat = toRadians(destination[1] - start[1]);
  const deltaLng = toRadians(destination[0] - start[0]);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(destinationLat) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function initialBearing(start, destination) {
  const startLat = toRadians(start[1]);
  const destinationLat = toRadians(destination[1]);
  const deltaLng = toRadians(destination[0] - start[0]);

  const y = Math.sin(deltaLng) * Math.cos(destinationLat);
  const x = Math.cos(startLat) * Math.sin(destinationLat) -
    Math.sin(startLat) * Math.cos(destinationLat) * Math.cos(deltaLng);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function destinationPoint(start, distanceKm, bearing) {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearingRadians = toRadians(bearing);
  const startLat = toRadians(start[1]);
  const startLng = toRadians(start[0]);

  const destinationLat = Math.asin(
    Math.sin(startLat) * Math.cos(angularDistance) +
    Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(bearingRadians)
  );
  const destinationLng = startLng + Math.atan2(
    Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(startLat),
    Math.cos(angularDistance) - Math.sin(startLat) * Math.sin(destinationLat)
  );

  return [normalizeLongitude(toDegrees(destinationLng)), toDegrees(destinationLat)];
}
