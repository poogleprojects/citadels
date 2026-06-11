# Citadels WebGL MVP
 
A dependency-free browser MVP for the card game Citadels.
 
## Features
- Base-game style role draft + round resolution (8 classic roles)
- Human + CPU opponents
- Local couch co-op handoff flow
- Hidden information handling for hands
- Event-driven animations and action log
- WebGL animated table background
- Folder-based texture loading with automatic placeholders
- In-game controls for human/CPU counts (4-7 total players) and CPU speed
- In-game controls for starting gold and custom CPU names
- Export and import full game saves as JSON
- Hidden roles in player panel with role-image hover preview
 
## Run
1. Open this folder in a terminal.
2. Start a simple local server:
   - Python: `python -m http.server 8080`
   - Or any equivalent static server
3. Open `http://localhost:8080` in a browser.
 
## Assets
Drop card textures in:
- `assets/cards/<districtId>.png`
 
Role atlas:
- `assets/roles/roles.png`
- Parsed as 4 columns x 2 rows in this order:
   1. Assassin
   2. Thief
   3. Magician
   4. King
   5. Bishop
   6. Merchant
   7. Architect
   8. Warlord
 
Target icons:
- `assets/icons/dagger.png` for Assassin target marker
- `assets/icons/moneybag.png` for Thief target marker
 
Example IDs include `temple`, `market`, `castle`, `palace`, `laboratory`, `graveyard`.
If no file exists, the game renders a placeholder automatically.

## Install file structure
-./root
-   user 1415 Jun 11 14:41 README.md
-   user 4096 Jun 11 13:35 assets
-   user 3604 Jun 11 14:41 index.html
-   user 4096 Jun 11 13:40 src
-   user 9913 Jun 11 14:41 styles.css
 
-./assets:
-  user 4096 Jun 11 15:22 cards
-  user 4096 Jun 11 14:16 icons
-  user 4096 Jun 11 14:18 roles
  
-./assets/cards:
-   user 3162607 Jun 11 15:19 Districts_1.png   <--- image of 4 x 3 grid of districts
-   user 3523053 Jun 11 15:22 Districts_2.png   <--- image of 4 x 3 grid of districts
  
-./assets/icons:
-   user 26760 Jun 11 14:15 dagger.png
-   user  3509 Jun 11 14:14 moneybag.png
 
-./assets/roles:
-   user 2154757 Jun 11 14:15 roles.png        <--- image of 4 x 2 grid of roles
 
-./src:
-   user  6620 Jun 11 15:44 ai.js
-   user  6406 Jun 11 15:44 assetLoader.js
-   user  1679 Jun 11 13:36 data.js
-   user 17008 Jun 11 14:56 engine.js
-   user 27184 Jun 11 15:44 main.js
-   user   715 Jun 11 13:43 utils.js
-   user  3536 Jun 11 13:43 webglBg.js


