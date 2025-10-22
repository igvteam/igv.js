/**
 * Canvas utilities for high-DPI rendering
 * 
 * OVERVIEW:
 * This module ensures crisp, pixel-perfect rendering on Retina and high-DPI displays.
 * Without HiDPI support, canvas content appears blurry on high-resolution screens.
 * 
 * HOW IT WORKS:
 * 1. Detects the device pixel ratio (DPR) - typically 1 for standard, 2-3 for Retina
 * 2. Scales canvas memory size by DPR (e.g., 1000px CSS → 2000px memory on 2x display)
 * 3. Applies ctx.scale(dpr, dpr) so all draw calls continue to use CSS pixel coordinates
 * 4. Sets CSS size to match the visual size (so the canvas doesn't appear huge)
 * 
 * IMPORTANT:
 * - Setting canvas.width or canvas.height RESETS the context, clearing the scale transform
 * - Always call createCanvas() to get a fresh canvas with proper DPR scaling
 * - Use getCanvasDimensions() to get CSS pixel dimensions for rendering logic
 * - All renderer code uses CSS pixels; the context transformation handles the scaling
 * 
 * EXAMPLE:
 * ```javascript
 * const canvas = createCanvas(800, 100)  // CSS pixels
 * const ctx = canvas.getContext('2d')
 * ctx.fillRect(0, 0, 10, 10)  // Still use CSS pixels!
 * // On a 2x display, canvas.width = 1600, but you still draw at 10px
 * ```
 */

/**
 * Get the device pixel ratio (DPR) for the current display
 * @returns {number} Device pixel ratio (1 for standard, 2+ for Retina/HiDPI)
 */
export function getDevicePixelRatio() {
    return window.devicePixelRatio || 1
}

/**
 * Create a canvas element with proper scaling for high-DPI displays
 * @param {number} width - Width in CSS pixels
 * @param {number} height - Height in CSS pixels
 * @returns {HTMLCanvasElement} Canvas configured for HiDPI rendering
 */
export function createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    const dpr = getDevicePixelRatio()
    
    // Set display size (CSS pixels)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    
    // Set actual size in memory (scaled for high-DPI)
    canvas.width = width * dpr
    canvas.height = height * dpr
    
    // Scale the context to match device pixel ratio
    // This means all subsequent draw calls use CSS pixel coordinates
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    
    return canvas
}

/**
 * Get CSS pixel dimensions from a HiDPI canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {{width: number, height: number}} Dimensions in CSS pixels
 */
export function getCanvasDimensions(canvas) {
    const dpr = getDevicePixelRatio()
    return {
        width: canvas.width / dpr,
        height: canvas.height / dpr
    }
}

/**
 * Clear the entire canvas
 * @param {HTMLCanvasElement} canvas - Canvas to clear
 */
export function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d')
    const { width, height } = getCanvasDimensions(canvas)
    ctx.clearRect(0, 0, width, height)
}

/**
 * Get 2D context from canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {CanvasRenderingContext2D} 2D rendering context
 */
export function getContext(canvas) {
    return canvas.getContext('2d')
}

