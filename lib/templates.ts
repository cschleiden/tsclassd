import path = require("path");

var sep = path.sep;

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

export function fileNode(fileName: string): string {
	return `<Node Id="${escapeXml(fileName)}" Category="File" CommonLabel="${escapeXml(fileName)}" Group="Expanded" Icon="File" Label="${escapeXml(fileName)}" /> `;
}

export function moduleNode(parent: string, moduleName: string): string {
	return `<Node Id="${escapeXml(parent)}${escapeXml(sep)}${escapeXml(moduleName)}" Category="CodeSchema_Namespace" CommonLabel="${escapeXml(moduleName)}" Icon="CodeSchema_Class" Label="${escapeXml(moduleName)}" />`;
}

export function interfaceNode(parent: string, interfaceName: string): string {
    return `<Node Id="${escapeXml(parent)}${escapeXml(sep)}${escapeXml(interfaceName)}" Category="CodeSchema_Interface" SchemaProperty_IsAbstract="True" CommonLabel="${escapeXml(interfaceName)}" Group="Collapsed" Icon="CodeSchema_Class" Label="${escapeXml(interfaceName)}" />`;
}

export function classNode(parent: string, className: string): string {
    return `<Node Id="${escapeXml(parent)}${escapeXml(sep)}${escapeXml(className)}" Category="CodeSchema_Class" CommonLabel="${escapeXml(className)}" DelayedCrossGroupLinksState="Fetched" Group="Collapsed" Icon="CodeSchema_Class" Label="${escapeXml(className)}" />`;
}

export function propertyNode(parent: string, name: string, isPrivate: boolean = false, isStatic: boolean = false): string {
    return `<Node Id="${escapeXml(parent) }${escapeXml(sep) }${escapeXml(name) }" Category="CodeSchema_Field" SchemaProperty_IsPrivate="${ isPrivate ? "True" : "False" }" SchemaProperty_IsStatic="${ isStatic ? "True" : "False" }" Label="${escapeXml(name)}" />`;
}

export function methodNode(parent: string, name: string, isPrivate: boolean = false, isStatic: boolean = false) {
    return `<Node Id="${escapeXml(parent) }${escapeXml(sep) }${escapeXml(name)}" Category="CodeSchema_Method" SchemaProperty_IsPrivate="${ isPrivate ? "True" : "False" }" SchemaProperty_IsStatic="${ isStatic ? "True" : "False" }" Label="${escapeXml(name)}" />`;
}


export function containsLink(source: string, target: string): string {
	return `<Link Source="${escapeXml(source)}" Target="${escapeXml(target)}" Category="Contains" />`;
}

export function referencesLink(source: string, target: string): string {
	return `<Link Source="${escapeXml(source)}" Target="${escapeXml(target)}" Category="References" Weight="4" />`;
}

export function implementsLink(source: string, target: string): string {
	return `<Link Source="${escapeXml(source)}" Target="${escapeXml(target)}" Category="Implements" Weight="1" />`;	
}

export function extendsLink(source: string, target: string): string {
	return `<Link Source="${escapeXml(source)}" Target="${escapeXml(target)}" Category="Extends" Weight="2" />`;
}