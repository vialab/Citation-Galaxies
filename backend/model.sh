#!/bin/bash
echo "Starting python server.."
source venv/bin/activate
export FLASK_APP=server.py
flask run --port=5431
echo "Python listening on http://localhost:5431"
