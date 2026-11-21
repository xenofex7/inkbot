# GRBL-Notizen für den VG-X4

Allgemeines GRBL-1.1-Wissen. Alles, was VG-X4-spezifisch ist, ist mit **[prüfen]**
markiert und wird an der echten Maschine bestätigt.

## Verbindung

- Web Serial: `navigator.serial.requestPort()`, `port.open({ baudRate: 115200 })`
- Nach dem Öffnen schickt GRBL eine Begrüssung (`Grbl 1.1f ['$' for help]` bzw.
  VigoWriter-Variante) **[prüfen: genauer Text]**
- Zeilenende `\n`. Jede Zeile wird mit `ok` oder `error:N` quittiert.

## Streaming

- **Character Counting:** RX-Puffer 128 Byte. Zeilen senden, solange die Summe der
  unbestätigten Zeichen < 128 ist; bei jedem `ok`/`error` die älteste Zeile abziehen.
  Schneller und flüssiger als Send-and-wait.
- Bei `error:N` anhalten und dem Benutzer zeigen (nicht weiterstreamen).
- `ALARM:N` → Maschine gesperrt, `$X` zum Entsperren.

## Echtzeitbefehle (einzelne Bytes, ohne Zeilenende, umgehen den Puffer)

| Byte | Wirkung |
|---|---|
| `?` | Statusbericht `<Idle|MPos:…|FS:…>` |
| `!` | Feed Hold (Pause, Stift bleibt wo er ist) |
| `~` | Cycle Start / Fortsetzen |
| `0x18` | Soft Reset (Abbruch, Puffer leer) |
| `0x90` | Vorschub-Override 100 % |
| `0x91` / `0x92` | Vorschub +10 % / −10 % |
| `0x93` / `0x94` | Vorschub +1 % / −1 % |

Status-Poll alle ~200 ms mit `?` für Position und Vorschau-Cursor.

## Nützliche Befehle

- `$I` Build-Info, `$$` Einstellungen, `$#` Koordinaten-Offsets, `$G` Parserzustand
- `$X` Alarm aufheben, `$H` Homing (nur mit Endschaltern) **[prüfen: $22]**
- `G21` mm, `G90` absolut, `G91` relativ
- `G92 X0 Y0` aktuelle Position als Nullpunkt
- `$J=G91 X10 F1000` Joggen (abbrechbar mit `0x85`)

## Stift (Servo) **[prüfen]**

Bei GRBL-Plottern mit Servo üblich:
- `M3 S<wert>` Stift runter, `M5` (oder `M3 S0`) Stift hoch, danach kurze Pause
  `G4 P0.15`, damit der Servo ankommt
- Alternative bei manchen Firmwares: Servo über Z-Achse (`G0 Z5` / `G1 Z0`)

Was VigoWriter tatsächlich sendet, lässt sich herausfinden, indem man in VigoWriter
einen G-Code exportiert oder die Befehle der Community-Projekte (`references.md`)
nachliest.

## Ausgabe der echten Maschine

_Hier `$I` und `$$` einfügen, sobald verbunden._
