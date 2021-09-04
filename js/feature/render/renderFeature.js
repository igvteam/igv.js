import GtexUtils from "../../gtex/gtexUtils.js";
import IGVGraphics from "../../igv-canvas.js";
import {IGVColor} from "../../../node_modules/igv-utils/src/index.js";

/**
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @returns {{px: number, px1: number, pw: number, h: number, py: number}}
 */
export function calculateFeatureCoordinates(feature, bpStart, xScale) {
    let px = (feature.start - bpStart) / xScale;
    let px1 = (feature.end - bpStart) / xScale;
    //px = Math.round((feature.start - bpStart) / xScale),
    //px1 = Math.round((feature.end - bpStart) / xScale),
    let pw = px1 - px;

    if (pw < 3) {
        pw = 3;
        px -= 1.5;
    }

    return {
        px: px,
        px1: px1,
        pw: pw
    };
}

/**
 *
 * @param feature
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 * @param options  genomic state
 */
export function renderFeature(feature, bpStart, xScale, pixelHeight, ctx, options) {

    let color = getColorForFeature.call(this, feature)

    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    let h;
    let py;
    if (this.displayMode === "SQUISHED" && feature.row !== undefined) {
        h = this.featureHeight / 2;
        py = this.margin + this.squishedRowHeight * feature.row;
    } else if (this.displayMode === "EXPANDED" && feature.row !== undefined) {
        h = this.featureHeight
        py = this.margin + this.expandedRowHeight * feature.row;
    } else {  // collapsed
        h = this.featureHeight;
        py = this.margin;
    }

    const cy = py + h / 2;
    const h2 = h / 2;
    const py2 = cy - h2 / 2;

    const exonCount = feature.exons ? feature.exons.length : 0;
    const coord = calculateFeatureCoordinates(feature, bpStart, xScale);
    const step = this.arrowSpacing;
    const direction = feature.strand === '+' ? 1 : feature.strand === '-' ? -1 : 0;

    if (exonCount === 0) {
        // single-exon transcript
        ctx.fillRect(coord.px, py, coord.pw, h);

        // Arrows
        // Do not draw if strand is not +/-
        if (direction !== 0) {
            ctx.fillStyle = "white";
            ctx.strokeStyle = "white";
            for (let x = coord.px + step / 2; x < coord.px1; x += step) {
                // draw arrowheads along central line indicating transcribed orientation
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
            }
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }
    } else {
        // multi-exon transcript
        IGVGraphics.strokeLine(ctx, coord.px + 1, cy, coord.px1 - 1, cy); // center line for introns

        const pixelWidth = options.pixelWidth;

        const xLeft = Math.max(0, coord.px) + step / 2;
        const xRight = Math.min(pixelWidth, coord.px1);
        for (let x = xLeft; x < xRight; x += step) {
            // draw arrowheads along central line indicating transcribed orientation
            IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
            IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
        }
        for (let e = 0; e < exonCount; e++) {
            // draw the exons
            const exon = feature.exons[e];
            let ePx = Math.round((exon.start - bpStart) / xScale);
            let ePx1 = Math.round((exon.end - bpStart) / xScale);
            let ePw = Math.max(1, ePx1 - ePx);
            let ePxU;

            if (ePx + ePw < 0) {
                continue;  // Off the left edge
            }
            if (ePx > pixelWidth) {
                break; // Off the right edge
            }

            if (exon.utr) {
                ctx.fillRect(ePx, py2, ePw, h2); // Entire exon is UTR
            } else {
                if (exon.cdStart) {
                    ePxU = Math.round((exon.cdStart - bpStart) / xScale);
                    ctx.fillRect(ePx, py2, ePxU - ePx, h2); // start is UTR
                    ePw -= (ePxU - ePx);
                    ePx = ePxU;

                }
                if (exon.cdEnd) {
                    ePxU = Math.round((exon.cdEnd - bpStart) / xScale);
                    ctx.fillRect(ePxU, py2, ePx1 - ePxU, h2); // start is UTR
                    ePw -= (ePx1 - ePxU);
                    ePx1 = ePxU;
                }

                ePw = Math.max(ePw, 1);
                ctx.fillRect(ePx, py, ePw, h);

                // Arrows
                if (ePw > step + 5 && direction !== 0) {
                    ctx.fillStyle = "white";
                    ctx.strokeStyle = "white";
                    for (let x = ePx + step / 2; x < ePx1; x += step) {
                        // draw arrowheads along central line indicating transcribed orientation
                        IGVGraphics.strokeLine(ctx, x - direction * 2, cy - 2, x, cy);
                        IGVGraphics.strokeLine(ctx, x - direction * 2, cy + 2, x, cy);
                    }
                    ctx.fillStyle = color;
                    ctx.strokeStyle = color;

                }
            }
        }
    }

    if (options.drawLabel && this.displayMode !== "SQUISHED") {
        renderFeatureLabel.call(this, ctx, feature, coord.px, coord.px1, py, options.referenceFrame, options);
    }
}

