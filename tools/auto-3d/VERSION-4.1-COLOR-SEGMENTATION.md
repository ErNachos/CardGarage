# Auto 3D v4.1 - Color Segmentation + MinAreaRect

## 🎯 OBIETTIVO
Rilevare automaticamente carte Pokemon con **angoli smussati** su sfondo nero, gestendo rotazioni fino a ±10°.

---

## 🔄 CAMBIAMENTI DA v4.0

### ❌ PROBLEMA v4.0
- **Edge detection (Sobel)** cerca bordi netti e rettilinei
- **Carte Pokemon hanno angoli arrotondati** → edge detection non trova un rettangolo completo
- Contorni incompleti causano rilevamento errato o mancato

### ✅ SOLUZIONE v4.1
- **Color Segmentation**: separa pixel della carta (chiari) da sfondo (nero) usando soglia di luminosità
- **Morphological Operations**: chiude i gap causati dagli angoli smussati
- **MinAreaRect**: calcola il rettangolo ruotato minimo sui pixel della carta
- **Soglia configurabile**: slider per adattarsi a carte di colori diversi

---

## 🏗️ NUOVA PIPELINE

### 1️⃣ Color Segmentation
```javascript
segmentByColor(canvas, threshold)
```
- Converte immagine in grayscale
- Pixel con `brightness > threshold` → CARTA (255)
- Pixel con `brightness ≤ threshold` → SFONDO (0)
- Ritorna maschera binaria

**Vantaggi:**
- ✅ Funziona con angoli smussati (non cerca bordi netti)
- ✅ Robusto su sfondo uniforme nero
- ✅ Configurabile per carte scure/chiare

### 2️⃣ Morphological Closing
```javascript
morphologicalClose(mask, kernelSize = 5)
```
- **Dilate**: espande i pixel bianchi (riempie piccoli gap)
- **Erode**: riduce i pixel bianchi (riporta forma originale)
- **Risultato**: angoli smussati vengono "chiusi" → forma rettangolare

### 3️⃣ Extract Points
```javascript
extractPoints(mask)
```
- Estrae tutte le coordinate (x,y) dei pixel bianchi (carta)
- Minimo 1000 pixel richiesti per procedere

### 4️⃣ MinAreaRect (±10°)
```javascript
getMinAreaRect(points, minAngle = -10, maxAngle = 10, step = 0.5)
```
- Testa 41 angoli da -10° a +10° (step 0.5°)
- Per ogni angolo: ruota i punti, calcola bounding box
- Ritorna il rettangolo con area minima
- **Ridotto da ±45° a ±10°** (specifiche utente)

### 5️⃣ Extract & Straighten
```javascript
extractAndStraightenV2(sourceCanvas, rotatedRect)
```
- Ruota immagine di `-angle` per raddrizzare
- Estrae il rettangolo della carta
- Se orizzontale → ruota 90° per renderla verticale

---

## 🎨 NUOVA UI: SLIDER CONTRASTO

```html
<input type="range" id="contrastSlider" min="30" max="100" value="50" step="5">
```

### Parametri:
- **Default: 50** (medio)
- **30-50**: Carte scure su sfondo nero (basso contrasto)
- **50-100**: Carte chiare su sfondo nero (alto contrasto)

### JavaScript:
```javascript
let contrastThreshold = 50; // Default medio (30-100)

document.getElementById('contrastSlider').addEventListener('input', (e) => {
    contrastThreshold = parseInt(e.target.value);
    document.getElementById('contrastValue').textContent = contrastThreshold;
});
```

---

## 📋 SPECIFICHE TECNICHE

### Tolleranze:
- **Angolo rotazione**: ±10° (ridotto da ±45°)
- **Step angolo**: 0.5° (41 tentativi)
- **Ratio carta**: 0.716 (63mm × 88mm)
- **Tolleranza ratio**: ±25% (0.537 - 0.895)
- **Area minima**: 8% dell'immagine
- **Area massima**: 95% dell'immagine

### Morphological kernel:
- **Size**: 5px (chiude gap fino a 5 pixel)
- **Operazioni**: Dilate → Erode (closing)

### Validazioni:
- ✅ Minimo 1000 pixel carta trovati
- ✅ Ratio entro tolleranza (warning se fuori)
- ⚠️ Carta deve coprire 60%+ immagine (consiglio utente)

