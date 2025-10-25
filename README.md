# Collaborative Storyboarding Application

A collaborative storyboarding platform that allows multiple users to plan, visualize, and document film or animation projects. The application provides an organized structure for managing projects, scenes, and boards, enabling users to build storyboards with detailed visual and descriptive elements.

---

## Project Status

This project is currently in progress. Core features for creating storyboards and uploading images are functional. The PostgreSQL database schema and Supabase connection are already completed, but the database itself is not included in this repository.

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

## Database Schema Overview

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
