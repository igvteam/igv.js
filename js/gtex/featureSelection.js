
class FeatureSelection {

    constructor(gene, snp) {
        this.geneColors = {}
        this.gene = null
        this.snp = null
        this.genesCount = 0

        if (gene) {
            this.gene = gene.toUpperCase()
            this.geneColors[this.gene] = brewer[this.genesCount++]

        }
        if (snp) {
            this.snp = snp.toUpperCase()
        }
    }

    addGene(geneName) {
        if (!this.geneColors[geneName.toUpperCase()]) {
            this.geneColors[geneName.toUpperCase()] = brewer[this.genesCount++]
        }
    }

    colorForGene(geneName) {
        return this.geneColors[geneName.toUpperCase()]
    }
}

var brewer = []
// Set +!
brewer.push("rgb(228,26,28)")
brewer.push("rgb(55,126,184)")
brewer.push("rgb(77,175,74)")
brewer.push("rgb(166,86,40)")
brewer.push("rgb(152,78,163)")
brewer.push("rgb(255,127,0)")
brewer.push("rgb(247,129,191)")
brewer.push("rgb(153,153,153)")
brewer.push("rgb(255,255,51)")

// #Set 2
brewer.push("rgb(102, 194, 165")
brewer.push("rgb(252, 141, 98")
brewer.push("rgb(141, 160, 203")
brewer.push("rgb(231, 138, 195")
brewer.push("rgb(166, 216, 84")
brewer.push("rgb(255, 217, 47")
brewer.push("rgb(229, 196, 148")
brewer.push("rgb(179, 179, 179")

//#Set 3
brewer.push("rgb( 141, 211, 199")
brewer.push("rgb(255, 255, 179")
brewer.push("rgb(190, 186, 218")
brewer.push("rgb(251, 128, 114")
brewer.push("rgb(128, 177, 211")
brewer.push("rgb(253, 180, 98")
brewer.push("rgb(179, 222, 105")
brewer.push("rgb(252, 205, 229")
brewer.push("rgb(217, 217, 217")
brewer.push("rgb(188, 128, 189")
brewer.push("rgb(204, 235, 197")
brewer.push("rgb(255, 237, 111")


export default FeatureSelection
