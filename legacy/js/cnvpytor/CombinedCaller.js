import t_dist from './t_dist.js'
import gUtils from './GeneralUtil.js'
import baseCNVpytorVCF from './baseCNVpytorVCF.js'
 

class CombinedCaller extends baseCNVpytorVCF {
    /**
     * Creates an instance of CombinedCaller.
     * 
     * @param {Array} wigFeatures - An array of arrays containing wig formatted data for each chromosome and bin.
     * @param {number} binSize - The size of the bins used in the wig data.
     * @param {string} refGenome - GC content data indexed by chromosome and bin.
     */
    constructor(wigFeatures, binSize, refGenome) {
        super(wigFeatures, binSize, refGenome)
    }

    async call_2d(omin=null, mcount=null, event_type="both", max_distance=0.1, baf_threshold=0, max_copy_number=10, min_cell_fraction=0.0){
        
        // let fit_obj = this.get_fit_v2()
        // this.globalMean = fit_obj.globalMean
        // this.globalStd = fit_obj.globalStd
        
        // this.getGcCorrectionSignal(this.globalMean)

        // applying gc correction
        await this.apply_gcCorrection()

        let binScoreField = this.gcFlag ? "gcCorrectedBinScore": "binScore" ;

        let overlap_min = omin==null ?  0.05 * this.binSize / 3e9: omin ;
        let min_count = mcount == null ? parseInt(this.binSize / 10000) : mcount ;

        let gstat_rd0 = []
        let gstat_rd_all = []
        let gstat_rd = []
        let gstat_baf = []
        let gstat_error = []
        let gstat_lh = []
        let gstat_n = []
        let gstat_event = []
        
        for (const [chr, wig] of Object.entries(this.wigFeatures)) {
            let segments = []
            let levels = []
            let likelihoods = []
            
            wig.forEach((bin, bin_idx) => {
                if (bin.hets_count > 4 ){
                    
                    if( bin.dp_count > min_count ){
                        if(bin[binScoreField]){
                            segments.push([bin_idx])
                            levels.push(bin[binScoreField])
                            likelihoods.push(bin.likelihood_score)
                            delete bin.likelihood_score

                        }

                    }
                }
            })

            let diff_level = []
            for(let i=1; i<levels.length; i++){
                diff_level.push(Math.abs(levels[i] - levels[i-1]))
            }
            let min_flank = [0]
            for(let i=1; i<diff_level.length; i++){
                min_flank.push(Math.min(diff_level[i-1], diff_level[i]))    
            }
            min_flank.push(0)

            let error  = levels.map((x, x_idx) => {return Math.sqrt(Math.sqrt(x) ** 2 + this.globalStd ** 2 + Math.pow(min_flank[x_idx]/2, 2));});
            
            let overlaps = []
            
            for(let i=0; i< segments.length-1; i++){
                
                let lh_overlap = 0
                try{
                    lh_overlap = likelihood_overlap(likelihoods[i], likelihoods[i+1])
                }catch{
                    console.log("Overlap failed: ", i, likelihoods[i], segments[i+1], likelihoods[i+1])
                }
                
                let rd_overlap = normal_overlap_approx(levels[i], error[i], levels[i+1], error[i+1])
                overlaps.push(rd_overlap * lh_overlap)
                
            }
            
            while(overlaps.length >0) {
                overlaps = overlaps.filter(num => typeof num === "number");
                
                let max_overlap = arrayMax(overlaps)
                if(isNaN(max_overlap)){
                    console.log('NaN value', overlaps)
                }
                if(max_overlap < overlap_min){
                    // console.log("maxoverlap ",max_overlap,  "is smaller than overlap min")
                    break
                }
                let i = overlaps.indexOf(max_overlap)
                
                let merge_level = normal_merge(levels[i], error[i], levels[i + 1], error[i + 1]);
                
                let nlh
                let nlh_sum;
                try{
                    nlh = likelihoods[i].map((l_value, l_idx) => { return l_value * likelihoods[i+1][l_idx]})
                
                    nlh_sum = nlh.reduce((a, c_value) => {return a + c_value});
                    
                }catch{
                    console.log(likelihoods)
                    console.log('max_overlap:', max_overlap, i, overlaps.length)
                    console.log('likelihood: ', i ,likelihoods[i], likelihoods[i+1])
                    console.log('nlh: ', nlh_sum)
                }
                // nlh_sum = nlh.reduce((a, c_value) => {return a + c_value});

                levels[i] = merge_level.nl
                error[i] = merge_level.ne
                
                likelihoods[i] = nlh.map(function(item) { return item/nlh_sum } )
                
                segments[i].push(...segments[i+1])

                levels.splice(i + 1, 1)
                error.splice(i + 1, 1)
                segments.splice(i + 1, 1)
                likelihoods.splice(i + 1, 1)
                overlaps.splice(i, 1)
                
                if(i < overlaps.length){
                    
                    let rd_overlap = normal_overlap_approx(levels[i], error[i], levels[i+1], error[i+1])
                    let new_overlap = rd_overlap * likelihood_overlap(likelihoods[i], likelihoods[i + 1])
                    
                    overlaps[i] = new_overlap
                }
                if(i > 0){
                    let new_overlap = normal_overlap_approx(levels[i - 1], error[i - 1], levels[i], error[i]) 
                    * likelihood_overlap(likelihoods[i - 1], likelihoods[i])
                    overlaps[i - 1] = new_overlap
                }

            }

            let iter_count = 0
            let ons = -1
            while(true){
                overlaps = []
                for(let i=0; i< levels.length; i++){
                    for(let j=i; j<levels.length; j++){
                        if(segments[j][0] - segments[i].at(-1) < max_distance * (segments[i].length + segments[j].length)){
                            overlaps.push(normal_overlap_approx(levels[i], error[i], levels[j], error[j]) * likelihood_overlap(likelihoods[i], likelihoods[j]))
                        }
                    }
                }
                
                if(overlaps.length == 0){
                    break
                }
                let max_overlap = arrayMax(overlaps)
                if(max_overlap < overlap_min){
                    break
                }
                let i = 0 
                let j = 1
                while (i < segments.length - 1){
                    let overlap_value = normal_overlap_approx(levels[i], error[i], levels[j], error[j]) * likelihood_overlap(likelihoods[i], likelihoods[j])

                    if((segments[j][0] - segments[i].at(-1)) < max_distance * (segments[i].length + segments[j].length) && overlap_value == max_overlap){
                        let merge_level = normal_merge(levels[i], error[i], levels[i + 1], error[i + 1]);

                        levels[i] = merge_level.nl
                        error[i] = merge_level.ne
                        let nlh = likelihoods[i].map((l_value, l_idx) => { return l_value * likelihoods[i+1][l_idx]})
                        let nlh_sum = nlh.reduce((a, c_value) => {return a + c_value});
                        likelihoods[i] = nlh.map(function(item) { return item/nlh_sum } )

                        
                        segments[i].push(...segments[i+1])
                        segments[i] = segments[i].sort((a,b) => a-b)

                        levels.splice(j, 1)
                        error.splice(j, 1)
                        segments.splice(j, 1)
                        likelihoods.splice(j, 1)
                        
                        if(j >= segments.length){
                            i += 1
                            j = i + 1
                        }

                    }else{
                        j += 1
                        if(j >= segments.length){
                            i += 1
                            j = i + 1
                        }
                    }
                }
                iter_count = iter_count + 1
                if(ons == segments.length){
                    break
                }
                ons = segments.length
            }
            // console.log('final segments', segments)
            
            segments.forEach((seg_value, seg_idx) => {
                let baf_info = likelihood_baf_pval(likelihoods[seg_idx])
                if(seg_value.length > 1){
                    let q0 = 0
                    let srdp = 0
                    let homs = 0
                    let hets = 0

                    seg_value.forEach((bin, bin_idx) =>{
                        gstat_rd_all.push(wig[bin])
                        if(baf_info.mean <= baf_threshold){
                            gstat_rd0.push(wig[bin])
                        }
                        wig[bin].segment_score = levels[seg_idx]
                    });
                    gstat_rd.push(levels[seg_idx])
                    gstat_error.push(error[seg_idx])
                    gstat_baf.push(baf_info.mean)
                    gstat_lh.push(likelihoods[seg_idx])

                }

            });

            continue
        }
        
        // Third stage for call
        
        // let data = gstat_rd0.lengthn == 0 ?  gstat_rd_all: gstat_rd0 ;
        
        let points = parseInt(1000 * (1 - min_cell_fraction))
        if(points == 0){
            points = 1
        }
        let x = gUtils.linspace(min_cell_fraction, 1, points)
        let master_lh = {}
        let germline_lh = {}
        for(let cn=10; cn > -1; cn--){
            for(let h1=0; h1 < (cn/2+1); h1++){
                let h2 = cn - h1
                let mrd = x.map((v, idx) => {return 1-v +v*cn/2})
                let g_mrd = cn / 2
                let g_mbaf;
                let mbaf;
                if(cn > 0){
                    g_mbaf = 0.5 - (h1 / (h1 + h2))
                    mbaf = x.map((v, idx) => {return 0.5 - (1 - v + v * h1) / (2 - 2 * v + (h1 + h2) * v)})
                   
                }else{
                    g_mbaf = 0
                    mbaf =  x.map((v, idx) => {return 0*v})
                }
                
                for( let ei=0; ei < gstat_rd.length; ei++){
                        
                    let g_lh = normal(g_mrd * this.globalMean, 1, gstat_rd[ei], gstat_error[ei]) * likelihood_of_baf(gstat_lh[ei], 0.5 + g_mbaf)
                    if(ei in germline_lh){
                        germline_lh[ei].push([cn, h1, h2, g_lh, 1.0])
                    }else{
                        germline_lh[ei] = [cn, h1, h2, g_lh, 1.0]
                    }
                    let slh = 0
                    let max_lh = 0
                    let max_x = 0
                    mrd.forEach((mi, idx) => {
                        if(!isNaN(mbaf[idx])){
                            let tmpl = normal(mi * this.globalMean, 1, gstat_rd[ei], gstat_error[ei]) * likelihood_of_baf(gstat_lh[ei], 0.5 + mbaf[idx])
                            slh += tmpl
                            if(tmpl > max_lh){
                                max_lh = tmpl
                                max_x = x[idx]
                            }
                        }
                    });
                    if(ei in master_lh){
                        master_lh[ei].push([cn, h1, h2, slh / x.length, max_x])
                    }else{
                        master_lh[ei] = [cn, h1, h2, slh / x.length, max_x]
                    }
                }
                
                for( let ei=0; ei < gstat_rd.length; ei++){
                    if(event_type == "germline"){
                        master_lh[ei].sort((a, b) => a[3] - b[3]);
                    }
                    else{
                        master_lh[ei].sort((a, b) => a[3] - b[3]);
                        if(event_type == "both"){
                            
                            germline_lh[ei].sort((a, b) => a[3] - b[3]);
                            if(germline_lh[ei][0][3] > master_lh[ei][0][3]){
                                //let tmp_list = list(filter( lambda x: x[0] != germline_lh[ei][0][0] and x[1] != germline_lh[ei][0][1], master_lh[ei]))
                                let tmp_list = master_lh[ei].filter((x) => (x[0] != germline_lh[ei][0][0]) && (x[1] <= germline_lh[ei][0][1]))
                                // console.log('tmp_list', tmp_list)
                                // master_lh[ei] = [germline_lh[ei][0]] + tmp_list
                                master_lh[ei] = [germline_lh[ei][0]].push(...tmp_list)
                            }
                        }
                    }
                }
                let chr_calls;
                for( let ei=0; ei < gstat_rd.length; ei++){
                    let etype = "cnnloh"
                    let netype = 0
                    if(master_lh[ei][0][0] > 2){
                        etype = "duplication"
                        netype = 1
                    }
                    if(master_lh[ei][0][0] < 2){
                        etype = "deletion"
                        netype = -1
                    }
                    let cnv = gstat_rd[ei] / this.globalMean;
                    let rd_pval = t_dist.t_test_1_sample(this.globalMean, gstat_rd[ei], gstat_error[ei], gstat_n[ei])

                    // let pval = rd_pval * gstat_event[ei]["baf_pval"];
                    let lh_del = 0
                    let lh_loh = 0
                    let lh_dup = 0
                    // console.log(etype)

                }
                

                // break
            }
            
        }
        
        var rawbinScore = this.formatDataStructure(this.wigFeatures, 'binScore', this.globalMean)

        let gcCorrectedBinScore = [];
        if (this.gcFlag) {
            gcCorrectedBinScore = this.formatDataStructure(this.wigFeatures, 'gcCorrectedBinScore', this.globalMean);
        }
        var callScore = this.formatDataStructure(this.wigFeatures, 'segment_score', this.globalMean)
        
        return {binScore: rawbinScore, gcCorrectedBinScore: gcCorrectedBinScore, segmentScore: callScore}
        
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
    /*
    formatDataStructure_BAF(feature_column, scaling_factor = -1) {
        const baf1 = []
        const baf2 = []
        for (const [chr, wig] of Object.entries(this.wigFeatures)) {

            wig.forEach(sample => {
                
                var baf1_value = { ...sample }
                var baf2_value = { ...sample }
                
                let value = sample[feature_column]
                if (value != 0.5){
                    baf2_value.value = scaling_factor * (1 - value)
                    baf2.push(baf2_value)
                }
                baf1_value.value = scaling_factor * value
                baf1.push(baf1_value)
                    
            })
        }
        

        return [baf1, baf2]
    }*/
}

function arrayMax(arr) {
    return arr.reduce(function (p, v) {
      return ( p > v ? p : v );
    });
  }

/**
 * Normal distribution.
 * 
 * @param {float} x - Variable.
 * @param {float} a - area
 * @param {float} x0 -  Mean value
 * @param {float} sigma - Sigma
 * @returns {float} - Value of distribution in x.
 */
function normal(x, a, x0, sigma){
  
  return a * Math.exp(-1* (x - x0) ** 2 / (2 * sigma ** 2)) / Math.sqrt(2 * Math.PI) / sigma

}

/**
 *  Calculates two normal distributions overlap area.
 * 
 * @param {float} m1 - Mean value of the first distribution
 * @param {float} s1 - Sigma of the first distribution
 * @param {float} m2 - Mean value for second distribution
 * @param {float} s2 - Sigma of the second distribution
 * 
 * @returns {float} area - Area of overlap
 */
function normal_overlap_approx(m1, s1, m2, s2){
   
    return Math.exp(-1* (m1-m2)**2/ (s1**2+s2**2))
}


/**
 * Returns overlap area of two likelihood functions.
 * 
 * @param {*} lk1 - First likelihood function.
 * @param {*} lk2 - Second likelihood function.
 * 
 * @returns {float}  - Overlap area.
 */
function likelihood_overlap(likelihood_1, likelihood_2){
    // console.log(likelihood_1, likelihood_2)
    let sum;
    try{
        sum = likelihood_1.reduce((accumulator, currentValue, currentIndex) => {return accumulator + Math.min(currentValue, likelihood_2[currentIndex])});
    }catch{
        console.log("Failed to find likelihood overlap: ", likelihood_1, likelihood_2)
        return 0
    }

    return sum
}

/**
 * Calculates normal distribution that is product of two given normal distributions.
 * 
 * @param {float} m1 - Mean value of the first distribution
 * @param {float} s1 - Sigma of the first distribution
 * @param {float} m2 - Mean value for second distribution
 * @param {float} s2 - Sigma of the second distribution
 * @returns {Object} An object representing the first distribution
 * @property {float} nl - Mean value of the first distribution
 * @property {float} ne - Sigma of the first distribution
 */
function normal_merge(m1, s1, m2, s2){
   
    if((s1 == 0) && (s2 == 0)){
        return {nl: 0.5 * (m1 + m2), ne: 0}
    }
    else{
        return {nl: (m1 * s2 * s2 + m2 * s1 * s1) / (s1 * s1 + s2 * s2), ne: Math.sqrt(s1 * s1 * s2 * s2 / (s1 * s1 + s2 * s2))}
    }
}

/**
 * Calculates likelihood for given baf
 * @param {*} likelihood 
 * @param {*} baf 
 * @returns {float}  likelihood value
 */
function likelihood_of_baf(likelihood, baf){
   
    let bin = parseInt(baf * (likelihood.length - 1))
    let fr = baf * (likelihood.length - 1) - bin
    if(bin < likelihood.length - 1){
        return likelihood[bin] * (1 - fr) + likelihood[bin + 1] * fr
    }
    else{
        return likelihood[bin]
    }
}

/**
 * 
 * Calculates baf level and p-value for given likelihood function.
 * 
 * @param {*} likelihood 
 * @returns {Object} An object representing BAF
 * @property {float} mean  BAF level (difference from 1/2)
 * @property {float} p  p-value for event different than 1/2
 */
function likelihood_baf_pval(likelihood) {
    const res = likelihood.length;
    const max_lh = Math.max(...likelihood);
    let ix = likelihood.indexOf(max_lh);
    if (ix > Math.floor(res / 2)) {
      ix = res - 1 - ix;
    }
    const b = (res / 2 - ix) / (res + 1);
  
    const ix1 = Math.floor((res / 2 + ix) / 2);
    const ix2 = res - 1 - ix1;
    let p = likelihood.slice(ix1, ix2 + 1).reduce((acc, val) => acc + val, 0) / likelihood.reduce((acc, val) => acc + val, 0);
    if (ix === Math.floor(res / 2)) {
      p = 1.0;
    }
    return {mean:b, p:p};
  }

  export default {CombinedCaller}