import g_utils from './GeneralUtil.js'
import combined_caller from './CombinedCaller.js';
import read_depth_caller from './MeanShiftUtil.js'


function getMean(data) {
    return (data.reduce(function (a, b) { return a + b; }) / data.length);
}

class CNVpytorVCF {
    constructor(allVariants, binSize) {
        this.allVariants = allVariants
        this.rowBinSize = 10000
        this.binSize = binSize
        this.binFactor = binSize / this.rowBinSize

    }

    async computeDepthFeatures() {

        const chromosomes = Object.keys(this.allVariants)
        const wigFeatures = []

        for (let chr of chromosomes) {
            const variants = this.allVariants[chr]
            if (variants.length === 0) continue

            const firstSnp = variants[0]

            let sum = 0
            let count = 0
            let binStart = firstSnp.start = firstSnp.start % this.binSize   // Place start at integer multiple of binSize
            let binEnd = binStart + this.binSize
            let featureBin = 0

            for (let snp of variants) {
                const position = snp.start + 1    // Convert from 0-base to 1-base coords
                featureBin = Math.max(Math.floor((snp.start - 1) / this.binSize), 0)
                if (position > binEnd) {

                    if (count > 0) {
                        wigFeatures.push({ chr, start: binStart, end: binEnd, value: sum, bin: featureBin, count: count })
                    }

                    // Start new bin
                    sum = 0
                    //count = 0
                    binStart = snp.start - snp.start % this.binSize
                    binEnd = binStart + this.binSize
                }

                const dpValue = snp.calls[9].info["DP"]
                // const dpValue = snp.getInfo("DP")

                if (dpValue) {
                    sum += Number.parseInt(dpValue)
                    count++
                }
            }

            // final bin
            if (count > 0) {
                wigFeatures.push({ chr, start: binStart, end: binEnd, value: sum, bin: featureBin, count: count })
            }
        }

        return wigFeatures
    }

    // for for read depth calculation
    async computeReadDepth() {
        const chromosomes = Object.keys(this.allVariants)
        var wigFeatures = {}

        for (let chr of chromosomes) {
            const variants = this.allVariants[chr]
            var featureBin;
            if (variants.length === 0) continue
            for (let snp of variants) {
                featureBin = Math.max(Math.floor(snp.start / this.rowBinSize), 0)
                if (!wigFeatures[chr]) { wigFeatures[chr] = [] }
                if (!wigFeatures[chr][featureBin]) {

                    wigFeatures[chr][featureBin] = {
                        chr,
                        start: featureBin * this.rowBinSize,
                        end: (featureBin + 1) * this.rowBinSize,
                        value: 0,
                        sum_score: 0,
                        count: 0,
                    };
                }
                const dpValue = snp.calls[9].info["DP"]
                if (dpValue) {
                    // sum += Number.parseInt(dpValue)
                    wigFeatures[chr][featureBin].sum_score += Number.parseInt(dpValue)
                    wigFeatures[chr][featureBin].count++
                }

            }
            // for last bin
            //let last_bin = wigFeatures[chr][featureBin]
            //last_bin.value = parseInt(last_bin.sum_score / last_bin.count) * 100
        }

        // adjust the bin values to actual bin size
        var avgbin = {}
        for (let chr of chromosomes) {
            if (!avgbin[chr]) { avgbin[chr] = [] }
            for (let k = 0; k < wigFeatures[chr].length / this.binFactor; k++) {
                const featureBin = k
                if (!avgbin[chr][k]) {
                    avgbin[chr][k] = {
                        chr,
                        binScore: 0,
                        start: featureBin * this.binSize,
                        end: (featureBin + 1) * this.binSize,
                    }
                }

                for (var j = k * 10; j < 10 * k + 10; j++) {
                    if (wigFeatures[chr][j]) {
                        var tmp_score = parseInt(wigFeatures[chr][j].sum_score / wigFeatures[chr][j].count) * 100;
                        avgbin[chr][k].binScore += tmp_score;
                    }
                }
            }
        }

        var finalFeatureSet = this.readDepthMeanshift(avgbin)
        return finalFeatureSet

    }
    readDepthMeanshift(wigFeatures) {

        // Get global mean and standrad deviation
        var fit_info = new g_utils.GetFit(wigFeatures)
        var [globamMean, globalStd] = fit_info.fit_data();

        // Apply partition method
        var partition = new read_depth_caller.Partition(wigFeatures, globamMean, globalStd);
        var partition_array = partition.meanShiftCaller()
        var caller_array = partition.cnv_calling()

        // Assign the partition values to each bin
        Object.entries(wigFeatures).forEach(([chr, chr_rd]) => {
            chr_rd.forEach((bin, index) => {
                bin.partition_level = parseInt(partition_array[chr][index])
                bin.partition_call = parseInt(caller_array[0][chr][index])
            });
        })

        var rawbinScore = this.formatDataStructure(wigFeatures, 'binScore', globamMean)
        var partition_levels = this.formatDataStructure(wigFeatures, 'partition_level', globamMean)
        var partition_call = this.formatDataStructure(wigFeatures, 'partition_call', globamMean)

        return [rawbinScore, partition_levels, partition_call, caller_array[1]]

    }
    formatDataStructure(wigFeatures, feature_column, scaling_factor = 1) {
        const results = []
        for (const [chr, wig] of Object.entries(wigFeatures)) {

            wig.forEach(sample => {
                var new_sample = { ...sample }
                if (scaling_factor != 1) {
                    new_sample.value = sample[feature_column] / scaling_factor * 2
                }
                results.push(new_sample)
            })
        }

        return results
    }

