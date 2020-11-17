# data-modal
A data resource browser and selector based on DataTables.  Used by igv applications for selecting files from ENCODE and other data resources.




#### datasource

A ModalTable fetches data to build the table from a datasource.  

* ``` async tableColumns() ```  Return the column headings as an array of strings

* ``` async tableData()  ```  Return the table data as an array of objects.  Each object has properties corresponding to the table columns

