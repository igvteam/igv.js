import getDataWrapper from "../feature/dataWrapper.js";

/**
 * Parser for IGV desktop GWAS files.  See http://software.broadinstitute.org/software/igv/GWAS
 */
class GWASParser {

    constructor() {
        // Defaults - can be overriden by header
        this.posCol = 2;
        this.chrCol = 1;
        this.pvalueCol = 3;
        this.snpCol = 0;
    }

    parseHeader(data) {
        const dataWrapper = getDataWrapper(data);
        const headerLine = dataWrapper.nextLine();
        return this.parseHeaderLine(headerLine);
    }

    parseHeaderLine(headerLine) {
        this.columns = headerLine.split(/\t/);
        for (let i = 0; i < this.columns.length; i++) {
            const c = this.columns[i].toLowerCase();
            switch (c) {
                case 'chr':
                case 'chromosome':
                    this.chrCol = i;
                    break;
                case 'bp':
                case 'pos':
                case 'position':
                    this.posCol = i;
                    break;
                case 'snp':
                case 'rs':
                case 'rsid':
                case 'rsnum':
                case 'id':
                case 'marker':
                case 'markername':
                    this.SNPcol = i;
                    break;
                case 'p':
                case 'pval':
                case 'pvalue':
                case 'p-value':
                case 'p.value':
                    this.pvalueCol = i;
                    break;
            }
        }
        return this.columns;
    }

    parseFeatures(data) {
        if (!data) return null;
        const dataWrapper = getDataWrapper(data);
        const allFeatures = [];
        const headerLine = dataWrapper.nextLine();
        if (!this.columns) {
            this.parseHeaderLine(headerLine);
        }

        let line;
        while (line = dataWrapper.nextLine()) {
            const tokens = line.split(/\t/);
            const chr = tokens[this.chrCol];
            const start = parseInt(tokens[this.posCol]) - 1;
            const end = start + 1;
            const value = parseFloat(tokens[this.pvalueCol]);
            const snpID = tokens[this.snpCol];
            allFeatures.push({
                chr: chr,
                start: start,
                end: end,
                value: value,
                name: snpID,
            });
        }
        return allFeatures;
    }
}

export default GWASParser

