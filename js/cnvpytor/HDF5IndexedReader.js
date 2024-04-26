import {openH5File} from "../../node_modules/hdf5-indexed-reader/dist/hdf5-indexed-reader.esm.js"


class SignalNames{
    /**
     * 
     * @param {string} chrom - chromosome name
     * @param {integer} bin_size - bin size
     */
    constructor(chrom, bin_size){
        this.chrom = chrom
        this.signal_bin_size = bin_size

        let rd_flag = ""
        this.signals = {
            'raw_RD': `his_rd_p_${this.chrom}_${this.signal_bin_size}${rd_flag}`,
            'gc_RD': `his_rd_p_${this.chrom}_${this.signal_bin_size}_GC`,
            'gc_partition' : `his_rd_p_${this.chrom}_${this.signal_bin_size}_partition_GC_merge`,
            'baf': `snp_likelihood_${this.chrom}_${this.signal_bin_size}_mask`,
            'baf_i1': `snp_i1_${this.chrom}_${this.signal_bin_size}_mask`,
            'Mosaic_segments' : `his_rd_p_${this.chrom}_${this.signal_bin_size}_partition_GC_mosaic_segments_2d`,
            'Mosaic_calls': `his_rd_p_${this.chrom}_${this.signal_bin_size}_partition_GC_mosaic_call_2d`
        }
    }
}


class HDF5Reader {
    /**
     * 
     * @param {string} h5_file - path for the pytor file
     * @param {integer} bin_size - bin size
     */
    constructor(h5_file, bin_size=100000){

        this.h5_file = h5_file;
        this.bin_size = bin_size;
        this.h5_obj = undefined
    }
    
    async fetch(){

        if(!this.h5_obj) {
            this.h5_obj = await openH5File({
                url: this.h5_file,
                fetchSize: 1000000,
                maxSize: 200000000
            })
        }
        return this.h5_obj
    }

    /**
     * 
     * @returns - a list of keys of the pytor file
     */
    async get_keys(){
        let h5_obj = await this.fetch();
        return h5_obj.keys
    }

    async get_rd_signal(bin_size=this.bin_size){

        let h5_obj = await this.fetch();
        
        this.h5_obj = h5_obj
        this.pytor_keys = h5_obj.keys

        // get available bin sizes
        let signal_bin = new ParseSignals(this.pytor_keys);
        let rd_bins = signal_bin.get_rd_bins()
        let snp_bins = signal_bin.get_snp_bins()

        // merge the bins get from two type of signals
        this.available_bins = [...new Set(rd_bins, snp_bins)]

        // check if the user provided bin is available, else set the last bin_size
        if(! this.available_bins.includes(bin_size)){
            bin_size = this.available_bins.at(-1);    
        }

        const chr_ds = await h5_obj.get("rd_chromosomes")
        const type = await chr_ds.dtype
        const t0 = Date.now()
        let rd_chromosomes = await chr_ds.value
        let rd_flag = ""

        // get rd stat
        let rd_stat = await this.rd_stat(bin_size)
        
        var wigFeatures = []
        var wigFeatures_gc = []
        var wigFeatures_rd_call_meanshift = []
        var wigFeatures_rd_call_combined = []
        var wigFeatures_baf1 = []
        var wigFeatures_baf2 = []

        for (let chrom of rd_chromosomes) {
            let signal_name_obj = new SignalNames(chrom, bin_size)

            // for normal rd signal
            // var signal_rd = `his_rd_p_${chrom}_${bin_size}${rd_flag}`
            var signal_rd = signal_name_obj.signals['raw_RD']
            let chr_wig = await this.get_chr_signal( chrom, bin_size, signal_rd, rd_stat)
            wigFeatures = wigFeatures.concat(chr_wig)
            
            // rd gc corrected
            // var signal_rd_gc = `his_rd_p_${chrom}_${bin_size}_GC`
            var signal_rd_gc = signal_name_obj.signals['gc_RD']
            let chr_wig_gc = await this.get_chr_signal(chrom, bin_size, signal_rd_gc, rd_stat)
            wigFeatures_gc = wigFeatures_gc.concat(chr_wig_gc)

            // rd call MeanShift
            
            // let signal_rd_call = `his_rd_p_${chrom}_${bin_size}_partition_GC_merge`
            let signal_rd_call = signal_name_obj.signals['gc_partition']
            let chr_wig_rd_call_meanshift = await this.get_chr_signal(chrom, bin_size, signal_rd_call, rd_stat)
            wigFeatures_rd_call_meanshift = wigFeatures_rd_call_meanshift.concat(chr_wig_rd_call_meanshift)
            
            let chr_wig_rd_call = await this.rd_call_combined(chrom, bin_size, rd_stat, signal_name_obj)
            wigFeatures_rd_call_combined = wigFeatures_rd_call_combined.concat(chr_wig_rd_call)

            // baf likelihood
            // let signal_baf_1 = `snp_likelihood_${chrom}_${bin_size}_mask`
            // let signal_baf_1 = signal_name_obj.signals['baf']
            // let chr_wig_bafs = await this.get_baf_signals(chrom, bin_size, signal_baf_1)
            
            // let signal_baf_1 = `snp_i1_${chrom}_${bin_size}_mask`
            let signal_baf_1 = signal_name_obj.signals['baf_i1']
            let chr_wig_bafs = await this.get_baf_signals_v2(chrom, bin_size, signal_baf_1)


            wigFeatures_baf1 = wigFeatures_baf1.concat(chr_wig_bafs[0])
            wigFeatures_baf2 = wigFeatures_baf2.concat(chr_wig_bafs[1])
            
        }
        this.callers = []
        if (wigFeatures_rd_call_combined.length != 0){
            this.callers.push('ReadDepth')
        }
        if (wigFeatures_rd_call_combined.length != 0){
            this.callers.push('2D')
        }

        var obj = {}
        var signal_obj = {
            "RD_Raw": wigFeatures,
            "RD_Raw_gc_coor" : wigFeatures_gc,
            "ReadDepth": wigFeatures_rd_call_meanshift,
            "2D": wigFeatures_rd_call_combined,
            "BAF1": wigFeatures_baf1,
            "BAF2": wigFeatures_baf2
        }
        obj[bin_size] = signal_obj
        return obj
    }

