import Image from "next/image";

interface NrcLogoMarkProps {
  size?: number;
}

export function NrcLogoMark({ size = 28 }: NrcLogoMarkProps) {
  return (
    <Image
      src="/nrc-logo-square.svg"
      alt="NRC"
      width={size}
      height={size}
      style={{ flexShrink: 0, display: "block" }}
    />
  );
}
