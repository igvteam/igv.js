
// import g_utils from './GeneralUtil.js'
import t_dist from './t_dist.js'
import baseCNVpytorVCF from './baseCNVpytorVCF.js'

// TODO -- remove this hardcoded value
const genome_size = 2871000000;


class MeanShiftCaller extends baseCNVpytorVCF{
    /**
     * Creates an instance of CombinedCaller.
     * 
     * @param {Array} wigFeatures - An array of arrays containing wig formatted data for each chromosome and bin.
     * @param {number} binSize - The size of the bins used in the wig data.
     * @param {string} refGenome - reference genome name
     */
    constructor(wigFeatures, binSize, refGenome) {
        super(wigFeatures, binSize, refGenome)
        this.binBands = [2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 112, 128]
    }

    async callMeanshift(repeats = 3){
        // applying gc correction
        await this.apply_gcCorrection()

        let partitionLevels = this.partition()

        // Read-depth CNV calling (cnvCalling) was never enabled and its port was
        // incomplete, so it has been removed.  What is reported below as
        // "segmentsCNV" is the mean shift partition level, not a CNV call.
        // Use the 2D caller (CombinedCaller) for actual calls.

        Object.entries(this.wigFeatures).forEach(([chr, chrRD]) => {
            chrRD.forEach((bin, index) => {
                if (partitionLevels[chr]){ 
                    bin.partitionLevel = parseInt(partitionLevels[chr][index])
                }
            });
        })

        var rawbinScore = this.formatDataStructure('binScore', this.globalMean)
        var gcCorrectedBinScore = this.formatDataStructure('gcCorrectedBinScore', this.globalMean)
        var partitionBinScore = this.formatDataStructure('partitionLevel', this.globalMean)

        const fetchedData = {binScore: rawbinScore, gcCorrectedBinScore: gcCorrectedBinScore, segmentsCNV: partitionBinScore}
        return fetchedData

    }
    
    getRDSignalBandWidth(data_array) {
        const threshold = this.globalMean / 4;

        // The values are reversed and squared as they will be used to calculate a gradient function.
        // This optimization is done to speed up the calculations.

        const constantValue = 4 / this.globalStd ** 2;
        return data_array.map(value => {
            return value > threshold ? this.globalMean / (this.globalStd ** 2 * value) : constantValue;
        });
    }

    partition(repeats = 3){
        
        // sort the dictionary based on chromosome names;
        let sortedDictionary = {};
        Object.keys(this.wigFeatures).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).forEach(key => {
            sortedDictionary[key] = this.wigFeatures[key];
        });

        let binScoreField = this.gcFlag ? "gcCorrectedBinScore": "binScore" ;
        
