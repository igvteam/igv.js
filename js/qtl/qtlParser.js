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
 * bin	590	int(10) unsigned	range	Indexing field to speed chromosome range queries.
 * chrom	chr1	varchar(255)	values	Reference sequence chromosome or scaffold
 * chromStart	701834	int(10) unsigned	range	Start position in chromosome
 * chromEnd	701835	int(10) unsigned	range	End position in chromosome
 * name	rs189800799/RP11-206L10.9	varchar(255)	values	Variant/gene pair
 * score	22	int(10) unsigned	range	Score from 0-1000 (highest probabiliity in cluster * 1000)
 * strand	.	char(1)	values	.
 * thickStart	701834	int(10) unsigned	range	Start position
 * thickEnd	701835	int(10) unsigned	range	End position
 * itemRgb	16752800	int(10) unsigned	range	R,G,B color: red +effect, blue -effect. Bright for high, pale for lower (cutoff effectSize 2.0 RPKM).
 * variant	rs189800799	varchar(255)	values	Variant (rsID or GTEx identifier if none)
 * geneId	ENSG00000237491.4	varchar(255)	values	Target gene identifier
 * gene	RP11-206L10.9	varchar(255)	values	Target gene symbol
 * distance	-12315	int(11)	range	Distance from TSS
 * effectSize	0.229	float	range	Effect size (FPKM)
 * pValue	13.862	float	range	Nominal p-value
 * causalProb	0.022	float	range	Probability variant is in high confidence causal set
 *
 * EMBL Eqtl catalog
 * https://github.com/eQTL-Catalogue/eQTL-Catalogue-resources/blob/master/tabix/Columns.md
 *
 * variant - The variant ID (chromosome_position_ref_alt) e.g. chr19_226776_C_T. Based on GRCh38 coordinates and reference genome. The chromosome, position, ref and alt values should exactly match same fields in the summary statistics file, with 'chr' prefix added to the chromosome number.
 * r2 - Optional imputation quality score from the imputation software, can be replaced with NA if not available.
 * pvalue - Nominal p-value of association between the variant and the molecular trait.
 * molecular_trait_object_id - For phenotypes with multiple correlated alternatives (multiple alternative transcripts or exons within a gene, multple alternative promoters in txrevise, multiple alternative intons in Leafcutter), this defines the level at which the phenotypes were aggregated. Permutation p-values are calculated accross this set of alternatives.
 * molecular_trait_id - ID of the molecular trait used for QTL mapping. Depending on the quantification method used, this can be either a gene id, exon id, transcript id or a txrevise promoter, splicing or 3'end event id. Examples: ENST00000356937, ENSG00000008128.
 * maf - Minor allele frequency within a QTL mapping context (e.g. cell type or tissues within a study).
 * gene_id - Ensembl gene ID of the molecular trait.
 * median_tpm - Median transcripts per million (TPM) expression value of the gene. Can be replaced with NA if not availble (e.g. in microarray studies).
 * beta - Regression coefficient from the linear model.
 * se - Standard error of the beta.
 * an - Total number of alleles. For autosomal variants, this is usually two times the sample size. Conversly, for autosomal variants, sample size is equal to an/2.
 * ac - Count of the alternative allele.
 * ma_samples - Number of samples carrying at least one copy of the minor allele.
 * chromosome - GRCh38 chromosome name of the variant (e.g. 1,2,3 ...,X).
 * position - GRCh38 position of the variant.
 * ref - GRCh38 reference allele.
 * alt - GRCh38 alternative allele (also the effect allele).
 * type - Type of the genetic variant; SNP, INDEL or OTHER.
 * rsid - The dbSNP v151 rsid of the variant. If the same variant has multiple rsids then these should be split over multiple rows so that all of the other values are duplicated.
 *
 */
class QTLParser {

    chrCol = -1
    snpCol = -1
    posCol = -1
    pValueCol = -1
    phenotypeColumn = -1
    delimiter = '\t'

    constructor(config) {
        this.config = config

        //TODO -- allow specifying column
        // this.pValueField = config.pValueField || "pValue"
        // this.phenotypeField = config.phenotypeField || config.geneField ||  "geneSymbol"
        // this.snpField = config.snpField || "snp"
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
                    case 'chrom':
                        this.chrCol = i
                        break
                    case 'bp':
                    case 'pos':
                    case 'position':
                    case 'chr_pos':
                    case 'chromEnd':
                        this.posCol = i
                        break
                    case 'p':
                    case 'pval':
                    case 'pvalue':
                    case 'p-value':
                    case 'p.value':
                        this.pValueCol = i
                        break
                    case 'rsid':
                    case 'variant':
                    case 'snp':
                        this.snpCol = i
                        break
                    case 'phenotype':
                    case 'gene':
                    case 'gene_id':
                    case 'molecular_trait_id':
                        this.phenotypeColumn = i
                        break
                }
            }
        }
        // TODO validate
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
            const idx = valueString.indexOf("E")
            if (idx > 0) {
                const exp = Number.parseInt(valueString.substring(idx + 1))
                if (exp < MIN_EXPONENT) {
                    return Number.MIN_VALUE
                }
            }
            return Number(valueString)
        }

        while ((line = dataWrapper.nextLine()) !== undefined) {
            const tokens = line.split(/\t/)
            if (tokens.length === this.columns.length) {
                const posString = tokens[this.posCol]
                if (posString.indexOf(";") > 0 || posString.length == 0 || posString.indexOf('x') > 0) {
                    continue
                }
                const chr = tokens[this.chrCol]
                const pValue = parseValue(tokens[this.pValueCol])
                const start = parseInt(posString) - 1
                const end = start + 1
                const snp = tokens[this.snpCol]
                const phenotype = tokens[this.phenotypeColumn]
                const qtl = new QTL({chr, start, end, pValue, snp, phenotype}, this.columns, tokens)

                allFeatures.push(qtl)

            }
        }
        return allFeatures
    }
}


class QTL {

    constructor({chr, start, end, pValue, snp, phenotype}, headers, tokens) {
        this.chr = chr
        this.start = start
        this.end = end
        this.pValue = pValue
        this.snp = snp
        this.phenotype = phenotype
        this.headers = headers
        this.tokens = tokens
    }

    popupData() {
        const data = []
        for (let i = 0; i < this.headers.length; i++) {
            data.push({name: this.headers[i], value: this.tokens[i]})
        }
        return data
        // return [
        //     {name: 'chromosome', value: this.chr},
        //     {name: 'position', value: this.start + 1},
        //     {name: 'pValue', value: this.pValue},
        //     {name: 'snp', value: this.snp},
        //     {name: 'phenotype', value: this.phenotype}
        // ]
    }

}

export default QTLParser

