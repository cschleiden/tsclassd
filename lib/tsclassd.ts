/// <reference path="../typings/typescript/lib.es6.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/typescript/typescript.d.ts" />

import fs = require('fs');
import ts = require("typescript");
import templates = require("./templates");
import path = require("path");
import glob = require("glob");

export class Generator {
    private static SEPARATOR = path.sep;

    private program: ts.Program;
    private tc: ts.TypeChecker;

    /** Known, user-defined types */
    private validLinkTargets: { [typeName: string]: boolean } = {};
    private nodes: string[] = [];
    private links: [string, string, string][] = [];

    private moduleImportNames: { [importName: string]: string } = {};
    private currentFilePath: string;

    private file: number = null;

    constructor(private files: string[]) {
        var compilerOptions: ts.CompilerOptions = {
            noEmitOnError: true,
            noImplicitAny: true,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.CommonJS
        };

        var host = ts.createCompilerHost(compilerOptions, true);

        this.program = ts.createProgram(this.files, compilerOptions, host);

        this.tc = this.program.getTypeChecker();
    }

    public output(outputFileName: string) {
        for (var file of this.files) {
            let sourceFile = this.program.getSourceFile(file);

            // New file, clear imports         
            this.moduleImportNames = {};
            this.currentFilePath = path.normalize(path.dirname(sourceFile.fileName));

            let normalizedFileName = path.normalize(sourceFile.fileName);
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
    }

    private resolvePropertyTypeName(node: ts.Node, enclosingNode?: ts.Node): string {
        var parentNode = enclosingNode || node.parent;

        var t = this.tc.getTypeAtLocation(node);

        var fullyQualifiedName = this.tc.typeToString(
            t, parentNode, ts.TypeFormatFlags.UseFullyQualifiedType | ts.TypeFormatFlags.InElementType | ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteOwnNameForAnyLike);

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
    }

    private walkHeritageClauses(parentPath: string, parentId: string, c: ts.ClassLikeDeclaration | ts.InterfaceDeclaration) {
        // See if class inherits/implements anything
        if (c.heritageClauses) {
            let source = parentPath + Generator.SEPARATOR + parentId

            for (let heritageClause of c.heritageClauses) {
                if (heritageClause.token === ts.SyntaxKind.ImplementsKeyword) {
                    let typeName = this.resolvePropertyTypeName(heritageClause.types[0], c);

                    this.addLink(source, typeName, templates.implementsLink);
                } else if (heritageClause.token === ts.SyntaxKind.ExtendsKeyword) {
                    let typeName = this.resolvePropertyTypeName(heritageClause.types[0], c);

                    this.addLink(source, typeName, templates.extendsLink);
                }
            }
        }
    }

    private getParentScope(node: ts.Node, includeSelf: boolean = false): string {
        var parentSegments: string[] = [];

        var p: ts.Node = includeSelf ? node : node.parent;

        while (p != null) {
            switch (p.kind) {
                // Sourcefile
                case ts.SyntaxKind.SourceFile: {
                    parentSegments.push(path.normalize((<ts.SourceFile>p).fileName));
                    break;
                }
                
                // Module
                case ts.SyntaxKind.ModuleDeclaration: {
                    let m = <ts.ModuleDeclaration>p;
                    parentSegments.push(m.name.text);

                    break;
                }
                
                // Interface
                case ts.SyntaxKind.InterfaceDeclaration: {
                    let i = <ts.InterfaceDeclaration>p;
                    parentSegments.push(i.name.text);
                    break;
                }
                
                // Class
                case ts.SyntaxKind.ClassDeclaration: {
                    let c = <ts.ClassDeclaration>p;
                    parentSegments.push(c.name.text);
                    break;
                }
            }

            p = p.parent;
        }

        return parentSegments.reverse().join(Generator.SEPARATOR);
    }

    private iterateTypes(node: ts.Node) {
        if (!node) {
            return;
        }

        var parentPath = this.getParentScope(node);

        switch (node.kind) {
            // Module import
            case ts.SyntaxKind.ImportEqualsDeclaration: {
                // Other module is imported
                let m = <ts.ImportEqualsDeclaration>node;

                if (m.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference) {
                    let importName = m.name.text;
                    let fileName = (<ts.LiteralExpression>(<ts.ExternalModuleReference>m.moduleReference).expression).text + ".ts";

                    this.moduleImportNames[importName] = path.normalize(path.join(this.currentFilePath, fileName));
                }

                break;
            }
        
            // Local module
            case ts.SyntaxKind.ModuleDeclaration: {
                let m = <ts.ModuleDeclaration>node;

                this.validLinkTargets[parentPath + Generator.SEPARATOR + m.name.text] = true;

                this.addNode(templates.moduleNode(parentPath, m.name.text));
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + m.name.text, templates.containsLink);

                break;
            }
            
            // Interface
            case ts.SyntaxKind.InterfaceDeclaration: {
                let i = <ts.InterfaceDeclaration>node;

                this.validLinkTargets[parentPath + Generator.SEPARATOR + i.name.text] = true;

                this.addNode(templates.interfaceNode(parentPath, i.name.text));
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + i.name.text, templates.containsLink);

                this.walkHeritageClauses(parentPath, i.name.text, i);

                break;
            }
        
            // Class
            case ts.SyntaxKind.ClassDeclaration: {
                let c = <ts.ClassDeclaration>node;

                this.validLinkTargets[parentPath + Generator.SEPARATOR + c.name.text] = true;

                this.addNode(templates.classNode(parentPath, c.name.text));
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + c.name.text, templates.containsLink);

                this.walkHeritageClauses(parentPath, c.name.text, c);

                break;
            }

