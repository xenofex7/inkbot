# GRBL notes for the VG-X4

General GRBL 1.1 knowledge plus what was confirmed on the real machine. Dates are when a
fact was checked on the device.

## Connection

- Web Serial: `navigator.serial.requestPort()`, `port.open({ baudRate: 115200 })`
- After opening the port (reset via DTR) the machine sends its greeting after about 1-2 s:
  `VigoWriter 1.1f ['$' for help]` (checked 22.11.2026). Detect it by
  `1.1f ['$' for help]`, not by the word `Grbl`.
- USB serial chip CH340 (USB ID `1a86:7523`), shows up on macOS as `/dev/cu.usbserial-*`
  without an extra driver.
- Line ending `\n`. Every line is acknowledged with `ok` or `error:N`.

## Streaming

- **Character counting:** 128 byte RX buffer (confirmed: `[OPT:VC,15,128]`). Keep sending
  lines while the unacknowledged characters stay below 128; on every `ok`/`error` drop the
  oldest line. Faster and smoother than send-and-wait.
- On `error:N` stop and show it to the user, do not keep streaming.
- `ALARM:N` locks the machine, `$X` unlocks it.

## Realtime commands (single bytes, no line ending, bypass the buffer)

| Byte | Effect |
|---|---|
| `?` | Status report `<Idle|MPos:...|FS:...>` |
| `!` | Feed hold (pause, the pen stays where it is) |
| `~` | Cycle start / resume |
| `0x18` | Soft reset (abort, buffer cleared) |
| `0x90` | Feed override 100 % |
| `0x91` / `0x92` | Feed +10 % / -10 % |
| `0x93` / `0x94` | Feed +1 % / -1 % |

Poll the status every ~250 ms with `?` for position and the preview cursor.

## Useful commands

- `$I` build info, `$$` settings, `$#` coordinate offsets, `$G` parser state
- `$X` clears an alarm. There is no `$H` homing: `$22=0`, no limit switches configured.
- `G21` mm, `G90` absolute, `G91` relative
- `G92 X0 Y0` current position becomes the origin
- `$J=G91 X10 F1000` jogging (cancel with `0x85`)

## Pen (servo)

The pen is driven by the spindle PWM, as in both community projects (`references.md`):
- `M5` pen up, `M3 S905` pen down (S0-S1000, both projects confirm S905), then a short
  dwell `G4 P0.3` (100-600 ms) so the servo arrives.
- A higher S value lowers the pen further. inkbot makes the value adjustable ("Depth S").

Checked on the device (22.11.2026): alternating `M5` / `M3 S905`, 3 s each, moves the pen
up and down. The Z axis (`G0 Z...`) does nothing.

Pitfall: the main board C1 has a **power switch** next to the 12 V socket. When it is off,
USB only powers the controller: GRBL answers normally and acknowledges every command with
`ok`, but neither servo nor motors move. A first test with the switch off looked like a
defect. Switching on lifts the pen once. The app cannot detect the switch and reminds the
user before connecting.

## First moves

Test on 22.11.2026 (without a pen): `G92 X0 Y0`, `M3 S905`, a 20 mm square with
`G1 ... F1500`, `M5`. The machine draws the square cleanly and reports `Idle` back at the
start.

**Axis directions** (corrected after the first text on 22.11.2026): seen from the pen side,
the way you read the sheet, **+X points right** and **+Y points away from you**. The first
text therefore came out upside down, mirrored vertically. An earlier circle and square
test had suggested +Y towards the viewer, probably judged from the other side.

The app therefore mirrors the Y axis by default ("Invert Y axis" on the machine page). The
origin sits at the top left corner of the paper (`G92 X0 Y0`); down on the sheet means -Y in
machine coordinates.

Important when sending:
- Only close the port when everything is done. Opening and closing triggers the DTR reset,
  which aborts a running job.
- A single `Idle` status is not enough: during a dwell (`G4`) between two moves the machine
  briefly reports `Idle`. One test aborted mid-job because of that. A job is done only
  when every sent line has been acknowledged with `ok` **and** the status reports `Idle`
  several times in a row.

## Output of the real machine

Read on 22.11.2026, machine idle, read-only commands only.

### What it means

| Topic | Value | Meaning for the app |
|---|---|---|
| Firmware | `VER:1.1f.20170131` | GRBL 1.1f, built 31.01.2017 |
| Options | `OPT:VC,15,128` | Planner 15 blocks, RX buffer 128 bytes. `V` = variable spindle (PWM), `C` = CoreXY (meaning of the letters from memory, verify against the GRBL wiki) |
| Axis direction | `$3=3` | X and Y inverted |
| Homing | `$22=0` | No homing, the origin is set by hand (`G92 X0 Y0`) |
| Limits | `$20=0`, `$21=0` | Neither soft nor hard limits: the app must check that nothing leaves the drawing area |
| Laser mode | `$32=0` | Off. `M3 S...` stays active during `G0`, the pen does not lift by itself on travel moves |
| Spindle PWM | `$30=1000`, `$31=0` | S values 0 to 1000, drives the pen servo |
| Z axis | `$102=250`, `$112=500` | Configured but unused, the pen does not react to Z |
| Resolution | `$100=160`, `$101=160` | 160 steps per mm |
| Max rate | `$110=5000`, `$111=5000` | 5000 mm/min |
| Acceleration | `$120=400`, `$121=400` | 400 mm/s² |
| Motors | `$1=25` | Motors release 25 ms after a move; the head can then be pushed by hand and the position is lost |
| Max travel | `$130=1000`, `$131=1000` | Placeholder, not the real area (limits are off) |
| Status | `$10=1` | Status reports machine position (MPos) |

### Raw data

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
