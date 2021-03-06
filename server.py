import sys
import importlib
from flask import Flask, render_template, request, json
from proto2prod import convert_ans_dict
import os

app = Flask(__name__)


@app.route('/')
def list_grader_scripts():
    path = "grader_scripts/"  # os.path.expanduser(u'~')
    return render_template('dirtree.html', tree=make_tree(path))


@app.route('/<grader_module_name>')
@app.route('/<path:path>/<grader_module_name>')
def new_local_frontend(path=None, grader_module_name=None):
    if not path is None:
        path = path.replace("/", ".")
        if not path.endswith("."):
            path = path + "."
        grader_module_name = path + grader_module_name

    module_path = 'grader_scripts.' + grader_module_name
    grader_module = importlib.import_module(module_path)
    reload(grader_module)

    return render_template('index_sketch_tool.html',
                           hash=grader_module.problemconfig)


@app.route('/<grader_module_name>/check', methods=['POST'])
@app.route('/<path:path>/<grader_module_name>/check', methods=['POST'])
def check_local(path=None, grader_module_name=None):
    if not path is None:
        path = path.replace("/", ".")
        if not path.endswith("."):
            path = path + "."
        grader_module_name = path + grader_module_name

    module_path = 'grader_scripts.' + grader_module_name
    grader_module = importlib.import_module(module_path)
    reload(grader_module)

    submitted_data = request.get_json()

    # Dispatch to grader in the required format
    # Assume no 'expect' value for now
    grader_response = grader_module.grader(None, json.dumps(submitted_data))

    # Allow boolean grader return values instead of dicts
    if type(grader_response) == bool:
        grader_response = {'ok': grader_response, 'msg': ''}

    return json.dumps(grader_response)


@app.route('/aws/<grader_module_name>')
def new_frontend(grader_module_name):
    grader_module = importlib.import_module('grader_scripts.' + grader_module_name)
    reload(grader_module)

    return render_template('index_aws.html', hash=grader_module.problemconfig)


@app.route('/aws/<grader_module_name>/check', methods=['POST'])
def check_aws(grader_module_name):
    grader_module = importlib.import_module('grader_scripts.' + grader_module_name)
    reload(grader_module)

    submitted_data = request.get_json()

    # Dispatch to grader in the required format
    # Assume no 'expect' value for now
    grader_response = grader_module.grader(None, json.dumps(submitted_data))

    # Allow boolean grader return values instead of dicts
    if type(grader_response) == bool:
        grader_response = {'ok': grader_response, 'msg': ''}

    return json.dumps(grader_response)


def make_tree(path):
    tree = dict(name=os.path.basename(path), children=[])
    try:
        lst = os.listdir(path)
    except OSError:
        pass  # ignore errors
    else:
        for name in lst:
            fn = os.path.join(path, name)
            if os.path.isdir(fn):
                tree['children'].append(make_tree(fn))
            else:
                tree['children'].append(dict(name=fn.replace('grader_scripts/', '')))
    return tree

if __name__ == '__main__':
    app.run(debug=True)
