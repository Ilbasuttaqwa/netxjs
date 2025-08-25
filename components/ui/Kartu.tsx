import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  animate?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  animate = false,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return 'bg-white/90 backdrop-blur-md border-2 border-white/30 shadow-glow';
      case 'elevated':
        return 'bg-white shadow-4xl border-2 border-slate-100';
      case 'outlined':
        return 'bg-white border-2 border-violet-200 hover:border-violet-300 transition-colors duration-300';
      default:
        return 'bg-white shadow-medium border-2 border-slate-200 hover:border-slate-300 transition-all duration-300';
    }
  };

  const getPaddingClasses = () => {
    switch (padding) {
      case 'none':
        return '';
      case 'sm':
        return 'p-4';
      case 'md':
        return 'p-6';
      case 'lg':
        return 'p-8';
      default:
        return 'p-6';
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-200',
        getVariantClasses(),
        getPaddingClasses(),
        hover && 'hover:shadow-glow hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 cursor-pointer',
        animate && 'animate-fadeIn hover:animate-float',
        className
      )}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('border-b-2 border-slate-200 pb-6 mb-6 bg-gradient-to-r from-violet-50/50 to-indigo-50/50 -mx-6 px-6 pt-6 rounded-t-2xl', className)}>
      {children}
    </div>
  );
};

const CardBody: React.FC<CardBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('flex-1', className)}>
      {children}
    </div>
  );
};

const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('border-t border-gray-200 pt-4 mt-4', className)}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