    async computeBAF_v2() {

        const chromosomes = Object.keys(this.allVariants)
        const wigFeatures = {}
        const baf1 = [], baf2 = []

        for (let chr of chromosomes) {
            const variants = this.allVariants[chr]
            if (variants.length === 0) continue
            var featureBin;
            for (let snp of variants) {
                featureBin = Math.max(Math.floor(snp.start / this.binSize), 0)

                if (!wigFeatures[chr]) {
                    wigFeatures[chr] = []
                }
                if (!wigFeatures[chr][featureBin]) {
                    if (featureBin > 0) {
                        // calculating the BAF likelihood for previous bin
                        let previous_featureBin = featureBin - 1
                        if (wigFeatures[chr][previous_featureBin]) {

                            const updated_bin = this.get_max_min_score(wigFeatures[chr][previous_featureBin])

                            if (updated_bin.value != 0.5) {
                                let baf_wig = Object.assign({}, updated_bin);
                                baf_wig.value = -2 * (1 - updated_bin.value)
                                baf2.push(baf_wig)
                            }
                            updated_bin.value = - 2 * updated_bin.value
                            wigFeatures[chr][previous_featureBin] = updated_bin

                            baf1.push(wigFeatures[chr][previous_featureBin])

                        }
                    }
                    wigFeatures[chr][featureBin] = {
                        chr,
                        start: featureBin * this.binSize,
                        end: (featureBin + 1) * this.binSize,
                        value: 0,
                        count: 0,
                        likelihood_score: [],
                        min_score: 0,
                    };
                }
                const calls = snp.calls[9]
                let genotype = calls.genotype
                let ad_score = calls.info["AD"].split(',')
                let ad_a = ad_score[0], ad_b = ad_score[1]

                if ((genotype[0] == 0 && genotype[1] == 1) || (genotype[0] == 1 && genotype[1] == 0)) {
                    //apply the beta function
                    if (wigFeatures[chr][featureBin].likelihood_score.length == 0) {
                        wigFeatures[chr][featureBin].likelihood_score = g_utils.linspace(0, 1, 100).map((value, index) => {
                            return beta(ad_a, ad_b, value);
                        });
                    } else {
                        var sum = 0;

                        wigFeatures[chr][featureBin].likelihood_score = g_utils.linspace(0, 1, 100).map((value, index) => {
                            var likelihood_value = wigFeatures[chr][featureBin].likelihood_score[index] * beta(ad_a, ad_b, value);
                            sum = sum + likelihood_value;
                            return likelihood_value;
                        });

                        wigFeatures[chr][featureBin].likelihood_score = g_utils.linspace(0, 1, 100).map((value, index) => {
                            return wigFeatures[chr][featureBin].likelihood_score[index] / sum;
                        });
                    }
                    wigFeatures[chr][featureBin].count++;
                }
            }

            // last feature bin
            const updated_bin = this.get_max_min_score(wigFeatures[chr][featureBin])

            if (updated_bin.value != 0.5) {
                let baf_wig = Object.assign({}, updated_bin);
                baf_wig.value = -2 * (1 - updated_bin.value)
                baf2.push(baf_wig)
            }
            updated_bin.value = -2 * updated_bin.value
            wigFeatures[chr][featureBin] = updated_bin
            baf1.push(wigFeatures[chr][featureBin])
        }

        return [baf1, baf2]

    }


