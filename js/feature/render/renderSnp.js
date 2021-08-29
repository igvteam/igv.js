// SNP constants
import {calculateFeatureCoordinates} from "./renderFeature.js";

const codingNonSynonSet = new Set(['nonsense', 'missense', 'stop-loss', 'frameshift', 'cds-indel']);
const codingSynonSet = new Set(['coding-synon']);
const spliceSiteSet = new Set(['splice-3', 'splice-5']);
const untranslatedSet = new Set(['untranslated-5', 'untranslated-3']);
const locusSet = new Set(['near-gene-3', 'near-gene-5']);
const intronSet = new Set(['intron']);


/**
 * Renderer for a UCSC snp track
 *
 * @param snp
 * @param bpStart  genomic location of the left edge of the current canvas
 * @param xScale  scale in base-pairs per pixel
 * @param pixelHeight  pixel height of the current canvas
 * @param ctx  the canvas 2d context
 */
export function renderSnp(snp, bpStart, xScale, pixelHeight, ctx) {

    var coord = calculateFeatureCoordinates(snp, bpStart, xScale),
        py = this.margin,
        h,
        colorArrLength = this.snpColors.length,
        colorPriority;

    h = this.displayMode === "squished" ? this.squishedRowHeight : this.expandedRowHeight;

    switch (this.colorBy) {
        case 'function':
            colorPriority = colorByFunc(snp.func);
            break;
        case 'class':
            colorPriority = colorByClass(snp['class']);
    }

    ctx.fillStyle = this.snpColors[colorPriority];
    ctx.fillRect(coord.px, py, coord.pw, h);

    // Coloring functions, convert a value to a priority

    function colorByFunc(theFunc) {
        var priorities;
        var funcArray = theFunc.split(',');
        // possible func values


        priorities = funcArray.map(function (func) {
            if (codingNonSynonSet.has(func) || spliceSiteSet.has(func)) {
                return colorArrLength - 1;
            } else if (codingSynonSet.has(func)) {
                return colorArrLength - 2;
            } else if (untranslatedSet.has(func)) {
                return colorArrLength - 3;
            } else { // locusSet.has(func) || intronSet.has(func)
                return 0;
            }
        });

        return priorities.reduce(function (a, b) {
            return Math.max(a, b);
        });
    }

    function colorByClass(cls) {
        if (cls === 'deletion') {
            return colorArrLength - 1;
        } else if (cls === 'mnp') {
            return colorArrLength - 2;
        } else if (cls === 'microsatellite' || cls === 'named') {
            return colorArrLength - 3;
        } else { // cls === 'single' || cls === 'in-del' || cls === 'insertion'
            return 0;
        }
    }
}