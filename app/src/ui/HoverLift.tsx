import { motion, useReducedMotion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'

// Shared hover-lift treatment for every boxed surface in the dashboard — KPI
// tiles, cards, fund cards, section buttons, legend rows, the data-check
// banner. Scale + a softened, more diffuse shadow, eased with a spring so it
// settles with a slight overshoot rather than linearly. NOT applied to table
// rows (scaling a <tr> breaks the table's grid layout) — see
// docs/DECISIONS.md "Hover-lift on every boxed element". `useReducedMotion`
// skips the animation entirely (not just shortens it) for anyone who's asked
// their OS for less motion.
const HOVER_TRANSITION = { type: 'spring', stiffness: 300, damping: 20, mass: 0.6 } as const
const HOVER_STATE = {
  scale: 1.05,
  boxShadow: '0 20px 40px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
}

export function HoverDiv({ children, ...rest }: HTMLMotionProps<'div'>) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div whileHover={reduceMotion ? undefined : HOVER_STATE} transition={HOVER_TRANSITION} {...rest}>
      {children}
    </motion.div>
  )
}

export function HoverArticle({ children, ...rest }: HTMLMotionProps<'article'>) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.article whileHover={reduceMotion ? undefined : HOVER_STATE} transition={HOVER_TRANSITION} {...rest}>
      {children}
    </motion.article>
  )
}

export function HoverButton({ children, ...rest }: HTMLMotionProps<'button'>) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.button whileHover={reduceMotion ? undefined : HOVER_STATE} transition={HOVER_TRANSITION} {...rest}>
      {children}
    </motion.button>
  )
}
