import getDataWrapper from "../feature/dataWrapper.js"

const wsRegex = /\s+/

class GenbankParser {
    constructor(config) {

        this.config = config
    }


    parse(data) {

        let accession, sequence, aliases

        if (!data) return null

        const dataWrapper = getDataWrapper(data)

        // Read locus
        let line = dataWrapper.nextLine()
        const tokens = line.split(/\s+/)
        if (tokens[0].toUpperCase() !== "LOCUS") {
            throw Error("Expected `LOCUS` line.  Found: " + line)
        }
        const locus = tokens[1].trim()

        // Loop until FEATURES section
        do {
            line = dataWrapper.nextLine()
            if (line.startsWith("ACCESSION")) {
                const tokens = line.split(wsRegex)
                if (tokens.length < 2) {
                    throw Error("Genbank file missing ACCESSION number.")
                } else {
                    accession = tokens[1].trim()
                }
            } else if (line.startsWith("ALIASES")) {
                // NOTE - this is an IGV extension
                const tokens = line.split(wsRegex)
                if (tokens.length > 1) {
                    aliases = tokens[1].split(",")
                }

            }
        }
        while (line && !line.startsWith("FEATURES"))

        const chr = accession || locus
        const features = parseFeatures(chr, dataWrapper)

        //readOriginSequence(dataWrapper)

        return {locus, accession, aliases, features}


        /**
         * Read the origin section.   Example...
         * <p/>
         * ORIGIN
         * 1 gatcctccat atacaacggt atctccacct caggtttaga tctcaacaac ggaaccattg
         * 61 ccgacatgag acagttaggt atcgtcgaga gttacaagct aaaacgagca gtagtcagct
         * 121 ctgcatctga agccgctgaa gttctactaa gggtggataa catcatccgt gcaagaccaa
         *
         * @param reader
         */
        function readOriginSequence(dataWrapper) {

            // TODO -- first line is source (required), has total length => use to size sequence

            let line

            sequence = []
            while (((line = dataWrapper.nextLine()) !== undefined) && !line.startsWith("//")) {
                line = line.trim()
                let tokens = line.split(wsRegex)
                for (let i = 1; i < tokens.length; i++) {
                    let str = tokens[i]
                    for (let j = 0; j < str.length; j++) {
                        sequence.push(str.charCodeAt(j))
                    }
                }
            }
        }


    }
}


/**
 * FEATURES             Location/Qualifiers
 * source          1..105338
 * /organism="Homo sapiens"
 * /mol_type="genomic DNA"
 * /db_xref="taxon:9606"
 * /chromosome="10"
 * gene            1..105338
 * /gene="PTEN"
 * /note="Derived by automated computational analysis using
 * gene prediction method: BestRefseq."
 * /db_xref="GeneID:5728"
 * /db_xref="HGNC:9588"
 * /db_xref="HPRD:03431"
 * /db_xref="MIM:601728"
 * <p/>
 * CDS             join(1033..1111,30588..30672,62076..62120,67609..67652,
 * 69576..69814,88681..88822,94416..94582,97457..97681,
 * 101850..102035)
 * /gene="PTEN"
 *
 * @param reader
 * @throws IOException
 */
function parseFeatures(chr, dataWrapper) {


    // TODO -- keys start at column 6,   locations and qualifiers at column 22.

    //Process features until "ORIGIN"
    const features = []
    let currentLocQualifier
    let nextLine
    let errorCount = 0
    let f

    do {
        nextLine = dataWrapper.nextLine()

        if (nextLine === "") {
            continue  // Not sure this is legal in a gbk file
        }

        if (!nextLine || nextLine.startsWith("ORIGIN")) {
            break
        }

        if (nextLine.length < 6) {
            if (errorCount < 10) {
                console("Unexpected line in genbank file (skipping): " + nextLine)
            }
            errorCount++
            continue
        }

        if (nextLine.charAt(5) !== ' ') {

            let featureType = nextLine.substring(5, 21).trim()
            f = {
                chr: chr,
                type: featureType,
                attributes: {}
            }
            currentLocQualifier = nextLine.substring(21)

            if (!featureType.toLowerCase() === "source") {
                features.add(f)
            }

        } else {
            let tmp = nextLine.substring(21).trim()
            if (tmp.length > 0)

                if (tmp.charCodeAt(0) === 47) {   // 47 == '/'

                    if (currentLocQualifier.charCodeAt(0) === 47) {

                        let tokens = currentLocQualifier.split("=", 2)

                        if (tokens.length > 1) {
                            let keyName = tokens[0].length() > 1 ? tokens[0].substring(1) : ""
                            let value = stripQuotes(tokens[1])
                            f.attributes[keyName] = value

                        } else {
                            // TODO -- don't know how to interpret, log?
                        }
                    } else {

                        // location string TODO -- many forms of this to support
                        // Crude test for strand
                        // location string TODO -- many forms of this to support
                        // Crude test for strand
                        const strand = currentLocQualifier.includes("complement") ? "-" : "+";
                        f.strand = strand;

                        let joinString = currentLocQualifier.replace("join", "")
                            .replace("order", "")
                            .replace("complement", "")
                            .replace("(", "")
                            .replace(")", "");

                        if (joinString.includes("..")) {
                            joinString = joinString.replace("<", "")
                                .replace(">", "");

                            const exons = createExons(joinString, strand);
                            exons.sort((a, b) =>a.start - b.start);
                            const firstExon = exons[0];
                            f.start = firstExon.start;
                            const lastExon = exons[exons.length - 1];
                            f.end = lastExon.end;
                            if (exons.length > 1) {
                                f.exons = exons;
                            }
                        } else {
                            // TODO Single locus for now, other forms possible
                            //  const start = parseInt(joinString) - 1;const end = start + 1;
                            f.start = start;
                            f.end = end;
                        }

                    }
                    currentLocQualifier = tmp
                } else {
                    currentLocQualifier = currentLocQualifier || tmp
                }
        }
    }
    while (true)

    return features
}

/**
 * Create a list of Exon objects from the Embl join string.  Apparently exons in embl
 * format are represented by a single CDS record.
 *
 * @param joinString
 */
function createExons(joinString, strand) {

    let lociArray = joinString.split(",")

    let exons = []

    let isNegative = joinString.contains("complement")

    lociArray.forEach(function (loci) {

        let tmp = loci.split("..")

        let exonStart = 0    // - (isNegative ? 0 : 1);

        try {
            exonStart = Number.parseInt(tmp[0]) - 1

            let exonEnd = exonStart + 1
            if (tmp.length > 1) {
                exonEnd = Number.parseInt(tmp[1])
            }

            exons.add({
                chr: accession,
                start: exonStart,
                end: exonEnd,
                strand: strand
            })

        } catch (e) {
            console.error(e)
        }
    })

    exons.sort(function (a, b) {
        return a.start - b.start
    })

    return exons
}

function stripQuotes(value) {
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 2)
    }
    return value
}

export default GenbankParser
