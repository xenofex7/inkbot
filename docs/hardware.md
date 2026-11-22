# Hardware: VigoTec VG-X4

## Key facts

| | |
|---|---|
| Type | Pen plotter / writing robot, optional laser kit |
| Drawing area | 310 × 256 mm according to the hardware manual (dealers say 310 × 266 mm) |
| Outer size | 570 × 436 × 88 mm |
| Drive | 2 stepper motors (NEMA 17 size), one 1800 mm timing belt over the centre cross |
| Pen | Servo on board C4 (PWM), no Z motor |
| Connection | Micro USB, serial |
| Firmware | GRBL 1.1f (greets as "VigoWriter 1.1f") |
| Baud rate | 115200 |
| Original software | VigoWriter (Windows) with a USB "encryption lock" |
| Power supply | 12 V |

The original software needs the USB dongle. inkbot talks GRBL directly and works without
it (confirmed 22.11.2026).

## Boards

- **C1** main board: motor L / R, control line from C2, power switch next to the 12 V
  socket
- **C2** side board (3 pin to C1)
- **C3** board on the centre cross
- **C4** front board: **left 3 pin = servo**, right = laser

## Assembly essentials

- **Never plug the servo into the right socket of C4**, it burns out. Orange = signal.
- Motor cables: 4 pin end to the left, 6 pin end to the right.
- Ribbon cables: C4 has slide-in connectors (contacts to the back), C2/C3 have flip-lock
  connectors (contacts down).
- Adjust the rollers without play but running freely. This decides the writing quality.
- Belt level between the motor pulleys, tension it before fixing.
- Pulley on the motor shaft with about 1 mm gap.
- First start: plug in USB first, then open the software. Key LED blinks slowly, power
  LED is on.

## Notes from assembling (22.11.2026)

- Motor connectors point **down**, otherwise they collide (motor rotated by 90°).
- Pulley about 1 mm above the motor (a microSD card works as a gauge), height so that the
  belt runs level to the idler pulleys.
- Idler pulleys on S5: N6 (short), W2, N7 (long), then P2.
- Included double-sided tape (CROWN): stick the ribbon cable flat onto the profile so it
  cannot get into the belt or pulley. Leave a loop at the centre cross.
- Ribbon cable: blue stiffener up (contacts down).

## Sources

- Hardware manual (PDF): http://vigotec.cn/software/VG-X4_Hardware_Installation_Manual_Eng_20190417.pdf
- Hardware manual (pictures): https://www.vigotec.cn/X4/Hardware_manual_x4.htm
- VigoWriter software manual: https://www.vigotec.cn/X4/Software_manual_x4.htm
- Overview / downloads: https://www.vigotec.cn/ and http://vigotec.cn/X4/
