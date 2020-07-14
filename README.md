# luke Docs

luke as an abstract, extendable programming language that allows custom syntax for domain specific solutions.


# Install

luke runs on JavaScript Engines and can be used on Node, Browsers and via it's CLI.


## CLI

```shell
$ npm i luke --global
```


## npm module

```javascript
npm i luke --save
```

## Browser

```html
<script src="luke.js">
```

# Usage


After you have installed luke via npm, you can use it in your terminal as an interactive CLI or run your luke script files

## Interactive Shell

```shell
$ luke
$ print "Hello World!"
"Hello World"
```

## Run a File

```javascript
// hello.luke
print "I am a luke file"
```


```shell
$ luke run hello.luke
"I am a luke file"
```


## Embedded (JavaScript)

luke scripts can also be run inside JavaScript:

```javascript
// For Node.js
const luke = require('luke-lang');

// For browsers:
<script src="luke.js"/>
```

```javascript
luke.parse('Hello, I am embedded!')
```


# Language

The luke language aims to provide simple language to build solutions that are taylored for different domains and probblems.

The main concepts of luke are:


* ***Simple, clean language***
* ***Understandable for developers and non-developers***
* ***Custom syntax creation***
* ***Open and free platform for modules***

## Example

```luke
use example.luke.js
ns example;

print "Hello World"
// "Hello World"

```

## Modules

luke has an extendable module system. Modules provide custom syntax for different domains and usages.

How to use a module?

```luke
use example.luke.js;
```

Modules can be written by yourself or be loaded from the official module repository.

Got to [ luke-catalog ](---)

## Namespaces

Namespaces provide a way to seperate syntax from different modules. Namespaces begin with the `ns` keyword and end when another namespace begins or on the end of the script.

```luke
ns example;

// example-specific code

ns default;

// default code
```

***Default namespace***

luke comes with a default namespace, which is initalized by default. The default nameapace contains some basic functionalities.

[ View the module ](...)

Syntax from the default namespace will automatically be available in any other module-specific namespace.



## Syntax

The luke language is a platform for different syntax. Each syntax ist delivered using a module. Basically any module syntax can be different, however they are all aimed at simplicity.


A simple syntax could look like this:

```luke
use rest.luke.js;
ns rest;

// the rest module provides a simple syntax:

POST {name: "Peter"} to "https://api.com"
```

A more complex one could look like this;

```luke
use lower.luke.js
ns lower;

// the lower module uses the following syntax:

[lowerCase]-> "Hello" 
// prints: hello
```


## Create a Syntax

Building your own custom syntax is fairly simple. It's defined

```javascript
dsl = {
  lang: {
    $: {
      echo: {
        follow: ["{param}", "$and"],
        method: function(param){
          console.log(param)
        }
      },
      and: {
        follow: ["{param}", "$and"],
        method: function(param){
          console.log(param)
        }
      }
    }
}
module.exports = dsl;
```



```luke

|-------------- Statement ------------|

  echo    "Peter"   and  "Nicole"   ;

   ^        ^        ^      ^       ^
command  command  command command delimeter;

(token)  {param}  (token) {param}

```


# License

Copyright (c) luke team and other contributors

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.