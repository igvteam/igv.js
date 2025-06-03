function inferTrackType(format) {
    if (format) {
        switch (format.toLowerCase()) {
            case "bed":
            case "bigbed":
            case "bb":
            case "biggenepred":
            case "bignarrowpeak":
            case "gff":
            case "gtf":
            case "gff3":
            case "bedgraph":
            case "bedpe":
            case "narrowpeak":
            case "broadpeak":
            case "peaks":
            case "genePred":
            case "genePredExt":
            case "rmsk":
            case "vcf":
            case "gtexgwas":
                return "feature"
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
    if ("bed" === config.type) {
        config.type = "feature"
        config.format = config.format || "bed"
    } else if ("annotations" === config.type) {
        config.type = "feature"
    }
}

export {
    inferTrackType,
    translateDeprecatedTypes
}
