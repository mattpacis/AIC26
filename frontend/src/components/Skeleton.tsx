import type { ReactNode } from 'react';
import './Skeleton.css';

type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
};

export function Skeleton({
  className = '',
  width = '100%',
  height = 14,
  rounded = false,
}: SkeletonProps) {
  return (
    <span
      className={`c360-skeleton${rounded ? ' c360-skeleton--rounded' : ''} ${className}`.trim()}
      style={{ width, height }}
      aria-hidden
    />
  );
}

export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="c360-skeleton-block">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '72%' : '100%'}
          height={index === 0 ? 18 : 12}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ children }: { children?: ReactNode }) {
  return <div className="c360-skeleton-card">{children ?? <SkeletonBlock />}</div>;
}
