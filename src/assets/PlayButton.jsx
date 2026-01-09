export function PlayButton({ size = 45 }) {
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

      {/* Play triangle */}
      <polygon
        points="47,35 80,57.5 47,80"
        fill="#FFFFFF"
      />
    </svg>
  );
}
