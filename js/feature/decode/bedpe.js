import {IGVColor} from "../../../node_modules/igv-utils/src/index.js";
import {isNumber} from "../../util/igvUtils.js"

/**
 * Decoder for bedpe records.
 *
 * Bedpe format was created by Aaron Quinlan et al as part of the bedtools project.
 * The spec is here:  https://bedtools.readthedocs.io/en/latest/content/general-usage.html,  however there
 * are off spec variants, an important one being a 7 column format with score in place of the standard
 * name column.
 *
 * Another common variant is a "hiccups" output file, which is standard bedpe with the exception of a header line
 * of the form
 * chr1	x1	x2	chr2	y1	y2	name	score	strand1	strand2	color	observed	expectedBL	expectedDonut	expectedH	expectedV	fdrBL	fdrDonut	fdrH	fdrV
 *
 * @param tokens
 * @param ignore
 * @returns {{start1: number, end2: number, end1: number, chr1: *, chr2: *, start2: number}|undefined}
 */

function decodeBedpe(tokens, header) {

    if (tokens.length < 6) {
        console.log("Skipping line: " + tokens.join(' '));
        return undefined;
    }

    var feature = {
        chr1: tokens[0],
        start1: Number.parseInt(tokens[1]),
        end1: Number.parseInt(tokens[2]),
        chr2: tokens[3],
        start2: Number.parseInt(tokens[4]),
        end2: Number.parseInt(tokens[5])
    }

    if (tokens.length > 6) {
        feature.name = tokens[6];
    }

    if (tokens.length > 7) {
        feature.score = parseFloat(tokens[7]);
    }

    if (tokens.length > 8) {
        feature.strand1 = tokens[8];
    }

    if(tokens.length > 9) {
        feature.strand2 = tokens[9];
    }

    // Optional extra columns
    if (header) {
        const colorColumn = header.colorColumn;
        if (colorColumn && colorColumn < tokens.length) {
            feature.color = IGVColor.createColorString(tokens[colorColumn])
        }
        const thicknessColumn = header.thicknessColumn;
        if (thicknessColumn && thicknessColumn < tokens.length) {
            feature.thickness = tokens[thicknessColumn];
        }

        if(tokens.length > 10 && header.columnNames && header.columnNames.length === tokens.length) {
            feature.extraValues = tokens.slice(10);
        }
    }



    // Set total extent of feature
    if(feature.chr1 === feature.chr2) {
        feature.chr = feature.chr1;
        feature.start = Math.min(feature.start1, feature.start2);
        feature.end = Math.max(feature.end1, feature.end2);

    }
    return feature;
}

/**
 * Hack for non-standard bedPE formats, where numeric score can be in column 7 (name field from spec)
 * @param features
 */
function fixBedPE(features) {

    if(features.length == 0) return;

    // Assume all features have same properties
    const firstFeature = features[0];
    if(firstFeature.score === undefined && firstFeature.name !== undefined) {
        // Name field (col 7) is sometimes used for score.
        for(let f of features) {
            if(!(isNumber(f.name) || f.name === '.')) return;
        }
        for(let f of features) {
            f.score = parseFloat(f.name);
            delete f.name;
        }
    }

    // Make copies of inter-chr features, one for each chromosome
    const interChrFeatures = features.filter(f => f.chr1 !== f.chr2);
    for(let f1 of interChrFeatures) {
        const f2 = Object.assign({}, f1);
        f2.dup = true;
        features.push(f2);

        f1.chr = f1.chr1;
        f1.start = f1.start1;
        f1.end = f1.end1;

        f2.chr = f2.chr2;
        f2.start = f2.start2;
        f2.end = f2.end2;
    }
}


/**
 * Special decoder for Hic Domain files.   In these files feature1 == feature2, they are really bed records.
 * @param tokens
 * @param ignore
 * @returns {*}
 */
function decodeBedpeDomain(tokens, header) {

    if (tokens.length < 8) return undefined;

    return {
        chr: tokens[0],
        start: Number.parseInt(tokens[1]),
        end: Number.parseInt(tokens[2]),
        color: IGVColor.createColorString(tokens[6]),
        value: Number.parseFloat(tokens[7])
    };
}


export {decodeBedpe, decodeBedpeDomain, fixBedPE}