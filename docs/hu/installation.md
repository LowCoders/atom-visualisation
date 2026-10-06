# Telepítési és Üzemeltetési Útmutató (Installation & Deployment Guide)

<div class="disclaimer-box">
  <h4>⚠️ Figyelem / Tudományos Nyilatkozat</h4>
  <p>
    Ez a projekt egy <strong>gondolatindító, vázlatos vizualizáció</strong>, amely egy fejlettebb projekt előkészítésének első lépése.<br/>
    <strong>Sem az itt leírtakat, sem pedig az animációt nem lehet helyes, fizikailag elfogadott modellként kezelni.</strong><br/>
    A vizualizáció és a kapcsolódó leírások hipotetikus és didaktikai jellegűek, pedagógiai képi eszközöket alkalmaznak, és nem minősülnek kísérletileg igazolt tankönyvi fizikának.
  </p>
</div>

Ez a dokumentum részletesen ismerteti a **Quantum Visualisation** (Univerzális Moduláris Kvantum- és Atomvizualizációs Rendszer) telepítésének, helyi futtatásának, konténerizálásának és folyamatos integrációs (CI/CD) üzemeltetésének lépéseit.

---

## 1. Rendszerkövetelmények

### A) Fejlesztői és build környezet
- **Operációs rendszer:** Linux (Ubuntu 20.04+, Debian 11+, RHEL/CentOS 8+), macOS (12+), vagy Windows 10/11 (WSL2 ajánlott).
- **Node.js:** Verzió $\ge$ `18.0.0` (LTS 20.x ajánlott). Ellenőrzés: `node -v`
- **Csomagkezelő:** `npm` $\ge$ `9.0.0`. Ellenőrzés: `npm -v`
- **Git:** Verzió $\ge$ `2.30.0`.

### B) Kliensoldali (böngésző) követelmények
- **WebGL 2.0 támogatás:** Bármely modern szabványos böngésző (Google Chrome $\ge$ 90, Mozilla Firefox $\ge$ 88, Apple Safari $\ge$ 15, Microsoft Edge $\ge$ 90).
- **Hardveres gyorsítás:** Dedikált vagy integrált GPU ajánlott a 60 FPS Three.js rendereléshez (részecskerendszerek, pontfelhők és dinamikus hálók).
- **ES Module (ESM) támogatás:** A modern JavaScript modulok futtatásához.

---

## 2. Gyorsindítás (Quick Start)

### 1. Repozitórium klónozása
```bash
git clone https://github.com/LowCoders/atom-visualisation.git
cd atom-visualisation
```

### 2. Függőségek telepítése
A projekt zárolt függőségfájllal rendelkezik, ezért éles vagy reprodukálható környezetben az `npm ci`, fejlesztéshez az `npm install` javasolt:
```bash
npm install
```

