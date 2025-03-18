// Mock data for testing the dashboard
export interface MockZap {
  id: string;
  name: string;
  lastEdited: string;
  isRunning: boolean;
  flow: string[];
}

// Generate a random date string within last 30 days
const getRandomDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  return `${date.toLocaleString("default", {
    month: "short",
  })} ${date.getDate()}, ${date.getFullYear()}`;
};

// Generate random flow steps
const generateFlow = (): string[] => {
  const length = Math.floor(Math.random() * 7) + 2; // 2-8 steps
  return Array.from({ length }, (_, i) => `step-${i}`);
};

// Generate mock zap data
export const generateMockZaps = (count: number = 4): MockZap[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `zap-${i + 1}`,
    name: `Zap Name ${i + 1}`,
    lastEdited: getRandomDate(),
    isRunning: Math.random() > 0.5,
    flow: generateFlow(),
  }));
};

// For testing when backend isn't available
export const fetchMockZaps = (): Promise<{
  zaps: MockZap[];
  username: string;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        zaps: generateMockZaps(),
        username: "TestUser",
      });
    }, 800); // Simulate network delay
  });
};

// Mock toggle functionality
export const toggleMockZap = (
  id: string,
  status: boolean
): Promise<{ success: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 300);
  });
};