        var chrLevels = {}
        // Object.entries(this.wigFeatures).forEach(([chr, chr_rd]) => {
        for (const [chr, chrWig] of Object.entries(sortedDictionary)) {

            // console.log("chr: ", chr, chrWig.length, chrWig)

            // boolean array; Initiate with all false values
            var masked = new Array(chrWig.length).fill(false)

            // set the level; score from either RAW or GC corrected bin score 
            var levels = chrWig.map((item, index) => !masked[index] ? item[binScoreField] : undefined);
            // console.log("Levels: ", chr, levels)
            // var levels = chrWig.map((item, index) => !masked[index] ? item : undefined);
            
            
            this.binBands.forEach((bin_band, bin_band_index) => {
                
                // console.log("BinBand: ", bin_band)

                // not masked levels at current bin
                // get boolean values
                var not_masked = masked.map((value, index) => { return !value; })
                // console.log(not_masked)

                // not masked level at current bin
                // Object.entries(chrWig).forEach(([k, v]) => { nm_levels.push(v.binScore) })
                // var nm_levels = Object.keys(chrWig).map(k => chrWig[k].binScore);
                // var nm_levels = levels

                // not mask level
                var nm_levels = levels.filter((_, index) => !masked[index]);
                // console.log("nm_levels : ( Bin Band: " , bin_band, " )", nm_levels)
                // const nm_levels = Object.keys(chrWig).map(k => chrWig[k].binScore).filter(score => !isNaN(score));

                // console.log(nm_levels)

                // set the mask border
                var mask_borders = [0]
                var count = 0
                
                // the masked array was declared previously
                masked.forEach(item => {
                    if (item) {
                        if (count > 0) {
                            mask_borders.push(mask_borders[mask_borders.length - 1] + count - 1);
                            count = 0;
                        }
                    } else if (!item) { count++; }
                });
                // console.log(mask_borders)
                // console.log("Mask Borders: ", mask_borders)
                mask_borders.shift()

                // repeating steps
                for (let step = 0; step < repeats; step++) {
                    var isig = this.getRDSignalBandWidth(nm_levels)
                    
                    // get the direction of meanshift vector for a bin
                    // it compares near by bins to get the direction of the vector; bin band defines the range of comparison

                    var grad = new Array(nm_levels.length).fill(0);

                    for (let i = 0; i < nm_levels.length; i++) {
                        const start_bin = Math.max(0, i - 3 * bin_band);
                        const end_bin = Math.min(nm_levels.length - 1, i + 3 * bin_band + 1);
                        // let bin_length = end_bin - start_bin 
                        
                        for (let j = start_bin ; j <= end_bin; j++) {
                        // for (let j = i - 3 * bin_band; j <= i + 3 * bin_band + 1; j++) {
                            // if (j < 0 || j >= nm_levels.length) continue;
                            // if (Math.abs(i - j) >= nm_levels.length) continue;

                            var g_value = (j - i) * Math.exp((-0.5 * (j - i) ** 2) / bin_band ** 2) *  Math.exp(-0.5 * (nm_levels[i] - nm_levels[j]) ** 2 * isig[i]);

                            grad[i] += g_value
                        }
                    }
                    // console.log("grad: ", grad)
                    // get the border; if there is a change of gradient, it is a border
                    var border = new Array();
                    for (var i = 0; i < grad.length - 1; i++) {
                        if ((grad[i] < 0) & (grad[i + 1] >= 0)) border.push(i);
                    }

                    border.push(grad.length - 1)
                    border = border.concat(mask_borders).sort((a, b) => a - b)
                    border = Array.from(new Set(border))

                    var pb = 0;
                    for (var i = 0; i < border.length; i++) {
                        var range_array = nm_levels.slice(pb, border[i] + 1)
                        var range_mean = range_array.reduce((acc, n) => acc + n) / range_array.length

                        nm_levels.fill(range_mean, pb, border[i] + 1)
                        pb = border[i] + 1
                    }
                }

                for (var i = 0, j = 0; i < levels.length; i++) {
                    if (not_masked[i]) {
                        levels[i] = nm_levels[j]
                        j++
                    }
                }

                //get the border
                var border = new Array();
                for (var i = 0; i < levels.length - 1; i++) {
                    //if(i == levels.length -1) continue;
                    var diff = Math.abs(levels[i + 1] - levels[i]);

                    if (diff > 0.01) border.push(i + 1);
                }

                border.unshift(0);
                border.push(levels.length);

                // reset the mask
                masked = new Array(this.wigFeatures.length).fill(false);

                // check the borders
                for (var i = 1; i < border.length; i++) {
                    var seg = [border[i - 1], border[i]]
                    var seg_left = [border[i - 1], border[i - 1]]
                    if (i > 1) { seg_left[0] = border[i - 2] } else continue;

                    var seg_right = [border[i], border[i]];
                    if (i < border.length - 1) { seg_right[1] = border[i + 1] } else continue;

                    var n = seg[1] - seg[0];
                    var n_left = seg_left[1] - seg_left[0];
                    var n_right = seg_right[1] - seg_right[0];
                    if (n <= 1) continue;
                    var seg_array = new DataStat(levels.slice(seg[0], seg[1]));

                    if (n_right <= 15 || n_left <= 15 || n <= 15) {
                        var ns = 1.8 * Math.sqrt(levels[seg_left[0]] / this.globalMean) * this.globalStd;
                        if (Math.abs(levels[seg_left[0]] - levels[seg[0]]) < ns) { continue }

                        ns = 1.8 * Math.sqrt(levels[seg_right[0]] / this.globalMean) * this.globalStd;
                        if (Math.abs(levels[seg_right[0]] - levels[seg[0]]) < ns) { continue }
                    } else {
                        var seg_left_array = levels.slice(seg_left[0], seg_left[1])
                        var seg_left_1 = new DataStat(seg_left_array);

                        var seg_right_array = levels.slice(seg_right[0], seg_right[1])
                        var seg_right_1 = new DataStat(seg_right_array);

                        var ttest_2sample_1 = t_test_2_samples(seg_array.mean, seg_array.std, seg_array.data.length,
                            seg_left_1.mean, seg_left_1.std, seg_left_1.data.length);
                        if (ttest_2sample_1 > (0.01 / genome_size) * this.binSize * (n + n_left)) { continue }

                        var ttest_2sample_2 = t_test_2_samples(seg_array.mean, seg_array.std, seg_array.data.length,
                            seg_right_1.mean, seg_right_1.std, seg_right_1.data.length);
                        if (ttest_2sample_2 > (0.01 / genome_size) * this.binSize * (n + n_right)) { continue }
                    }

                    var ttest_1sample_1 = t_test_1_sample(this.globalMean, seg_array.mean, seg_array.std, seg_array.data.length)
                    if (ttest_1sample_1 > 0.05) { continue }
                    let segments_rd = nm_levels.slice(seg[0], seg[1])
                    // console.log("segments_rd: ", segments_rd)
                    var raw_seg_data = new DataStat(segments_rd);

                    masked.fill(true, seg[0], seg[1]);
                    levels.fill(raw_seg_data.mean, seg[0], seg[1]);
                }
        
            });
            // console.log("after applying partition: ", levels)
            chrLevels[chr] = levels
            // break
        }
        
        return chrLevels
    }



}


class DataStat {
    constructor(data_array) {
        this.data = data_array
        this.mean = data_array.reduce((acc, n) => acc + n) / data_array.length
        this.std = Math.sqrt(data_array.reduce((acc, n) => (n - this.mean) ** 2) / data_array.length)
    }
}

function t_test_1_sample(mean, m, s, n) {
    if (s == 0) s = 1;
    var t = ((mean - m) / s) * Math.sqrt(n)
    var p = 1.0 - t_dist.TdistributionCDF(Math.abs(t), (n - 1))
    return p
}

function t_test_2_samples(m1, s1, n1, m2, s2, n2) {
    if (s1 == 0) s1 = 1;
    if (s2 == 0) s2 = 1;
    var t = (m1 - m2) / Math.sqrt(s1 ** 2 / n1 + s2 ** 2 / n2);
    var df = ((s1 ** 2 / n1 + s2 ** 2 / n2) ** 2 * (n1 - 1) * (n2 - 1)) /
        ((s1 ** 4 * (n2 - 1)) / n1 ** 2 + (s2 ** 4 * (n1 - 1)) / n2 ** 2);

    var p = 1.0 - t_dist.TdistributionCDF(Math.abs(t), parseInt(df + 0.5))

    return p
}




export default { MeanShiftCaller };
