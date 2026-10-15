# Hôtel Excelsior — Mise en ligne (Render, gratuit)

## 1. Pousser sur GitHub
1. Créer un dépôt sur `github.com` (ex: `excelsior-hotel`)
2. Dans le dossier `excelsior-hotel-site` :
```
git init
git add .
git commit -m "Excelsior online"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/excelsior-hotel.git
git push -u origin main
```
⚠️ `.env` et `data/` ne partent PAS sur GitHub (protégés par `.gitignore`).

## 2. Créer le service sur Render
1. `render.com` → Sign Up (avec GitHub) → **New + → Web Service**
2. Connecter le dépôt `excelsior-hotel`
3. Render détecte `render.yaml` tout seul, sinon :
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Dans **Environment Variables**, ajouter :
   - `GMAIL_USER` = email hôtel (ex: excelsior.casa.ma@gmail.com)
   - `GMAIL_APP_PASSWORD` = App Password 16 lettres (sans espaces)
   - `ADMIN_PASSWORD` = mot de passe admin fort (ex: Excelsior2026!)
5. **Deploy** → après 2-3 min tu reçois un lien : `https://excelsior-hotel.onrender.com`

## 3. Utilisation
- Site : `https://excelsior-hotel.onrender.com/`
- Admin : `https://excelsior-hotel.onrender.com/admin.html` (user `admin` + `ADMIN_PASSWORD`)
- Accept = email auto, réservations visibles depuis n'importe quel appareil.

## Notes
- Plan gratuit : le serveur dort après 15 min sans visite → 1er chargement lent (~30s). Normal.
- Données : stockées dans `data/reservations.json` sur le serveur. Sur plan gratuit elles peuvent se perdre si Render redémarre → Export CSV régulier depuis l'admin !
- Domaine perso (ex: excelsior-casa.ma) : Render → Settings → Custom Domain.
