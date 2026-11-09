# Training Section Dupe (UI Only)

A faithful clone of the training curriculum administration section from:
`https://gheero-management-staging.vercel.app/curriculum-admin/training/d734b694-0802-4a4a-8a51-eaa693a10abd`

Built with a simple, modern, zero-backend approach using **Vite + React + TypeScript + Tailwind CSS**.

## Features & Included Tabs

1. **Header**:
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
