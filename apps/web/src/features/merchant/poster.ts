// A 3:4 portrait poster, large enough to print at A5 and still scan from across a counter.
const WIDTH = 1080
const HEIGHT = 1440
const QR_SIZE = 720

// The app's font stacks (index.css). CJK text falls through to a system font.
const DISPLAY_FONT = '"Outfit Variable", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const SANS_FONT = '"Inter Variable", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export type PosterText = { heading: string; hint: string; footer: string }

/**
 * Draws a printable poster around the on-screen QR code. The code is an SVG, so it is rasterized at
 * poster size rather than scaled up from screen pixels, and its modules stay sharp.
 */
export async function renderPoster(qr: SVGSVGElement, text: PosterText): Promise<Blob> {
  const svg = qr.cloneNode(true) as SVGSVGElement
  svg.setAttribute('width', String(QR_SIZE))
  svg.setAttribute('height', String(QR_SIZE))
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`

  const fonts = {
    heading: `700 96px ${DISPLAY_FONT}`,
    hint: `500 38px ${SANS_FONT}`,
    footer: `400 30px ${MONO_FONT}`,
  }
  // Canvas text only uses fonts that are already loaded.
  await Promise.all([
    image.decode(),
    ...Object.values(fonts).map((font) => document.fonts.load(font)),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.fillStyle = '#0f172a'
  context.font = fonts.heading
  context.fillText(text.heading, WIDTH / 2, 170)

  context.drawImage(image, (WIDTH - QR_SIZE) / 2, 300, QR_SIZE, QR_SIZE)

  context.fillStyle = '#334155'
  context.font = fonts.hint
  wrapLines(context, text.hint, WIDTH - 160).forEach((line, index) => {
    context.fillText(line, WIDTH / 2, 1110 + index * 56)
  })

  context.fillStyle = '#64748b'
  context.font = fonts.footer
  context.fillText(text.footer, WIDTH / 2, HEIGHT - 100)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))),
      'image/png',
    )
  })
}

/** Breaks text into lines that fit `maxWidth`: between words, and between characters in CJK. */
function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)) {
    const next = line + segment
    if (line !== '' && context.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd())
      line = segment.trimStart()
    } else {
      line = next
    }
  }
  if (line !== '') lines.push(line.trimEnd())
  return lines
}
