interface StarburstProps {
  size?: number;
  color?: string;
  className?: string;
  filled?: boolean;
}

export function Starburst({ size = 32, color = 'currentColor', className = '', filled = false }: StarburstProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {filled ? (
        <path
          d="M16 0 L17.5 13.5 L29 8 L19.5 17.5 L32 16 L19.5 14.5 L29 24 L17.5 18.5 L16 32 L14.5 18.5 L3 24 L12.5 14.5 L0 16 L12.5 17.5 L3 8 L14.5 13.5 Z"
          fill={color}
        />
      ) : (
        <path
          d="M16 2 L17.2 13.8 L27 7 L19.5 16 L30 14.8 L19.5 16 L27 25 L17.2 18.2 L16 30 L14.8 18.2 L5 25 L12.5 16 L2 14.8 L12.5 16 L5 7 L14.8 13.8 Z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
