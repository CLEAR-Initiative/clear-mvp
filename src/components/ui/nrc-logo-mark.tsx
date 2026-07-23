interface NrcLogoMarkProps {
  size?: number;
}

/** Inline NRC mark — avoids intermittent SW/cache 404s on /nrc-logo-square.svg. */
export function NrcLogoMark({ size = 28 }: NrcLogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 227 227.7"
      width={size}
      height={size}
      role="img"
      aria-label="NRC"
      style={{ flexShrink: 0, display: "block" }}
    >
      <rect width="226.4" height="226.4" fill="#FD5A00" />
      <path
        fill="#FFFFFF"
        d="M66.2,176.2l-25.4-47l0.4,47H24.6V97.5h16.6l25.4,47l-0.4-47h16.6v78.7H66.2z"
      />
      <path
        fill="#FFFFFF"
        d="M108.4,176.2H91.6V97.4h26.8c21.2,0,28.5,9.7,28.1,24.7c-0.4,13.5-5.4,17.2-13.7,21.2l19.3,32.9h-19.6l-15.9-29.5h-8.2V176.2z M108.4,131.4h11.4c7.5,0,8.4-5,8.4-9.3s-0.9-9.3-8.4-9.3h-11.4V131.4z"
      />
      <path
        fill="#FFFFFF"
        d="M185.5,95.9c9.1,0,13.2,1.7,16.4,2.9v15.9c-4.6-2.1-9.6-3.1-14.7-3c-12.8,0-18.7,5.1-18.7,25.1s5.9,25.1,18.7,25.1c5.1,0.1,10.1-0.9,14.7-3v15.8c-3.1,1.3-7.2,2.9-16.4,2.9c-23,0-33.9-11.2-34-40.8C151.6,107.2,162.5,95.9,185.5,95.9z"
      />
    </svg>
  );
}
