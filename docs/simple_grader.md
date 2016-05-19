# A simple grader script

This document will walk through the implementation of a grader script for
a simple problem. All this grader will do is test whether the input function
is of a straight line.

Each grader script at its base is composed of two components

     1. The problem configuration
     2. The grader function

## Imports

There are two SketchResponse python modules that must be imported for this simple example. All grader scripts must import the `sketchinput` module. There are two other modules that provide different grading helper functions. In this case, we only need to input the `GradeableFunction` module from `draft_code`.

```python
import sketchinput  
from *draft_code* import GradeableFunction
```

## Problem configuration

The problem configuration is passed to the javascript front end to define the
size and scale of the drawing space and to define which drawing tools are
available for the problem. The `sketchinput.config()` function takes a dict of
configuration options.

In the example configuration below, the first six key/value pairs are required:

* `'width': 750` sets the pixel width of the drawing space as 750 pixels
* `'height': 420` sets the pixel height of the drawing space to 420 pixels
* `'xrange': [-2.35, 2.35]` sets the numerical range of the x axis
* `'yrange': [-1.15, 1.15]` sets the numerical range of the y axis
* `'xscale': 'linear'` sets the scale of the x axis to linear (only option currently implemented)
* `'yscale': 'linear'` sets the scale of the y axis to linear (only option currently implemented)

The last entry `'plugins'` takes a list of dicts that enable the specific javascript plugins that are available to the user. All plugins are declared by 'name'.

The 'axes' plugin entry is the simplest plugin to enable. It has no configuration options so all that must be set is the 'name'. This plugin enables the axes in the drawing space. *It should probably be on by default no?*

The 'freeform' plugin entry enables the freeform drawing tool. It has three configuration options to set:

* `'id'` sets the name of the argument of the grader callback function (described in the [next section](#grader)) to which the data generated by this plugin is passed.
* `'label'` is the name of the tool displayed to the user.
* `'color'` is the color used to render the drawn function.

A listing of all the built-in plugins can be found at [SketchResponse Plugins](probconfig_plugins.md). A tutorial on how to build your own plugins can be found at [Create a Plugin](create_plugin.md).

```python
problemconfig = sketchinput.config({
    'width': 750,
    'height': 420,
    'xrange': [-2.35, 2.35],
    'yrange': [-1.15, 1.15],
    'xscale': 'linear',
    'yscale': 'linear',
    'plugins': [
        {'name': 'axes'},
	    {'name': 'freeform', 'id': 'f', 'label': 'Function f(x)', 'color':'blue'},
    ]
})
```

The above problem configuration settings will create a javascript tool that looks something like the image below.

![What the user will see](imgs/simple_config.png "Simple Config")

## Define the grader callback function
<div id=grader></div>

```python
@sketchinput.grader
def grader(f):
    gf = GradeableFunction.GradeableFunction(f)

    if not gf.is_straight():
        return False, 'Not straight'

    return True, 'Good Job'
```

The grader callback function implements the function passed to the sketchinput
grader to evaluate the data sent from the javascript tool.

The arguments of the grader function are the `'id'` values as defined in the
problem configuration above. E.g. in our problem configuration we enabled the
freeform drawing tool with id 'f' and we have a corresponding argument f in
the signature of the function that will be automatically unpacked.

Before we can execute any grading helper functions on the data, we must
instantiate the data as a `GradeableFunction`.

In this simple example all we are checking is that the submitted function
defines a straight line over its entire domain. We are not checking for slope
of the line. To do this we call the grader helper function `gf.is_straight()`.
`is_straight()` returns a boolean value. The full API documentation for the
grader helper functions can be found at [SketchResponse API](https://SketchResponse.github.io/).

And that's it! Those two simple blocks of code complete our first grader script.
Admittedly this particular script doesn't do much. Check out the [Complex Grader](complex_grader.md) example for a more realistic grader tutorial on an
example math problem.