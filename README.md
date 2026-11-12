# Training Section Dupe with ElevenLabs AI Assistant RAG UI

A faithful clone of the training curriculum administration section from:
`https://gheero-management-staging.vercel.app/curriculum-admin/training/d734b694-0802-4a4a-8a51-eaa693a10abd`

Built with a clean, modern, zero-backend approach using **Vite + React + TypeScript + Tailwind CSS**.

## Features & Included Components

1. **Header & Section Navigation**:
   - Navigation back button with `<ChevronLeft />`
   - Training title: `AI/ML Residency Program Training`
2. **Tab Bar**:
   - Matches original icons and styling (`Overview`, `Training Profile`, `Audience Profile`, `Module`, `Survey`, `Assessment`, `Content`)
3. **Overview Tab**:
   - Accordions for `Basic Information`, `Location`, `Training Details`, `Target Audience`, and `Purpose of the training`
4. **Training Profile Tab**:
   - Keyword badges (`AI`, `ML`)
   - Accordions for `Scope`, `Attendance Requirement`, `Assessment Result Requirement`, `Competency Outcomes`, `Alignment with Standard`, `Prior Knowledge`, `Learning Style Preferences`, `Delivery Tools`, `Technological Requirements`, and `Training Objectives`
5. **Audience Profile Tab**:
   - Accordions for `Learner Characteristics` and `Prerequisites`
6. **Module Tab**:
   - Expandable module cards for all 6 curriculum modules with interactive "+ Module" modal
7. **Survey Tab**:
   - Survey cards, section indicators, preview/edit actions, and "+ Create New Survey" modal
8. **Assessment Tab**:
   - Full data table with columns for `Name`, `Assessment Type`, `Target`, `Weight`, `Assigned To`, `Cohort`, `Approval Status`, and `Actions`, plus interactive "+ New Assessment" modal
9. **Content Tab**:
   - Real research documents, lesson assignments, discussion topics, search filter, module filter, and "+ Add Content" modal
10. **ElevenLabs Conversational AI RAG Assistant (Bottom-Right)**:
   - **Floating Trigger Button**: Anchored to bottom right with dark pill design, ElevenLabs double-bar logo (`||`), ambient pulse glow, and live equalizer waveform.
   - **Chat Mode with RAG Citations**: Direct knowledge base retrieval over the curriculum with cited sources (`Retrieved RAG Sources`), quick suggestion prompts, copy response, and text-to-speech voice playback.
   - **Live Voice Mode**: Centered glowing, swirling 3D gradient ElevenLabs Voice Orb that reacts dynamically to states (`idle`, `listening`, `thinking`, `speaking`), waveform audio visualization, microphone mute/unmute, and disconnect controls.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
