/**
 * Created by turner on 3/20/14.
 */
function runCoverageColoredRenderingTests(assert) {

    QUnit.test( "Test Mismatch Array Creation", function(assert) {

        var doIncrement = function(key, base, index) {

//            assert.ok(mismatches[ key ]);
//            assert.ok(mismatches[ key + base ]);

            if (null == mismatches[ key ][ index]) {

                mismatches[ key ][ index] = 1;
            } else {

                ++mismatches[ key ][ index];
            }

            if (null == mismatches[ key + base ][ index]) {

                mismatches[ key + base ][ index] = 1;
            } else {

                ++mismatches[ key + base ][ index ];
            }

        };

        var doIncrementBase = function(base, strand, bp) {

            var index = bp - start;

            var key = (strand < 0) ? "neg" : "pos";
            doIncrement(key, base, index);
        };

        var doIncrementQual = function(base, bp) {

            doIncrement("qual", base);
        };

        var doTraverse = function(posnegqual, atcgn) {

            posnegqual.forEach(function(pnq) {

                assert.ok(mismatches[ pnq ]);
                assert.equal(mismatches[ pnq ].length, count);

                atcgn.forEach(function(base) {

                    assert.ok(mismatches[ (pnq + base) ]);
                    assert.equal(mismatches[ (pnq + base) ].length, count);
                });

            });

        };

        var i,
            len,
            start,
            end,
            mismatches,
            count,
            posnegqual = [ "pos", "neg", "qual" ],
            atcgn = ["A", "T", "C", "G", "N"],
            readChar,
            readSequence = "NCCACGCG";

        start = 8;
        end = start + readSequence.length;

        count = (end - start);
        mismatches =
        {
            posA:new Array(count), negA:new Array(count),
            posT:new Array(count), negT:new Array(count),
            posC:new Array(count), negC:new Array(count),
            posG:new Array(count), negG:new Array(count),
            posN:new Array(count), negN:new Array(count),

            pos: new Array(count), neg: new Array(count),

            qualA:new Array(count),
            qualT:new Array(count),
            qualC:new Array(count),
            qualG:new Array(count),
            qualN:new Array(count),

            qual: new Array(count),

            incrementBase: doIncrementBase,
            incrementQual: doIncrementQual,
            traverse: doTraverse
        };

        assert.ok(mismatches, "mismatches");
        assert.ok(mismatches.posA, "mismatches.posA");

        assert.ok(mismatches.pos, "mismatches.pos");
        assert.equal(mismatches.qual.length, count);

        assert.ok(mismatches[ posnegqual[ 0 ] ]);
        assert.ok(mismatches[ posnegqual[ 0 ] + atcgn[ 2 ] ]);

        assert.equal(mismatches[ posnegqual[ 0 ] + atcgn[ 2 ] ].length, count);

        mismatches.traverse(posnegqual, atcgn);

        for (i = 0, len = readSequence.length; i < len; i++) {
            readChar = readSequence[ i ];
            mismatches.incrementBase(readChar, -1, 7);
        }

    });
}

export default runCoverageColoredRenderingTests;
