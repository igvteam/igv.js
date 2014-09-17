<?php

// TODO -- check host name and protect from external use

header("Content-Type:application/download-me");

$filename = "../tmp/".$_GET['filename'];

echo(file_get_contents($filename));

?>