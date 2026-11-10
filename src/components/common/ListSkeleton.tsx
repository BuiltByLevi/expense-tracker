import React from 'react';

interface ListSkeletonProps {
  rows?: number;
}

/**
 * Shimmer placeholder shown while transactions load — mimics the shape of a
 * transaction row (date / badge / description / amount) so the layout doesn't
 * jump when real data arrives, instead of a bare "Loading..." string.
 */
const ListSkeleton: React.FC<ListSkeletonProps> = ({ rows = 5 }) => (
  <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="skeleton" style={{ width: '56px', height: '14px', flexShrink: 0 }} />
        <div className="skeleton" style={{ width: '90px', height: '22px', borderRadius: '999px', flexShrink: 0 }} />
        <div className="skeleton" style={{ flex: 1, height: '14px' }} />
        <div className="skeleton" style={{ width: '72px', height: '16px', flexShrink: 0 }} />
      </div>
    ))}
  </div>
);

export default ListSkeleton;
