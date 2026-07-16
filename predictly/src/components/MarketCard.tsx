'use client';

import Link from 'next/link';
import { formatNumber, priceToPercent, timeUntil, CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/utils';
import { Clock, BarChart2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Market {
  id: string;
  title: string;
  category: string;
  status: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  closeDate: string;
  resolution?: string | null;
}

// Detect football market type from title
function getFootballMeta(title: string): {
  isFootball: boolean;
  type: 'homewin' | 'draw' | 'btts' | 'over25' | 'awaywin' | null;
  homeTeam: string; awayTeam: string;
  homeFlag: string; awayFlag: string;
  league: string;
} {
  const btts    = title.includes('Both teams score');
  const over25  = title.includes('Over 2.5 goals');
  const draw    = title.includes('end in a Draw') || title.includes('Draw?');
  const homeWin = title.match(/Will (.+?) win vs (.+?)\?/);
  const emojis = Array.from(title).filter(ch => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp > 0x00FF;
  });

  if (!btts && !over25 && !draw && !homeWin) {
    return { isFootball: false, type: null, homeTeam: '', awayTeam: '', homeFlag: '', awayFlag: '', league: '' };
  }

  if (btts) {
    const m = title.match(/Both teams score: (.+?) vs (.+?)\?/);
    return {
      isFootball: true, type: 'btts',
      homeTeam: m?.[1] ?? '', awayTeam: m?.[2]?.split(' ')[0] ?? '',
      homeFlag: emojis[0] ?? '⚽', awayFlag: emojis[1] ?? '⚽', league: '',
    };
  }
  if (over25) {
    const m = title.match(/Over 2\.5 goals: (.+?) vs (.+?) /);
    return {
      isFootball: true, type: 'over25',
      homeTeam: m?.[1] ?? '', awayTeam: m?.[2] ?? '',
      homeFlag: emojis[0] ?? '⚽', awayFlag: emojis[1] ?? '⚽', league: '',
    };
  }
  if (draw) {
    const m = title.match(/Will (.+?) vs (.+?) end/);
    return {
      isFootball: true, type: 'draw',
      homeTeam: m?.[1] ?? '', awayTeam: m?.[2] ?? '',
      homeFlag: emojis[0] ?? '⚽', awayFlag: emojis[2] ?? '⚽', league: '',
    };
  }
  if (homeWin) {
    const isAway = title.includes('vs') && title.indexOf('win vs') > -1;
    return {
      isFootball: true, type: homeWin ? 'homewin' : 'awaywin',
      homeTeam: homeWin[1], awayTeam: homeWin[2]?.split('?')[0]?.trim() ?? '',
      homeFlag: emojis[0] ?? '⚽', awayFlag: emojis[2] ?? '⚽', league: '',
    };
  }
  return { isFootball: false, type: null, homeTeam: '', awayTeam: '', homeFlag: '', awayFlag: '', league: '' };
}

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  homewin: { label: 'Home Win',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'   },
  awaywin: { label: 'Away Win',   color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  draw:    { label: 'Draw',       color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  btts:    { label: 'BTTS',       color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  over25:  { label: 'Over 2.5',   color: 'bg-pink-500/20 text-pink-300 border-pink-500/30'   },
};

export default function MarketCard({ market }: { market: Market }) {
  const yesPct = priceToPercent(market.yesPrice);
  const isResolved = market.status === 'RESOLVED';
  const isClosed   = market.status === 'CLOSED';

  const fb = getFootballMeta(market.title);

  // Flash on price change
  const prevYes = useRef(market.yesPrice);
  const [flashYes, setFlashYes] = useState<'up'|'down'|null>(null);
  const [flashNo,  setFlashNo]  = useState<'up'|'down'|null>(null);

  useEffect(() => {
    if (prevYes.current === market.yesPrice) return;
    const dir = market.yesPrice > prevYes.current ? 'up' : 'down';
    setFlashYes(dir);
    setFlashNo(dir === 'up' ? 'down' : 'up');
    prevYes.current = market.yesPrice;
    const t = setTimeout(() => { setFlashYes(null); setFlashNo(null); }, 700);
    return () => clearTimeout(t);
  }, [market.yesPrice]);

  // Live countdown
  const [timeLeft, setTimeLeft] = useState(() => timeUntil(market.closeDate));
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(timeUntil(market.closeDate)), 1000);
    return () => clearInterval(t);
  }, [market.closeDate]);

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="card p-4 hover:border-gray-700 hover:bg-gray-900/80 transition-all cursor-pointer group h-full flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {fb.isFootball && fb.type ? (
              <span className={`badge border text-[10px] ${TYPE_LABEL[fb.type]?.color}`}>
                ⚽ {TYPE_LABEL[fb.type]?.label}
              </span>
            ) : (
              <span className={`badge border ${CATEGORY_COLORS[market.category] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                {CATEGORY_ICONS[market.category] || '📌'} {market.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {market.status === 'OPEN' && (
              <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />LIVE
              </span>
            )}
            {isResolved && <span className={`badge text-[10px] ${market.resolution === 'YES' ? 'yes-bg' : 'no-bg'}`}>Resolved {market.resolution}</span>}
            {isClosed && !isResolved && <span className="badge text-[10px] bg-gray-700 text-gray-400 border border-gray-600">Closed</span>}
          </div>
        </div>

        {/* ── Football match header ── */}
        {fb.isFootball && (fb.type === 'homewin' || fb.type === 'awaywin' || fb.type === 'draw') && (
          <div className="flex items-center justify-between gap-2 mb-3 bg-gray-800/50 rounded-xl px-3 py-2">
            <div className="text-center">
              <div className="text-xl mb-0.5">{fb.homeFlag}</div>
              <div className="text-xs font-bold text-white truncate max-w-[70px]">{fb.homeTeam}</div>
            </div>
            <div className="text-gray-600 font-bold text-sm">vs</div>
            <div className="text-center">
              <div className="text-xl mb-0.5">{fb.awayFlag}</div>
              <div className="text-xs font-bold text-white truncate max-w-[70px]">{fb.awayTeam}</div>
            </div>
          </div>
        )}

        {/* ── BTTS / Over 2.5 match header ── */}
        {fb.isFootball && (fb.type === 'btts' || fb.type === 'over25') && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">{fb.homeFlag}</span>
            <span className="text-xs text-gray-400 truncate">{fb.homeTeam}</span>
            <span className="text-gray-600 text-xs">vs</span>
            <span className="text-xs text-gray-400 truncate">{fb.awayTeam}</span>
            <span className="text-sm">{fb.awayFlag}</span>
          </div>
        )}

        {/* ── Title (non-football or fallback) ── */}
        {!fb.isFootball && (
          <h3 className="text-sm font-medium text-gray-100 leading-snug flex-1 group-hover:text-white mb-4">
            {market.title}
          </h3>
        )}

        {/* ── Football title ── */}
        {fb.isFootball && (
          <p className="text-xs text-gray-500 leading-snug flex-1 mb-3 line-clamp-2">
            {market.title}
          </p>
        )}

        {/* ── YES/NO price bar ── */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className={`font-bold transition-colors duration-300 ${
              flashYes === 'up' ? 'text-green-300' : flashYes === 'down' ? 'text-green-700' : 'text-green-400'
            }`}>YES {yesPct}¢</span>
            <span className={`font-bold transition-colors duration-300 ${
              flashNo === 'up' ? 'text-red-300' : flashNo === 'down' ? 'text-red-700' : 'text-red-400'
            }`}>NO {100 - yesPct}¢</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${yesPct}%` }} />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
          <div className="flex items-center gap-1">
            <BarChart2 size={11} />
            <span>{formatNumber(market.volume)} vol</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span className={timeLeft === 'Closed' ? 'text-red-500' : ''}>{timeLeft}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
