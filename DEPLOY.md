# 🚀 Guida al Deploy su GitHub Pages

## Preparazione Completata ✅

Il progetto è stato preparato per GitHub con le seguenti modifiche:

1. ✅ `homepage.html` → `index.html` (necessario per GitHub Pages)
2. ✅ Aggiornato `Main.js` per puntare a `index.html`
3. ✅ Aggiornati tutti i link nei tool
4. ✅ Creato `.gitignore` per escludere file non necessari
5. ✅ Aggiornato README.md completo
6. ✅ Titolo applicazione aggiornato a "Card Garage"

## 📤 Comandi per Caricare su GitHub

### Prima volta (Repository Nuovo)

```bash
# Naviga nella cartella del progetto
cd "c:\Users\utente18\Desktop\V01"

# Inizializza repository Git
git init

# Aggiungi tutti i file (rispettando .gitignore)
git add .

# Primo commit
git commit -m "Initial commit: Card Garage - Card Master Tools Suite"

# Collega al repository GitHub
git remote add origin https://github.com/ErNachos/CardGarage.git

# Carica su GitHub
git branch -M main
git push -u origin main
```

### Aggiornamenti Successivi

```bash
# Aggiungi modifiche
git add .

# Commit con messaggio
git commit -m "Descrizione delle modifiche"

# Carica su GitHub
git push
```

## 🌐 Attivazione GitHub Pages

1. Vai su: https://github.com/ErNachos/CardGarage/settings/pages
2. In "Source" seleziona: `main` branch
3. Cartella: `/ (root)`
4. Clicca "Save"
5. Attendi 1-2 minuti
6. Il sito sarà disponibile su: https://ernachos.github.io/CardGarage

## 📋 Comandi Git Utili

```bash
# Verifica status
git status

# Vedi modifiche
git diff

# Storia commit
git log --oneline

# Annulla modifiche non committate
git checkout -- <file>

# Crea nuovo branch
git checkout -b nome-branch

# Torna a main
git checkout main

# Merge branch
git merge nome-branch
```

## ⚠️ Note Importanti

### File Esclusi (.gitignore)
- `node_modules/` - Dipendenze npm (pesante)
- `*.log` - File di log
- `*.jpg`, `*.jpeg`, `*.png` - Immagini di test (opzionale)
- `*.code-workspace` - Configurazione VS Code

### GitHub Pages vs Electron
- **GitHub Pages**: Funziona come sito web (senza Electron)
- **Electron**: Funziona come applicazione desktop (con npm start)
- Entrambi condividono lo stesso codice HTML/CSS/JS

### Compatibilità
- GitHub Pages non supporta:
  - File system access (dialog caricamento file limitato)
  - IPC Electron
  - Node.js modules
  
- Funzionalità disponibili su GitHub Pages:
  ✅ Tutti i tool HTML/Canvas/JS
  ✅ 3D Card Creator con Three.js
  ✅ Export GLB/PDF
  ✅ Lente di ingrandimento
  ✅ Zoom, pan, editing immagini

## 🔄 Workflow Consigliato

1. Sviluppa localmente con Electron (`npm start`)
2. Testa tutte le funzionalità
3. Commit delle modifiche
4. Push su GitHub
5. Verifica su GitHub Pages
6. Ripeti

## 🆘 Risoluzione Problemi

### Non si carica il sito su GitHub Pages
- Verifica che il file si chiami `index.html`
- Controlla che sia nella root del progetto
- Aspetta 5 minuti dopo il primo push

### Immagini/CSS non si caricano
- Usa path relativi (es: `./assets/style.css`)
- Non usare path assoluti (es: `/assets/style.css`)
- Verifica su: https://ernachos.github.io/CardGarage

### Tool non funziona su GitHub Pages
- Apri Console Browser (F12)
- Controlla errori JavaScript
- Verifica che non usi funzionalità Electron

## 📞 Supporto

- Issues GitHub: https://github.com/ErNachos/CardGarage/issues
- Documentazione GitHub Pages: https://docs.github.com/pages

---

**Pronto per il deploy!** 🎉
