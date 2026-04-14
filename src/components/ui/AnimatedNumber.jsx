import { useState, useEffect, useRef } from 'react'

export default function AnimatedNumber({ value, duration = 800, formatter = v => v }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const start = prevRef.current
    const end = typeof value === 'number' ? value : 0
    const startTime = performance.now()

    function animate(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        prevRef.current = end
      }
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return <>{formatter(Math.round(display))}</>
}