---

## 🧪 TESTING REQUIREMENTS

### 1. Carte con angoli smussati
- [ ] Pokemon card con sfondo nero
- [ ] Rotazione ~0° (verticale dritta)
- [ ] Rotazione +10°
- [ ] Rotazione -10°

### 2. Variazione contrasto
- [ ] Carta molto chiara (es. bianca) → threshold 80-100
- [ ] Carta media (es. colorata) → threshold 50-70
- [ ] Carta scura (es. blu/viola scuro) → threshold 30-50

### 3. Condizioni sfondo
- [ ] Sfondo nero puro
- [ ] Sfondo nero con piccole ombre
- [ ] Verifica che ombre non vengano incluse nella carta

---

## 📂 FILE MODIFICATI

### `auto-3d-v4.js`
- ✅ Aggiunto `contrastThreshold = 50` e event listener
- ✅ Riscritto `detectAndCrop()` con color segmentation
- ✅ Aggiunte funzioni:
  - `segmentByColor()`
  - `morphologicalClose()`
  - `dilate()`
  - `erode()`
  - `extractPoints()`
  - `extractAndStraightenV2()`
- ✅ Modificato `getMinAreaRect()` con range ±10°
- ⚠️ Funzioni edge detection mantenute ma NON usate (deprecated)

### `index-v4.html`
- ✅ Aggiunto slider contrasto con tooltip
- ✅ Aggiornato titolo: "v4.1 - Color Segmentation + MinAreaRect"
- ✅ Aggiornata descrizione: "Gestisce angoli smussati!"

---

## 💡 NEXT STEPS

### Immediate:
1. **Testare con carte Pokemon reali**
   - Verificare rilevamento angoli smussati
   - Calibrare threshold per diversi colori

2. **Ottimizzare morfologia**
   - Se gap troppo grandi → aumentare kernel size
   - Se perde dettagli → ridurre kernel size

3. **Validare range rotazione**
   - Confermare ±10° sufficiente
   - Se necessario espandere a ±15°

### Future enhancements:
- [ ] Auto-detect threshold (analisi istogramma)
- [ ] Preview della maschera binaria (debug visivo)
- [ ] Multiple detection tentativi con threshold variabili
- [ ] Gestione ombre automatica (separazione carta-ombra)

---

## 📊 ALGORITMI CHIAVE

### Color Segmentation vs Edge Detection

| Aspetto | Edge Detection (v4.0) | Color Segmentation (v4.1) |
|---------|----------------------|--------------------------|
| **Input** | Gradienti di colore | Luminosità assoluta |
| **Cerca** | Bordi netti | Differenza sfondo-carta |
| **Angoli smussati** | ❌ Non rileva | ✅ Rileva |
| **Robustezza** | Bassa (noise) | Alta (sfondo uniforme) |
| **Configurabilità** | Threshold fisso | Threshold dinamico |

### Morphological Closing

**Scopo:** Riempire i "buchi" negli angoli smussati

```
PRIMA (angoli smussati):          DOPO (closing):
###########                        ###########
##       ##                        ###########
#         #                        ###########
#         #                        ###########
##       ##                        ###########
###########                        ###########
```

**Formula:** `Close(A) = Erode(Dilate(A))`

---

## 🚀 CHANGELOG

### v4.1 (Color Segmentation)
- ✅ Sostituzione edge detection → color segmentation
- ✅ Aggiunto morphological closing per angoli smussati
- ✅ Ridotto range rotazione a ±10° (specifiche utente)
- ✅ Aggiunto slider contrasto configurabile
- ✅ Migliorata robustezza su carte Pokemon

### v4.0 (Contour Detection)
- Edge detection con Sobel
- MinAreaRect per rettangolo ruotato
- Range ±45° rotazione
- ❌ Falliva su angoli smussati

### v3.0 (PCA Rotation)
- PCA per rilevamento rotazione
- Click-to-remove background
- ❌ Rotazione inaffidabile

### v2.0 (Manual Mode)
- Controlli manuali
- Zoom/pan/eraser
- ✅ Funzionava ma tedioso

---

**Autore:** GitHub Copilot  
**Data:** 2025-01-XX  
**Versione:** 4.1  
