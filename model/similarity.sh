#!/bin/bash
WORD=$1
source ./model/venv/bin/activate
python ./model/run.py $WORD
