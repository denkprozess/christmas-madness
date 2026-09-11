# Familienwichteln 2026

Eine kleine, vollständig statische Weihnachts-App mit persönlichen Einladungslinks und einer interaktiven Rubbelfläche.

## Veröffentlichung

Die App liegt im Ordner `dist`. Nach einem Push auf `master` oder `main` veröffentlicht der enthaltene GitHub-Workflow diesen Ordner automatisch als GitHub Page.

Im GitHub-Repository muss unter **Settings → Pages → Build and deployment** einmalig **GitHub Actions** als Quelle ausgewählt sein.

Die persönlichen Links stehen lokal in `invite-links.local.txt`. Die Datei wird absichtlich nicht in Git eingecheckt.

## Verhalten

- Jeder Zufallslink zeigt genau eine feste Zuordnung.
- Nach dem Freirubbeln wird der Zustand für ein Jahr im Browser gespeichert.
- Ohne Browser-Speicherung kann jederzeit erneut gerubbelt werden; das Ergebnis bleibt gleich.
- Es werden keine Daten an einen eigenen Server übertragen.
