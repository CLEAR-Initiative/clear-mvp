import { useId } from "react";

const DROP_PATH =
  "M13.3333 8.37038C13.3333 11.4795 10.9455 14 8 14C5.05448 14 2.66667 11.9487 2.66667 8.37038C2.66667 4.79208 7.11111 1.33334 8 1.33334C8.88889 1.33334 13.3333 4.79208 13.3333 8.37038Z";

export function OpacityIcon() {
  const maskId = `${useId().replace(/[^\w-]/g, "")}-mask`;

  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M7.99969 4.00039C8.58898 4.00039 10.7497 6.06289 10.7497 8.12539C10.7495 9.89714 9.51837 11.3334 7.99969 11.3334V4.00039Z"
        fill="currentColor"
      />
      <mask id={maskId} fill="white">
        <path d={DROP_PATH} />
      </mask>
      <path d={DROP_PATH} stroke="currentColor" strokeWidth={2.31111} mask={`url(#${maskId})`} />
    </svg>
  );
}
