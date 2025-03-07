/**
 * Utility functions for variant track operations
 */

import CNVPytorTrack from "../cnvpytor/cnvpytorTrack.js"

/**
 * Convert a variant track to a CNVpytor track
 * @param {Object} variantTrack - The variant track to convert
 * @param {Object} browser - The browser instance
 * @returns {Promise<CNVPytorTrack>} The new CNVpytor track
 */
export async function convertToPytor(variantTrack, browser) {
    const config = {
        format: 'vcf',
        url: variantTrack.config.url,
        indexURL: variantTrack.config.indexURL,
        height: CNVPytorTrack.DEFAULT_TRACK_HEIGHT,
        bin_size: 100000,
        signal_name: 'rd_snp',
        cnv_caller: '2D',
        colors: ['gray', 'black', 'green', 'blue']
    }

    const track = new CNVPytorTrack(config, browser)
    await track.postInit()
    return track
}

/**
 * Check if a variant track can be converted to a CNVpytor track
 * @param {Object} variantTrack - The variant track to check
 * @returns {boolean} Whether the track can be converted
 */
export function canConvertToPytor(variantTrack) {
    return variantTrack.config.format === 'vcf' && 
           variantTrack.config.url && 
           !variantTrack.config.indexURL
} 