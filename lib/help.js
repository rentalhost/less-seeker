// Export module.
module.exports = new function() {

    // Modules.
    var clc = require("cli-color");

    // Get the longest key name.
    function getLongestKeyName(options) {
        var longestKeyLength = 0;
        for(var optionKey in options) {
            var keyLength = optionKey.length;

            if(options[optionKey].alias) {
                keyLength++;
            }

            longestKeyLength = Math.max(longestKeyLength, keyLength);
        }

        return longestKeyLength;
    }

    // Get description breaked to fit.
    function getDescriptionFitted(description, fitLength) {
        var descriptionSplitted = [];
        var descriptionSplits = [];
        var descriptionCurrent = "";

        var descriptionSplittedRawRegex = /([\w\-\.\,]+\x20?)([^\w\-\.\,]*)/g;
        var descriptionSplittedRaw = descriptionSplittedRawRegex.exec(description);
        while(descriptionSplittedRaw != null) {
            descriptionSplitted.push(descriptionSplittedRaw[1]);

            if(descriptionSplittedRaw[2].length) {
                descriptionSplitted.push(descriptionSplittedRaw[2]);
            }

            descriptionSplittedRaw = descriptionSplittedRawRegex.exec(description);
        }

        for(var i in descriptionSplitted) {
            var descriptionSplittedLength = descriptionSplitted[i].length;

            if(descriptionSplittedLength + descriptionCurrent.length + 1 > fitLength
            || descriptionSplitted[i] == "\n") {
                descriptionSplits.push(descriptionCurrent);
                descriptionCurrent = "  ";
            }

            if(descriptionSplitted[i] == "\n") {
                continue;
            }

            descriptionCurrent+= descriptionSplitted[i];
        }

        if(descriptionCurrent.length) {
            descriptionSplits.push(descriptionCurrent);
        }

        return descriptionSplits;
    }

    // Get padded string.
    function getPadding(term, length, key) {
        return term + Array(Math.max(0, length - term.length)).join(key || " ");
    }

    // Show options.
    this.show = function(transferedData) {
        var longestKeyLength = getLongestKeyName(transferedData.supportedOptions);
        var consoleWidth     = clc.width;

        // Print syntax.
        process.stdout.write("\n Usage syntax:");
        process.stdout.write(clc.whiteBright(" node " + transferedData.usageSyntax));
        process.stdout.write("\n Options:\n\n");

        // Print all options.
        for(var optionKey in transferedData.supportedOptions) {
            var option = transferedData.supportedOptions[optionKey];
            var optionFirstLine = "  ";
            var optionAliasSecondLine = false;

            // Print option name.
            var optionValue = "--" + optionKey;

            // Print alias.
            if(option.alias) {
                optionAliasSecondLine = true;
                optionValue+= ",";

                // If option aliases can fit on first line, so do it.
                if(optionValue.length + option.alias.length - 1 < longestKeyLength) {
                    optionValue+= " -" + option.alias;
                    optionAliasSecondLine = false;
                }
            }

            // White option value.
            optionFirstLine+= clc.whiteBright(optionValue);

            // Print padding.
            optionFirstLine = getPadding(optionFirstLine, longestKeyLength + clc.whiteBright().length + 7);

            // Get description fitted.
            var optionDescriptionFitted = getDescriptionFitted(option.description, consoleWidth - longestKeyLength - 7);

            // Print first description line.
            if(optionDescriptionFitted.length) {
                optionFirstLine+= optionDescriptionFitted[0];
            }

            // Print first line.
            process.stdout.write(optionFirstLine + "\n");

            // Print others lines.
            if(optionAliasSecondLine
            || optionDescriptionFitted.length >= 2) {
                // If it has alias, print it first.
                var optionOthersLine = "";
                if(optionAliasSecondLine) {
                    optionOthersLine = "   -" + option.alias;
                }

                // Print padding.
                optionOthersLine = getPadding(optionOthersLine, longestKeyLength + 7);
                optionOthersLine = clc.whiteBright(optionOthersLine);

                // If have more 2 or more description lines, print second line.
                if(optionDescriptionFitted.length >= 2) {
                    optionOthersLine+= optionDescriptionFitted[1];
                }

                // Print line and line break.
                process.stdout.write(optionOthersLine + "\n");

                // Print all others lines.
                for(var i=2; i<optionDescriptionFitted.length; i++) {
                    var optionOthersLine = getPadding("", longestKeyLength + 7);
                    optionOthersLine+= optionDescriptionFitted[i];
                    process.stdout.write(optionOthersLine + "\n");
                }
            }
        }
    };

    // Returns module.
    return this;

};