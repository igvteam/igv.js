<?php 

$filename=($_POST["filename"]);
$content=($_POST["downloadContent"]);

header("Content-disposition: attachment; filename=". $filename);
header("Content-Type: application/octet-stream; charset=utf-8");

echo $content;

?>
