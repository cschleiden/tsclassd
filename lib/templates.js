var path = require("path");
var sep = path.sep;
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}
function fileNode(fileName) {
    return "<Node Id=\"" + escapeXml(fileName) + "\" Category=\"File\" CommonLabel=\"" + escapeXml(fileName) + "\" Group=\"Expanded\" Icon=\"File\" Label=\"" + escapeXml(fileName) + "\" /> ";
}
exports.fileNode = fileNode;
function moduleNode(parent, moduleName) {
    return "<Node Id=\"" + escapeXml(parent) + escapeXml(sep) + escapeXml(moduleName) + "\" Category=\"CodeSchema_Namespace\" CommonLabel=\"" + escapeXml(moduleName) + "\" Icon=\"CodeSchema_Class\" Label=\"" + escapeXml(moduleName) + "\" />";
}
exports.moduleNode = moduleNode;
function interfaceNode(parent, interfaceName) {
    return "<Node Id=\"" + escapeXml(parent) + escapeXml(sep) + escapeXml(interfaceName) + "\" Category=\"CodeSchema_Interface\" SchemaProperty_IsAbstract=\"True\" CommonLabel=\"" + escapeXml(interfaceName) + "\" Group=\"Collapsed\" Icon=\"CodeSchema_Class\" Label=\"" + escapeXml(interfaceName) + "\" />";
}
exports.interfaceNode = interfaceNode;
function classNode(parent, className) {
    return "<Node Id=\"" + escapeXml(parent) + escapeXml(sep) + escapeXml(className) + "\" Category=\"CodeSchema_Class\" CommonLabel=\"" + escapeXml(className) + "\" DelayedCrossGroupLinksState=\"Fetched\" Group=\"Collapsed\" Icon=\"CodeSchema_Class\" Label=\"" + escapeXml(className) + "\" />";
}
exports.classNode = classNode;
function propertyNode(parent, name, isPrivate, isStatic) {
    if (isPrivate === void 0) { isPrivate = false; }
    if (isStatic === void 0) { isStatic = false; }
    return "<Node Id=\"" + escapeXml(parent) + escapeXml(sep) + escapeXml(name) + "\" Category=\"CodeSchema_Field\" SchemaProperty_IsPrivate=\"" + (isPrivate ? "True" : "False") + "\" SchemaProperty_IsStatic=\"" + (isStatic ? "True" : "False") + "\" Label=\"" + escapeXml(name) + "\" />";
}
exports.propertyNode = propertyNode;
function methodNode(parent, name, isPrivate, isStatic) {
    if (isPrivate === void 0) { isPrivate = false; }
    if (isStatic === void 0) { isStatic = false; }
    return "<Node Id=\"" + escapeXml(parent) + escapeXml(sep) + escapeXml(name) + "\" Category=\"CodeSchema_Method\" SchemaProperty_IsPrivate=\"" + (isPrivate ? "True" : "False") + "\" SchemaProperty_IsStatic=\"" + (isStatic ? "True" : "False") + "\" Label=\"" + escapeXml(name) + "\" />";
}
exports.methodNode = methodNode;
function containsLink(source, target) {
    return "<Link Source=\"" + escapeXml(source) + "\" Target=\"" + escapeXml(target) + "\" Category=\"Contains\" />";
}
exports.containsLink = containsLink;
function referencesLink(source, target) {
    return "<Link Source=\"" + escapeXml(source) + "\" Target=\"" + escapeXml(target) + "\" Category=\"References\" Weight=\"4\" />";
}
exports.referencesLink = referencesLink;
function implementsLink(source, target) {
    return "<Link Source=\"" + escapeXml(source) + "\" Target=\"" + escapeXml(target) + "\" Category=\"Implements\" Weight=\"1\" />";
}
exports.implementsLink = implementsLink;
function extendsLink(source, target) {
    return "<Link Source=\"" + escapeXml(source) + "\" Target=\"" + escapeXml(target) + "\" Category=\"Extends\" Weight=\"2\" />";
}
exports.extendsLink = extendsLink;
//# sourceMappingURL=templates.js.map