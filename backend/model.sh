#!/bin/bash
echo "Starting python server.."
source venv/bin/activate
export FLASK_APP=server.py
export DEPLOY_ENV=TEST
flask run --port=5000
echo "Python listening on http://localhost:5000"
