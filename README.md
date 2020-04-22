# iso19139_mapx_converter
JS functions to translate ISO19139 from/to MapX format

## Building and Installing

Grab the source by git cloning and run

```shell
npm install
```

to install the required dependencies.


## Build the bundle

In order to build the standalone bundle file, run

```shell
npm run build
```

You'll find the compiled js in `dist/iso19139_mapx_converter.js`.


## Run the tests

In order to run the tests, run

```shell
npm run test
```

## Run a client test

make sure you have python installed on your machine.  
Run

```shell
python -m SimpleHTTPServer
```
 
 then point the browser on http://localhost:8000/test.html 



## Running via node

This package implements a mapping from ISO19139 XML documents to MAPX JSON and vice versa.

There are also a couple of command line scripts that performs the conversions. 
These scripts can also be used as examples for using the mapping functions.

### ISO19139 to MAPX conversion

Basic usage:

```
node --experimental-modules ./loadISO.js [-v | -vv] INPUT OUTPUT
```

- `-v`: verbose output (i.e. INFO level logging)
- `-vv`: very verbose output (i.e. DEBUG level logging)
- `INPUT`: local file
- `OUTPUT`: the output file name for the mapx JSON


### MAPX to ISO19139 conversion

Basic usage from command line:

```
node --experimental-modules ./loadMAPX.js [-v | -vv] INPUT OUTPUT
```

- `-v`: verbose output (i.e. INFO level logging)
- `-vv`: very verbose output (i.e. DEBUG level logging)
- `INPUT`: local file
- `OUTPUT`: the output file name for the ISO19139 XML

### Using the cenoverter in the browser

You can find a working example in the `test.html` file.

You need to include the bundle file, e.g.

```
<script src="dist/iso19139_mapx_converter.js"></script>
```

You can then call the functions in this way:

```js
        function iso2mapx() {
            var iso_xml = document.getElementById("ta_iso").value;
            var mapx_txt = window.iso19139_mapx_converter.iso19139_to_mapx(iso_xml);
            document.getElementById("ta_mapx").value = mapx_txt;            
        }
        
        function mapx2iso() {
            var mapx = document.getElementById("ta_mapx").value;
            var iso = window.iso19139_mapx_converter.mapx_to_iso19139(mapx);
            document.getElementById("ta_iso").value = iso;            
        }
```


You may want to read the [wiki pages](https://github.com/geosolutions-it/iso19139_mapx_converter/wiki/) for more detailed info.
