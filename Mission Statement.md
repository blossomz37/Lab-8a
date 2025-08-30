### 1. Mission Statement & Project Goal

The goal is to build a fast, private, and user-friendly **local web application** that allows me to manage my personal database of writing tropes. The application should transform the attached CSV data into a fully relational database with a clean web interface for CRUD (Create, Read, Update, Delete) operations and powerful searching.

The final product should be a self-contained package that I can easily run on my Mac with a single command. It is a single-user application for my personal use only.

### 2. User Persona

- **Who:** A novelist and creative writer.
- **Goal:** To quickly find inspiration and check story consistency by searching and browsing a personal, curated list of tropes, genres, characters, and examples from media.
- **Technical Comfort:** Comfortable using web applications (like Notion, Scrivener, Wikipedia) but is not a coder. The interface should be intuitive and require no technical knowledge to operate.

### 3. Core Functional Requirements (What the app must do)

The application will be pre-loaded with my data from the provided CSV files (`tropes.csv`, `genres.csv`, etc.).

**A. Trope & Genre Management:**

- **View All Tropes:** A main page that lists all tropes, with the ability to sort and filter by name.
- **View a Single Trope:** Clicking on a trope should lead to a dedicated page showing its name, description, and list of all associated genres and examples.
- **Create/Edit/Delete a Trope:** A simple form to add a new trope or edit an existing one's name and description.
- **Manage Genres:** The same full CRUD functionality for genres (view, create, edit, delete).
- **Link Tropes and Genres:** On a trope's page, I must be able to easily add or remove links to existing genres (e.g., add the "Fantasy" genre tag to the "Ancient Conspiracy" trope).

**B. Example Management (Linking Tropes to Media):**

- **Create a Work:** A way to add a "Work" (e.g., a book, film, or TV show) with a title and type (Novel, Film, etc.).
- **Add an Example:** On a trope's page, I need to be able to add an "Example," which links that trope to a "Work" and includes a short note describing how the trope appears in that work.
- **View by Work:** I also need a page for each "Work" that lists all the tropes that have been linked to it as examples.

**C. Search & Discovery (The Most Important Feature):**

- **Global Search:** A single search bar, always visible, that performs a **full-text search** across all trope names, descriptions, and example notes. The search results should be fast and clearly categorized (e.g., "Found in 3 Tropes," "Found in 1 Work").
- **Relational Search:** I must be able to answer questions like:
    - "Show me all tropes in the 'Science Fiction' genre."
    - "Show me all examples of the 'Enemies to Lovers' trope."
    - "Show me all tropes present in the novel *Dune*."

**D. Data Import / Export:**

- **Initial Data Load:** The application must include a one-time, reliable script to import and normalize all data from the provided CSV files into its database.
- **Data Backup:** A simple "Export to CSV" or "Backup Database" button that allows me to save a copy of all my data.

### 4. Non-Functional Requirements (How the app should behave)

- **Deployment:** The entire application (backend, frontend, database) must be containerized (e.g., using **Docker**). The final deliverable should be a `docker-compose.yml` file, allowing me to start the entire application with a single command: `docker-compose up`.
- **User Interface:** Clean, minimalist, and fast. Function over form. No complex animations or styling are needed. It should feel like a simple internal tool, not a public-facing website.
- **Performance:** The application must feel snappy and responsive for a database containing up to ~10,000 tropes and ~50,000 examples. Search should return results nearly instantly.
- **Data Integrity:** The database schema must be professionally designed and normalized to prevent data duplication. Use of a database like **PostgreSQL** is preferred.
- **Reliability:** The application should run entirely locally on my machine without needing an active internet connection (after the initial setup).

### 5. Deliverables Checklist ("The Final Package")

1. **Source Code:** A complete, well-documented codebase hosted on a private Git repository (e.g., GitHub).
2. **Containerized Application:** A `docker-compose.yml` file that defines and runs all services.
3. **Data Import Script:** A script to populate the database from my CSVs.
4. **Database Schema:** The final database migration files (e.g., from `Alembic`).
5. **Documentation (`README.md`):** A clear, simple file explaining:
    - How to install Docker on a Mac (if not already present).
    - The single command to start the application.
    - The one-time command to run the data import.
    - The local URL to access the application in my browser (e.g., `http://localhost:8000`).

---

## Development Status (Last Updated: August 29, 2025)

### ✅ **Completed Phases**

**Phase 4.1: Backend API for Trope Creation** - ✅ COMPLETE
- POST /api/tropes endpoint implementation
- UUID-based primary keys
- Category validation and association
- Database insertion with error handling
- Full API testing and validation

**Phase 4.2: Frontend Interface for Trope Creation** - ✅ COMPLETE
- Professional web form with validation
- Real-time category selection interface  
- Client-side and server-side validation
- Success/error feedback system
- Responsive design and user experience
- Complete workflow integration

### 🚀 **Current Technical Stack**
- **Backend**: Flask 2.3.3 with Gunicorn production server
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite with 153+ tropes, 23 categories
- **Server**: Running on localhost:8000
- **Architecture**: RESTful API with template rendering

### 📋 **Ready for Next Phase**
The application now supports complete trope creation functionality through both API and web interface. Ready to proceed with next development phase.
