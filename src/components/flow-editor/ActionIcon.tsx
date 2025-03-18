import { IconMapping } from "@/utils/iconMapping";

interface ActionIconProps {
  actionId: string;
  width?: number;
  height?: number;
}

export function ActionIcon({
  actionId,
  width = 24,
  height = 24,
}: ActionIconProps) {
  const IconComponent = IconMapping[actionId];

  if (!IconComponent) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <span className="text-xs font-medium">{actionId[0].toUpperCase()}</span>
      </div>
    );
  }

  return <IconComponent width={width} height={height} />;
}
