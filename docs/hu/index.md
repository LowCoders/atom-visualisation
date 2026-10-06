# Kvantum- és Atomvizualizáció 3D

<div class="disclaimer-box">
  <h4>⚠️ Figyelem / Tudományos Nyilatkozat</h4>
  <p>
    Ez a projekt egy <strong>gondolatindító, vázlatos vizualizáció</strong>, amely egy fejlettebb projekt előkészítésének első lépése.<br/>
    <strong>Sem az itt leírtakat, sem pedig az animációt nem lehet helyes, fizikailag elfogadott modellként kezelni.</strong><br/>
    A vizualizáció és a kapcsolódó elméleti leírások gondolatkísérletek és pedagógiai célú didaktikai reprezentációs eszközök; nem minősülnek kísérletileg igazolt tankönyvi fizikának vagy konszenzusos tudományos modellnek.
  </p>
</div>

Üdvözöljük a **Kvantum- és Atomvizualizáció 3D** interaktív tudományos és oktatási dokumentációs portálján!

Ez a projekt egy valós idejű, böngészőben futó 3D WebGL / Three.js szimuláció, amely a mikroszkopikus kvantummechanika (Schrödinger-egyenlet, valószínűségi elektronfelhők), a szubatomos részecskefizika (nukleonok, kvarkok, erőközvetítő gluonok és virtuális fotonok), valamint a téridő metrikus vákuum-megereszkedése közötti összefüggéseket szemlélteti.

<div class="cta-container">
  <a href="/atom-visualisation/app/" class="btn-cta-primary">
    <span>⚛️ 3D Animáció & Szimulátor Indítása</span>
  </a>
  <a href="physics/" class="btn-cta-secondary">
    <span>📐 Fizikai & Matematikai Háttér</span>
  </a>
  <a href="guide/" class="btn-cta-secondary">
    <span>📖 Használati Útmutató</span>
  </a>
  <a href="unified/" class="btn-cta-secondary">
    <span>⚛️ Egységes Modell</span>
  </a>
</div>

---

<div align="center">

![3D Perspektivikus Teljes Nézet (Total View) - Einstein-Rosen híd és Janus antivilág](../images/total-3d-perspective.png)

*3D Perspektivikus Teljes Nézet (Total View): Az anyagi atommag, elektronhéjak, megereszkedő vákuumszőnyeg, az Einstein–Rosen híd kapui és a Janus antivilág invertált tükör-vákuumszövete.*

</div>

---

## 🚀 Elérhetőség a GitHub Pages-en

Az alkalmazás és a dokumentáció hivatalos, publikált kiadása elérhető a GitHub Pages felületén:

