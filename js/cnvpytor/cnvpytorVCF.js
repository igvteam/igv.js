import g_utils from './GeneralUtil.js'
import combined_caller from './CombinedCaller.js';
import read_depth_caller from './MeanShiftUtil.js'


function getMean(data) {
    return (data.reduce(function (a, b) { return a + b; }) / data.length);
}


class CNVpytorVCF {
    /**
     * Create a class instance.
     * 
     * @param {Array} allVariants - An array containing all variants
     * @param {number} binSize - The bin size for processing variants.
     */
    constructor(allVariants, binSize) {
        this.allVariants = allVariants
        this.rowBinSize = 10000
        this.binSize = binSize
        this.binFactor = parseInt(binSize / this.rowBinSize)

    }

    /**
     * Read rd and BAF information from the vcf file and call accoring to the caller
     */
    async read_rd_baf(caller='ReadDepth'){
        
        // Step1: Parse data from the vcf file; for a fixed rowBinSize
        var wigFeatures = {}
        for (let i = this.allVariants.length-1; i >= 0; i--){
            var featureBin;
            // assign and free space for the all_variants
            let snp = this.allVariants[i]
            this.allVariants.splice(i, 1);

            let chr = snp.chr
            featureBin = Math.max(Math.floor(snp.start / this.rowBinSize), 0)
            if (!wigFeatures[chr]) { wigFeatures[chr] = [] }
            if (!wigFeatures[chr][featureBin]) {
                wigFeatures[chr][featureBin] = {
                    'chr': chr,
                    start: featureBin * this.rowBinSize,
                    end: (featureBin + 1) * this.rowBinSize,
                    dp_sum_score: 0,
                    dp_count: 0,
                    hets_count:0,
                    hets: [],
                };
            }

            // JTR -- note, there is an implicit assumption there that there is 1 and only 1 genotype.  Previously
            // this was hardcoded to id "9" => snp.calls[9].  By convention callset IDs == column number but this could change
            //const call = snp.calls[9]
            const calls = Object.values(snp.calls)
            if(calls.length !== 1) {
                throw Error(`Unexpected number of genotypes: ${calls.length}.  CNVPytor expects 1 and only 1 genotype`)
            }
            const call = calls[0]

            const dpValue = call.info["DP"]
            if (dpValue) {
                
                wigFeatures[chr][featureBin].dp_sum_score += Number.parseInt(dpValue)
                wigFeatures[chr][featureBin].dp_count++
            }
            
            let ad_score = call.info["AD"].split(',')
            let genotype = call.genotype
            if ((genotype[0] == 0 && genotype[1] == 1) || (genotype[0] == 1 && genotype[1] == 0)) {
                //apply the beta function
                wigFeatures[chr][featureBin].hets_count++;
                let ad_a = parseInt(ad_score[0]), ad_b = parseInt(ad_score[1])
                wigFeatures[chr][featureBin].hets.push({ref:ad_a, alt:ad_b})
            }
            
        }

        // get the chromosome names
        this.chromosomes = Object.keys(wigFeatures)

        // Step2: Update the binsize according to user provided bin size
        var avgbin = this.adjust_bin_size(wigFeatures)

        // Step3: Run the CNV caller
        var finalFeatureSet
        if(caller == 'ReadDepth'){
            let caller_obj = new MeanShiftCaller(avgbin,  this.binSize)  
            finalFeatureSet = caller_obj.ReadDepth_caller()

            // finalFeatureSet = this.readDepthMeanshift(avgbin)
            var baf = this.formatDataStructure_BAF(avgbin, 'max_likelihood')
        }else if(caller=='2D'){
            let caller_obj = new combined_caller.CombinedCaller(avgbin,  this.binSize)        
            let processed_bins = await caller_obj.call_2d()
            
            finalFeatureSet = [processed_bins.binScore, [], processed_bins.segment_score]
            var baf = caller_obj.formatDataStructure_BAF('max_likelihood', -1)
        }
        
        return [finalFeatureSet, baf]
    }

    
    formatDataStructure(wigFeatures, feature_column, scaling_factor = 1) {
        const results = []
        for (const [chr, wig] of Object.entries(wigFeatures)) {

            for(let sample of wig){
                var new_sample = { ...sample }
                if (scaling_factor != 1) {
                    new_sample.value = sample[feature_column] / scaling_factor * 2
                }
                results.push(new_sample)
            }
        }

        return results
    }

