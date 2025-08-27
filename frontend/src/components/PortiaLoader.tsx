"use client";

interface PortiaLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
}

export default function PortiaLoader({ size = "md" }: PortiaLoaderProps) {
  const sizeClasses: Record<typeof size, string> = {
    sm: "w-[4px] h-[4px]",
    md: "w-[6px] h-[6px]",
    lg: "w-[8px] h-[8px]",
    xl: "w-[12px] h-[12px]",
  };

  return (
    <div className="flex items-center justify-center w-full py-4">
      <div className="relative flex space-x-1">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`${sizeClasses[size]} bg-black dark:bg-white rounded-full opacity-0 animate-loading`}
            style={{ animationDelay: `${(5 - i) * 100}ms` }}
          ></span>
        ))}
      </div>
    </div>
  );
}
