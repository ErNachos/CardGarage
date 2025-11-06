# Salvataggio Immagine con Punti - Documentazione

## Nuova Funzionalità

È stata aggiunta la possibilità di **salvare l'immagine** con i punti di misurazione e le etichette dei tratti visibili, senza mostrare i valori in millimetri.

## Come Funziona

### Quando è Disponibile
Il pulsante **"Salva Immagine con Punti"** diventa disponibile:
- Dopo aver completato tutti gli 8 punti di misurazione
- Quando lo stato è "misurazione completata"

### Cosa Viene Salvato

1. **Immagine Originale**: L'immagine base con eventuali rotazioni applicate
2. **8 Punti Numerati**: Cerchi colorati numerati da 1 a 8
3. **Linee Direzionali**: 
   - **Punti 1-2 e 3-4**: Singola linea verticale (rispetto all'immagine originale)
   - **Punti 5-6 e 7-8**: Singola linea orizzontale (rispetto all'immagine originale)
   - **Rotazione**: Le linee seguono correttamente la rotazione dell'immagine
4. **Etichette Tratti**: "TRATTO A", "TRATTO B", "TRATTO C", "TRATTO D"
5. **Colori Distintivi**: Ogni coppia di punti ha il suo colore caratteristico

### Dettagli Visivi

#### Punti di Misurazione
- **Cerchio Esterno**: Bianco con bordo nero per contrasto
- **Cerchio Interno**: Colorato secondo la coppia di appartenenza
- **Numero**: Bianco con bordo nero, centrato nel punto
- **Linee Direzionali**: Singola linea per indicare la direzione di misurazione
  - **Orientamento Relativo**: Segue la rotazione dell'immagine
  - **Verticali**: Per punti 1-2 e 3-4 (misurazioni orizzontali)
  - **Orizzontali**: Per punti 5-6 e 7-8 (misurazioni verticali)
- **Dimensione**: Proporzionale alla dimensione dell'immagine

#### Colori delle Coppie
- **Tratto A (Punti 1-2)**: Rosso (#FF0000)
- **Tratto B (Punti 3-4)**: Giallo/Oro (#FFD700) 
- **Tratto C (Punti 5-6)**: Verde (#00FF00)
- **Tratto D (Punti 7-8)**: Arancione (#FFA500)

#### Etichette dei Tratti
- **Posizione**: Al centro di ogni coppia di punti
- **Sfondo**: Nero semi-trasparente
- **Bordo**: Colorato secondo il tratto
- **Testo**: Colorato secondo il tratto
- **Font**: Proporzionale alla dimensione dell'immagine

### Nome File Automatico

Il file viene salvato automaticamente con il nome:
```
misurazione_YYYY-MM-DDTHH-MM-SS.png
```

Esempio: `misurazione_2025-10-28T14-30-45.png`

### Processo di Salvataggio

1. **Completa la misurazione** (tutti gli 8 punti)
2. **Clicca "Salva Immagine con Punti"**
3. **L'immagine viene elaborata** con tutti gli elementi grafici
4. **Il download inizia automaticamente**
5. **Messaggio di conferma** appare nell'interfaccia

## Caratteristiche Tecniche

### Gestione Rotazione
- Se è stata applicata una rotazione, l'immagine salvata mantiene la rotazione
- I punti vengono trasformati correttamente nelle nuove coordinate
- Le etichette seguono la trasformazione dell'immagine

### Qualità e Formato
- **Formato**: PNG per preservare la trasparenza
- **Risoluzione**: Risoluzione nativa dell'immagine originale
- **Qualità**: Senza perdita di qualità

### Canvas Temporanea
- Utilizza una canvas separata per il rendering
- Non modifica la visualizzazione corrente
- Ottimizzata per la dimensione dell'immagine originale

## Utilizzo Pratico

### Workflow Completo
1. Carica un'immagine
2. Imposta la rotazione (se necessario)
3. Esegui la calibrazione
4. Completa la misurazione (8 punti)
5. **Clicca "Salva Immagine con Punti"**
6. L'immagine annotata viene scaricata

### Casi d'Uso
- **Documentazione**: Per archiviare le misurazioni visivamente
- **Reportistica**: Allegare immagini annotate ai report
- **Controllo Qualità**: Verificare visivamente i punti di misurazione
- **Comunicazione**: Condividere risultati con team o clienti

## Limitazioni

- Il pulsante è disponibile solo dopo aver completato tutti gli 8 punti
- Richiede che sia stata fatta almeno una calibrazione
- L'immagine deve essere caricata correttamente

## Personalizzazione

Per modificare l'aspetto degli elementi salvati, cerca nel codice:
- `drawPointsForSave()`: Modifica l'aspetto dei punti
- `drawLabelsForSave()`: Modifica le etichette dei tratti
- `pairColors`: Cambia i colori delle coppie