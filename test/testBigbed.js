import "./utils/mockObjects.js"
import BWSource from "../js/bigwig/bwSource.js"
import {parseAutoSQL} from "../js/util/ucscUtils.js"
import {assert} from 'chai'
import {fileToDataURL} from "./utils/URLUtils.js"
import BWReader from "../js/bigwig/bwReader.js"
import {createGenome} from "./utils/MockGenome.js"

suite("testBigBed", function () {

    test("bed9+2 features", async function () {
        const url = "test/data/bb/myBigBed2.bb"
        const chr = "chr7"
        const start = 0
        const end = Number.MAX_SAFE_INTEGER
        const bwSource = new BWSource({url: url})

        const trackType = await bwSource.trackType()
        assert.equal(trackType, "annotation")

        const features = await bwSource.getFeatures({chr, start, end, bpPerPixel: 1})
        assert.ok(features)
        assert.equal(features.length, 3339)   // Verified in iPad app

        //chr7	773975	792642	uc003sjb.2	0	+	776710	791816	0,255,0	HEATR2	Q86Y56-3
        const f = features[20]
        assert.equal(f.start, 773975)
        assert.equal(f.geneSymbol, 'HEATR2')
        assert.equal(f.spID, 'Q86Y56-3')
    })

    test("test aliasing", async function () {

        const genome = createGenome("ncbi")
        const url = "test/data/bb/myBigBed2.bb"
        const chr = "7"
        const start = 0
        const end = Number.MAX_SAFE_INTEGER
        const bwSource = new BWSource({url}, genome)

        const trackType = await bwSource.trackType()
        assert.equal(trackType, "annotation")

        const features = await bwSource.getFeatures({chr, start, end, bpPerPixel: 1})
        assert.ok(features)
        assert.equal(features.length, 3339)   // Verified in iPad app

        //chr7	773975	792642	uc003sjb.2	0	+	776710	791816	0,255,0	HEATR2	Q86Y56-3
        const f = features[20]
        assert.equal(f.start, 773975)
        assert.equal(f.geneSymbol, 'HEATR2')
        assert.equal(f.spID, 'Q86Y56-3')
    })


    test("bed9+2 features - dataURL", async function () {
        const url = await fileToDataURL("test/data/bb/myBigBed2.bb")

        const chr = "chr7"
        const start = 0
        const end = Number.MAX_SAFE_INTEGER
        const bwSource = new BWSource({url: url})

        const trackType = await bwSource.trackType()
        assert.equal(trackType, "annotation")

        const features = await bwSource.getFeatures({chr, start, end, bpPerPixel: 1})
        assert.ok(features)
        assert.equal(features.length, 3339)   // Verified in iPad app

        //chr7	773975	792642	uc003sjb.2	0	+	776710	791816	0,255,0	HEATR2	Q86Y56-3
        const f = features[20]
        assert.equal(f.start, 773975)
        assert.equal(f.geneSymbol, 'HEATR2')
        assert.equal(f.spID, 'Q86Y56-3')
    })

    test("interact features", async function () {
        const url = "test/data/bb/interactExample3.inter.bb"

        const chr = "chr3"
        const start = 63702628
        const end = 63880091
        const bwSource = new BWSource({url: url})

        const trackType = await bwSource.trackType()
        assert.equal(trackType, "interact")

        const features = await bwSource.getFeatures({chr, start, end, bpPerPixel: 1})
        assert.ok(features)
        assert.equal(features.length, 18)

        //chr3	63741418	63978511	.	350	6	.	0	chr3	63741418	63743120	.	.	chr3	63976338	63978511	.	.
        const secondFeature = features[1]
        assert.equal(secondFeature.start1, 63741418)
        assert.equal(secondFeature.end1, 63743120)
        assert.equal(secondFeature.start2, 63976338)
        assert.equal(secondFeature.end2, 63978511)
    })

    test("interact features - dataURL", async function () {
        const url = await fileToDataURL("test/data/bb/interactExample3.inter.bb")


        const chr = "chr3"
        const start = 63702628
        const end = 63880091
        const bwSource = new BWSource({url: url})

        const trackType = await bwSource.trackType()
        assert.equal(trackType, "interact")

        const features = await bwSource.getFeatures({chr, start, end, bpPerPixel: 1})
        assert.ok(features)
        assert.equal(features.length, 18)

        //chr3	63741418	63978511	.	350	6	.	0	chr3	63741418	63743120	.	.	chr3	63976338	63978511	.	.
        const secondFeature = features[1]
        assert.equal(secondFeature.start1, 63741418)
        assert.equal(secondFeature.end1, 63743120)
        assert.equal(secondFeature.start2, 63976338)
        assert.equal(secondFeature.end2, 63978511)
    })

    test("Autosql", function () {
        const autosql = `
table chromatinInteract
"Chromatin interaction between two regions"
    (
    string chrom;      "Chromosome (or contig, scaffold, etc.). For interchromosomal, use 2 records"
    uint chromStart;   "Start position of lower region. For interchromosomal, set to chromStart of this region"
    uint chromEnd;     "End position of upper region. For interchromosomal, set to chromEnd of this region"
    string name;       "Name of item, for display"
    uint score;        "Score from 0-1000"
    double value;      "Strength of interaction or other data value. Typically basis for score"
    string exp;        "Experiment name (metadata for filtering). Use . if not applicable"
    string color;      "Item color.  Specified as r,g,b or hexadecimal #RRGGBB or html color name, as in //www.w3.org/TR/css3-color/#html4."
    string region1Chrom;  "Chromosome of lower region. For non-directional interchromosomal, chrom of this region."
    uint region1Start;  "Start position of lower/this region"
    uint region1End;    "End position in chromosome of lower/this region"
    string region1Name;  "Identifier of lower/this region"
    string region1Strand; "Orientation of lower/this region: + or -.  Use . if not applicable"
    string region2Chrom; "Chromosome of upper region. For non-directional interchromosomal, chrom of other region"
    uint region2Start;  "Start position in chromosome of upper/this region"
    uint region2End;    "End position in chromosome of upper/this region"
    string region2Name; "Identifier of upper/this region"
    string region2Strand; "Orientation of upper/this region: + or -.  Use . if not applicable"
    )
`

        const autosqlObject = parseAutoSQL(autosql)
        assert.ok(autosqlObject)
        assert.equal('chromatinInteract', autosqlObject.table)
        assert.equal(autosqlObject.fields.length, 18)

        const r2s = autosqlObject.fields[17]
        assert.equal(r2s.type, 'string')
        assert.equal(r2s.name, 'region2Strand')
        assert.equal(r2s.description, 'Orientation of upper/this region: + or -.  Use . if not applicable')
    })

    test("clinvar", async function () {

        this.timeout(10000)

        const url = "https://s3.amazonaws.com/igv.org.genomes/hg38/clinvarMain.bb",
            chr = "chr22",
            start = 23786974,
            end = 23787050

        const bwReader = new BWReader({url: url})
        const features = await bwReader.readFeatures(chr, start, chr, end)
        assert.equal(features.length, 3)

    })

    /**
     * Test parsing a aliasBbURL file from the T2T hub
     */
    test("test chromAlias", async function () {

        const url = "test/data/bb/GCA_009914755.4.chromAlias.bb"  //T2T

        const bbReader = new BWReader({url: url, format: "bigbed"})
        const features = await bbReader.readWGFeatures()
        assert.equal(25, features.length)

        const f = features[0]
        assert.equal("chrM", f["ucsc"])
    })


    /**
     * test parsing a cytoband BB file from the T2T hub
     * Example feature
     * {
     *   "chr": "chr1",
     *   "start": 0,
     *   "end": 1735965,
     *   "name": "p36.33",
     *   "gieStain": "gneg"
     * }
     */
    test("test cytoband", async function () {

        const url = "test/data/bb/cytoBandMapped.bb"
        const bbReader = new BWReader({url: url, format: "bigbed"})
        const features = await bbReader.readWGFeatures()


        // Collect distinct chromosomes
        const uniqueChromosomes = new Set()
        for(let f of features) {
            uniqueChromosomes.add(f.chr)
        }

        assert.equal(24, uniqueChromosomes.size)


    })

})

