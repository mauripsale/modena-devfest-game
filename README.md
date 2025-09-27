# Developer Detective App

This is an interactive web application for a developer-themed "treasure hunt" team game, created for events like DevFest Modena. Participants form teams, scan QR codes to collect clues, and solve a mystery related to a software bug.

## How It Works

1.  **Login and Teams**: Players log into the app and can choose to create a new team or join an existing one by entering the team name.
2.  **QR Code Scanning**: Using their device's camera, teams scan hidden QR codes to collect clues. Each clue helps them piece together the solution to a mystery.
3.  **Solving the Mystery (The 5 Ws)**: Once they have enough clues, the team must answer 5 key questions (the "5 Ws" of a detective, adapted to a software development context) to solve the case:
    *   **What**: What type of bug is it?
    *   **Where**: In which file is it located?
    *   **Who**: Which team introduced the bug?
    *   **Whom**: Who discovered and fixed the bug?
    *   **How**: How was the bug fixed?
4.  **Scoring and Leaderboard**: After submitting the final solution, the app calculates the team's score based on the number of correct answers. A real-time leaderboard shows the ranking of all teams, their scores, and their solution submission times.

## Tech Stack

*   **Frontend**: [React](https://react.dev/) with [Vite](https://vitejs.dev/) for a fast and modern development experience.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a modern and customizable user interface.
*   **Backend and Database**: [Firebase](https://firebase.google.com/) (Firestore and Authentication) for user management, real-time game data, and application logic.
*   **QR Code Scanning**: A JavaScript library for browser-based QR code scanning.
*   **Icons**: [Lucide React](https://lucide.dev/guide/packages/lucide-react) for clean and consistent icons.

## Setup and Development

### Prerequisites

*   Node.js (version 20.x or higher)
*   npm (or another package manager like yarn or pnpm)

### Installation

1.  Clone the repository:
    ```bash
    git clone <REPOSITORY_URL>
    cd <FOLDER_NAME>
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

### Starting the Development Server

To start the application in development mode with hot-reload:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173` (or another port if 5173 is already in use).

### Building for Production

To create an optimized version of the application for production:

```bash
npm run build
```

The files will be generated in the `dist/` folder.

### Linting

To check code quality and look for errors:

```bash
npm run lint
```