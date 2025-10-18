/**
 * Color utilities for genomic visualization
 */

/**
 * Parse color string to ensure valid CSS color
 */
export function parseColor(colorString) {
    if (!colorString) {
        return 'rgb(150, 150, 150)' // default gray
    }
    
    // Already valid format
    if (colorString.startsWith('rgb(') || colorString.startsWith('rgba(') || 
        colorString.startsWith('#') || isNamedColor(colorString)) {
        return colorString
    }
    
    // Handle comma-separated RGB values: "255,0,0" -> "rgb(255,0,0)"
    if (colorString.indexOf(',') > 0 && !colorString.includes('(')) {
        return `rgb(${colorString})`
    }
    
    return colorString
}

/**
 * Standard nucleotide colors
 */
export const nucleotideColors = {
    'A': 'rgb(0, 200, 0)',
    'C': 'rgb(0, 0, 255)',
    'G': 'rgb(209, 113, 5)',
    'T': 'rgb(255, 0, 0)',
    'N': 'rgb(128, 128, 128)'
}

/**
 * Check if string is a named CSS color
 */
function isNamedColor(color) {
    const namedColors = new Set([
        'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
        'black', 'white', 'gray', 'grey', 'brown', 'cyan', 'magenta',
        'lime', 'navy', 'teal', 'aqua', 'maroon', 'olive', 'silver'
    ])
    return namedColors.has(color.toLowerCase())
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

/**
 * Add alpha channel to color
 */
export function addAlpha(color, alpha) {
    // Parse rgb/rgba
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`
    }
    return color
}