            case ts.SyntaxKind.Constructor: {
                let c = <ts.ConstructorDeclaration>node;

                for (var parameter of c.parameters) {
                    if (parameter.flags & ts.NodeFlags.Public || parameter.flags & ts.NodeFlags.Private) {
                        let typeName = this.resolvePropertyTypeName(parameter, node.parent);

                        this.addField(parentPath, parameter, (<ts.Identifier>parameter.name).text, typeName);
                    }
                }

                break;
            }
                       
            // Property
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.PropertyDeclaration: {
                let property = <ts.PropertyDeclaration>node;

                let name = (<ts.Identifier>property.name).text
                let typeName = this.resolvePropertyTypeName(node, node.parent);

                this.addField(parentPath, property, name, typeName);

                break;
            }

            // Method
            case ts.SyntaxKind.MethodDeclaration: {
                let method = <ts.MethodDeclaration>node;
                let name = (<ts.Identifier>method.name).text;

                this.addNode(templates.methodNode(parentPath, name, (method.flags & ts.NodeFlags.Private) !== 0, (method.flags & ts.NodeFlags.Static) !== 0));
                this.validLinkTargets[parentPath + Generator.SEPARATOR + name] = true;
                this.addLink(parentPath, parentPath + Generator.SEPARATOR + name, templates.containsLink);

                break;
            }
        }

        ts.forEachChild(node, this.iterateTypes.bind(this));
    }

    private addField(parentPath: string, node: ts.Node, name: string, typeName: string) {
        this.addNode(
            templates.propertyNode(
                parentPath,
                name,
                (node.flags & ts.NodeFlags.Private) === ts.NodeFlags.Private,
                (node.flags & ts.NodeFlags.Public) === ts.NodeFlags.Public));

        this.validLinkTargets[parentPath + Generator.SEPARATOR + name] = true;
        this.addLink(parentPath, parentPath + Generator.SEPARATOR + name, templates.containsLink);
           
        // Reference type of property        
        this.addLink(parentPath + Generator.SEPARATOR + name, typeName, templates.referencesLink);
    }

    private addNode(node: string) {
        this.nodes.push(node);
    }

    private addLink(source: string, target: string, templateFunc: (s: string, t: string) => string) {
        this.links.push([source, target, templateFunc(source, target)]);
    }

    private writeHeader() {
        this.writeString(fs.readFileSync(__dirname + "/../templates/header.xml", 'utf8'));
    }

    private writeData() {
        this.writeString("<Nodes>");
        for (var node of this.nodes) {
            this.writeString(node);
        }
        this.writeString("</Nodes>");

        this.writeString("<Links>");
        for (var link of this.links) {
            // Exclude external types
            if (this.validLinkTargets[link[1]]) {
                this.writeString(link[2]);
            } else {
                // Ignore link
            }
        }
        this.writeString("</Links>");
    }

    private writeFooter() {
        this.writeString(fs.readFileSync(__dirname + "/../templates/footer.xml", 'utf8'));
    }

    private writeString(str: string) {
        if (this.file) {
            // Work around typings issue
            (<any>fs).writeSync(this.file, <any>str);
        } else {
            console.log(str);
        }
    }
}