- 🌐 **Magyar nyelvű dokumentáció**: [https://lowcoders.github.io/atom-visualisation/](https://lowcoders.github.io/atom-visualisation/)
- 🌐 **Angol nyelvű dokumentáció**: [https://lowcoders.github.io/atom-visualisation/en/](https://lowcoders.github.io/atom-visualisation/en/)
- ⚛️ **Interaktív 3D WebGL szimuláció**: [https://lowcoders.github.io/atom-visualisation/app/](https://lowcoders.github.io/atom-visualisation/app/)
- 🐙 **GitHub forráskód tároló**: [https://github.com/LowCoders/atom-visualisation](https://github.com/LowCoders/atom-visualisation)

---

## 🌟 Főbb Funkciók és Képességek

<div class="feature-grid">
  <div class="feature-card">
    <h3>🌌 Beágyazott Skálahierarchia</h3>
    <p>Folytonos átmenet a szórási kontínuumtól ($10^{-8}\,\text{m}$) az atomi elektronhéjakon ($10^{-10}\,\text{m}$) és a nukleon hadronikus belsőjén ($10^{-15}\,\text{m}$) át a kvarkok belső Kerr-gyűrűjéig és a Planck-skáláig ($\ell_P \sim 10^{-35}\,\text{m}$).</p>
  </div>
  <div class="feature-card">
    <h3>⚡ 6 Fázisú Zárt Folyamatszimulátor</h3>
    <p>A külső elektron szóródásától ($15{,}0\,\text{eV} \to 4{,}8\,\text{eV}$) a QED vertexen és a dipól kvantumugráson ($1s \to 2p_z$) át a nukleáris visszalökődésig és a Lyman-α foton ($121{,}57\,\text{nm}$) spontán emissziójáig.</p>
  </div>
  <div class="feature-card">
    <h3>🕳️ Janus Antianyag Tükörvilág ($r < 0$)</h3>
    <p>Invertált koordinátatengely rubin-vörös antiprotonnal, ellenkező irányban keringő pozitronhéjakkal és felfelé domborodó metrikus vákuumszövettel.</p>
  </div>
  <div class="feature-card">
    <h3>🌊 Dinamikus Vákuumszőnyeg ($\delta g_{00}$)</h3>
    <p>A téridő görbületének valós idejű alakváltozása az atom tömeg-energia ekvivalenciája ($M^* = M_0 + 10{,}2\,\text{eV}/c^2$) és a fénysebességgel terjedő gravitációs hullámfront ($r = ct$) mentén.</p>
  </div>
  <div class="feature-card">
    <h3>⊞ Bővített Periódusos Rendszer</h3>
    <p>Interaktív Mengyelejev-tábla $Z = 1$-től $Z = 126$-ig automatikus elektronkonfiguráció- és vegyértékelektron-számítással, valamint Slater-féle effektív magtöltéssel.</p>
  </div>
  <div class="feature-card">
    <h3>📐 Egzakt Schrödinger Hullámfüggvények</h3>
    <p>Valós idejű Monte Carlo Born-valószínűségi pontfelhők ($|\psi_{nlm}|^2$), csomófelületek és $SU(2)$ spin kettős fedésű Riemann-felületek megjelenítése.</p>
  </div>
</div>

---

## 🏷️ Episztemológiai Besorolási Rendszer

A dokumentációban és a kódban szigorúan megkülönböztetjük a különböző bizonyosságú fizikai tételeket:

- **[Standard Fizika / Elfogadott Elmélet]**: Kísérletileg bizonyított tankönyvi fizika (Schrödinger-hullámfüggvények, QED vertex, SU(3) szín-bezárás, linearizált Einstein-egyenletek, Mössbauer-effektus, Pound–Rebka vöröseltolódás).
- **[Modell-specifikus Hipotézis]**: A projekt és az elméleti archívum térelméleti szintézise (Deák-sokaság 5D relációs skálaszálja $\rho = \ln(r/a_0)$, a Newton-állandó $G$ mikrofizikai származtatása a Dirac–Maxwell fázishibából $\Delta\theta \sim \ell_P / \lambda_C$, és a szingularitásokat kizáró Heisenberg–Fermi kemény mag $+1/r^3$).
- **[Szemléltető Metafora]**: 3D WebGL pedagógiai reprezentációs eszközök (kvark torkolat mint Kerr-gyűrűs átjáró, Calabi–Yau 3D vetület, arany fotonszálak, Janus antivilág).

---

## 🧭 Dokumentációs Térkép

- 📖 **[Használati Útmutató](guide.md):** 3D kamera navigáció, rétegkapcsolók, szintek közötti zoomolás, a 6 fázisú folyamatszimulátor és telemetria kezelése.
- 📐 **[Fizikai-Matematikai Modell Összegző Központ](physics.md):** A teljes elméleti szintézis logikai csomópontja közvetlen linkekkel a 6 moduláris al-laphoz:
  - 📖 [01. Kvantummechanika, Elektronhéjak és Atomi Stabilitás](physics/01-kvantum-es-atom.md)
  - 📖 [02. Szórási Kontínuum, QED Vertex és Lyman-α Emisszió](physics/02-szoras-es-qed.md)
  - 📖 [03. Nukleon Belső, Magerők és Részecskestruktúra](physics/03-nukleon-es-parton.md)
  - 📖 [04. Gravitáció, Téridő-görbület és a Vákuumszőnyeg Dinamikája](physics/04-gravitacio-es-vakuum.md)
  - 📖 [05. A Deák-tér és az Egységes Tér-Gravitáció Elmélet](physics/05-deak-ter-es-egyseges-elmelet.md)
  - 📖 [06. Magasabb Dimenziók, Topológia és Különleges Jelenségek](physics/06-topologia-es-kulonleges-jelensegek.md)
- ⚛️ **[Egységes Modell](unified.md):** A rendszer működésének összefoglaló elméleti és implementációs leírása zárt energiamérleggel.
- 🛠️ **[Telepítési és Üzemeltetési Útmutató](installation.md):** Rendszerkövetelmények, helyi szerver indítása, buildelés, Docker konténerizáció, automatikus deploy szkript és GitHub Actions CI/CD.
