# Projektledning – studieapp

Quiz och flashkort för kursen Projektledning (IT-Högskolan). Ren HTML/CSS/JS, ingen build behövs.

## Publicera på GitHub Pages
1. Skapa ett nytt repo på GitHub och ladda upp alla filer (behåll mappen `data/`).
2. Settings > Pages > Source: "Deploy from a branch", branch `main`, mapp `/ (root)`.
3. Efter någon minut finns sidan på `https://DITTNAMN.github.io/REPONAMN/`. Skicka länken till klassen.

## Lägga till fler ämnen
Skapa en ny fil i `data/` (t.ex. `topics-4-6.js`) med samma format som `topics-1-3.js`, och lägg till en rad i `index.html`:
`<script src="data/topics-4-6.js"></script>` (före raden med `app.js`).
