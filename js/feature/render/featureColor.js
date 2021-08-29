import {IGVColor} from "../../../node_modules/igv-utils/src/index.js";

/**
 * Return color for feature.  Called in the context of a FeatureTrack instance.
 * @param feature
 * @returns {string}
 */
export function getColorForFeature(feature) {

    let color;
    if (this.altColor && "-" === feature.strand) {
        color = this.altColor;
    } else if (this.color) {
        color = this.color;   // Explicit setting via menu, or possibly track line if !config.color
    } else if (this.config.colorBy) {
        const colorByValue = feature[this.config.colorBy.field];
        if (colorByValue) {
            const palette =
                this.config.colorBy.pallete ||    // for backward compatibility
                this.config.colorBy.palette;
            if (palette) {
                color = palette[colorByValue];
            }
        }
    } else if (feature.color) {
        color = feature.color;   // Explicit color for feature
    } else {
        color = this.defaultColor;   // Track default
    }

    if (feature.alpha && feature.alpha !== 1) {
        color = IGVColor.addAlpha(color, feature.alpha);
    } else if (this.useScore && feature.score && !Number.isNaN(feature.score)) {
        // UCSC useScore option, for scores between 0-1000.  See https://genome.ucsc.edu/goldenPath/help/customTrack.html#TRACK
        const min = this.config.min ? this.config.min : 0; //getViewLimitMin(track);
        const max = this.config.max ? this.config.max : 1000; //getViewLimitMax(track);
        const alpha = getAlpha(min, max, feature.score);
        feature.alpha = alpha;    // Avoid computing again
        color = IGVColor.addAlpha(color, alpha);
    }


    function getAlpha(min, max, score) {
        const binWidth = (max - min) / 9;
        const binNumber = Math.floor((score - min) / binWidth);
        return Math.min(1.0, 0.2 + (binNumber * 0.8) / 9);
    }

    return color
}