# Projektledning – studieapp

Quiz och flashkort per kurs för utbildningen IT-projektledare (IT-Högskolan). Ren HTML/CSS/JS, ingen build behövs.

## Publicera på GitHub Pages
1. Skapa ett nytt repo på GitHub och ladda upp alla filer (behåll mappen `data/`).
2. Settings > Pages > Source: "Deploy from a branch", branch `main`, mapp `/ (root)`.
3. Efter någon minut finns sidan på `https://DITTNAMN.github.io/REPONAMN/`. Skicka länken till klassen.

## Lägga till innehåll

- Kurser definieras i `courses.js` med id, namn och YHP. Befintliga id:n är `pl55`, `it10` och `itpl30`.
- Datafilerna i `data/` använder `addTopics("kurs-id", [ämnen])`. Se `topics-1-3.js` för formatet.
- Kursmallarna för IT-orientering och IT-projektledning finns i `data/it-orientering.js` och `data/it-projektledning.js`.
- Lägg till nya datafiler i `index.html` efter `courses.js` och före `app.js`.
