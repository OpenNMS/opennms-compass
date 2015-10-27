#!/bin/sh

BUILD_NUMBER=`node bin/update-build-number.js`

export ANDROID_VERSION_CODE="$BUILD_NUMBER"

ionic build --release && \
rsync -avzr --progress platforms/android/build/outputs/apk/*-release.apk ranger@www.opennms.org:~/public_html/misc/
