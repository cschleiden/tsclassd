# tsclassd #
Generate DGML VS code maps from Typescript code. Doesn't work in all cases yet, and probably can be done in a more elegant way, but for a weekend hacking project it works just enough.

Usage:

`npm install tsclassd` or `npm install -g tsclassd`

`tsclassd <glob input files> <optional: output file, otherwise stdout>`

##Example##

`tsclassd examples\**\*.ts output.dgml`

Rendered using Microsoft Visual Studio:

![Example](https://cschleiden.github.io/tsclassd/pages/example.png)
