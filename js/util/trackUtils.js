

function inferTrackType(format) {

    if (format) {
        switch (format.toLowerCase()) {
            case "bw":
            case "bigwig":
            case "wig":
            case "bedgraph":
            case "tdf":
                return "wig"
            case "vcf":
                return "variant"
            case "seg":
                return "seg"
            case "mut":
            case "maf":
                return "mut"
            case "bam":
            case "cram":
                return "alignment"
            case "hiccups":
            case "bedpe":
            case "bedpe-loop":
            case "biginteract":
                return "interact"
            case "bp":
                return "arc"
            case "gwas":
                return "gwas"
            case "bed":
            case "bigbed":
            case "bb":
            case "biggenepred":
            case "bignarrowpeak":
                return "bedtype"
            case "fasta":
                return "sequence"
            case "pytor":
                return "cnvpytor"
            case "qtl":
                return "qtl"
            default:
                return "annotation"
        }
    }
}

function translateDeprecatedTypes(config) {

    if (config.featureType) {  // Translate deprecated "feature" type
        config.type = config.type || config.featureType
        config.featureType = undefined
    }
    if ("junctions" === config.type) {
        config.type = "junction"
    } else if ("bed" === config.type) {
        config.type = "annotation"
        config.format = config.format || "bed"
    } else if ("annotations" === config.type) {
        config.type = "annotation"
    } else if ("alignments" === config.type) {
        config.type = "alignment"
    } else if ("bam" === config.type) {
        config.type = "alignment"
        config.format = "bam"
    } else if ("vcf" === config.type) {
        config.type = "variant"
        config.format = "vcf"
    } else if ("t2d" === config.type) {
        config.type = "gwas"
    } else if ("FusionJuncSpan" === config.type && !config.format) {
        config.format = "fusionjuncspan"
    } else if ("aed" === config.type) {
        config.type = "annotation"
        config.format = config.format || "aed"
    }
}


export {
    inferTrackType,
    translateDeprecatedTypes
}
