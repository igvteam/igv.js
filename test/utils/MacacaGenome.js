// Mock genome object, based on Macaca fascicularis 5.0

const sizes = {
    "1": 227556264,
    "2": 192460366,
    "3": 192294377,
    "4": 170955103,
    "5": 189454096,
    "6": 181584905,
    "7": 171882078,
    "8": 146850525,
    "9": 133195287,
    "10": 96509753,
    "11": 137757926,
    "12": 132586672,
    "13": 111193037,
    "14": 130733371,
    "15": 112612857,
    "16": 80997621,
    "17": 96864807,
    "18": 75711847,
    "19": 59248254,
    "20": 78541002,
    "X": 152835861,
    "MT": 16575

}

const macacaGenome = {

    id: "macac_fascicularis_5.0",

    getChromosomeName: function (chr) {
        return chr.startsWith("chr") ? chr.substring(3) : chr;
    },

    getChromosome: function (chr) {
        const name = this.getChromosomeName(chr);
        const bpLength = sizes[name];
        return bpLength ? {name, bpLength} : undefined;
    }
}

export {macacaGenome}

