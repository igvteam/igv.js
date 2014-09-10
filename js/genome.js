var igv = (function (igv) {

    igv.Genome = function (chromosomeNames, chromosomes) {
        this.chromosomeNames = chromosomeNames;
        this.chromosomes = chromosomes;  // An object (functions as a dictionary)
    }

    igv.Genome.prototype.getChromosome = function (chr) {
        return this.chromosomes[chr];
    }

    igv.Genome.prototype.getChromosomes = function () {
        return this.chromosomes;
    }

    igv.Chromosome = function (name, order, cytobands) {
        this.name = name;
        this.order = order;
        this.cytobands = cytobands;
        if (cytobands) {
            var len = cytobands.length;
            if (len > 0) {
                this.bpLength = cytobands[len - 1].end;
            }
        }
    }

    igv.Cytoband = function (start, end, name, typestain) {
        this.start = start;
        this.end = end;
        this.label = name;
        this.stain = 0;

        // Set the type, either p, n, or c
        if (typestain == 'acen') {
            this.type = 'c';
        } else {
            this.type = typestain.charAt(1);
            if (this.type == 'p') {
                this.stain = parseInt(typestain.substring(4));
            }
        }
    }

    igv.GenomicInterval = function (chr, start, end, features) {
        this.chr = chr;
        this.start = start;
        this.end = end;
        this.features = features;
    }

    igv.GenomicInterval.prototype.contains = function (chr, start, end) {
        return this.chr == chr &&
            this.start <= start &&
            this.end >= end;
    }


    /**
     * Return the official chromosome name for the (possibly) alias.  Deals with
     * 1 <-> chr1,  chrM <-> MT,  IV <-> chr4, etc.  Hardcoded currently for UCSC human genomes.
     * @param str
     */
    igv.chrAliasTable = {};
    igv.chrAliasTable.getChromosomeName = function (str) {
        var chr = igv.chrAliasTable[str];
        if (chr) return chr;
        else return str;
    }
    for (var i = 0; i < 22; i++) {
        igv.chrAliasTable[i] = "chr" + i;
        igv.chrAliasTable[23] = "chrX";
        igv.chrAliasTable[24] = "chrY";
        igv.chrAliasTable["X"] = "chrX";
        igv.chrAliasTable["Y"] = "chrY";
        igv.chrAliasTable["MT"] = "chrM";
    }

    igv.loadGenome = function (url, continuation) {

        igv.loadData(url, function (data) {

            var chromosomes = {},
                chromosomeNames = [],
                tmpCytoboands = {},
                bands = [],
                lastChr,
                n = 0,
                c = 1,
                lines = data.split("\n"),
                len = lines.length;

            for (var i = 0; i < len; i++) {
                var tokens = lines[i].split("\t");
                var chr = tokens[0];
                if (!lastChr) lastChr = chr;

                if (chr != lastChr) {

                    chromosomeNames.push(lastChr);

                    chromosomes[lastChr] = new igv.Chromosome(lastChr, c, bands);

                    tmpCytoboands[lastChr] = bands;
                    bands = [];
                    lastChr = chr;
                    n = 0;
                    c++;
                }

                if (tokens.length == 5) {
                    //10	0	3000000	p15.3	gneg
                    var chr = tokens[0];
                    var start = parseInt(tokens[1]);
                    var end = parseInt(tokens[2]);
                    var name = tokens[3];
                    var stain = tokens[4];
                    bands[n++] = new igv.Cytoband(start, end, name, stain);
                }
            }

            continuation(new igv.Genome(chromosomeNames, chromosomes));
        });
    }

    return igv;

})(igv || {});