/**
 * @param ctx       the canvas 2d context
 * @param feature
 * @param featureX  feature start x-coordinate
 * @param featureX1 feature end x-coordinate
 * @param featureY  feature y-coordinate
 * @param windowX   visible window start x-coordinate
 * @param windowX1  visible window end x-coordinate
 * @param referenceFrame  genomic state
 * @param options  options
 */
function renderFeatureLabel(ctx, feature, featureX, featureX1, featureY, referenceFrame, options) {

    let name = feature.name;
    if (name === undefined && feature.gene) name = feature.gene.name;
    if (name === undefined) name = feature.id || feature.ID
    if (!name || name === '.') return;


    let pixelXOffset = options.pixelXOffset || 0;
    const t1 = Math.max(featureX, -pixelXOffset);
    const t2 = Math.min(featureX1, -pixelXOffset + options.viewportWidth);
    const centerX = (t1 + t2) / 2;

    let transform;
    if (this.displayMode === "COLLAPSED" && this.labelDisplayMode === "SLANT") {
        transform = {rotate: {angle: 45}};
    }
    const labelY = getFeatureLabelY(featureY, transform);

    let color = getColorForFeature.call(this, feature);
    let geneColor;
    let gtexSelection = false;
    if (referenceFrame.selection && GtexUtils.gtexLoaded) {
        // TODO -- for gtex, figure out a better way to do this
        gtexSelection = true;
        geneColor = referenceFrame.selection.colorForGene(name);
    }

    const geneFontStyle = {
        textAlign: "SLANT" === this.labelDisplayMode ? undefined : 'center',
        fillStyle: geneColor || color,
        strokeStyle: geneColor || color
    };

    const textBox = ctx.measureText(name);
    const xleft = centerX - textBox.width / 2;
    const xright = centerX + textBox.width / 2;
    if (options.labelAllFeatures || xleft > options.rowLastX[feature.row] || gtexSelection) {
        options.rowLastX[feature.row] = xright;
        IGVGraphics.fillText(ctx, name, centerX, labelY, geneFontStyle, transform);

    }
}

function getFeatureLabelY(featureY, transform) {
    return transform ? featureY + 20 : featureY + 25;
}


/**
 * Return color for feature.  Called in the context of a FeatureTrack instance.
 * @param feature
 * @returns {string}
 */

function getColorForFeature(feature) {

    let color;
    if (this.altColor && "-" === feature.strand) {
        color = this.altColor;
    } else if (this.color) {
        color = this.color;   // Explicit setting via menu, or possibly track line if !config.color
    } else if (this.config.colorBy) {

        const isLegacy = this.config.colorBy.field !== undefined;
        const colorByValue = isLegacy ? feature[this.config.colorBy.field] : feature[this.colorBy];
        if (colorByValue) {
            const palette =
                isLegacy ? this.config.colorBy.pallete || this.config.colorBy.palette :
                    this.config.colorTable;
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