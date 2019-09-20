const GenomicInterval = function (chr, start, end, features) {
    this.chr = chr;
    this.start = start;
    this.end = end;
    this.features = features;
}

GenomicInterval.prototype.contains = function (chr, start, end) {
    return this.chr === chr &&
        this.start <= start &&
        this.end >= end;
}

GenomicInterval.prototype.containsRange = function (range) {
    return this.chr === range.chr &&
        this.start <= range.start &&
        this.end >= range.end;
}

export default GenomicInterval;