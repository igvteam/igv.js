const MIN_EXPONENT = Math.log10(Number.MIN_VALUE)

/**
 * Parser for IGV desktop GWAS files.  See http://software.broadinstitute.org/software/igv/GWAS
 */
class GWASParser {

    constructor(config) {
        // Defaults - can be overriden by header
        this.config = config
        if (config.columns) {
            if (config.columns.chromosome === undefined ||
                config.columns.position === undefined ||
                config.columns.value === undefined) {
                throw Error("columns property must define chrCol, posCol, and valueCol")
            }
            this.posCol = config.columns.position - 1
            this.chrCol = config.columns.chromosome - 1
            this.valueCol = config.columns.value - 1
        } else {
            // Defaults -- can be overriden in header
            this.posCol = 2
            this.chrCol = 1
            this.valueCol = 3
        }
    }

    async parseHeader(dataWrapper) {
        const headerLine = await dataWrapper.nextLine()
        return this.parseHeaderLine(headerLine)
    }

    parseHeaderLine(headerLine) {
        this.columns = headerLine.split(/\t/)
        if (!this.config.columns) {
            for (let i = 0; i < this.columns.length; i++) {
                const c = this.columns[i].toLowerCase()
                switch (c) {
                    case 'chr':
                    case 'chromosome':
                    case 'chr_id':
                        this.chrCol = i
                        break
                    case 'bp':
                    case 'pos':
                    case 'position':
                    case 'chr_pos':
                        this.posCol = i
                        break
                    case 'p':
                    case 'pval':
                    case 'pvalue':
                    case 'p-value':
                    case 'p.value':
                        this.valueCol = i
                        break
                }
            }
        }
        return this.columns
    }

    async parseFeatures(dataWrapper) {

        const allFeatures = []
        const headerLine = dataWrapper.nextLine()
        if (!this.columns) {
            this.parseHeaderLine(headerLine)
        }

        let line

        const parseValue = (valueString) => {
            // Don't try to parse extremely small values
            const idx = valueString.indexOf("E");
            if(idx > 0) {
                const exp = Number.parseInt(valueString.substring(idx + 1));
                if (exp < MIN_EXPONENT) {
                   return Number.MIN_VALUE;
                }
            }
            return Number(valueString)
        }

        while ((line = dataWrapper.nextLine()) !== undefined) {
            const tokens = line.split(/\t/)
            if (tokens.length === this.columns.length) {
                const posString = tokens[this.posCol]
                if(posString.indexOf(";") > 0 || posString.length == 0 || posString.indexOf('x') > 0) {
                    continue
                }
                const chr = tokens[this.chrCol]
                const value = parseValue(tokens[this.valueCol])
                const start = parseInt(posString) - 1
                const end = start + 1
                allFeatures.push(new GWASFeature({chr, start, end, value, line, columns: this.columns}))

            }
        }
        return allFeatures
    }
}

class GWASFeature {

    constructor({chr, start, end, value, line, columns}) {
        this.chr = chr
        this.start = start
        this.end = end
        this.value = value
        this.line = line
        this.columns = columns
    }

    popupData() {
        const tokens = this.line.split(/\t/)
        return this.columns.map(function (c, index) {
            return {name: c, value: tokens[index]}
        })
    }

    getAttribute(attrName) {
        const tokens = this.line.split(/\t/)
        for (let i = 0; i < this.columns.length; i++) {
            if (this.columns[i] === attrName) {
                return tokens[i]
            }
        }
        return undefined
    }

}

export default GWASParser

