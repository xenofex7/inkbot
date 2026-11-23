# Roadmap

As of 23.11.2026. Done items are marked [x].

## Version 1 - Basics
- [x] **Connect:** choose port, check firmware, show status, console
- [x] **Machine:** jogging (1/5/10 mm), pen up/down with adjustable depth, set origin,
  go to origin, invert Y axis
- [x] **Control bar:** pen, depth, position and paper on every page
- [x] **Text:** single-line fonts (Hershey, EMS), size, line height, margins, paper format
  (A4, A5, A6, envelopes C6/DL), alignment
- [x] **Preview & run:** sheet preview, run time, start / pause / stop
- [x] **Save:** drawing as SVG, source image as file
- [x] **Languages:** English and German, switchable in the settings, follows the browser
  language on the first visit
- [x] **Gallery:** save drawings with their source in the browser (IndexedDB), preview,
  plot again, reopen in the editor, delete
- [x] **SVG:** import, scale, position
- [x] **Live speed** via feed override (10 to 200 %)
- [x] **GitHub Pages:** put inkbot online, usable without a local server, version and build
  shown in the footer

## Version 2 - Images & AI
- [x] **Image to lines:** centre lines, outline, hatching by brightness, hatched fills,
  stroke ordering to cut pen-up travel
- [x] **AI invents:** prompt to line-art image to lines. Providers OpenAI or
  OpenAI-compatible (e.g. LiteLLM, which can also route to Higgsfield), editable prompt
  template
- [x] Bring your own key: the API key stays in the browser
- [x] **AI draws directly:** a language model returns an SVG of single lines, no
  conversion needed (cards, patterns, decorations)
- [x] **AI redraws:** photo to simplified line drawing (image to image)
- [x] **One continuous line** (TSP art): stippling by brightness, nearest neighbour route
  improved with 2-opt

## Version 3 - Design
- [x] **Card designer:** place text, images, AI results and gallery drawings freely on a
  sheet, move and resize them, plot or save the whole card
- [x] **One workspace:** text, image and SVG editing merged into the designer, AI suggests a
  vector drawing and a traced image from one idea
- [x] **Card templates:** folded greeting card, envelope with address field, place card
- [x] Rotate elements by 90°
- [x] **Pen, eraser and layers:** draw freehand, erase parts of any element, show or hide
  elements
- [x] **Own handwriting:** draw each character in the browser or on an iPhone (QR code,
  share via AirDrop), or print or plot a template, fill it in and scan a photo; up to three
  variants per character, natural variation from letter to letter
- [x] Envelopes from an address list (CSV): placeholders like {Name} in any text, step
  through the rows
- [x] **Several pens:** up to four pens per card, drawn pen by pen with a prompt to swap
- [x] **Path preview and resume:** play the pen path stroke by stroke, continue an
  interrupted drawing from any stroke

## Version 4 - Data
- [x] **Dark mode:** follows the system setting, night ink surfaces from the design system
- [x] **Backup:** export and import settings, prompts, gallery and handwriting in one file
  (without the API key)
- [x] **Automatic backup:** write the backup file into a chosen folder (e.g. iCloud Drive)
  after every change, Chrome and Edge on a computer
