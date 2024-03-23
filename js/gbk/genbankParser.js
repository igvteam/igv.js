import {igvxhr} from "../../node_modules/igv-utils/src/index.js"
import getDataWrapper from "../feature/dataWrapper.js"
import Genbank from "./genbank.js"

const wsRegex = /\s+/

const genbankCache = new Map();

async function loadGenbank(url) {
    let genbank = genbankCache.get(url);

    if (!genbank) {
        const data = await igvxhr.loadString(url, {});
        genbank = parseGenbank(data);
        genbank.url = url
        genbankCache.set(url, genbank);
    }

    return genbank;
}


function parseGenbank(data) {


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
    let accession, aliases
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
    const sequence = parseSequence(dataWrapper)

    return new Genbank({chr, locus, accession, aliases, features, sequence})
}


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
function parseSequence(dataWrapper) {

    let nextLine
    let sequence = ""

    while ((nextLine = dataWrapper.nextLine()) && !nextLine.startsWith("//")) {
        nextLine = nextLine.trim()
        const tokens = nextLine.split(/\s+/)
        for (let i = 1; i < tokens.length; i++) {
            sequence += tokens[i]
        }
    }
    return sequence
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

    //Process features until "ORIGIN" or end of file
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
                attributes: {},
                getAttributeValue: function(key) {return this.attributes[key]}
            }
            currentLocQualifier = nextLine.substring(21)

            if (featureType.toLowerCase() !== "source") {
                features.push(f)
            }

        } else {
            let tmp = nextLine.substring(21).trim()
            if (tmp.length > 0)

                if (tmp.charCodeAt(0) === 47) {   // 47 == '/'
                    if (currentLocQualifier.charCodeAt(0) === 47) {
                        let tokens = currentLocQualifier.split("=", 2)
                        if (tokens.length > 1) {
                            let keyName = tokens[0].length > 1 ? tokens[0].substring(1) : ""
                            let value = stripQuotes(tokens[1])
                            f.attributes[keyName] = value

                        } else {
                            // TODO -- don't know how to interpret, log?
                        }
                    } else {
                        // Assumed to be a continuation of the location string.  There are many forms of this string,
                        // igv only supports "join()"

                        // Crude test for strand
                        const strand = currentLocQualifier.includes("complement") ? "-" : "+"
                        f.strand = strand

                        let joinString = currentLocQualifier.replace("join", "")
                            .replace("order", "")
                            .replace("complement", "")
                            .replace("(", "")
                            .replace(")", "")

                        if (joinString.includes("..")) {
                            joinString = joinString.replace("<", "")
                                .replace(">", "")

                            const exons = createExons(joinString, chr, strand)
                            const firstExon = exons[0]
                            f.start = firstExon.start
                            const lastExon = exons[exons.length - 1]
                            f.end = lastExon.end
                            if (exons.length > 1) {
                                f.exons = exons
                            }
                        } else {
                            // TODO Single locus for now, other forms possible
                            //  const start = parseInt(joinString) - 1;const end = start + 1;
                            f.start = parseInt(joinString) - 1
                            f.end = f.start + 1
                        }
                    }
                    currentLocQualifier = tmp
                } else {
                    currentLocQualifier = currentLocQualifier + tmp
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
function createExons(joinString, chr, strand) {

    const lociArray = joinString.split(",")
    const exons = []
    const isNegative = joinString.includes("complement")

    for (const loci of lociArray) {
        const tmp = loci.split("..")
        let exonStart = 0 // - (isNegative ? 0 : 1);

        try {
            exonStart = parseInt(tmp[0]) - 1
        } catch (e) {
            console.error(e) // Handle error appropriately
        }

        let exonEnd = exonStart + 1
        if (tmp.length > 1) {
            exonEnd = parseInt(tmp[1])
        }

        exons.push({
            chr: chr,
            start: exonStart,
            end: exonEnd,
            strand: strand
        })
    }
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

export {loadGenbank, parseGenbank}
