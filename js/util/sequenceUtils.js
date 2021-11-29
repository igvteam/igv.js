const pairs =
    [
        ['A', 'T'],
        ['G', 'C'],
        ['Y', 'R'],
        ['W', 'S'],
        ['K', 'M'],
        ['D', 'H'],
        ['B', 'V']
    ]

const complements = new Map()
for (let p of pairs) {
    const p1 = p[0]
    const p2 = p[1]
    complements.set(p1, p2)
    complements.set(p2, p1)
    complements.set(p1.toLowerCase(), p2.toLowerCase())
    complements.set(p2.toLowerCase(), p1.toLowerCase())
}

function complementBase(base) {
    return complements.has(base) ? complements.get(base) : base
}

function complementSequence(sequence) {
    let comp = ''
    for (let base of sequence) {
        comp += complements.has(base) ? complements.get(base) : base
    }
    return comp
}

function reverseComplementSequence(sequence) {

    let comp = ''
    let idx = sequence.length
    while (idx-- > 0) {
        const base = sequence[idx]
        comp += complements.has(base) ? complements.get(base) : base
    }
    return comp
}

export {complementBase, complementSequence, reverseComplementSequence}

