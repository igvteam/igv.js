import "./utils/mockObjects.js"
import Genome from "../js/genome/genome.js"
import {LoadError} from "../js/util/loadFailure.js"
import ChromAliasDefaults from "../js/genome/chromAliasDefaults.js"
import {updateReference} from "../js/genome/updateReference.js"
import {assert} from 'chai'
import {shortenChromsomeName} from "../js/rulerTrack.js"


suite("testGenome", function () {

    test("Shorten name", function() {
        const names = ["chr1", "chromosome_1"]
        const expected = ["1", "chromosome_1"]

        for(let i=0; i<names.length; i++) {
            const shortened = shortenChromsomeName(names[i])
            assert.equal(shortened, expected[i])
        }
    })

    test("update reference", function() {

        const reference = {
            "id": "hg18",
            "name": "Human (hg18)",
            "fastaURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta",
            "indexURL": "https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg18/hg18.fasta.fai",
            "cytobandURL": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/cytoBandIdeo.txt.gz",
            "tracks": [
                {
                    "name": "Refseq Genes",
                    "format": "refgene",
                    "url": "https://hgdownload.soe.ucsc.edu/goldenPath/hg18/database/refGene.txt.gz",
                    "indexed": false,
                    "visibilityWindow": -1,
                    "order": 1000000,
                    "searchable": true
                }
            ],
            "chromosomeOrder": "chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY"
        }

        updateReference(reference)
        assert.isNotOk(reference.fastaURL)
        assert.isNotOk(reference.indexURL)
        assert.isOk(reference.twoBitURL)
        assert.isOk(reference.chromSizesURL)


    })

    test("chrom sizes failure is optional when the sequence names the chromosomes", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            chromSizesURL: "test/data/twobit/missing.chrom.sizes"
        })

        assert.deepEqual(genome.chromosomeNames, ["chr1"])
        assert.equal(genome.initialLocus, "chr1")

        assert.equal(genome.loadFailures.length, 1)
        const [failure] = genome.loadFailures
        assert.equal(failure.kind, "chromSizes")
        assert.equal(failure.url, "test/data/twobit/missing.chrom.sizes")
        assert.equal(failure.warning, "Chromosome sizes could not be loaded, so whole-genome view will not be available.")
    })

    test("chrom sizes failure is optional when nothing else names the chromosomes", async function () {

        const config = {
            id: "GCF_000002655.1",
            twoBitURL: "test/data/twobit/foo.2bit",
            twoBitBptURL: "test/data/twobit/GCF_000002655.1.2bit.bpt",
            chromSizesURL: "test/data/twobit/missing.chrom.sizes"
        }

        // No chromosome names, so the default locus is the first sequence in the 2bit file
        const genome = await Genome.createGenome(config)
        assert.isUndefined(genome.chromosomeNames)
        assert.equal(genome.initialLocus, "chr1")
        assert.equal(genome.loadFailures.length, 1)
        assert.equal(genome.loadFailures[0].warning,
            "Chromosome sizes could not be loaded, so whole-genome view and the chromosome list will not be available.")

        const genomeWithLocus = await Genome.createGenome({...config, locus: "NC_007194.1:1-100"})
        assert.equal(genomeWithLocus.initialLocus, "NC_007194.1:1-100")
    })

    test("a 2bit bpt index failure falls back to the internal index", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            twoBitBptURL: "test/data/twobit/missing.2bit.bpt"
        })

        assert.deepEqual(genome.chromosomeNames, ["chr1"])
        assert.equal(await genome.getSequence("chr1", 47, 50), "ACT")

        assert.equal(genome.loadFailures.length, 1)
        const [failure] = genome.loadFailures
        assert.equal(failure.kind, "twoBitBpt")
        assert.equal(failure.url, "test/data/twobit/missing.2bit.bpt")
        assert.include(failure.warning, "may be slow")
    })

    test("an alias bigBed failure falls back to the default aliases, without preload", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            chromAliasBbURL: "test/data/twobit/missing.chromAlias.bb",
            wholeGenomeView: false   // No preload: the alias bigBed is first read on a search
        })

        const aliasRecord = await genome.getAliasRecord("1")
        assert.equal(aliasRecord.chr, "chr1")
        assert.equal(genome.getChromosomeName("1"), "chr1")
        assert.equal((await genome.loadChromosome("1")).name, "chr1")

        assert.equal(genome.loadFailures.length, 1)
        assert.equal(genome.loadFailures[0].kind, "chromAlias")
        assert.equal(genome.loadFailures[0].url, "test/data/twobit/missing.chromAlias.bb")
    })

    test("an alias bigBed failure with nothing to fall back to is recorded once", async function () {

        // No chromosome names (external 2bit index) and no alias file, so no alias source replaces the bigBed
        const genome = await Genome.createGenome({
            id: "GCF_000002655.1",
            twoBitURL: "test/data/twobit/foo.2bit",
            twoBitBptURL: "test/data/twobit/GCF_000002655.1.2bit.bpt",
            chromAliasBbURL: "test/data/twobit/missing.chromAlias.bb",
            wholeGenomeView: false
        })

        // Mixed case, so the lookup is retried in lower case: on no alias source at all, by then
        assert.isUndefined(await genome.getAliasRecord("Chr1"))
        assert.instanceOf(genome.chromAlias, ChromAliasDefaults)   // Which knows nothing, but is there
        assert.equal(genome.loadFailures.length, 1)
        assert.equal(genome.loadFailures[0].kind, "chromAlias")
    })

    test("an alias file failure falls back to the default aliases", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            aliasURL: "test/data/twobit/missing.alias.txt"
        })

        assert.equal((await genome.getAliasRecord("1")).chr, "chr1")
        assert.equal(genome.loadFailures.length, 1)
        assert.equal(genome.loadFailures[0].kind, "chromAlias")
        assert.equal(genome.loadFailures[0].url, "test/data/twobit/missing.alias.txt")
    })

    test("a failure after the browser takes the genome is passed to onLoadFailure", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            cytobandURL: "test/data/cytobands/missing.cytoband.txt"
        })
        assert.equal(genome.loadFailures.length, 0)   // Cytobands load lazily

        const reported = []
        genome.onLoadFailure = failure => reported.push(failure)
        assert.isUndefined(await genome.getCytobands("chr1"))

        assert.equal(genome.loadFailures.length, 0)
        assert.equal(reported.length, 1)
        assert.equal(reported[0].kind, "cytobands")
        assert.equal(reported[0].url, "test/data/cytobands/missing.cytoband.txt")
        assert.include(reported[0].warning, "Cytobands could not be loaded")
    })

    test("an indexed fasta genome loads its sequence", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            fastaURL: "test/data/twobit/foo.2bit.fa",
            indexURL: "test/data/twobit/foo.2bit.fa.fai"
        })

        assert.deepEqual(genome.chromosomeNames, ["chr1"])
        assert.equal(await genome.getSequence("chr1", 47, 50), "ACT")
    })

    async function loadError(config) {
        try {
            await Genome.createGenome(config)
        } catch (e) {
            return e
        }
        assert.fail("The genome loaded")
    }

    test("a fasta failure is fatal even when its index loads", async function () {

        const error = await loadError({
            id: "foo",
            fastaURL: "test/data/twobit/missing.fa",
            indexURL: "test/data/twobit/foo.2bit.fa.fai"
        })
        assert.instanceOf(error, LoadError)
        assert.equal(error.kind, "fasta")
        assert.equal(error.url, "test/data/twobit/missing.fa")
        assert.equal(error.cause.path, "test/data/twobit/missing.fa")
    })

    test("a fasta index failure is fatal", async function () {

        const error = await loadError({
            id: "foo",
            fastaURL: "test/data/twobit/foo.2bit.fa",
            indexURL: "test/data/twobit/missing.fai"
        })
        assert.instanceOf(error, LoadError)
        assert.equal(error.kind, "fastaIndex")
        assert.equal(error.url, "test/data/twobit/missing.fai")
    })

    test("a non-indexed fasta failure is fatal", async function () {

        const error = await loadError({id: "foo", fastaURL: "test/data/twobit/missing.fa"})
        assert.instanceOf(error, LoadError)
        assert.equal(error.kind, "fasta")
        assert.equal(error.url, "test/data/twobit/missing.fa")
    })

    test("a 2bit failure is fatal even when its bpt index loads", async function () {

        const error = await loadError({
            id: "GCF_000002655.1",
            twoBitURL: "test/data/twobit/missing.2bit",
            twoBitBptURL: "test/data/twobit/GCF_000002655.1.2bit.bpt"
        })
        assert.instanceOf(error, LoadError)
        assert.equal(error.kind, "twoBit")
        assert.equal(error.url, "test/data/twobit/missing.2bit")
        assert.equal(error.cause.path, "test/data/twobit/missing.2bit")
    })

    test("a file that is not 2bit is fatal", async function () {

        const error = await loadError({id: "foo", twoBitURL: "test/data/twobit/foo.2bit.fa"})
        assert.instanceOf(error, LoadError)
        assert.equal(error.kind, "twoBit")
        assert.equal(error.url, "test/data/twobit/foo.2bit.fa")
    })

    test("a cytoband failure leaves out only that chromosome", async function () {

        const genome = await Genome.createGenome({
            id: "foo",
            twoBitURL: "test/data/twobit/foo.2bit",
            cytobandURL: "test/data/cytobands/foo.cytoband.txt"
        })

        const cytobands = [{start: 0, end: 10, name: "p1"}]
        const requests = []
        genome.cytobandSource = {
            getCytobands: async chr => {
                requests.push(chr)
                if (chr === "chr2" || chr === "chr3") throw Error(`${chr} failed`)
                return cytobands
            }
        }

        assert.isUndefined(await genome.getCytobands("chr2"))
        assert.isUndefined(await genome.getCytobands("chr3"))
        assert.equal(await genome.getCytobands("chr1"), cytobands)
        assert.isUndefined(await genome.getCytobands("chr2"))   // Not requested again

        assert.deepEqual(requests, ["chr2", "chr3", "chr1"])
    })

    test("an empty genome answers every query with nothing", async function () {

        const genome = Genome.empty()

        assert.isTrue(genome.isEmpty)
        assert.isString(genome.id)   // The navbar shows it
        assert.equal(genome.chromosomes.size, 0)
        assert.isFalse(genome.showWholeGenomeView())
        assert.isUndefined(genome.wgChromosomeNames)
        assert.isUndefined(genome.initialLocus)
        assert.isUndefined(genome.getChromosome("chr1"))
        assert.isUndefined(await genome.loadChromosome("chr1"))
        assert.isUndefined(await genome.getAliasRecord("chr1"))
        assert.isUndefined(await genome.getSequence("chr1", 0, 10))
        assert.equal(genome.getChromosomeName("chr1"), "chr1")
        assert.equal(genome.getChromosomeDisplayName("chr1"), "chr1")
        assert.equal(genome.loadFailures.length, 0)
    })

})
