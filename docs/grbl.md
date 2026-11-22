# GRBL-Notizen für den VG-X4

Allgemeines GRBL-1.1-Wissen. Alles, was VG-X4-spezifisch ist, ist mit **[prüfen]**
markiert und wird an der echten Maschine bestätigt.

## Verbindung

- Web Serial: `navigator.serial.requestPort()`, `port.open({ baudRate: 115200 })`
- Nach dem Öffnen (Reset über DTR) schickt die Maschine nach ca. 1-2 s die Begrüssung
  `VigoWriter 1.1f ['$' for help]` (geprüft am 22.11.2026). Erkennung also über
  `1.1f ['$' for help]`, nicht über das Wort `Grbl`.
- USB-Seriell-Chip CH340 (USB-ID `1a86:7523`), unter macOS als `/dev/cu.usbserial-*`,
  ohne zusätzlichen Treiber.
- Zeilenende `\n`. Jede Zeile wird mit `ok` oder `error:N` quittiert.

## Streaming

- **Character Counting:** RX-Puffer 128 Byte (bestätigt: `[OPT:VC,15,128]`). Zeilen senden, solange die Summe der
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
- `$X` Alarm aufheben. `$H` Homing gibt es nicht: `$22=0`, keine Endschalter konfiguriert.
- `G21` mm, `G90` absolut, `G91` relativ
- `G92 X0 Y0` aktuelle Position als Nullpunkt
- `$J=G91 X10 F1000` Joggen (abbrechbar mit `0x85`)

## Stift (Servo)

Beide Community-Projekte (`references.md`) steuern den Stift über die Spindel-PWM:
- `M5` Stift hoch, `M3 S905` Stift runter (Wert S905 laut beiden Projekten am Gerät
  bestätigt, Bereich S0-S1000), danach Pause `G4 P0.3` (100-600 ms), damit der Servo ankommt.
- Beide nennen +X = rechts, +Y = unten, Nullpunkt oben links per `G92 X0 Y0`.

Test am eigenen Gerät (22.11.2026): `M5` / `M3 S905` abwechselnd, je 3 s: **Stift fährt
hoch und runter.** Bestätigt.

Stolperfalle: Die Hauptplatine C1 hat einen **Netzschalter** (Power Switch neben der
12-V-Buchse). Ist er aus, versorgt USB nur die Steuerung: GRBL antwortet normal und
quittiert alle Befehle mit `ok`, aber Servo und Motoren bewegen sich nicht. Ein erster
Test mit ausgeschaltetem Schalter sah deshalb wie ein Defekt aus. Beim Einschalten hebt
der Servo den Stift einmal an. Die App kann den Schalter nicht erkennen und sollte beim
Verbinden darauf hinweisen.

## Ausgabe der echten Maschine

Ausgelesen am 22.11.2026, Maschine im Ruhezustand, nur lesende Befehle.

### Was daraus folgt

| Thema | Wert | Bedeutung für die App |
|---|---|---|
| Firmware | `VER:1.1f.20170131` | GRBL 1.1f, Build vom 31.01.2017 |
| Optionen | `OPT:VC,15,128` | Planner 15 Blöcke, RX-Puffer 128 Byte. `V` = variable Spindel (PWM), `C` = CoreXY (Bedeutung der Buchstaben aus dem Gedächtnis, gegen GRBL-Wiki prüfen) |
| Achsrichtung | `$3=3` | X und Y invertiert |
| Homing | `$22=0` | Kein Homing, Nullpunkt wird von Hand gesetzt (`G92 X0 Y0`) |
| Limits | `$20=0`, `$21=0` | Weder Soft- noch Hard-Limits: die App muss selbst prüfen, dass nichts über die Zeichenfläche hinausfährt |
| Laser-Modus | `$32=0` | Aus. `M3 S…` bleibt auch bei `G0` aktiv, Stift fällt bei Leerfahrten nicht automatisch hoch |
| Spindel-PWM | `$30=1000`, `$31=0` | S-Werte von 0 bis 1000. Ob der Servo darüber läuft, ist noch offen |
| Z-Achse | `$102=250`, `$112=500` | Z ist konfiguriert, Servo-Ansteuerung über Z also auch möglich. Offen |
| Auflösung | `$100=160`, `$101=160` | 160 Schritte pro mm |
| Max. Tempo | `$110=5000`, `$111=5000` | 5000 mm/min |
| Beschleunigung | `$120=400`, `$121=400` | 400 mm/s² |
| Motoren | `$1=25` | Motoren lassen 25 ms nach der Bewegung los, der Kopf lässt sich dann von Hand verschieben und die Position stimmt nicht mehr |
| Max. Verfahrweg | `$130=1000`, `$131=1000` | Platzhalter, nicht die echte Fläche (Limits sind aus) |
| Status | `$10=1` | Statusbericht mit Maschinenposition (MPos) |

### Rohdaten

```
VigoWriter 1.1f ['$' for help]

$I
[VER:1.1f.20170131:]
[OPT:VC,15,128]
ok

$$
$0=10
$1=25
$2=0
$3=3
$4=0
$5=0
$6=0
$10=1
$11=0.100
$12=0.002
$13=0
$20=0
$21=0
$22=0
$23=0
$24=25.000
$25=500.000
$26=250
$27=1.000
$30=1000
$31=0
$32=0
$100=160.000
$101=160.000
$102=250.000
$110=5000.000
$111=5000.000
$112=500.000
$120=400.000
$121=400.000
$122=10.000
$130=1000.000
$131=1000.000
$132=200.000
ok

$G
[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]
ok

?
<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>
```
