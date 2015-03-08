// Exports module.
module.exports = new function() {

    // Load modules.
    var less     = require("less"),
        cli      = require("cli-color"),
        fs       = require("fs"),
        path     = require("path"),
        glob     = require("glob"),
        us       = require("underscore"),
        moment   = require("moment"),
        extend   = require("extend"),
        chokidar = require("chokidar"),
        camelize = require("camelize");

    // Variables.
    var rootFiles       = [],
        indexFiles      = [],
        importedFiles   = {},
        compiledFiles   = {},
        sourceMapFiles  = {},
        args            = {},
        sourceMapFormat = "filename.map";

    // Rebuild index files.
    function rebuildIndex(options) {
        // Default options.
        var options = extend({
            "firstScan"   : false,
            "rebuildMatch": false,
            "fileModified": false,
            "fileUnlinked": false,
            "callback"    : false
        }, options);

        // Store new files and imports.
        var newRootFiles = [],
            renderErrors = {},
            waitSync     = 0;

        // Notify first scan.
        if(options.firstScan) {
            printBreak();
            printMessage("Searching for " + cli.whiteBright(options.rebuildMatch) + " files...");
            printMessage(cli.blackBright(process.cwd()), false);
            printLine();

            printMessage(cli.cyanBright("Initial compilation..."));
            printBreak();
        }

        // Remove modified file from index.
        // Will recompile only the root file.
        if(options.fileModified) {
            options.rebuildMatch = getRootFile(options.fileModified);
            rootFiles = us.without(rootFiles, options.rebuildMatch);
        }

        // If file was unlinked.
        // Only to trigger notification before remove from index.
        if(options.fileUnlinked) {
            newRootFiles.push(options.fileUnlinked);
        }

        // Search by files.
        if(options.rebuildMatch) {
            // Get index files.
            var matchedFiles = us.map(glob.sync(options.rebuildMatch), getRelativePath);

            // Set all files initially as root files.
            for(var i in matchedFiles) {
                var matchedFile = getRelativePath(matchedFiles[i]);

                // If root file doesn't exists yet, add as newRootFiles.
                if(rootFiles.indexOf(matchedFile) == -1) {
                    rootFiles.push(matchedFile);
                    newRootFiles.push(matchedFile);
                    indexFiles.push(matchedFile);
                    renderErrors[matchedFile] = [];
                }
            }

            // Check all new initially-root files.
            waitSync = newRootFiles.length;
            for(var i in newRootFiles) {
                var indexFile = getRelativePath(newRootFiles[i]);

                // If file is not root file, so ignore it.
                if(newRootFiles.indexOf(indexFile) == -1) {
                    waitSync--;
                    continue;
                }

                // Render LESS file.
                var lessFileContents  = fs.readFileSync(indexFile, { "encoding": "utf-8" });
                var lessRenderOptions = { "filename": indexFile };

                // Setup sourceMap.
                if(args.sourceMap) {
                    lessRenderOptions["sourceMap"] = {};
                    lessRenderOptions["sourceMap"]["sourceMapURL"] = path.basename(indexFile, ".less") + ".map";
                }

                // Start render process.
                (function(indexFile) {
                    less.render(lessFileContents, lessRenderOptions, function(err, output) {
                        if(!err) {
                            // Clear indexes of file.
                            cleanIndexes(indexFile);

                            // Exclude imported files as rooted.
                            for(var i in output.imports) {
                                var relativeImport = getRelativePath(output.imports[i]);

                                // Remove file references.
                                newRootFiles = us.without(newRootFiles, relativeImport);
                                rootFiles    = us.without(rootFiles, relativeImport);
                                delete importedFiles[relativeImport];
                                delete compiledFiles[relativeImport];
                                delete sourceMapFiles[relativeImport];
                            }

                            // Store obtained data.
                            compiledFiles[indexFile]  = output.css;
                            sourceMapFiles[indexFile] = output.map;
                            importedFiles[indexFile]  = us.map(output.imports, getRelativePath);
                        }
                        // Store errors.
                        else {
                            renderErrors[indexFile].push(err);
                        }

                        // Reduce sync.
                        waitSync--;
                    })
                })(indexFile);
            }
        }

        // Wait sync get zero.
        var syncTimer = setInterval(function() {
            if(!waitSync) {
                clearInterval(syncTimer);

                // Prints no match found.
                if(!indexFiles.length) {
                    printMessage(cli.redBright("No match found on: ") + process.cwd());
                }
                else
                // Notify root file changes.
                if(newRootFiles.length) {
                    // Print all root files found.
                    us.each(newRootFiles, function(filename) {
                        var rootFileMessage,
                            rootWasRemoved = false;

                        // Define the main item message.
                        switch(true) {
                            // Case is fileUnlinked:
                            case !!options.fileUnlinked && isRootFile(filename):
                                rootFileMessage = cli.redBright("Removed");
                                rootWasRemoved = true;
                                break;
                            // Case has error:
                            case !Boolean(renderErrors[filename]):
                                rootFileMessage = cli.redBright("Failed");
                                break;
                            // Case is first scan:
                            case options.firstScan:
                                rootFileMessage = cli.greenBright("Compiled");
                                break;
                            // Case is fileModified:
                            case !!options.fileModified:
                                rootFileMessage = cli.greenBright("Recompiled");
                                break;
                        }

                        // Write filename.
                        rootFileMessage+= " " + cli.whiteBright(filename);

                        // If file was modified.
                        if(options.fileModified === filename) {
                            rootFileMessage+= cli.yellowBright(" (modified)");
                        }
                        else
                        // If file was unlinked.
                        if(options.fileUnlinked === filename
                        && !isRootFile(filename)) {
                            rootFileMessage+= cli.redBright(" (removed)");
                        }

                        // Write compiled css file.
                        if(!rootWasRemoved) {
                            fs.writeFileSync(getCSSFilename(filename), compiledFiles[filename]);

                            // Create the sourceMap.
                            if(args.sourceMap
                            && sourceMapFiles[filename]) {
                                // Write sourceMap file from format.
                                fs.writeFileSync(getSourceMapFilename(filename), sourceMapFiles[filename]);
                            }
                            else
                            // If sourceMap is not required and autoClean is enabled.
                            // So we can remove current sourceMap.
                            if(args.autoClean) {
                                fs.unlink(getSourceMapFilename(filename));
                            }
                        }
                        else
                        // If root was removed and auto-clean is enabled.
                        if(args.autoClean) {
                            fs.unlink(getCSSFilename(filename));
                            fs.unlink(getSourceMapFilename(filename));
                        }

                        // Print message.
                        printMessage(rootFileMessage);

                        // Print dependency list.
                        var rootDependencyFiles = importedFiles[filename];
                        if(rootDependencyFiles) {
                            for(var i=0; i<rootDependencyFiles.length; i++) {
                                var rootDependencyFile        = getRelativePath(rootDependencyFiles[i]),
                                    rootDependencyFileSymbol  = i < rootDependencyFiles.length - 1 ? "\u251C" : "\u2514",
                                    rootDependencyFileMessage = cli.green(rootDependencyFileSymbol + " Dependency: ") + rootDependencyFile;

                                // If this file was modified, print.
                                if(options.fileModified === rootDependencyFile) {
                                    rootDependencyFileMessage+= cli.yellowBright(" (modified)");
                                }

                                // Notify.
                                printMessage(rootDependencyFileMessage, false);
                            }
                        }

                        // Print all errors.
                        us.each(renderErrors[filename], function(value, key) {
                            printBreak();
                            printMessage(cli.redBright(value.type + "Error: ") + cli.whiteBright(value.message + "."), false);
                            printMessage("\u251C " + cli.whiteBright("Filename: ") + value.filename + " :: " + value.line + ", " + value.index, false);
                            printMessage("\u2514 " + cli.whiteBright("Extract:  ") + us.compact(value.extract).join(" "), false);
                        });
                    });

                    // Print line.
                    printLine();

                    // Remove unlinked file from index.
                    if(options.fileUnlinked) {
                        rootFiles = us.without(rootFiles, options.fileUnlinked);
                    }
                }

                // Callback.
                if(options.callback) {
                    options.callback();
                }
            }
        });
    }

    // Identify if file is from root.
    function isRootFile(filename) {
        return rootFiles.indexOf(filename) !== -1;
    }

    // Identify if is an indexed file.
    function isIndexedFile(filename) {
        return indexFiles.indexOf(getRelativePath(filename)) !== -1;
    }

    // Identify the root file of imported path.
    function getRootFile(filename) {
        // Returns self if it is the root file.
        if(isRootFile(filename)) {
            return filename;
        }

        // Search for importedFiles.
        // Return root file if found.
        for(var rootFile in importedFiles) {
            if(importedFiles[rootFile].indexOf(filename) !== -1) {
                return rootFile;
            }
        }

        // Or if not found.
        return false;
    }

    // Get relative path.
    function getRelativePath(filename) {
        return path.relative(process.cwd(), filename);
    }

    // Get css filename.
    function getCSSFilename(filename) {
        return path.dirname(path.resolve(filename)) + path.sep + path.basename(filename, ".less") + ".css";
    }

    // Get sourceMap filename.
    function getSourceMapFilename(filename) {
        return path.dirname(path.resolve(filename)) + path.sep + sourceMapFormat.replace("filename", path.basename(filename, ".less"));
    }

    // Clean all indexes from filename.
    function cleanIndexes(filename) {
        importedFiles[filename] = [];
        delete compiledFiles[filename];
        delete sourceMapFiles[filename];
    }

    // Watch less files.
    function watchLess() {
        // Print message.
        printMessage(cli.cyanBright("Watch started..."));
        printLine();

        // Watch current directory.
        chokidar.watch(process.cwd(), { "usePolling": true })
            .on("change", fileUpdated)
            .on("unlink", unlinkIndex);
    }

    // Watch file updated.
    function fileUpdated(filename) {
        if(isIndexedFile(filename)) {
            rebuildIndex({ "fileModified": getRelativePath(filename) });
        }
    }

    // Unlink file from index.
    function unlinkIndex(filename) {
        if(isIndexedFile(filename)) {
            rebuildIndex({ "fileUnlinked": getRelativePath(filename) });
        }
    }

    // Print break line.
    function printBreak() {
        process.stdout.write("\n");
    }

    // Print message.
    function printMessage(message, printTime) {
        var timeMessage = printTime === false ? Array(13).join(" ") : cli.blackBright(" [" + moment().format("HH:mm:ss") + "] ");

        process.stdout.write(timeMessage);
        process.stdout.write(message);
        process.stdout.write("\n");
    }

    // Print line.
    function printLine(breakMargin) {
        var breakMargin      = arguments.length === 0 ? 2 : +breakMargin,
            breakMarginLines = Array(breakMargin).join("\n");

        process.stdout.write(breakMarginLines + Array(cli.width + 1).join("-") + breakMarginLines);
    }

    // Init the module.
    this.init = function(transferedData) {
        args = camelize(transferedData.args);

        // Prepare sourceMap.
        if(args.sourceMap) {
            // If was defined a new format.
            if(args.sourceMap !== true) {
                sourceMapFormat = args.sourceMap;
                args.sourceMap = true;
            }
        }

        // Clear CLI.
        process.stdout.write(cli.reset);

        // First rebuild.
        rebuildIndex({
            "firstScan"   : true,
            "rebuildMatch": "**/*.less",
            "callback"    : watchLess
        });
    };

    // Returns module.
    return this;

};