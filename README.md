# Orion Voice2Map 🧠🎙️

**Orion Voice2Map** transforms your spoken thoughts into structured, visual mind maps. It's designed for brainstormers, researchers, and students who want to organize their ideas instantly and enrich them with real-world data.

## 🚀 Key Features

- **Voice-to-Map**: Powered by **Gemini Pro (Thinking Mode)**, it extracts entities, actions, and relationships from audio recordings to build hierarchical mind maps.
- **AI Enrichment (Grounding)**:
  - **Google Search Integration**: Instantly pull 1-sentence summaries and web sources for any node.
  - **Google Maps Integration**: Enrich location-based nodes with addresses, ratings, and maps links.
- **Interactive Visualization**: Built with **React Flow**, allowing you to drag, edit, add children, and customize the layout (Horizontal, Vertical, Radial).
- **Secure Backend Integration**: Seamlessly handles AI processing through a dedicated Express backend, ensuring API key security and high performance.
- **User Authentication**: Persist your maps and manage session requirements with a built-in login/register system.
- **Multi-language Support**: Fully supports English and Chinese.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, TailwindCSS-inspired CSS, React Flow.
- **Backend Service**: Express-based AI Provider gateway.
- **Model Engines**: Gemini 3 Flash, Gemini 3 Pro (Thinking-enabled).

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)

### Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yaohuangguan/orion-voice2map.git
   cd orion-voice2map
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`. 
*(Note: Frontend API keys are successfully migrated to the secure backend gateway.)*

## 📦 Deployment

Project is ready for production deployment. Build with:
```bash
npm run build
```

---

*Part of the Orion AI Suite.*
