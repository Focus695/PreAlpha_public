import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Bow / Wings */}
      <path
        d="M4 22C4 12 10 4 16 4C22 4 28 12 28 22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-txt-muted/50" // Traditional path (faded)
      />
      
      {/* Arrow / Central Path (PreAlpha Way) */}
      <path
        d="M16 28V4"
        stroke="currentColor" // Will inherit brand color usually
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10L16 4L22 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

