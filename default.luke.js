const fs = require('fs');
const https = require('https');
var npm = require("npm");

var lang = {
        delimeter: ";",
        assignmentOperator: "=",
        context: {},
        currentNamespace: "default",
        static: {
            execStatement: function() {

                if (lang.context[lang.context.importNamespace]) {
                    try {
                        lang.context[lang.context.importNamespace] = require(lang.context.importUrl);
                    } catch (e) {
                        console.log('Import Error:', e)
                    }
                }

                if (lang.context['useNamespace']) {

                    try {

                        var fileName = lang.context['useNamespace'];
                        var extention = fileName.split(".")[fileName.split(".").length - 1];

                        if (fileName.indexOf('https://') == 0) {

                            https.get(fileName, (resp) => {
                                var data = '';

                                resp.on('data', (chunk) => {
                                    data += chunk;
                                });

                                resp.on('end', () => {
                                    useSyntax(eval(data));
                                });

                            }).on("error", (err) => {
                                console.log("Error: " + err.message);
                            });

                        } else if (fileName.indexOf('$catalog/') == 0) {
                            var name = fileName.split('/')[1];
                            var file = require('node_modules/luke-lang/luke-catalog/modules/' + name);
                            useSyntax(file);
                        } else if (extention.toLowerCase() == "json") {
                            var syntax = fs.readFileSync(fileName, 'utf8');
                            useSyntax(JSON.parse(syntax));
                        } else if (extention.toLowerCase() == "js") {
                            var file = require(fileName);
                            useSyntax(file);
                        } else console.log('unsupported file type')

                    } catch (e) {
                        console.log('Use Error', e);
                    }
                }
            }
        },
        "$": {
            default: {
                ns: {
                    follow: ["{namespace}"],
                    method: function(ns) {
                        lang.currentNamespace = ns;
                        console.log('Set namespace', ns)
                    }
                },
                use: {
                    follow: ["{file}"],
                    method: function(ns) {
                        lang.context['useNamespace'] = ns;
                        console.log(ns)
                    }
                },
                import: {
                    follow: ["{namespace}", "$from"],
                    method: function(ns) {
                        lang.context['importNamespace'] = ns;
                        console.log(ns)
                    }
                },
                from: {
                    follow: ["{url}"],
                    method: function(url) {
                        lang.context['importUrl'] = url;
                        console.log(url)
                    }
                },
                print: {
                    follow: ["{text}"],
                    method: function(text) {
                        console.log(text)
                    }
                },
                list: {
                    follow: ["{param}"],
                    method: function(param) {
                        switch(param){
                            case 'modules':
                                console.log(Object.keys(lang['$']).join(', '));
                            break;
                            case 'commands':
                                Object.keys(lang['$']).forEach((ns) => {
                                    console.log('namespace:', ns);
                                    Object.keys(lang['$'][ns]).forEach(c => {
                                        console.log('  ', c, lang['$'][ns][c].follow.join(", "))
                                    })
                                })
                            break;
                        }
                    }
                },
                download: {
                    follow: ["{param}"],
                    method: function(param) {
                         https.get(param, (resp) => {
                                var data = '';

                                resp.on('data', (chunk) => {
                                    data += chunk;
                                });

                                resp.on('end', () => {
                                    var fileName = param.split('/')[param.split('/').length-1];
                                    fs.writeFileSync(fileName, data)
                                    console.log(fileName, 'downloaded');
                                });

                            }).on("error", (err) => {
                                console.log("Error: " + err.message);
                            });
                    }
                },
                install: {
                    follow: ["{param}"],
                    method: function(param) {
                        npm.load({
                            loaded: false
                        }, function (err) {
                          // catch errors
                          npm.commands.install([param], function (er, data) {
                            // log the error or data
                            console.log(er, data);
                          });
                          npm.on("log", function (message) {
                            // log the progress of the installation
                            console.log(message);
                          });
                        });
                    }
                },
            }
        }
    }
module.exports = lang;