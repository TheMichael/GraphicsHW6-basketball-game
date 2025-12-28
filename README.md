# WebGL Basketball Court

**Making 3D graphics programming tangible through interactive sports simulation**

## Why I Built This

Computer graphics programming is powerful but intimidating. Students face abstract concepts like transformation matrices, lighting models, and shader pipelines without tangible ways to see how these pieces connect. Traditional tutorials show spinning cubes—functional but uninspiring.

I built this interactive 3D basketball court to bridge that gap: a familiar sports environment that demonstrates advanced WebGL techniques while remaining engaging and relatable.

## What It Does

This project creates a fully interactive 3D basketball court in your browser using WebGL and Three.js. Players can:

- **Launch basketballs** with realistic physics and trajectory arcs
- **Score points** by sinking shots into regulation-height hoops
- **Explore the court** using intuitive camera controls (orbit, zoom, pan)
- **Experience realism** through PBR textures, shadows, and detailed court markings

The system tracks makes/misses, displays live scoreboards on the court itself, and provides a polished UI overlay—turning a graphics exercise into an actual game.

## Core Features

### Visual Fidelity
- **Realistic court textures** with mahogany and oak flooring (normal maps, ambient occlusion)
- **Detailed basketball hoops** with regulation backboards, nets, and support structures
- **Professional court markings** including three-point lines, free-throw lanes, and center court
- **Textured basketball** with rubber-like surface treatment and orange glow
- **Dynamic lighting** with shadows that respond to scene geometry

### Physics & Interaction
- **Real-time physics engine** simulating gravity, velocity, and arc trajectories
- **Collision detection system** for hoop scoring and out-of-bounds detection
- **Input controls** for shooting power, angle, and direction
- **Animation controller** for smooth ball movement and camera transitions

### Game Systems
- **Score tracking** with separate tallies for home/away teams
- **Digital scoreboards** rendered directly on the court (no 2D overlays)
- **Game state manager** handling shot lifecycle, resets, and win conditions
- **UI overlay** displaying controls, stats, and game instructions

## Tech Stack

**Frontend**
- Three.js (r128) for WebGL rendering
- Vanilla JavaScript (ES6 modules)
- Express.js for local development server

**Architecture**
- **Entity-Component pattern** for game objects (Basketball, Court, Basket)
- **System-based design** separating physics, collision, input, and animation
- **Manager pattern** for cross-cutting concerns (score, UI, game state)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/TheMichael/GraphicsHW6-basketball-game.git
cd GraphicsHW6-basketball-game

# Install dependencies
npm install

# Start the server
node index.js

# Open in browser
# Navigate to http://localhost:8000
```

**Controls:**
- **Left click + drag**: Rotate camera
- **Right click + drag**: Pan camera
- **Scroll wheel**: Zoom in/out
- **Shoot button**: Launch basketball (adjustable power/angle)

## Project Structure

```
src/
├── core/              # Engine fundamentals
│   ├── SceneManager.js       # Three.js scene initialization
│   ├── CameraManager.js      # Camera setup with OrbitControls
│   └── GameEngine.js         # Main game loop and rendering
├── entities/          # Game objects
│   ├── Basketball.js         # Ball geometry and textures
│   ├── CourtRenderer.js      # Floor and court markings
│   └── BasketRenderer.js     # Hoops, nets, backboards, scoreboards
├── systems/           # Core game systems
│   ├── PhysicsEngine.js      # Gravity, velocity, trajectory
│   ├── CollisionDetector.js  # Hoop scoring detection
│   ├── InputController.js    # Mouse/keyboard handling
│   └── AnimationController.js # Smooth transitions
├── managers/          # Cross-cutting concerns
│   ├── GameStateManager.js   # Shot lifecycle, game flow
│   ├── ScoreManager.js       # Make/miss tracking
│   └── UIManager.js          # HUD and overlay
└── textures/          # PBR texture assets
    ├── mahogfloor_*          # Court flooring textures
    ├── oakfloor_*            # Out-of-bounds area
    └── brown-leather_*       # Basketball surface
```

## Technical Highlights

### 1. Physically-Based Rendering (PBR)
Used high-quality texture maps (albedo, normal, AO) from [freepbr.com](https://freepbr.com/) to achieve realistic material surfaces. Normal maps provide depth perception without additional geometry, and ambient occlusion enhances shadow realism.

### 2. Modular Architecture
Separated concerns into entities (what exists), systems (what happens), and managers (who coordinates). This makes the codebase maintainable and extensible—adding new features like shot power indicators or player models requires minimal changes to existing code.

### 3. In-Game Scoreboards
Rather than using DOM overlays, scoreboards are rendered as Three.js sprites positioned at each hoop. They update dynamically via texture canvas manipulation, maintaining the 3D immersion.

### 4. Collision Detection Optimization
Implemented bounding box + ray-casting hybrid for efficient hoop detection. Only checks scoring collisions when the ball is near the hoop's Y-coordinate threshold, avoiding unnecessary computations during flight.

## Challenges Solved

**Challenge:** Basketball texture looked flat despite using normal maps
**Solution:** Added custom shader with enhanced bump mapping and orange emissive glow for depth

**Challenge:** Camera controls felt sluggish during rapid movements
**Solution:** Tuned OrbitControls damping factor and implemented frame-rate-independent interpolation

**Challenge:** Hoop detection had false positives when ball passed near (but not through) the rim
**Solution:** Combined Y-axis threshold checks with XZ-plane circular boundary testing

## What I Learned

### Computer Graphics
- How transformation matrices compose (model → view → projection pipeline)
- The difference between Phong and physically-based lighting models
- Why normal maps transform differently than position vectors (tangent space math)

### Game Architecture
- The importance of decoupling rendering from game logic (60fps rendering ≠ 60Hz physics updates)
- How to structure code for both readability and performance
- When to use ECS patterns vs. traditional OOP hierarchies

### WebGL/Three.js
- Texture loading strategies (progressive enhancement vs. all-or-nothing)
- How to debug shader compilation errors (especially on different GPU drivers)
- The performance impact of shadow map resolution vs. visual quality

## Future Enhancements

If I continue this project, I'd add:

- **Multiplayer mode** via WebSockets (real-time shot replication)
- **Shot trajectory preview** showing predicted arc before releasing
- **Replay system** storing shot data for instant replay viewing
- **Different court themes** (outdoor park, vintage gym, futuristic arena)
- **Player avatars** with animation blending for shooting poses
- **Sound effects** (ball bounce, swish, rim clang)
- **Analytics dashboard** tracking shooting percentages, distance records

## Credits

**Developer:** Michael Ohayon

**Assets:**
- Court textures from [freepbr.com](https://freepbr.com/) (Unity version, extracted PNG files)
- Color palette hand-picked using [HTML Color Codes](https://htmlcolorcodes.com/color-picker/)
- Three.js library by [mrdoob](https://github.com/mrdoob/three.js)


## License

MIT License - See LICENSE file for details

---

**Live Demo:** Run locally via `node index.js` → http://localhost:8000

**Contact:** [GitHub - TheMichael](https://github.com/TheMichael)
