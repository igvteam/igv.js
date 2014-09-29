<?php 

$filename=($_POST["filename"]);
$content=($_POST["downloadContent"]);

header("Content-disposition: attachment; filename=". $filename);

echo $content;

?>
