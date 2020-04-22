import getDataWrapper from "../feature/dataWrapper.js";

/**
 * Parser for IGV desktop GWAS files.  See http://software.broadinstitute.org/software/igv/GWAS
 */
class GWASParser {

    constructor(config) {
        // Defaults - can be overriden by header
        this.config = config;
        if (config.columns) {
            if (config.columns.chromosome === undefined ||
                config.columns.position === undefined ||
                config.columns.value === undefined) {
                throw Error("columns property must define chrCol, posCol, and valueCol");
            }
            this.posCol = config.columns.position - 1;
            this.chrCol = config.columns.chromosome - 1;
            this.pvalueCol = config.columns.value - 1;
        } else {
            // Defaults -- can be overriden in header
            this.posCol = 2;
            this.chrCol = 1;
            this.pvalueCol = 3;
        }
    }

    parseHeader(data) {
        const dataWrapper = getDataWrapper(data);
        const headerLine = dataWrapper.nextLine();
        return this.parseHeaderLine(headerLine);
    }

    parseHeaderLine(headerLine) {
        this.columns = headerLine.split(/\t/);
        if (!this.config.columns) {
            for (let i = 0; i < this.columns.length; i++) {
                const c = this.columns[i].toLowerCase();
                switch (c) {
                    case 'chr':
                    case 'chromosome':
                    case 'chr_id':
                        this.chrCol = i;
                        break;
                    case 'bp':
                    case 'pos':
                    case 'position':
                    case 'chr_pos':
                        this.posCol = i;
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
            if (tokens.length === this.columns.length) {
                const chr = tokens[this.chrCol];
                const start = parseInt(tokens[this.posCol]) - 1;
                const end = start + 1;
                const value = parseFloat(tokens[this.pvalueCol]);
                allFeatures.push(new GWASFeature({
                    chr: chr,
                    start: start,
                    end: end,
                    value: value,
                    line: line,
                    columns: this.columns
                }))
            }
        }
        return allFeatures;
    }
}

class GWASFeature {

    constructor({chr, start, end, value, line, columns}) {
        this.chr = chr;
        this.start = start;
        this.end = end;
        this.value = value;
        this.line = line;
        this.columns = columns;
    }

    popupData() {
        const tokens = this.line.split(/\t/);
        return this.columns.map(function (c, index) {
            return {name: c, value: tokens[index]}
        })
    }

    getAttribute(attrName) {
        const tokens = this.line.split(/\t/);
        for(let i=0; i<this.columns.length; i++) {
            if(this.columns[i] === attrName) {
                return tokens[i];
            }
        }
        return undefined;
    }

}

export default GWASParser

