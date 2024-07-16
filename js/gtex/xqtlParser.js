const MIN_EXPONENT = Math.log10(Number.MIN_VALUE)

/**
 * Parser for xQTL files.
 *
 * Quantitative trait loci (QTL) are genomic variants that are significantly associated to a measurable phenotype.
 *
 * Currently there is no standard file format for this data. For igv.js the essential data is genomic position of
 * the variant and the phenotype (e.g. a gene for eQtls)
 *
 * From https://github.com/igvteam/igv.js/issues/1833
 * CHR	SNP	BP	P	Phenotype
 * 10	rs146165798	50023438	0.000106	A1CF
 *
 * UCSC (based on GTEX)
 * https://genome.ucsc.edu/cgi-bin/hgTables?db=hg19&hgta_group=regulation&hgta_track=gtexEqtlTissue&hgta_table=gtexEqtlTissueAdiposeSubcut&hgta_doSchema=describe+table+schema
 *
 * From https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5785926/
 * sID,chr,pos,A1,A2,ENSG,geneSym,TSS,beta,se,t,p
 * rs376835509,10,65030,C,A,ENSG00000015171,ZMYND11,180405,1.64981083e-02,7.19706854e-03,2.29233725e+00,2.22757220e-02
 *
 * EMBL Eqtl catalog
 * https://github.com/eQTL-Catalogue/eQTL-Catalogue-resources/blob/master/tabix/Columns.md
 *
 */
class XQTLParser {

    chrCol = 0
    snpCol =  1
    posCol = 2
    pValueCol = 3
    phenotypeColumn = 4
    delimiter = '\t'

    constructor(config) {
        this.config = config
    }

    async parseHeader(dataWrapper) {
        const headerLine = await dataWrapper.nextLine()
        return this.parseHeaderLine(headerLine)
    }

    parseHeaderLine(headerLine) {
        this.columns = headerLine.split(this.delimiter)
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
                        this.pValueCol = i
                        break
                    case 'snp':
                        this.snpCol = i
                        break
                    case 'phenotype':
                        this.phenotypeColumn = i
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
                const pValue = parseValue(tokens[this.pValueCol])
                const start = parseInt(posString) - 1
                const end = start + 1
                const snp = tokens[this.snpCol]
                const phenotype = tokens[this.phenotypeColumn]
                const xqtl = new XTLParser({chr, start, end, pValue, snp, phenotype})

                allFeatures.push(xqtl)

            }
        }
        return allFeatures
    }
}

// if (json && json.singleTissueEqtl) {
//     for (let eqtl of json.singleTissueEqtl) {
//         eqtl.chr = eqtl.chromosome
//         eqtl.start = eqtl.pos - 1
//         eqtl.end = eqtl.start + 1
//         eqtl.snp = eqtl.snpId
//         eqtl.geneName = eqtl.geneSymbol
//         eqtl.geneId = eqtl.gencodeId
//     }
//     return json.singleTissueEqtl
// } else {
//     return []
// }
// }
// }

// Example GTEX eqtl
// {
//     "chromosome": "chr16",
//     "datasetId": "gtex_v8",
//     "gencodeId": "ENSG00000275445.1",
//     "geneSymbol": "CTD-2649C14.3",
//     "geneSymbolUpper": "CTD-2649C14.3",
//     "nes": 0.51295,
//     "pValue": 5.57674e-14,
//     "pos": 21999621,
//     "snpId": "rs35368623",
//     "tissueSiteDetailId": "Muscle_Skeletal",
//     "variantId": "chr16_21999621_G_GA_b38"
// }
class XTLParser {

    constructor({chr, start, end, pValue, snp, phenotype}) {
        this.chr = chr
        this.start = start
        this.end = end
        this.pValue = pValue
        this.snp = snp
        this.phenotype = phenotype

    }

    popupData() {
        return [
            {name: 'chromosome', value: this.chr},
            {name: 'position', value: this.start + 1},
            {name: 'pValue', value: this.pValue},
            {name: 'snp', value: this.snp},
            {name: 'phenotype', value: this.phenotype}
        ]
    }

}

export default XQTLParser

