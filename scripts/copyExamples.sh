#!/bin/bash
for file in $1/*.html
do
  fn=$(basename $file)
  sed 's%igv.org/web/release%igv.org/web/test%g' $file | sed 's/1.0.1/multilocus/g' > $2/$fn
done