    format_BAF_likelihood(wigFeatures) {
        const results = []

        for (const [chr, wig] of Object.entries(wigFeatures)) {
            wig.forEach(sample => {
                var new_sample = { ...sample }
                if (sample.value != 0.5) {
                    new_sample.value = 1 - sample.value
                    results.push(new_sample)
                }
            })
        }
        return results
    }

    get_max_min_score(sample) {

        if (sample.likelihood_score.length > 0) {
            const max = Math.max(...sample.likelihood_score);
            const res = sample.likelihood_score.indexOf(max);
            sample.value = Math.max(res / 100, 1 - res / 100);
            sample.min_score = Math.min(res / 100, 1 - res / 100);

        } else {
            sample.score = 0;
        }

        return sample
    }

    async getAllbins() {
        const bins = await this.computeDepthFeatures()

        //console.log('getAllbins', bins["value"])

        const fitter = new g_utils.GetFit(bins)

        const distParams = fitter.fit_data()
        //  dconsole.log('rd list', distParams)

        return bins
    }

    async read_rd_baf(caller='ReadDepth'){
        
        const chromosomes = Object.keys(this.allVariants)
        var wigFeatures = {}

        for (let chr of chromosomes) {
            const variants = this.allVariants[chr]
            var featureBin;
            if (variants.length === 0) continue
            for (let snp of variants) {
                featureBin = Math.max(Math.floor(snp.start / this.rowBinSize), 0)
                if (!wigFeatures[chr]) { wigFeatures[chr] = [] }
                if (!wigFeatures[chr][featureBin]) {

                    wigFeatures[chr][featureBin] = {
                        chr,
                        start: featureBin * this.rowBinSize,
                        end: (featureBin + 1) * this.rowBinSize,
                        // value: 0,
                        dp_sum_score: 0,
                        dp_count: 0,
                        hets_count:0,
                        hets: [],
                        //likelihood_score: [],
                    };
                }
                const calls = snp.calls[9]
                const dpValue = calls.info["DP"]
                if (dpValue) {
                    
                    wigFeatures[chr][featureBin].dp_sum_score += Number.parseInt(dpValue)
                    wigFeatures[chr][featureBin].dp_count++
                }
                
                let ad_score = calls.info["AD"].split(',')
                let genotype = calls.genotype
                if ((genotype[0] == 0 && genotype[1] == 1) || (genotype[0] == 1 && genotype[1] == 0)) {
                    //apply the beta function
                    wigFeatures[chr][featureBin].hets_count++;
                    let ad_a = parseInt(ad_score[0]), ad_b = parseInt(ad_score[1])
                    wigFeatures[chr][featureBin].hets.push({ref:ad_a, alt:ad_b})
                }
           
            }
        
        }
    
        var avgbin = this.adjust_bin_size(wigFeatures)
        var finalFeatureSet
        if(caller == 'ReadDepth'){
            finalFeatureSet = this.readDepthMeanshift(avgbin)
            var baf = this.formatDataStructure_BAF(avgbin, 'max_likelihood')
        }else if(caller=='2D'){
            
            let caller_obj = new combined_caller.CombinedCaller(avgbin,  this.binSize)        
            let processed_bins = await caller_obj.call_2d()
            
            finalFeatureSet = [processed_bins.binScore, [], processed_bins.segment_score]
    
            var baf = caller_obj.formatDataStructure_BAF('max_likelihood')
        }
        

        return [finalFeatureSet, baf]
    }

