# Card Garage - Card Master Tools Suite 🎴

Una suite professionale di strumenti per la gestione, analisi e creazione di modelli 3D di carte da gioco e collezionabili. Sviluppata con Electron per funzionalità desktop avanzate.

## 🌐 Demo Online

**Sito Web:** [https://ernachos.github.io/CardGarage](https://ernachos.github.io/CardGarage)

## 🛠️ Strumenti Disponibili

### 1. 📏 Calibration Tool
Sistema avanzato per calibrazione e misurazione di precisione per il grading di carte.

**Funzionalità:**
- **Lente di ingrandimento** con zoom 3x per precisione estrema
- **Sistema di rotazione** per correggere l'orientamento dell'immagine
- **Calibrazione scala** con riferimento in millimetri
- **Misurazione 8 punti** con indicatori direzionali colorati
- **Analisi centratura** con percentuali di distribuzione
- **Esportazione immagini** con overlay di misure

### 2. 🔍 Defect Finder Tool
Strumento per l'identificazione e catalogazione dei difetti sulle carte.

**Funzionalità:**
- **Lente di ingrandimento** per ispezione dettagliata
- **Marcatura difetti** su fronte e retro
- **Sistema di scoring** automatico basato sul numero di difetti
- **Categorizzazione** per tipo e gravità
- **Report PDF** esportabile con dettagli completi

### 3. 📊 Report Maker Tool
Generatore di report PDF professionali per certificazione e grading.

**Funzionalità:**
- **Integrazione dati** da Calibration e Defect Finder
- **Report multi-pagina** con layout professionale
- **Calcolo grade finale** automatico
- **Grade manuale** per difetti fronte/retro
- **Visualizzazione punti calibrazione** sul PDF
- **Esportazione PDF** pronta per stampa

### 4. 🎨 3D Card Creator
Tool rivoluzionario per creare modelli 3D realistici di carte.

**Funzionalità:**
- **Doppia immagine** (fronte e retro)
- **Allineamento indipendente** per ogni lato
- **Ritaglio intelligente** con flood fill (solo sfondo esterno)
- **Rimozione macchie** automatica (pixel isolati)
- **Auto-crop** al contenuto
- **Dimensioni uniformi** fronte/retro con padding
- **Lente di ingrandimento** sempre attiva
- **Zoom dinamico** (50-400%) con mouse wheel
- **Pan** con rotella mouse o tasto destro
- **Strumento gomma** per rifinitura manuale
- **Visualizzazione contorni** aglomerati pixel
- **Undo ritaglio** per correzioni
- **Modello 3D** con 0.3mm di spessore
- **Texture stretch** per copertura completa
- **Export GLB/OBJ** per software 3D

## 📁 Struttura del Progetto

```
CardGarage/
├── index.html                  # Homepage principale
├── Main.js                     # Processo Electron
├── preload.js                  # Script IPC sicuro
├── package.json                # Configurazione npm
├── tools/                      # Directory strumenti
│   ├── calibration/           # Tool calibrazione
│   │   ├── index.html
│   │   └── calibration-tool.js
│   ├── defect-finder/         # Tool rilevamento difetti
│   │   ├── index.html
│   │   └── defect-finder-tool.js
│   ├── report-maker/          # Generatore report
│   │   ├── index.html
│   │   └── report-maker-tool.js
│   └── image-crop/            # 3D Card Creator
│       ├── index.html
│       └── image-crop-3d.js
├── assets/                     # Risorse condivise
│   ├── css/
│   └── js/
└── docs/                      # Documentazione
    └── copilot-instructions.md
```

## 🚀 Installazione ed Uso

### Come Applicazione Desktop (Electron)

1. **Clona il repository:**
   ```bash
   git clone https://github.com/ErNachos/CardGarage.git
   cd CardGarage
   ```

2. **Installa dipendenze:**
   ```bash
   npm install
   ```

3. **Avvia l'applicazione:**
   ```bash
   npm start
   ```

### Come Sito Web (GitHub Pages)

Visita semplicemente: [https://ernachos.github.io/CardGarage](https://ernachos.github.io/CardGarage)

> **Nota:** Alcune funzionalità avanzate potrebbero richiedere l'applicazione desktop.

## 💡 Tecnologie Utilizzate

- **Electron** - Framework desktop cross-platform
- **Three.js** - Rendering 3D e export GLB/OBJ
- **jsPDF** - Generazione PDF
- **Tailwind CSS** - Styling moderno e responsivo
- **HTML5 Canvas** - Rendering 2D ad alte prestazioni
- **ES6 Modules** - Architettura modulare

## 🎯 Workflow Completo: Dalla Carta al Modello 3D

### 1. Calibrazione (Calibration Tool)
- Carica immagine della carta
- Calibra scala di riferimento
- Misura centratura con 8 punti
- Esporta dati

### 2. Analisi Difetti (Defect Finder)
- Carica fronte e retro
- Marca difetti con lente di ingrandimento
- Sistema assegna score automatico
- Genera report difetti

### 3. Report Finale (Report Maker)
- Importa dati calibrazione e difetti
- Aggiungi grade manuale
- Genera PDF professionale con 4 pagine:
  - Centratura
  - Difetti retro
  - Difetti fronte
  - Summary e grade finale

### 4. Modello 3D (3D Card Creator)
- Carica immagini fronte/retro
- Allinea (opzionale)
- Rileva colore sfondo
- Ritaglia con flood fill intelligente
- Rifinitura con gomma e contorni
- Genera modello 3D con texture
- Esporta GLB per Blender/Unity/etc.

## 🔧 Funzionalità Avanzate 3D Card Creator

### Ritaglio Intelligente
- **Flood Fill**: Rimuove solo lo sfondo esterno, preserva dettagli interni
- **Rimozione macchie**: Elimina aglomerati < soglia (10-500 px)
- **Auto-crop**: Dimensioni minime contenenti solo carta
- **Uniformità**: Fronte/retro stesse dimensioni con padding

### Strumenti di Precisione
- **Lente 5x**: Visualizzazione ingrandita con HEX/RGB
- **Gomma**: Dimensione 5-100px per rifinitura manuale
- **Contorni**: Evidenzia aglomerati pixel per identificare macchie
- **Zoom**: 50-400% con mouse wheel
- **Pan**: Rotella/destro/Shift+click

### Export 3D
- **Formato GLB**: Binary GLTF con texture embedded
- **Spessore**: 0.3mm realistico
- **Texture**: Stretch completo su facce
- **Compatibilità**: Blender, Unity, Unreal Engine, Sketchfab

## � Requisiti di Sistema

### Applicazione Desktop
- Windows 10/11, macOS 10.13+, o Linux
- Node.js 14+ e npm
- 4GB RAM minimo
- GPU con supporto WebGL per 3D

### Browser (GitHub Pages)
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- WebGL 2.0 supportato
- 2GB RAM disponibile

## 🤝 Contributi

I contributi sono benvenuti! Per contribuire:

1. Fork del progetto
2. Crea branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit modifiche (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

## � Licenza

Questo progetto è sotto licenza proprietaria. Tutti i diritti riservati.

## 👤 Autore

**ErNachos**
- GitHub: [@ErNachos](https://github.com/ErNachos)
- Repository: [CardGarage](https://github.com/ErNachos/CardGarage)

## 🙏 Ringraziamenti

- Three.js per il motore 3D
- jsPDF per la generazione PDF
- Tailwind CSS per lo styling
- Electron per il framework desktop

---

**Versione:** 2.0  
**Ultimo Aggiornamento:** Novembre 2025  
**Status:** Attivamente Sviluppato 🚀