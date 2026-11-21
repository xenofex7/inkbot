# Roadmap

## Version 1 – Grundfunktionen
1. **Verbinden:** Port wählen, Firmware prüfen, Status anzeigen, Konsole
2. **Maschine:** Joggen (1/5/10 mm), Stift hoch/runter testen, Nullpunkt setzen
3. **Text:** Single-Line-Fonts (Hershey), Grösse, Zeilenabstand, Ränder, Papierformat
   (A4, A5, A6, Couvert C6/DL), Ausrichtung
4. **SVG:** Import, Skalieren, Positionieren
5. **Vorschau & Ausführen:** Pfadvorschau, Laufzeit, Start / Pause / Stopp,
   Live-Tempo per Override

## Version 2 – Bilder & KI
- **Bild → Linien:** Konturen (Kantenerkennung), Schraffur nach Helligkeit,
  „eine durchgehende Linie“ (TSP-Art)
- **KI erfindet:** Prompt → Bild-KI im Line-Art-Stil → Vektorisieren
- **KI zeichnet direkt:** Prompt → Sprachmodell liefert SVG (Karten, Muster, Deko)
- **KI baut um:** Foto → vereinfachte Strichzeichnung
- BYOK: API-Key nur im Browser, Anbieter wählbar

## Später
- Eigene Handschrift digitalisieren (Buchstaben zeichnen, als Font speichern)
- Zufallsvariation, damit Schrift echt wirkt (Zittern, Abstände, Buchstabenvarianten)
- Vorlagen: Grusskarten, Couverts mit Adressliste (CSV), Tischkarten
- Mehrere Stifte / Farben mit Pause zum Wechseln
- Projekte im Browser speichern (IndexedDB), Export/Import

## Namensideen
- Arbeitstitel: `vg-x4-plotter`
- Ideen: `penplot`, `inkbot`, `schriibroboter`, `plotty`, `quill`, `vigo-web`
  (kein „VigoTec“ im Namen, da nicht offiziell)
