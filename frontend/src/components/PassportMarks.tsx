import type { SVGProps } from "react";

type MarkProps = SVGProps<SVGSVGElement>;

function MarkBase({ children, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

/** Geometric identity seal — passport header mark */
export function PassportMark({ className, ...props }: MarkProps) {
  return (
    <MarkBase className={className} {...props}>
      {/* Outer plate */}
      <rect
        x="4.5"
        y="4.5"
        width="31"
        height="31"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      {/* Inner frame */}
      <rect
        x="9"
        y="9"
        width="22"
        height="22"
        rx="1"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      {/* Identity bars */}
      <path
        d="M14 15.5h12M14 20h8M14 24.5h10"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="square"
      />
      {/* Corner ticks */}
      <path
        d="M4.5 12H7M4.5 28H7M33 12h2.5M33 28h2.5"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.7"
      />
    </MarkBase>
  );
}

/** Nested lattice — Soroban / smart contract */
export function SorobanMark({ className, ...props }: MarkProps) {
  return (
    <MarkBase className={className} {...props}>
      <path
        d="M20 6.5L31.5 20L20 33.5L8.5 20L20 6.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="miter"
      />
      <path
        d="M20 13L26.5 20L20 27L13.5 20L20 13Z"
        stroke="currentColor"
        strokeWidth="1.15"
        opacity="0.85"
      />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </MarkBase>
  );
}

/** Ascending steps — Shipper / milestones */
export function ShipperMark({ className, ...props }: MarkProps) {
  return (
    <MarkBase className={className} {...props}>
      <path
        d="M8 28.5h7.5V21H23v-7.5H32"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M28.5 9.5L32 13l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </MarkBase>
  );
}

/** Escrow vault — Funded */
export function FundedMark({ className, ...props }: MarkProps) {
  return (
    <MarkBase className={className} {...props}>
      <rect
        x="9"
        y="12"
        width="22"
        height="18"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M9 17.5h22"
        stroke="currentColor"
        strokeWidth="1.15"
      />
      <path
        d="M16 12V10.5a4 4 0 0 1 8 0V12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
      <circle cx="20" cy="24" r="2.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M20 26.25v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </MarkBase>
  );
}

/** Minted seal — Verified */
export function VerifiedMark({ className, ...props }: MarkProps) {
  return (
    <MarkBase className={className} {...props}>
      <path
        d="M20 6.5l3.1 2.2 3.7-.4.9 3.6 3.2 1.9-1.5 3.4 1.5 3.4-3.2 1.9-.9 3.6-3.7-.4L20 33.5l-3.1-2.2-3.7.4-.9-3.6-3.2-1.9 1.5-3.4-1.5-3.4 3.2-1.9.9-3.6 3.7.4L20 6.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 20.2l3 3.1 6.2-6.6"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </MarkBase>
  );
}
