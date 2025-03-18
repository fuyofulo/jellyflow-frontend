import { App } from "@/utils/apps";
import { ActionIcon } from "@/utils/iconMapping";

interface AppCardProps {
  app: App;
  onClick: () => void;
}

export function AppCard({ app, onClick }: AppCardProps) {
  const isTrigger = app.category === "trigger";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-3 border border-zinc-800 rounded-xl bg-black hover:bg-zinc-900 transition-colors text-center"
    >
      <ActionIcon
        actionId={app.id}
        width={24}
        height={24}
        className="mb-2 text-white"
      />
      <h3 className="text-xs font-medium text-white">{app.name}</h3>
      <p className="text-xs text-zinc-400 text-center mt-1 line-clamp-2 text-[10px]">
        {app.description}
      </p>
      <div
        className={`mt-2 text-[10px] px-2 py-0.5 rounded-full ${
          isTrigger
            ? "bg-purple-700 text-purple-200"
            : "bg-yellow-600/20 text-yellow-400"
        }`}
      >
        {isTrigger ? "Trigger" : "Action"}
      </div>
    </button>
  );
}
