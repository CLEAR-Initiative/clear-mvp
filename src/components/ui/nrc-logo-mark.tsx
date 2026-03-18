interface NrcLogoMarkProps {
  size?: number;
}

export function NrcLogoMark({ size = 28 }: NrcLogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <rect width="100" height="100" fill="#E8410A" />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="38"
        letterSpacing="-1"
      >
        NRC
      </text>
    </svg>
  );
}