    formatDataStructure_BAF(wigFeatures, feature_column, scaling_factor = 2) {
        const baf1 = []
        const baf2 = []
        for (const [chr, wig] of Object.entries(wigFeatures)) {

            wig.forEach(sample => {
                delete sample.likelihood_score;
                var baf1_value = { ...sample }
                var baf2_value = { ...sample }
                
                let value = sample[feature_column]
                if (value != 0.5){
                    baf2_value.value = -2 * (1 - value)
                    baf2.push(baf2_value)
                }
                baf1_value.value = -2 * value
                baf1.push(baf1_value)
                    
            })
        }
        

        return [baf1, baf2]
    }
    
    adjust_bin_size(wigFeatures){
        const chromosomes = Object.keys(this.allVariants)
        // adjust the bin values to actual bin size
        var avgbin = {}
        for (let chr of chromosomes) {
            if (!avgbin[chr]) { avgbin[chr] = [] }
            for (let k = 0; k < wigFeatures[chr].length / this.binFactor; k++) {
                const featureBin = k
                if (!avgbin[chr][k]) {
                    avgbin[chr][k] = {
                        chr,
                        start: featureBin * this.binSize,
                        end: (featureBin + 1) * this.binSize,
                        dp_count: 0,
                        hets_count: 0,
                        binScore: 0,
                        likelihood_score: [],
                    }
                }

                for (var j = k * 10; j < 10 * k + 10; j++) {
                   
                    if (wigFeatures[chr][j]) {
                        var tmp_score = parseInt(wigFeatures[chr][j].dp_sum_score / wigFeatures[chr][j].dp_count) * 100;
                        avgbin[chr][k].binScore += tmp_score;
                        avgbin[chr][k].dp_count += wigFeatures[chr][j].dp_count
                        avgbin[chr][k].hets_count += wigFeatures[chr][j].hets_count

                        if (wigFeatures[chr][j].hets.length != 0){
                        
                            
                            wigFeatures[chr][j].hets.forEach((hets, hets_idx) => {
                                if(avgbin[chr][k].likelihood_score.length == 0){
                                    avgbin[chr][k].likelihood_score = g_utils.linspace(0, 1, 100).map((value, index) => {
                                        return beta(hets.ref, hets.alt, value);
                                    });
                                }
                                else{
                                    var likelihood_sum = 0
                                    avgbin[chr][k].likelihood_score = g_utils.linspace(0, 1, 100).map((value, index) => {
                                        var likelihood_value = avgbin[chr][k].likelihood_score[index] * beta(hets.ref, hets.alt, value);
                                        likelihood_sum += likelihood_value;
                                        return likelihood_value;
                                    });

                                    avgbin[chr][k].likelihood_score = g_utils.linspace(0, 1, 100).map((value, index) => {
                                        return avgbin[chr][k].likelihood_score[index] / likelihood_sum;
                                    });
                       
                                }
                            });
                            
                            // avgbin[chr][k].likelihood_score *= wigFeatures[chr][j].likelihood_score
                        }
                    }
                }

                const updated_bin = this.get_max_min_score(avgbin[chr][k])
                avgbin[chr][k].max_likelihood = updated_bin.value
            }
        }
        return avgbin
    }

}

function beta(a, b, p, phased = true) {
    return p ** a * (1 - p) ** b + p ** b * (1 - p) ** a;
}



export { CNVpytorVCF }
