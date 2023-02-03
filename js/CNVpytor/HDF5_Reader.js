import h5wasm from "https://cdn.jsdelivr.net/npm/h5wasm@0.4.9/dist/esm/hdf5_hl.js";


class Read_HDF5{
    
    constructor(h5_file, bin_size=100000){
        /* 
        Reads a cnvytor file

        parameters
        -------------
        h5_file: cnvpytor file   
        */
        this.h5_file = h5_file;
        this.bin_size = bin_size;
        this.random_name = "pytor_" + make_random_id(10) + ".h5"
        
    }
    
    async fetch(){
        /* return a h5 object */

        // the WASM loads asychronously, and you can get the module like this:
        const Module = await h5wasm.ready;

        // then you can get the FileSystem object from the Module:
        const { FS } = Module;
        let response = await fetch(this.h5_file)
        let ab = await response.arrayBuffer();
        FS.writeFile(this.random_name, new Uint8Array(ab));
        let f = new h5wasm.File(this.random_name, "r");
        return f
        
    }
    async get_keys(){
        /* returns a list of keys of the pytor file*/
        let h5_obj = await this.fetch();
        return h5_obj.keys()
    }

    async get_rd_signal(bin_size=this.bin_size){
        let h5_obj = await this.fetch();
        let h5_obj_keys = h5_obj.keys();

        // console.log(h5_obj_keys)

        let signal_bin = new ParseSignals(h5_obj_keys);
        this.rd_bins = signal_bin.get_rd_bins()

        
        // let bin_size = this.bin_size
        if(! this.rd_bins.includes(bin_size)){
            bin_size = this.rd_bins[rd_bins.length-1];    
        }
        
        let rd_chromosomes = h5_obj.get("rd_chromosomes").value
        let rd_flag = ""

        // get rd stat
        let rd_stat = this.rd_stat(h5_obj, h5_obj_keys, bin_size)
        
        var wigFeatures = []
        var wigFeatures_gc = []
        var wigFeatures_rd_call_meanshift = []
        var wigFeatures_rd_call_combined = []
        var wigFeatures_baf1 = []
        var wigFeatures_baf2 = []

        for (let chrom of rd_chromosomes) {
            // for normal rd signal
            var signal_rd = `his_rd_p_${chrom}_${bin_size}${rd_flag}`
            let chr_wig = this.get_chr_signal(h5_obj, h5_obj_keys, chrom, bin_size, signal_rd, rd_stat)
            wigFeatures = wigFeatures.concat(chr_wig)
            
            // rd gc corrected
            var signal_rd_gc = `his_rd_p_${chrom}_${bin_size}_GC`
            let chr_wig_gc = this.get_chr_signal(h5_obj, h5_obj_keys, chrom, bin_size, signal_rd_gc, rd_stat)
            wigFeatures_gc = wigFeatures_gc.concat(chr_wig_gc)

            // rd call MeanShift
            
            let signal_rd_call = `his_rd_p_${chrom}_${bin_size}_partition_GC_merge`
            let chr_wig_rd_call_meanshift = this.get_chr_signal(h5_obj, h5_obj_keys, chrom, bin_size, signal_rd_call, rd_stat)
            wigFeatures_rd_call_meanshift = wigFeatures_rd_call_meanshift.concat(chr_wig_rd_call_meanshift)
            
            let chr_wig_rd_call = this.rd_call_combined(h5_obj, h5_obj_keys, chrom, bin_size, rd_stat)
            wigFeatures_rd_call_combined = wigFeatures_rd_call_combined.concat(chr_wig_rd_call)

            // baf likelihood
            let signal_baf_1 = `snp_likelihood_${chrom}_${bin_size}_mask`
            let chr_wig_bafs = this.get_baf_signals(h5_obj, h5_obj_keys, chrom, bin_size, signal_baf_1)

            wigFeatures_baf1 = wigFeatures_baf1.concat(chr_wig_bafs[0])
            wigFeatures_baf2 = wigFeatures_baf2.concat(chr_wig_bafs[1])
            // this.rd_call_combined(h5_obj, h5_obj_keys, chrom, bin_size, rd_stat)
        }
        this.callers = []
        if (wigFeatures_rd_call_combined.length != 0){
            this.callers.push('MeanShift')
        }
        if (wigFeatures_rd_call_combined.length != 0){
            this.callers.push('Combined')
        }

        var obj = {}
        var signal_obj = {
            "RD_Raw": wigFeatures,
            "RD_Raw_gc_coor" : wigFeatures_gc,
            "MeanShift": wigFeatures_rd_call_meanshift,
            "Combined": wigFeatures_rd_call_combined,
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
    rd_call_combined(h5_obj, h5_obj_keys, chrom, bin_size, rd_stat){
        let chr_wig = [];
        
        let segments
        let mosaic_call_segments = `his_rd_p_${chrom}_${bin_size}_partition_GC_mosaic_segments_2d`
        if (h5_obj_keys.includes(mosaic_call_segments)){
            let chrom_data = h5_obj.get(mosaic_call_segments).value
            segments = this.decode_segments(chrom_data)
            
        }

        let mosaic_calls = `his_rd_p_${chrom}_${bin_size}_partition_GC_mosaic_call_2d`
        if (h5_obj_keys.includes(mosaic_calls)){
            let segments_call = h5_obj.get(mosaic_calls).to_array()
            segments.forEach((ind_segment, segment_idx) => {
                ind_segment.forEach((bin_value, bin_idx) =>{
                    chr_wig.push({chr:chrom, start: bin_value*bin_size, end: (bin_value+1) * bin_size, value: (segments_call[0][segment_idx]/rd_stat[4]) *2})
                })
            })
        }

        return chr_wig
        
    }
    rd_stat(h5_obj, h5_obj_keys, bin_size){
        /* 
        returns a list for rd statistics information 
        paramter
        ---------
        h5_obj: cnvpytor read object
        h5_obj_keys: a list of available signal names
        bin_size: bin size
        
        */
        
        let rd_stat_signal =  `rd_stat_${bin_size}_auto`
        let rd_stat;
        if (h5_obj_keys.includes(rd_stat_signal)){
            rd_stat = h5_obj.get(rd_stat_signal).value
        }
        return rd_stat
    }

    
    get_chr_signal(h5_obj, h5_obj_keys, chrom, bin_size, signal_name, rd_stat){
        /* return a list of dictionary for a chromosome */
        let chr_wig = [];
        
        if (h5_obj_keys.includes(signal_name)){
            let chrom_data = h5_obj.get(signal_name).value
            chrom_data.forEach((bin_value, bin_idx) => {
                chr_wig.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: (bin_value/rd_stat[4]) *2})
            });
        }
        return chr_wig
    }
    get_baf_signals(h5_obj, h5_obj_keys, chrom, bin_size, signal_name){
        /* return two list of dictionary*/
        let chr_wig_1 = [];
        let chr_wig_2 = [];
        if (h5_obj_keys.includes(signal_name)){
            let chrom_data = h5_obj.get(signal_name).to_array();
            chrom_data.forEach((bin_value, bin_idx) => {
                let max_value =  Math.max(...bin_value);
                const res = bin_value.indexOf(max_value);
                let lh = Math.max(res / 200, 1 - res / 200);
                chr_wig_1.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: -2 * lh})
                if(lh != 0.5){
                    chr_wig_2.push({chr:chrom, start: bin_idx*bin_size, end: (bin_idx+1) * bin_size, value: -2 *(1-lh)})
                }
            });
        }
        return [chr_wig_1, chr_wig_2]
    }
}

class ParseSignals{
    constructor(signals){
        /*
        Parse a signal names

        parameter
        ---------
        signals: List of keys in pytor files
        */
        this.signals = signals
    }
    get_rd_bins(){
        /* return list of rd bins */
        let rd_keys = [];
        this.signals.forEach( val => {
            let match = val.match(/^his_rd_p_(.*)_(\d+)$/);
            if(match){
                rd_keys.push({chr:match[1], bin_size:match[2]})
            }});
        const rd_bins = [...new Set(rd_keys.map(item => Number(item.bin_size)))];
        return rd_bins
    }

    get_snp_bins(){
        /* return list of snp bins */
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

function make_random_id(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}



export default {Read_HDF5};
