import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  gradient?: boolean;
  className?: string;
  delay?: number;
}

export function AnimatedCard({
  children,
  title,
  icon,
  gradient = false,
  className = '',
  delay = 0,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        className={`transition-all duration-300 hover:shadow-xl border border-gray-100 ${
          gradient ? 'bg-gradient-to-br from-white to-gray-50' : ''
        } ${className}`}
      >
        {title && (
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={title ? '' : 'pt-6'}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