    decode_segments(segments_arr){
        let max = 2 ** 32 - 1
        let segments = []
        let l = []
        for (let x of segments_arr){
            if(x == max){
                segments.push(l)
                l = []
            } else{
                l.push(x)
            }
        }
        return segments
    }

    async  rd_call_combined(chrom, bin_size, rd_stat, signal_name_obj){
        let chr_wig = [];
        
        let segments
        // let mosaic_call_segments = `his_rd_p_${chrom}_${bin_size}_partition_GC_mosaic_segments_2d`
        let mosaic_call_segments = signal_name_obj.signals['Mosaic_segments']
        if (this.pytor_keys.includes(mosaic_call_segments)){
            const chrom_dataset = await this.h5_obj.get(mosaic_call_segments)
            const t0 = Date.now()
            let chrom_data = await chrom_dataset.value
            segments = this.decode_segments(chrom_data)
            
        }

        // let mosaic_calls = `his_rd_p_${chrom}_${bin_size}_partition_GC_mosaic_call_2d`
        let mosaic_calls = signal_name_obj.signals['Mosaic_calls']
        if (this.pytor_keys.includes(mosaic_calls)){
            const segments_call_dataset = await this.h5_obj.get(mosaic_calls)
            let segments_call = await segments_call_dataset.to_array() //create_nested_array(value, shape)
            segments.forEach((ind_segment, segment_idx) => {
                ind_segment.forEach((bin_value, bin_idx) =>{
                    chr_wig.push({chr:chrom, start: bin_value*bin_size, end: (bin_value+1) * bin_size, value: (segments_call[0][segment_idx]/rd_stat[4]) *2})
                })
            })
        }

        return chr_wig
        
    }
    