    format_BAF_likelihood(wigFeatures) {
        const results = []

        for (const [chr, wig] of Object.entries(wigFeatures)) {
            for(let sample of wig) {
                var new_sample = { ...sample }
                if (sample.value != 0.5) {
                    new_sample.value = 1 - sample.value
                    results.push(new_sample)
                }
            }
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
        const fitter = new g_utils.GetFit(bins)
        const distParams = fitter.fit_data()
        

        return bins
    }

    formatDataStructure_BAF(wigFeatures, feature_column, scaling_factor=-1) {
        /* Rescale the BAF level from 0:1 to scaling_factpr:0*/
        const baf1 = []
        const baf2 = []
        for (const [chr, wig] of Object.entries(wigFeatures)) {

            for(let sample of wig) {
                //delete sample.likelihood_score;
                var baf1_value = { ...sample }
                var baf2_value = { ...sample }
                
                let value = sample[feature_column]
                if (value != 0.5){
                    baf2_value.value = scaling_factor * (1 - value)
                    baf2.push(baf2_value)
                }
                baf1_value.value = scaling_factor * value
                baf1.push(baf1_value)
                    
            }
        }
        

        return [baf1, baf2]
    }
    
    
    /**
     * Adjust the bin values to actual bin size
     * @param {*} wigFeatures - wig features after processing the varaints
     * @returns 
     */
    adjust_bin_size(wigFeatures){
        
        var avgbin = {}
        for (let chr of this.chromosomes) {
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
                        dp_sum_score: 0
                    }
                }

                for (var j = k * this.binFactor; j < this.binFactor * k + this.binFactor; j++) {
                   
                    if (wigFeatures[chr][j]) {

                        avgbin[chr][k].dp_sum_score += wigFeatures[chr][j].dp_sum_score;
                        avgbin[chr][k].dp_count += wigFeatures[chr][j].dp_count
                        avgbin[chr][k].hets_count += wigFeatures[chr][j].hets_count

                        if (wigFeatures[chr][j].hets.length != 0){
                        
                            for(let hets of wigFeatures[chr][j].hets)  {
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
                            }
                            
                            // avgbin[chr][k].likelihood_score *= wigFeatures[chr][j].likelihood_score
                        }
                    }
                }
                avgbin[chr][k].binScore = parseInt(avgbin[chr][k].dp_sum_score / avgbin[chr][k].dp_count) * 100;
                const updated_bin = this.get_max_min_score(avgbin[chr][k])
                avgbin[chr][k].max_likelihood = updated_bin.value
            }
        }
        return avgbin
    }

}

function beta(a, b, p, phased = true) { 
    return Math.pow(p, a) * Math.pow(1-p, b) + Math.pow(p, b) * Math.pow(1-p, a)
}

class MeanShiftCaller{
    constructor(wigFeatures, binSize) {
        this.wigFeatures = wigFeatures
        this.binSize = binSize
    }

    ReadDepth_caller(){
         // Get global mean and standrad deviation
         var fit_info = new g_utils.GetFit(this.wigFeatures)
         var [globamMean, globalStd] = fit_info.fit_data();
 
         // Apply partition method
         var partition = new read_depth_caller.Partition(this.wigFeatures, globamMean, globalStd);
         var partition_array = partition.meanShiftCaller(this.binSize)
         var caller_array = partition.cnv_calling()
 
         // Assign the partition values to each bin
         Object.entries(this.wigFeatures).forEach(([chr, chr_rd]) => {
             chr_rd.forEach((bin, index) => {
                 bin.partition_level = parseInt(partition_array[chr][index])
                 bin.partition_call = parseInt(caller_array[0][chr][index])
             });
         })
 
         var rawbinScore = this.formatDataStructure('binScore', globamMean)
         var partition_levels = this.formatDataStructure('partition_level', globamMean)
         var partition_call = this.formatDataStructure('partition_call', globamMean)
 
         return [rawbinScore, partition_levels, partition_call, caller_array[1]]
    }

    formatDataStructure(feature_column, scaling_factor = 1) {
        const results = []
        for (const [chr, wig] of Object.entries(this.wigFeatures)) {

            for(let sample of wig){
                var new_sample = { ...sample }
                if (scaling_factor != 1) {
                    new_sample.value = sample[feature_column] / scaling_factor * 2
                }
                results.push(new_sample)
            }
        }

        return results
    }


}


export { CNVpytorVCF }
