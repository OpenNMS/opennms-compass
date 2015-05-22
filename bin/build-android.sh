#!/bin/sh

BUILD_NUMBER=`node bin/update-build-number.js`

export ANDROID_VERSION_CODE="$BUILD_NUMBER"

ionic build --release android && \
rsync -avr --progress `find platforms/android -name android-release.apk | sort -u | head -n 1` ranger@opennms.org:~/public_html/misc/opennms-android-signed.apk
