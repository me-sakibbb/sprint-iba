# SprintIBA - Advanced Exam Preparation Platform

**SprintIBA** is a comprehensive, AI-powered platform designed for students preparing for IBA (Institute of Business Administration) and other competitive exams. It streamlines the study process by combining intelligent content extraction with robust practice and testing tools.

## 🚀 Key Features

- **AI Question Extractor**: Automatically extract MCQs from PDF documents using Google Gemini AI. 
  - Supports complex formatting and LaTeX equations.
  - Advanced regional image extraction from PDFs.
  - Automatic categorization into subjects and topics.
- **Taxonomy Management**: A hierarchical system to manage Subjects, Topics, and Subtopics, ensuring a structured question bank.
- **Practice Engine**: 
  - Interactive practice sessions with instant feedback.
  - AI-generated explanations for every question.
  - Support for mathematical formulas via LaTeX.
- **Exam System**: 
  - Full-scale Mock Exams and Live Exam sessions.
  - Timed environments to simulate real test conditions.
- **Analytics Dashboard**: 
  - Comprehensive performance tracking for students.
  - Admin insights into user activity and content usage.
- **Rich Editor**: Integrated Markdown and LaTeX editor for creating and editing high-quality educational content.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Integration**: [Google Gemini API](https://ai.google.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/) & [pdf-lib](https://pdf-lib.js.org/)
- **Charts**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn
- A Supabase project
- A Google Gemini API key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Taalha3359/sprint-iba.git
   cd sprint-iba
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file in the root directory and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the result.

## 📂 Project Structure

- `src/app`: Next.js pages, layouts, and API routes.
- `src/components`: UI components organized by feature (admin, practice, etc.).
- `src/hooks`: Custom React hooks for state management and data fetching.
- `src/services`: Core logic for AI extraction, PDF processing, and API services.
- `src/integrations`: Supabase client and generated types.
- `supabase/migrations`: SQL migrations for the database schema.

## 📄 License

This project is private and intended for internal use.
