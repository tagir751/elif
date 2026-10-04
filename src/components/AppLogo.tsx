interface AppLogoProps {
  className?: string
}

export default function AppLogo({ className }: AppLogoProps) {
  return (
    <img
      src="/logotip.png"
      alt="Элиф"
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
