# Collaborative Storyboarding Application

A React + Vite application for collaborative storyboarding. Users can create projects, scenes, and boards (storyboard panels), upload images, and store metadata like shot numbers, camera settings, durations, and transitions. The app is designed to use Supabase (Postgres, Auth, Storage) as the backend.

---

## Quick status

**Project status:** In progress — core storyboard creation and image upload features are implemented. The repository contains frontend code and Supabase client setup; the actual Supabase project (database) is not included here.

---

A collaborative storyboarding platform that allows multiple users to plan, visualize, and document film or animation projects. The application provides an organized structure for managing projects, scenes, and boards, enabling users to build storyboards with detailed visual and descriptive elements.

---

## Features

- Create and manage projects and scenes  
- Add boards within scenes containing titles, descriptions, and visual elements  
- Upload and preview images for storyboard panels  
- Record metadata such as camera angle, lens focal length, transitions, and duration  
- Maintain relationships between projects, scenes, and boards using a relational schema  

---

## Tech Stack

- **Frontend:** React + Vite  
- **Backend:** Supabase (PostgreSQL, Auth, Storage)  
- **Version Control:** Git / GitHub  

---

## Database Schema Overview (current)

Below is the current PostgreSQL schema implemented in Supabase.

### `projects`

| Column       | Type        | Description                |
|---------------|-------------|----------------------------|
| id            | int8 (PK)   | Unique project ID          |
| created_at    | timestamptz | Project creation date      |
| title         | text        | Project title              |
| updated_at    | timestamptz | Last update timestamp      |
| description   | text        | Project description        |

### `scenes`

| Column       | Type        | Description                |
|---------------|-------------|----------------------------|
| id            | int8 (PK)   | Unique scene ID            |
| created_at    | timestamptz | Scene creation date        |
| name          | text        | Scene name                 |
| project_id    | int8 (FK→projects.id) | Associated project   |

### `boards`

| Column           | Type        | Description                        |
|------------------|-------------|------------------------------------|
| id               | int8 (PK)   | Unique board ID                    |
| created_at       | timestamptz | Board creation date                |
| title            | text        | Board title                        |
| scene_id         | int8 (FK→scenes.id) | Associated scene          |
| shot             | int8        | Shot number                        |
| description      | text        | Description or notes               |
| duration         | int8        | Duration in seconds                |
| transition       | text        | Transition type                    |
| aspect_ratio     | text        | Aspect ratio of the shot           |
| camera_angle     | text        | Camera angle                       |
| camera_movement  | text        | Camera movement details            |
| lens_focal_mm    | int8        | Lens focal length (mm)             |
| updated_time     | timestamptz | Last update timestamp              |
| project_id       | int8 (FK→projects.id) | Associated project       |
| image_url        | text        | Link to uploaded storyboard image  |

---

## Roadmap

- Real-time collaboration features  
- Commenting system  
- Project sharing and export options
- Improved stylization
- Animatic Functionality

---

## Table of Contents

- Quick start
- Project structure
- Scripts & tooling
- Environment & Supabase
- Architecture notes
- Dependencies
- Contributing

---

## Quick start

Prerequisites:
- Node.js v16+ (recommended) and npm
- A Supabase project (for the database and storage)

Steps:

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file in the project root with your Supabase credentials (see next section)

3. Run the dev server

```bash
npm run dev
```

Open http://localhost:5173 in your browser (Vite will show the exact URL in the console).

Build for production:

```bash
npm run build
npm run preview   # serves the built files for testing
```

Run lint checks:

```bash
npm run lint
```

---

## Environment & Supabase

This project uses environment variables prefixed with `VITE_` so they are injected into the client bundle by Vite.

Create a `.env` file in the repository root (do NOT commit secrets):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-or-service-key
# OR in some code paths the variable `VITE_SUPABASE_API_KEY` may be referenced
# (there are two client files: `lib/supabase-client.ts` and `src/supabase-client.js`).
```

Important notes:
- Keep these keys private (do not commit `.env` to source control).
- If you use Supabase Auth/Storage, enable the appropriate permissions in the Supabase dashboard.

---

## Project structure (high level)

```
.
├─ index.html
├─ package.json
├─ vite.config.js
├─ lib/
│  └─ supabase-client.ts        # alternative TS client using env var VITE_SUPABASE_API_KEY
├─ src/
│  ├─ main.jsx                  # app entry
│  ├─ App.jsx                   # top-level routes and layout
│  ├─ index.css                 # global styles
│  ├─ supabase-client.js        # main Supabase client (uses VITE_SUPABASE_KEY)
│  ├─ assets/
│  │  ├─ PlayButton.jsx
│  │  └─ StopButton.jsx
│  └─ components/
│     ├─ AddModal.jsx
│     ├─ BoardButton.jsx
│     ├─ Boards.jsx
│     ├─ CreateProjectButton.jsx
│     ├─ CreateProjectModal.jsx
│     ├─ DeleteBoardModal.jsx
│     ├─ DeleteProjectModal.jsx
│     ├─ EditModal.jsx
│     ├─ EditProjectModal.jsx
│     ├─ LoginButton.jsx
│     └─ styles/                 # component CSS modules
│        ├─ Boards.module.css
│        ├─ Button.module.css
│        ├─ LoginButton.module.css
│        └─ Modal.module.css
└─ src/pages/
   ├─ CreateProject.jsx
   ├─ EditProject.jsx
   └─ Login.jsx
```

Files of interest:
- `src/main.jsx` — React entry file
- `src/App.jsx` — application routing and layout
- `src/supabase-client.js` and `lib/supabase-client.ts` — Supabase initialization
- `src/pages/*` — page-level route components (Create, Edit, Login)
- `src/components/*` — UI building blocks (modals, buttons, board list)

---

## Scripts & tooling

From `package.json`:

- `npm run dev` — start Vite dev server

Tooling included (dev): Vite, ESLint ,and React plugin.

---

## Dependencies

Main runtime dependencies:
- react, react-dom
- react-router-dom
- @supabase/supabase-js (Supabase client)
- @dnd-kit/* (drag & drop)
- @tanstack/react-query
- react-pdf, recharts

Dev tooling:
- vite, @vitejs/plugin-react
- eslint, @eslint/js, eslint plugins
- tailwindcss, postcss, autoprefixer

(See `package.json` for exact versions.)

---

## Architecture notes & gotchas

- Supabase: The project expects a Supabase backend for persistent storage and optional auth. The repository includes client initialization, but you must provide your own Supabase project and keys.
- Two client files exist (`lib/supabase-client.ts` and `src/supabase-client.js`). They reference slightly different env variable names (`VITE_SUPABASE_KEY` vs `VITE_SUPABASE_API_KEY`). To avoid issues, set both `VITE_SUPABASE_KEY` and `VITE_SUPABASE_API_KEY` in your `.env` file.
- Keep secrets out of version control (use `.env` and add it to `.gitignore`).

---

## Contributing

- Open an issue or submit a PR with a short description of the change.
- Follow the existing code style and run `npm run lint` before sending PRs.

---

If you want, I can also add a sample `.env.example` file (without secrets) and a short developer checklist to help new contributors.

---

License: (add your chosen license here)

