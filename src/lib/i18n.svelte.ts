export type Locale = 'en' | 'de';

export const LOCALES: [Locale, string][] = [
	['en', 'English'],
	['de', 'Deutsch']
];

const en = {
	'nav.machine': 'Machine',
	'nav.gallery': 'Gallery',
	'nav.settings': 'Settings',
	'nav.design': 'Design',
	'design.title': 'Design a card',
	'design.add': 'Add',
	'design.addText': 'Text',
	'design.addFile': 'File',
	'design.addAi': 'AI',
	'design.addGallery': 'From gallery',
	'design.newText': 'Your text',
	'design.elements': 'Elements',
	'design.empty': 'Add text, an image or a drawing from the gallery, then drag it into place.',
	'design.galleryEmpty': 'The gallery is empty.',
	'design.duplicate': 'Duplicate',
	'design.remove': 'Remove',
	'design.selected': 'Selected element',
	'design.scale': 'Size: {value} %',
	'design.resize': 'Resize',
	'design.clear': 'Start over',
	'design.card': 'Card',
	'design.hint':
		'Drag an element to move it, drag its corner to resize it. Drop images or SVGs here to add them.',
	'design.kindText': 'Text',
	'design.kindRaster': 'Image',
	'design.kindVector': 'Drawing',
	'connect.button': 'Connect plotter',
	'connect.disconnect': 'Disconnect',

	'status.connecting': 'Connecting …',
	'status.disconnected': 'Disconnected',
	'status.alarm': 'Alarm',
	'status.penDown': 'Pen down',
	'status.paused': 'Paused',
	'status.moving': 'Moving',
	'status.connected': 'Connected',

	'bar.up': 'Up',
	'bar.down': 'Down',
	'bar.penUp': 'Pen up',
	'bar.penDown': 'Pen down',
	'bar.depth': 'Depth S',
	'bar.position': 'Pen position',
	'bar.paper': 'Paper format',
	'bar.orientation': 'Orientation',
	'bar.portrait': 'Portrait',
	'bar.landscape': 'Landscape',
	'bar.margin': 'Margin',
	'paper.envelope': 'Envelope',

	'job.resume': 'Resume',
	'job.pause': 'Pause',
	'job.stop': 'Stop',
	'job.draw': 'Draw',
	'job.saveSvg': 'Save SVG',
	'job.saveGallery': 'Save to gallery',
	'job.saved': 'Saved',
	'job.untitled': 'Untitled',
	'job.stroke': 'stroke',
	'job.strokes': 'strokes',
	'job.empty': 'Nothing to draw yet.',
	'job.approx': 'approx. {minutes} min',
	'job.outsideSheet': 'The drawing does not fit on the sheet. Reduce the size or the margin.',
	'job.outsideMachine': "The drawing reaches beyond the plotter's drawing area.",
	'job.connectFirst': 'Connect the plotter to draw.',
	'job.originBefore': 'The red dot is the origin. On the',
	'job.originLink': 'machine page',
	'job.originAfter': ', move the pen to the top left corner of the sheet and set the origin there.',
	'preview.label': 'Sheet preview, {width} × {height} mm',
	'range.less': 'Less',
	'range.more': 'More',

	'machine.title': 'Your plotter, right in the browser.',
	'machine.lede':
		'Connect the VigoTec VG-X4 via USB. No install, no server, everything runs here in the browser.',
	'machine.unsupported':
		'Your browser cannot talk to USB devices. Open inkbot in Chrome or Edge on a desktop computer.',
	'machine.beforeTitle': 'Before you connect',
	'machine.power1': 'Plug in the power supply and turn on the',
	'machine.powerSwitch': 'power switch',
	'machine.power2': 'on the board. Without it the plotter still answers, but nothing moves.',
	'machine.usb': 'Plug in the USB cable. The plotter shows up as "USB Serial" in the port picker.',
	'machine.pen': 'Place the pen at the top left of the paper. That is where the origin goes.',
	'machine.machine': 'Machine',
	'machine.state': 'State',
	'machine.firmware': 'Firmware',
	'machine.alarm': 'Alarm {code}. The machine is locked.',
	'machine.unlock': 'Unlock',
	'machine.test': 'Test',
	'machine.square': '20 mm square',
	'machine.barHint':
		'Pen, depth, position and paper live in the bar at the top. Pause and stop show up there while a job runs.',
	'machine.move': 'Move',
	'machine.up': 'Move up',
	'machine.left': 'Move left',
	'machine.origin': 'Set origin here',
	'machine.right': 'Move right',
	'machine.downMove': 'Move down',
	'machine.originHint':
		'The crosshair sets the origin at the current pen position. There are no limit switches, so do not drive past the frame.',
	'machine.invertY': 'Invert Y axis',
	'machine.invertYHint':
		'Turn on if text comes out upside down. Matches the VG-X4 when you read from the pen side.',
	'machine.console': 'Console',
	'machine.command': 'G-code command',
	'machine.commandPlaceholder': 'e.g. $$ or G0 X10',
	'machine.send': 'Send',

	'text.text': 'Text',
	'text.font': 'Font',
	'text.size': 'Size (mm)',
	'text.lineHeight': 'Line height',
	'text.left': 'Left',
	'text.centre': 'Centre',
	'text.right': 'Right',

	'ai.hint':
		'One idea, two suggestions: a clean vector drawing and a traced image. Use one or keep both.',
	'ai.idea': 'Idea',
	'ai.drawing': 'Drawing (vector)',
	'ai.image': 'Image (traced)',
	'ai.use': 'Use',
	'ai.saveBoth': 'Save both to gallery',
	'image.setupBefore': 'Set up an AI provider in the',
	'image.setupLink': 'settings',
	'image.setupAfter': 'first.',
	'image.ideaPlaceholder': 'e.g. a cat asleep on a stack of books',
	'image.generate': 'Generate',
	'image.generating': 'Generating …',
	'image.noResponse':
		'No response from the provider. Is the URL correct and does the server allow browser requests (CORS)?',
	'image.saveImage': 'Save image',
	'image.saveSource': 'Save source SVG',
	'image.lines': 'Lines',
	'image.linesHint': 'Centre line of dark strokes, best for line art',
	'image.outline': 'Outline',
	'image.outlineHint': 'Contour of dark areas',
	'image.hatch': 'Hatching',
	'image.hatchHint': 'Brightness as hatching, for photos',
	'image.threshold': 'Threshold: {value}',
	'image.detail': 'Detail: {value} px',
	'image.fill': 'Hatch filled areas',
	'image.fillHint': 'Dark areas wider than a stroke get an outline and diagonal hatching.',
	'image.spacing': 'Line spacing: {value} mm',
	'image.preview': 'Preview',

	'gallery.title': 'Gallery',
	'gallery.emptyBefore': 'No drawings yet. Use "Save to gallery" in the',
	'gallery.emptyAfter': ' and they show up here.',
	'gallery.confirm': 'Delete "{name}"?',
	'gallery.delete': 'Delete',
	'gallery.deleteLabel': 'Delete {name}',
	'gallery.cancel': 'Cancel',
	'gallery.open': 'Open in designer',
	'gallery.pick':
		'Pick a drawing to preview and plot it. The paper in the bar switches to the one it was made for.',

	'settings.language': 'Language',
	'settings.languageHint': 'Interface language of inkbot.',
	'settings.provider': 'AI provider',
	'settings.providerHint':
		'The key is stored in this browser only and goes straight to the provider, never to an inkbot server.',
	'settings.providerLabel': 'Provider',
	'settings.compatible': 'OpenAI-compatible (e.g. LiteLLM)',
	'settings.baseUrl': 'Base URL',
	'settings.baseUrlHint':
		'The server must allow requests from the browser (CORS). LiteLLM can also route to other providers such as Higgsfield.',
	'settings.apiKey': 'API key',
	'settings.imageModel': 'Image model',
	'settings.imageSize': 'Image size',
	'settings.landscape': 'landscape',
	'settings.portrait': 'portrait',
	'settings.drawingModel': 'Drawing model',
	'settings.drawingModelPlaceholder': 'A chat model, used for AI drawings as SVG',
	'settings.test': 'Test connection',
	'settings.testOk': 'Connected, found {count} models.',
	'settings.imagePrompt': 'Image prompt',
	'settings.imagePromptHint1':
		'Wrapped around your image idea so the result is a clean line drawing.',
	'settings.imagePromptHint2': 'stands for your input.',
	'settings.restore': 'Restore default',
	'settings.drawingPrompt': 'Drawing prompt',
	'settings.drawingPromptHint1':
		'Instructions for the drawing model. Your idea is sent as the message.',
	'settings.and': 'and',
	'settings.drawingPromptHint2': 'stand for the printable area in mm.',

	'error.noPlotterResponse': 'No response from the plotter. Is it switched on?',
	'error.disconnected': 'Disconnected',
	'error.notConnected': 'Not connected',
	'error.reset': 'The plotter was reset'
};

