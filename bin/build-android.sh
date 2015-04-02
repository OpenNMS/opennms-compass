#!/bin/sh

BUILD_NUMBER=`node bin/update-build-number.js`

export ANDROID_VERSION_CODE="$BUILD_NUMBER"

ionic build --release android && bin/sign-android.sh && \
rsync -avr --progress platforms/android/ant-build/*-signed.apk ranger@opennms.org:~/public_html/misc/opennms-android-signed.apk
