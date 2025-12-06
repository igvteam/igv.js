import "./utils/mockObjects.js"
import {HGVS} from "../js/genome/HGVS.js"
import {assert} from 'chai'
import Genome from "../js/genome/genome.js"
import {getTrack} from "../js/trackFactory.js"

const genomeConfig = {
    "id": "hg38_1kg",
    "ucscID": "hg38",
    "blatDB": "hg38",
    "name": "Human (hg38 1kg/GATK)",
    "fastaURL": "https://1000genomes.s3.amazonaws.com/technical/reference/GRCh38_reference_genome/GRCh38_full_analysis_set_plus_decoy_hla.fa",
    "indexURL": "https://1000genomes.s3.amazonaws.com/technical/reference/GRCh38_reference_genome/GRCh38_full_analysis_set_plus_decoy_hla.fa.fai",
    "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/cytoBandIdeo.txt.gz",
    "aliasURL": "https://igv.org/genomes/data/hg38/hg38_alias.tab",
    "chromSizesURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes",
    "maneBbURL": "https://hgdownload.soe.ucsc.edu/gbdb/hg38/mane/mane.1.0.bb",
    "maneTrixURL": "https://hgdownload.soe.ucsc.edu/gbdb/hg38/mane/mane.1.0.ix",
    "rsdbURL": "https://hgdownload.soe.ucsc.edu/gbdb/hg38/ncbiRefSeq/refSeqHistorical.bb",
    "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY"
}

const refseqTrack = {
    "name": "Refseq All",
    "format": "refgene",
    "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/ncbiRefSeq.txt.gz",
    "indexed": false,
    "order": 1000001,
    "infoURL": "https://www.ncbi.nlm.nih.gov/gene/?term=$$"
}

const browser = {
    genome: await Genome.createGenome(genomeConfig)
}
const track = getTrack("annotation", refseqTrack, browser)
browser.tracks = [track]
await track.getFeatures("chr1", 0, 1000000000)  // Pre-load features

suite("testHGVS", function () {

    test("isValid", function () {
        assert.isOk(HGVS.isValidHGVS("NC_000017.11:g.7579472C>G"))
        assert.isOk(HGVS.isValidHGVS("NC_000017.11:g.7579472"))
        assert.isOk(HGVS.isValidHGVS("NM_000546.5:c.215C>G"))
        assert.isOk(HGVS.isValidHGVS("ENST00000380152.6:c.215C>G"))
        assert.isOk(HGVS.isValidHGVS("NR_046018.2:n.100"))
        assert.isOk(HGVS.isValidHGVS("NR_046018.2:n.100A>G"))
        assert.isNotOk(HGVS.isValidHGVS("Invalid_HGVS_String"))
        assert.isNotOk(HGVS.isValidHGVS("No_Colon_Or_Type"))
    })

    test("genome search", async function () {

        let hgvs = "NC_000017.11:g.7579472C>G"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        let result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr17")
        assert.equal(result.start, 7579471)

        // From UCSC tests
        // chr1	11850845	11867218	NC_000001.11:g.11850846_11867218dup16373	0	+
        hgvs = "NC_000001.11:g.11850846_11867218dup16373"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 11850845)

        // chr1	16782350	17359598	NC_000001.11:g.16782351_17359598del577248	0	+
        hgvs = "NC_000001.11:g.16782351_17359598del577248"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 16782350)

        // chr1	35570363	35656664	NC_000001.11:g.35570364_35656664dup86301	0	+
        hgvs = "NC_000001.11:g.35570364_35656664dup86301"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 35570363)

    })

    test("coding search", async function () {

        let hgvs = "NM_000546.6(TP53):c.815T>G"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        let result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr17")
        assert.equal(result.start, 7673804)
    })

    test("search in introns", async function () {

        // Adapted from UCSC tests
        // chr1	11256193	11256194	NM_004958.3(MTOR):c.505-2A>G	0	-
        let hgvs = "ENST00000361445.9:c.505-2A>G"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        let result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 11256193)

        // Requires searching browser tracks
        hgvs = "NM_004958.4(MTOR):c.505-2A>G"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 11256193)


        // chr1	11966984	11966985	NM_000302.3(PLOD1):c.1651-2delA	0	+
        hgvs = "ENST00000196061.5:c.1651-2delA"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 11966984)

        // chr1	40257002	40257003	NM_005857.4(ZMPSTE24):c.-211-1058C>G	0	+
        hgvs = "ENST00000372759.4:c.-211-1058C>G"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 40257002)

        // chr1	40073531	40073535	NM_000310.3(PPT1):c.*526_*529delATCA	0	-
        hgvs = "ENST00000642050.2:c.*526_*529delATCA"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 40073531)
    })

    test("historical refseq", async function () {

        // Adapted from UCSC tests
        // chr1	11256193	11256194	NM_004958.3(MTOR):c.505-2A>G	0	-
        let hgvs = "NM_004958.3(MTOR):c.505-2A>G"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        let result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 11256193)

        // chr1	11966984	11966985	NM_000302.3(PLOD1):c.1651-2delA	0	+
        hgvs = "NM_000302.3(PLOD1):c.1651-2delA"
        assert.isOk(HGVS.isValidHGVS(hgvs))
        result = await HGVS.search(hgvs, browser)
        assert.equal(result.chr, "chr1")
        assert.equal(result.start, 11966984)

    })

    test("create annotation", async function () {

        // - strand gene, coding exon. Validated at ClinVar, genome location 17:7673596
        let expected = "NM_000546.6:c.932A>C"
        let hgvs = await HGVS.createHGVSAnnotation(browser.genome, "chr17", 7673595, 'T', 'G')
        assert.equal(hgvs, expected)

        // Validated at ClinVar, genome location 17:7666193
        expected = "NC_000017.11:g.7666193C>T"
        hgvs = await HGVS.createHGVSAnnotation(browser.genome, "chr17", 7666192, 'C', 'T')
        assert.equal(hgvs, expected)

        // + strand gene, intronic position.  Validated at ClinVar, genome location 17:7653504
        expected = "NM_001678.5:c.241+2T>C"
        hgvs = await HGVS.createHGVSAnnotation(browser.genome, "chr17", 7653503, 'T', 'C')
        assert.equal(hgvs, expected)

        // + strand gene, promoter region. Validated at ClinVar, genome location 10:87864254
        expected = "NM_000314.8:c.-216C>T"
        hgvs = await HGVS.createHGVSAnnotation(browser.genome, "chr10", 87864253, 'C', 'T')
        assert.equal(hgvs, expected)
    })

})