export type MessageKey = keyof typeof en;
type Key = MessageKey;

const de: Record<Key, string> = {
	'nav.machine': 'Maschine',
	'nav.gallery': 'Galerie',
	'nav.settings': 'Einstellungen',
	'nav.design': 'Gestalten',
	'design.title': 'Karte gestalten',
	'design.add': 'Hinzufügen',
	'design.addText': 'Text',
	'design.addFile': 'Datei',
	'design.addAi': 'KI',
	'design.addGallery': 'Aus Galerie',
	'design.newText': 'Dein Text',
	'design.elements': 'Elemente',
	'design.empty':
		'Füge Text, ein Bild oder eine Zeichnung aus der Galerie hinzu und zieh sie an ihren Platz.',
	'design.galleryEmpty': 'Die Galerie ist leer.',
	'design.duplicate': 'Duplizieren',
	'design.remove': 'Entfernen',
	'design.selected': 'Ausgewähltes Element',
	'design.scale': 'Grösse: {value} %',
	'design.resize': 'Grösse ändern',
	'design.clear': 'Neu beginnen',
	'design.card': 'Karte',
	'design.hint':
		'Element ziehen zum Verschieben, an der Ecke ziehen für die Grösse. Bilder oder SVGs hierher ziehen, um sie hinzuzufügen.',
	'design.kindText': 'Text',
	'design.kindRaster': 'Bild',
	'design.kindVector': 'Zeichnung',
	'connect.button': 'Plotter verbinden',
	'connect.disconnect': 'Trennen',

	'status.connecting': 'Verbinde …',
	'status.disconnected': 'Getrennt',
	'status.alarm': 'Alarm',
	'status.penDown': 'Stift unten',
	'status.paused': 'Pausiert',
	'status.moving': 'Fährt',
	'status.connected': 'Verbunden',

	'bar.up': 'Hoch',
	'bar.down': 'Runter',
	'bar.penUp': 'Stift hoch',
	'bar.penDown': 'Stift runter',
	'bar.depth': 'Tiefe S',
	'bar.position': 'Stiftposition',
	'bar.paper': 'Papierformat',
	'bar.orientation': 'Lage',
	'bar.portrait': 'Hoch',
	'bar.landscape': 'Quer',
	'bar.margin': 'Rand',
	'paper.envelope': 'Couvert',

	'job.resume': 'Weiter',
	'job.pause': 'Pause',
	'job.stop': 'Stopp',
	'job.draw': 'Zeichnen',
	'job.saveSvg': 'SVG speichern',
	'job.saveGallery': 'In Galerie speichern',
	'job.saved': 'Gespeichert',
	'job.untitled': 'Ohne Titel',
	'job.stroke': 'Strich',
	'job.strokes': 'Striche',
	'job.empty': 'Noch nichts zu zeichnen.',
	'job.approx': 'ca. {minutes} min',
	'job.outsideSheet': 'Die Zeichnung passt nicht aufs Blatt. Grösse oder Rand verkleinern.',
	'job.outsideMachine': 'Die Zeichnung reicht über die Zeichenfläche des Plotters hinaus.',
	'job.connectFirst': 'Verbinde den Plotter, um zu zeichnen.',
	'job.originBefore': 'Der rote Punkt ist der Nullpunkt. Fahre den Stift auf der',
	'job.originLink': 'Maschinen-Seite',
	'job.originAfter': 'an die obere linke Ecke des Blatts und setze dort den Nullpunkt.',
	'preview.label': 'Vorschau des Blatts, {width} × {height} mm',
	'range.less': 'Weniger',
	'range.more': 'Mehr',

	'machine.title': 'Dein Plotter, direkt im Browser.',
	'machine.lede':
		'Verbinde den VigoTec VG-X4 per USB. Ohne Installation, ohne Server, alles läuft hier im Browser.',
	'machine.unsupported':
		'Dein Browser kann nicht mit USB-Geräten sprechen. Öffne inkbot in Chrome oder Edge am Computer.',
	'machine.beforeTitle': 'Vor dem Verbinden',
	'machine.power1': 'Netzteil einstecken und den',
	'machine.powerSwitch': 'Netzschalter',
	'machine.power2':
		'auf der Platine einschalten. Ohne ihn antwortet der Plotter zwar, bewegt sich aber nicht.',
	'machine.usb': 'USB-Kabel einstecken. Im Auswahlfenster erscheint der Plotter als "USB Serial".',
	'machine.pen': 'Stift oben links aufs Papier setzen, dort kommt der Nullpunkt hin.',
	'machine.machine': 'Maschine',
	'machine.state': 'Zustand',
	'machine.firmware': 'Firmware',
	'machine.alarm': 'Alarm {code}. Die Maschine ist gesperrt.',
	'machine.unlock': 'Entsperren',
	'machine.test': 'Test',
	'machine.square': 'Quadrat 20 mm',
	'machine.barHint':
		'Stift, Tiefe, Position und Papier sind oben in der Leiste. Dort erscheinen während einer Fahrt auch Pause und Stopp.',
	'machine.move': 'Bewegen',
	'machine.up': 'Nach oben',
	'machine.left': 'Nach links',
	'machine.origin': 'Nullpunkt hier setzen',
	'machine.right': 'Nach rechts',
	'machine.downMove': 'Nach unten',
	'machine.originHint':
		'Das Fadenkreuz setzt den Nullpunkt an die aktuelle Stiftposition. Es gibt keine Endschalter, also nicht über den Rahmen hinausfahren.',
	'machine.invertY': 'Y-Achse umkehren',
	'machine.invertYHint':
		'Einschalten, wenn Text auf dem Kopf steht. Passt zum VG-X4, wenn Du von der Stift-Seite her liest.',
	'machine.console': 'Konsole',
	'machine.command': 'G-Code-Befehl',
	'machine.commandPlaceholder': 'z.B. $$ oder G0 X10',
	'machine.send': 'Senden',

	'text.text': 'Text',
	'text.font': 'Schrift',
	'text.size': 'Grösse (mm)',
	'text.lineHeight': 'Zeilenabstand',
	'text.left': 'Links',
	'text.centre': 'Mitte',
	'text.right': 'Rechts',

	'ai.hint':
		'Eine Idee, zwei Vorschläge: eine saubere Vektorzeichnung und ein nachgezeichnetes Bild. Nimm eines oder behalte beide.',
	'ai.idea': 'Idee',
	'ai.drawing': 'Zeichnung (Vektor)',
	'ai.image': 'Bild (nachgezeichnet)',
	'ai.use': 'Verwenden',
	'ai.saveBoth': 'Beide in Galerie speichern',
	'image.setupBefore': 'Hinterlege zuerst einen KI-Anbieter in den',
	'image.setupLink': 'Einstellungen',
	'image.setupAfter': '.',
	'image.ideaPlaceholder': 'z.B. eine Katze, die auf einem Bücherstapel schläft',
	'image.generate': 'Generieren',
	'image.generating': 'Generiere …',
	'image.noResponse':
		'Keine Antwort vom Anbieter. Ist die URL richtig und erlaubt der Server Anfragen aus dem Browser (CORS)?',
	'image.saveImage': 'Bild speichern',
	'image.saveSource': 'Quell-SVG speichern',
	'image.lines': 'Linien',
	'image.linesHint': 'Mittellinie dunkler Striche, ideal für Strichzeichnungen',
	'image.outline': 'Umriss',
	'image.outlineHint': 'Kontur dunkler Flächen',
	'image.hatch': 'Schraffur',
	'image.hatchHint': 'Helligkeit als Schraffur, für Fotos',
	'image.threshold': 'Schwelle: {value}',
	'image.detail': 'Detail: {value} px',
	'image.fill': 'Gefüllte Flächen schraffieren',
	'image.fillHint':
		'Dunkle Flächen, die breiter als ein Strich sind, bekommen einen Umriss und eine diagonale Schraffur.',
	'image.spacing': 'Linienabstand: {value} mm',
	'image.preview': 'Vorschau',

	'gallery.title': 'Galerie',
	'gallery.emptyBefore': 'Noch keine Zeichnungen. Nutze "In Galerie speichern" im',
	'gallery.emptyAfter': ', dann erscheinen sie hier.',
	'gallery.confirm': '"{name}" löschen?',
	'gallery.delete': 'Löschen',
	'gallery.deleteLabel': '{name} löschen',
	'gallery.cancel': 'Abbrechen',
	'gallery.open': 'Im Gestalter öffnen',
	'gallery.pick':
		'Wähle eine Zeichnung, um sie anzusehen und zu zeichnen. Das Papier in der Leiste wechselt auf das, für das sie gemacht wurde.',

	'settings.language': 'Sprache',
	'settings.languageHint': 'Sprache der inkbot-Oberfläche.',
	'settings.provider': 'KI-Anbieter',
	'settings.providerHint':
		'Der Schlüssel bleibt nur in diesem Browser gespeichert und geht direkt an den Anbieter, nie an einen inkbot-Server.',
	'settings.providerLabel': 'Anbieter',
	'settings.compatible': 'OpenAI-kompatibel (z.B. LiteLLM)',
	'settings.baseUrl': 'Basis-URL',
	'settings.baseUrlHint':
		'Der Server muss Anfragen aus dem Browser erlauben (CORS). Über LiteLLM lassen sich auch andere Anbieter wie Higgsfield einbinden.',
	'settings.apiKey': 'API-Schlüssel',
	'settings.imageModel': 'Bildmodell',
	'settings.imageSize': 'Bildgrösse',
	'settings.landscape': 'quer',
	'settings.portrait': 'hoch',
	'settings.drawingModel': 'Zeichenmodell',
	'settings.drawingModelPlaceholder': 'Ein Chat-Modell, für KI-Zeichnungen als SVG',
	'settings.test': 'Verbindung testen',
	'settings.testOk': 'Verbunden, {count} Modelle gefunden.',
	'settings.imagePrompt': 'Bild-Prompt',
	'settings.imagePromptHint1':
		'Wird um Deine Bildidee gelegt, damit eine saubere Strichzeichnung entsteht.',
	'settings.imagePromptHint2': 'steht für Deine Eingabe.',
	'settings.restore': 'Standard wiederherstellen',
	'settings.drawingPrompt': 'Zeichen-Prompt',
	'settings.drawingPromptHint1':
		'Anweisungen für das Zeichenmodell. Deine Idee wird als Nachricht geschickt.',
	'settings.and': 'und',
	'settings.drawingPromptHint2': 'stehen für die bedruckbare Fläche in mm.',

	'error.noPlotterResponse': 'Keine Antwort vom Plotter. Ist er eingeschaltet?',
	'error.disconnected': 'Verbindung getrennt',
	'error.notConnected': 'Nicht verbunden',
	'error.reset': 'Der Plotter wurde zurückgesetzt'
};

const MESSAGES: Record<Locale, Record<Key, string>> = { en, de };
const STORAGE_KEY = 'inkbot.locale';

function initialLocale(): Locale {
	if (typeof localStorage === 'undefined') return 'en';
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'en' || stored === 'de') return stored;
	} catch {
		return 'en';
	}
	return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
}

class I18n {
	locale = $state<Locale>(initialLocale());

	set(locale: Locale) {
		this.locale = locale;
		try {
			localStorage.setItem(STORAGE_KEY, locale);
		} catch {
			return;
		}
	}
}

export const i18n = new I18n();

export function t(key: Key, params: Record<string, string | number> = {}) {
	let text = MESSAGES[i18n.locale][key];
	for (const [name, value] of Object.entries(params)) {
		text = text.replaceAll(`{${name}}`, String(value));
	}
	return text;
}

export function strokes(count: number) {
	return `${count} ${t(count === 1 ? 'job.stroke' : 'job.strokes')}`;
}

export function paperName(format: { id: string; name: string }) {
	return format.name.replace('Envelope', t('paper.envelope'));
}
