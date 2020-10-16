class BamFilter {
    constructor(options) {
        if (!options) options = {};
        this.vendorFailed = options.vendorFailed === undefined ? true : options.vendorFailed;
        this.duplicates = options.duplicates === undefined ? true : options.duplicates;
        this.secondary = options.secondary || false;
        this.supplementary = options.supplementary || false;
        this.mqThreshold = options.mqThreshold === undefined ? 0 : options.mqThreshold;
        if (options.readgroups) {
            this.readgroups = new Set(options.readgroups);
        }
    }

    pass(alignment) {
        if (this.vendorFailed && alignment.isFailsVendorQualityCheck()) return false;
        if (this.duplicates && alignment.isDuplicate()) return false;
        if (this.secondary && alignment.isSecondary()) return false;
        if (this.supplementary && alignment.isSupplementary()) return false;
        if (alignment.mq < this.mqThreshold) return false;
        if (this.readgroups) {
            var rg = alignment.tags()['RG'];
            return this.readgroups.has(rg);
        }
        return true;
    }
}

export default BamFilter
