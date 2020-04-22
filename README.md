# iso19139_mapx_converter
JS functions to translate ISO19139 from/to MapX format

## Environment 

The package has been developed and tested using
- node v12.16.2
- npm 6.14.4

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

Please note that the test script is run using the `--experimental-module` option,
since full ES6 support is only implemented starting from node version 13.


## Run a test on browser

If you want to run a local test, first build the module, then make sure you have python installed on your machine.  
Run:

```shell
python -m SimpleHTTPServer
```
 
 then point the browser on http://localhost:8000/test.html 


## Running on command line

This package implements a mapping from ISO19139 XML documents to MAPX JSON and vice versa.

There are a couple of command line scripts that performs the conversions. 
These scripts can also be used as examples for using the mapping functions.

### ISO19139 to MAPX conversion

Basic usage:

```
node --experimental-modules ./loadISO.js [-v | -vv] INPUT OUTPUT
```

- `-v`: verbose output (i.e. INFO level logging)
- `-vv`: very verbose output (i.e. DEBUG level logging)
- `INPUT`: local filename
- `OUTPUT`: the output file name for the mapx JSON


### MAPX to ISO19139 conversion

Basic usage from command line:

```
node --experimental-modules ./loadMAPX.js [-v | -vv] INPUT OUTPUT
```

- `-v`: verbose output (i.e. INFO level logging)
- `-vv`: very verbose output (i.e. DEBUG level logging)
- `INPUT`: local filename
- `OUTPUT`: the output file name for the ISO19139 XML

### Using the converter in the browser

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
