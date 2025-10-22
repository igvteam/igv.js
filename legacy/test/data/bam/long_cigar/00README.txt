This directory is configured with CORS. It contains the following files:

* cigar-64k.fa.gz: three Oxford Nanopore reads extracted from the NA12878
  ultra-long data set [1].

* cigar-64k.sam.gz: cigar-64k.fa.gz mapped to human genome hs37d5 with minimap2
  r520. With command line: "minimap2 -ax map-ont hs37d5.fa cigar-64k.fa.gz",
  the second read will be aligned to chr13 with >65535 CIGAR operations.

* cigar-64k.tag.sam.gz: mapped with command line (-L moves long-cigar to the CG
  tag): "minimap2 -ax map-ont -L hs37d5.fa cigar-64k.fa.gz"

* cigar-64k.bam: converted from cigar-64k.sam.gz via long-cigar-aware samtools.
  Converting cigar-64k.tag.sam.gz to BAM would result in the same BAM.

* cigar-64k.hg19.*: chromosome names manually modified to match hg19. For
  testing purpose.

* samtools-1.6+CG_x64-linux.tar.bz2: samtools 1.6 plus long CIGAR support.

* htsjdk-2.12.0-6-gddcdc5b-SNAPSHOT.jar: htsjdk 2.12.0 plus long CIGAR support.
  To test:

    java -cp htsjdk.jar htsjdk.samtools.example.PrintReadsExample cigar-64k.sam.gz true out.bam

[1] https://github.com/nanopore-wgs-consortium/NA12878#rel4
