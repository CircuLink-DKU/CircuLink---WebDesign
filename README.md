<div align="center">

# 🔗 CircuLink

**A second-hand marketplace & donation platform for Duke Kunshan University**

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

*Connecting the DKU community — buy, sell, and donate with ease.*

</div>

---

## 📖 About

CircuLink is a web platform designed exclusively for the **Duke Kunshan University** community. It combines a **second-hand marketplace** and a **donation board** in one place, making it easy for students, faculty, and staff to give items a second life — reducing waste and building community.

- **Marketplace** — List and browse pre-owned items within the DKU campus
- **Donation Hub** — Post or claim items for free, no exchange needed
- **Community-first** — Restricted to authenticated DKU community members

---

## 🎬 Demo

> 📹 *Demo video coming soon — check back after the next release!*

<!-- Once you have a video, replace the above line with one of:
     YouTube: [![CircuLink Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)
     GitHub-hosted mp4: paste the CDN link from dragging a video into any GitHub Issue -->

---

## 🏗️ Software Architecture

CircuLink is a **single-page application (SPA)** with a lightweight Express auth server and Supabase as the cloud database backend.

```mermaid
graph TB
    subgraph Client["🖥️ Client — Browser"]
        SPA["Vite + React SPA\n(TypeScript + Tailwind)"]
    end

    subgraph Auth["🔐 Auth Server — Express.js"]
        JWT["JWT Issue & Refresh\n/api/auth/*"]
        Upload["File Upload\nmulter middleware"]
    end

    subgraph Data["🗄️ Data Layer"]
        Supabase[("Supabase\nPostgreSQL\n(Production)")]
        SQLite[("SQLite via Prisma\n(Local Dev)")]
    end

    subgraph AI["🤖 AI Layer — Planned"]
        LLM["OpenAI-compatible LLM\ngpt-4.1-mini"]
        Rekognition["Amazon Rekognition\nImage Analysis"]
        Bedrock["Amazon Bedrock\nFoundation Models"]
    end

    SPA -->|"REST calls"| JWT
    SPA -->|"Image upload"| Upload
    SPA -->|"Direct via supabase-js"| Supabase
    JWT -->|"Prisma ORM"| SQLite
    JWT -->|"Prisma ORM"| Supabase
    Upload -->|"Planned"| Rekognition
    SPA -->|"Planned"| LLM
    LLM -->|"Planned"| Bedrock

    classDef clientStyle fill:#dbeafe,stroke:#3b82f6,color:#1e3a8a
    classDef authStyle fill:#dcfce7,stroke:#22c55e,color:#14532d
    classDef dataStyle fill:#f3e8ff,stroke:#a855f7,color:#581c87
    classDef aiStyle fill:#fef3c7,stroke:#f59e0b,color:#78350f

    class SPA clientStyle
    class JWT,Upload authStyle
    class Supabase,SQLite dataStyle
    class LLM,Rekognition,Bedrock aiStyle
```

### Component Overview

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Frontend SPA** | Vite + React 18 + TypeScript | UI, routing, state management |
| **Styling** | Tailwind CSS + lucide-react | Component design system |
| **Auth Server** | Express.js + JWT + bcryptjs | Token issue/refresh, file uploads |
| **ORM** | Prisma | Type-safe DB access |
| **Database (local)** | SQLite | Development database |
| **Database (prod)** | Supabase (PostgreSQL) | Cloud database + auth |
| **AI (planned)** | OpenAI-compatible API + Amazon Bedrock | Smart listings, recommendations |

---

## ✨ Features

- 🛒 **Marketplace** — Post, browse, search, and filter second-hand items by category, price, and condition
- 🎁 **Donation Board** — Give or receive items for free within the DKU community
- 🔐 **JWT Authentication** — Secure login with token refresh via the Express auth server
- 📸 **Image Uploads** — Attach photos to listings via multer file handling
- 🏷️ **Category System** — Items organized by Development Boards, Components, Tools, Kits, Displays, Power & Batteries
- 📱 **Responsive Design** — Tailwind-first layout, works on desktop and mobile

---

## 🤖 AI Features (In Progress — with DKU AI Club × Amazon)

CircuLink is integrating AI capabilities in collaboration with the **DKU AI Club**, supported by **Amazon Web Services**. The LLM endpoint is already configured in `.env.example`.

| Feature | Status | AWS Service |
|---------|--------|-------------|
| **AI Listing Generator** — auto-fill title, description & category from item name | 🔜 Planned | Amazon Bedrock |
| **Price Estimator** — suggest fair secondhand price by condition | 🔜 Planned | Amazon Bedrock |
| **Image Auto-Categorization** — detect item type from photo | 🔜 Planned | Amazon Rekognition |
| **Content Moderation** — flag inappropriate images & text | 🔜 Planned | Amazon Rekognition |
| **Natural Language Search** — "cheap Arduino kit under 100 yuan" | 🔜 Planned | Amazon Bedrock |
| **Donation Matching** — match donors with users who need similar items | 🔜 Planned | Amazon Bedrock |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/CircuLink-DKU/CircuLink---WebDesign.git
cd CircuLink---WebDesign

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Set up the local database
npx prisma migrate dev
npx prisma generate

# (Optional) Seed with sample data
python insert-sample-data.py
```

### Running Locally

```bash
# Terminal 1 — Start the Vite dev server (frontend)
npm run dev

# Terminal 2 — Start the Express auth server (backend)
cd server && npm install && npm start
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

> The Express auth server runs on port `4000` by default (`VITE_API_URL=http://localhost:4000/api`).

---

## 📁 Project Structure

```
CircuLink---WebDesign/
├── src/                        # Vite + React + TypeScript SPA
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Route-level page components
│   ├── hooks/                  # Custom React hooks
│   ├── context/                # React context providers
│   ├── lib/                    # Supabase client & utilities
│   ├── data/                   # Static/seed data
│   └── types/                  # TypeScript type definitions
├── server/                     # Express.js auth server
│   └── src/
│       └── server.js           # JWT auth routes & multer uploads
├── prisma/                     # Prisma ORM
│   └── schema.prisma           # Database schema (User, Item, Category…)
├── supabase/
│   └── migrations/             # Supabase SQL migrations
├── public/                     # Static assets served by Vite
├── scripts/                    # Dev helper utilities
├── docs/                       # Additional documentation
├── .env.example                # Environment variable template
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

---

## 🗄️ Data Model (Prisma)

Key entities in `prisma/schema.prisma`:

| Model | Key Fields |
|-------|-----------|
| **User** | `email`, `passwordHash`, `name`, `role` |
| **Item** | `title`, `description`, `price`, `condition`, `status`, `images[]`, `sellerId`, `categoryId` |
| **Category** | `name`, `slug` (e.g. `dev-boards`, `components`) |

Item `condition` values: `LIKE_NEW`, `GOOD`
Item `status` values: `ACTIVE`, `SOLD`, `DONATED`

---

## 🤝 Contributing

We welcome contributions from the DKU community! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

```bash
git checkout -b feature/your-feature
git commit -m "feat: describe your change"
git push origin feature/your-feature
# then open a Pull Request
```

---

## 👥 Team

Built with ❤️ by students at **Duke Kunshan University**, in collaboration with the **DKU AI Club** and **Amazon Web Services**.

| Role | Contact |
|------|---------|
| Project Lead | [@CircuLink-DKU](https://github.com/CircuLink-DKU) |
| Frontend | — |
| Backend | — |
| AI / AWS | DKU AI Club |

> Want to add your name? Open a PR and update this table!

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Made at Duke Kunshan University 🎓
</div>
