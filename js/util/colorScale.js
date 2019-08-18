
/**
 *
 * @param cs - object containing
 * 1) array of threshold values defining bin boundaries in ascending order
 * 2) array of colors for bins  (length == thresholds.length + 1)
 * @constructor
 */
function BinnedColorScale (cs) {
    this.thresholds = cs.thresholds;
    this.colors = cs.colors;
};

BinnedColorScale.prototype.getColor = function (value) {

    for (let threshold of this.thresholds) {
        if (value < threshold) {
            return this.colors[this.thresholds.indexOf(threshold)];
        }
    }

    return this.colors[this.colors.length - 1];

};

/**
 *
 * @param scale - object with the following properties
 *           low
 *           lowR
 *           lowG
 *           lowB
 *           high
 *           highR
 *           highG
 *           highB
 *
 * @constructor
 */
function GradientColorScale  (scale) {

    this.scale = scale;
    this.lowColor = "rgb(" + scale.lowR + "," + scale.lowG + "," + scale.lowB + ")";
    this.highColor = "rgb(" + scale.highR + "," + scale.highG + "," + scale.highB + ")";
    this.diff = scale.high - scale.low;

}

GradientColorScale.prototype.getColor = function (value) {

    var scale = this.scale, r, g, b, frac;

    if (value <= scale.low) return this.lowColor;
    else if (value >= scale.high) return this.highColor;

    frac = (value - scale.low) / this.diff;
    r = Math.floor(scale.lowR + frac * (scale.highR - scale.lowR));
    g = Math.floor(scale.lowG + frac * (scale.highG - scale.lowG));
    b = Math.floor(scale.lowB + frac * (scale.highB - scale.lowB));

    return "rgb(" + r + "," + g + "," + b + ")";
}



export {BinnedColorScale, GradientColorScale}
