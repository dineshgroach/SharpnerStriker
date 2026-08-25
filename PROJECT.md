# Sharpener Flick — 2D Physics Web Game

## 1. Project Overview

**Sharpener Flick** is a 2D physics-based web game inspired by a childhood game played on the pages of a school book.

The player controls a pencil sharpener placed at the bottom of a book page. The page contains multiple images that act as targets.

The player must **aim and flick the sharpener toward an image**. If the sharpener lands on a valid image, the player progresses and continues playing. If the sharpener misses the target, lands outside the valid area, or falls off the page, the player loses.

The game should recreate the simple but satisfying physics-based gameplay of the original childhood game while adding modern game mechanics and web-based presentation.

---

## 2. Core Gameplay

### Game Loop

1. A book page is displayed.
2. Several images are placed on the page as targets.
3. The sharpener starts from a designated position, typically near the bottom of the page.
4. The player drags from the sharpener to determine:

   * Direction
   * Force / launch strength
5. The player releases the mouse.
6. The sharpener is launched using 2D physics.
7. The sharpener interacts with the page and targets through collision detection.
8. If the sharpener successfully hits the intended target:

   * The target is marked as completed.
   * The player continues to the next target/page.
9. If the sharpener misses:

   * The attempt ends.
   * The player loses or restarts the level.

### Win Condition

Complete all required targets/pages without running out of attempts.

### Lose Conditions

The player loses an attempt when:

* The sharpener misses the target.
* The sharpener leaves the playable page area.
* The sharpener falls off the page.
* The player otherwise fails the level's defined objective.

---

# 3. Technology Stack

## Frontend

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**

React handles the application UI, menus, settings, scoreboards, and other non-game interfaces.

## Game Engine

* **Phaser 3**

Phaser will handle:

* Game rendering
* Input
* Game scenes
* Sprites
* Animations
* Camera
* Game lifecycle

## Physics

* **Matter.js**

Matter.js will handle:

* Sharpener movement
* Velocity
* Force
* Friction
* Rotation
* Collision detection
* Target interactions
* Page boundaries

Phaser has Matter.js integration, so the physics layer should preferably be managed through Phaser's Matter physics system rather than running a completely separate physics implementation.

## Deployment

Recommended:

* **Vercel** for production deployment
* Local development through Vite

---

# 4. High-Level Architecture

```text
React Application
│
├── UI Layer
│   ├── Main Menu
│   ├── Game UI
│   ├── Score
│   ├── Settings
│   └── Level Selection
│
└── Phaser Game
    │
    ├── Game Scenes
    │   ├── BootScene
    │   ├── MenuScene
    │   ├── GameScene
    │   └── ResultScene
    │
    ├── Game Objects
    │   ├── Sharpener
    │   ├── Target
    │   ├── Page
    │   └── Aim Indicator
    │
    ├── Physics
    │   ├── Collision Detection
    │   ├── Force Calculation
    │   ├── Friction
    │   └── Boundaries
    │
    └── Level System
        ├── Page Data
        ├── Target Positions
        ├── Difficulty
        └── Win/Lose Rules
```

---

# 5. Initial MVP

The first version should deliberately be simple.

## MVP Requirements

### Page

* One static book-page background.
* Fixed playable boundary.

### Sharpener

* One sharpener sprite.
* Positioned at the bottom of the page.
* Can be aimed using mouse drag.
* Launches when the mouse is released.
* Has realistic-ish physics.

### Targets

* 3–5 manually positioned targets.
* Targets can initially be simple circles/images.
* Collision detection with the sharpener.

### Gameplay

* Successful collision registers a hit.
* Failed shot registers a miss.
* Basic score.
* Basic restart functionality.

### UI

* Start Game
* Restart
* Score
* Attempts
* Win/Lose screen

The goal of the MVP is **not visual polish**.

The goal is to prove that the core physics and gameplay feel good.

---

# 6. Aiming System

The primary interaction should feel similar to a slingshot.

While the player holds the mouse:

```text
        Aim Direction
             ↑
             │
             │
             │
          [Sharpener]
```

The player drags away from the intended launch direction.

The game should display an aiming indicator showing:

* Direction
* Approximate launch strength
* Maximum launch force

On release:

```text
Launch Force = Drag Distance × Force Multiplier
```

The force should have a maximum limit to prevent excessively powerful shots.

---

# 7. Physics Design

The sharpener should be represented as a physics body.

Important properties:

* Mass
* Friction
* Restitution
* Velocity
* Angular velocity
* Rotation
* Linear damping

The game should aim for **fun and predictable physics rather than perfect real-world simulation**.

Physics parameters should therefore be configurable.

Example configuration:

```ts
const physicsConfig = {
  maxLaunchForce: 1000,
  friction: 0.5,
  restitution: 0.2,
  linearDamping: 0.4,
  angularDamping: 0.4,
};
```

These values are placeholders and should be tuned through gameplay testing.

---

# 8. Target System

Each target should have configurable properties.

Example:

```ts
interface Target {
  id: string;
  image: string;
  x: number;
  y: number;
  radius: number;
  points: number;
  completed: boolean;
}
```

Initially, targets can be manually defined.

Example level:

```ts
const level = {
  id: 1,
  background: "/assets/pages/page-01.jpg",
  targets: [
    {
      id: "target-1",
      image: "/assets/targets/apple.png",
      x: 300,
      y: 200,
      radius: 40,
      points: 100,
    },
    {
      id: "target-2",
      image: "/assets/targets/car.png",
      x: 600,
      y: 350,
      radius: 40,
      points: 100,
    },
  ],
};
```