### 3. Helyi fejlesztői szerver indítása
A fejlesztői környezetet a [Vite](https://vitejs.dev/) biztosítja azonnali forró modulcserével (HMR):
```bash
npm run dev
```
A terminálban megjelenő címen (alapértelmezetten: `http://localhost:3000` vagy `http://localhost:5173`) a böngészőből azonnal elérhető az alkalmazás.

---

## 3. Éles build (Production Build)

A statikus, tömörített és minimalizált produkciós állományok előállítása:
```bash
npm run build
```
A folyamat a `dist/` könyvtárba generálja a végleges webes állományokat:
- `dist/index.html` (belépési HTML)
- `dist/assets/index-[hash].js` (tömörített JavaScript modulcsomag Three.js motorral)
- `dist/assets/index-[hash].css` (reszponzív, modern üvegmorfológiai stíluslapok)

A buildelt alkalmazás helyi tesztelése beépített Vite preview szerverrel:
```bash
npm run preview
```

---

## 4. Automatizált deploy szkript (`scripts/deploy.sh`)

A projekt gyökerében található egy önálló, hordozható bash deploy segédeszköz: `scripts/deploy.sh`.

### Használati lehetőségek:

1. **Csak éles build készítése és ellenőrzése:**
   ```bash
   ./scripts/deploy.sh --build-only
   ```
2. **Build készítése és azonnali helyi előnézeti szerver indítása:**
   ```bash
   ./scripts/deploy.sh --preview
   ```
3. **Telepítés helyi webkiszolgáló könyvtárába (pl. Nginx / Apache webroot):**
   ```bash
   sudo ./scripts/deploy.sh --dest /var/www/html/visualisation
   ```
4. **Közvetlen frissítés a `gh-pages` git ágra (GitHub Pages):**
   ```bash
   ./scripts/deploy.sh --gh-pages
   ```

---

## 5. Webkiszolgáló konfigurációk (Production Web Servers)

Mivel a projekt egy statikus Single Page Application (SPA), bármilyen webszerver mögé egyszerűen telepíthető.

### A) Nginx konfigurációs minta
Helyezzük az alábbi konfigurációt a `/etc/nginx/sites-available/visualisation.conf` fájlba:

```nginx
server {
    listen 80;
    server_name quantum.example.com;

    root /var/www/html/visualisation;
    index index.html;

    # Gzip és Brotli tömörítés bekapcsolása
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1000;

    # Statikus állományok gyorsítótárazása
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA útválasztás biztosítása
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### B) Docker & Docker Compose konténerizáció

A projekt azonnal futtatható konténerben egy ultra-könnyű Alpine Linux alapú Nginx webszerverrel.

**`Dockerfile` a projekt gyökerében:**
```dockerfile
# 1. Építési fázis (Build stage)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Futtatási fázis (Production stage)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Konténer építése és futtatása:**
```bash
docker build -t quantum-visualisation:latest .
docker run -d -p 8080:80 --name quantum-app quantum-visualisation:latest
```
Ezután nyissuk meg a `http://localhost:8080` címet.

---

## 6. Folyamatos Integráció és Üzembe Helyezés (CI/CD)

A tároló konfigurálva van a **GitHub Actions** automatikus folyamataihoz: [`.github/workflows/deploy.yml`](https://github.com/LowCoders/atom-visualisation/blob/main/.github/workflows/deploy.yml).

### A pipeline működése:
1. **Trigger:** Minden `git push` vagy `Pull Request` a `main` ágra, valamint kézi indítás (`workflow_dispatch`).
2. **Build & Test:**
   - Node.js 20.x és Python 3.12 környezet előkészítése gyorsítótárral.
   - `npm ci` tiszta függőség-telepítés és `pip install -r requirements.txt`.
   - `npm run build` teljes disztribúció (MkDocs dokumentáció és 3D WebGL alkalmazás).
   - A `site/index.html` és `site/app/index.html` automatikus verifikációja.
3. **Deploy (GitHub Pages):**
   - Ha a commit a `main` ágon történt, az elkészült `site` mappát feltölti és élesíti a GitHub Pages környezetben.

---

## 7. Hibaelhárítás (Troubleshooting)

| Hiba / Tünet | Lehetséges ok | Megoldás |
| :--- | :--- | :--- |
| `Hiba: A Node.js nincs telepítve!` | Régi vagy hiányzó Node runtime. | Telepítsük a Node.js 20 LTS verzióját (pl. `nvm install 20`). |
| Fekete képernyő, Three.js canvas nem jelenik meg. | Nincs hardveres WebGL támogatás a böngészőben. | Ellenőrizzük a `chrome://gpu` vagy `about:support` oldalon, hogy a "WebGL2" státusza "Hardware accelerated"-e. |
| CORS hiba a böngésző konzolban helyi fájl megnyitásakor. | A böngésző tiltja az ES modulok betöltését `file://` protokollon. | Mindig helyi webszerverrel nyissuk meg (`npm run dev` vagy `npm run preview`). |
| Nagyméretű bundle figyelmeztetés a build során. | A Three.js motor és kiegészítői egyetlen tömörített modulba kerülnek. | Normális jelenség (gzip méret ~216 kB); a betöltési sebességet a böngésző HTTP/2 és gzip tömörítése biztosítja. |

---

## Navigáció és Részletes Anyagok

- 🚀 [Központi Kezdőlap](index.md)
- 📖 [Használati Útmutató](guide.md)
- 📐 [Fizikai-Matematikai Modell Összegző Központ](physics.md)
- ⚛️ [Egységes Modell](unified.md)
