'use client'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback } from 'react'

interface Props {
  url: string
  size?: number
}

export default function QRCodeDisplay({ url, size = 200 }: Props) {
  const download = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const svgEl = document.querySelector('#qr-svg svg') as SVGSVGElement
    if (!svgEl) return
    const data = new XMLSerializer().serializeToString(svgEl)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const a = document.createElement('a')
      a.download = 'tournament-qr.png'
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
  }, [size, url])

  return (
    <div className="flex flex-col items-center gap-3">
      <div id="qr-svg">
        <QRCodeSVG value={url} size={size} />
      </div>
      <button
        onClick={download}
        className="text-sm text-blue-600 underline"
      >
        PNG 다운로드
      </button>
    </div>
  )
}
