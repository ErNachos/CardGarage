# Linee Direzionali - Documentazione

## Nuova Funzionalità

Sono state aggiunte **linee direzionali** che indicano visivamente l'orientamento delle misurazioni per ogni punto, seguendo correttamente la rotazione dell'immagine.

## Come Funzionano

### Orientamenti delle Linee

#### Punti 1-2 (Tratto A) e Punti 3-4 (Tratto B)
- **Linee Verticali Perfette** (sempre dritte rispetto alla vista)
- **Motivo**: Questi punti misurano distanze orizzontali
- **Orientamento**: Sempre perfettamente verticali, indipendentemente dalla rotazione dell'immagine

#### Punti 5-6 (Tratto C) e Punti 7-8 (Tratto D)
- **Linee Orizzontali Perfette** (sempre dritte rispetto alla vista)
- **Motivo**: Questi punti misurano distanze verticali
- **Orientamento**: Sempre perfettamente orizzontali, indipendentemente dalla rotazione dell'immagine

### Struttura delle Linee

Ogni punto ha **1 linea direzionale**:
- **Singola Linea**: Posizionata al centro del punto
- **Orientamento Assoluto**: Sempre perfettamente verticale o orizzontale
- **Indipendente dalla Rotazione**: Le linee mantengono l'orientamento dritto indipendentemente dalla rotazione dell'immagine

### Colori

Le linee seguono lo stesso schema colore dei punti:
- **Tratto A (Punti 1-2)**: Rosso (#FF0000)
- **Tratto B (Punti 3-4)**: Giallo/Oro (#FFD700)
- **Tratto C (Punti 5-6)**: Verde (#00FF00)
- **Tratto D (Punti 7-8)**: Arancione (#FFA500)

## Dove Vengono Mostrate

### 1. Visualizzazione in Tempo Reale
- Appaiono durante la fase di **misurazione** (stato 'measuring')
- Rimangono visibili dopo il completamento (stato 'measured')
- Si adattano automaticamente al livello di zoom

### 2. Immagine Salvata
- Incluse nell'immagine esportata con "Salva Immagine con Punti"
- Dimensioni proporzionali alla risoluzione dell'immagine
- Gestiscono correttamente le rotazioni applicate

## Vantaggi Visivi

### Chiarezza Direzionale
- **Comprensione Immediata**: Si capisce subito quale direzione viene misurata
- **Riduzione Errori**: Meno probabilità di confondere orientamenti
- **Documentazione Migliore**: Le immagini salvate sono auto-esplicative

### Coerenza Visiva
- **Schema Logico**: Verticale per orizzontale, orizzontale per verticale
- **Colori Coordinati**: Stessi colori di punti ed etichette
- **Proporzionalità**: Si adattano a zoom e dimensioni immagine

## Specifiche Tecniche

### Dimensioni
- **Lunghezza**: 4% della dimensione minima dell'immagine (salvata) - Aumentata per migliore visibilità
- **Spaziatura**: 30% della lunghezza delle linee - Ridotta per 2 linee
- **Spessore**: 0.2% della dimensione minima dell'immagine (salvata)
- **Zoom View**: Adattamento automatico al livello di zoom corrente (25px base)

### Posizionamento
- **Centro**: Coincide esattamente con il centro del punto
- **Orientamento**: 90° rispetto alla direzione di misurazione
- **Distribuzione**: Equidistanti dal centro

### Gestione Rotazioni
- **Orientamento Indipendente**: Le linee rimangono sempre dritte (verticali/orizzontali)
- **Logica Semplificata**: Non seguono la rotazione dell'immagine
- **Consistenza Visiva**: Sempre leggibili e riconoscibili

## Esempio Pratico

```
Immagine in Qualsiasi Orientamento:
Punti 1-2 (Bordo Sinistro):   |  ← Sempre linea verticale perfetta
Punti 3-4 (Bordo Destro):     |  ← Sempre linea verticale perfetta
Punti 5-6 (Bordo Superiore):  —  ← Sempre linea orizzontale perfetta
Punti 7-8 (Bordo Inferiore):  —  ← Sempre linea orizzontale perfetta

(Le linee rimangono sempre dritte indipendentemente dalla rotazione dell'immagine)
```

## Personalizzazione

Per modificare l'aspetto delle linee, cerca nel codice:

### Visualizzazione Live
- `drawParallelLines()`: Funzione principale
- `drawSingleVerticalLine()`: Disegna linea verticale perfetta
- `drawSingleHorizontalLine()`: Disegna linea orizzontale perfetta

### Salvataggio
- `drawParallelLinesForSave()`: Funzione per esportazione
- `drawSingleVerticalLineForSave()`: Linea verticale per salvataggio
- `drawSingleHorizontalLineForSave()`: Linea orizzontale per salvataggio

### Parametri Configurabili
```javascript
const lineLength = 25 / zoom;        // Lunghezza linea (live)
const lineWidth = 2 / zoom;          // Spessore linea (live)

// Per salvataggio:
const lineLength = Math.max(30, Math.min(canvasWidth, canvasHeight) * 0.04);

// Linee sempre dritte:
// Verticale: da (centerX, centerY - halfLength) a (centerX, centerY + halfLength)
// Orizzontale: da (centerX - halfLength, centerY) a (centerX + halfLength, centerY)
```