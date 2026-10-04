interface ChipProps {
  label: string
  variant: 'green' | 'red' | 'orange' | 'blue' | 'yellow'
}

const variants = {
  green: 'chip-green',
  red: 'chip-red',
  orange: 'chip-orange',
  blue: 'chip bg-blue/10 text-blue',
  yellow: 'chip bg-yellow/10 text-yellow',
}

export default function Chip({ label, variant }: ChipProps) {
  return <span className={variants[variant]}>{label}</span>
}
