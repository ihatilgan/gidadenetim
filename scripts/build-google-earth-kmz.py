#!/usr/bin/env python3

import argparse
import html
import json
import os
from pathlib import Path
import tempfile
import zipfile


ARCHIVE_ROOT = Path("data/afyon-kent-rehberi-archive")
OUTPUT_ROOT = Path("data/google-earth")

PROFILES = {
    "adres": [
        "MaksMahalle",
        "MaksYolOrtaHat",
        "MaksNumarataj",
        "MaksYapi",
    ],
    "parseller": [
        "TapuMahalleler",
        "TapuParseller",
        "TapuYapilar",
    ],
    "hafif": [
        "MaksMahalle",
        "MaksYolOrtaHat",
        "MaksNumarataj",
    ],
}

STYLE_BY_LAYER = {
    "MaksMahalle": "mahalleStyle",
    "MaksYolOrtaHat": "roadStyle",
    "MaksNumarataj": "doorStyle",
    "MaksYapi": "buildingStyle",
    "TapuMahalleler": "mahalleStyle",
    "TapuParseller": "parcelStyle",
    "TapuYapilar": "buildingStyle",
}


def esc(value):
    return html.escape("" if value is None else str(value), quote=True)


def iter_layer_files(layer_dir):
    chunks_dir = layer_dir / "chunks"
    if chunks_dir.exists():
        yield from sorted(chunks_dir.glob("*.geojson"))
    fallback = layer_dir / "fallback-wfs1.geojson"
    if fallback.exists():
        yield fallback


def iter_features(layer_name):
    layer_dir = ARCHIVE_ROOT / "layers" / layer_name
    for file_path in iter_layer_files(layer_dir):
        with file_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        for feature in data.get("features", []):
            yield feature


def layer_feature_count(layer_name):
    count = 0
    for feature in iter_features(layer_name):
        if feature.get("geometry"):
            count += 1
    return count


def coordinate_text(coords):
    return " ".join(",".join(str(v) for v in point[:3]) for point in coords)


def write_point(out, coords):
    out.write(f"<Point><coordinates>{coordinate_text([coords])}</coordinates></Point>")


def write_line(out, coords):
    out.write(f"<LineString><tessellate>1</tessellate><coordinates>{coordinate_text(coords)}</coordinates></LineString>")


def write_polygon(out, rings):
    if not rings:
        return
    out.write("<Polygon><tessellate>1</tessellate>")
    out.write("<outerBoundaryIs><LinearRing><coordinates>")
    out.write(coordinate_text(rings[0]))
    out.write("</coordinates></LinearRing></outerBoundaryIs>")
    for ring in rings[1:]:
        out.write("<innerBoundaryIs><LinearRing><coordinates>")
        out.write(coordinate_text(ring))
        out.write("</coordinates></LinearRing></innerBoundaryIs>")
    out.write("</Polygon>")


def write_geometry(out, geometry):
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")
    if not geom_type or coords is None:
        return False

    if geom_type == "Point":
        write_point(out, coords)
    elif geom_type == "MultiPoint":
        out.write("<MultiGeometry>")
        for point in coords:
            write_point(out, point)
        out.write("</MultiGeometry>")
    elif geom_type == "LineString":
        write_line(out, coords)
    elif geom_type == "MultiLineString":
        out.write("<MultiGeometry>")
        for line in coords:
            write_line(out, line)
        out.write("</MultiGeometry>")
    elif geom_type == "Polygon":
        write_polygon(out, coords)
    elif geom_type == "MultiPolygon":
        out.write("<MultiGeometry>")
        for polygon in coords:
            write_polygon(out, polygon)
        out.write("</MultiGeometry>")
    else:
        return False
    return True


