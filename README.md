# iso19139_mapx_converter
JS functions to translate ISO19139 from/to MapX format

## Building and Installing

Grab the source by git cloning and run

```shell
node install
```

to install the required dependencies.

## Running via node

This package implements a mapping from ISO19139 XML documents to MAPX JSON and vice versa.

There are anyway also a couple of command line scripts that performs the conversions. 
These scripts can also be used as examples for using the mapping functions.

### ISO19139 to MAPX conversion

Basic usage:

```
node ./loadISO.js [-v | -vv] INPUT OUTPUT
```

- `-v`: verbose output (i.e. INFO level logging)
- `-vv`: very verbose output (i.e. DEBUG level logging)
- `INPUT`: either: HTTP URL, HTTPS URL, local file
- `OUTPUT`: the output file name for the mapx JSON


### MAPX to ISO19139 conversion


Basic usage:

```
node ./loadMAPX.js [-v | -vv] INPUT OUTPUT
```

- `-v`: verbose output (i.e. INFO level logging)
- `-vv`: very verbose output (i.e. DEBUG level logging)
- `INPUT`: either: HTTP URL, HTTPS URL, local file
- `OUTPUT`: the output file name for the ISO19139 XML


You may want to read the [wiki pages](https://github.com/geosolutions-it/iso19139_mapx_converter/wiki/) for more detailed indo.
