#!/bin/bash
echo "Starting python server.."
source venv/bin/activate
export FLASK_APP=server.py
flask run
echo "Python listening on http://localhost:5431"
