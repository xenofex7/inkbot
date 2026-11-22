# References

## Existing open source projects for the VG-X4

- **Wudstyz/VG-X4**: Mac app (Python/pywebview), handwriting, Word/PDF, SVG, live tracing,
  path optimisation (up to ~40 % less pen-up travel), run time estimate. Tested with
  GRBL 1.1f. https://github.com/Wudstyz/VG-X4
- **Morgulisan/VGX4-Control**: local control website with a Python server, German UI.
  115200 baud, firmware check, pause via feed hold, live speed 10-150 %.
  https://github.com/Morgulisan/VGX4-Control

Both confirmed the pen commands (`M5` up, `M3 S905` down) and the axis setup used by inkbot.

## Technology

- Web Serial API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- GRBL 1.1 interface and streaming: https://github.com/gnea/grbl/wiki
- Single-line fonts: Hershey and EMS fonts via `hersheytext`, see `THIRD_PARTY_NOTICES.md`
- Ideas from the plotter scene: vpype (path optimisation, layers), AxiDraw/Inkscape Hershey
  Text, potrace (image to vector)
