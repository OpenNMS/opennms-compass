<a name="2.1.0"</a>
## 2.1.0 (2015-07-23)


#### Bug Fixes

* **availability:** checkAvailability expects XML, not JSON ([9c36fff8](https://github.com/nicksrandall/kotojs/commit/9c36fff86f0ec943a1611f48ad4514b4457873f4))
* **config:** fix settings-check (fixes initialization against Meridian) ([1d789935](https://github.com/nicksrandall/kotojs/commit/1d7899359e934b0ca80e180af46bd4059af8aaba))
* **dashboard:**
  * handle rejection better ([dd151945](https://github.com/nicksrandall/kotojs/commit/dd1519458432b2362a25290718b02e6b1c3bea5b))
  * extend debounce to avoid flash when refreshing ([6ea04335](https://github.com/nicksrandall/kotojs/commit/6ea04335e2b90340cbbb01a48643df0a60309057))
  * don't let 'loading' block forever ([04d520ae](https://github.com/nicksrandall/kotojs/commit/04d520ae854fb99484441cc8ba502aa0c75a69cc))
* **favorites:** fix removing favorites ([6b2bea0d](https://github.com/nicksrandall/kotojs/commit/6b2bea0d447896f30b12675dee225745d53e57ab))
* **graphs:** fix minify mangling of backshift lib that could cause failures ([f2464629](https://github.com/nicksrandall/kotojs/commit/f2464629dbc253ff770f5a6f987c9e1ffb9ff407))
* **iap:** re-add missing IAP call ([05e5545e](https://github.com/nicksrandall/kotojs/commit/05e5545e0e22cc16f008ba61d08b081bd6720b32))
* **nodes:** don't clean up view data until they are not visible ([8da8ad92](https://github.com/nicksrandall/kotojs/commit/8da8ad921387e66b446db17737ea866c36ee8c58))
* **rest:**
  * fix iOS ReST breakage introduced by cordovaHTTP refactor ([51c75b99](https://github.com/nicksrandall/kotojs/commit/51c75b993ab0e5aa121f4ccfc07f231037e08551))
  * handle unusual payloads better ([b8847ff1](https://github.com/nicksrandall/kotojs/commit/b8847ff1e4b6689555cfbb6d8aaee2003a0744ad))
  * missing dependency on SSL/HTTP framework ([a70cf6da](https://github.com/nicksrandall/kotojs/commit/a70cf6da64f187c825bcbe682cbd92088eab0649))
* **servers:**
  * handle renames gracefully ([cba27594](https://github.com/nicksrandall/kotojs/commit/cba2759443a17936166563071aa8bb6b5d7ac119))
  * fix an initialization issue on clean install ([fa47035b](https://github.com/nicksrandall/kotojs/commit/fa47035b90f567c4b929a3da69fb748668d1ad52))
  * only refresh when default server changes ([00a5f004](https://github.com/nicksrandall/kotojs/commit/00a5f00442d3decb18fd6ffad9fe33892b1329e0))


#### Features

* **core:** add support for Ionic Deploy ([e8a16754](https://github.com/nicksrandall/kotojs/commit/e8a1675481cc711aab0c93b58dd896fe0ddf10dd))
* **favorites:** store favorites in the filesystem ([28905374](https://github.com/nicksrandall/kotojs/commit/289053749da272fe921530cb4ec87c21bf00bdb9))
* **graphs**  add support for showing graphs from 16.0.0 and higher ((487cbc2b))
* **nodes:** query the first 20 if no search is present ([51649e51](https://github.com/nicksrandall/kotojs/commit/51649e517b08fc64ecbd89d836c5ac6caa910b60))
* **settings:**
  * allow configuration of multiple servers (COMPASS-30) ([50fcd852](https://github.com/nicksrandall/kotojs/commit/50fcd852198dcd760eddd6976628a49b31daa198))
* **startup:** fancier splash screen initialization ([aa22467b](https://github.com/nicksrandall/kotojs/commit/aa22467b16a7168be380853cf5d83986addaf4aa))
* **util:** add onServerRemoved, also disable native keyboard scroll ([9321ebef](https://github.com/nicksrandall/kotojs/commit/9321ebefe985dfde2b7b8802beade97639d73842))


<a name="2.0.6"</a>
## 2.0.6 (2015-06-04)


#### Bug Fixes


* **config**  Android does not seem to like "new RegExp" ((efb1d752))
* **dashboard**  don't show {{serverName}} if server has not been configured ((dfa791d0))
* **settings**  fix error checking server URL change ((d2fdc3e2))
* **ssl**  handle some SSL server types better ((4abb84a9))

#### Features


* ****  track basic metrics for navigation ((50f99098))



<a name="2.0.5"</a>
## 2.0.5 (2015-05-26)


#### Bug Fixes


* **ads**  another attempted fix at cleaning up initialization ((9b638c26))
* **launch**
  *  move 3rd-party scripts into <head> for faster loading ((741ce8e7))
  *  fix a jQuery initialization issue ((ec97318c))
* **settings**  make sure server info is updated when displaying in "about" (COMPASS-46) ((a5702fc2))

#### Features


* **settings**  move "about" info to a settings tab ((26044e04))



<a name="2.0.4"</a>
## 2.0.4 (2015-05-21)


#### Bug Fixes


* **ads**  fix initialization/update of ads (COMPASS-47) ((d5606eba))
* **dashboard**  move the donut arrows a few pixels out of the way ((a5778369))
* **errors**  only broadcast opennms.errors.updated on changes ((3260dcb0))



<a name="2.0.3"</a>
##  (2015-05-14)


#### Bug Fixes


* **outages**  do not pop up outages when not supported (COMPASS-42) ((37220beb))
* **info**  Fix geolocation warning for OpenNMS 16 (COMPASS-46) ((a4e8d972))



<a name="2.0.2"</a>
## 2.0.2 (2015-05-11)


#### Features


* **iap**  add a "restore purchases" button (COMPASS-45) ((1f6c88b5))



<a name="2.0.1"</a>
## 2.0.1 (2015-05-01)


#### Bug Fixes


* **ads**  back off cordova-android to 3.7.1 to fix ad placement (COMPASS-44) ((89c56834))
* **alarms**  better error reporting for alarm permissions errors ((2ed68cd5))
* **info**  better reporting of unknown OpenNMS version(s) (COMPASS-43) ((951ef59a))
* **outages**  clicking any info in the outage popup takes you to the appropriate node (COMPASS-39) ((fc9cbc30))
* **rest**
  *  only use Cordova HTTP on Android (iOS does not support timeouts) ((39223d07))
  *  use cordova-HTTP for permissive-SSL ReST calls (COMPASS-40) ((c103e8a4))
* **settings**  make the tabs a little more obvious ((f9f72a48))

#### Features


* **nodes**  make the search a substring search rather than starts-with (COMPASS-41) ((cf356e09))



<a name="2.0.0"</a>
## 2.0.0 (2015-04-13)


#### Bug Fixes


* **ads**  Don't minify BuildConfig.js ((bb810a07))
* **alarms**  make sure refresh happens after alarm modification (COMPASS-38) ((ba1596d6))
* **dashboard**
  *  make alarm donut say "Pending Problems" like the OpenNMS UI (COMPASS-34) ((0770e753))
  *  shrink fonts to fit on iPhone 4S ((19209605))
  *  sometimes donuts would not render after rotate ((a6d441a7))
* **info**
  *  fix "availability" notice (COMPASS-35) ((11432917))
  *  fix word-wrap for long server names ((ff4a0d80))
* **ios**
  *  fix orientation parsing on fresh install ((617c4be7))
  *  support rotation on iPhone ((f6a49209))
* **launch**  make portrait the first orientation ((1de543cd))
* **nodes**
  *  handle NPE checking addresses ((927d9d46))
  *  node list refreshes on settings change ((4021965d))
* **settings**  don't autocorrect username ((2343683f))
* **styles**  correct meridian/horizon blue+fix alarm detail ((2787c862))

#### Features


* **dashboard**  clicking server name launches opennms in a browser ((ba4146a5))
* **info**  add server information to the info popup ((f730bb0c))
* **nodes**
  *  better node list layout in landscape mode ((13857c30))
  *  set node geolocation with a button ((7f95d42f))
* **settings**  settings are tabbed so purchases are less in-your-face ((9dc32bda))



