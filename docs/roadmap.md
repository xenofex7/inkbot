# Roadmap

Stand 22.11.2026. Erledigtes ist mit [x] markiert.

## Version 1 - Grundfunktionen
- [x] **Verbinden:** Port wählen, Firmware prüfen, Status anzeigen, Konsole
- [x] **Maschine:** Joggen (1/5/10 mm), Stift hoch/runter mit einstellbarer Tiefe,
  Nullpunkt setzen, Y-Achse spiegeln
- [x] **Steuerleiste:** Stift, Tiefe, Position und Papier auf jeder Seite
- [x] **Text:** Single-Line-Fonts (Hershey, EMS), Grösse, Zeilenabstand, Ränder,
  Papierformat (A4, A5, A6, Couvert C6/DL), Ausrichtung
- [x] **Vorschau & Ausführen:** Blattvorschau, Laufzeit, Start / Pause / Stopp
- [ ] **SVG:** Import, Skalieren, Positionieren
- [ ] **Live-Tempo** per Vorschub-Override
- [ ] **GitHub Pages:** inkbot online stellen, nutzbar ohne lokalen Server

## Version 2 - Bilder & KI
- [x] **Bild → Linien:** Mittellinie, Umriss, Schraffur nach Helligkeit,
  Strichreihenfolge gegen Leerfahrten
- [x] **KI erfindet:** Prompt → Bild-KI im Line-Art-Stil → Linien. Anbieter OpenAI
  oder OpenAI-kompatibel (z.B. LiteLLM, darüber auch Higgsfield), Prompt-Vorlage
  einstellbar
- [x] BYOK: API-Key nur im Browser
- [ ] **KI zeichnet direkt:** Prompt → Sprachmodell liefert SVG mit Einzellinien,
  ohne Umwandlung (Karten, Muster, Deko)
- [ ] **KI baut um:** Foto → vereinfachte Strichzeichnung (Bild-zu-Bild)
- [ ] **Eine durchgehende Linie** (TSP-Art)

## Version 3 - Gestalten
- [ ] **Kartengestalter:** Text und Bild frei auf einem Blatt anordnen, Vorlagen für
  Grusskarten, Couverts, Tischkarten
- [ ] **Eigene Handschrift:** Vorlage ausdrucken, von Hand ausfüllen, fotografieren;
  inkbot zieht die Mittellinien der Buchstaben heraus und speichert sie als Schrift
- [ ] Couverts mit Adressliste (CSV)

## Später
- Zufallsvariation, damit Schrift echt wirkt (Zittern, Abstände, Buchstabenvarianten)
- Mehrere Stifte / Farben mit Pause zum Wechseln
- Projekte im Browser speichern (IndexedDB), Export/Import
- Zweisprachige Oberfläche (Deutsch und Englisch)
- Dark Mode
