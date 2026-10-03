import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg'

// Ícones de traço copiados do protótipo (mesmos desenhos, 24x24).
// São decorativos: o nome para o leitor de tela fica no controle que os contém.

export type IconName =
  | 'home'
  | 'book'
  | 'people'
  | 'church'
  | 'user'
  | 'chat'
  | 'bell'
  | 'calendarCheck'
  | 'chevronLeft'
  | 'chevronRight'
  | 'volume'
  | 'pen'
  | 'music'
  | 'external'
  | 'mic'
  | 'stop'
  | 'play'
  | 'pause'
  | 'close'
  | 'check'
  | 'phone'
  | 'mail'
  | 'eye'
  | 'hand'
  | 'captions'
  | 'type'
  | 'contrast'
  | 'camera'
  | 'image'
  | 'trash'
  | 'search'
  | 'clock'
  | 'heart'
  | 'lock'
  | 'info'
  | 'alert'
  | 'plus'
  | 'chevronDown'
  | 'qr'
  | 'sun'
  | 'moon'
  | 'cup'
  | 'file'
  | 'video'
  | 'flag'
  | 'edit'

interface Props {
  name: IconName
  size?: number
  color: string
  strokeWidth?: number
}

export function Icon({ name, size = 20, color, strokeWidth = 2 }: Props) {
  const common = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false} importantForAccessibility="no-hide-descendants">
      {paths(name, common, color)}
    </Svg>
  )
}

