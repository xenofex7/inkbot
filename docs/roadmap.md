# Roadmap

As of 22.11.2026. Done items are marked [x].

## Version 1 - Basics
- [x] **Connect:** choose port, check firmware, show status, console
- [x] **Machine:** jogging (1/5/10 mm), pen up/down with adjustable depth, set origin,
  invert Y axis
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
- [ ] **Live speed** via feed override
- [ ] **GitHub Pages:** put inkbot online, usable without a local server

## Version 2 - Images & AI
- [x] **Image to lines:** centre lines, outline, hatching by brightness, hatched fills,
  stroke ordering to cut pen-up travel
- [x] **AI invents:** prompt to line-art image to lines. Providers OpenAI or
  OpenAI-compatible (e.g. LiteLLM, which can also route to Higgsfield), editable prompt
  template
- [x] Bring your own key: the API key stays in the browser
- [x] **AI draws directly:** a language model returns an SVG of single lines, no
  conversion needed (cards, patterns, decorations)
- [ ] **AI redraws:** photo to simplified line drawing (image to image)
- [ ] **One continuous line** (TSP art)

## Version 3 - Design
- [ ] **Card designer:** place text and images freely on a sheet, templates for greeting
  cards, envelopes, place cards
- [ ] **Own handwriting:** print a template, fill it in by hand, take a photo; inkbot
  extracts the centre lines of each letter and stores them as a font
- [ ] Envelopes from an address list (CSV)

## Later
- Random variation so writing looks real (jitter, spacing, letter variants)
- Several pens / colours with a pause to swap
- Gallery export and import (backup or move to another browser)
- Dark mode
