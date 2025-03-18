export interface App {
  id: string;
  name: string;
  description: string;
  category: "trigger" | "action";
}

export const apps: App[] = [
  {
    id: "aac0e619-2094-4589-badc-fe487834f705",
    name: "Webhook",
    description: "Trigger your flow with a webhook request",
    category: "trigger",
  },
  {
    id: "7fbe85fc-5a12-4103-8d00-264f117aaf37",
    name: "Slack",
    description: "Send messages and interact with Slack",
    category: "action",
  },
  {
    id: "f7d609d1-0adf-4487-b934-2a6b9f5ea88f",
    name: "GitHub",
    description: "Automate your GitHub workflows",
    category: "action",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and receive emails through Gmail",
    category: "action",
  },
  {
    id: "d7f14946-bd36-4daa-9dca-2bbea2cb19b8",
    name: "Solana",
    description: "Interact with Solana blockchain",
    category: "action",
  },
  {
    id: "103b134a-4dac-46a3-a4c3-621e9ffcfd79",
    name: "Ethereum",
    description: "Execute transactions on Ethereum blockchain",
    category: "action",
  },
  {
    id: "9549c50b-81b1-47c3-b0e0-754fd8c7acf8",
    name: "X",
    description: "Post and interact with X (formerly Twitter)",
    category: "action",
  },
  {
    id: "51368c2c-47aa-4999-be7e-5e8dc354c87f",
    name: "Notion",
    description: "Create and update Notion pages",
    category: "action",
  },
  {
    id: "f14c5d53-4563-41a2-9cdb-fcf5d184deda",
    name: "Drive",
    description: "Manage files in Google Drive",
    category: "action",
  },
  {
    id: "9a4793d2-3125-4ed1-9da2-0499edb6bdd0",
    name: "ChatGPT",
    description: "Generate text using OpenAI's ChatGPT",
    category: "action",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Send messages and interact with Discord",
    category: "action",
  },
  {
    id: "f4b74660-98e4-46b3-856a-1b4b1423c722",
    name: "Email",
    description: "Send and receive emails",
    category: "action",
  },
];
