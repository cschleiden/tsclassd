# tsclassd #
Generate DGML VS code maps from Typescript code. Doesn't work in all cases yet, and probably can be done in a more elegant way, but for a weekend hacking project it works just enough.

Usage:

`npm install tsclassd` or `npm install -g tsclassd`

`tsclassd --help` 

or

`tsclassd -i <glob input files> [-o output.dgml] [-m AMD/System/UMD/...] [-useAbsoluteImports]`

##Example##

`tsclassd -i examples\**\*.ts -o output.dgml -moduleFormat AMD`

Rendered using Microsoft Visual Studio:

![Example](https://cschleiden.github.io/tsclassd/pages/example.png)
