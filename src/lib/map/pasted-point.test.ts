import { describe, expect, it } from "vitest";
import { parseCoordinateText, parsePastedPoint } from "./pasted-point";

const point = (lat: number, lng: number) => ({ kind: "point", lat, lng });

describe("parseCoordinateText", () => {
  it.each([
    ["11.78, 34.36", 11.78, 34.36],
    ["11.78 34.36", 11.78, 34.36],
    ["11.78,34.36", 11.78, 34.36],
    ["  11.78 ;  34.36 ", 11.78, 34.36],
    ["-1.2921, 36.8219", -1.2921, 36.8219],
    ["11, 34", 11, 34],
    ["+11.78, -34.36", 11.78, -34.36],
  ])("reads decimal degrees: %s", (text, lat, lng) => {
    expect(parseCoordinateText(text)).toEqual({ lat, lng });
  });

  it.each([
    ["11.78N 34.36E", 11.78, 34.36],
    ["11.78 N, 34.36 E", 11.78, 34.36],
    ["N 11.78, E 34.36", 11.78, 34.36],
    ["1.2921S 36.8219E", -1.2921, 36.8219],
    ["4.6 N 74.08 W", 4.6, -74.08],
    // The letters say which is which, whatever the order.
    ["34.36E 11.78N", 11.78, 34.36],
  ])("reads hemisphere letters: %s", (text, lat, lng) => {
    expect(parseCoordinateText(text)).toEqual({ lat, lng });
  });

  it.each([
    [`11°46'48"N 34°21'36"E`, 11.78, 34.36],
    [`11° 46' 48" N, 34° 21' 36" E`, 11.78, 34.36],
    [`N 11°46'48", E 34°21'36"`, 11.78, 34.36],
    // The typographic marks Google Maps and Wikipedia write.
    ["11°46′48″N 34°21′36″E", 11.78, 34.36],
    [`11°46'48.0"N 34°21'36.0"E`, 11.78, 34.36],
    // Degrees and decimal minutes, and degrees alone.
    ["11°46.8'N 34°21.6'E", 11.78, 34.36],
    ["11.78° N, 34.36° E", 11.78, 34.36],
    [`1°17'31.6"S 36°49'18.8"E`, -1.292111, 36.821889],
    [`34°21'36"E 11°46'48"N`, 11.78, 34.36],
    [`-1°30'0" 36°0'0"`, -1.5, 36],
  ])("reads degrees, minutes and seconds: %s", (text, lat, lng) => {
    expect(parseCoordinateText(text)).toEqual({ lat, lng });
  });

  it.each([
    "",
    "Bakouri",
    "11.78",
    "95, 34",
    "11.78, 200",
    "11N 34S",
    "N 11.78 N, 34.36",
    `11°61'00"N 34°21'36"E`,
    `11°46'60"N 34°21'36"E`,
    "11.78, 34.36, 12",
  ])("gives no point for %j", (text) => {
    expect(parseCoordinateText(text)).toBeNull();
  });
});

describe("parsePastedPoint", () => {
  it("reads pasted coordinates", () => {
    expect(parsePastedPoint("11.78, 34.36")).toEqual(point(11.78, 34.36));
    expect(parsePastedPoint(`11°46'48"N 34°21'36"E`)).toEqual(point(11.78, 34.36));
  });

  it.each([
    // The middle of the view.
    ["https://www.google.com/maps/@11.78,34.36,12z", 11.78, 34.36],
    ["https://www.google.com/maps/@-1.2921,36.8219,15z?entry=ttu", -1.2921, 36.8219],
    ["https://www.google.com/maps?q=11.78,34.36", 11.78, 34.36],
    ["https://maps.google.com/?q=11.78,34.36&z=12", 11.78, 34.36],
    ["https://www.google.com/maps/search/?api=1&query=11.78%2C34.36", 11.78, 34.36],
    ["https://www.google.com/maps?ll=11.78,34.36&z=10", 11.78, 34.36],
    // The place's own pin wins over the middle of the view.
    [
      "https://www.google.com/maps/place/Bakori/@11.9,34.2,10z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d11.78!4d34.36!16s",
      11.78,
      34.36,
    ],
    ["https://www.google.com/maps/place/11.78,34.36/@11.9,34.2,10z", 11.78, 34.36],
    [
      "https://www.google.com/maps/place/11%C2%B046'48.0%22N+34%C2%B021'36.0%22E/@11.9,34.2,10z",
      11.78,
      34.36,
    ],
    ["https://www.google.co.uk/maps/@11.78,34.36,12z", 11.78, 34.36],
    ["https://www.google.com.sd/maps/@11.78,34.36,12z", 11.78, 34.36],
    ["www.google.com/maps/@11.78,34.36,12z", 11.78, 34.36],
  ])("reads a Google Maps link: %s", (link, lat, lng) => {
    expect(parsePastedPoint(link)).toEqual(point(lat, lng));
  });

  it.each([
    ["https://www.openstreetmap.org/#map=12/11.78/34.36", 11.78, 34.36],
    ["https://www.openstreetmap.org/search?query=Bakouri#map=9/11.78/34.36", 11.78, 34.36],
    // The marker wins over the middle of the view.
    ["https://www.openstreetmap.org/?mlat=11.78&mlon=34.36#map=12/11.9/34.2", 11.78, 34.36],
    ["https://www.openstreetmap.org/node/123#map=17/-1.2921/36.8219", -1.2921, 36.8219],
    ["openstreetmap.org/#map=12/11.78/34.36", 11.78, 34.36],
  ])("reads an OpenStreetMap link: %s", (link, lat, lng) => {
    expect(parsePastedPoint(link)).toEqual(point(lat, lng));
  });

  it("reads the link in shared text", () => {
    expect(parsePastedPoint("Bakouri\nhttps://www.google.com/maps/@11.78,34.36,12z")).toEqual(point(11.78, 34.36));
  });

  it.each([
    "https://maps.app.goo.gl/AbCdEf123",
    "maps.app.goo.gl/AbCdEf123",
    "https://goo.gl/maps/AbCdEf123",
    "https://osm.org/go/0EEQjE--",
    "https://www.openstreetmap.org/go/0EEQjE--",
  ])("says a short link carries no coordinates: %s", (link) => {
    expect(parsePastedPoint(link)).toEqual({ kind: "short_link" });
  });

  it.each([
    "https://www.google.com/maps/place/Bakori",
    "https://www.google.com/maps/search/Bakouri",
    "https://www.google.com/maps/@95,200,12z",
    "https://www.openstreetmap.org/search?query=Bakouri",
    "https://www.openstreetmap.org/node/123",
    "https://example.org/@11.78,34.36",
    // A host that only looks like Google.
    "https://google.com.evil.example/maps/@11.78,34.36,12z",
    "95, 200",
    "11.78,",
    `11°61'00"N 34°21'36"E`,
  ])("says so when a link or coordinate text has no point: %s", (text) => {
    expect(parsePastedPoint(text)).toEqual({ kind: "no_coordinates" });
  });

  it.each(["", "  ", "Bakouri", "بكوري", "Um Dabakir 2", "12", "2026", "Camp 5, Zone B"])(
    "leaves a place name to the search: %j",
    (text) => {
      expect(parsePastedPoint(text)).toEqual({ kind: "none" });
    },
  );
});
