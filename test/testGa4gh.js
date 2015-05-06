function runGa4ghTests() {

    oauth.google.apiKey = 'AIzaSyDUUAUFpQEN4mumeMNIRWXSiTh5cPtUAD0';

    asyncTest("variantSet metadata", function () {

        var reader = new igv.Ga4ghVariantReader({
            type: "vcf",
            url: "https://www.googleapis.com/genomics/v1beta2",
            variantSetId: "10473108253681171589"
        });


        reader.readMetadata(function (json) {

            ok(json);

            start();

        })
    });

    asyncTest("readGroupSets ", function () {

        var provider = igv.ga4gh.providers[0],
            datasetId = provider.datasets[1].id;

        igv.ga4ghSearchReadGroupSets({
            url: "https://www.googleapis.com/genomics/v1beta2",
            datasetId: datasetId,
            success: function (results) {

                equal(results.length, 16);

                start();
            }
        });
    });

    //asyncTest("variant search", function () {
    //
    //    var reader = new igv.Ga4ghVariantReader({
    //            type: "vcf",
    //            url: "https://www.googleapis.com/genomics/v1beta2",
    //            variantSetId: "10473108253681171589"
    //        }),
    //        chr = "1",
    //        bpStart = 155158585,
    //        bpEnd = 155158624;
    //
    //    reader.readFeatures(chr, bpStart, bpEnd, function (variants) {
    //
    //        ok(variants);
    //        equal(variants.length, 2);
    //
    //
    //        start();
    //
    //    })
    //});


    // Query over wide region -- this takes some time, mainly here as a performance test
//    asyncTest("variant search muc1", function () {
//
//        var reader = new igv.Ga4ghVariantReader({
//                type: "vcf",
//                url: "https://www.googleapis.com/genomics/v1beta2",
//                variantSetId: "10473108253681171589"
//            }),
//            chr = "1",
//            bpStart = 155156300,
//            bpEnd = 155164706;
//
//        var t0 = (new Date()).getTime();
//
//        reader.readFeatures(chr, bpStart, bpEnd, function (variants) {
//
//            ok(variants);
//            equal(variants.length, 77);
//           var dt = (new Date()).getTime() - t0;
//            console.log("T = " + (dt / 1000));
//
//            start();
//
//        })
//    });


    //asyncTest("readGroupSet metadata", function () {
    //
    //    var reader = new igv.Ga4ghAlignmentReader({
    //        type: "bam",
    //        url: "https://www.googleapis.com/genomics/v1beta2",
    //        readGroupSetIds: 'CMvnhpKTFhCjz9_25e_lCw'
    //    });
    //
    //    reader.readMetadata(function (json) {
    //
    //        ok(json);
    //
    //        start();
    //
    //    })
    //});


    //test("Decode bam header", function () {
    //
    //    var sampleJson = {
    //        "id": "CMvnhpKTFhCjz9_25e_lCw",
    //        "name": "HG01440",
    //        "datasetId": "10473108253681171589",
    //        "fileData": [
    //            {
    //                "filename": "HG01440.mapped.ILLUMINA.bwa.CLM.low_coverage.20120522.bam",
    //                "headers": [
    //                    {
    //                        "version": "1.0",
    //                        "sortingOrder": "coordinate"
    //                    }
    //                ],
    //                "refSequences": [
    //                    {
    //                        "name": "1",
    //                        "length": 249250621,
    //                        "md5Checksum": "1b22b98cdeb4a9304cb5d48026a85128",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "2",
    //                        "length": 243199373,
    //                        "md5Checksum": "a0d9851da00400dec1098a9255ac712e",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "3",
    //                        "length": 198022430,
    //                        "md5Checksum": "fdfd811849cc2fadebc929bb925902e5",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "4",
    //                        "length": 191154276,
    //                        "md5Checksum": "23dccd106897542ad87d2765d28a19a1",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "5",
    //                        "length": 180915260,
    //                        "md5Checksum": "0740173db9ffd264d728f32784845cd7",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "6",
    //                        "length": 171115067,
    //                        "md5Checksum": "1d3a93a248d92a729ee764823acbbc6b",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "7",
    //                        "length": 159138663,
    //                        "md5Checksum": "618366e953d6aaad97dbe4777c29375e",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "8",
    //                        "length": 146364022,
    //                        "md5Checksum": "96f514a9929e410c6651697bded59aec",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "9",
    //                        "length": 141213431,
    //                        "md5Checksum": "3e273117f15e0a400f01055d9f393768",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "10",
    //                        "length": 135534747,
    //                        "md5Checksum": "988c28e000e84c26d552359af1ea2e1d",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "11",
    //                        "length": 135006516,
    //                        "md5Checksum": "98c59049a2df285c76ffb1c6db8f8b96",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "12",
    //                        "length": 133851895,
    //                        "md5Checksum": "51851ac0e1a115847ad36449b0015864",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "13",
    //                        "length": 115169878,
    //                        "md5Checksum": "283f8d7892baa81b510a015719ca7b0b",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "14",
    //                        "length": 107349540,
    //                        "md5Checksum": "98f3cae32b2a2e9524bc19813927542e",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "15",
    //                        "length": 102531392,
    //                        "md5Checksum": "e5645a794a8238215b2cd77acb95a078",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "16",
    //                        "length": 90354753,
    //                        "md5Checksum": "fc9b1a7b42b97a864f56b348b06095e6",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "17",
    //                        "length": 81195210,
    //                        "md5Checksum": "351f64d4f4f9ddd45b35336ad97aa6de",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "18",
    //                        "length": 78077248,
    //                        "md5Checksum": "b15d4b2d29dde9d3e4f93d1d0f2cbc9c",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "19",
    //                        "length": 59128983,
    //                        "md5Checksum": "1aacd71f30db8e561810913e0b72636d",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "20",
    //                        "length": 63025520,
    //                        "md5Checksum": "0dec9660ec1efaaf33281c0d5ea2560f",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "21",
    //                        "length": 48129895,
    //                        "md5Checksum": "2979a6085bfe28e3ad6f552f361ed74d",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "22",
    //                        "length": 51304566,
    //                        "md5Checksum": "a718acaa6135fdca8357d5bfe94211dd",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "X",
    //                        "length": 155270560,
    //                        "md5Checksum": "7e0e2e580297b7764e31dbc80c2540dd",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "Y",
    //                        "length": 59373566,
    //                        "md5Checksum": "1fa3474750af0948bdf97d5a0ee52e51",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "MT",
    //                        "length": 16569,
    //                        "md5Checksum": "c68f52674c9fb33aef52dcf399755519",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000207.1",
    //                        "length": 4262,
    //                        "md5Checksum": "f3814841f1939d3ca19072d9e89f3fd7",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000226.1",
    //                        "length": 15008,
    //                        "md5Checksum": "1c1b2cd1fccbc0a99b6a447fa24d1504",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000229.1",
    //                        "length": 19913,
    //                        "md5Checksum": "d0f40ec87de311d8e715b52e4c7062e1",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000231.1",
    //                        "length": 27386,
    //                        "md5Checksum": "ba8882ce3a1efa2080e5d29b956568a4",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000210.1",
    //                        "length": 27682,
    //                        "md5Checksum": "851106a74238044126131ce2a8e5847c",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000239.1",
    //                        "length": 33824,
    //                        "md5Checksum": "99795f15702caec4fa1c4e15f8a29c07",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000235.1",
    //                        "length": 34474,
    //                        "md5Checksum": "118a25ca210cfbcdfb6c2ebb249f9680",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000201.1",
    //                        "length": 36148,
    //                        "md5Checksum": "dfb7e7ec60ffdcb85cb359ea28454ee9",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000247.1",
    //                        "length": 36422,
    //                        "md5Checksum": "7de00226bb7df1c57276ca6baabafd15",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000245.1",
    //                        "length": 36651,
    //                        "md5Checksum": "89bc61960f37d94abf0df2d481ada0ec",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000197.1",
    //                        "length": 37175,
    //                        "md5Checksum": "6f5efdd36643a9b8c8ccad6f2f1edc7b",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000203.1",
    //                        "length": 37498,
    //                        "md5Checksum": "96358c325fe0e70bee73436e8bb14dbd",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000246.1",
    //                        "length": 38154,
    //                        "md5Checksum": "e4afcd31912af9d9c2546acf1cb23af2",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000249.1",
    //                        "length": 38502,
    //                        "md5Checksum": "1d78abec37c15fe29a275eb08d5af236",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000196.1",
    //                        "length": 38914,
    //                        "md5Checksum": "d92206d1bb4c3b4019c43c0875c06dc0",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000248.1",
    //                        "length": 39786,
    //                        "md5Checksum": "5a8e43bec9be36c7b49c84d585107776",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000244.1",
    //                        "length": 39929,
    //                        "md5Checksum": "0996b4475f353ca98bacb756ac479140",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000238.1",
    //                        "length": 39939,
    //                        "md5Checksum": "131b1efc3270cc838686b54e7c34b17b",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000202.1",
    //                        "length": 40103,
    //                        "md5Checksum": "06cbf126247d89664a4faebad130fe9c",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000234.1",
    //                        "length": 40531,
    //                        "md5Checksum": "93f998536b61a56fd0ff47322a911d4b",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000232.1",
    //                        "length": 40652,
    //                        "md5Checksum": "3e06b6741061ad93a8587531307057d8",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000206.1",
    //                        "length": 41001,
    //                        "md5Checksum": "43f69e423533e948bfae5ce1d45bd3f1",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000240.1",
    //                        "length": 41933,
    //                        "md5Checksum": "445a86173da9f237d7bcf41c6cb8cc62",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000236.1",
    //                        "length": 41934,
    //                        "md5Checksum": "fdcd739913efa1fdc64b6c0cd7016779",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000241.1",
    //                        "length": 42152,
    //                        "md5Checksum": "ef4258cdc5a45c206cea8fc3e1d858cf",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000243.1",
    //                        "length": 43341,
    //                        "md5Checksum": "cc34279a7e353136741c9fce79bc4396",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000242.1",
    //                        "length": 43523,
    //                        "md5Checksum": "2f8694fc47576bc81b5fe9e7de0ba49e",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000230.1",
    //                        "length": 43691,
    //                        "md5Checksum": "b4eb71ee878d3706246b7c1dbef69299",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000237.1",
    //                        "length": 45867,
    //                        "md5Checksum": "e0c82e7751df73f4f6d0ed30cdc853c0",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000233.1",
    //                        "length": 45941,
    //                        "md5Checksum": "7fed60298a8d62ff808b74b6ce820001",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000204.1",
    //                        "length": 81310,
    //                        "md5Checksum": "efc49c871536fa8d79cb0a06fa739722",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000198.1",
    //                        "length": 90085,
    //                        "md5Checksum": "868e7784040da90d900d2d1b667a1383",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000208.1",
    //                        "length": 92689,
    //                        "md5Checksum": "aa81be49bf3fe63a79bdc6a6f279abf6",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000191.1",
    //                        "length": 106433,
    //                        "md5Checksum": "d75b436f50a8214ee9c2a51d30b2c2cc",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000227.1",
    //                        "length": 128374,
    //                        "md5Checksum": "a4aead23f8053f2655e468bcc6ecdceb",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000228.1",
    //                        "length": 129120,
    //                        "md5Checksum": "c5a17c97e2c1a0b6a9cc5a6b064b714f",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000214.1",
    //                        "length": 137718,
    //                        "md5Checksum": "46c2032c37f2ed899eb41c0473319a69",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000221.1",
    //                        "length": 155397,
    //                        "md5Checksum": "3238fb74ea87ae857f9c7508d315babb",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000209.1",
    //                        "length": 159169,
    //                        "md5Checksum": "f40598e2a5a6b26e84a3775e0d1e2c81",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000218.1",
    //                        "length": 161147,
    //                        "md5Checksum": "1d708b54644c26c7e01c2dad5426d38c",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000220.1",
    //                        "length": 161802,
    //                        "md5Checksum": "fc35de963c57bf7648429e6454f1c9db",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000213.1",
    //                        "length": 164239,
    //                        "md5Checksum": "9d424fdcc98866650b58f004080a992a",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000211.1",
    //                        "length": 166566,
    //                        "md5Checksum": "7daaa45c66b288847b9b32b964e623d3",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000199.1",
    //                        "length": 169874,
    //                        "md5Checksum": "569af3b73522fab4b40995ae4944e78e",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000217.1",
    //                        "length": 172149,
    //                        "md5Checksum": "6d243e18dea1945fb7f2517615b8f52e",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000216.1",
    //                        "length": 172294,
    //                        "md5Checksum": "642a232d91c486ac339263820aef7fe0",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000215.1",
    //                        "length": 172545,
    //                        "md5Checksum": "5eb3b418480ae67a997957c909375a73",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000205.1",
    //                        "length": 174588,
    //                        "md5Checksum": "d22441398d99caf673e9afb9a1908ec5",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000219.1",
    //                        "length": 179198,
    //                        "md5Checksum": "f977edd13bac459cb2ed4a5457dba1b3",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000224.1",
    //                        "length": 179693,
    //                        "md5Checksum": "d5b2fc04f6b41b212a4198a07f450e20",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000223.1",
    //                        "length": 180455,
    //                        "md5Checksum": "399dfa03bf32022ab52a846f7ca35b30",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000195.1",
    //                        "length": 182896,
    //                        "md5Checksum": "5d9ec007868d517e73543b005ba48535",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000212.1",
    //                        "length": 186858,
    //                        "md5Checksum": "563531689f3dbd691331fd6c5730a88b",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000222.1",
    //                        "length": 186861,
    //                        "md5Checksum": "6fe9abac455169f50470f5a6b01d0f59",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000200.1",
    //                        "length": 187035,
    //                        "md5Checksum": "75e4c8d17cd4addf3917d1703cacaf25",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000193.1",
    //                        "length": 189789,
    //                        "md5Checksum": "dbb6e8ece0b5de29da56601613007c2a",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000194.1",
    //                        "length": 191469,
    //                        "md5Checksum": "6ac8f815bf8e845bb3031b73f812c012",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000225.1",
    //                        "length": 211173,
    //                        "md5Checksum": "63945c3e6962f28ffd469719a747e73c",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "GL000192.1",
    //                        "length": 547496,
    //                        "md5Checksum": "325ba9e808f669dfeee210fdd7b470ac",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "NC_007605",
    //                        "length": 171823,
    //                        "md5Checksum": "6743bd63b3ff2b5b8985d8933c53290a",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    },
    //                    {
    //                        "name": "hs37d5",
    //                        "length": 35477943,
    //                        "md5Checksum": "5b6a4b3a81a2d3c134b7d14bf6ad39f1",
    //                        "uri": "ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_reference_assembly_sequence/hs37d5.fa.gz        AS:NCBI37       SP:Human"
    //                    }
    //                ],
    //                "readGroups": [
    //                    {
    //                        "id": "SRR068145",
    //                        "sequencingCenterName": "BI",
    //                        "description": "SRP001523",
    //                        "library": "Solexa-41478",
    //                        "predictedInsertSize": 500,
    //                        "sequencingTechnology": "ILLUMINA",
    //                        "sample": "HG01440"
    //                    }
    //                ],
    //                "programs": [
    //                    {
    //                        "id": "bwa_index",
    //                        "name": "bwa",
    //                        "commandLine": "bwa index -a bwtsw $reference_fasta",
    //                        "version": "0.5.9-r16"
    //                    },
    //                    {
    //                        "id": "bwa_aln_fastq",
    //                        "name": "bwa",
    //                        "commandLine": "bwa aln -q 15 -f $sai_file $reference_fasta $fastq_file",
    //                        "prevProgramId": "bwa_index",
    //                        "version": "0.5.9-r16"
    //                    },
    //                    {
    //                        "id": "bwa_sam",
    //                        "name": "bwa",
    //                        "commandLine": "bwa sampe -a 1500 -r $rg_line -f $sam_file $reference_fasta $sai_file(s) $fastq_file(s)",
    //                        "prevProgramId": "bwa_aln_fastq",
    //                        "version": "0.5.9-r16"
    //                    },
    //                    {
    //                        "id": "sam_to_fixed_bam",
    //                        "name": "samtools",
    //                        "commandLine": "samtools view -bSu $sam_file | samtools sort -n -o - samtools_nsort_tmp | samtools fixmate /dev/stdin /dev/stdout | samtools sort -o - samtools_csort_tmp | samtools fillmd -u - $reference_fasta > $fixed_bam_file",
    //                        "prevProgramId": "bwa_sam",
    //                        "version": "0.1.17 (r973:277)"
    //                    },
    //                    {
    //                        "id": "gatk_target_interval_creator",
    //                        "name": "GenomeAnalysisTK",
    //                        "commandLine": "java $jvm_args -jar GenomeAnalysisTK.jar -T RealignerTargetCreator -R $reference_fasta -o $intervals_file -known $known_indels_file(s) ",
    //                        "prevProgramId": "sam_to_fixed_bam",
    //                        "version": "1.2-29-g0acaf2d"
    //                    },
    //                    {
    //                        "id": "bam_realignment_around_known_indels",
    //                        "name": "GenomeAnalysisTK",
    //                        "commandLine": "java $jvm_args -jar GenomeAnalysisTK.jar -T IndelRealigner -R $reference_fasta -I $bam_file -o $realigned_bam_file -targetIntervals $intervals_file -known $known_indels_file(s) -LOD 0.4 -model KNOWNS_ONLY -compress 0 --disable_bam_indexing",
    //                        "prevProgramId": "gatk_target_interval_creator",
    //                        "version": "1.2-29-g0acaf2d"
    //                    },
    //                    {
    //                        "id": "bam_count_covariates",
    //                        "name": "GenomeAnalysisTK",
    //                        "commandLine": "java $jvm_args -jar GenomeAnalysisTK.jar -T CountCovariates -R $reference_fasta -I $bam_file -recalFile $bam_file.recal_data.csv -knownSites $known_sites_file(s) -l INFO -L '1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;X;Y;MT' -cov ReadGroupCovariate -cov QualityScoreCovariate -cov CycleCovariate -cov DinucCovariate",
    //                        "prevProgramId": "bam_realignment_around_known_indels",
    //                        "version": "1.2-29-g0acaf2d"
    //                    },
    //                    {
    //                        "id": "bam_recalibrate_quality_scores",
    //                        "name": "GenomeAnalysisTK",
    //                        "commandLine": "java $jvm_args -jar GenomeAnalysisTK.jar -T TableRecalibration -R $reference_fasta -recalFile $bam_file.recal_data.csv -I $bam_file -o $recalibrated_bam_file -l INFO -compress 0 --disable_bam_indexing",
    //                        "prevProgramId": "bam_count_covariates",
    //                        "version": "1.2-29-g0acaf2d"
    //                    },
    //                    {
    //                        "id": "bam_calculate_bq",
    //                        "name": "samtools",
    //                        "commandLine": "samtools calmd -Erb $bam_file $reference_fasta > $bq_bam_file",
    //                        "prevProgramId": "bam_recalibrate_quality_scores",
    //                        "version": "0.1.17 (r973:277)"
    //                    },
    //                    {
    //                        "id": "bam_merge",
    //                        "name": "picard",
    //                        "commandLine": "java $jvm_args -jar MergeSamFiles.jar INPUT=$bam_file(s) OUTPUT=$merged_bam VALIDATION_STRINGENCY=SILENT",
    //                        "prevProgramId": "bam_calculate_bq",
    //                        "version": "1.53"
    //                    },
    //                    {
    //                        "id": "bam_mark_duplicates",
    //                        "name": "picard",
    //                        "commandLine": "java $jvm_args -jar MarkDuplicates.jar INPUT=$bam_file OUTPUT=$markdup_bam_file ASSUME_SORTED=TRUE METRICS_FILE=/dev/null VALIDATION_STRINGENCY=SILENT",
    //                        "prevProgramId": "bam_merge",
    //                        "version": "1.53"
    //                    },
    //                    {
    //                        "id": "bam_merge.1",
    //                        "name": "picard",
    //                        "commandLine": "java $jvm_args -jar MergeSamFiles.jar INPUT=$bam_file(s) OUTPUT=$merged_bam VALIDATION_STRINGENCY=SILENT",
    //                        "prevProgramId": "bam_mark_duplicates",
    //                        "version": "1.53"
    //                    }
    //                ],
    //                "comments": [
    //                    "$known_indels_file(s) = ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_mapping_resources/ALL.wgs.indels_mills_devine_hg19_leftAligned_collapsed_double_hit.indels.sites.vcf.gz",
    //                    "$known_indels_file(s) .= ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_mapping_resources/ALL.wgs.low_coverage_vqsr.20101123.indels.sites.vcf.gz",
    //                    "$known_sites_file(s) = ftp://ftp.1000genomes.ebi.ac.uk/vol1/ftp/technical/reference/phase2_mapping_resources/ALL.wgs.dbsnp.build135.snps.sites.vcf.gz"
    //                ]
    //            }
    //        ]
    //    };
    //
    //    var sequenceNames = igv.decodeGa4ghReadset(sampleJson);
    //    ok(sequenceNames);
    //
    //    ok(sequenceNames.indexOf("MT") > 0);
    //
    //    // equal(101, alignment.lengthOnRef);
    //    // equal(true, alignment.strand);
    //
    //
    //});
}
