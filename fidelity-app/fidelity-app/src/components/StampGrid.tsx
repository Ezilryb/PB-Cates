interface StampGridProps {
  current: number;
  total: number;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export default function StampGrid({
  current,
  total,
  color = "#f97316",
  size = "md",
}: StampGridProps) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };
  const iconSize = { sm: 6, md: 8, lg: 10 };

  const cols = Math.min(total, 10);
  const rows = Math.ceil(total / 10);

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        return (
          <div
            key={i}
            className={`${sizeMap[size]} rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              filled ? "animate-stamp-in" : ""
            }`}
            style={{
              backgroundColor: filled ? color : "transparent",
              borderColor: filled ? color : "rgba(255,255,255,0.15)",
            }}
          >
            {filled && (
              <svg
                width={iconSize[size]}
                height={iconSize[size]}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
