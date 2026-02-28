'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Section } from '@/components/layout/section';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/ui';
import { Search, Palette, Code, Rocket, HeartHandshake } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

const steps = [
  { key: 'discovery', Icon: Search, color: 'var(--accent-teal)', hex: '#459b98' },
  { key: 'design', Icon: Palette, color: 'var(--accent-gold)', hex: '#c59a3f' },
  { key: 'build', Icon: Code, color: 'var(--territory-db)', hex: '#5b8fb9' },
  { key: 'launch', Icon: Rocket, color: 'var(--territory-auto)', hex: '#8b7ec8' },
  { key: 'support', Icon: HeartHandshake, color: 'var(--territory-pro)', hex: '#5ea88e' },
] as const;

const CYCLE_INTERVAL = 3000;

export function ProcessTimeline() {
  const t = useTranslations('exploration_page.process');
  const prefersReducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, CYCLE_INTERVAL);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!isPaused) startCycling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, prefersReducedMotion, startCycling]);

  const handleMouseEnter = (index: number) => {
    setIsPaused(true);
    setActiveStep(index);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] as const },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 200, damping: 15 },
    },
  };

  return (
    <Section>
      <Container>
        <SectionHeading
          overline={t('overline')}
          heading={t('heading')}
          sub={t('sub')}
          centered
        />

        {/* Desktop: horizontal timeline */}
        <div className="mt-12 hidden lg:block">
          <div className="relative">
            {/* Background connecting line */}
            <div
              className="absolute left-[10%] right-[10%] top-12 h-[2px] bg-border-default"
              aria-hidden="true"
            />

            {/* Animated gradient connecting line */}
            {!prefersReducedMotion && (
              <motion.div
                className="absolute left-[10%] top-12 h-[2px] origin-left"
                style={{
                  width: '80%',
                  background: `linear-gradient(to right, ${steps[0].hex}, ${steps[2].hex}, ${steps[4].hex})`,
                }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 2, ease: 'easeInOut', delay: 0.5 }}
                aria-hidden="true"
              />
            )}

            <motion.div
              className="relative flex justify-between"
              variants={!prefersReducedMotion ? containerVariants : undefined}
              initial={!prefersReducedMotion ? 'hidden' : undefined}
              whileInView={!prefersReducedMotion ? 'visible' : undefined}
              viewport={{ once: true, margin: '-50px' }}
            >
              {steps.map(({ key, Icon, color, hex }, i) => {
                const isActive = activeStep === i;
                return (
                  <motion.div
                    key={key}
                    className="relative flex w-[18%] flex-col items-center text-center cursor-pointer"
                    variants={!prefersReducedMotion ? itemVariants : undefined}
                    onMouseEnter={() => handleMouseEnter(i)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Icon circle */}
                    <motion.div
                      className="relative z-10 mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 bg-bg-primary"
                      style={{ borderColor: color }}
                      variants={!prefersReducedMotion ? iconVariants : undefined}
                      animate={
                        !prefersReducedMotion
                          ? {
                              scale: isActive ? 1.1 : 1,
                              boxShadow: isActive
                                ? `0 0 24px rgba(${hexToRgb(hex)}, 0.4)`
                                : `0 0 0px rgba(${hexToRgb(hex)}, 0)`,
                              backgroundColor: isActive
                                ? `rgba(${hexToRgb(hex)}, 0.1)`
                                : 'rgba(0,0,0,0)',
                            }
                          : undefined
                      }
                      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                      whileHover={!prefersReducedMotion ? { rotate: 5 } : undefined}
                      whileTap={!prefersReducedMotion ? { scale: 0.95 } : undefined}
                    >
                      <Icon
                        className="transition-transform duration-500"
                        size={32}
                        style={{ color }}
                        strokeWidth={1.5}
                      />

                      {/* Pulse ring */}
                      {!prefersReducedMotion && (
                        <motion.div
                          className="absolute inset-0 rounded-full border"
                          style={{ borderColor: color }}
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0, 0.2, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            repeatDelay: 2,
                            delay: i * 0.4 + 2,
                          }}
                        />
                      )}
                    </motion.div>

                    {/* Step number */}
                    <motion.span
                      className="mb-1.5 text-sm font-semibold tracking-widest"
                      style={{ color }}
                      animate={
                        !prefersReducedMotion
                          ? { opacity: isActive ? 1 : 0.7 }
                          : undefined
                      }
                      transition={{ duration: 0.3 }}
                    >
                      0{i + 1}
                    </motion.span>

                    {/* Title */}
                    <motion.h3
                      className="mb-2 font-serif text-lg text-fg-primary"
                      animate={
                        !prefersReducedMotion
                          ? {
                              color: isActive ? `${hex}` : undefined,
                              scale: isActive ? 1.05 : 1,
                            }
                          : undefined
                      }
                      transition={{ duration: 0.3 }}
                    >
                      {t(`steps.${key}.title`)}
                    </motion.h3>

                    {/* Description */}
                    <motion.p
                      className="text-xs leading-relaxed text-fg-secondary"
                      animate={
                        !prefersReducedMotion
                          ? { opacity: isActive ? 1 : 0.7 }
                          : undefined
                      }
                      transition={{ duration: 0.3 }}
                    >
                      {t(`steps.${key}.description`)}
                    </motion.p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Mobile/Tablet: vertical timeline */}
        <div className="mt-12 lg:hidden">
          <div className="relative pl-10">
            {/* Vertical connecting line */}
            <div
              className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-border-default"
              aria-hidden="true"
            />

            <motion.div
              className="flex flex-col gap-8"
              variants={!prefersReducedMotion ? containerVariants : undefined}
              initial={!prefersReducedMotion ? 'hidden' : undefined}
              whileInView={!prefersReducedMotion ? 'visible' : undefined}
              viewport={{ once: true, margin: '-30px' }}
            >
              {steps.map(({ key, Icon, color, hex }, i) => (
                <motion.div
                  key={key}
                  className="relative flex gap-4"
                  variants={!prefersReducedMotion ? itemVariants : undefined}
                >
                  {/* Step circle */}
                  <motion.div
                    className="absolute -left-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 bg-bg-primary"
                    style={{ borderColor: color, top: '2px' }}
                    variants={!prefersReducedMotion ? iconVariants : undefined}
                  >
                    <Icon size={14} style={{ color }} />

                    {/* Mobile pulse ring */}
                    {!prefersReducedMotion && (
                      <motion.div
                        className="absolute inset-0 rounded-full border"
                        style={{ borderColor: color }}
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0, 0.2, 0],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatDelay: 3,
                          delay: i * 0.6 + 2,
                        }}
                      />
                    )}
                  </motion.div>

                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color }}>
                        0{i + 1}
                      </span>
                      <h3 className="font-serif text-base text-fg-primary">
                        {t(`steps.${key}.title`)}
                      </h3>
                    </div>
                    <p className="text-sm text-fg-secondary leading-relaxed">
                      {t(`steps.${key}.description`)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
