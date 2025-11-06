# Auto 3D Creator - Modalità Manuale

## 🎯 Modifiche Implementate

### 1. **Zoom e Pan delle Immagini** ✅
- **Controlli Zoom**: Pulsanti +/- e Reset per entrambe le anteprime (fronte/retro)
- **Pan con Mouse**: Clicca e trascina per spostare l'immagine zoomata
- **Zoom con Rotella**: Usa la rotella del mouse per zoomare rapidamente
- **Stato Indipendente**: Ogni anteprima ha il proprio stato di zoom (1x - 5x)

### 2. **Rotazione Separata** ✅
- **Auto-Ruota Fronte**: Pulsante dedicato con algoritmo di rilevamento orientamento
- **Auto-Ruota Retro**: Pulsante dedicato separato
- **Undo Rotation**: Ogni lato ha il suo pulsante "Annulla" per tornare all'originale
- **Visual Feedback**: Mostra/nasconde pulsante undo quando appropriato

### 3. **Rimozione Sfondo Separata** ✅
- **Tolleranza Fronte**: Slider dedicato (20-100) con valore visualizzato
- **Tolleranza Retro**: Slider separato con controllo indipendente
- **Pulsante Rimuovi**: Un pulsante per ogni lato
- **Flood Fill Ottimizzato**: Parte dai bordi, max 50% dei pixel processati

### 4. **Strumento Gomma** ✅
- **Attiva/Disattiva**: Pulsante toggle per abilitare la gomma
- **Dimensione Regolabile**: Slider per dimensione gomma (5-100px)
- **Funziona su Entrambi**: Usa la gomma su fronte e retro
- **Visual Feedback**: Cursore cambia, pulsante diventa verde quando attivo
- **Interazione Mouse**: Clicca e trascina per cancellare pixel

### 5. **Generazione 3D Manuale** ✅
- **Pulsante Dedicato**: "Genera Modello 3D" si abilita quando il fronte è pronto
- **Normalizzazione Automatica**: Allinea dimensioni fronte/retro automaticamente
- **Viewer 3D**: Three.js con OrbitControls per ispezionare il modello
- **Export GLB/OBJ**: Scarica il modello in formato GLB (completo) o OBJ (solo geometria)

---

## 🎮 Workflow Completo

### Step 1: Caricamento
1. Carica immagine **Fronte** (obbligatorio)
2. Carica immagine **Retro** (opzionale)
3. Le anteprime si popolano automaticamente
4. I controlli zoom appaiono

### Step 2: Rotazione (opzionale)
1. Clicca **"🔄 Auto-Ruota"** sul fronte
2. L'algoritmo rileva l'orientamento ottimale (-10° a +10°)
3. Se non ti piace, clicca **"↶ Annulla"**
4. Ripeti per il retro se presente

### Step 3: Rimozione Sfondo
1. Regola la **tolleranza** con lo slider (default: 50)
   - Bassa (20-40): Rimuove solo colori molto simili
   - Media (40-60): Bilanciata
   - Alta (60-100): Rimuove più colore, rischio di rimuovere parti della carta
2. Clicca **"✂️ Rimuovi Sfondo"**
3. Ripeti per il retro con tolleranza diversa se necessario

### Step 4: Rifinitura con Gomma
1. Clicca **"✏️ Attiva Gomma"** (diventa verde)
2. Regola **dimensione** con lo slider
3. **Clicca e trascina** sulle anteprime per cancellare pixel indesiderati
4. Lavora su entrambi i lati senza disattivare la gomma
5. Clicca di nuovo per disattivare

### Step 5: Zoom per Dettagli
- Usa i pulsanti **+/- zoom** per ingrandire
- **Clicca e trascina** per muovere l'immagine zoomata (quando gomma è off)
- Usa la **rotella del mouse** per zoom veloce
- **Reset** per tornare alla vista normale

### Step 6: Generazione 3D
1. Il pulsante **"🚀 Genera Modello 3D"** si abilita quando il fronte è pronto
2. Clicca per generare il modello
3. Il viewer 3D appare con il modello
4. **Ruota/Zoom/Pan** con il mouse nel viewer 3D

