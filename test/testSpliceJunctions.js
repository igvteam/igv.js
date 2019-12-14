import BamReader from "../js/bam/bamReader.js";
import SpliceJunctionCounter from "../js/bam/spliceJunctionCounter.js"
import PairedAlignment from "../js/bam/pairedAlignment.js"
import BamAlignment from "../js/bam/bamAlignment.js"

function runSpliceJunctionTests() {

    QUnit.test("Splice Junctions", async function (assert) {

        var done = assert.async();

        //const alignments = await createTestData();
        const sjc = new SpliceJunctionCounter({});
        for (let alignment of alignments) {
            Object.setPrototypeOf(alignment, BamAlignment.prototype)
            sjc.addAlignment(alignment);
        }
        const plusJunction = sjc.getFilteredJunctions('+');
        const allJunctions = sjc.getFilteredJunctions();
        //console.log(JSON.stringify(allJunctions));

        // Verified with IGV desktop.
        const expected = [
            {"start": 98987467, "end": 98987752, "value": 1},
            {"start": 98987518, "end": 98987752, "value": 92},
            {"start": 98987518, "end": 98987756, "value": 10},
            {"start": 98987518, "end": 98990929, "value": 8}
            ]

        allJunctions.sort((a, b) => {
            if(a.start === b.start) {
                return a.end - b.end;
            } else {
                return a.start - b.start;
            }
        })

        for(let i=0; i<expected.length; i++) {
            const j = allJunctions[i];
            const e = expected[i];
            assert.equal(j.value, e.value);
        }

        done();


    });
}

async function createTestData() {
    const chr = 'chr12';
    const bpStart = 98987226;
    const bpEnd = 98995901;
    const bamReader = new BamReader({
        type: 'alignment',
        format: 'bam',
        url: 'https://www.dropbox.com/s/yo7jupzaxgzfgd0/liver_slc25a3.bam?dl=0',
        indexURL: 'https://www.dropbox.com/s/6jamayvq78gn5pm/liver_slc25a3.bam.bai?dl=0'
    });

    const alignmentContainer = await bamReader.readAlignments(chr, bpStart, bpEnd)
    let tmp = [];
    for (let rec of alignmentContainer.alignments) {
        if (rec instanceof PairedAlignment) {
            tmp.push(rec.firstAlignment);
            if (rec.secondAlignment) {
                tmp.push(rec.secondAlignment);
            }
        } else {
            tmp.push(rec);
        }
    }

    // Map to minimal alignment
    tmp = tmp
        .filter(a => {
            return a.start < 98987760 && a.gaps !== undefined
        })
        .map(a => {
            return {
                start: a.start,
                gaps: a.gaps
            }
        })

    console.log(JSON.stringify(tmp))
    return tmp;

}

const alignments = [{"start": 98987453, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987453,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987458, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987458,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987458, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987460,
    "gaps": [{"start": 98987467, "len": 285, "type": "N"}]
}, {"start": 98987465, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987469,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987472, "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]}, {
    "start": 98987472,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987472, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987473,
    "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]
}, {"start": 98987473, "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]}, {
    "start": 98987473,
    "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]
}, {"start": 98987474, "gaps": [{"start": 98987518, "len": 238, "type": "N"}]}, {
    "start": 98987474,
    "gaps": [{"start": 98987518, "len": 238, "type": "N"}]
}, {"start": 98987474, "gaps": [{"start": 98987518, "len": 238, "type": "N"}]}, {
    "start": 98987474,
    "gaps": [{"start": 98987518, "len": 238, "type": "N"}]
}, {"start": 98987475, "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]}, {
    "start": 98987476,
    "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]
}, {"start": 98987476, "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]}, {
    "start": 98987476,
    "gaps": [{"start": 98987518, "len": 3411, "type": "N"}]
}, {"start": 98987478, "gaps": [{"start": 98987518, "len": 238, "type": "N"}]}, {
    "start": 98987479,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987480, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987481,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987481, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987481,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987481, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987482,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987483, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987483,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987483, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987484,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987484, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987485,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987487, "gaps": [{"start": 98987518, "len": 238, "type": "N"}]}, {
    "start": 98987487,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987487, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987488,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987488, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987489,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987489, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987490,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987490, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987491,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987491, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987491,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987491, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987493,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987494, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987494,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987494, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987494,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987494, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987494,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987494, "gaps": [{"start": 98987518, "len": 238, "type": "N"}]}, {
    "start": 98987496,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987496, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987496,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987497, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987497,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987499, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987499,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987499, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987499,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987499, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987499,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987499, "gaps": [{"start": 98987518, "len": 238, "type": "N"}]}, {
    "start": 98987499,
    "gaps": [{"start": 98987518, "len": 238, "type": "N"}]
}, {"start": 98987499, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987499,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987499, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987499,
    "gaps": [{"start": 98987518, "len": 238, "type": "N"}]
}, {"start": 98987499, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987499,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987501, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987501,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987503, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987503,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987503, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987503,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987503, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987504,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987504, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987504,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987504, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987504,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987504, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987504,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987504, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987504,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987504, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987504,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987504, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987505,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987505, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987505,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987505, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987505,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987505, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987505,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987505, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987505,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987505, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987508,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987508, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987510,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987510, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}, {
    "start": 98987512,
    "gaps": [{"start": 98987518, "len": 234, "type": "N"}]
}, {"start": 98987513, "gaps": [{"start": 98987518, "len": 234, "type": "N"}]}]

export default runSpliceJunctionTests;

