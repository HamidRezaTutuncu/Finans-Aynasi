import primaryLogo from '@/assets/logos/prospekt-primary.png';
import horizontalLight from '@/assets/logos/prospekt-horizontal-light.png';
import horizontalDark from '@/assets/logos/prospekt-horizontal-dark.png';
import iconOnly from '@/assets/logos/prospekt-icon.png';

const LOGOS = {
  primary: primaryLogo,
  'horizontal-light': horizontalLight,
  'horizontal-dark': horizontalDark,
  icon: iconOnly,
};

const SIZES = {
  xs: 'h-6',     // 24px
  sm: 'h-8',     // 32px
  md: 'h-10',    // 40px
  lg: 'h-20',    // 80px
  xl: 'h-48',    // 192px
  hero: 'h-64',  // 256px
};

export default function Logo({ 
  variant = 'horizontal-light', 
  size = 'md', 
  className = '',
  onClick,
}) {
  return (
    <img
      src={LOGOS[variant]}
      alt="Prospekt - Mirror of Finance"
      className={`${SIZES[size]} w-auto object-contain ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    />
  );
}
