/// <reference path="../typings/typescript/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/typescript/typescript.d.ts" />
var fs = require('fs');
var ts = require("typescript");
var templates = require("./templates");
var path = require("path");
function stringToModuleKind(format) {
    switch (format) {
        case "AMD":
            return 2 /* AMD */;
        case "CommonJS":
            return 1 /* CommonJS */;
        case "System":
            return 4 /* System */;
        case "UMD":
            return 3 /* UMD */;
    }
}
var Generator = (function () {
    function Generator(files, moduleFormat, useAbsoluteImportPaths) {
        if (useAbsoluteImportPaths === void 0) { useAbsoluteImportPaths = false; }
        this.files = files;
        this.useAbsoluteImportPaths = useAbsoluteImportPaths;
        /** Known, user-defined types */
        this.validLinkTargets = {};
        this.nodes = [];
        this.links = [];
        this.moduleImportNames = {};
        this.file = null;
        var compilerOptions = {
            noEmitOnError: true,
            noImplicitAny: true,
            target: 1 /* ES5 */,
            module: stringToModuleKind(moduleFormat)
        };
        var host = ts.createCompilerHost(compilerOptions, true);
        this.program = ts.createProgram(this.files, compilerOptions, host);
        this.tc = this.program.getTypeChecker();
    }
    Generator.prototype.output = function (outputFileName) {
        for (var _i = 0, _a = this.files; _i < _a.length; _i++) {
            var file = _a[_i];
            var sourceFile = this.program.getSourceFile(file);
            // New file, clear imports         
            this.moduleImportNames = {};
            this.currentFilePath = path.normalize(path.dirname(sourceFile.fileName));
            var normalizedFileName = path.normalize(sourceFile.fileName);
            this.addNode(templates.fileNode(normalizedFileName));
            // Allow links to this file
            this.validLinkTargets[normalizedFileName] = true;
            this.iterateTypes(sourceFile);
        }
        if (outputFileName) {
            this.file = fs.openSync(outputFileName, "w");
        }
        this.writeHeader();
        this.writeData();
        this.writeFooter();
        if (this.file) {
            fs.closeSync(this.file);
        }
    };
    Generator.prototype.resolvePropertyTypeName = function (node, enclosingNode) {
        var parentNode = enclosingNode || node.parent;
        var t = this.tc.getTypeAtLocation(node);
        if (!t) {
            console.log("Undefined type");
        }
        var fullyQualifiedName = this.tc.typeToString(t, parentNode, 128 /* UseFullyQualifiedType */ | 64 /* InElementType */
            | 4 /* NoTruncation */ | 16 /* WriteOwnNameForAnyLike */);
        if (t.symbol && t.symbol.name === "Array") {
            // For our purpose, we need the base type
            fullyQualifiedName = fullyQualifiedName.replace("[]", "");
        }
        var segments = fullyQualifiedName.split(".");
        if (this.moduleImportNames[segments[0]]) {
            // Type is from a known module import
            segments[0] = this.moduleImportNames[segments[0]];
            return segments.join(Generator.SEPARATOR);
        }
        // Type is in our module, get path to parent
        return this.getParentScope(parentNode) + Generator.SEPARATOR + fullyQualifiedName;
    };
    Generator.prototype.walkHeritageClauses = function (parentPath, parentId, c) {
        // See if class inherits/implements anything
        if (c.heritageClauses) {
            var source = parentPath + Generator.SEPARATOR + parentId;
            for (var _i = 0, _a = c.heritageClauses; _i < _a.length; _i++) {
                var heritageClause = _a[_i];
                if (heritageClause.token === 106 /* ImplementsKeyword */) {
                    var typeName = this.resolvePropertyTypeName(heritageClause.types[0], c);
                    this.addLink(source, typeName, templates.implementsLink);
                }
                else if (heritageClause.token === 83 /* ExtendsKeyword */) {
                    var typeName = this.resolvePropertyTypeName(heritageClause.types[0], c);
                    this.addLink(source, typeName, templates.extendsLink);
                }
            }
        }
    };
    Generator.prototype.getParentScope = function (node, includeSelf) {
        if (includeSelf === void 0) { includeSelf = false; }
        var parentSegments = [];
        var p = includeSelf ? node : node.parent;
        while (p != null) {
            switch (p.kind) {
                // Sourcefile
                case 248 /* SourceFile */: {
                    parentSegments.push(path.normalize(p.fileName));
                    break;
                }
                // Module
                case 218 /* ModuleDeclaration */: {
                    var m = p;
                    parentSegments.push(m.name.text);
                    break;
                }
                // Interface
                case 215 /* InterfaceDeclaration */: {
                    var i = p;
                    parentSegments.push(i.name.text);
                    break;
                }
                // Class
                case 214 /* ClassDeclaration */: {
                    var c = p;
                    parentSegments.push(c.name.text);
                    break;
                }
            }
            p = p.parent;
        }
        return parentSegments.reverse().join(Generator.SEPARATOR);
    };
    Generator.prototype.iterateTypes = function (node) {
        if (!node) {
            return;
        }
        var parentPath = this.getParentScope(node);
        switch (node.kind) {
            // Module import
            case 221 /* ImportEqualsDeclaration */: {
                // Other module is imported
                var m = node;
                if (m.moduleReference.kind === 232 /* ExternalModuleReference */) {
                    var importName = m.name.text;
                    var fileName = m.moduleReference.expression.text + ".ts";
                    if (this.useAbsoluteImportPaths) {
                        this.moduleImportNames[importName] = path.normalize(fileName);
                    }
                    else {
                        this.moduleImportNames[importName] = path.normalize(path.join(this.currentFilePath, fileName));
                    }
                }
                break;
            }
            // Local module
            case 218 /* ModuleDeclaration */: {
                var m = node;
                this.validLinkTargets[parentPath + Generator.SEPARATOR + m.name.text] = true;
                this.addNode(templates.moduleNode(parentPath, m.name.text));
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + m.name.text, templates.containsLink);
                break;
            }
            // Interface
            case 215 /* InterfaceDeclaration */: {
                var i = node;
                this.validLinkTargets[parentPath + Generator.SEPARATOR + i.name.text] = true;
                this.addNode(templates.interfaceNode(parentPath, i.name.text));
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + i.name.text, templates.containsLink);
                this.walkHeritageClauses(parentPath, i.name.text, i);
                break;
            }
            // Class
            case 214 /* ClassDeclaration */: {
                var c = node;
                this.validLinkTargets[parentPath + Generator.SEPARATOR + c.name.text] = true;
                this.addNode(templates.classNode(parentPath, c.name.text));
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + c.name.text, templates.containsLink);
                this.walkHeritageClauses(parentPath, c.name.text, c);
                break;
            }
            case 144 /* Constructor */: {
                var c = node;
                for (var _i = 0, _a = c.parameters; _i < _a.length; _i++) {
                    var parameter = _a[_i];
                    if (parameter.flags & 16 /* Public */ || parameter.flags & 32 /* Private */) {
                        var typeName = this.resolvePropertyTypeName(parameter, node.parent);
                        this.addField(parentPath, parameter, parameter.name.text, typeName);
                    }
                }
                break;
            }
            // Property
            case 140 /* PropertySignature */:
            case 141 /* PropertyDeclaration */: {
                var property = node;
                var name_1 = property.name.text;
                var typeName = this.resolvePropertyTypeName(node, node.parent);
                this.addField(parentPath, property, name_1, typeName);
                break;
            }
            // Method
            case 143 /* MethodDeclaration */: {
                var method = node;
                var name_2 = method.name.text;
                this.addNode(templates.methodNode(parentPath, name_2, (method.flags & 32 /* Private */) !== 0, (method.flags & 128 /* Static */) !== 0));
                this.validLinkTargets[parentPath + Generator.SEPARATOR + name_2] = true;
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + name_2, templates.containsLink);
                break;
            }
        }
        ts.forEachChild(node, this.iterateTypes.bind(this));
    };
    Generator.prototype.addField = function (parentPath, node, name, typeName) {
        this.addNode(templates.propertyNode(parentPath, name, (node.flags & 32 /* Private */) === 32 /* Private */, (node.flags & 16 /* Public */) === 16 /* Public */));
        this.validLinkTargets[parentPath + Generator.SEPARATOR + name] = true;
        this.addLink(parentPath, parentPath + Generator.SEPARATOR + name, templates.containsLink);
        // Reference type of property        
        this.addLink(parentPath + Generator.SEPARATOR + name, typeName, templates.referencesLink);
    };
    Generator.prototype.addNode = function (node) {
        this.nodes.push(node);
    };
    Generator.prototype.addLink = function (source, target, templateFunc) {
        this.links.push([source, target, templateFunc(source, target)]);
    };
    Generator.prototype.writeHeader = function () {
        this.writeString(fs.readFileSync(__dirname + "/../templates/header.xml", 'utf8'));
    };
    Generator.prototype.writeData = function () {
        this.writeString("<Nodes>");
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            this.writeString(node);
        }
        this.writeString("</Nodes>");
        this.writeString("<Links>");
        for (var _b = 0, _c = this.links; _b < _c.length; _b++) {
            var link = _c[_b];
            // Exclude external types
            if (this.validLinkTargets[link[1]]) {
                this.writeString(link[2]);
            }
            else {
            }
        }
        this.writeString("</Links>");
    };
    Generator.prototype.writeFooter = function () {
        this.writeString(fs.readFileSync(__dirname + "/../templates/footer.xml", 'utf8'));
    };
    Generator.prototype.writeString = function (str) {
        if (this.file) {
            // Work around typings issue
            fs.writeSync(this.file, str);
        }
        else {
            console.log(str);
        }
    };
    Generator.SEPARATOR = path.sep;
    return Generator;
})();
exports.Generator = Generator;
//# sourceMappingURL=tsclassd.js.map