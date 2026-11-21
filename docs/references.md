# Referenzen

## Bestehende Open-Source-Projekte für den VG-X4
- **Wudstyz/VG-X4** – Mac-App (Python/pywebview), Handschrift, Word/PDF, SVG,
  Live-Tracing, Pfadoptimierung (bis ~40 % weniger Leerfahrten), Laufzeitschätzung.
  Getestet mit GRBL 1.1f. https://github.com/Wudstyz/VG-X4
- **Morgulisan/VGX4-Control** – lokale Steuerungs-Website mit Python-Server, deutsch.
  115200 Baud, Firmwareprüfung, Pause per Feed Hold, Live-Tempo 10–150 %.
  https://github.com/Morgulisan/VGX4-Control

→ Vor dem Start beide Repos lesen: Stift-Befehle, Servo-Werte, Achsrichtung.

## Technik
- Web Serial API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- GRBL 1.1 Interface/Streaming: https://github.com/gnea/grbl/wiki
- Hershey-Fonts (Single-Line): z. B. `hersheytext` / EMS-Fonts aus dem Inkscape-Umfeld
- Ideen aus der Plotter-Szene: vpype (Pfadoptimierung, Layer), AxiDraw/Inkscape
  Hershey Text, potrace (Bild → Vektor)
