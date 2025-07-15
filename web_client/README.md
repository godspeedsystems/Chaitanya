# Vite + React + Shadcn + TypeScript Starter

This is a feature-rich chat application built with a modern tech stack, designed for real-time, interactive conversations. It supports file uploads, GitHub repository integration, and live-streaming AI responses.

## Features

- **Real-time Chat Interface**: A clean and intuitive chat interface for seamless communication.
- **WebSocket Integration**: Leverages WebSockets for instant, bidirectional communication between the client and server, enabling real-time message streaming.
- **File Uploads**: Users can upload documents directly into the chat. The application processes these files and integrates them into the conversation context.
- **GitHub Repository Integration**: Users can link to public GitHub repositories, allowing the AI to access and process code from the specified branch.
- **Streaming AI Responses**: AI-generated responses are streamed word-by-word, providing a dynamic and engaging user experience.
- **Message Management**:
  - **Rewrite and Resubmit**: Users can stop a streaming response, edit their last message, and resubmit it to get a new response.
  - **Delete Uploaded Content**: Users can delete previously uploaded files or linked GitHub repositories.
- **Backend API Communication**: The frontend communicates with a backend server for handling business logic, file processing, and AI interactions.
- **Component-Based Architecture**: Built with React and organized into reusable components for maintainability and scalability.
- **Modern Tooling**: Utilizes Vite for a fast and efficient development experience.

## Tech Stack

- **Frontend**:
  - [React](https://react.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/)
- **UI Components**:
  - [Shadcn UI](https://ui.shadcn.com/)
  - [Tailwind CSS](https://tailwindcss.com/)
- **State Management**:
  - React Hooks (`useState`, `useEffect`, `useRef`)
- **API Communication**:
  - [Axios](https://axios-http.com/) for HTTP requests
  - Native WebSocket API for real-time communication
- **Routing**:
  - [React Router](https://reactrouter.com/)
- **Linting & Formatting**:
  - [ESLint](https://eslint.org/)
  - [Prettier](https://prettier.io/) (via `eslint-config-prettier`)

## Project Structure

```
/
├── public/               # Static assets
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # Shadcn UI components
│   │   ├── ChatContainer.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── ChatInput.tsx
│   │   └── MessageList.tsx
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Top-level page components
│   │   ├── Index.tsx
│   │   └── NotFound.tsx
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main application component with routing
│   └── main.tsx          # Application entry point
├── .gitignore
├── package.json
├── README.md
└── vite.config.ts
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) or [npm](https://www.npmjs.com/)/[yarn](https://yarnpkg.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Development Server

To start the local development server, run:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

To create a production-ready build, run:

```bash
npm run build
```

The optimized and minified files will be generated in the `dist/` directory.

### Linting

To check for code quality and style issues, run:

```bash
npm run lint
