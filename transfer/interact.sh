#!/bin/bash
set -xe

node build/src/interact.js $1 $RECEIVER_PK 12345