def feature_name(layer_name, props):
    if layer_name == "MaksNumarataj":
        pieces = []
        if props.get("MahalleAd"):
            pieces.append(props.get("MahalleAd"))
        if props.get("Ad"):
            pieces.append(props.get("Ad"))
        if props.get("KapiNo"):
            pieces.append(f"Kapı {props.get('KapiNo')}")
        if pieces:
            return " - ".join(str(p) for p in pieces)
        return f"Kapı {props.get('KapiNo') or props.get('KimlikNo') or props.get('Guid') or ''}".strip()
    if layer_name == "MaksYolOrtaHat":
        tip = {
            "1": "Sokak",
            "2": "Cadde",
            "3": "Bulvar",
            "4": "Meydan",
            "5": "Küme Evler",
        }.get(str(props.get("Tip")), "Yol")
        return f"{props.get('Ad') or 'Yol'} {tip}"
    for key in ("Ad", "ad", "MahalleAd", "KimlikNo", "Guid", "MaksGlobalId"):
        if props.get(key):
            return props[key]
    return layer_name


def description(props):
    keys = [
        "Ad", "ad", "MahalleAd", "KapiNo", "KimlikNo", "Guid", "MaksGlobalId",
        "YolOrtaHatYonRef", "YapiRef", "ParselRef", "parselref", "Ada", "Parsel",
        "Tip", "tip", "Durum", "durum",
    ]
    rows = []
    for key in keys:
        value = props.get(key)
        if value not in (None, ""):
            rows.append(f"<tr><th>{esc(key)}</th><td>{esc(value)}</td></tr>")
    if not rows:
        return ""
    return "<![CDATA[<table border='1' cellpadding='3' cellspacing='0'>" + "".join(rows) + "</table>]]>"


def write_styles(out):
    out.write("""
<Style id="doorStyle">
  <IconStyle><scale>0.55</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon></IconStyle>
</Style>
<Style id="roadStyle">
  <LineStyle><color>ff00a5ff</color><width>2</width></LineStyle>
</Style>
<Style id="mahalleStyle">
  <LineStyle><color>ff00ffff</color><width>2</width></LineStyle>
  <PolyStyle><color>2200ffff</color></PolyStyle>
</Style>
<Style id="buildingStyle">
  <LineStyle><color>ff00ff66</color><width>1</width></LineStyle>
  <PolyStyle><color>3300ff66</color></PolyStyle>
</Style>
<Style id="parcelStyle">
  <LineStyle><color>ffffaa00</color><width>1</width></LineStyle>
  <PolyStyle><color>11ffaa00</color></PolyStyle>
</Style>
""")


def build_kmz(profile, output_path, limit_per_layer=None):
    layers = PROFILES[profile]
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        kml_path = Path(tmp) / "doc.kml"
        with kml_path.open("w", encoding="utf-8") as out:
            out.write('<?xml version="1.0" encoding="UTF-8"?>\n')
            out.write('<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n')
            out.write(f"<name>Afyon Kent Rehberi - {esc(profile)}</name>\n")
            write_styles(out)

            for layer_name in layers:
                out.write(f"<Folder><name>{esc(layer_name)}</name>\n")
                written = 0
                for feature in iter_features(layer_name):
                    geometry = feature.get("geometry")
                    if not geometry:
                        continue
                    props = feature.get("properties") or {}
                    out.write("<Placemark>")
                    out.write(f"<name>{esc(feature_name(layer_name, props))}</name>")
                    style_id = STYLE_BY_LAYER.get(layer_name)
                    if style_id:
                        out.write(f"<styleUrl>#{style_id}</styleUrl>")
                    desc = description(props)
                    if desc:
                        out.write(f"<description>{desc}</description>")
                    if write_geometry(out, geometry):
                        written += 1
                    out.write("</Placemark>\n")
                    if limit_per_layer and written >= limit_per_layer:
                        break
                out.write("</Folder>\n")
                print(f"{layer_name}: {written} placemark")

            out.write("</Document></kml>\n")

        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            archive.write(kml_path, "doc.kml")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=sorted(PROFILES), default="adres")
    parser.add_argument("--output", default=None)
    parser.add_argument("--limit-per-layer", type=int, default=None)
    args = parser.parse_args()

    output = Path(args.output) if args.output else OUTPUT_ROOT / f"afyon_{args.profile}.kmz"
    build_kmz(args.profile, output, args.limit_per_layer)
    size_mb = os.path.getsize(output) / 1024 / 1024
    print(f"KMZ ready: {output} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
