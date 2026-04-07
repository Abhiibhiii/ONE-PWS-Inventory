import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 450 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ONE - Outline Text */}
      <text
        x="10"
        y="72"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="64"
        fontWeight="800"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
        letterSpacing="-1"
      >
        ONE
      </text>

      {/* Red Chevron - Better matching the image */}
      <g transform="translate(185, 15)">
        {/* Shadow/Depth part */}
        <path
          d="M0 0 L45 35 L0 70 L15 35 Z"
          fill="#991B1B"
          opacity="0.4"
        />
        {/* Main Chevron */}
        <path
          d="M0 0 L55 35 L0 70 L20 35 Z"
          fill="#EF4444"
        />
      </g>

      {/* PWS - Outline Text */}
      <text
        x="275"
        y="72"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="64"
        fontWeight="800"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
        letterSpacing="-1"
      >
        PWS
      </text>
    </svg>
  );
};
