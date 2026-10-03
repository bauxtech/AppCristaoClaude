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
  }
}
