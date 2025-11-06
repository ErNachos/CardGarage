# Lente di Ingrandimento - Documentazione

## Funzionalità Aggiunta

È stata implementata una **lente di ingrandimento** che aiuta a posizionare con maggiore precisione i punti durante le operazioni di calibrazione e misurazione.

## Come Funziona

### Quando Appare
La lente di ingrandimento appare automaticamente quando:
- Si è in modalità **Rotazione** (dopo aver cliccato "Imposta Rotazione")
- Si è in modalità **Calibrazione** (dopo aver cliccato "Avvia Calibrazione") 
- Si è in modalità **Misurazione** (dopo aver cliccato "Avvia Misurazione")

### Caratteristiche

1. **Forma Circolare**: La lente ha forma circolare con bordo blu per distinguerla chiaramente
2. **Ingrandimento 3x**: L'area sotto il cursore viene ingrandita di 3 volte rispetto al livello di zoom corrente
3. **Posizionamento Intelligente**: La lente si posiziona automaticamente vicino al cursore evitando di uscire dai bordi dello schermo
4. **Mirino Centrale**: Un mirino rosso e blu indica esattamente dove verrà posizionato il punto al click

### Elementi Visualizzati nella Lente

- **Immagine Ingrandita**: L'area sotto il cursore ingrandita per maggiore precisione
- **Punti Esistenti**: Tutti i punti già posizionati vengono mostrati anche nella lente con i loro colori originali
- **Mirino Centrale**: 
  - Croce rossa per indicare la posizione esatta
  - Cerchio blu centrale per il punto di click preciso

### Utilizzo Pratico

1. **Carica un'immagine** nel tool
2. **Clicca "Imposta Rotazione"** → La lente appare quando muovi il mouse
3. **Muovi il mouse** sull'area dove vuoi posizionare il punto
4. **Usa la lente** per vedere l'area ingrandita e posizionare il punto con precisione
5. **Clicca** quando il mirino è esattamente dove vuoi il punto

## Vantaggi

- **Maggiore Precisione**: Specialmente utile per bordi sottili o dettagli piccoli
- **Visibilità Migliorata**: Anche con zoom ridotto, puoi vedere i dettagli ingranditi
- **Non Invasiva**: Appare solo quando necessario e si nasconde automaticamente
- **Contestuale**: Mostra anche i punti già posizionati per riferimento

## Note Tecniche

- La lente rispetta tutte le trasformazioni dell'immagine (zoom, pan, rotazione)
- Il fattore di ingrandimento è moltiplicativo rispetto al zoom corrente
- La lente si nasconde automaticamente quando il mouse esce dall'area di lavoro
- Non interferisce con le operazioni di pan (click centrale) e zoom (rotella)

## Configurazione

Per modificare il comportamento della lente, cerca nel codice le seguenti variabili:
- `magnifierSize`: Dimensione della lente (default: 150px)
- `magnificationFactor`: Fattore di ingrandimento (default: 3x)