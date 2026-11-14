import React, { useEffect, useState } from 'react';
import { FINANCIAL_QUOTES, type Quote } from '../../utils/quotes';

interface Props {
  /** 'card' = phone home card with a pause button; 'inline' = one line of text (desktop header). */
  variant?: 'card' | 'inline';
  intervalMs?: number;
  pool?: Quote[];
}

/**
 * Finance quote that changes every few seconds with a soft fade.
 * Starts on today's quote, pauses while hovered/focused or while the tab is
 * hidden, and the card has a pause button (auto-changing text must be
 * pausable for people who read slowly). Screen readers aren't interrupted
 * by each change.
 */
const RotatingQuote: React.FC<Props> = ({ variant = 'inline', intervalMs = 5000, pool = FINANCIAL_QUOTES }) => {
  const [index, setIndex] = useState(() => Math.floor(Date.now() / 86_400_000) % pool.length);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || hovered) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % pool.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, hovered, intervalMs, pool.length]);

  const quote = pool[index];
  const hoverProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  if (variant === 'inline') {
    return (
      <p className="rq-inline" aria-live="off" {...hoverProps}>
        <span key={index} className="rq-fade">“{quote.text}” — {quote.author}</span>
      </p>
    );
  }

  return (
    <figure className="rq-card" aria-live="off" {...hoverProps}>
      <span className="rq-mark" aria-hidden="true">“</span>
      <div key={index} className="rq-fade rq-body">
        <blockquote>{quote.text}</blockquote>
        <figcaption>— {quote.author}</figcaption>
      </div>
      <div className="rq-foot">
        <span className="rq-dots" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((k) => <i key={k} className={index % 5 === k ? 'on' : ''} />)}
        </span>
        <button
          type="button"
          className="rq-pause"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Resume changing quotes' : 'Pause changing quotes'}
        >
          {paused ? '▶' : '❚❚'}
        </button>
      </div>
    </figure>
  );
};

export default RotatingQuote;