### Step 7: Export
1. **📦 Scarica GLB**: Formato raccomandato (contiene texture)
2. **📄 Scarica OBJ**: Solo geometria (per editing avanzato)

---

## 🔧 Parametri Tecnici

### Rotazione
- **Range**: -10° a +10°
- **Step**: 1° (più veloce della versione automatica)
- **Risoluzione**: Max 800px per performance
- **Algoritmo**: Edge detection con scoring

### Rimozione Sfondo
- **Tolleranza Colore**: 20-100
- **Max Pixel**: 50% dell'immagine
- **Algoritmo**: Flood fill da bordi
- **Performance**: Step sampling per grandi immagini

### Gomma
- **Dimensione**: 5-100px
- **Modalità**: Destination-out (compositing)
- **Supporto Zoom**: La dimensione si adatta al livello di zoom

### Zoom
- **Range**: 0.1x - 5x
- **Step**: 0.2x per click
- **Wheel**: 0.1x per tick
- **Pan**: Illimitato, ripristinabile con Reset

### Modello 3D
- **Dimensioni Carta**: 85.6mm x 53.98mm (poker size)
- **Spessore**: 0.3mm
- **Texture**: CanvasTexture da HTML5 Canvas
- **Materiali**: 6 (fronte, retro, 4 bordi bianchi)
- **Export**: GLB (binario) o OBJ (testo)

---

## 📊 Differenze con Modalità Automatica

| Aspetto | Automatica (OLD) | Manuale (NEW) |
|---------|------------------|---------------|
| **Workflow** | Un click, tutto automatico | Step separati controllabili |
| **Rotazione** | Automatica | Su richiesta con undo |
| **Sfondo** | Tolleranza unica | Tolleranze separate fronte/retro |
| **Rifinitura** | Nessuna | Gomma interattiva |
| **Zoom** | Nessuno | Zoom/Pan su entrambe anteprime |
| **Controllo** | Minimo | Massimo |
| **Velocità** | Veloce | Più lenta ma precisa |
| **Errori** | Automatici | Correggibili manualmente |

---

## 🐛 Note Tecniche

### Gestione Stato
- **State Object**: Mantiene riferimenti a immagini originali per undo
- **Zoom State**: Oggetto separato per ogni canvas (front/back)
- **Flag Booleani**: Traccia operazioni completate (rotated, bgRemoved)

### Performance
- **Canvas Temporanei**: Usati per operazioni di zoom/pan senza perdita dati
- **Risoluzione Ridotta**: Per algoritmi pesanti (rotazione)
- **Limite Pixel**: Flood fill limitato al 50% per evitare blocchi
- **Debounce**: Zoom con rotella limitato naturalmente dal browser

### Eventi Mouse
- **mousedown/move/up**: Gestiscono pan e gomma
- **wheel**: Zoom con rotella
- **Modalità Switch**: Cursore cambia in base alla gomma attiva

---

## ✅ Testing Consigliato

1. **Carica solo fronte** → Genera 3D → Verifica retro grigio
2. **Carica fronte + retro** → Genera 3D → Verifica entrambi i lati
3. **Ruota → Undo** → Verifica ritorno all'originale
4. **Tolleranza bassa** → Poco rimosso → **Tolleranza alta** → Tanto rimosso
5. **Zoom 5x → Pan → Gomma** → Verifica precisione
6. **Export GLB** → Importa in Blender/Three.js viewer → Verifica texture

---

## 🎨 UI/UX Miglioramenti

- **Controlli Contestuali**: Appaiono solo quando rilevanti
- **Visual Feedback**: Spinner durante processing, status colorati
- **Disabilita Intelligente**: Pulsanti grigi quando non utilizzabili
- **Info Text**: Messaggi chiari su cosa fare dopo
- **Icone**: Emoji per identificazione rapida delle funzioni
- **Undo Visibile**: Pulsanti annulla mostrati solo dopo l'azione

---

Versione implementata: **2.0 - Manual Mode**  
Data: Novembre 2025  
Compatibilità: Electron 32 + Three.js 0.160.0