---

# 9. Level System

Once the basic prototype works, each book page should become a level.

```text
Level 1
  └── Page 1
      ├── Target A
      ├── Target B
      └── Target C

Level 2
  └── Page 2
      ├── Target A
      ├── Target B
      ├── Target C
      └── Target D
```

Difficulty can increase through:

* Smaller targets
* Greater target distances
* More targets
* Obstacles
* Limited attempts
* More complicated page layouts
* Moving targets

---

# 10. Suggested Folder Structure

```text
sharpener-flick/
│
├── public/
│   ├── assets/
│   │   ├── pages/
│   │   ├── targets/
│   │   └── sharpener/
│   │
│   └── sounds/
│
├── src/
│   │
│   ├── components/
│   │   ├── GameUI.tsx
│   │   ├── Score.tsx
│   │   ├── MainMenu.tsx
│   │   └── ResultScreen.tsx
│   │
│   ├── game/
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   ├── GameScene.ts
│   │   │   └── ResultScene.ts
│   │   │
│   │   ├── objects/
│   │   │   ├── Sharpener.ts
│   │   │   ├── Target.ts
│   │   │   └── Page.ts
│   │   │
│   │   ├── physics/
│   │   │   └── physicsConfig.ts
│   │   │
│   │   └── levels/
│   │       ├── level1.ts
│   │       └── level2.ts
│   │
│   ├── hooks/
│   │
│   ├── types/
│   │
│   ├── utils/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── PROJECT.md
```

---

# 11. Development Roadmap

## Phase 1 — Project Setup

* [ ] Create React + TypeScript + Vite project.
* [ ] Install Phaser.
* [ ] Configure Tailwind CSS.
* [ ] Create basic Phaser game container.
* [ ] Verify local development environment.

## Phase 2 — Physics Prototype

* [ ] Create page boundary.
* [ ] Add sharpener sprite.
* [ ] Add Matter physics.
* [ ] Make sharpener draggable/aimable.
* [ ] Implement launch force.
* [ ] Add friction and damping.
* [ ] Tune physics.

## Phase 3 — Target System

* [ ] Create target objects.
* [ ] Add collision detection.
* [ ] Detect successful hits.
* [ ] Prevent duplicate target scoring.
* [ ] Implement win condition.
* [ ] Implement lose condition.

## Phase 4 — Game Loop

* [ ] Add score.
* [ ] Add attempts.
* [ ] Add restart.
* [ ] Add level completion.
* [ ] Add next-level progression.

## Phase 5 — Visual Polish

* [ ] Improve page graphics.
* [ ] Add realistic sharpener sprite.
* [ ] Add launch animation.
* [ ] Add hit effects.
* [ ] Add sound effects.
* [ ] Add background music.
* [ ] Add subtle camera effects.

## Phase 6 — Multiple Levels

* [ ] Create level configuration system.
* [ ] Add multiple book pages.
* [ ] Add progressively difficult levels.
* [ ] Add level selection.

## Phase 7 — Advanced Features

Potential features:

* [ ] Upload your own book page.
* [ ] Level editor.
* [ ] Drag-and-drop target placement.
* [ ] Custom target images.
* [ ] High-score system.
* [ ] Local leaderboard.
* [ ] Mobile/touch support.
* [ ] Daily challenge.
* [ ] Procedurally generated levels.

---

# 12. Potential AI Feature

A strong portfolio-oriented extension would be **automatic target detection from a page image**.

The user could upload an image of a book page.

The system could:

```text
Book Page Image
       ↓
Image Processing / AI
       ↓
Detect individual objects/images
       ↓
Generate target bounding boxes
       ↓
Convert bounding boxes → Game Targets
       ↓
Playable Level
```

This would allow the game to turn almost any suitable page into a playable level.

Possible future implementation:

* Computer vision model
* Object detection
* Image segmentation
* OpenAI vision-capable model
* Browser-based image processing

This should be considered a **stretch goal**, not part of the initial MVP.

---

# 13. Mobile Support

Although the initial version is a desktop web game, the architecture should avoid depending entirely on mouse-specific APIs.

Input abstraction should eventually support:

```text
Mouse
  ↓
Pointer Input
  ↑
Touch
```

Phaser's pointer events can be used so the same gameplay system can support both mouse and touch.

---

# 14. Portfolio Value

The project can demonstrate several useful engineering concepts:

* TypeScript
* React
* Game development
* Physics simulation
* Collision detection
* Event-driven architecture
* State management
* Canvas rendering
* Responsive UI
* Asset management
* Level/data-driven architecture
* Potential AI/computer vision integration
* Web deployment

The project becomes significantly more interesting as a portfolio piece if the final version combines:

**Physics + procedural/data-driven levels + custom page uploads + AI target detection.**

---

# 15. Guiding Principle

Build the project in this order:

```text
FUN CORE MECHANIC
        ↓
PHYSICS
        ↓
TARGETS
        ↓
GAME LOOP
        ↓
LEVELS
        ↓
POLISH
        ↓
ADVANCED FEATURES
        ↓
AI
```

Do not start by building the AI system, level editor, authentication, database, or other infrastructure.

The most important question for the first version is:

> **"Is flicking the sharpener actually fun?"**

If the answer is yes, everything else can be built around that core mechanic.
