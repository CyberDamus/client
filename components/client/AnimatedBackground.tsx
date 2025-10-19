"use client"

import React from 'react'
import { SparklesCore } from '@/components/ui/sparkles'

/**
 * Memoized animated background component
 * Prevents re-renders when parent component updates
 * Fixes textarea input lag and animation flickering
 */
const AnimatedBackground = React.memo(() => {
  return (
    <>
      {/* Simple gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-cyber-bg via-purple-950/20 to-cyber-bg" />

      {/* Sparkles - only stars, no blob */}
      <SparklesCore
        id="tsparticles-home"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={100}
        className="fixed inset-0 z-0"
        particleColor="#8b5cf6"
      />
    </>
  )
})

AnimatedBackground.displayName = 'AnimatedBackground'

export default AnimatedBackground