    /**
     * returns a list for rd statistics information 
     * @param {integer} bin_size - bin_size 
     * @returns - array - read depth statistics array
     */
    async rd_stat(bin_size){
    
        let rd_stat_signal =  `rd_stat_${bin_size}_auto`
        let rd_stat;
        
        if (this.pytor_keys.includes(rd_stat_signal)){
            const rd_stat_dataset = await this.h5_obj.get(rd_stat_signal)
            const t0 = Date.now()
            rd_stat = await rd_stat_dataset.value
            //console.log(`rd_stat_signal ${rd_stat_signal}  ${Date.now() - t0}`)
        }
        return rd_stat
    }

    
    async get_chr_signal(chrom, bin_size, signal_name, rd_stat){
        /* return a list of dictionary for a chromosome */
        let chr_wig = [];
        
        if (this.pytor_keys.includes(signal_name)){
            const chrom_dataset = await this.h5_obj.get(signal_name)
            
            let chrom_data = await chrom_dataset.value
            //console.log(`chr_signal ${signal_name}  ${Date.now() - t0}`)
            chrom_data.forEach((bin_value, bin_idx) => {
                chr_wig.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: (bin_value/rd_stat[4]) *2})
            });
        }
        return chr_wig
    }

    async get_baf_signals(chrom, bin_size, signal_name, scaling_factor = -1){
        /* return two list of dictionary*/
        let chr_wig_1 = [];
        let chr_wig_2 = [];
        if (this.pytor_keys.includes(signal_name)){
            let chrom_dataset = await this.h5_obj.get(signal_name)
            let chrom_data = await chrom_dataset.to_array() //create_nested_array(value, shape)
            chrom_data.forEach((bin_value, bin_idx) => {
                let max_value =  Math.max(...bin_value);
                const res = bin_value.indexOf(max_value);
                let lh = Math.max(res / 200, 1 - res / 200);
                chr_wig_1.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: scaling_factor * lh})
                if(lh != 0.5){
                    chr_wig_2.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: scaling_factor *(1-lh)})
                }
            });
        }
        return [chr_wig_1, chr_wig_2]
    }

    async get_baf_signals_v2(chrom, bin_size, signal_name, scaling_factor = -1){
        
        /* return two list of dictionary*/
        let chr_wig_1 = [];
        let chr_wig_2 = [];
        if (this.pytor_keys.includes(signal_name)){
            let chrom_dataset = await this.h5_obj.get(signal_name)
            let chrom_data = await chrom_dataset.to_array() //create_nested_array(value, shape)
            chrom_data.forEach((lh, bin_idx) => {
                if (!isNaN(lh)){
                    chr_wig_1.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: scaling_factor * ( 0.5 - lh )})
                    if(lh != 0.5){
                        chr_wig_2.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: scaling_factor * ( 0.5 + lh )})
                    }
                }
            });
        }
        //console.log(chrom, chr_wig_1, chr_wig_2)
        return [chr_wig_1, chr_wig_2]

    }
}

class ParseSignals{

    /**
     * Parse a signal names
     * 
     * @param {*} signals - List of keys in pytor files 
     */
    constructor(signals){
        this.signals = signals
    }

    /**
     * 
     * @returns - return list of rd bins
     */
    get_rd_bins(){
        let rd_keys = [];
        this.signals.forEach( val => {
            let match = val.match(/^his_rd_p_(.*)_(\d+)$/);
            if(match){
                rd_keys.push({chr:match[1], bin_size:match[2]})
            }});
        const rd_bins = [...new Set(rd_keys.map(item => Number(item.bin_size)))];
        return rd_bins
    }

    /**
     * 
     * @returns - return list of snp bins
     */
    get_snp_bins(){
        
        let slected_signals = [];
        this.signals.forEach( val => {
            let match = val.match(/^snp_likelihood_(.*)_(\d+)_mask$/);
            if(match){
                slected_signals.push({chr:match[1], bin_size:match[2]})
            }});
        const bins = [...new Set(slected_signals.map(item => Number(item.bin_size)))];
        return bins
    }
}

function fixString(strings) {

    return strings.map(s => s.substr(0,s.indexOf('\0')))

}

// function to_array(value, shape) {
//     const { json_value, metadata } = this;
//     const { shape } = metadata;
//     if (!isIterable(json_value) || typeof json_value === "string") {
//         return json_value;
//     }
//     let nested = create_nested_array(json_value, shape);
//     return nested;
// }

function create_nested_array(value, shape) {
    // check that shapes match:
    const total_length = value.length;
    const dims_product = shape.reduce((previous, current) => (previous * current), 1);
    if (total_length !== dims_product) {
        console.warn(`shape product: ${dims_product} does not match length of flattened array: ${total_length}`);
    }
    // Get reshaped output:
    let output = value;
    const subdims = shape.slice(1).reverse();
    for (let dim of subdims) {
        // in each pass, replace input with array of slices of input
        const new_output = [];
        const { length } = output;
        let cursor = 0;
        while (cursor < length) {
            new_output.push(output.slice(cursor, cursor += dim));
        }
        output = new_output;
    }
    return output;
}



export default HDF5Reader
