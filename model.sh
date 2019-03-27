#!/bin/bash
echo "Starting python server.."
source model/venv/bin/activate
python model/server.py
echo "Python listening on http://localhost/5431"
