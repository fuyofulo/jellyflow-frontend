# Jellyflow - No-Code Workflow Automation Platform

Jellyflow is a powerful no-code workflow automation platform that allows users to create and customize automation workflows by connecting various services with triggers and actions. Similar to platforms like Zapier and IFTTT, Jellyflow enables seamless integration between your favorite apps and services without requiring coding knowledge.

## 🚀 Features

- **Intuitive Flow Editor**: Visual canvas for designing workflows with a drag-and-drop interface
- **Triggers & Actions**: Support for various triggers (webhooks, scheduled events, email) and actions (API calls, notifications, database operations)
- **Service Integrations**: Connect with popular services like Slack, Gmail, Discord, GitHub, and more
- **Custom Webhooks**: Create webhook endpoints to trigger your workflows from external services
- **Real-time Execution**: Execute workflows in real-time with detailed logs
- **Error Handling**: Built-in error management and retry capabilities
- **Dynamic Data Mapping**: Map data between different services with ease

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Tailwind CSS, Radix UI
- **Flow Editor**: React Flow for node-based interface
- **API Client**: Custom fetch wrapper for backend communication

## 🛠️ Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Access to the Jellyflow backend API (separate repository)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/fuyofulo/jellyflow-frontend.git
   cd jellyflow-frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   # Clerk authentication keys
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key

   # Backend API URL (required)
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3033

   # Environment (development, production, etc.)
   NODE_ENV=development
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

### Production Deployment

To create a production build:

```bash
npm run build
npm start
```

For production deployment, we recommend using Vercel or a similar platform that supports Next.js applications.

## 🧩 Project Structure

```
jellyflow-frontend/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   │   ├── flow-editor/ # Flow editor components
│   │   ├── logos/       # Service logo components
│   │   ├── pages/       # Page-specific components
│   │   └── ui/          # Reusable UI components
│   ├── data/            # Static data and configurations
│   └── utils/           # Utility functions and API clients
├── .env                 # Environment variables
└── package.json         # Project dependencies and scripts
```

## 🌐 Key Workflows

### Creating a New Automation

1. Navigate to the dashboard and click "Create New Jellyflow"
2. Add a trigger from the available trigger services
3. Configure the trigger settings
4. Add one or more actions to execute when the trigger fires
5. Configure each action with the necessary settings
6. Test the workflow using the built-in testing tools
7. Activate the workflow to put it into production

### Managing Workflows

- View all your workflows from the dashboard
- Enable/disable workflows as needed
- View execution history and logs
- Edit existing workflows to modify triggers or actions

## 🧪 Development

### Command Reference

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check for code issues

## 🔗 Related Projects

- [Jellyflow Backend](https://github.com/fuyofulo/jellyflow) - The API server for Jellyflow

---

Built with ❤️ by fuyofulo
