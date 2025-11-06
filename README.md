# Card Garage - Card Master Tools Suite 🎴

Una suite professionale di strumenti per la gestione, analisi e creazione di modelli 3D di carte da gioco e collezionabili. Sviluppata con Electron per funzionalità desktop avanzate.

## 🌐 Demo Online

**Sito Web:** [https://ernachos.github.io/CardGarage](https://ernachos.github.io/CardGarage)

## 🛠️ Strumenti Disponibili

### 1. 🤖 Auto 3D Creator
Tool rivoluzionario per generazione automatica di modelli 3D senza interventi manuali.

**Funzionalità:**
- **Auto-orientamento** basato su rilevamento segmenti orizzontali
- **Rimozione automatica sfondo** con tolleranza colore configurabile
- **Normalizzazione automatica** forma tra fronte e retro
- **Generazione 3D** completamente automatica
- **Zero setup** - carica e vai!
- **Export GLB/OBJ** diretto
- **Pipeline intelligente** con 5 fasi automatiche
- **Controlli configurabili** per ottimizzazione

### 2. 🔍 Defect Finder Tool
Strumento per l'identificazione e catalogazione dei difetti sulle carte.

**Funzionalità:**
- **Lente di ingrandimento** per ispezione dettagliata
- **Marcatura difetti** fino a 8 punti con visualizzazione circolare
- **Rotazione manuale** con 2 punti di riferimento
- **Zoom e Pan** per navigazione precisa
- **Cattura automatica** aree ingrandite per ogni difetto
- **Export immagini** con marcatori numerati
- **Report composito** con miniature difetti

### 3. 🎨 3D Card Creator
Tool per creare modelli 3D realistici di carte con controllo manuale completo.

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
│   ├── auto-3d/               # Auto 3D Creator (Automatico)
│   │   ├── index.html
│   │   └── auto-3d-tool.js
│   ├── defect-finder/         # Tool rilevamento difetti
│   │   ├── index.html
│   │   └── defect-finder-tool.js
│   └── image-crop/            # 3D Card Creator (Manuale)
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

### Opzione A: Workflow Automatico (Auto 3D Creator)
- Carica immagine fronte (obbligatoria) e retro (opzionale)
- Il tool esegue automaticamente:
  - Auto-orientamento con rilevamento bordi
  - Rimozione sfondo con tolleranza configurabile
  - Normalizzazione forme
  - Generazione modello 3D
- Scarica GLB pronto per l'uso

### Opzione B: Workflow Manuale

#### 1. Analisi Difetti (Defect Finder)
- Carica immagine della carta
- Ruota per orientamento corretto (opzionale)
- Marca difetti con lente di ingrandimento
- Esporta immagine con marcatori numerati
- Genera report composito con miniature

#### 2. Modello 3D Manuale (3D Card Creator)
- Carica immagini fronte/retro
- Allinea manualmente (opzionale)
- Rileva colore sfondo manualmente
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