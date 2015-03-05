// Export module.
module.exports = new function() {

    // Modules.
    var cli = require("cli-color");

    // Get description breaked to fit.
    function getDescriptionFitted(description) {
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

            if(descriptionSplittedLength + descriptionCurrent.length + 1 > cli.width
            || descriptionSplitted[i] == "\n") {
                descriptionSplits.push(descriptionCurrent);
                descriptionCurrent = "";
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

    // Show options.
    this.show = function(transferedData) {
        // Print syntax.
        process.stdout.write("\n Usage syntax:");
        process.stdout.write(cli.whiteBright(" node " + transferedData.usageSyntax));
        process.stdout.write("\n\n Options:\n\n");

        // Print all options.
        for(var optionKey in transferedData.supportedOptions) {
            var option = transferedData.supportedOptions[optionKey];

            // Check if is in full help mode.
            if(option.advanced
            && !transferedData.fullHelp) {
                continue;
            }

            // Prepare help line.
            var optionLine = "  " + cli.whiteBright("--" + optionKey);

            // Print alias.
            if(option.alias) {
                optionAliasSecondLine = true;
                optionLine+= " or " + cli.whiteBright("-" + option.alias);
            }

            // White option value.
            optionLine+= ":\n\n";

            // Print description.
            var optionDescriptionFitted = getDescriptionFitted(option.description);
            for(var i=0; i<optionDescriptionFitted.length; i++) {
                var optionDescriptionLine = optionDescriptionFitted[i].trim();
                optionLine+= "    " + optionDescriptionLine;

                if(optionDescriptionLine.length + 4 < cli.width) {
                    optionLine+= "\n";
                }
            }

            process.stdout.write(optionLine + "\n\n");
        }
    };

    // Returns module.
    return this;

};