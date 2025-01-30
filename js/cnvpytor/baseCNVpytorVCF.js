
import {BGZip, igvxhr, StringUtils} from "../../node_modules/igv-utils/src/index.js"
import lm from '../vendor/lm-esm.js'


class FitingMethod {
    /**
     * 
     * @param {*} binScores ; array containing list of rd values
     */
    constructor(binScores) {
        this.binScores = binScores
    }

    get_histogram(){
        /**
         * Get the 2D histogram of the array.
        */

        let max_bin = Math.max(...this.binScores);
        let rd_bin_size = Math.floor(max_bin / 1000);
        let rd_bins = this.range(0, Math.floor(max_bin / rd_bin_size) * rd_bin_size + rd_bin_size, rd_bin_size);
        const { counts, bins } = this.histogram(this.binScores, rd_bins);
        return { counts, bins };
    }

    range(start, end, step) {
        const result = [];
        for (let i = start; i < end; i += step) {
            result.push(i);
        }
        return result;
    }
    
    histogram(data, bins) {
        const counts = Array(bins.length).fill(0);
      
        data.forEach(value => {
            for (let i = 0; i < bins.length - 1; i++) {
                if (value >= bins[i] && value < bins[i + 1]) {
                    counts[i]++;
                    break;
                }
            }
        });
      
        return { counts, bins };
    }

    normal_distribution([a, x0, sigma]) {
        /**
         * Normal distribution.
         *
         * @param {number} a - Area.
         * @param {number} x0 - Mean value.
         * @param {number} sigma - Sigma.
         * @returns {number} - Value of distribution at x.
         */
        // console.log('Model Parameters', a, x0, sigma)
        return (x) => a * Math.exp(-Math.pow(x - x0, 2) / (2 * Math.pow(sigma, 2))) / (Math.sqrt(2 * Math.PI) * sigma);
    }

    get_initial_model_values(x, y){
        /**
         * calculate the initial values for the normal distribution
         * x: The x values of the data.
         * y: The y values of the data.
         * return [area, mean, sigma]: The initial values for the normal distribution.
         */
        
        const sumY = y.slice(1, -1).reduce((acc, val) => acc + val, 0);
        if (sumY === 0) {
            console.debug("Problem with fit: all data points have zero value. Return zeros instead fit parameters!");
            return [0, 0, 0], null;
        }
        // calculate area
        const bin_width = x[1] - x[0];
        const area =  bin_width * sumY;
    
        // Calculate the mean
        const weightedSum = x.reduce((acc, val, idx) => acc + val * y[idx], 0);
        const mean = weightedSum / sumY;
    
        // Calculate the sigma
        const weightedSquareSum = x.reduce((acc, val, idx) => acc + y[idx] * Math.pow(val - mean, 2), 0);
        const sigma = Math.sqrt(weightedSquareSum / sumY);
        // console.log('Initial Model Parameters', area, mean, sigma)
        return [area, mean, sigma];
    }

    normal_fit(x, y) {
        /**
         * Fit a normal distribution to the histogram using levenberg-marquardt algorithm.
         * x: The x values of the data.
         * y: The y values of the data.
         * return model: The model of the normal distribution.
         */

        // Initial values were calculated for arithmetic mean and standard deviation. 
        let initialValues = this.get_initial_model_values(x, y);
        
        // paramters for the levenberg-marquardt algorithm
        const options = {
          initialValues: initialValues,
          maxIterations: 100,
        }

        // Fit the model
        const model = lm({x, y}, this.normal_distribution, options);
    
        return model;
    }

}

class FetchGCInfo {
    /**
     * Creates an instance of gcCorrection.
     * @param {number} binSize - binSize
     * @param {string} refGenome - Reference genome name.
     */
    constructor(binSize, refGenome){
        this.binSize = binSize
        this.refGenome = refGenome

        // Determine the appropriate GC bin size
        this.gcBin = this.getGCbinSize()
    }

    /**
     * Determines the appropriate GC bin size.
     * @returns {number|boolean} The GC bin size or false if not found.
     */
    getGCbinSize(){
        for (let gcBin of [100000, 10000]){
            // Check if the binSize is a multiple of the current gcBin
            if (this.binSize % gcBin == 0) return gcBin;
        }
        // Return false if no appropriate GC bin size is found
        return false
    }

    /**
     * Fetches GC values for a predefined gc bin sizes (i.e., 10k, 100k) from a remote JSON file.
     * @returns {Object} The GC values.
     */
    async getBinGC(){
        const gcData = {};

        // If no appropriate GC bin size is found, return an empty object
        if (!this.gcBin) {
            return gcData;
        }
       
        // URL for the GC info JSON file
        const gcInfoURL = 'https://storage.googleapis.com/cnvpytor_data/gcInfoData/GCinfo.json'
        
        try {
            // Load the GC info JSON file
            const gcInfoJson = await igvxhr.loadJson(gcInfoURL, {timeout: 5000})

            // Find the reference genome data within the JSON file
            const gcRef = gcInfoJson.find(item => item.id === this.refGenome);
            if (!gcRef){
                console.warn("GC data not found for ", this.refGenome);
                return gcData;
            }
            
            // Find the matching bin size data
            const matchingInfo = gcRef.Bins.find(bin => bin.BinSize === this.gcBin);
            if (!matchingInfo) {
                console.warn("GC data not found for ", this.refGenome, " Bin : ", this.gcBin);
                return gcData;
            }

            // Construct the URL to fetch the GC data file
            const parentDirectory = gcInfoURL.split('/').slice(0, -1).join('/');
            let gcURL = `${parentDirectory}${matchingInfo.fileURL}`;
            
            // Fetch the GC data file
            const data = await igvxhr.load(gcURL, {});

            // Parse the GC data file and populate the gcData object
            data.split("\n").forEach((row) => {
                if (row.trim() !== "") {
                const [refName, start, gcContent, gcCount, atCount] = row.split("\t");
                if (!gcData[refName]) {
                    gcData[refName] = [];
                }
                gcData[refName].push({
                    start: +start,
                    gcContent: +gcContent,
                    gcCount: +gcCount,
                    atCount: +atCount,
                });
                }
            });

        } catch(e){
            console.error(e);
            console.warn("Errors loading GC correction data.");
        }
        
        return gcData;

    }

}


