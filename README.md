It help watch `.less` files for changes. When file is modified or just touched, it recompile instantly.

## Install

Install it globally by use `npm install -g less-seeker`.

## Using

Just open console on directory containing less files and run `less-seeker`. It'll compile all your primary files to CSS files, without compile dependencies. So it will stay in watch mode, waiting for files modifications.

## Behavior

After watch start, when you modify some less file, it'll check for the primary less file and will compile it, telling you why it is happening.

If you create a new less file, it'll be compiled too, instantly. If you include this file in some other less file, this file will be considered like a dependency of it and will auto-clean erroneous CSS or SourceMap created by compilation process.

If you remove some file, it'll be detached from primary less files and will start recompile process too.

## Options

To see common options, just type `less-seeker --help`. To show all options supported, type `less-seeker --help=full`.

### Recomended Options

You can use a set of options to turn development more powerful. I suggest `lessk-seeker --source-map --auto-clean`. It'll help you create SourceMap of each primary less files and will auto-clean CSS and SourceMap files that is not more need.
