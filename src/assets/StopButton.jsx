export function StopButton({ size = 45 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 115 115"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle cx="57.5" cy="57.5" r="56" fill="#A78BFA" />

      {/* Stop square */}
      <rect
        x="37"
        y="37"
        width="40"
        height="40"
        fill="#FFFFFF"
      />
    </svg>
  );
}
