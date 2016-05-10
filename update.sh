#!/bin/sh

MYDIR=$(dirname "$0")
MYDIR=$(cd "$MYDIR"; pwd)

cd "$MYDIR"
git pull -q >/dev/null

if [ -d beta ]; then
	cd "beta"
	git pull -q >/dev/null
fi
