OpenNMS Mobile
==============

This is a mobile client for OpenNMS, using Ionic framework, AngularJS, and Cordova.

Prepping the Source Tree
========================

Install Node.JS
---------------

First, you must have node.js installed: http://nodejs.org/

If you are on a mac and use HomeBrew, I recommend installing it with that instead, since they keep it up-to-date pretty well.  Otherwise, the install download they give you is fine.

Install Command-Line Tools
--------------------------

Then, install Ionic, Cordova, and Bower:

```
sudo npm install -g ionic cordova bower
```

The "-g" installs them "globally", ie, in /usr/local/bin rather than just in a secret directory in your build tree.

Install Node Plugins
--------------------

Next, install the node plugins used during building/developing the app:

```
npm install
```

Any time the dependencies in `packages.json` change, you will want to run this again.  I recommend doing it any time you do a `git pull` just to be sure.

Install Bower Dependencies
--------------------------

Finally, install the javascript dependencies for the app, using bower:

```
bower install
```

Like `npm install`, you will want to run `bower install` any time `bower.json` changes.

Configure Build Properties
--------------------------

Copy the `build-properties.json.example` file to `build-properties.json`.  Unless you want to configure Google Analytics, Admob, or Play Store billing, you should not have to change anything in the file.

Running the App In Your Browser
===============================

If you want to develop on the app, or just preview it, you can run it in your browser with the following command:

```
ionic serve
```

This will start a web server on port 8100 and open your browser to the app.

Running the App On A Phone
==========================

iOS
---

You must have Xcode installed from the Mac App Store. Once Xcode is installed, configure Ionic to build for the `ios` platform:

```
ionic platform ios
```

Then, to run in the emulator, you should be able to run:

```
ionic emulate ios
```

To run on your phone, plug it in to the USB port and run:

```
ionic run ios
```

It's been a long time since I've set up Xcode and code signing and such myself, so I'm not sure what, if anything, you have to do to be able to sign/run on your phone.

Android
-------

You must have the Android SDK installed.  You can either install Android Studio (which is a custom version of Eclipse), or the Stand-alone SDK Tools, from here: http://developer.android.com/sdk/installing/index.html

Once the Android tools are installed and in your PATH, configure Ionic to build for the `android` platform:

```
ionic platform android
```

Then, to run in the emulator, you should be able to run:

```
ionic emulate android
```

To run on your phone (or in the Genymotion emulator, which looks like a "real" phone), plug it in to the USB port and run:

```
ionic run android
```
