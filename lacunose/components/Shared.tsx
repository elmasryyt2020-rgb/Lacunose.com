import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { RGF } from '../constants/theme';

export function Icon({ name, size = 20, color = '#0E0E0C', stroke = 1.6 }: { name: string, size?: number, color?: string, stroke?: number }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as any, strokeLinejoin: 'round' as any };
  let paths = null;
  switch (name) {
    case 'search': paths = <><Circle cx="10" cy="10" r="6" {...p}/><Path d="M15 15l4 4" {...p}/></>; break;
    case 'plus': paths = <><Path d="M12 5v14M5 12h14" {...p}/></>; break;
    case 'bell': paths = <><Path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16z" {...p}/><Path d="M10 20a2 2 0 004 0" {...p}/></>; break;
    case 'home': paths = <><Path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" {...p}/></>; break;
    case 'grid': paths = <><Rect x="4" y="4" width="7" height="7" rx="1.5" {...p}/><Rect x="13" y="4" width="7" height="7" rx="1.5" {...p}/><Rect x="4" y="13" width="7" height="7" rx="1.5" {...p}/><Rect x="13" y="13" width="7" height="7" rx="1.5" {...p}/></>; break;
    case 'person': paths = <><Circle cx="12" cy="8" r="4" {...p}/><Path d="M4 21c0-4 4-7 8-7s8 3 8 7" {...p}/></>; break;
    case 'book': paths = <><Path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" {...p}/><Path d="M5 4v13a3 3 0 003 3" {...p}/></>; break;
    case 'chart': paths = <><Path d="M4 20V8m6 12V4m6 16v-8" {...p}/></>; break;
    case 'flask': paths = <><Path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" {...p}/></>; break;
    case 'globe': paths = <><Circle cx="12" cy="12" r="8" {...p}/><Path d="M4 12h16M12 4c2.5 3 2.5 13 0 16M12 4c-2.5 3-2.5 13 0 16" {...p}/></>; break;
    case 'sparkle': paths = <><Path d="M12 4l1.8 4.7L18 10l-4.2 1.3L12 16l-1.8-4.7L6 10l4.2-1.3L12 4z" {...p}/></>; break;
    case 'clock': paths = <><Circle cx="12" cy="12" r="8" {...p}/><Path d="M12 8v4l3 2" {...p}/></>; break;
    case 'target': paths = <><Circle cx="12" cy="12" r="8" {...p}/><Circle cx="12" cy="12" r="4" {...p}/><Circle cx="12" cy="12" r="1" {...p}/></>; break;
    case 'quote': paths = <><Path d="M7 8h3v4a3 3 0 01-3 3M14 8h3v4a3 3 0 01-3 3" {...p}/></>; break;
    case 'arrow': paths = <><Path d="M5 12h14M13 6l6 6-6 6" {...p}/></>; break;
    case 'chevR': paths = <><Path d="M9 5l7 7-7 7" {...p}/></>; break;
    case 'chevD': paths = <><Path d="M5 9l7 7 7-7" {...p}/></>; break;
    case 'chevU': paths = <><Path d="M5 15l7-7 7 7" {...p}/></>; break;
    case 'close': paths = <><Path d="M6 6l12 12M18 6L6 18" {...p}/></>; break;
    case 'check': paths = <><Path d="M5 13l4 4L19 7" {...p}/></>; break;
    case 'filter': paths = <><Path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" {...p}/></>; break;
    case 'download': paths = <><Path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" {...p}/></>; break;
    case 'share': paths = <><Circle cx="6" cy="12" r="2.5" {...p}/><Circle cx="18" cy="6" r="2.5" {...p}/><Circle cx="18" cy="18" r="2.5" {...p}/><Path d="M8 11l8-4M8 13l8 4" {...p}/></>; break;
    case 'bookmark': paths = <><Path d="M6 4h12v17l-6-4-6 4V4z" {...p}/></>; break;
    case 'link': paths = <><Path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" {...p}/></>; break;
    case 'spark': paths = <><Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" {...p}/></>; break;
    case 'dna': paths = <><Path d="M6 4c0 4 12 4 12 8s-12 4-12 8M18 4c0 4-12 4-12 8s12 4 12 8" {...p}/><Path d="M8 6h8M8 18h8M9 9h6M9 15h6" {...p}/></>; break;
    case 'microscope': paths = <><Path d="M9 3h4v2h-4zM10 5l-3 8h6l-3-8zM5 20h14M8 20l1-3h6l1 3" {...p}/></>; break;
    case 'note': paths = <><Path d="M5 4h10l4 4v12H5V4zM15 4v4h4" {...p}/><Path d="M8 12h8M8 16h6" {...p}/></>; break;
    case 'mic': paths = <><Rect x="9" y="3" width="6" height="11" rx="3" {...p}/><Path d="M5 11a7 7 0 0014 0M12 18v3" {...p}/></>; break;
    case 'bolt': paths = <><Path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" {...p}/></>; break;
    case 'layers': paths = <><Path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" {...p}/></>; break;
    case 'settings': paths = <><Circle cx="12" cy="12" r="3" {...p}/><Path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" {...p}/></>; break;
    case 'paperclip': paths = <><Path d="M20 11l-8 8a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8" {...p}/></>; break;
    case 'upload': paths = <><Path d="M12 20V8m0 0l-5 5m5-5l5 5M5 4h14" {...p}/></>; break;
    case 'gap': paths = <><Path d="M4 12h5M15 12h5" {...p}/><Circle cx="12" cy="12" r="3" {...p}/></>; break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths}
    </Svg>
  );
}

export function BlackPill({ children, size = 52, style = {} }: { children: React.ReactNode, size?: number, style?: ViewStyle }) {
  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: RGF.ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }, style]}>
      {children}
    </View>
  );
}

export function ChipIcon({ name, size = 44, iconSize = 20, bg = '#fff', color = RGF.ink }: { name: string, size?: number, iconSize?: number, bg?: string, color?: string }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: 14,
      backgroundColor: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: bg === '#fff' ? 1 : 0,
      borderColor: RGF.hair,
    }}>
      <Icon name={name} size={iconSize} color={color} />
    </View>
  );
}

export function ScoreDial({ value = 7, max = 10, label = 'Novelty', color = RGF.ink, size = 44 }: { value?: number, max?: number, label?: string, color?: string, size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const pct = value / max;
  return (
    <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={RGF.hair} strokeWidth="3" fill="none" />
        <Circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth="3" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <SvgText x="50%" y="54%" textAnchor="middle" alignmentBaseline="middle"
          fontFamily={RGF.sansSemiBold} fontSize="13" fill={RGF.ink}>
          {value}
        </SvgText>
      </Svg>
      <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

export function CategoryPill({ kind }: { kind: string }) {
  const map: Record<string, { bg: string, label: string }> = {
    'future-work': { bg: RGF.sky, label: 'Future work' },
    'methodology': { bg: RGF.mint, label: 'Methodology' },
    'pico': { bg: RGF.lavender, label: 'PICO' },
    'llm': { bg: RGF.butter, label: 'AI synthesis' },
    'geography': { bg: RGF.peach, label: 'Geography' },
    'population': { bg: RGF.rose, label: 'Population' },
  };
  const c = map[kind] || map['methodology'];
  return (
    <View style={{
      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
      backgroundColor: c.bg,
    }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: RGF.ink, opacity: 0.6 }} />
      <Text style={{
        fontFamily: RGF.sansMedium, fontSize: 12,
        color: RGF.ink, letterSpacing: -0.1,
      }}>
        {c.label}
      </Text>
    </View>
  );
}