function paths(name: IconName, s: Record<string, unknown>, color: string) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...s} />
          <Polyline points="9 22 9 12 15 12 15 22" {...s} />
        </>
      )
    case 'book':
      return (
        <>
          <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" {...s} />
          <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...s} />
        </>
      )
    case 'people':
      return (
        <>
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s} />
          <Circle cx="9" cy="7" r="4" {...s} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...s} />
        </>
      )
    case 'church':
      return (
        <>
          <Polyline points="3 10 12 3 21 10" {...s} />
          <Rect x="5" y="10" width="14" height="11" rx="1" {...s} />
          <Line x1="12" y1="3" x2="12" y2="6" {...s} />
          <Rect x="9.5" y="15" width="5" height="6" rx="0.5" {...s} />
        </>
      )
    case 'user':
      return (
        <>
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...s} />
          <Circle cx="12" cy="7" r="4" {...s} />
        </>
      )
    case 'chat':
      return <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...s} />
    case 'bell':
      return (
        <>
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...s} />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...s} />
        </>
      )
    case 'calendarCheck':
      return (
        <>
          <Rect x="3" y="4" width="18" height="18" rx="2" {...s} />
          <Line x1="16" y1="2" x2="16" y2="6" {...s} />
          <Line x1="8" y1="2" x2="8" y2="6" {...s} />
          <Line x1="3" y1="10" x2="21" y2="10" {...s} />
          <Polyline points="9 16 11 18 15 14" {...s} />
        </>
      )
    case 'chevronLeft':
      return <Polyline points="15 18 9 12 15 6" {...s} />
    case 'chevronRight':
      return <Polyline points="9 18 15 12 9 6" {...s} />
    case 'volume':
      return (
        <>
          <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" {...s} />
          <Path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" {...s} />
        </>
      )
    case 'pen':
      return (
        <>
          <Path d="M12 20h9" {...s} />
          <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" {...s} />
        </>
      )
    case 'music':
      return (
        <>
          <Path d="M9 18V5l12-2v13" {...s} />
          <Circle cx="6" cy="18" r="3" {...s} />
          <Circle cx="18" cy="16" r="3" {...s} />
        </>
      )
    case 'external':
      return (
        <>
          <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" {...s} />
          <Polyline points="15 3 21 3 21 9" {...s} />
          <Line x1="10" y1="14" x2="21" y2="3" {...s} />
        </>
      )
    case 'mic':
      return (
        <>
          <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" {...s} />
          <Path d="M19 10v2a7 7 0 0 1-14 0v-2" {...s} />
          <Line x1="12" y1="19" x2="12" y2="23" {...s} />
          <Line x1="8" y1="23" x2="16" y2="23" {...s} />
        </>
      )
    case 'stop':
      return <Rect x="6" y="6" width="12" height="12" rx="2" fill={color} stroke="none" />
    case 'play':
      return <Polygon points="5 3 19 12 5 21 5 3" fill={color} stroke="none" />
    case 'pause':
      return (
        <>
          <Rect x="6" y="4" width="4" height="16" rx="1" fill={color} stroke="none" />
          <Rect x="14" y="4" width="4" height="16" rx="1" fill={color} stroke="none" />
        </>
      )
    case 'close':
      return (
        <>
          <Line x1="18" y1="6" x2="6" y2="18" {...s} />
          <Line x1="6" y1="6" x2="18" y2="18" {...s} />
        </>
      )
    case 'check':
      return <Polyline points="20 6 9 17 4 12" {...s} />
    case 'phone':
      return <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.17 6.17l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" {...s} />
    case 'mail':
      return (
        <>
          <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" {...s} />
          <Polyline points="22,6 12,13 2,6" {...s} />
        </>
      )
    case 'eye':
      return (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...s} />
          <Circle cx="12" cy="12" r="3" {...s} />
        </>
      )
    case 'hand':
      return (
        <>
          <Path d="M18 11V6a2 2 0 0 0-4 0v5" {...s} />
          <Path d="M14 10V4a2 2 0 0 0-4 0v6" {...s} />
          <Path d="M10 10.5V6a2 2 0 0 0-4 0v8" {...s} />
          <Path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" {...s} />
        </>
      )
    case 'captions':
      return (
        <>
          <Rect x="2" y="5" width="20" height="14" rx="2" {...s} />
          <Path d="M7 15h4M15 15h2M7 11h2M13 11h4" {...s} />
        </>
      )
    case 'type':
      return (
        <>
          <Polyline points="4 7 4 4 20 4 20 7" {...s} />
          <Line x1="9" y1="20" x2="15" y2="20" {...s} />
          <Line x1="12" y1="4" x2="12" y2="20" {...s} />
        </>
      )
    case 'contrast':
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Path d="M12 2a10 10 0 0 1 0 20z" fill={color} stroke="none" />
        </>
      )
    case 'camera':
      return (
        <>
          <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" {...s} />
          <Circle cx="12" cy="13" r="4" {...s} />
        </>
      )
    case 'image':
      return (
        <>
          <Rect x="3" y="3" width="18" height="18" rx="2" {...s} />
          <Circle cx="8.5" cy="8.5" r="1.5" {...s} />
          <Polyline points="21 15 16 10 5 21" {...s} />
        </>
      )
    case 'trash':
      return (
        <>
          <Polyline points="3 6 5 6 21 6" {...s} />
          <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" {...s} />
          <Path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...s} />
        </>
      )
    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="8" {...s} />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" {...s} />
        </>
      )
    case 'clock':
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Polyline points="12 6 12 12 16 14" {...s} />
        </>
      )
    case 'heart':
      return <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...s} />
    case 'lock':
      return (
        <>
          <Rect x="3" y="11" width="18" height="11" rx="2" {...s} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" {...s} />
        </>
      )
    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Line x1="12" y1="16" x2="12" y2="12" {...s} />
          <Line x1="12" y1="8" x2="12.01" y2="8" {...s} />
        </>
      )
    case 'alert':
      return (
        <>
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...s} />
          <Line x1="12" y1="9" x2="12" y2="13" {...s} />
          <Line x1="12" y1="17" x2="12.01" y2="17" {...s} />
        </>
      )
    case 'plus':
      return (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...s} />
          <Line x1="5" y1="12" x2="19" y2="12" {...s} />
        </>
      )
    case 'chevronDown':
      return <Polyline points="6 9 12 15 18 9" {...s} />
    case 'qr':
      return (
        <>
          <Rect x="3" y="3" width="7" height="7" rx="1" {...s} />
          <Rect x="14" y="3" width="7" height="7" rx="1" {...s} />
          <Rect x="3" y="14" width="7" height="7" rx="1" {...s} />
          <Path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 19h2M19 14h2" {...s} />
        </>
      )
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="5" {...s} />
          <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" {...s} />
        </>
      )
    case 'moon':
      return <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...s} />
    case 'cup':
      return (
        <>
          <Path d="M18 8h1a4 4 0 0 1 0 8h-1" {...s} />
          <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" {...s} />
          <Path d="M6 1v3M10 1v3M14 1v3" {...s} />
        </>
      )
    case 'file':
      return (
        <>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s} />
          <Polyline points="14 2 14 8 20 8" {...s} />
        </>
      )
    case 'video':
      return (
        <>
          <Path d="M23 7l-7 5 7 5V7z" {...s} />
          <Rect x="1" y="5" width="15" height="14" rx="2" {...s} />
        </>
      )
    case 'flag':
      return (
        <>
          <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" {...s} />
          <Line x1="4" y1="22" x2="4" y2="15" {...s} />
        </>
      )
    case 'edit':
      return (
        <>
          <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...s} />
          <Path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...s} />
        </>
      )
  }
}
