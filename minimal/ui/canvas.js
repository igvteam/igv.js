/**
 * Canvas utilities for high-DPI rendering
 */

/**
 * Create a canvas element with proper scaling for high-DPI displays
 */
export function createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    const dpr = window.devicePixelRatio || 1
    
    // Set display size (CSS pixels)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    
    // Set actual size in memory (scaled for high-DPI)
    canvas.width = width * dpr
    canvas.height = height * dpr
    
    // Scale the context to match device pixel ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    
    return canvas
}

/**
 * Clear the entire canvas
 */
export function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
}

/**
 * Get 2D context from canvas
 */
export function getContext(canvas) {
    return canvas.getContext('2d')
}