class baseCNVpytorVCF extends FetchGCInfo {
    /**
     * Class for gcCorrection 
     * 
     * @param {*} wigFeatures 
     * @param {*} binSize 
     * @param {*} refGenome 
     */
    constructor(wigFeatures, binSize, refGenome){
        super(binSize, refGenome)
        this.wigFeatures = wigFeatures
        this.binSize = binSize
        this.refGenome = refGenome
        
    }
    async apply_gcCorrection(){
        // applying fitting method and defineing the variables
        if (!this.wigFeatures) {
            console.error("BinScore data is not available.");
            return null;
        }
        
        // Extract all binScore values into a single array
        const binScores = Object.values(this.wigFeatures).reduce(
            (binResult, bin) => { return binResult.concat(bin.filter(a => a.binScore > 0).map(a => a.binScore)) }, []
        )

        let data_fitter = new FitingMethod(binScores)

        const { counts: dist_p, bins } = data_fitter.get_histogram()
        let model_parameters = data_fitter.normal_fit(bins, dist_p)
        // return { globalMean: model_parameters.parameterValues[1], globalStd: model_parameters.parameterValues[2]}
        this.globalMean = model_parameters.parameterValues[1]
        this.globalStd = model_parameters.parameterValues[2]
        // console.log("globalmean", this.globalMean)

        
        this.gcData = await this.getBinGC()
        this.gcFlag =  Object.keys(this.gcData).length > 0 ? true : false; // Flag indicating whether GC data is available
        this.binScoreField = this.gcFlag ? "gcCorrectedBinScore": "binScore" ;

        this.getGcCorrectionSignal(this.globalMean)
        
    }

    /**
     * Applies GC correction to the bin scores.
     * @param {number} rdGlobalMean - The global mean read depth.
     */
    getGcCorrectionSignal(rdGlobalMean){
        let gcRDMean = this.getGcCorrection(rdGlobalMean)
        Object.keys(this.wigFeatures).forEach(chr => {
            this.wigFeatures[chr].forEach(bin => {
                    if (bin.binScore){
                        bin.gcCorrectedBinScore = Math.round(gcRDMean[bin.gc] * bin.binScore)
                    }else{
                        bin.gcCorrectedBinScore = null
                    }
                }
            );
        });
    }

    /**
     * Computes the GC correction values based on the global mean read depth.
     * @param {number} rdGlobalMean - The global mean for read depth.
     * @returns {Object} An object containing the GC correction values indexed by GC percentage.
     */
    getGcCorrection(rdGlobalMean){
        
        const gcRDMean = {}
        if(this.gcFlag){
            let gcBin = this.getGCbinSize()
            const gcRD = {};
            
            let gcBinFactor = parseInt(this.binSize/gcBin)
            for (let chr in this.wigFeatures){
                for (let k=0; k< this.wigFeatures[chr].length; k++){
                    
                    // collect GC related values  for a bin 
                    let baseInfo = {'AT': 0, 'GC': 0}
                    for (let j = k * gcBinFactor; j < k * gcBinFactor + gcBinFactor; j++){
                        if (this.gcData[chr][j]){
                            baseInfo['GC'] += this.gcData[chr][j].gcCount
                            baseInfo['AT'] += this.gcData[chr][j].atCount
                        }
                    }

                    let gcValue = Math.round((baseInfo['GC'] * 100)/(baseInfo['GC'] + baseInfo['AT']))

                    this.wigFeatures[chr][k].gc = gcValue
                    if (!gcRD[gcValue]) {
                        gcRD[gcValue] = [];
                    }
                    if (this.wigFeatures[chr][k].binScore){
                        gcRD[gcValue].push(this.wigFeatures[chr][k].binScore)
                    }
                }
            }
            
            // get average rd for bins that has same gc content
            Object.keys(gcRD).forEach(gc_value => {
                
               // apply fitting method to get the gc average
                let gcRDBins = gcRD[gc_value]
                let gcMean 
                if(gcRDBins.length < 4){
                    gcMean = gcRDBins.reduce((sum, val) => sum + val, 0) / gcRDBins.length;
                }else{
                    let data_fitter = new FitingMethod(gcRD[gc_value])

                    const { counts: dist_p, bins } = data_fitter.get_histogram()
                    let model_parameters = data_fitter.normal_fit(bins, dist_p)
                    gcMean = model_parameters.parameterValues[1]
                }
               gcRDMean[gc_value] = rdGlobalMean/gcMean

            });
        
        }
        return gcRDMean
    }

    /**
     * Formats the data structure for output.
     * @param {string} feature_column - The column name of the feature to be scaled.
     * @param {number} [scaling_factor=1] - The factor by which to scale the feature values.
     * @returns {Array} The formatted data structure.
     */
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
    }
    
    
      
}

export default baseCNVpytorVCF;
