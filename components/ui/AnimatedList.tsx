'use client';

import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

export interface AnimatedListProps {
  children: ReactNode;
  staggerDelay?: number;
  animation?: 'fade-in' | 'fade-in-up' | 'fade-in-scale';
  className?: string;
}

export function AnimatedList({
  children,
  staggerDelay = 50,
  animation = 'fade-in-up',
  className = '',
}: AnimatedListProps) {
  const animationClass = {
    'fade-in': 'animate-fade-in',
    'fade-in-up': 'animate-fade-in-up',
    'fade-in-scale': 'animate-fade-in-scale',
  }[animation];

  return (
    <div className={className}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        return (
          <div
            key={index}
            className={`${animationClass} opacity-0`}
            style={{
              animationDelay: `${index * staggerDelay}ms`,
              animationFillMode: 'forwards',
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

export interface AnimatedListItemProps {
  children: ReactNode;
  index?: number;
  delay?: number;
  animation?: 'fade-in' | 'fade-in-up' | 'fade-in-scale';
  className?: string;
}

export function AnimatedListItem({
  children,
  index = 0,
  delay = 50,
  animation = 'fade-in-up',
  className = '',
}: AnimatedListItemProps) {
  const animationClass = {
    'fade-in': 'animate-fade-in',
    'fade-in-up': 'animate-fade-in-up',
    'fade-in-scale': 'animate-fade-in-scale',
  }[animation];

  return (
    <div
      className={`${animationClass} opacity-0 ${className}`}
      style={{
        animationDelay: `${index * delay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {children}
    </div>
  );
}

export default AnimatedList;
