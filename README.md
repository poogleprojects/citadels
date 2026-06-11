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