import { QRCodeSVG } from 'qrcode.react'

interface QRCodeGeneratorProps {
  value: string
  size?: number
}

const QRCodeGenerator = ({ value, size = 200 }: QRCodeGeneratorProps) => {
  return (
    <div style={{ display: 'inline-block' }}>
      <QRCodeSVG value={value} size={size} />
    </div>
  )
}

export default QRCodeGenerator

