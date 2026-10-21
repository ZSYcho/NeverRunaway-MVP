/**
 * EIP-6963 requires wallet icons to be data URIs. Anything else (say, a tracking URL from a rogue
 * extension) falls back to a monogram, and icons are only ever rendered as <img src>, never markup.
 */
export function WalletAvatar({
  name,
  icon,
  size = 'md',
}: {
  name: string
  icon?: string
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm' ? 'size-6 rounded-lg text-[10px]' : 'size-9 rounded-xl text-sm'
  if (icon?.startsWith('data:image/')) {
    return <img src={icon} alt="" className={`${box} shrink-0`} />
  }
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center bg-slate-700 font-semibold text-slate-200`}
    >
      {monogram(name)}
    </span>
  )
}

function monogram(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1 ? words.slice(0, 2).map((word) => word[0]) : [...name.slice(0, 2)]
  return letters.join('').toUpperCase()
}
