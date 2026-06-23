import React from 'react';

interface FlagIconProps {
  country: 'FR' | 'GB';
  style?: React.CSSProperties;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ country, style }) => {
  const mergedStyle: React.CSSProperties = {
    display: 'inline-block',
    verticalAlign: 'middle',
    borderRadius: '2px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
    marginRight: '8px',
    flexShrink: 0,
    ...style,
  };

  if (country === 'FR') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 3 2"
        width="18"
        height="12"
        style={mergedStyle}
      >
        <rect width="1" height="2" fill="#002395" />
        <rect x="1" width="1" height="2" fill="#FFFFFF" />
        <rect x="2" width="1" height="2" fill="#ED2939" />
      </svg>
    );
  }

  if (country === 'GB') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 60 30"
        width="18"
        height="12"
        style={mergedStyle}
      >
        <clipPath id="gb-flag-clip">
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
        <path d="M0,0 v30 h60 v-30 z" fill="#00247d" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#gb-flag-clip)"
          stroke="#cf142b"
          stroke-width="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#cf142b" stroke-width="6" />
      </svg>
    );
  }

  return null;
};

export default FlagIcon;
