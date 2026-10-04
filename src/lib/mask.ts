export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || ''
  const visible = phone.slice(0, phone.length - 4)
  const masked = phone.slice(-4)
  return visible.replace(/\d/g, '*') + masked
}
