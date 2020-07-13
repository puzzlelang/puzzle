# luke

An abstract, extendable programming language for domain specific solutions

## Getting started

luke runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.


### Luke CLI:

`npm i luke --global`

Then in the terminal, run:

`$ luke`

or execute a luke file:

`$ luke run example.luke`


### Luke JS (npm module):

`npm i luke --save`

```
const luke = require('luke');
luke.parse('print "Hello World');
```

### Luke JS (Browser):

`<script src="luke.js">`

```
luke.parse('print "Hello World');
```