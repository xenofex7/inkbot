# Hardware: VigoTec VG-X4

## Eckdaten

| | |
|---|---|
| Typ | Stift-Plotter / Schreibroboter (写字机), optional Laser-Kit |
| Zeichenfläche | 310 × 256 mm laut Hardware-Manual (Händler: 310 × 266 mm) |
| Aussenmass | 570 × 436 × 88 mm |
| Antrieb | 2 Schrittmotoren (42er), ein Zahnriemen 1800 mm über Mittelkreuz |
| Stift | Servo auf Platine C4 (PWM), kein Z-Motor |
| Anschluss | Micro-USB, serielle Schnittstelle |
| Firmware | GRBL 1.1f (meldet sich als „VigoWriter 1.1f“) |
| Baudrate | 115200 |
| Original-Software | VigoWriter (Windows), mit USB-„Encryption Lock“ |
| Netzteil | 12 V |

Die Original-Software braucht den USB-Dongle. Die Community-Projekte (siehe
`references.md`) reden direkt GRBL und kommen offenbar ohne aus. An der eigenen
Maschine bestätigen.

## Platinen

- **C1** Hauptplatine: Motor L / R, Steuerleitung von C2
- **C2** Seitenplatine (3-Pin zur C1)
- **C3** Platine am Mittelkreuz
- **C4** vordere Platine: **links 3-Pin = Servo**, rechts = Laser

## Wichtig beim Zusammenbau

- **Servo nie an den rechten Anschluss von C4**, sonst brennt es durch. Orange = Signal.
- Motorkabel: 4-Pin-Ende nach links, 6-Pin-Ende nach rechts.
- Flachkabel: C4 hat Schubladen-Stecker (Kontakte nach hinten), C2/C3 Klapp-Stecker
  (Kontakte nach unten).
- Rollen ohne Spiel, aber leichtgängig einstellen. Entscheidet über die Schriftqualität.
- Riemen waagrecht zwischen den Motor-Pulleys, vor dem Fixieren spannen.
- Pulley auf Motorwelle mit ca. 1 mm Abstand.
- Erster Start: USB zuerst einstecken, dann Software öffnen. Key-LED blinkt langsam,
  Power-LED leuchtet.

## Quellen

- Hardware-Manual (PDF): http://vigotec.cn/software/VG-X4_Hardware_Installation_Manual_Eng_20190417.pdf
- Hardware-Manual (Bilder): https://www.vigotec.cn/X4/Hardware_manual_x4.htm
- Software-Manual VigoWriter: https://www.vigotec.cn/X4/Software_manual_x4.htm
- Übersicht / Downloads: https://www.vigotec.cn/ und http://vigotec.cn/X4/
